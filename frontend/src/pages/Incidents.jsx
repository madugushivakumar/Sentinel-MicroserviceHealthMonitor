import React, { useState, useEffect } from 'react';
import { IncidentTable } from '../components/IncidentTable';
import { getIncidents, closeIncident, getProjects } from '../services/api';
import { useProject } from '../context/ProjectContext';

export const Incidents = () => {
  const { selectedProject } = useProject();
  const [allIncidents, setAllIncidents] = useState([]);
  const [projects, setProjects] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadIncidents, 10000);
    return () => clearInterval(interval);
  }, [filter]);

  const loadData = async () => {
    try {
      const [projectsRes] = await Promise.all([
        getProjects()
      ]);
      setProjects(projectsRes.data);
      await loadIncidents();
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const loadIncidents = async () => {
    try {
      const params = {};
      if (filter === 'open') params.resolved = 'false';
      else if (filter === 'closed') params.resolved = 'true';
      
      const res = await getIncidents(params);
      setAllIncidents(res.data);
    } catch (error) {
      console.error('Failed to load incidents:', error);
    } finally {
      setLoading(false);
    }
  };

  // Group incidents by project
  const incidentsByProject = projects.reduce((acc, project) => {
    const projectIncidents = allIncidents.filter(i => i.projectId === project.id);
    if (projectIncidents.length > 0) {
      acc[project.id] = {
        project,
        incidents: projectIncidents
      };
    }
    return acc;
  }, {});

  const handleCloseIncident = async (id) => {
    try {
      await closeIncident(id);
      loadIncidents();
    } catch (error) {
      alert('Failed to close incident: ' + (error.response?.data?.error || error.message));
    }
  };

  const totalIncidents = allIncidents.length;
  const activeIncidents = allIncidents.filter(i => !i.resolved).length;

  if (loading) {
    return <div className="text-center py-12 text-white">Loading...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-cyan-400">Incident History</h1>
          <p className="text-white/60 text-sm mt-1">Log of all detected service anomalies and outages by project.</p>
          {selectedProject && (
            <p className="text-white/60 text-sm mt-2 font-mono">{selectedProject.name.toLowerCase()}</p>
          )}
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex space-x-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 font-semibold text-sm transition-colors ${
                filter === 'all' 
                  ? 'bg-cyan-400 text-black' 
                  : 'bg-white text-gray-900 border border-white/20 hover:bg-white/90'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('open')}
              className={`px-4 py-2 font-semibold text-sm transition-colors ${
                filter === 'open' 
                  ? 'bg-cyan-400 text-black' 
                  : 'bg-white text-gray-900 border border-white/20 hover:bg-white/90'
              }`}
            >
              Open
            </button>
            <button
              onClick={() => setFilter('closed')}
              className={`px-4 py-2 font-semibold text-sm transition-colors ${
                filter === 'closed' 
                  ? 'bg-cyan-400 text-black' 
                  : 'bg-white text-gray-900 border border-white/20 hover:bg-white/90'
              }`}
            >
              Closed
            </button>
          </div>
          <div className="flex items-center space-x-3">
            <span className="text-white/60 text-sm">{totalIncidents} incidents</span>
            {activeIncidents > 0 && (
              <span className="text-xs bg-cyan-400 text-black px-2 py-1 font-semibold">
                Active
              </span>
            )}
          </div>
        </div>
      </div>

      {Object.keys(incidentsByProject).length === 0 ? (
        <div className="bg-black border border-white/20 p-12 text-center">
          <svg className="w-16 h-16 text-white/40 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-semibold text-white mb-2">NO INCIDENTS FOUND</h3>
          <p className="text-white/60">
            {filter === 'open' 
              ? 'No open incidents at this time. All services are healthy!'
              : filter === 'closed'
              ? 'No closed incidents found.'
              : 'No incidents have been detected yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.values(incidentsByProject).map(({ project, incidents }) => (
            <div key={project.id} className="space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div>
                  <h2 className="text-xl font-bold text-white">{project.name}</h2>
                  {project.description && (
                    <p className="text-sm text-white/60 mt-1">{project.description}</p>
                  )}
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-white/60">
                    {incidents.length} incident{incidents.length !== 1 ? 's' : ''}
                    {filter === 'open' && ` (${incidents.filter(i => !i.resolved).length} open)`}
                  </span>
                  {selectedProject?.id === project.id && (
                    <span className="text-xs bg-cyan-400 text-black px-2 py-1 font-semibold">
                      Active
                    </span>
                  )}
                </div>
              </div>
              <IncidentTable incidents={incidents} onClose={handleCloseIncident} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
