import express from 'express';
import AlertLog from '../models/AlertLog.js';
import { apiLimiter } from '../middleware/rateLimiter.js';
import { triggerAlerts } from '../services/alertService.js';
import Service from '../models/Service.js';
import HealthLog from '../models/HealthLog.js';

const router = express.Router();

// Get alert logs
router.get('/', apiLimiter, async (req, res) => {
  try {
    const { channel, limit = 100 } = req.query;
    
    const query = {};
    if (channel) {
      query.channel = channel;
    }

    const alerts = await AlertLog.find(query)
      .populate('serviceId', 'name')
      .sort({ timestamp: -1 })
      .limit(parseInt(limit));

    res.json(alerts.map(alert => ({
      id: alert._id.toString(),
      serviceId: alert.serviceId._id.toString(),
      serviceName: alert.serviceId.name,
      channel: alert.channel,
      message: alert.message,
      timestamp: alert.timestamp,
      success: alert.success
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Test alert
router.post('/test', apiLimiter, async (req, res) => {
  try {
    const { serviceId, channel } = req.body;

    if (!serviceId) {
      return res.status(400).json({ error: 'serviceId is required' });
    }

    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    const latestLog = await HealthLog.findOne({ serviceId })
      .sort({ timestamp: -1 });

    const healthData = {
      status: latestLog?.status || 'down',
      latency: latestLog?.latency || 0,
      cpu: latestLog?.cpu || 0,
      memory: latestLog?.memory || 0
    };

    // Trigger test alert
    await triggerAlerts([{
      serviceId: service._id,
      serviceName: service.name,
      ...healthData
    }]);

    res.json({ message: 'Test alert sent' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

