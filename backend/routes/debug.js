import express from 'express';
import axios from 'axios';
import Service from '../models/Service.js';
import HealthLog from '../models/HealthLog.js';

const router = express.Router();

// Debug endpoint to check services and health logs
router.get('/services', async (req, res) => {
  try {
    const services = await Service.find();
    const servicesWithLogs = await Promise.all(
      services.map(async (service) => {
        const latestLog = await HealthLog.findOne({ serviceId: service._id })
          .sort({ timestamp: -1 });
        const logCount = await HealthLog.countDocuments({ serviceId: service._id });
        
        return {
          id: service._id.toString(),
          name: service.name,
          url: service.url,
          active: service.active,
          latestLog: latestLog ? {
            status: latestLog.status,
            latency: latestLog.latency,
            timestamp: latestLog.timestamp
          } : null,
          totalLogs: logCount
        };
      })
    );
    
    res.json({
      totalServices: services.length,
      activeServices: services.filter(s => s.active).length,
      services: servicesWithLogs
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Debug endpoint to test service health response
router.get('/test-health/:serviceId', async (req, res) => {
  try {
    const service = await Service.findById(req.params.serviceId);
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    const baseUrl = service.url.replace(/\/health\/?$/, '').replace(/\/$/, '');
    const healthUrl = `${baseUrl}/health`;
    
    console.log(`[DEBUG] Testing health endpoint: ${healthUrl}`);
    
    const response = await axios.get(healthUrl, {
      timeout: 5000,
      validateStatus: () => true // Accept all status codes
    });

    console.log(`[DEBUG] Response from ${service.name}:`, {
      status: response.status,
      data: response.data
    });

    res.json({
      serviceName: service.name,
      serviceUrl: service.url,
      healthUrl: healthUrl,
      httpStatus: response.status,
      httpStatusText: response.statusText,
      responseBody: response.data,
      analysis: {
        shouldBeDown: response.status >= 500 || 
                      response.data?.status?.toLowerCase() === 'down' ||
                      response.data?.status === 'DOWN',
        detectedStatus: response.status >= 500 ? 'DOWN (HTTP 5xx)' :
                        response.data?.status?.toLowerCase() === 'down' ? 'DOWN (status field)' :
                        response.data?.status === 'DOWN' ? 'DOWN (status field uppercase)' :
                        response.status === 200 && response.data?.status?.toLowerCase() === 'ok' ? 'OK' :
                        'UNKNOWN'
      }
    });
  } catch (error) {
    console.error(`[DEBUG] Error testing health for service:`, error);
    res.status(500).json({ 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Check email configuration status
router.get('/email-status', async (req, res) => {
  try {
    const Project = (await import('../models/Project.js')).default;
    const emailConfigured = !!(process.env.EMAIL_USER && process.env.EMAIL_PASS);
    const emailHost = process.env.EMAIL_HOST || 'smtp.gmail.com';
    const emailPort = process.env.EMAIL_PORT || 587;
    
    // Check services with ownerEmail
    const servicesWithEmail = await Service.find({ ownerEmail: { $exists: true, $ne: '' } });
    
    // Check all services and their project emails
    const allServices = await Service.find();
    const servicesWithProjectEmail = await Promise.all(
      allServices.map(async (service) => {
        let projectEmail = null;
        if (service.projectId) {
          try {
            const project = await Project.findById(service.projectId);
            projectEmail = project?.ownerEmail || null;
          } catch (err) {
            // Ignore errors
          }
        }
        return {
          id: service._id.toString(),
          name: service.name,
          serviceOwnerEmail: service.ownerEmail || null,
          projectId: service.projectId?.toString() || null,
          projectOwnerEmail: projectEmail
        };
      })
    );
    
    // Get all projects with ownerEmail
    const projectsWithEmail = await Project.find({ ownerEmail: { $exists: true, $ne: '' } });
    
    res.json({
      emailConfigured,
      emailSettings: {
        host: emailHost,
        port: emailPort,
        user: process.env.EMAIL_USER ? `${process.env.EMAIL_USER.substring(0, 3)}***` : 'NOT SET',
        pass: process.env.EMAIL_PASS ? '***SET***' : 'NOT SET'
      },
      servicesWithOwnerEmail: servicesWithEmail.map(s => ({
        id: s._id.toString(),
        name: s.name,
        ownerEmail: s.ownerEmail
      })),
      totalServicesWithEmail: servicesWithEmail.length,
      projectsWithOwnerEmail: projectsWithEmail.map(p => ({
        id: p._id.toString(),
        name: p.name,
        ownerEmail: p.ownerEmail
      })),
      totalProjectsWithEmail: projectsWithEmail.length,
      allServices: servicesWithProjectEmail
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Test email notification
router.post('/test-email', async (req, res) => {
  try {
    const { email, serviceName } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email address is required' });
    }

    // Check if email is configured
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      return res.status(400).json({ 
        error: 'Email not configured',
        message: 'Please set EMAIL_USER and EMAIL_PASS in your .env file'
      });
    }

    const nodemailer = (await import('nodemailer')).default;
    
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT) || 587,
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    // Test email template
    const htmlTemplate = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Email Test Successful</h1>
          </div>
          <div class="content">
            <h2>Sentinel Notification System</h2>
            <p>This is a test email to verify your email configuration is working correctly.</p>
            <p><strong>Service:</strong> ${serviceName || 'Test Service'}</p>
            <p><strong>Test Time:</strong> ${new Date().toLocaleString()}</p>
            <p>If you received this email, your notification system is configured correctly!</p>
            <p>You will receive alerts automatically when services go down or become degraded.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const info = await transporter.sendMail({
      from: `"Sentinel Monitor" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: '✅ Sentinel Email Test - Configuration Verified',
      text: `This is a test email from Sentinel Monitor. Your email configuration is working correctly!`,
      html: htmlTemplate
    });

    res.json({
      success: true,
      message: 'Test email sent successfully',
      messageId: info.messageId,
      to: email,
      from: process.env.EMAIL_USER
    });
  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({ 
      error: 'Failed to send test email',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Test alert trigger for a specific service
router.post('/test-alert/:serviceId', async (req, res) => {
  try {
    const { serviceId } = req.params;
    const service = await Service.findById(serviceId);
    
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    const Project = (await import('../models/Project.js')).default;
    let projectEmail = null;
    if (service.projectId) {
      const project = await Project.findById(service.projectId);
      projectEmail = project?.ownerEmail || null;
    }

    // Import alert service
    const { triggerAlerts } = await import('../services/alertService.js');
    
    // Create a mock health check result
    const mockHealthResult = {
      serviceId: service._id,
      status: 'down',
      latency: 0,
      cpu: 0,
      memory: 0,
      statusChanged: true,
      previousStatus: 'healthy'
    };

    console.log(`\n🧪 TEST ALERT TRIGGER for service ${service.name}:`);
    console.log(`   Service ownerEmail: ${service.ownerEmail || 'NOT SET'}`);
    console.log(`   Project ownerEmail: ${projectEmail || 'NOT SET'}`);
    console.log(`   Mock status: ${mockHealthResult.status}`);

    // Trigger alerts
    await triggerAlerts([mockHealthResult]);

    res.json({
      success: true,
      message: 'Test alert triggered',
      service: {
        id: service._id.toString(),
        name: service.name,
        ownerEmail: service.ownerEmail || null,
        projectOwnerEmail: projectEmail || null
      },
      note: 'Check backend console logs for detailed email sending information'
    });
  } catch (error) {
    console.error('Test alert error:', error);
    res.status(500).json({ 
      error: 'Failed to trigger test alert',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

export default router;

