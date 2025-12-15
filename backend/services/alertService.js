import axios from 'axios';
import nodemailer from 'nodemailer';
import AlertLog from '../models/AlertLog.js';
import Incident from '../models/Incident.js';
import Service from '../models/Service.js';
import Project from '../models/Project.js';

// Alert throttling: prevent spam (once per 15 minutes per service)
const alertThrottle = new Map(); // serviceId -> { lastAlertTime, lastStatus }
const THROTTLE_DURATION = 15 * 60 * 1000; // 15 minutes

const shouldThrottle = (serviceId, currentStatus, statusChanged) => {
  const lastAlert = alertThrottle.get(serviceId);
  if (!lastAlert) return false;
  
  // Always allow alerts if status just changed (new incident)
  if (statusChanged) {
    return false;
  }
  
  // If status hasn't changed and we sent an alert recently, throttle
  const timeSinceLastAlert = Date.now() - lastAlert.lastAlertTime;
  const sameStatus = lastAlert.lastStatus === currentStatus;
  
  if (sameStatus && timeSinceLastAlert < THROTTLE_DURATION) {
    return true;
  }
  
  return false;
};

const recordAlert = (serviceId, status) => {
  alertThrottle.set(serviceId, {
    lastAlertTime: Date.now(),
    lastStatus: status
  });
};

// Slack Alert
const sendSlackAlert = async (service, incident, healthData) => {
  if (!process.env.SLACK_WEBHOOK_URL) return null;

  try {
    const message = `🚨 Service ${incident ? 'DOWN' : 'DEGRADED'}\n\n` +
      `Service: ${service.name}\n` +
      `Status: ${healthData.status}\n` +
      `Latency: ${healthData.latency}ms\n` +
      `Time: ${new Date().toLocaleString()}`;

    await axios.post(process.env.SLACK_WEBHOOK_URL, {
      text: message
    });

    await AlertLog.create({
      serviceId: service._id,
      channel: 'slack',
      message,
      timestamp: new Date(),
      success: true
    });

    return true;
  } catch (error) {
    console.error('Slack alert failed:', error);
    await AlertLog.create({
      serviceId: service._id,
      channel: 'slack',
      message: `Failed to send: ${error.message}`,
      timestamp: new Date(),
      success: false,
      error: error.message
    });
    return false;
  }
};

