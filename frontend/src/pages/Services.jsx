import React, { useState, useEffect, useRef } from 'react';

import { useNavigate } from 'react-router-dom';
import { ServiceCard } from '../components/ServiceCard';
import { getServices, createService, getProjects, triggerHealthCheck, deleteService, cleanupDuplicateServices } from '../services/api';
import { useProject } from '../context/ProjectContext';
import { getSocket } from '../utils/socket';

export const Services = () => {
  const navigate = useNavigate();
  const { selectedProject, selectProject, projects: allProjects } = useProject();
  const [allServices, setAllServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
    const isMountedRef = useRef(false);
    const loadedRef = useRef(false);
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    metricsUrl: '',
    group: 'Default',
    ownerEmail: ''
  });

 useEffect(() => {
  loadedRef.current = true;
    isMountedRef.current = true;
    loadData();

    const socket = getSocket();

    const onHealthUpdate = (data) => {
      if (!isMountedRef.current) return;

      setAllServices((prev) =>
        prev.map((s) =>
          s.id === data.serviceId
            ? {
                ...s,
                status: data.status,
                latency: data.latency,
                cpu: data.cpu,
                memory: data.memory
              }
            : s
        )
      );
    };

    socket?.on('healthUpdate', onHealthUpdate);

    return () => {
      isMountedRef.current = false;
      socket?.off('healthUpdate', onHealthUpdate);
    };
  }, []);

