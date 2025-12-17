import React, { useState, useEffect, useRef } from 'react';
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

  const mountedRef = useRef(true);
 const loadedRef = useRef(false);
  // 🔹 Load projects ONCE
  useEffect(() => {
     if (loadedRef.current) return;
    loadedRef.current = true;
    mountedRef.current = true;
    loadProjects();

    return () => {
      mountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const res = await getProjects();

      if (!mountedRef.current) return;

      setProjects(res.data);
      refreshProjects(); // sync context
    } catch (error) {
       if (error.response?.status === 429) {
        console.warn('Rate limited: skipping retry');
        return;
      }
      console.error('Failed to load projects:', error);
     
    } finally {
      if (mountedRef.current) 
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

      // Auto-select newly created project
      selectProject(res.data);
      navigate('/dashboard');
    } catch (error) {
      alert
          (error.response?.data?.error || error.message)
      
    }
  };

  const handleDelete = async (id) => {
    if (
      !window.confirm(
        'Are you sure you want to delete this project? This action cannot be undone.'
      )
    )
      return;
    

    try {
      await deleteProject(id);
      await loadProjects();
    } catch (error) {
      alert
          (error.response?.data?.error || error.message)
    }
  };

  const handleSelectProject = (project) => {
    selectProject(project);
    navigate('/services');
  };

  if (loading) {
    return 
      <div className="text-center py-12 text-white">
        Loading projects...
      </div>
    
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-cyan-400">
            Projects
          </h1>
          <p className="text-white/60 mt-2 text-sm">
            Organize your services into projects
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-white text-black px-6 py-3 hover:bg-white/90 transition-colors flex items-center space-x-2 font-semibold text-sm"
        >
          + NEW PROJECT
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="bg-black border border-white/20 p-12 text-center">
          <h3 className="text-lg font-semibold text-white mb-2">
            NO PROJECTS YET
          </h3>
          <p className="text-white/60 mb-6">
            Create your first project to start monitoring services
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-white text-black px-6 py-3 hover:bg-white/90 transition-colors font-semibold text-sm"
          >
            CREATE PROJECT
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
                  <h3 className="text-xl font-bold text-gray-900 mb-1 font-mono">
                    {project.name}
                  </h3>
                  {project.description && (
                    <p className="text-sm text-gray-600 mb-2">
                      {project.description}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(project.id)}
                  className="text-red-600 hover:text-red-700 p-1"
                  title="Delete project"
                >
                  🗑️
                </button>
              </div>

              <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                <span>
                  {project.serviceCount || 0} service
                  {project.serviceCount !== 1 ? 's' : ''}
                </span>
                {project.ownerEmail && (
                  <span className="text-xs text-gray-500">
                    {project.ownerEmail}
                  </span>
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
            <h2 className="text-2xl font-bold text-white mb-4">
              CREATE NEW PROJECT
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Project name"
                className="w-full px-4 py-2 border border-white/20 bg-black text-white"
              />
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    description: e.target.value
                  })
                }
                rows="3"
                placeholder="Description (optional)"
                className="w-full px-4 py-2 border border-white/20 bg-black text-white"
              />
              <input
                type="email"
                value={formData.ownerEmail}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    ownerEmail: e.target.value
                  })
                }
                placeholder="Owner email"
                className="w-full px-4 py-2 border border-white/20 bg-black text-white"
              />
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 border border-white/20 text-white px-4 py-2"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-white text-black px-4 py-2"
                >
                  CREATE
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
