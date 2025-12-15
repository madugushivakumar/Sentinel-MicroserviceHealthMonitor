import React, { useState, useEffect } from 'react';
import { getAlerts, testAlert } from '../services/api';
import { getServices } from '../services/api';
import { useProject } from '../context/ProjectContext';

export const Alerts = () => {
  const { selectedProject } = useProject();
  const [alerts, setAlerts] = useState([]);
  const [services, setServices] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [testServiceId, setTestServiceId] = useState('');

  useEffect(() => {
    if (selectedProject) {
      loadData();
      const interval = setInterval(loadAlerts, 10000);
      return () => clearInterval(interval);
    }
  }, [filter, selectedProject]);

  const loadData = async () => {
    if (!selectedProject) {
      setAlerts([]);
      setServices([]);
      setLoading(false);
      return;
    }

    try {
      const [alertsRes, servicesRes] = await Promise.all([
        getAlerts({ limit: 100 }),
        getServices(selectedProject.id)
      ]);
      setAlerts(alertsRes.data);
      setServices(servicesRes.data);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAlerts = async () => {
    try {
      const res = await getAlerts({ limit: 100 });
      setAlerts(res.data);
    } catch (error) {
      console.error('Failed to load alerts:', error);
    }
  };

  const handleTestAlert = async () => {
    if (!testServiceId) {
      alert('Please select a service');
      return;
    }
    try {
      await testAlert({ serviceId: testServiceId });
      alert('Test alert sent!');
      loadAlerts();
    } catch (error) {
      alert('Failed to send test alert: ' + (error.response?.data?.error || error.message));
    }
  };

  // Filter to show only user-facing alerts (email, slack, telegram, whatsapp)
  // Exclude internal/system alerts
  const userFacingAlerts = alerts.filter(a => 
    a.channel === 'email' || 
    a.channel === 'slack' || 
    a.channel === 'telegram' || 
    a.channel === 'whatsapp'
  );

  const filteredAlerts = filter === 'all' 
    ? userFacingAlerts 
    : userFacingAlerts.filter(a => a.channel === filter);

  if (loading) {
    return <div className="text-center py-12 text-white font-mono">Loading...</div>;
  }

  if (!selectedProject) {
    return (
      <div className="text-center py-12">
        <p className="text-zinc-400 mb-4 font-mono">Please select a project to view alerts.</p>
      </div>
    );
  }

  const channelColors = {
    slack: 'bg-purple-600 text-white',
    telegram: 'bg-blue-600 text-white',
    email: 'bg-green-600 text-white',
    whatsapp: 'bg-emerald-600 text-white'
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-cyan-400 font-mono mb-2">Alert Logs</h1>
          <p className="text-zinc-400 text-sm font-mono">View all alert notifications sent to different channels.</p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={testServiceId}
            onChange={(e) => setTestServiceId(e.target.value)}
            className="px-3 py-2 border border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 bg-black text-white font-mono"
          >
            <option value="">Select service to test</option>
            {services.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <button
            onClick={handleTestAlert}
            className="bg-cyan-400 hover:bg-cyan-500 text-black px-4 py-2 rounded-lg font-medium font-mono transition-colors"
          >
            Send Test Alert
          </button>
        </div>
      </div>

      <div className="flex space-x-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors font-mono ${
            filter === 'all' 
              ? 'bg-cyan-400 text-black' 
              : 'bg-black border border-zinc-800 text-white hover:bg-zinc-900'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setFilter('slack')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors font-mono ${
            filter === 'slack' 
              ? 'bg-cyan-400 text-black' 
              : 'bg-black border border-zinc-800 text-white hover:bg-zinc-900'
          }`}
        >
          Slack
        </button>
        <button
          onClick={() => setFilter('telegram')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors font-mono ${
            filter === 'telegram' 
              ? 'bg-cyan-400 text-black' 
              : 'bg-black border border-zinc-800 text-white hover:bg-zinc-900'
          }`}
        >
          Telegram
        </button>
        <button
          onClick={() => setFilter('email')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors font-mono ${
            filter === 'email' 
              ? 'bg-cyan-400 text-black' 
              : 'bg-black border border-zinc-800 text-white hover:bg-zinc-900'
          }`}
        >
          Email
        </button>
        <button
          onClick={() => setFilter('whatsapp')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors font-mono ${
            filter === 'whatsapp' 
              ? 'bg-cyan-400 text-black' 
              : 'bg-black border border-zinc-800 text-white hover:bg-zinc-900'
          }`}
        >
          WhatsApp
        </button>
      </div>

      <div className="bg-black border border-zinc-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-zinc-800">
            <thead className="bg-black">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-cyan-400 uppercase tracking-wider font-mono">TIMESTAMP</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-cyan-400 uppercase tracking-wider font-mono">SERVICE</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-cyan-400 uppercase tracking-wider font-mono">CHANNEL</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-cyan-400 uppercase tracking-wider font-mono">MESSAGE</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-cyan-400 uppercase tracking-wider font-mono">STATUS</th>
              </tr>
            </thead>
            <tbody className="bg-black divide-y divide-zinc-800">
              {filteredAlerts.map((alert) => (
                <tr key={alert.id} className="hover:bg-zinc-900 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-mono">
                    {new Date(alert.timestamp).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white font-mono">
                    {alert.serviceName || 'Unknown'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium capitalize font-mono ${
                      channelColors[alert.channel] || 'bg-zinc-700 text-white'
                    }`}>
                      {alert.channel}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-white max-w-md font-mono">
                    {alert.message}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {alert.success ? (
                      <span className="text-emerald-400 text-sm font-mono">✓ Sent</span>
                    ) : (
                      <span className="text-red-400 text-sm font-mono">✗ Failed</span>
                    )}
                  </td>
                </tr>
              ))}
              {filteredAlerts.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-sm text-zinc-400 font-mono">
                    No alerts found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
