import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProjects, createProject, deleteProject } from '../services/api';
import { useProject } from '../context/ProjectContext';

export const Projects = () => {
  const navigate = useNavigate();
  const { refreshProjects, selectProject } = useProject();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    ownerEmail: ''
  });

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const res = await getProjects();
      setProjects(res.data);
      await refreshProjects();
    } catch (error) {
      console.error('Failed to load projects:', error);
      alert('Failed to load projects: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await createProject(formData);
      await loadProjects();
      setShowAddModal(false);
      setFormData({ name: '', description: '', ownerEmail: '' });
      
      // Auto-select the newly created project
      selectProject(res.data);
      navigate('/dashboard');
    } catch (error) {
      alert('Failed to create project: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteProject(id);
      await loadProjects();
    } catch (error) {
      alert('Failed to delete project: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleSelectProject = (project) => {
    selectProject(project);
    navigate('/services');
  };

  if (loading) {
    return <div className="text-center py-12 text-white">Loading projects...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-cyan-400">Projects</h1>
          <p className="text-white/60 mt-2 text-sm">Organize your services into projects</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-white text-black px-6 py-3 hover:bg-white/90 transition-colors flex items-center space-x-2 font-semibold text-sm"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>+ NEW PROJECT</span>
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="bg-black border border-white/20 p-12 text-center">
          <svg className="w-16 h-16 text-white/40 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <h3 className="text-lg font-semibold text-white mb-2">NO PROJECTS YET</h3>
          <p className="text-white/60 mb-6">Create your first project to start monitoring services</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-white text-black px-6 py-3 hover:bg-white/90 transition-colors inline-flex items-center space-x-2 font-semibold text-sm"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>CREATE PROJECT</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div
              key={project.id}
              className="bg-white rounded-lg border border-white/20 p-6 hover:border-white/40 transition-all"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-1 font-mono">{project.name}</h3>
                  {project.description && (
                    <p className="text-sm text-gray-600 mb-2">{project.description}</p>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleDelete(project.id)}
                    className="text-red-600 hover:text-red-700 p-1"
                    title="Delete project"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                <span className="flex items-center space-x-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 01-2 2v4a2 2 0 012 2h14a2 2 0 012-2v-4a2 2 0 01-2-2m-2-4h.01M17 16h.01" />
                  </svg>
                  <span>{project.serviceCount || 0} service{project.serviceCount !== 1 ? 's' : ''}</span>
                </span>
                {project.ownerEmail && (
                  <span className="text-xs text-gray-500">{project.ownerEmail}</span>
                )}
              </div>

              <button
                onClick={() => handleSelectProject(project)}
                className="w-full bg-cyan-400 text-black px-4 py-2 hover:bg-cyan-400/90 transition-colors text-sm font-semibold"
              >
                SELECT PROJECT
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add Project Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-black border border-white/20 p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold text-white mb-4">CREATE NEW PROJECT</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/80 mb-1">
                  Project Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-white/20 bg-black text-white focus:outline-none focus:border-white/40 font-mono text-sm"
                  placeholder="e.g., E-Commerce Platform"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/80 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-white/20 bg-black text-white focus:outline-none focus:border-white/40 font-mono text-sm"
                  rows="3"
                  placeholder="Optional description of the project"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/80 mb-1">
                  Owner Email
                </label>
                <input
                  type="email"
                  value={formData.ownerEmail}
                  onChange={(e) => setFormData({ ...formData, ownerEmail: e.target.value })}
                  className="w-full px-4 py-2 border border-white/20 bg-black text-white focus:outline-none focus:border-white/40 font-mono text-sm"
                  placeholder="owner@example.com"
                />
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setFormData({ name: '', description: '', ownerEmail: '' });
                  }}
                  className="flex-1 px-4 py-2 border border-white/20 text-white hover:bg-white/10 transition-colors font-semibold text-sm"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-white text-black hover:bg-white/90 transition-colors font-semibold text-sm"
                >
                  CREATE PROJECT
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

