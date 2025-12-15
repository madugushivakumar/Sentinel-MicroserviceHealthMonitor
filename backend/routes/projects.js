import express from 'express';
import Project from '../models/Project.js';
import Service from '../models/Service.js';
import { apiLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Get all projects
router.get('/', apiLimiter, async (req, res) => {
  try {
    const projects = await Project.find().sort({ createdAt: -1 });
    
    // Get service count for each project
    const projectsWithStats = await Promise.all(
      projects.map(async (project) => {
        const serviceCount = await Service.countDocuments({ projectId: project._id, active: true });
        return {
          id: project._id.toString(),
          name: project.name,
          description: project.description,
          ownerEmail: project.ownerEmail,
          active: project.active,
          serviceCount,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt
        };
      })
    );

    res.json(projectsWithStats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single project
router.get('/:id', apiLimiter, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const serviceCount = await Service.countDocuments({ projectId: project._id, active: true });

    res.json({
      id: project._id.toString(),
      name: project.name,
      description: project.description,
      ownerEmail: project.ownerEmail,
      active: project.active,
      serviceCount,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new project
router.post('/', apiLimiter, async (req, res) => {
  try {
    const { name, description, ownerEmail } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Project name is required' });
    }

    const project = new Project({
      name: name.trim(),
      description: description?.trim() || '',
      ownerEmail: ownerEmail?.trim() || ''
    });

    await project.save();

    res.status(201).json({
      id: project._id.toString(),
      name: project.name,
      description: project.description,
      ownerEmail: project.ownerEmail,
      active: project.active,
      serviceCount: 0,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Project with this name already exists' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Update project
router.put('/:id', apiLimiter, async (req, res) => {
  try {
    const { name, description, ownerEmail, active } = req.body;

    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (name !== undefined) project.name = name.trim();
    if (description !== undefined) project.description = description.trim();
    if (ownerEmail !== undefined) project.ownerEmail = ownerEmail.trim();
    if (active !== undefined) project.active = active;

    await project.save();

    const serviceCount = await Service.countDocuments({ projectId: project._id, active: true });

    res.json({
      id: project._id.toString(),
      name: project.name,
      description: project.description,
      ownerEmail: project.ownerEmail,
      active: project.active,
      serviceCount,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete project
router.delete('/:id', apiLimiter, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check if project has services
    const serviceCount = await Service.countDocuments({ projectId: project._id });
    if (serviceCount > 0) {
      return res.status(400).json({ 
        error: `Cannot delete project. It has ${serviceCount} service(s). Please delete or move services first.` 
      });
    }

    await Project.findByIdAndDelete(req.params.id);
    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

