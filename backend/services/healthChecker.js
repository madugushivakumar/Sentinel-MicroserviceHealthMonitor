import axios from 'axios';
import mongoose from 'mongoose';
import Service from '../models/Service.js';
import HealthLog from '../models/HealthLog.js';
import { detectIncidents } from './incidentDetector.js';
import { triggerAlerts } from './alertService.js';

const HEALTH_CHECK_TIMEOUT = 5000; // 5 seconds

export const performHealthCheck = async (io) => {
  try {
    // Check if MongoDB is connected
    if (mongoose.connection.readyState !== 1) {
      console.warn('⚠️  MongoDB not connected, skipping health check');
      return [];
    }
    
    let services;
    try {
      services = await Service.find({ active: true });
    } catch (dbError) {
      console.error('Error fetching services from database:', dbError.message);
      throw new Error(`Database query failed: ${dbError.message}`);
    }
    
    if (!services || services.length === 0) {
      console.log('No active services found');
      return [];
    }
    
    const checkPromises = services.map(async (service) => {
      const startTime = Date.now();
      let latency = 0;
      let status = 'down';
      let cpu = 0;
      let memory = 0;
      let responseCode = 0;
      let response = null; // Declare response outside try block

      try {
        const baseUrl = service.url.replace(/\/health\/?$/, '').replace(/\/$/, '');
        const healthUrl = `${baseUrl}/health`;
        
        response = await axios.get(healthUrl, {
          timeout: HEALTH_CHECK_TIMEOUT,
          validateStatus: () => true // Accept all status codes
        });

        responseCode = response.status;
        latency = Date.now() - startTime;

        // Check response data regardless of HTTP status code
        // Services may return 503 with status: 'DOWN' in the body
        if (response.data) {
          const healthData = response.data;
          
          // Log raw response for debugging
          console.log(`  [DEBUG] ${service.name} - Raw response: HTTP ${response.status}, Body keys: ${Object.keys(healthData).join(', ')}`);
          console.log(`  [DEBUG] ${service.name} - Full response body:`, JSON.stringify(healthData, null, 2));
          
          // First, check if there's a checks array (microservice-health-endpoint format)
          // This is the most reliable way to detect errors
          if (healthData.checks && Array.isArray(healthData.checks) && healthData.checks.length > 0) {
            console.log(`  [DEBUG] ${service.name} - Found checks array with ${healthData.checks.length} checks`);
            const checkStatuses = healthData.checks.map(check => {
              const checkStatus = check.status?.toLowerCase() || check.state?.toLowerCase() || 'unknown';
              if (checkStatus === 'up' || checkStatus === 'ok' || checkStatus === 'healthy') return 'ok';
              if (checkStatus === 'down' || checkStatus === 'unhealthy' || checkStatus === 'error') return 'down';
              if (checkStatus === 'degraded' || checkStatus === 'warning') return 'degraded';
              return 'unknown';
            });
            
            // If any check is down, service is down
            if (checkStatuses.includes('down')) {
              status = 'down';
            } else if (checkStatuses.includes('degraded')) {
              status = 'degraded';
            } else if (checkStatuses.every(s => s === 'ok')) {
              status = 'ok';
            } else {
              // If there are unknown checks, consider it degraded
              status = 'degraded';
            }
          } else {
            // No checks array, check the main status field and other error indicators
            // Handle both uppercase and lowercase status values
            const healthStatusRaw = healthData.status;
            const healthStatus = healthStatusRaw?.toLowerCase();
            
            // Check for explicit error indicators (case-insensitive)
            const hasError = healthData.error || healthData.errors || healthData.failed || 
                           (healthData.healthy === false) || (healthData.health === false);
            
            // Check for DOWN status in various formats (case-insensitive)
            const isDownStatus = healthStatus === 'down' || 
                                healthStatusRaw === 'DOWN' || 
                                healthStatusRaw === 'Down' ||
                                healthStatus === 'unhealthy' ||
                                healthStatusRaw === 'UNHEALTHY';
            
            // IMPORTANT: Check HTTP status code FIRST if it's 5xx, as it's a strong indicator
            // Then check the status field in the body
            if (response.status >= 500) {
              // HTTP 5xx means service is down, regardless of body content
              status = 'down';
              console.log(`  [DEBUG] ${service.name} - HTTP ${response.status} detected, setting status to DOWN`);
            } else if (hasError) {
              status = 'down';
              console.log(`  [DEBUG] ${service.name} - Error indicators found, setting status to DOWN`);
            } else if (isDownStatus) {
              status = 'down';
              console.log(`  [DEBUG] ${service.name} - Status field indicates DOWN (${healthStatusRaw}), setting status to DOWN`);
            } else if (healthStatus === 'up' || healthStatus === 'ok' || healthStatus === 'healthy' || healthStatusRaw === 'UP' || healthStatusRaw === 'OK') {
              status = 'ok';
            } else if (healthStatus === 'degraded' || healthStatus === 'warning') {
              status = 'degraded';
            } else {
              // If no explicit status in body, use HTTP status code
              if (response.status === 200) {
                // Even with 200, check for error indicators
                if (hasError) {
                  status = 'down';
                } else {
                  status = 'ok';
                }
              } else if (response.status >= 400) {
                // 4xx might be degraded, but 503 specifically means down
                if (response.status === 503) {
                  status = 'down';
                  console.log(`  [DEBUG] ${service.name} - HTTP 503 detected, setting status to DOWN`);
                } else {
                  status = 'degraded';
                }
              } else {
                status = 'down';
              }
            }
          }

          // Extract CPU and memory from health response if available (custom format)
          if (healthData.system) {
            // Extract from system.memory_usage
            if (healthData.system.memory_usage) {
              const memData = healthData.system.memory_usage;
              memory = Math.round((memData.heapUsed || memData.rss || 0) / (1024 * 1024) * 10) / 10; // Convert to MB, round to 1 decimal
            }
            // Extract CPU load (average of the array)
            if (healthData.system.cpu_load && Array.isArray(healthData.system.cpu_load)) {
              const cpuLoads = healthData.system.cpu_load.filter(v => v > 0);
              if (cpuLoads.length > 0) {
                const avgLoad = cpuLoads.reduce((a, b) => a + b, 0) / cpuLoads.length;
                cpu = Math.round(avgLoad * 100 * 10) / 10; // Convert to percentage, round to 1 decimal
              }
            }
          }

          // Try to fetch metrics if metricsUrl is available (fallback)
          if (service.metricsUrl && (!memory || !cpu)) {
            try {
              const metricsBaseUrl = service.metricsUrl.replace(/\/metrics\/?$/, '').replace(/\/$/, '');
              const metricsResponse = await axios.get(`${metricsBaseUrl}/metrics`, {
                timeout: 3000,
                validateStatus: () => true
              });

              if (metricsResponse.status === 200 && metricsResponse.data) {
                const metrics = metricsResponse.data;
                
                // Extract CPU and memory from metrics if not already extracted
                if (!cpu && (metrics.cpu || metrics.cpuUsage)) {
                  const cpuValue = metrics.cpu?.usage || metrics.cpuUsage || 0;
                  cpu = Math.round(cpuValue * 10) / 10; // Round to 1 decimal
                }
                if (!memory && (metrics.mem || metrics.memoryUsage)) {
                  const memData = metrics.mem || metrics.memoryUsage || {};
                  memory = Math.round((memData.heapUsed || memData.rss || 0) / (1024 * 1024) * 10) / 10; // Convert to MB, round to 1 decimal
                }
              }
            } catch (metricsError) {
              // Metrics fetch failed, but health check succeeded
              console.log(`Metrics fetch failed for ${service.name}:`, metricsError.message);
            }
          }
        } else {
          // No response data, use HTTP status code to determine health
          if (response.status === 200) {
            status = 'ok';
          } else if (response.status >= 500) {
            status = 'down';
          } else if (response.status >= 400) {
            status = 'degraded';
          } else {
            status = 'down';
          }
        }
      } catch (error) {
        latency = Date.now() - startTime;
        status = 'down';
        responseCode = 0;
        
        console.error(`✗ ${service.name}: ${error.message || 'Connection failed'}`);
        
        if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
          // Service unreachable
        }
      }

      // Calculate error count (1 if down, 0 otherwise)
      const errorCount = status === 'down' ? 1 : 0;

      // Get previous status BEFORE saving new log to detect status changes
      const previousLog = await HealthLog.findOne({ serviceId: service._id })
        .sort({ timestamp: -1 });
      const previousStatus = previousLog?.status || null;
      const statusChanged = previousStatus !== null && previousStatus !== status;

      // Save health log
      const healthLog = new HealthLog({
        serviceId: service._id,
        latency,
        status,
        cpu,
        memory,
        responseCode,
        errorCount,
        timestamp: new Date()
      });

      await healthLog.save();

      // Log health check result with details
      const statusEmoji = status === 'ok' ? '✓' : status === 'degraded' ? '⚠' : '✗';
      console.log(`${statusEmoji} ${service.name}: ${status.toUpperCase()} (${latency}ms, CPU: ${cpu.toFixed(1)}%, Mem: ${memory.toFixed(1)}MB, HTTP: ${responseCode})`);
      
      // Log detailed health data for debugging (always log to help diagnose issues)
      if (response && response.data) {
        const healthData = response.data;
        const healthStatusRaw = healthData.status;
        const healthStatus = healthStatusRaw?.toLowerCase();
        console.log(`  [DEBUG] ${service.name} - HTTP: ${responseCode}, Status in body: "${healthStatusRaw}" (raw) / "${healthStatus}" (lowercase), Final status: "${status}"`);
        
        // If service should be DOWN but we're not detecting it, log more details
        if ((responseCode >= 500 || healthStatusRaw === 'DOWN' || healthStatusRaw === 'Down' || healthStatus === 'down') && status !== 'down') {
          console.error(`  [ERROR] ${service.name} - MISMATCH! Should be DOWN but detected as ${status}`);
          console.error(`  [ERROR] HTTP Code: ${responseCode}, Body Status: "${healthStatusRaw}", Has Checks: ${!!healthData.checks}`);
          if (healthData.checks) {
            console.error(`  [ERROR] Checks array:`, JSON.stringify(healthData.checks, null, 2));
          }
        }
        
        if (status !== 'ok') {
          console.log(`  [DEBUG] Full health data:`, JSON.stringify(healthData, null, 2).substring(0, 800));
        }
      } else {
        console.log(`  [DEBUG] ${service.name} - HTTP: ${responseCode}, No response data, Final status: "${status}"`);
      }

      // Detect incidents (wrap in try-catch to prevent failure)
      try {
        await detectIncidents(service, healthLog);
      } catch (incidentError) {
        console.error(`Error detecting incidents for ${service.name}:`, incidentError.message);
        // Continue even if incident detection fails
      }

      // Emit real-time update via WebSocket
      if (io) {
        try {
          io.emit('healthUpdate', {
            serviceId: service._id.toString(),
            serviceName: service.name,
            status,
            latency,
            cpu,
            memory,
            timestamp: new Date()
          });
        } catch (emitError) {
          console.error(`Error emitting health update for ${service.name}:`, emitError.message);
          // Continue even if emit fails
        }
      }

      return {
        serviceId: service._id,
        serviceName: service.name,
        status,
        latency,
        cpu,
        memory,
        previousStatus,
        statusChanged
      };
    });

    const results = await Promise.all(checkPromises);
    
    // Trigger alerts automatically for services that are down/degraded
    // Alerts are sent ONLY when status changes (prevents continuous emails)
    // - When service status changes to DOWN
    // - When service status changes to DEGRADED
    try {
      const servicesNeedingAlerts = results.filter(
        result => {
          // Only alert if status changed (prevents spam for services that stay down/degraded)
          if ((result.status === 'down' || result.status === 'degraded') && result.statusChanged) {
            return true;
          }
          return false;
        }
      );
      
      if (servicesNeedingAlerts.length > 0) {
        console.log(`📧 Auto-triggering alerts for ${servicesNeedingAlerts.length} service(s): ${servicesNeedingAlerts.map(s => `${s.serviceName} (${s.status})`).join(', ')}`);
        await triggerAlerts(servicesNeedingAlerts);
      }
    } catch (alertError) {
      console.error('❌ Error triggering alerts:', alertError.message);
      // Continue even if alert triggering fails
    }

    return results;
  } catch (error) {
    console.error('Health check error:', error);
    throw error;
  }
};

