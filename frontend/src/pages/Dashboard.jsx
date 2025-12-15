import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    if (selectedProject) {
      loadData();
    }

    // Use shared socket instance
    const socket = getSocket();

    socket.on('healthUpdate', (data) => {
      setServices(prev => prev.map(s => 
        s.id === data.serviceId 
          ? { ...s, status: data.status, latency: data.latency, cpu: data.cpu, memory: data.memory }
          : s
      ));
    });

    return () => {
      socket.off('healthUpdate');
    };
  }, [selectedProject]);

  const loadData = async () => {
    if (!selectedProject) {
      setServices([]);
      setIncidents([]);
      setLoading(false);
      return;
    }

    try {
      const [servicesRes, incidentsRes, reliabilityRes] = await Promise.all([
        getServices(selectedProject.id),
        getIncidents({ resolved: 'false', limit: 5 }),
        getReliabilityScores()
      ]);
      setServices(servicesRes.data);
      setIncidents(incidentsRes.data);
      setReliabilityScores(reliabilityRes.data || []);
    } catch (error) {
      console.error('Failed to load data:', error);
      if (error.response?.status === 429) {
        setTimeout(() => loadData(), 2000);
        return;
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-white font-mono">Loading...</div>;
  }

  if (!selectedProject) {
    return (
      <div className="text-center py-12">
        <p className="text-zinc-400 mb-4 font-mono">Please select a project to view the dashboard.</p>
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
        <h1 className="text-2xl font-bold text-white font-mono mb-2">System Overview</h1>
        <p className="text-zinc-400 font-mono">Real-time metrics and health status.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-black border border-zinc-800 p-6 rounded-lg">
          <p className="text-sm font-medium text-white uppercase font-mono mb-2">TOTAL SERVICES</p>
          <p className="text-4xl font-bold text-white font-mono">{totalServices}</p>
        </div>
        <div className="bg-black border border-zinc-800 p-6 rounded-lg">
          <p className="text-sm font-medium text-white uppercase font-mono mb-2">SERVICES DOWN</p>
          <p className="text-4xl font-bold text-pink-500 font-mono">{servicesDown}</p>
        </div>
        <div className="bg-black border border-zinc-800 p-6 rounded-lg">
          <p className="text-sm font-medium text-white uppercase font-mono mb-2">DEGRADED</p>
          <p className="text-4xl font-bold text-yellow-500 font-mono">{servicesDegraded}</p>
        </div>
        <div className="bg-black border border-zinc-800 p-6 rounded-lg">
          <p className="text-sm font-medium text-white uppercase font-mono mb-2">ACTIVE INCIDENTS</p>
          <p className="text-4xl font-bold text-indigo-500 font-mono">{activeIncidents}</p>
        </div>
      </div>

      {/* Latency Percentiles Overview */}
      {reliabilityScores.length > 0 && (
        <div className="bg-black border border-zinc-800 rounded-lg p-6">
          <h2 className="text-lg font-bold text-white mb-4 font-mono">Latency Percentiles (All Services)</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-zinc-400 uppercase font-mono mb-1">P50 (Median)</p>
              <p className="text-2xl font-mono font-bold text-white">
                {reliabilityScores.length > 0 
                  ? Math.round(reliabilityScores.reduce((sum, s) => sum + (s.p50Latency || 0), 0) / reliabilityScores.length)
                  : 0}ms
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-400 uppercase font-mono mb-1">P95</p>
              <p className="text-2xl font-mono font-bold text-white">
                {reliabilityScores.length > 0 
                  ? Math.round(reliabilityScores.reduce((sum, s) => sum + (s.p95Latency || 0), 0) / reliabilityScores.length)
                  : 0}ms
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-400 uppercase font-mono mb-1">P99</p>
              <p className="text-2xl font-mono font-bold text-white">
                {reliabilityScores.length > 0 
                  ? Math.round(reliabilityScores.reduce((sum, s) => sum + (s.p99Latency || 0), 0) / reliabilityScores.length)
                  : 0}ms
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Service Status */}
      <div>
        <h2 className="text-lg font-bold text-white mb-4 font-mono">Service Status</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {services.map(service => {
            const reliability = reliabilityScores.find(s => s.serviceId === service.id);
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
          <h2 className="text-lg font-bold text-white font-mono">Recent Incidents</h2>
          <button 
            onClick={() => navigate('/incidents')} 
            className="text-sm text-indigo-400 hover:text-indigo-300 font-medium font-mono"
          >
            View all
          </button>
        </div>
        <IncidentTable incidents={incidents} />
      </div>
    </div>
  );
};
