import express from 'express';
import Incident from '../models/Incident.js';
import Service from '../models/Service.js';
import { apiLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Get all incidents
router.get('/', apiLimiter, async (req, res) => {
  try {
    const { resolved, severity } = req.query;
    
    const query = {};
    if (resolved !== undefined) {
      query.resolved = resolved === 'true';
    }
    if (severity) {
      query.severity = severity;
    }

    const incidents = await Incident.find(query)
      .populate({
        path: 'serviceId',
        select: 'name projectId',
        populate: {
          path: 'projectId',
          select: 'name description'
        }
      })
      .sort({ startedAt: -1 })
      .limit(100);

    // Filter out incidents with deleted services and format
    const formattedIncidents = incidents
      .filter(incident => incident.serviceId !== null && incident.serviceId !== undefined)
      .map(incident => ({
        id: incident._id.toString(),
        serviceId: incident.serviceId._id.toString(),
        serviceName: incident.serviceId.name || 'Unknown Service',
        projectId: incident.serviceId.projectId?._id?.toString() || incident.serviceId.projectId?.toString() || null,
        projectName: incident.serviceId.projectId?.name || 'Unknown Project',
        type: incident.type,
        severity: incident.severity,
        description: incident.details || `${incident.type} incident`,
        startedAt: incident.startedAt,
        resolvedAt: incident.endedAt,
        resolved: incident.resolved
      }));

    res.json(formattedIncidents);
  } catch (error) {
    console.error('Incidents fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Close incident
router.patch('/:id/close', apiLimiter, async (req, res) => {
  try {
    const incident = await Incident.findByIdAndUpdate(
      req.params.id,
      {
        resolved: true,
        endedAt: new Date()
      },
      { new: true }
    );

    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    res.json({
      id: incident._id.toString(),
      resolved: incident.resolved,
      endedAt: incident.endedAt
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

