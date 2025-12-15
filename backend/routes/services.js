import express from 'express';
import Service from '../models/Service.js';
import HealthLog from '../models/HealthLog.js';
import ReliabilityScore from '../models/ReliabilityScore.js';
import { apiLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Get all services (optionally filtered by projectId)
router.get('/', apiLimiter, async (req, res) => {
  try {
    const { projectId } = req.query;
    const query = projectId ? { projectId } : {};
    const services = await Service.find(query).populate('projectId', 'name description').sort({ createdAt: -1 });
    
    // Get latest health status for each service
    const servicesWithStatus = await Promise.all(
      services.map(async (service) => {
        const latestLog = await HealthLog.findOne({ serviceId: service._id })
          .sort({ timestamp: -1 });
        
        const reliability = await ReliabilityScore.findOne({ serviceId: service._id });

        return {
          id: service._id.toString(),
          name: service.name,
          url: service.url,
          metricsUrl: service.metricsUrl,
          group: service.group,
          projectId: service.projectId?._id?.toString() || service.projectId?.toString(),
          projectName: service.projectId?.name || 'Unknown Project',
          status: latestLog?.status || 'unknown',
          latency: latestLog?.latency || 0,
          uptime: reliability?.uptime || 0,
          cpu: latestLog?.cpu || 0,
          memory: latestLog?.memory || 0,
          lastChecked: latestLog?.timestamp || service.createdAt,
          active: service.active,
          ownerEmail: service.ownerEmail
        };
      })
    );

    res.json(servicesWithStatus);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single service
router.get('/:id', apiLimiter, async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    const latestLog = await HealthLog.findOne({ serviceId: service._id })
      .sort({ timestamp: -1 });

    const reliability = await ReliabilityScore.findOne({ serviceId: service._id });

    res.json({
      id: service._id.toString(),
      name: service.name,
      url: service.url,
      metricsUrl: service.metricsUrl,
      group: service.group,
      status: latestLog?.status || 'unknown',
      latency: latestLog?.latency || 0,
      uptime: reliability?.uptime || 0,
      cpu: latestLog?.cpu || 0,
      memory: latestLog?.memory || 0,
      lastChecked: latestLog?.timestamp || service.createdAt,
      active: service.active,
      ownerEmail: service.ownerEmail
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create service
router.post('/', apiLimiter, async (req, res) => {
  try {
    const { name, url, metricsUrl, group, ownerEmail, projectId } = req.body;

    if (!name || !url) {
      return res.status(400).json({ error: 'Name and URL are required' });
    }

    if (!projectId) {
      return res.status(400).json({ error: 'Project ID is required' });
    }

    // Verify project exists
    const Project = (await import('../models/Project.js')).default;
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    const service = new Service({
      name,
      projectId,
      url,
      metricsUrl: metricsUrl || url.replace(/\/health\/?$/, '') + '/metrics',
      group: group || 'Default',
      ownerEmail
    });

    await service.save();
    res.status(201).json({
      id: service._id.toString(),
      ...service.toObject()
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Service name already exists' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Update service
router.put('/:id', apiLimiter, async (req, res) => {
  try {
    const service = await Service.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    res.json({
      id: service._id.toString(),
      ...service.toObject()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete service
router.delete('/:id', apiLimiter, async (req, res) => {
  try {
    const service = await Service.findByIdAndDelete(req.params.id);
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }
    res.json({ message: 'Service deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cleanup duplicate services - keep newest, delete older ones with same URL
router.post('/cleanup-duplicates', apiLimiter, async (req, res) => {
  try {
    const allServices = await Service.find({}).sort({ createdAt: -1 });
    
    // Group services by normalized URL (same port = same service)
    const urlGroups = {};
    allServices.forEach(service => {
      // Normalize URL to base URL (remove /health suffix)
      const normalizedUrl = service.url.replace(/\/health\/?$/, '').toLowerCase();
      if (!urlGroups[normalizedUrl]) {
        urlGroups[normalizedUrl] = [];
      }
      urlGroups[normalizedUrl].push(service);
    });
    
    // Find duplicates (groups with more than 1 service)
    const duplicates = [];
    const toDelete = [];
    
    Object.entries(urlGroups).forEach(([url, services]) => {
      if (services.length > 1) {
        // Sort by createdAt (newest first) or _id timestamp
        services.sort((a, b) => {
          const timeA = a.createdAt || new Date(a._id.getTimestamp());
          const timeB = b.createdAt || new Date(b._id.getTimestamp());
          return timeB - timeA; // Newest first
        });
        
        // Keep the first (newest), mark others for deletion
        const [newest, ...older] = services;
        duplicates.push({
          url: url,
          keeping: {
            id: newest._id.toString(),
            name: newest.name,
            createdAt: newest.createdAt
          },
          deleting: older.map(s => ({
            id: s._id.toString(),
            name: s.name,
            createdAt: s.createdAt
          }))
        });
        
        toDelete.push(...older.map(s => s._id));
      }
    });
    
    // Delete old services
    let deletedCount = 0;
    if (toDelete.length > 0) {
      // Also delete associated health logs and reliability scores
      await HealthLog.deleteMany({ serviceId: { $in: toDelete } });
      await ReliabilityScore.deleteMany({ serviceId: { $in: toDelete } });
      
      const deleteResult = await Service.deleteMany({ _id: { $in: toDelete } });
      deletedCount = deleteResult.deletedCount;
    }
    
    res.json({
      message: 'Cleanup completed',
      duplicatesFound: duplicates.length,
      servicesDeleted: deletedCount,
      details: duplicates
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

