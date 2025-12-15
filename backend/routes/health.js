import express from 'express';
import axios from 'axios';
import HealthLog from '../models/HealthLog.js';
import Service from '../models/Service.js';
import { apiLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Get latest health for all services
router.get('/latest', apiLimiter, async (req, res) => {
  try {
    const services = await Service.find({ active: true });
    const latestHealth = await Promise.all(
      services.map(async (service) => {
        const latestLog = await HealthLog.findOne({ serviceId: service._id })
          .sort({ timestamp: -1 });
        
        return {
          serviceId: service._id.toString(),
          serviceName: service.name,
          status: latestLog?.status || 'unknown',
          latency: latestLog?.latency || 0,
          cpu: latestLog?.cpu || 0,
          memory: latestLog?.memory || 0,
          timestamp: latestLog?.timestamp || null
        };
      })
    );

    res.json(latestHealth);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper function to calculate aggregate status from checks
const calculateAggregateStatus = (healthData, backendStatus) => {
  // If health endpoint has checks array, aggregate those
  if (healthData?.checks && Array.isArray(healthData.checks) && healthData.checks.length > 0) {
    const checkStatuses = healthData.checks.map(check => {
      const status = check.status?.toLowerCase() || check.state?.toLowerCase() || 'unknown';
      if (status === 'up' || status === 'ok' || status === 'healthy') return 'ok';
      if (status === 'down' || status === 'unhealthy') return 'down';
      if (status === 'degraded' || status === 'warning') return 'degraded';
      return 'unknown';
    });
    
    // If any check is down, aggregate is down
    if (checkStatuses.includes('down')) return 'down';
    // If any check is degraded, aggregate is degraded
    if (checkStatuses.includes('degraded')) return 'degraded';
    // If all checks are ok, aggregate is ok
    if (checkStatuses.every(s => s === 'ok')) return 'ok';
    // Otherwise degraded
    return 'degraded';
  }
  
  // If no checks array, use the main status from health endpoint
  if (healthData?.status) {
    const status = healthData.status.toLowerCase();
    if (status === 'up' || status === 'ok' || status === 'healthy') return 'ok';
    if (status === 'down' || status === 'unhealthy') return 'down';
    if (status === 'degraded' || status === 'warning') return 'degraded';
  }
  
  // Fall back to backend status (from our health checks)
  return backendStatus || 'unknown';
};

// Proxy endpoint to fetch health directly from service (avoids CORS)
router.get('/proxy/:serviceId', apiLimiter, async (req, res) => {
  try {
    const service = await Service.findById(req.params.serviceId);
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    const baseUrl = service.url.replace(/\/health\/?$/, '').replace(/\/$/, '');
    const healthUrl = `${baseUrl}/health`;
    
    // Get backend's latest health check status
    const latestLog = await HealthLog.findOne({ serviceId: service._id })
      .sort({ timestamp: -1 });
    const backendStatus = latestLog?.status || 'unknown';
    
    try {
      const response = await axios.get(healthUrl, {
        timeout: 5000,
        validateStatus: () => true
      });
      
      const healthData = response.data || {};
      
      // Calculate aggregate status
      const aggregateStatus = calculateAggregateStatus(healthData, backendStatus);
      
      // Enhance health data with aggregate status
      const enhancedData = {
        ...healthData,
        aggregateStatus: aggregateStatus,
        backendStatus: backendStatus,
        // Ensure checks array exists for frontend
        checks: healthData.checks || []
      };
      
      res.json({
        data: enhancedData,
        statusCode: response.status,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      // If health endpoint fails, use backend status
      res.json({
        data: {
          status: backendStatus,
          aggregateStatus: backendStatus,
          backendStatus: backendStatus,
          checks: [],
          error: error.message || 'Failed to fetch health data'
        },
        statusCode: 503,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Manual trigger health check for all services
router.post('/trigger', apiLimiter, async (req, res) => {
  try {
    const { performHealthCheck } = await import('../services/healthChecker.js');
    // Get io instance from app, but make it optional
    const io = req.app?.get('io') || null;
    
    console.log('Manual health check triggered');
    const results = await performHealthCheck(io);
    
    res.json({
      message: 'Health check completed',
      servicesChecked: results.length,
      timestamp: new Date().toISOString(),
      results: results.map(r => ({
        serviceName: r.serviceName,
        status: r.status,
        latency: r.latency,
        cpu: r.cpu,
        memory: r.memory
      }))
    });
  } catch (error) {
    console.error('Health check trigger error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to trigger health check',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Proxy endpoint to fetch metrics directly from service (avoids CORS)
router.get('/proxy/:serviceId/metrics', apiLimiter, async (req, res) => {
  try {
    const service = await Service.findById(req.params.serviceId);
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    const metricsUrl = service.metricsUrl || service.url.replace(/\/health\/?$/, '') + '/metrics';
    const baseUrl = metricsUrl.replace(/\/metrics\/?$/, '').replace(/\/$/, '');
    const fullMetricsUrl = `${baseUrl}/metrics`;
    
    try {
      const response = await axios.get(fullMetricsUrl, {
        timeout: 5000,
        validateStatus: () => true,
        headers: {
          'Accept': 'application/json, text/plain'
        },
        maxContentLength: 5 * 1024 * 1024, // 5MB max
        maxBodyLength: 5 * 1024 * 1024
      });
      
      const data = response.data;
      
      // Handle null or undefined data
      if (!data) {
        return res.json({
          data: {
            _format: 'empty',
            message: 'No metrics data available'
          },
          statusCode: response.status,
          timestamp: new Date().toISOString()
        });
      }
      
      // Check if response is Prometheus text format
      const isPrometheusText = typeof data === 'string' && (
        data.trim().startsWith('# HELP') || 
        data.trim().startsWith('# TYPE') ||
        data.includes('service_up') ||
        data.includes('service_latency')
      );
      
      if (isPrometheusText) {
        // Parse Prometheus format into a structured object
        const prometheusMetrics = {};
        const lines = data.split('\n');
        
        for (const line of lines) {
          // Skip comments and empty lines
          if (line.trim().startsWith('#') || !line.trim()) continue;
          
          try {
            // Parse metric line: metric_name{labels} value
            const match = line.match(/^([a-zA-Z_:][a-zA-Z0-9_:]*)\s*(?:\{([^}]*)\})?\s+([0-9.+-eE]+|NaN|Inf|-Inf)$/);
            if (match) {
              const [, metricName, labels, value] = match;
              const numValue = parseFloat(value);
              if (!isNaN(numValue)) {
                // Group by metric name, include labels if present
                const key = labels ? `${metricName}{${labels}}` : metricName;
                prometheusMetrics[key] = numValue;
              }
            }
          } catch (parseError) {
            // Skip malformed lines
            continue;
          }
        }
        
        res.json({
          data: {
            _format: 'prometheus',
            _parsed: prometheusMetrics,
            _rawPreview: data.substring(0, 500) // First 500 chars for reference
          },
          statusCode: response.status,
          timestamp: new Date().toISOString()
        });
        return;
      }
      
      // Handle JSON response
      if (typeof data === 'object' && data !== null) {
        const normalized = {
          ...data,
          uptime: typeof data.uptime === 'number' ? data.uptime : (data.process?.uptime ?? data.uptime_seconds ?? 0),
          mem: data.mem || data.memoryUsage || data.process?.memoryUsage || (data.system?.memory_usage ? {
            rss: data.system.memory_usage.rss,
            heapTotal: data.system.memory_usage.heapTotal,
            heapUsed: data.system.memory_usage.heapUsed
          } : {}),
          cpu: data.cpu || data.cpuUsage || data.process?.cpuUsage || (data.system?.cpu_load ? {
            user: 0,
            system: 0,
            load: data.system.cpu_load
          } : {})
        };
        
        res.json({
          data: normalized,
          statusCode: response.status,
          timestamp: new Date().toISOString()
        });
      } else {
        // Unknown format - return as-is but mark it
        res.json({
          data: {
            _format: 'unknown',
            _raw: typeof data === 'string' ? data.substring(0, 1000) : data
          },
          statusCode: response.status,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error(`Metrics fetch error for service ${req.params.serviceId}:`, error.message);
      // Return a graceful error response instead of 500
      res.json({
        data: {
          error: error.message || 'Failed to fetch metrics data',
          available: false
        },
        statusCode: 503,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error(`Metrics proxy error for service ${req.params.serviceId}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Proxy endpoint to fetch selftest directly from service (avoids CORS)
router.get('/proxy/:serviceId/selftest', apiLimiter, async (req, res) => {
  try {
    const service = await Service.findById(req.params.serviceId);
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    const baseUrl = service.url.replace(/\/health\/?$/, '').replace(/\/$/, '');
    const selftestUrl = `${baseUrl}/selftest`;
    
    try {
      const response = await axios.get(selftestUrl, {
        timeout: 5000,
        validateStatus: () => true,
        headers: {
          'Accept': 'application/json'
        }
      });
      
      const selftestData = response.data || {};
      
      // If the service uses microservice-health-endpoint, it might return checks in the health endpoint
      // Try to extract checks from health endpoint if selftest is not available
      if (response.status === 404 || (!selftestData.checks && !selftestData.status)) {
        // Fallback: try to get checks from health endpoint
        try {
          const healthUrl = `${baseUrl}/health`;
          const healthResponse = await axios.get(healthUrl, {
            timeout: 5000,
            validateStatus: () => true
          });
          
          if (healthResponse.data && healthResponse.data.checks) {
            return res.json({
              data: {
                checks: healthResponse.data.checks,
                status: healthResponse.data.status,
                timestamp: new Date().toISOString()
              },
              statusCode: healthResponse.status,
              timestamp: new Date().toISOString()
            });
          }
        } catch (healthError) {
          // Ignore health endpoint fallback errors
        }
      }
      
      res.json({
        data: selftestData,
        statusCode: response.status,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      // If selftest endpoint doesn't exist, try health endpoint as fallback
      try {
        const healthUrl = `${baseUrl}/health`;
        const healthResponse = await axios.get(healthUrl, {
          timeout: 5000,
          validateStatus: () => true
        });
        
        if (healthResponse.data && healthResponse.data.checks) {
          return res.json({
            data: {
              checks: healthResponse.data.checks,
              status: healthResponse.data.status,
              timestamp: new Date().toISOString()
            },
            statusCode: healthResponse.status,
            timestamp: new Date().toISOString()
          });
        }
      } catch (healthError) {
        // Ignore fallback errors
      }
      
      res.json({
        data: {
          error: error.message || 'Failed to fetch selftest data',
          available: false
        },
        statusCode: 503,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get health history for a service
router.get('/:serviceId/history', apiLimiter, async (req, res) => {
  try {
    const { serviceId } = req.params;
    const { hours = 24 } = req.query;

    const since = new Date(Date.now() - parseInt(hours) * 60 * 60 * 1000);

    const logs = await HealthLog.find({
      serviceId,
      timestamp: { $gte: since }
    })
      .sort({ timestamp: 1 })
      .limit(1000);

    res.json(logs.map(log => ({
      timestamp: log.timestamp,
      latency: log.latency,
      status: log.status,
      cpu: log.cpu,
      memory: log.memory,
      errorCount: log.errorCount || 0
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

