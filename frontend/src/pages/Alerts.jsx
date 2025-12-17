import React, { useState, useEffect } from 'react';
import { getAlerts, testAlert, getServices } from '../services/api';
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
      setLoading(true);
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

  const handleTestAlert = async () => {
    if (!testServiceId) {
      alert('Please select a service');
      return;
    }
    try {
      await testAlert({ serviceId: testServiceId });
      alert('Test alert sent!');
      await loadData(); // ✅ manual refresh
    } catch (error) {
      alert(
        'Failed to send test alert: ' +
          (error.response?.data?.error || error.message)
      );
    }
  };

  // Filter to show only user-facing alerts
  const userFacingAlerts = alerts.filter(
    a =>
      a.channel === 'email' ||
      a.channel === 'slack' ||
      a.channel === 'telegram' ||
      a.channel === 'whatsapp'
  );

  const filteredAlerts =
    filter === 'all'
      ? userFacingAlerts
      : userFacingAlerts.filter(a => a.channel === filter);

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
          Please select a project to view alerts.
        </p>
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
          <h1 className="text-2xl font-bold text-cyan-400 font-mono mb-2">
            Alert Logs
          </h1>
          <p className="text-zinc-400 text-sm font-mono">
            View all alert notifications sent to different channels.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={testServiceId}
            onChange={e => setTestServiceId(e.target.value)}
            className="px-3 py-2 border border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 bg-black text-white font-mono"
          >
            <option value="">Select service to test</option>
            {services.map(s => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
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
        {['all', 'slack', 'telegram', 'email', 'whatsapp'].map(type => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors font-mono ${
              filter === type
                ? 'bg-cyan-400 text-black'
                : 'bg-black border border-zinc-800 text-white hover:bg-zinc-900'
            }`}
          >
            {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>

      <div className="bg-black border border-zinc-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-zinc-800">
            <thead className="bg-black">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-cyan-400 font-mono">
                  TIMESTAMP
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-cyan-400 font-mono">
                  SERVICE
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-cyan-400 font-mono">
                  CHANNEL
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-cyan-400 font-mono">
                  MESSAGE
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-cyan-400 font-mono">
                  STATUS
                </th>
              </tr>
            </thead>
            <tbody className="bg-black divide-y divide-zinc-800">
              {filteredAlerts.map(alert => (
                <tr key={alert.id} className="hover:bg-zinc-900">
                  <td className="px-6 py-4 text-sm text-white font-mono">
                    {new Date(alert.timestamp).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-white font-mono">
                    {alert.serviceName || 'Unknown'}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 rounded text-xs font-mono ${
                        channelColors[alert.channel] || 'bg-zinc-700 text-white'
                      }`}
                    >
                      {alert.channel}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-white font-mono">
                    {alert.message}
                  </td>
                  <td className="px-6 py-4">
                    {alert.success ? (
                      <span className="text-emerald-400 font-mono">✓ Sent</span>
                    ) : (
                      <span className="text-red-400 font-mono">✗ Failed</span>
                    )}
                  </td>
                </tr>
              ))}
              {filteredAlerts.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-10 text-center text-zinc-400 font-mono"
                  >
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
