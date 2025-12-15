import express from 'express';
import HealthLog from '../models/HealthLog.js';
import Service from '../models/Service.js';
import { healthCheckLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Prometheus-compatible metrics endpoint
router.get('/', healthCheckLimiter, async (req, res) => {
  try {
    const services = await Service.find({ active: true });
    
    let metrics = '# HELP service_up Service availability (1 = up, 0 = down)\n';
    metrics += '# TYPE service_up gauge\n';
    
    let latencyMetrics = '# HELP service_latency_ms Service response latency in milliseconds\n';
    latencyMetrics += '# TYPE service_latency_ms gauge\n';
    
    let errorMetrics = '# HELP service_errors Total number of errors\n';
    errorMetrics += '# TYPE service_errors counter\n';
    
    let cpuMetrics = '# HELP service_cpu_usage CPU usage percentage\n';
    cpuMetrics += '# TYPE service_cpu_usage gauge\n';
    
    let memoryMetrics = '# HELP service_memory_mb Memory usage in megabytes\n';
    memoryMetrics += '# TYPE service_memory_mb gauge\n';

    for (const service of services) {
      const latestLog = await HealthLog.findOne({ serviceId: service._id })
        .sort({ timestamp: -1 });

      const serviceName = service.name.replace(/[^a-zA-Z0-9_]/g, '_');
      const isUp = latestLog?.status === 'ok' ? 1 : 0;
      const latency = latestLog?.latency || 0;
      const cpu = latestLog?.cpu || 0;
      const memory = latestLog?.memory || 0;

      // Count errors in last hour
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const errorCount = await HealthLog.countDocuments({
        serviceId: service._id,
        status: 'down',
        timestamp: { $gte: oneHourAgo }
      });

      metrics += `service_up{service="${serviceName}"} ${isUp}\n`;
      latencyMetrics += `service_latency_ms{service="${serviceName}"} ${latency}\n`;
      errorMetrics += `service_errors{service="${serviceName}"} ${errorCount}\n`;
      cpuMetrics += `service_cpu_usage{service="${serviceName}"} ${cpu}\n`;
      memoryMetrics += `service_memory_mb{service="${serviceName}"} ${memory}\n`;
    }

    const allMetrics = metrics + latencyMetrics + errorMetrics + cpuMetrics + memoryMetrics;
    
    res.set('Content-Type', 'text/plain');
    res.send(allMetrics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

