import express from 'express';
import AlertRule from '../models/AlertRule.js';
import Service from '../models/Service.js';
import { apiLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Get alert rules for a service or project
router.get('/', apiLimiter, async (req, res) => {
  try {
    const { serviceId, projectId } = req.query;
    
    const query = {};
    if (serviceId) {
      query.serviceId = serviceId;
    }
    if (projectId) {
      query.projectId = projectId;
    }

    const rules = await AlertRule.find(query)
      .populate('serviceId', 'name')
      .populate('projectId', 'name')
      .sort({ createdAt: -1 });

    res.json(rules.map(rule => ({
      id: rule._id.toString(),
      serviceId: rule.serviceId?._id?.toString(),
      serviceName: rule.serviceId?.name,
      projectId: rule.projectId?._id?.toString(),
      projectName: rule.projectId?.name,
      enabled: rule.enabled,
      rules: rule.rules,
      channels: rule.channels
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get alert rule by ID
router.get('/:id', apiLimiter, async (req, res) => {
  try {
    const rule = await AlertRule.findById(req.params.id)
      .populate('serviceId', 'name')
      .populate('projectId', 'name');

    if (!rule) {
      return res.status(404).json({ error: 'Alert rule not found' });
    }

    res.json({
      id: rule._id.toString(),
      serviceId: rule.serviceId?._id?.toString(),
      serviceName: rule.serviceId?.name,
      projectId: rule.projectId?._id?.toString(),
      projectName: rule.projectId?.name,
      enabled: rule.enabled,
      rules: rule.rules,
      channels: rule.channels
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create or update alert rule
router.post('/', apiLimiter, async (req, res) => {
  try {
    const { serviceId, projectId, enabled, rules, channels } = req.body;

    if (!serviceId || !projectId) {
      return res.status(400).json({ error: 'serviceId and projectId are required' });
    }

    // Verify service exists
    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    // Check if rule already exists
    const existingRule = await AlertRule.findOne({ serviceId, projectId });

    if (existingRule) {
      // Update existing rule
      existingRule.enabled = enabled !== undefined ? enabled : existingRule.enabled;
      if (rules) existingRule.rules = { ...existingRule.rules, ...rules };
      if (channels) existingRule.channels = { ...existingRule.channels, ...channels };
      await existingRule.save();

      res.json({
        id: existingRule._id.toString(),
        serviceId: existingRule.serviceId.toString(),
        projectId: existingRule.projectId.toString(),
        enabled: existingRule.enabled,
        rules: existingRule.rules,
        channels: existingRule.channels
      });
    } else {
      // Create new rule
      const alertRule = new AlertRule({
        serviceId,
        projectId,
        enabled: enabled !== undefined ? enabled : true,
        rules: rules || {
          notifyOnDown: true,
          notifyOnDegraded: true,
          notifyOnHighLatency: false,
          highLatencyThreshold: 1000,
          notifyOnHighErrorRate: false,
          highErrorRateThreshold: 5,
          notifyOnSloViolation: true
        },
        channels: channels || {
          slack: { enabled: false, webhookUrl: '' },
          telegram: { enabled: false, botToken: '', chatId: '' },
          email: { enabled: false, recipients: [] },
          whatsapp: { enabled: false, phoneNumberId: '', accessToken: '', chatId: '' }
        }
      });

      await alertRule.save();

      res.status(201).json({
        id: alertRule._id.toString(),
        serviceId: alertRule.serviceId.toString(),
        projectId: alertRule.projectId.toString(),
        enabled: alertRule.enabled,
        rules: alertRule.rules,
        channels: alertRule.channels
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update alert rule
router.put('/:id', apiLimiter, async (req, res) => {
  try {
    const { enabled, rules, channels } = req.body;

    const alertRule = await AlertRule.findById(req.params.id);
    if (!alertRule) {
      return res.status(404).json({ error: 'Alert rule not found' });
    }

    if (enabled !== undefined) alertRule.enabled = enabled;
    if (rules) alertRule.rules = { ...alertRule.rules, ...rules };
    if (channels) alertRule.channels = { ...alertRule.channels, ...channels };

    await alertRule.save();

    res.json({
      id: alertRule._id.toString(),
      serviceId: alertRule.serviceId.toString(),
      projectId: alertRule.projectId.toString(),
      enabled: alertRule.enabled,
      rules: alertRule.rules,
      channels: alertRule.channels
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete alert rule
router.delete('/:id', apiLimiter, async (req, res) => {
  try {
    const alertRule = await AlertRule.findByIdAndDelete(req.params.id);
    if (!alertRule) {
      return res.status(404).json({ error: 'Alert rule not found' });
    }

    res.json({ message: 'Alert rule deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