const loadData = async () => {
    try {
      setLoading(true);
      const res = await getServices();
      if (isMountedRef.current) {
        setAllServices(res.data);
      }
    } catch (error) {
  

      if (error.response?.status === 429) {
       console.warn('429 hit – skipping retry');
        return;
      }

      console.error(error);
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  };

  // Group services by project
  const servicesByProject = (allProjects || []).reduce((acc, project) => {
    const projectServices = allServices.filter(s => s.projectId === project.id);
    acc[project.id] = {
      project,
      services: projectServices
    };
    return acc;
  }, {});

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProject) {
      alert('Please select a project first');
      return;
    }

    try {
      await createService({ ...formData, projectId: selectedProject.id });
      setShowAddModal(false);
      setFormData({ name: '', url: '', metricsUrl: '', group: 'Default', ownerEmail: '' });
      await loadData();
    } catch (error) {
      alert('Failed to create service: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleDelete = async (serviceId, serviceName) => {
    if (!window.confirm(`Are you sure you want to delete "${serviceName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteService(serviceId);
      await loadData();
    } catch (error) {
      alert('Failed to delete service: ' + (error.response?.data?.error || error.message));
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-white">Loading...</div>;
  }

  return (
    <div className="space-y-8">
      {selectedProject && (
        <div className="bg-black border border-white/20 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">{selectedProject.name}</h2>
              {selectedProject.description && (
                <p className="text-sm text-white/60 mt-1">{selectedProject.description}</p>
              )}
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-xs bg-white/20 text-white px-2 py-1 font-medium">
                Active Project
              </span>
              <button
                onClick={() => navigate('/projects')}
                className="text-sm text-white/70 hover:text-white font-medium"
              >
                Change Project
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">REGISTERED_SERVICES</h1>
          <p className="text-white/60 text-sm">
            {selectedProject 
              ? `Manage and monitor services in "${selectedProject.name}"`
              : 'Manage and monitor your microservices by project.'}
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={async () => {
              try {
                await triggerHealthCheck();
                alert('Health check triggered! Services will be checked now.');
              } catch (error) {
                alert('Failed to trigger health check: ' + (error.response?.data?.error || error.message));
              }
            }}
            className="px-4 py-2 border border-white/20 text-white hover:bg-white/10 transition-colors font-semibold text-sm"
            title="Manually trigger health check for all services"
          >
            🔄 CHECK HEALTH
          </button>
          <button
            onClick={async () => {
              if (!window.confirm('This will delete duplicate services (same URL/port), keeping only the newest ones. Continue?')) {
                return;
              }
              try {
                const result = await cleanupDuplicateServices();
                alert(`Cleanup completed! Deleted ${result.data.servicesDeleted} duplicate service(s).`);
                await loadData();
              } catch (error) {
                alert('Failed to cleanup duplicates: ' + (error.response?.data?.error || error.message));
              }
            }}
            className="px-4 py-2 border border-red-500/50 text-red-400 hover:bg-red-500/10 transition-colors font-semibold text-sm"
            title="Remove duplicate services (same URL/port), keep newest"
          >
            🗑️ CLEANUP DUPLICATES
          </button>
          <button 
            onClick={() => {
              if (!selectedProject) {
                alert('Please select a project first from the Projects page');
                navigate('/projects');
                return;
              }
              setShowAddModal(true);
            }}
            disabled={!selectedProject}
            className={`px-4 py-2 font-semibold text-sm transition-colors ${
              selectedProject
                ? 'bg-white text-black hover:bg-white/90'
                : 'bg-white/20 text-white/50 cursor-not-allowed'
            }`}
          >
            + ADD SERVICE
          </button>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-black border border-white/20 p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-white">ADD NEW SERVICE</h2>
            {selectedProject && (
              <div className="mb-4 p-3 bg-black border border-white/20">
                <p className="text-xs text-white/60 font-medium mb-1">Adding to Project</p>
                <p className="text-sm font-semibold text-white">{selectedProject.name}</p>
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/80 mb-1">Service Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-white/20 bg-black text-white focus:outline-none focus:border-white/40 font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/80 mb-1">Health URL</label>
                <input
                  type="url"
                  required
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  className="w-full px-3 py-2 border border-white/20 bg-black text-white focus:outline-none focus:border-white/40 font-mono text-sm"
                  placeholder="http://localhost:3001/health"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/80 mb-1">Metrics URL (optional)</label>
                <input
                  type="url"
                  value={formData.metricsUrl}
                  onChange={(e) => setFormData({ ...formData, metricsUrl: e.target.value })}
                  className="w-full px-3 py-2 border border-white/20 bg-black text-white focus:outline-none focus:border-white/40 font-mono text-sm"
                  placeholder="http://localhost:3001/metrics"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/80 mb-1">Group</label>
                <input
                  type="text"
                  value={formData.group}
                  onChange={(e) => setFormData({ ...formData, group: e.target.value })}
                  className="w-full px-3 py-2 border border-white/20 bg-black text-white focus:outline-none focus:border-white/40 font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/80 mb-1">Owner Email</label>
                <input
                  type="email"
                  value={formData.ownerEmail}
                  onChange={(e) => setFormData({ ...formData, ownerEmail: e.target.value })}
                  className="w-full px-3 py-2 border border-white/20 bg-black text-white focus:outline-none focus:border-white/40 font-mono text-sm"
                />
              </div>
              <div className="flex space-x-3">
                <button
                  type="submit"
                  className="flex-1 bg-white text-black hover:bg-white/90 px-4 py-2 font-semibold text-sm"
                >
                  ADD SERVICE
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 border border-white/20 text-white hover:bg-white/10 px-4 py-2 font-semibold text-sm"
                >
                  CANCEL
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {!selectedProject ? (
        <div className="bg-black border border-white/20 p-12 text-center">
          <svg className="w-16 h-16 text-white/40 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <h3 className="text-lg font-semibold text-white mb-2">NO PROJECT SELECTED</h3>
          <p className="text-white/60 mb-6">Please select a project to view and manage services</p>
          <button
            onClick={() => navigate('/projects')}
            className="bg-white text-black px-6 py-3 hover:bg-white/90 transition-colors font-semibold text-sm"
          >
            GO TO PROJECTS
          </button>
        </div>
      ) : Object.keys(servicesByProject).length === 0 || !servicesByProject[selectedProject.id] ? (
        <div className="bg-black border border-white/20 p-12 text-center">
          <svg className="w-16 h-16 text-white/40 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 01-2 2v4a2 2 0 012 2h14a2 2 0 012-2v-4a2 2 0 01-2-2m-2-4h.01M17 16h.01" />
          </svg>
          <h3 className="text-lg font-semibold text-white mb-2">NO SERVICES IN {selectedProject.name.toUpperCase()}</h3>
          <p className="text-white/60 mb-6">Add your first service to start monitoring this project</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-white text-black px-6 py-3 hover:bg-white/90 transition-colors font-semibold text-sm"
          >
            + ADD FIRST SERVICE
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {servicesByProject[selectedProject.id] && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {servicesByProject[selectedProject.id].services.map(service => (
                  <ServiceCard 
                    key={service.id}
                    service={service} 
                    onClick={(id) => navigate(`/service/${id}`)}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </div>
          )}
          
          {/* Show other projects with services (collapsed view) */}
          {Object.values(servicesByProject).filter(({ project }) => project.id !== selectedProject.id).length > 0 && (
            <div className="mt-8 pt-8 border-t border-white/10">
              <h3 className="text-lg font-semibold text-white mb-4">OTHER PROJECTS</h3>
              <div className="space-y-6">
                {Object.values(servicesByProject)
                  .filter(({ project }) => project.id !== selectedProject.id)
                  .map(({ project, services }) => (
                    <div key={project.id} className="space-y-4">
                      <div className="flex items-center justify-between border-b border-white/10 pb-3">
                        <div>
                          <h4 className="text-lg font-semibold text-white">{project.name}</h4>
                          {project.description && (
                            <p className="text-sm text-white/60 mt-1">{project.description}</p>
                          )}
                        </div>
                        <div className="flex items-center space-x-4">
                          <span className="text-sm text-white/60">
                            {services.length} service{services.length !== 1 ? 's' : ''}
                          </span>
                          <button
                            onClick={() => {
                              const proj = allProjects?.find(p => p.id === project.id);
                              if (proj) {
                                selectProject(proj);
                                // Scroll to top to show the selected project's services
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }
                            }}
                            className="text-sm text-white/70 hover:text-white font-medium"
                          >
                            Switch to This Project
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                        {services.map(service => (
                          <ServiceCard 
                            key={service.id}
                            service={service} 
                            onClick={(id) => navigate(`/service/${id}`)}
                            onDelete={handleDelete}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

