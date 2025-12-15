import express from 'express';
import HealthLog from '../models/HealthLog.js';
import ReliabilityScore from '../models/ReliabilityScore.js';
import Service from '../models/Service.js';
import Incident from '../models/Incident.js';
import { apiLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Generate monthly performance report
router.get('/monthly/:serviceId', apiLimiter, async (req, res) => {
  try {
    const { serviceId } = req.params;
    const { month, year, period } = req.query;

    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    let startDate, endDate;
    let periodLabel = '';

    // If period is 'today', show only today's data
    if (period === 'today') {
      const today = new Date();
      startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
      periodLabel = 'Today';
    } else {
      // Default to current month if not specified
      const reportDate = month && year 
        ? new Date(parseInt(year), parseInt(month) - 1, 1)
        : new Date();
      
      startDate = new Date(reportDate.getFullYear(), reportDate.getMonth(), 1);
      endDate = new Date(reportDate.getFullYear(), reportDate.getMonth() + 1, 0, 23, 59, 59, 999);
      periodLabel = 'Month';
    }

    // Get all health logs for the period
    const logs = await HealthLog.find({
      serviceId,
      timestamp: { $gte: startDate, $lte: endDate }
    }).sort({ timestamp: 1 });

    // Get reliability score
    const reliability = await ReliabilityScore.findOne({ serviceId });

    // Get incidents for the period
    const incidents = await Incident.find({
      serviceId,
      startedAt: { $gte: startDate, $lte: endDate }
    }).sort({ startedAt: -1 });

    // Calculate metrics
    const totalChecks = logs.length;
    const okChecks = logs.filter(log => log.status === 'ok').length;
    const downChecks = logs.filter(log => log.status === 'down').length;
    const degradedChecks = logs.filter(log => log.status === 'degraded').length;
    
    const uptime = totalChecks > 0 ? (okChecks / totalChecks) * 100 : 0;
    const errorRate = totalChecks > 0 ? (downChecks / totalChecks) * 100 : 0;
    
    // Calculate latency percentiles
    const latencies = logs
      .map(log => log.latency)
      .filter(lat => lat > 0)
      .sort((a, b) => a - b);

    const p50 = latencies.length > 0 ? latencies[Math.floor(latencies.length * 0.5)] || 0 : 0;
    const p95 = latencies.length > 0 ? latencies[Math.floor(latencies.length * 0.95)] || 0 : 0;
    const p99 = latencies.length > 0 ? latencies[Math.floor(latencies.length * 0.99)] || 0 : 0;
    const avgLatency = latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0;

    // Calculate total errors
    const totalErrors = logs.reduce((sum, log) => sum + (log.errorCount || 0), 0);

    // Calculate downtime
    const downtimeMinutes = incidents
      .filter(inc => !inc.resolved || (inc.endedAt && inc.endedAt <= endDate))
      .reduce((sum, inc) => {
        const start = new Date(inc.startedAt);
        const end = inc.resolved && inc.endedAt ? new Date(inc.endedAt) : endDate;
        const duration = Math.max(0, (end - start) / (1000 * 60)); // minutes
        return sum + duration;
      }, 0);

    // SLO status
    const sloTarget = service.sloTarget || 99.9;
    const sloStatus = uptime >= sloTarget ? 'PASS' : 'FAIL';
    const sloViolations = incidents.filter(inc => inc.severity === 'critical').length;

    res.json({
      serviceId: service._id.toString(),
      serviceName: service.name,
      period: {
        start: startDate,
        end: endDate,
        month: startDate.getMonth() + 1,
        year: startDate.getFullYear(),
        label: periodLabel
      },
      summary: {
        totalChecks,
        okChecks,
        downChecks,
        degradedChecks,
        uptime: parseFloat(uptime.toFixed(2)),
        errorRate: parseFloat(errorRate.toFixed(2)),
        totalErrors,
        downtimeMinutes: parseFloat(downtimeMinutes.toFixed(2)),
        incidentsCount: incidents.length,
        criticalIncidents: incidents.filter(inc => inc.severity === 'critical').length
      },
      latency: {
        p50: parseFloat(p50.toFixed(2)),
        p95: parseFloat(p95.toFixed(2)),
        p99: parseFloat(p99.toFixed(2)),
        average: parseFloat(avgLatency.toFixed(2))
      },
      slo: {
        target: sloTarget,
        actual: parseFloat(uptime.toFixed(2)),
        status: sloStatus,
        violations: sloViolations
      },
      reliability: reliability ? {
        uptime: reliability.uptime,
        p50Latency: reliability.p50Latency,
        p95Latency: reliability.p95Latency,
        p99Latency: reliability.p99Latency,
        errorRate: reliability.errorRate,
        status: reliability.status
      } : null,
      incidents: incidents.map(inc => ({
        id: inc._id.toString(),
        type: inc.type,
        severity: inc.severity,
        startedAt: inc.startedAt,
        endedAt: inc.endedAt,
        resolved: inc.resolved,
        duration: inc.resolved && inc.endedAt 
          ? Math.round((new Date(inc.endedAt) - new Date(inc.startedAt)) / (1000 * 60))
          : null
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all monthly reports for a service
router.get('/monthly/:serviceId/all', apiLimiter, async (req, res) => {
  try {
    const { serviceId } = req.params;
    
    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    // Get first health log to determine oldest month
    const firstLog = await HealthLog.findOne({ serviceId }).sort({ timestamp: 1 });
    if (!firstLog) {
      return res.json([]);
    }

    const reports = [];
    const startDate = new Date(firstLog.timestamp);
    const endDate = new Date();
    
    // Generate reports for each month
    let currentDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    
    while (currentDate <= endDate) {
      const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59);
      
      const logs = await HealthLog.find({
        serviceId,
        timestamp: { $gte: monthStart, $lte: monthEnd }
      });

      if (logs.length > 0) {
        const okChecks = logs.filter(log => log.status === 'ok').length;
        const uptime = (okChecks / logs.length) * 100;
        
        reports.push({
          month: currentDate.getMonth() + 1,
          year: currentDate.getFullYear(),
          uptime: parseFloat(uptime.toFixed(2)),
          totalChecks: logs.length
        });
      }
      
      // Move to next month
      currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    }

    res.json(reports.reverse()); // Most recent first
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

