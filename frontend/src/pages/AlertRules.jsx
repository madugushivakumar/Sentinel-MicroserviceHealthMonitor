import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAlertRules, createAlertRule, updateAlertRule, deleteAlertRule, getServices } from '../services/api';
import { useProject } from '../context/ProjectContext';

export const AlertRules = () => {
  const navigate = useNavigate();
  const { selectedProject } = useProject();
  const [rules, setRules] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [formData, setFormData] = useState({
    serviceId: '',
    enabled: true,
    rules: {
      notifyOnDown: true,
      notifyOnDegraded: true,
      notifyOnHighLatency: false,
      highLatencyThreshold: 1000,
      notifyOnHighErrorRate: false,
      highErrorRateThreshold: 5,
      notifyOnSloViolation: true
    },
    channels: {
      email: { enabled: false, recipients: [] }
    }
  });

  useEffect(() => {
    if (selectedProject) {
      loadData();
    }
  }, [selectedProject]);

  const loadData = async () => {
    if (!selectedProject) {
      setRules([]);
      setServices([]);
      setLoading(false);
      return;
    }

    try {
      const [rulesRes, servicesRes] = await Promise.all([
        getAlertRules({ projectId: selectedProject.id }),
        getServices(selectedProject.id)
      ]);
      setRules(rulesRes.data);
      setServices(servicesRes.data);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProject || !formData.serviceId) {
      alert('Please select a service');
      return;
    }

    try {
      if (editingRule) {
        await updateAlertRule(editingRule.id, {
          ...formData,
          projectId: selectedProject.id
        });
      } else {
        await createAlertRule({
          ...formData,
          projectId: selectedProject.id
        });
      }
      setShowModal(false);
      setEditingRule(null);
      resetForm();
      loadData();
    } catch (error) {
      alert('Failed to save alert rule: ' + (error.response?.data?.error || error.message));
    }
  };

  const resetForm = () => {
    setFormData({
      serviceId: '',
      enabled: true,
      rules: {
        notifyOnDown: true,
        notifyOnDegraded: true,
        notifyOnHighLatency: false,
        highLatencyThreshold: 1000,
        notifyOnHighErrorRate: false,
        highErrorRateThreshold: 5,
        notifyOnSloViolation: true
      },
      channels: {
        email: { enabled: false, recipients: [] }
      }
    });
  };

  const handleEdit = (rule) => {
    setEditingRule(rule);
    setFormData({
      serviceId: rule.serviceId,
      enabled: rule.enabled,
      rules: rule.rules,
      channels: rule.channels
    });
    setShowModal(true);
  };

  const handleDelete = async (ruleId) => {
    if (!window.confirm('Are you sure you want to delete this alert rule?')) {
      return;
    }

    try {
      await deleteAlertRule(ruleId);
      loadData();
    } catch (error) {
      alert('Failed to delete alert rule: ' + (error.response?.data?.error || error.message));
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-white font-mono">Loading...</div>;
  }

  if (!selectedProject) {
    return (
      <div className="text-center py-12">
        <p className="text-zinc-400 mb-4 font-mono">Please select a project to manage alert rules.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-cyan-400 font-mono mb-2">Alert Rules</h1>
          <p className="text-zinc-400 font-mono">Configure when and how to receive alerts</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setEditingRule(null);
            setShowModal(true);
          }}
          className="px-4 py-2 bg-cyan-400 hover:bg-cyan-500 text-black font-mono font-bold text-sm"
        >
          + ADD RULE
        </button>
      </div>

      {/* Rules List */}
      <div className="bg-black border border-zinc-800 rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-zinc-800">
          <thead className="bg-black">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-cyan-400 uppercase font-mono">Service</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-cyan-400 uppercase font-mono">Rules</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-cyan-400 uppercase font-mono">Channels</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-cyan-400 uppercase font-mono">Status</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-cyan-400 uppercase font-mono">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-black divide-y divide-zinc-800">
            {rules.map((rule) => (
              <tr key={rule.id} className="hover:bg-zinc-900">
                <td className="px-6 py-4 text-white font-mono">{rule.serviceName || 'Unknown'}</td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-2">
                    {rule.rules.notifyOnDown && <span className="text-xs bg-red-600 text-white px-2 py-1 rounded font-mono">Down</span>}
                    {rule.rules.notifyOnDegraded && <span className="text-xs bg-yellow-600 text-white px-2 py-1 rounded font-mono">Degraded</span>}
                    {rule.rules.notifyOnHighLatency && <span className="text-xs bg-orange-600 text-white px-2 py-1 rounded font-mono">High Latency</span>}
                    {rule.rules.notifyOnSloViolation && <span className="text-xs bg-purple-600 text-white px-2 py-1 rounded font-mono">SLO Violation</span>}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-2">
                    {rule.channels.email?.enabled && <span className="text-xs bg-green-600 text-white px-2 py-1 rounded font-mono">Email</span>}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`text-xs px-2 py-1 rounded font-mono ${
                    rule.enabled ? 'bg-emerald-600 text-white' : 'bg-zinc-700 text-zinc-300'
                  }`}>
                    {rule.enabled ? 'ENABLED' : 'DISABLED'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(rule)}
                      className="text-cyan-400 hover:text-cyan-300 font-mono text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(rule.id)}
                      className="text-red-400 hover:text-red-300 font-mono text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {rules.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-zinc-400 font-mono">
                  No alert rules configured. Click "+ ADD RULE" to create one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-black border border-zinc-800 p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-white font-mono mb-4">
              {editingRule ? 'Edit Alert Rule' : 'Create Alert Rule'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-white font-mono mb-2">Service</label>
                <select
                  required
                  value={formData.serviceId}
                  onChange={(e) => setFormData({ ...formData, serviceId: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 text-white px-3 py-2 font-mono"
                >
                  <option value="">Select a service</option>
                  {services.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="enabled"
                  checked={formData.enabled}
                  onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                  className="w-4 h-4"
                />
                <label htmlFor="enabled" className="text-white font-mono text-sm">Enabled</label>
              </div>

              <div className="border-t border-zinc-800 pt-4">
                <h3 className="text-sm font-bold text-white font-mono mb-4">Alert Conditions</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.rules.notifyOnDown}
                      onChange={(e) => setFormData({
                        ...formData,
                        rules: { ...formData.rules, notifyOnDown: e.target.checked }
                      })}
                    />
                    <label className="text-white font-mono text-sm">Notify when service goes DOWN</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.rules.notifyOnDegraded}
                      onChange={(e) => setFormData({
                        ...formData,
                        rules: { ...formData.rules, notifyOnDegraded: e.target.checked }
                      })}
                    />
                    <label className="text-white font-mono text-sm">Notify when service is DEGRADED</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.rules.notifyOnHighLatency}
                      onChange={(e) => setFormData({
                        ...formData,
                        rules: { ...formData.rules, notifyOnHighLatency: e.target.checked }
                      })}
                    />
                    <label className="text-white font-mono text-sm">Notify on high latency</label>
                    {formData.rules.notifyOnHighLatency && (
                      <input
                        type="number"
                        value={formData.rules.highLatencyThreshold}
                        onChange={(e) => setFormData({
                          ...formData,
                          rules: { ...formData.rules, highLatencyThreshold: parseInt(e.target.value) }
                        })}
                        className="w-24 bg-zinc-900 border border-zinc-800 text-white px-2 py-1 font-mono text-sm"
                        placeholder="ms"
                      />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.rules.notifyOnSloViolation}
                      onChange={(e) => setFormData({
                        ...formData,
                        rules: { ...formData.rules, notifyOnSloViolation: e.target.checked }
                      })}
                    />
                    <label className="text-white font-mono text-sm">Notify on SLO violation</label>
                  </div>
                </div>
              </div>

              <div className="border-t border-zinc-800 pt-4">
                <h3 className="text-sm font-bold text-white font-mono mb-4">Notification Channels</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.channels.email?.enabled || false}
                      onChange={(e) => setFormData({
                        ...formData,
                        channels: {
                          ...formData.channels,
                          email: { ...formData.channels.email, enabled: e.target.checked }
                        }
                      })}
                    />
                    <label className="text-white font-mono text-sm">Email Notifications</label>
                  </div>
                  {formData.channels.email?.enabled && (
                    <div className="ml-6">
                      <label className="block text-sm text-zinc-400 font-mono mb-2">Email Recipients (comma-separated)</label>
                      <input
                        type="text"
                        value={formData.channels.email?.recipients?.join(', ') || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          channels: {
                            ...formData.channels,
                            email: {
                              ...formData.channels.email,
                              recipients: e.target.value.split(',').map(email => email.trim()).filter(email => email)
                            }
                          }
                        })}
                        placeholder="user@example.com, admin@example.com"
                        className="w-full bg-zinc-900 border border-zinc-800 text-white px-3 py-2 font-mono text-sm"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 bg-cyan-400 hover:bg-cyan-500 text-black px-4 py-2 font-mono font-bold"
                >
                  SAVE
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingRule(null);
                    resetForm();
                  }}
                  className="flex-1 border border-zinc-800 text-white hover:bg-zinc-900 px-4 py-2 font-mono font-bold"
                >
                  CANCEL
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

