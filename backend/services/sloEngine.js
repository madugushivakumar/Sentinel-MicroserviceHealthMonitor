import HealthLog from '../models/HealthLog.js';
import ReliabilityScore from '../models/ReliabilityScore.js';
import Service from '../models/Service.js';

// Calculate reliability scores for a service
export const calculateReliabilityScore = async (serviceId) => {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    // Get all health logs from last 7 days
    const logs = await HealthLog.find({
      serviceId,
      timestamp: { $gte: sevenDaysAgo }
    }).sort({ timestamp: 1 });

    if (logs.length === 0) {
      return null;
    }

    // Calculate uptime %
    const okResponses = logs.filter(log => log.status === 'ok').length;
    const uptime = (okResponses / logs.length) * 100;

    // Calculate error rate %
    const errorResponses = logs.filter(log => log.status === 'down').length;
    const errorRate = (errorResponses / logs.length) * 100;

    // Calculate latency percentiles
    const latencies = logs
      .map(log => log.latency)
      .filter(lat => lat > 0)
      .sort((a, b) => a - b);

    const p50 = latencies[Math.floor(latencies.length * 0.5)] || 0;
    const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
    const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0;

    // Get service SLO target (default 99.9%)
    const service = await Service.findById(serviceId);
    const sloTarget = service?.sloTarget || 99.9;

    // Determine status
    const status = uptime >= sloTarget ? 'PASS' : 'FAIL';

    // Update or create reliability score
    const score = await ReliabilityScore.findOneAndUpdate(
      { serviceId },
      {
        uptime,
        p50Latency: p50,
        p95Latency: p95,
        p99Latency: p99,
        errorRate,
        sloTarget,
        status,
        lastCalculated: new Date()
      },
      { upsert: true, new: true }
    );

    return score;
  } catch (error) {
    console.error('Reliability score calculation error:', error);
    return null;
  }
};

// Calculate reliability for all services
export const calculateAllReliabilityScores = async () => {
  try {
    const services = await Service.find({ active: true });
    const results = await Promise.all(
      services.map(service => calculateReliabilityScore(service._id))
    );
    return results.filter(r => r !== null);
  } catch (error) {
    console.error('Batch reliability calculation error:', error);
    return [];
  }
};

