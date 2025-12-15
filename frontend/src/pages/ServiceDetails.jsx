import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { StatusBadge } from '../components/StatusBadge';
import { MetricsChart } from '../components/MetricsChart';
import { getService, getHealthHistory, fetchServiceHealth, fetchServiceMetrics, fetchServiceSelftest } from '../services/api';
import { getSocket } from '../utils/socket';

export const ServiceDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [service, setService] = useState(null);
  const [metrics, setMetrics] = useState([]);
  const [healthData, setHealthData] = useState(null);
  const [liveMetrics, setLiveMetrics] = useState(null);
  const [selftestData, setSelftestData] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const pollIntervalRef = useRef(null);

  useEffect(() => {
    loadService();
    
    // Use shared socket instance
    const socket = getSocket();
    
    socket.on('healthUpdate', (data) => {
      if (data.serviceId === id) {
        setService(prev => prev ? { ...prev, status: data.status, latency: data.latency, cpu: data.cpu, memory: data.memory } : null);
      }
    });

    return () => {
      socket.off('healthUpdate');
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [id]);

  const loadService = async () => {
    try {
      const res = await getService(id);
      setService(res.data);
      loadHealthHistory();
      fetchData();
    } catch (error) {
      console.error('Failed to load service:', error);
      navigate('/services');
    }
  };

  const loadHealthHistory = async () => {
    try {
      const res = await getHealthHistory(id, 24);
      const history = res.data.map(log => ({
        timestamp: new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        latency: log.latency,
        cpu: log.cpu,
        memory: log.memory
      }));
      setMetrics(history);
    } catch (error) {
      console.error('Failed to load health history:', error);
    }
  };

  const fetchData = useCallback(async () => {
    if (!service || !service.id) return;
    
    try {
      // Fetch health first (most important)
      const [h, m, s] = await Promise.allSettled([
        fetchServiceHealth(service.id).catch(err => {
          console.warn('Health fetch failed:', err.message);
          return null;
        }),
        // Only fetch metrics if service has metricsUrl or we're on metrics tab
        (activeTab === 'metrics' && service.metricsUrl) 
          ? fetchServiceMetrics(service.id).catch(err => {
              console.warn('Metrics fetch failed:', err.message);
              return null;
            })
          : Promise.resolve(null),
        // Only fetch selftest if we're on selftest tab
        activeTab === 'selftest'
          ? fetchServiceSelftest(service.id).catch(() => null)
          : Promise.resolve(null)
      ]);
      setHealthData(h.status === 'fulfilled' ? h.value : null);
      setLiveMetrics(m.status === 'fulfilled' ? m.value : null);
      setSelftestData(s.status === 'fulfilled' ? s.value : null);
      setLastUpdated(new Date());
      setError(null);
    } catch (e) {
      if (!service.status || service.status === 'unknown') {
        setError(e.message || "Connection failed");
      } else {
        setError(null);
      }
    }
  }, [service, activeTab]);

  useEffect(() => {
    if (service) {
      fetchData();
      // Increase polling interval to 10 seconds to reduce load
      pollIntervalRef.current = setInterval(fetchData, 10000);
    }
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [service, fetchData]);

  // Fetch data immediately when tab changes (without recreating interval)
  useEffect(() => {
    if (service) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  if (!service) {
    return <div className="text-center py-12 text-white font-mono">Loading...</div>;
  }

  const getMappedStatus = (status) => {
    if (!status) return 'down';
    const s = status.toUpperCase();
    if (s === 'UP') return 'ok';
    if (s === 'DOWN') return 'down';
    return 'degraded';
  };

  const formatBytes = (bytes) => {
    if (bytes === undefined || bytes === null) return '-';
    if (bytes === 0) return '0 B';
    const mb = bytes / 1024 / 1024;
    return `${mb.toFixed(1)} MB`;
  };

  const formatUptime = (seconds) => {
    if (seconds === undefined || seconds === null) return '-';
    const days = Math.floor(seconds / (3600 * 24));
    const hours = Math.floor((seconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  const formatMetricValue = (value) => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'number') {
      if (value >= 1000000) return `${(value / 1000000).toFixed(2)}M`;
      if (value >= 1000) return `${(value / 1000).toFixed(2)}K`;
      if (value % 1 !== 0) return value.toFixed(2);
      return value.toString();
    }
    if (typeof value === 'object') {
      const keys = Object.keys(value);
      if (keys.length === 0) return '{}';
      if (keys.length <= 3) {
        return JSON.stringify(value, null, 2);
      }
      return `{${keys.length} properties}`;
    }
    if (typeof value === 'string' && value.length > 100) {
      return value.substring(0, 100) + '...';
    }
    return String(value);
  };

  const getAdditionalMetrics = () => {
    if (!liveMetrics) return [];
    
    const excludedKeys = [
      'mem', 'cpu', 'uptime', 'process', 'status', 
      'memoryUsage', 'cpuUsage', '_format', '_raw', '_rawPreview'
    ];
    
    if (liveMetrics._format === 'prometheus' && liveMetrics._parsed) {
      return Object.entries(liveMetrics._parsed)
        .filter(([key]) => !excludedKeys.includes(key))
        .map(([key, value]) => ({
          key: key.replace(/{.*}/, ''),
          label: key.includes('{') ? key : key,
          value: value,
          type: 'number'
        }));
    }
    
    return Object.entries(liveMetrics)
      .filter(([key, value]) => {
        if (excludedKeys.includes(key)) return false;
        if (typeof value === 'function') return false;
        if (typeof value === 'string' && value.length > 200) return false;
        if ((typeof value === 'object' && value !== null && Object.keys(value).length === 0)) return false;
        return true;
      })
      .map(([key, value]) => ({
        key: key,
        label: key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
        value: value,
        type: typeof value
      }));
  };

  const additionalMetrics = getAdditionalMetrics();

  // Calculate average latency
  const avgLatency = metrics.length > 0 
    ? Math.round(metrics.reduce((sum, m) => sum + (m.latency || 0), 0) / metrics.length)
    : Math.round(service.latency || 0);

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center space-x-3 mb-2">
            <h1 className="text-2xl font-bold text-cyan-400 font-mono">{service.name}</h1>
            <StatusBadge status={service.status || (healthData ? getMappedStatus(healthData.status) : 'unknown')} />
          </div>
          <div className="text-sm text-zinc-400 font-mono">
            {service.url}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-zinc-800">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-4 px-1 border-b-2 font-semibold text-sm transition-colors font-mono ${
              activeTab === 'overview'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-zinc-400 hover:text-white hover:border-zinc-600'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('health')}
            className={`py-4 px-1 border-b-2 font-semibold text-sm transition-colors font-mono ${
              activeTab === 'health'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-zinc-400 hover:text-white hover:border-zinc-600'
            }`}
          >
            Health & Metrics
          </button>
          <button
            onClick={() => navigate(`/service/${id}/slo`)}
            className="py-4 px-1 border-b-2 border-transparent text-zinc-400 hover:text-white hover:border-zinc-600 font-semibold text-sm transition-colors font-mono"
          >
            SLO Report
          </button>
        </nav>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Graph Panels */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-black border border-zinc-800 rounded-lg p-6">
              <h3 className="text-sm font-bold text-cyan-400 uppercase mb-4 font-mono">LATENCY (24H)</h3>
              <MetricsChart data={metrics} type="latency" />
            </div>
            <div className="bg-black border border-zinc-800 rounded-lg p-6">
              <h3 className="text-sm font-bold text-cyan-400 uppercase mb-4 font-mono">SYSTEM RESOURCES</h3>
              <MetricsChart data={metrics} type="resources" />
            </div>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="bg-black border border-zinc-800 rounded-lg p-4">
              <span className="text-zinc-400 text-xs uppercase font-semibold font-mono">AVG LATENCY</span>
              <div className="text-2xl font-mono font-bold mt-1 text-white">
                {avgLatency}ms
              </div>
            </div>
            <div className="bg-black border border-zinc-800 rounded-lg p-4">
              <span className="text-zinc-400 text-xs uppercase font-semibold font-mono">UPTIME (SLA)</span>
              <div className={`text-2xl font-mono font-bold mt-1 ${
                (service.uptime || 0) < 99.9 ? 'text-red-500' : 'text-white'
              }`}>
                {typeof service.uptime === 'number' ? service.uptime.toFixed(2) : '0.00'}%
              </div>
            </div>
            <div className="bg-black border border-zinc-800 rounded-lg p-4">
              <span className="text-zinc-400 text-xs uppercase font-semibold font-mono">LIVE MEM (RSS)</span>
              <div className="text-2xl font-mono font-bold mt-1 text-white">
                {liveMetrics?.mem?.rss ? formatBytes(liveMetrics.mem.rss) : '-'}
              </div>
            </div>
            <div className="bg-black border border-zinc-800 rounded-lg p-4">
              <span className="text-zinc-400 text-xs uppercase font-semibold font-mono">GROUP</span>
              <div className="text-2xl font-bold mt-1 text-white font-mono">{service.group || 'Default'}</div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'health' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Health Checks Card */}
          <div className="bg-black border border-zinc-800 rounded-lg overflow-hidden">
            <div className="bg-zinc-900 px-6 py-4 border-b border-zinc-800 flex justify-between items-center">
              <h3 className="font-semibold text-white flex items-center space-x-2 font-mono">
                <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Health Checks</span>
              </h3>
              <span className="text-xs text-zinc-400 font-mono bg-zinc-800 px-2 py-1 rounded border border-zinc-700">
                GET /health
              </span>
            </div>
            
            {healthData ? (
              <div className="divide-y divide-zinc-800">
                <div className="p-6 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white font-mono">Aggregate Status</p>
                    <p className="text-xs text-zinc-400 mt-1 font-mono">
                      {healthData.checks && healthData.checks.length > 0 
                        ? `Calculated from ${healthData.checks.length} health check${healthData.checks.length !== 1 ? 's' : ''}`
                        : 'Global health of the microservice'}
                    </p>
                  </div>
                  <StatusBadge status={getMappedStatus(healthData.aggregateStatus || healthData.status)} />
                </div>
                
                {healthData.checks?.map((check, idx) => (
                  <div key={idx} className="p-4 flex items-start justify-between hover:bg-zinc-900 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-white flex items-center capitalize font-mono">
                        <span className="w-2 h-2 rounded-full bg-zinc-600 mr-2"></span>
                        {check.name}
                      </p>
                      {check.data && Object.keys(check.data).length > 0 && (
                        <div className="mt-1 text-xs text-zinc-400 font-mono ml-4">
                          {Object.entries(check.data).map(([k,v]) => `${k}: ${v}`).join(' | ')}
                        </div>
                      )}
                    </div>
                    <StatusBadge size="sm" status={getMappedStatus(check.status)} />
                  </div>
                ))}
                
                {(!healthData.checks || healthData.checks.length === 0) && (
                  <div className="p-6 text-zinc-400 text-sm italic font-mono">No specific checks configured in payload.</div>
                )}
              </div>
            ) : (
              <div className="p-10 text-center">
                {error ? (
                  <div className="text-red-400">
                    <svg className="w-8 h-8 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <p className="font-semibold font-mono">Connection Failed</p>
                    <p className="text-xs text-zinc-400 mt-1 font-mono">Ensure {service.url} is reachable and CORS is enabled.</p>
                  </div>
                ) : (
                  <p className="text-zinc-400 animate-pulse font-mono">Connecting to service...</p>
                )}
              </div>
            )}
          </div>

          {/* Runtime Metrics Card */}
          <div className="bg-black border border-zinc-800 rounded-lg overflow-hidden">
            <div className="bg-zinc-900 px-6 py-4 border-b border-zinc-800 flex justify-between items-center">
              <h3 className="font-semibold text-white flex items-center space-x-2 font-mono">
                <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>Runtime Metrics</span>
              </h3>
              <span className="text-xs text-zinc-400 font-mono bg-zinc-800 px-2 py-1 rounded border border-zinc-700">
                GET /metrics
              </span>
            </div>
            
            {liveMetrics ? (
              <div className="p-6 space-y-6">
                <div className="flex items-center justify-between p-4 bg-zinc-900 rounded-lg border border-zinc-800">
                  <div className="flex items-center space-x-3">
                    <div className="bg-zinc-800 p-2 rounded text-cyan-400">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-white font-mono">Process Uptime</span>
                  </div>
                  <span className="text-lg font-mono font-bold text-white">{formatUptime(liveMetrics.uptime)}</span>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-medium text-white font-mono">Memory Usage (Heap)</span>
                    <span className="text-zinc-400 font-mono">
                      {formatBytes(liveMetrics.mem?.heapUsed)} / {formatBytes(liveMetrics.mem?.heapTotal)}
                    </span>
                  </div>
                  <div className="w-full bg-zinc-800 rounded-full h-2.5 overflow-hidden">
                    <div 
                      className="bg-cyan-400 h-2.5 rounded-full transition-all duration-500" 
                      style={{ width: `${liveMetrics.mem && liveMetrics.mem.heapTotal ? (liveMetrics.mem.heapUsed / liveMetrics.mem.heapTotal) * 100 : 0}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between mt-2 text-xs text-zinc-400 font-mono">
                    <span>RSS: {formatBytes(liveMetrics.mem?.rss)}</span>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-white mb-3 font-mono">CPU Usage (Ticks)</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-zinc-900 p-3 rounded border border-zinc-800">
                      <p className="text-xs text-zinc-400 uppercase font-mono">User</p>
                      <p className="text-lg font-mono font-medium text-white">{liveMetrics.cpu?.user?.toLocaleString() ?? 0}</p>
                    </div>
                    <div className="bg-zinc-900 p-3 rounded border border-zinc-800">
                      <p className="text-xs text-zinc-400 uppercase font-mono">System</p>
                      <p className="text-lg font-mono font-medium text-white">{liveMetrics.cpu?.system?.toLocaleString() ?? 0}</p>
                    </div>
                  </div>
                </div>

                {additionalMetrics.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-zinc-800">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-semibold text-white font-mono">Additional Metrics</h4>
                      {liveMetrics?._format === 'prometheus' && (
                        <span className="text-xs text-zinc-400 bg-zinc-800 px-2 py-1 rounded border border-zinc-700 font-mono">
                          Prometheus Format
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {additionalMetrics.map((metric, idx) => (
                        <div 
                          key={idx} 
                          className="bg-zinc-900 p-4 rounded-lg border border-zinc-800 hover:border-cyan-400 transition-colors"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide truncate flex-1 font-mono">
                              {metric.label}
                            </p>
                            {metric.type === 'number' && (
                              <span className="ml-2 text-xs text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded font-mono">
                                {metric.type}
                              </span>
                            )}
                          </div>
                          <p className={`text-lg font-mono font-bold text-white break-all ${
                            metric.type === 'number' ? 'text-cyan-400' : 'text-white'
                          }`}>
                            {formatMetricValue(metric.value)}
                          </p>
                          {typeof metric.value === 'object' && metric.value !== null && (
                            <details className="mt-2">
                              <summary className="text-xs text-zinc-400 cursor-pointer hover:text-zinc-300 font-mono">
                                View details
                              </summary>
                              <pre className="mt-2 text-xs bg-zinc-900 p-2 rounded border border-zinc-800 overflow-auto max-h-32 font-mono text-zinc-300">
                                {JSON.stringify(metric.value, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {liveMetrics?._format === 'prometheus' && liveMetrics?._rawPreview && (
                  <div className="mt-4 p-4 bg-zinc-900 border border-zinc-800 rounded-lg">
                    <details>
                      <summary className="text-sm font-medium text-white cursor-pointer hover:text-cyan-400 font-mono">
                        View Raw Prometheus Metrics
                      </summary>
                      <pre className="mt-3 text-xs text-zinc-300 bg-black p-3 rounded border border-zinc-800 overflow-auto max-h-48 font-mono">
                        {liveMetrics._rawPreview}
                        {liveMetrics._rawPreview.length >= 500 && '...'}
                      </pre>
                    </details>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-10 text-center">
                {error ? (
                  <div className="text-red-400">
                    <svg className="w-8 h-8 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <p className="font-semibold font-mono">Metrics Unavailable</p>
                    <p className="text-xs text-zinc-400 mt-1 font-mono">Could not fetch /metrics from {service.url}</p>
                  </div>
                ) : (
                  <p className="text-zinc-400 animate-pulse font-mono">Fetching metrics...</p>
                )}
              </div>
            )}
          </div>

          {/* Selftest Card */}
          <div className="bg-black border border-zinc-800 rounded-lg overflow-hidden">
            <div className="bg-zinc-900 px-6 py-4 border-b border-zinc-800 flex justify-between items-center">
              <h3 className="font-semibold text-white flex items-center space-x-2 font-mono">
                <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Self-Test</span>
              </h3>
              <span className="text-xs text-zinc-400 font-mono bg-zinc-800 px-2 py-1 rounded border border-zinc-700">
                GET /selftest
              </span>
            </div>
            
            {selftestData ? (
              <div className="p-6 space-y-4">
                {selftestData.checks ? (
                  <div className="space-y-3">
                    {Object.entries(selftestData.checks).map(([checkName, checkData]) => (
                      <div key={checkName} className="flex items-start justify-between p-4 bg-zinc-900 rounded-lg border border-zinc-800">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`w-2 h-2 rounded-full ${
                              checkData.status === 'ok' ? 'bg-emerald-400' : 
                              checkData.status === 'warning' ? 'bg-yellow-400' : 
                              'bg-red-400'
                            }`}></span>
                            <p className="text-sm font-medium text-white font-mono capitalize">
                              {checkName}
                            </p>
                          </div>
                          {checkData.message && (
                            <p className="text-xs text-zinc-400 font-mono ml-4">
                              {checkData.message}
                            </p>
                          )}
                        </div>
                        <StatusBadge 
                          size="sm" 
                          status={checkData.status === 'ok' ? 'ok' : checkData.status === 'warning' ? 'degraded' : 'down'} 
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 bg-zinc-900 rounded-lg border border-zinc-800">
                    <p className="text-sm text-white font-mono">Status: {selftestData.status || 'unknown'}</p>
                    {selftestData.timestamp && (
                      <p className="text-xs text-zinc-400 font-mono mt-1">
                        {new Date(selftestData.timestamp).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-10 text-center">
                <p className="text-zinc-400 font-mono text-sm">
                  Selftest endpoint not available or not implemented
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
