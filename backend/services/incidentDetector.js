import Incident from '../models/Incident.js';
import HealthLog from '../models/HealthLog.js';

const LATENCY_THRESHOLD = 1000; // 1000ms

export const detectIncidents = async (service, healthLog) => {
  try {
    // Check if service is down
    if (healthLog.status === 'down') {
      // Check if there's already an open incident
      const existingIncident = await Incident.findOne({
        serviceId: service._id,
        type: 'down',
        resolved: false
      });

      if (!existingIncident) {
        // Create new incident
        const incident = new Incident({
          serviceId: service._id,
          type: 'down',
          severity: 'critical',
          startedAt: new Date(),
          resolved: false,
          details: `Service unreachable. Response code: ${healthLog.responseCode || 'N/A'}`
        });
        await incident.save();
        return incident;
      }
    } else {
      // Service is up, check if we need to resolve existing down incidents
      const downIncident = await Incident.findOne({
        serviceId: service._id,
        type: 'down',
        resolved: false
      });

      if (downIncident) {
        downIncident.resolved = true;
        downIncident.endedAt = new Date();
        await downIncident.save();
      }
    }

    // Check latency threshold
    if (healthLog.latency > LATENCY_THRESHOLD && healthLog.status !== 'down') {
      const existingLatencyIncident = await Incident.findOne({
        serviceId: service._id,
        type: 'latency',
        resolved: false
      });

      if (!existingLatencyIncident) {
        const incident = new Incident({
          serviceId: service._id,
          type: 'latency',
          severity: 'warning',
          startedAt: new Date(),
          resolved: false,
          details: `Latency exceeded threshold: ${healthLog.latency}ms > ${LATENCY_THRESHOLD}ms`
        });
        await incident.save();
        return incident;
      }
    } else if (healthLog.latency <= LATENCY_THRESHOLD) {
      // Resolve latency incidents if latency is back to normal
      const latencyIncident = await Incident.findOne({
        serviceId: service._id,
        type: 'latency',
        resolved: false
      });

      if (latencyIncident) {
        latencyIncident.resolved = true;
        latencyIncident.endedAt = new Date();
        await latencyIncident.save();
      }
    }

    return null;
  } catch (error) {
    console.error('Incident detection error:', error);
    return null;
  }
};

