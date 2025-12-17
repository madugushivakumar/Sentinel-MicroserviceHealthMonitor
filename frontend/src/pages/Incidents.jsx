import React, { useState, useEffect ,useRef} from 'react';
import { IncidentTable } from '../components/IncidentTable';
import { getIncidents, closeIncident, getProjects } from '../services/api';
import { useProject } from '../context/ProjectContext';

export const Incidents = () => {
  const { selectedProject } = useProject();
  const [allIncidents, setAllIncidents] = useState([]);
  const [projects, setProjects] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
const loadedRef = useRef(false);
const requestInFlight = useRef(false);
  // 🔹 Load projects ONCE
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    loadProjects();
     loadIncidents('all');
  }, []);

  // 🔹 Reload incidents only when filter changes
  const loadProjects = async () => {
    try {
      const res = await getProjects();
      setProjects(res.data);
    } catch (error) {
      console.error(e);
    }
  };

  const loadIncidents = async (filterValue = filter) => {
     if (requestInFlight.current) return;
    requestInFlight.current = true;
    try {
      setLoading(true);

      const params = {};
      if (filter === 'open') params.resolved = 'false';
       if (filter === 'closed') params.resolved = 'true';

      const res = await getIncidents(params);
      setAllIncidents(res.data);
    } catch (e) {
      if (e.response?.status === 429) return;
    } finally {
      requestInFlight.current = false;
      setLoading(false);
    }
  };

  // Group incidents by project
  const incidentsByProject = projects.reduce((acc, project) => {
    const list = allIncidents.filter(i => i.projectId === project.id);
    if (list.length) acc[project.id] = { project, incidents: list };
    return acc;
  }, {});

  const handleCloseIncident = async (id) => {
    try {
      await closeIncident(id);
      await loadIncidents(); // reload once
    } catch (error) {
      alert(error.message);
    }
  };

  const totalIncidents = allIncidents.length;
  const activeIncidents = allIncidents.filter(i => !i.resolved).length;

  if (loading) {
    return (
      <div className="text-center py-12 text-white font-mono">
        Loading...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-cyan-400">
            Incident History
          </h1>
          <p className="text-white/60 text-sm mt-1">
            Log of all detected service anomalies and outages by project.
          </p>
          {selectedProject && (
            <p className="text-white/60 text-sm mt-2 font-mono">
              {selectedProject.name.toLowerCase()}
            </p>
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
            <span className="text-white/60 text-sm">
              {totalIncidents} incidents
            </span>
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
          <h3 className="text-lg font-semibold text-white mb-2">
            NO INCIDENTS FOUND
          </h3>
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
          {Object.values(incidentsByProject).map(
            ({ project, incidents }) => (
              <div key={project.id} className="space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div>
                    <h2 className="text-xl font-bold text-white">
                      {project.name}
                    </h2>
                    {project.description && (
                      <p className="text-sm text-white/60 mt-1">
                        {project.description}
                      </p>
                    )}
                  </div>
                  <span className="text-sm text-white/60">
                    {incidents.length} incident
                    {incidents.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <IncidentTable
                  incidents={incidents}
                  onClose={handleCloseIncident}
                />
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
};
