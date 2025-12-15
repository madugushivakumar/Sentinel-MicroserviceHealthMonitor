import cron from 'node-cron';
import { performHealthCheck } from '../services/healthChecker.js';
import { calculateAllReliabilityScores } from '../services/sloEngine.js';

let ioInstance = null;

export const initializeHealthCheckCron = (io) => {
  ioInstance = io;

  // Run health check every 10 seconds (using every 10 seconds pattern)
  const healthCheckJob = cron.schedule('*/10 * * * * *', async () => {
    try {
      console.log(`[${new Date().toISOString()}] Running scheduled health check...`);
      const results = await performHealthCheck(ioInstance);
      console.log(`[${new Date().toISOString()}] Health check completed. Checked ${results.length} services.`);
    } catch (error) {
      console.error('Health check cron error:', error);
    }
  }, {
    scheduled: true,
    timezone: "UTC"
  });

  // Calculate reliability scores every hour
  const reliabilityJob = cron.schedule('0 * * * *', async () => {
    try {
      console.log(`[${new Date().toISOString()}] Calculating reliability scores...`);
      await calculateAllReliabilityScores();
      console.log(`[${new Date().toISOString()}] Reliability scores calculated.`);
    } catch (error) {
      console.error('Reliability calculation cron error:', error);
    }
  }, {
    scheduled: true,
    timezone: "UTC"
  });

  // Run initial health check immediately
  setTimeout(async () => {
    try {
      console.log('Running initial health check...');
      await performHealthCheck(ioInstance);
    } catch (error) {
      console.error('Initial health check error:', error);
    }
  }, 2000); // Wait 2 seconds after server starts

  console.log('✅ Health check cron jobs initialized');
  console.log('   - Health checks: Every 10 seconds');
  console.log('   - Reliability scores: Every hour');
  
  return { healthCheckJob, reliabilityJob };
};