// Telegram Alert
const sendTelegramAlert = async (service, incident, healthData) => {
  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) return null;

  try {
    const message = `🚨 Service ${incident ? 'DOWN' : 'DEGRADED'}\n\n` +
      `Service: ${service.name}\n` +
      `Status: ${healthData.status}\n` +
      `Latency: ${healthData.latency}ms\n` +
      `Time: ${new Date().toLocaleString()}`;

    const url = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`;
    
    await axios.post(url, {
      chat_id: process.env.TELEGRAM_CHAT_ID,
      text: message
    });

    await AlertLog.create({
      serviceId: service._id,
      channel: 'telegram',
      message,
      timestamp: new Date(),
      success: true
    });

    return true;
  } catch (error) {
    console.error('Telegram alert failed:', error);
    await AlertLog.create({
      serviceId: service._id,
      channel: 'telegram',
      message: `Failed to send: ${error.message}`,
      timestamp: new Date(),
      success: false,
      error: error.message
    });
    return false;
  }
};

// Email Alert - Enhanced with HTML template
const sendEmailAlert = async (service, incident, healthData, alertRule = null, projectEmail = null) => {
  console.log(`\n📧 [sendEmailAlert] Starting email alert for service: ${service.name}`);
  console.log(`   Input parameters:`);
  console.log(`   - service.ownerEmail: "${service.ownerEmail || 'NOT SET'}"`);
  console.log(`   - projectEmail: "${projectEmail || 'NOT SET'}"`);
  console.log(`   - alertRule?.channels?.email?.enabled: ${alertRule?.channels?.email?.enabled || false}`);
  console.log(`   - alertRule recipients count: ${alertRule?.channels?.email?.recipients?.length || 0}`);
  
  // Get recipients from alert rule, service owner email, or project email (fallback)
  const recipients = [];
  
  if (alertRule?.channels?.email?.enabled && alertRule.channels.email.recipients?.length > 0) {
    recipients.push(...alertRule.channels.email.recipients);
    console.log(`   ✅ Added ${alertRule.channels.email.recipients.length} recipient(s) from alert rule`);
  }
  
  if (service.ownerEmail && !recipients.includes(service.ownerEmail)) {
    recipients.push(service.ownerEmail);
    console.log(`   ✅ Added service ownerEmail: ${service.ownerEmail}`);
  } else if (service.ownerEmail) {
    console.log(`   ⏭️  Service ownerEmail already in recipients list`);
  }
  
  // Fallback to project email if service has no ownerEmail
  if (recipients.length === 0 && projectEmail && !recipients.includes(projectEmail)) {
    console.log(`   ✅ Using project email as fallback: ${projectEmail}`);
    recipients.push(projectEmail);
  } else if (recipients.length === 0 && projectEmail) {
    console.log(`   ⚠️  Project email exists but already in recipients list`);
  } else if (recipients.length === 0) {
    console.log(`   ⚠️  No recipients found - service ownerEmail: ${service.ownerEmail || 'NOT SET'}, projectEmail: ${projectEmail || 'NOT SET'}`);
  }
  
  console.log(`   Final recipients list: [${recipients.join(', ')}] (${recipients.length} recipient(s))`);

  // If no recipients and no email config, skip
  if (recipients.length === 0 || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    if (recipients.length === 0) {
      console.log(`⚠️  No email recipients configured for service ${service.name}`);
      console.log(`   Service ownerEmail: ${service.ownerEmail || 'NOT SET'}`);
      console.log(`   Project ownerEmail: ${projectEmail || 'NOT SET'}`);
      console.log(`   Alert rule recipients: ${alertRule?.channels?.email?.recipients?.length || 0}`);
    }
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.log(`⚠️  Email not configured: EMAIL_USER=${!!process.env.EMAIL_USER}, EMAIL_PASS=${!!process.env.EMAIL_PASS}`);
    }
    return null;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT) || 587,
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    const statusEmoji = healthData.status === 'down' ? '🔴' : '⚠️';
    const statusText = healthData.status === 'down' ? 'DOWN' : 'DEGRADED';
    const statusColor = healthData.status === 'down' ? '#dc2626' : '#f59e0b';
    
    const incidentInfo = incident ? `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Incident Started:</strong></td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${new Date(incident.startedAt).toLocaleString()}</td>
      </tr>
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Severity:</strong></td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${incident.severity || 'critical'}</td>
      </tr>
    ` : '';

    const htmlTemplate = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: ${statusColor}; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
          table { width: 100%; border-collapse: collapse; margin: 15px 0; }
          .status-badge { display: inline-block; padding: 5px 15px; border-radius: 20px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${statusEmoji} Service Alert: ${statusText}</h1>
          </div>
          <div class="content">
            <h2>${service.name}</h2>
            <p><strong>Service Status:</strong> <span class="status-badge" style="background: ${statusColor}; color: white;">${statusText}</span></p>
            
            <table>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Service Name:</strong></td>
                <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${service.name}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Status:</strong></td>
                <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${healthData.status.toUpperCase()}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Latency:</strong></td>
                <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${healthData.latency}ms</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>CPU Usage:</strong></td>
                <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${healthData.cpu || 0}%</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Memory Usage:</strong></td>
                <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${healthData.memory || 0}MB</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Alert Time:</strong></td>
                <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${new Date().toLocaleString()}</td>
              </tr>
              ${incidentInfo}
            </table>
            
            <p><strong>Service URL:</strong> <a href="${service.url}">${service.url}</a></p>
            
            <p style="margin-top: 20px; padding: 15px; background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
              <strong>⚠️ Action Required:</strong> Please investigate the service health issue immediately.
            </p>
          </div>
          <div class="footer">
            <p>This is an automated alert from Sentinel Microservice Health Monitor</p>
            <p>You are receiving this because you are the owner of this service or configured as a recipient.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const textMessage = `🚨 Service ${statusText}\n\n` +
      `Service: ${service.name}\n` +
      `Status: ${healthData.status.toUpperCase()}\n` +
      `Latency: ${healthData.latency}ms\n` +
      `CPU: ${healthData.cpu || 0}%\n` +
      `Memory: ${healthData.memory || 0}MB\n` +
      `Time: ${new Date().toLocaleString()}\n` +
      `URL: ${service.url}`;

    const mailOptions = {
      from: `"Sentinel Monitor" <${process.env.EMAIL_USER}>`,
      to: recipients.join(', '),
      subject: `🚨 Alert: ${service.name} is ${statusText}`,
      text: textMessage,
      html: htmlTemplate
    };

    console.log(`📧 Attempting to send email alert for ${service.name}:`);
    console.log(`   From: ${mailOptions.from}`);
    console.log(`   To: ${mailOptions.to}`);
    console.log(`   Subject: ${mailOptions.subject}`);

    const info = await transporter.sendMail(mailOptions);

    console.log(`✅ Email alert sent successfully to ${recipients.length} recipient(s) for service ${service.name}`);
    console.log(`   Message ID: ${info.messageId}`);
    console.log(`   Recipients: ${recipients.join(', ')}`);

    await AlertLog.create({
      serviceId: service._id,
      channel: 'email',
      message: `Email sent to: ${recipients.join(', ')}`,
      timestamp: new Date(),
      success: true
    });

    return true;
  } catch (error) {
    console.error(`❌ Email alert failed for service ${service.name}:`, error.message);
    console.error(`   Error code: ${error.code || 'UNKNOWN'}`);
    console.error(`   Error stack:`, error.stack);
    
    // Log more details for common errors
    if (error.code === 'EAUTH') {
      console.error(`   ⚠️  AUTHENTICATION FAILED - Check EMAIL_USER and EMAIL_PASS in .env`);
      console.error(`   ⚠️  For Gmail, make sure you're using an App Password, not your regular password`);
    } else if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT') {
      console.error(`   ⚠️  CONNECTION FAILED - Check EMAIL_HOST (${process.env.EMAIL_HOST || 'smtp.gmail.com'}) and EMAIL_PORT (${process.env.EMAIL_PORT || 587})`);
    } else if (error.response) {
      console.error(`   ⚠️  SMTP Server Error:`, error.response);
    }
    
    await AlertLog.create({
      serviceId: service._id,
      channel: 'email',
      message: `Failed to send to: ${recipients.join(', ')} - ${error.message}`,
      timestamp: new Date(),
      success: false,
      error: error.message
    });
    return false;
  }
};

