import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getService, getReliabilityScore, getMonthlyReport, getAllMonthlyReports } from '../services/api';
import { useProject } from '../context/ProjectContext';

export const SLOReport = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { selectedProject } = useProject();
  const [service, setService] = useState(null);
  const [reliability, setReliability] = useState(null);
  const [monthlyReport, setMonthlyReport] = useState(null);
  const [allReports, setAllReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [viewPeriod, setViewPeriod] = useState('today'); // 'today' or 'month'

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id, selectedMonth, selectedYear, viewPeriod]);

  const loadData = async () => {
    try {
      const today = new Date();
      const isCurrentMonth = selectedMonth === today.getMonth() + 1 && selectedYear === today.getFullYear();
      const period = (viewPeriod === 'today' && isCurrentMonth) ? 'today' : null;
      
      const [serviceRes, reliabilityRes, reportRes, allReportsRes] = await Promise.allSettled([
        getService(id),
        getReliabilityScore(id),
        getMonthlyReport(id, selectedMonth, selectedYear, period),
        getAllMonthlyReports(id)
      ]);
      setService(serviceRes.status === 'fulfilled' ? serviceRes.value.data : null);
      setReliability(reliabilityRes.status === 'fulfilled' ? reliabilityRes.value.data : null);
      setMonthlyReport(reportRes.status === 'fulfilled' ? reportRes.value.data : null);
      setAllReports(allReportsRes.status === 'fulfilled' ? allReportsRes.value.data : []);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-white font-mono">Loading...</div>;
  }

  if (!service) {
    return <div className="text-center py-12 text-white font-mono">Service not found</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-cyan-400 font-mono mb-2">SLO/SLA Report</h1>
          <p className="text-zinc-400 font-mono">{service.name}</p>
        </div>
        <button
          onClick={() => navigate(`/service/${id}`)}
          className="px-4 py-2 bg-zinc-800 border border-zinc-700 text-white hover:bg-zinc-700 font-mono text-sm"
        >
          ← Back to Service
        </button>
      </div>

      {/* Period Selector */}
      <div className="flex items-center gap-4 bg-black border border-zinc-800 p-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewPeriod('today')}
            className={`px-4 py-2 font-mono text-sm transition-colors ${
              viewPeriod === 'today'
                ? 'bg-cyan-600 text-white'
                : 'bg-zinc-900 border border-zinc-800 text-white hover:bg-zinc-800'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setViewPeriod('month')}
            className={`px-4 py-2 font-mono text-sm transition-colors ${
              viewPeriod === 'month'
                ? 'bg-cyan-600 text-white'
                : 'bg-zinc-900 border border-zinc-800 text-white hover:bg-zinc-800'
            }`}
          >
            Full Month
          </button>
        </div>
        
        {viewPeriod === 'month' && (
          <>
            <div className="h-6 w-px bg-zinc-700"></div>
            <label className="text-white font-mono text-sm">Month:</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="bg-zinc-900 border border-zinc-800 text-white px-3 py-2 font-mono"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                <option key={month} value={month}>
                  {new Date(2000, month - 1).toLocaleString('default', { month: 'long' })}
                </option>
              ))}
            </select>
            <label className="text-white font-mono text-sm">Year:</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="bg-zinc-900 border border-zinc-800 text-white px-3 py-2 font-mono"
            >
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </>
        )}
      </div>

      {/* Current SLO Status */}
      {reliability ? (
        <div className="bg-black border border-zinc-800 rounded-lg p-6">
          <h2 className="text-lg font-bold text-white font-mono mb-4">Current SLO Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-zinc-400 uppercase font-mono mb-1">Uptime</p>
              <p className={`text-2xl font-mono font-bold ${
                (reliability.uptime || 0) >= (reliability.sloTarget || 99.9) ? 'text-emerald-400' : 'text-red-400'
              }`}>
                {(reliability.uptime || 0).toFixed(2)}%
              </p>
              <p className="text-xs text-zinc-500 font-mono">Target: {reliability.sloTarget || 99.9}%</p>
            </div>
            <div>
              <p className="text-xs text-zinc-400 uppercase font-mono mb-1">Error Rate</p>
              <p className="text-2xl font-mono font-bold text-white">{(reliability.errorRate || 0).toFixed(2)}%</p>
            </div>
            <div>
              <p className="text-xs text-zinc-400 uppercase font-mono mb-1">P95 Latency</p>
              <p className="text-2xl font-mono font-bold text-white">{(reliability.p95Latency || 0).toFixed(0)}ms</p>
            </div>
            <div>
              <p className="text-xs text-zinc-400 uppercase font-mono mb-1">Status</p>
              <p className={`text-2xl font-mono font-bold ${
                reliability.status === 'PASS' ? 'text-emerald-400' : 'text-red-400'
              }`}>
                {reliability.status || 'UNKNOWN'}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-black border border-zinc-800 rounded-lg p-6">
          <h2 className="text-lg font-bold text-white font-mono mb-4">Current SLO Status</h2>
          <p className="text-zinc-400 font-mono">No reliability data available. Run health checks to generate SLO metrics.</p>
        </div>
      )}

      {/* Monthly Report */}
      {monthlyReport ? (
        <div className="space-y-6">
          <div className="bg-black border border-zinc-800 rounded-lg p-6">
            <h2 className="text-lg font-bold text-white font-mono mb-4">
              {monthlyReport.period?.label === 'Today' ? 'Today\'s Report' : 'Monthly Report'} - {new Date(selectedYear, selectedMonth - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
            </h2>
            
            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div>
                <p className="text-xs text-zinc-400 uppercase font-mono mb-1">Total Checks</p>
                <p className="text-xl font-mono font-bold text-white">{monthlyReport.summary.totalChecks}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-400 uppercase font-mono mb-1">Uptime</p>
                <p className={`text-xl font-mono font-bold ${
                  monthlyReport.slo.status === 'PASS' ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {monthlyReport.summary.uptime}%
                </p>
              </div>
              <div>
                <p className="text-xs text-zinc-400 uppercase font-mono mb-1">Downtime</p>
                <p className="text-xl font-mono font-bold text-white">{monthlyReport.summary.downtimeMinutes.toFixed(0)} min</p>
              </div>
              <div>
                <p className="text-xs text-zinc-400 uppercase font-mono mb-1">Incidents</p>
                <p className="text-xl font-mono font-bold text-white">{monthlyReport.summary.incidentsCount}</p>
              </div>
            </div>

            {/* Latency Percentiles */}
            <div className="border-t border-zinc-800 pt-6">
              <h3 className="text-sm font-bold text-white font-mono mb-4">Latency Percentiles</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-zinc-400 uppercase font-mono mb-1">P50</p>
                  <p className="text-lg font-mono font-bold text-white">{monthlyReport.latency.p50}ms</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-400 uppercase font-mono mb-1">P95</p>
                  <p className="text-lg font-mono font-bold text-white">{monthlyReport.latency.p95}ms</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-400 uppercase font-mono mb-1">P99</p>
                  <p className="text-lg font-mono font-bold text-white">{monthlyReport.latency.p99}ms</p>
                </div>
              </div>
            </div>

            {/* SLO Status */}
            <div className="border-t border-zinc-800 pt-6 mt-6">
              <h3 className="text-sm font-bold text-white font-mono mb-4">SLO Compliance</h3>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-zinc-400 font-mono">Target: {monthlyReport.slo.target}%</p>
                  <p className="text-xs text-zinc-400 font-mono">Actual: {monthlyReport.slo.actual}%</p>
                </div>
                <div className={`px-4 py-2 rounded font-mono font-bold ${
                  monthlyReport.slo.status === 'PASS' 
                    ? 'bg-emerald-600 text-white' 
                    : 'bg-red-600 text-white'
                }`}>
                  {monthlyReport.slo.status}
                </div>
              </div>
              {monthlyReport.slo.violations > 0 && (
                <p className="text-xs text-red-400 font-mono mt-2">
                  {monthlyReport.slo.violations} SLO violation(s) detected
                </p>
              )}
            </div>
          </div>

          {/* Historical Reports */}
          {allReports.length > 0 && (
            <div className="bg-black border border-zinc-800 rounded-lg p-6">
              <h2 className="text-lg font-bold text-white font-mono mb-4">Historical Reports</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-zinc-800">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-cyan-400 uppercase font-mono">Month</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-cyan-400 uppercase font-mono">Uptime</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-cyan-400 uppercase font-mono">Checks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {allReports.map((report, idx) => (
                      <tr key={idx} className="hover:bg-zinc-900">
                        <td className="px-4 py-2 text-white font-mono">
                          {new Date(report.year, report.month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
                        </td>
                        <td className="px-4 py-2 text-white font-mono">{report.uptime}%</td>
                        <td className="px-4 py-2 text-white font-mono">{report.totalChecks}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-black border border-zinc-800 rounded-lg p-6">
          <h2 className="text-lg font-bold text-white font-mono mb-4">Monthly Report</h2>
          <p className="text-zinc-400 font-mono">No data available for the selected month. Run health checks to generate reports.</p>
        </div>
      )}
    </div>
  );
};

