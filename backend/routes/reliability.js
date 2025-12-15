import express from 'express';
import ReliabilityScore from '../models/ReliabilityScore.js';
import Service from '../models/Service.js';
import { calculateReliabilityScore, calculateAllReliabilityScores } from '../services/sloEngine.js';
import { apiLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Get reliability scores for all services
router.get('/', apiLimiter, async (req, res) => {
  try {
    const scores = await ReliabilityScore.find()
      .populate('serviceId', 'name group')
      .sort({ lastCalculated: -1 });

    // Filter out scores with deleted services and format
    const formattedScores = scores
      .filter(score => score.serviceId !== null && score.serviceId !== undefined)
      .map(score => ({
        serviceId: score.serviceId._id.toString(),
        serviceName: score.serviceId.name || 'Unknown Service',
        group: score.serviceId.group || 'Default',
        uptime: score.uptime || 0,
        p50Latency: score.p50Latency || 0,
        p95Latency: score.p95Latency || 0,
        p99Latency: score.p99Latency || 0,
        errorRate: score.errorRate || 0,
        sloTarget: score.sloTarget || 99.9,
        status: score.status || 'UNKNOWN',
        lastCalculated: score.lastCalculated
      }));

    res.json(formattedScores);
  } catch (error) {
    console.error('Reliability scores error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get reliability score for a specific service
router.get('/:serviceId', apiLimiter, async (req, res) => {
  try {
    const score = await ReliabilityScore.findOne({ serviceId: req.params.serviceId })
      .populate('serviceId', 'name group');

    if (!score) {
      return res.status(404).json({ error: 'Reliability score not found' });
    }

    // Check if service was deleted
    if (!score.serviceId) {
      return res.status(404).json({ error: 'Service associated with this score was deleted' });
    }

    res.json({
      serviceId: score.serviceId._id.toString(),
      serviceName: score.serviceId.name || 'Unknown Service',
      group: score.serviceId.group || 'Default',
      uptime: score.uptime || 0,
      p50Latency: score.p50Latency || 0,
      p95Latency: score.p95Latency || 0,
      p99Latency: score.p99Latency || 0,
      errorRate: score.errorRate || 0,
      sloTarget: score.sloTarget || 99.9,
      status: score.status || 'UNKNOWN',
      lastCalculated: score.lastCalculated
    });
  } catch (error) {
    console.error('Reliability score error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Recalculate reliability scores
router.post('/recalculate', apiLimiter, async (req, res) => {
  try {
    const { serviceId } = req.body;

    if (serviceId) {
      const score = await calculateReliabilityScore(serviceId);
      if (!score) {
        return res.status(404).json({ error: 'Service not found or no data available' });
      }
      res.json({ message: 'Reliability score recalculated', score });
    } else {
      const scores = await calculateAllReliabilityScores();
      res.json({ message: 'All reliability scores recalculated', count: scores.length });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