// WhatsApp Alert (Meta Cloud API)
const sendWhatsAppAlert = async (service, incident, healthData) => {
  if (!process.env.WHATSAPP_PHONE_NUMBER_ID || !process.env.WHATSAPP_ACCESS_TOKEN) return null;

  try {
    const message = `🚨 Service ${incident ? 'DOWN' : 'DEGRADED'}\n\n` +
      `Service: ${service.name}\n` +
      `Status: ${healthData.status}\n` +
      `Latency: ${healthData.latency}ms\n` +
      `Time: ${new Date().toLocaleString()}`;

    const url = `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
    
    await axios.post(url, {
      messaging_product: 'whatsapp',
      to: process.env.WHATSAPP_CHAT_ID || service.ownerEmail, // You may need to map email to phone
      type: 'text',
      text: { body: message }
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    await AlertLog.create({
      serviceId: service._id,
      channel: 'whatsapp',
      message,
      timestamp: new Date(),
      success: true
    });

    return true;
  } catch (error) {
    console.error('WhatsApp alert failed:', error);
    await AlertLog.create({
      serviceId: service._id,
      channel: 'whatsapp',
      message: `Failed to send: ${error.message}`,
      timestamp: new Date(),
      success: false,
      error: error.message
    });
    return false;
  }
};

// Main trigger function - Enhanced with alert rules and status change detection
export const triggerAlerts = async (healthCheckResults) => {
  try {
    const AlertRule = (await import('../models/AlertRule.js')).default;
    
    for (const result of healthCheckResults) {
      // Only send alerts when status changes to down/degraded (not on every health check)
      if (result.status === 'down' || result.status === 'degraded') {
        const serviceId = result.serviceId.toString();
        
        // Only send alert if status changed (new incident) - prevents continuous emails
        if (!result.statusChanged) {
          console.log(`⏭️  Skipping alert for ${serviceId} - status is ${result.status} but hasn't changed (already notified)`);
          continue;
        }
        
        // Additional throttling check (in case statusChanged flag is not working correctly)
        if (shouldThrottle(serviceId, result.status, result.statusChanged)) {
          console.log(`⏸️  Alert throttled for service ${serviceId} - already sent alert for ${result.status} status recently`);
          continue;
        }

        const service = await Service.findById(result.serviceId);
        if (!service) {
          console.warn(`⚠️  Service not found for alert: ${serviceId}`);
          continue;
        }

        // Get project email as fallback
        let projectEmail = null;
        if (service.projectId) {
          try {
            console.log(`🔍 Looking up project for service ${service.name}:`);
            console.log(`   Service projectId: ${service.projectId} (type: ${typeof service.projectId})`);
            
            const project = await Project.findById(service.projectId);
            if (project) {
              projectEmail = project.ownerEmail || null;
              console.log(`   Project found: ${project.name}`);
              console.log(`   Project ownerEmail: "${projectEmail || 'NOT SET'}"`);
              if (projectEmail) {
                console.log(`   ✅ Will use project email as fallback: ${projectEmail}`);
              } else {
                console.log(`   ⚠️  Project exists but has no ownerEmail set`);
              }
            } else {
              console.warn(`   ⚠️  Project not found for projectId: ${service.projectId}`);
            }
          } catch (err) {
            console.error(`   ❌ Error fetching project for service ${service.name}:`, err.message);
            console.error(`   Error stack:`, err.stack);
          }
        } else {
          console.warn(`   ⚠️  Service ${service.name} has no projectId set`);
        }

        // Get alert rule for this service
        const alertRule = await AlertRule.findOne({ 
          serviceId: result.serviceId, 
          enabled: true 
        });

        // Check if alert rule allows this type of notification
        if (alertRule) {
          if (result.status === 'down' && !alertRule.rules?.notifyOnDown) {
            console.log(`⏭️  Alert skipped: notifyOnDown is disabled for ${service.name}`);
            continue;
          }
          if (result.status === 'degraded' && !alertRule.rules?.notifyOnDegraded) {
            console.log(`⏭️  Alert skipped: notifyOnDegraded is disabled for ${service.name}`);
            continue;
          }
        }

        const incident = await Incident.findOne({
          serviceId: result.serviceId,
          resolved: false
        });

        const healthData = {
          status: result.status,
          latency: result.latency,
          cpu: result.cpu,
          memory: result.memory
        };

        const statusChangeInfo = result.statusChanged 
          ? ` (status changed from ${result.previousStatus} to ${result.status})`
          : '';
        
        console.log(`📧 Sending alerts for service ${service.name} (${result.status})${statusChangeInfo}`);

        // Send alerts in parallel based on alert rule configuration
        const alertPromises = [];

        // Email - Always try if owner email exists, alert rule has recipients, or project email exists
        console.log(`\n📧 EMAIL CONFIGURATION CHECK for ${service.name}:`);
        console.log(`   Service ownerEmail: "${service.ownerEmail || 'NOT SET'}"`);
        console.log(`   Project ownerEmail: "${projectEmail || 'NOT SET'}" (fallback)`);
        console.log(`   EMAIL_USER configured: ${!!process.env.EMAIL_USER} ${process.env.EMAIL_USER ? '(' + process.env.EMAIL_USER.substring(0, 5) + '***)' : '(MISSING!)'}`);
        console.log(`   EMAIL_PASS configured: ${!!process.env.EMAIL_PASS ? 'YES' : 'NO - MISSING!'}`);
        console.log(`   EMAIL_HOST: ${process.env.EMAIL_HOST || 'smtp.gmail.com (default)'}`);
        console.log(`   EMAIL_PORT: ${process.env.EMAIL_PORT || '587 (default)'}`);
        console.log(`   Alert rule email enabled: ${alertRule?.channels?.email?.enabled || false}`);
        console.log(`   Alert rule recipients: ${alertRule?.channels?.email?.recipients?.length || 0}`);
        
        const hasOwnerEmail = !!service.ownerEmail;
        const hasProjectEmail = !!projectEmail;
        const hasAlertRuleRecipients = !!(alertRule?.channels?.email?.enabled && alertRule.channels.email.recipients?.length > 0);
        const hasEmailConfig = !!(process.env.EMAIL_USER && process.env.EMAIL_PASS);
        
        if (hasOwnerEmail || hasAlertRuleRecipients || hasProjectEmail) {
          if (hasEmailConfig) {
            console.log(`   ✅ Email WILL be sent for ${service.name}`);
            alertPromises.push(sendEmailAlert(service, incident, healthData, alertRule, projectEmail));
          } else {
            console.log(`   ❌ Email CANNOT be sent - EMAIL_USER or EMAIL_PASS not configured in .env`);
            console.log(`   💡 Add EMAIL_USER and EMAIL_PASS to backend/.env file`);
          }
        } else {
          console.log(`   ⚠️  Email will NOT be sent for ${service.name} - no recipients configured`);
          console.log(`   💡 TIP: Set ownerEmail on the service/project or configure alert rule recipients`);
        }

        // Slack - Only if configured in alert rule or env
        if (alertRule?.channels?.slack?.enabled && alertRule.channels.slack.webhookUrl) {
          alertPromises.push(sendSlackAlert(service, incident, healthData));
        } else if (process.env.SLACK_WEBHOOK_URL) {
          alertPromises.push(sendSlackAlert(service, incident, healthData));
        }

        // Telegram - Only if configured in alert rule or env
        if (alertRule?.channels?.telegram?.enabled && alertRule.channels.telegram.botToken && alertRule.channels.telegram.chatId) {
          alertPromises.push(sendTelegramAlert(service, incident, healthData));
        } else if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
          alertPromises.push(sendTelegramAlert(service, incident, healthData));
        }

        // WhatsApp - Only if configured in alert rule or env
        if (alertRule?.channels?.whatsapp?.enabled && alertRule.channels.whatsapp.accessToken) {
          alertPromises.push(sendWhatsAppAlert(service, incident, healthData));
        } else if (process.env.WHATSAPP_ACCESS_TOKEN) {
          alertPromises.push(sendWhatsAppAlert(service, incident, healthData));
        }

        if (alertPromises.length > 0) {
          const results = await Promise.allSettled(alertPromises);
          const successCount = results.filter(r => r.status === 'fulfilled' && r.value).length;
          console.log(`✅ Sent ${successCount}/${alertPromises.length} alert(s) for ${service.name}`);
          
          // Record alert with current status to prevent duplicate alerts
          recordAlert(serviceId, result.status);
        } else {
          console.warn(`⚠️  No alert channels configured for service ${service.name}`);
        }
      }
    }
  } catch (error) {
    console.error('❌ Alert triggering error:', error);
  }
};

