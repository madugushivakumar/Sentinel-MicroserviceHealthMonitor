import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ServiceCard } from '../components/ServiceCard';
import { IncidentTable } from '../components/IncidentTable';
import { getServices, getIncidents, getReliabilityScores } from '../services/api';
import { useProject } from '../context/ProjectContext';
import { getSocket } from '../utils/socket';

export const Dashboard = () => {
  const navigate = useNavigate();
  const { selectedProject } = useProject();
  const [services, setServices] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [reliabilityScores, setReliabilityScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const requestInFlight = useRef(false);
  const lastProjectId = useRef(null);

  useEffect(() => {
    // Prevent duplicate requests for the same project
    if (!selectedProject) {
      setServices([]);
      setIncidents([]);
      setReliabilityScores([]);
      setLoading(false);
      return;
    }

    // Skip if already loading this project
    if (requestInFlight.current || lastProjectId.current === selectedProject.id) {
      return;
    }

    lastProjectId.current = selectedProject.id;
    loadData();

    // ✅ shared socket (no reconnect spam)
    const socket = getSocket();

    if (socket) {
      socket.on('healthUpdate', (data) => {
        setServices(prev =>
          prev.map(s =>
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
      });
    }

    return () => {
      if (socket) {
        socket.off('healthUpdate');
      }
    };
  }, [selectedProject]);

  const loadData = async () => {
    if (!selectedProject || requestInFlight.current) return;

    try {
      requestInFlight.current = true;
      setLoading(true);

      const [servicesRes, incidentsRes, reliabilityRes] = await Promise.all([
        getServices(selectedProject.id),
        getIncidents({ resolved: 'false', limit: 5 }),
        getReliabilityScores()
      ]);

      setServices(servicesRes.data);
      setIncidents(incidentsRes.data);
      setReliabilityScores(reliabilityRes.data || []);
    } catch (error) {
      if (error.response?.status === 429) {
        console.warn('Rate limited: skipping retry');
        return;
      }
      console.error('Failed to load dashboard data:', error);
    } finally {
      requestInFlight.current = false;
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12 text-white font-mono">
        Loading...
      </div>
    );
  }

  if (!selectedProject) {
    return (
      <div className="text-center py-12">
        <p className="text-zinc-400 mb-4 font-mono">
          Please select a project to view the dashboard.
        </p>
        <button
          onClick={() => navigate('/projects')}
          className="px-4 py-2 bg-white text-black rounded-lg hover:bg-zinc-200 font-mono"
        >
          Go to Projects
        </button>
      </div>
    );
  }

  const totalServices = services.length;
  const servicesDown = services.filter(s => s.status === 'down').length;
  const servicesDegraded = services.filter(s => s.status === 'degraded').length;
  const activeIncidents = incidents.filter(i => !i.resolved).length;

  return (
    <div className="space-y-8">
      {/* System Overview */}
      <div>
        <h1 className="text-2xl font-bold text-white font-mono mb-2">
          System Overview
        </h1>
        <p className="text-zinc-400 font-mono">
          Real-time metrics and health status.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-black border border-zinc-800 p-6 rounded-lg">
          <p className="text-sm text-white uppercase font-mono mb-2">
            TOTAL SERVICES
          </p>
          <p className="text-4xl font-bold text-white font-mono">
            {totalServices}
          </p>
        </div>
        <div className="bg-black border border-zinc-800 p-6 rounded-lg">
          <p className="text-sm text-white uppercase font-mono mb-2">
            SERVICES DOWN
          </p>
          <p className="text-4xl font-bold text-pink-500 font-mono">
            {servicesDown}
          </p>
        </div>
        <div className="bg-black border border-zinc-800 p-6 rounded-lg">
          <p className="text-sm text-white uppercase font-mono mb-2">
            DEGRADED
          </p>
          <p className="text-4xl font-bold text-yellow-500 font-mono">
            {servicesDegraded}
          </p>
        </div>
        <div className="bg-black border border-zinc-800 p-6 rounded-lg">
          <p className="text-sm text-white uppercase font-mono mb-2">
            ACTIVE INCIDENTS
          </p>
          <p className="text-4xl font-bold text-indigo-500 font-mono">
            {activeIncidents}
          </p>
        </div>
      </div>

      {/* Service Status */}
      <div>
        <h2 className="text-lg font-bold text-white mb-4 font-mono">
          Service Status
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {services.map(service => {
            const reliability = reliabilityScores.find(
              s => s.serviceId === service.id
            );
            return (
              <ServiceCard
                key={service.id}
                service={{ ...service, reliability }}
                onClick={(id) => navigate(`/service/${id}`)}
              />
            );
          })}
        </div>
      </div>

      {/* Recent Incidents */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-white font-mono">
            Recent Incidents
          </h2>
          <button
            onClick={() => navigate('/incidents')}
            className="text-sm text-indigo-400 hover:text-indigo-300 font-mono"
          >
            View all
          </button>
        </div>
        <IncidentTable incidents={incidents} />
      </div>
    </div>
  );
};
