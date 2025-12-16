import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import connectDB from './config/database.js';
import { initializeHealthCheckCron } from './cron/healthCheckCron.js';

// Routes
import projectsRoutes from './routes/projects.js';
import servicesRoutes from './routes/services.js';
import healthRoutes from './routes/health.js';
import incidentsRoutes from './routes/incidents.js';
import alertsRoutes from './routes/alerts.js';
import alertRulesRoutes from './routes/alertRules.js';
import metricsRoutes from './routes/metrics.js';
import reliabilityRoutes from './routes/reliability.js';
import reportsRoutes from './routes/reports.js';
import npmGeneratorRoutes from './routes/npmGenerator.js';
import debugRoutes from './routes/debug.js';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config();

// Verify MONGODB_URI is set
if (!process.env.MONGODB_URI) {
  console.error('❌ MONGODB_URI is not set');
  console.error('Please configure it in environment variables');
  process.exit(1);
}

const app = express();
const httpServer = createServer(app);

// Socket.IO setup
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true
});

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Trust proxy (important for rate limiting & Render)
app.set('trust proxy', 1);

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Make io available to routes
app.set('io', io);

// API Routes
app.use('/api/projects', projectsRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/incidents', incidentsRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api/alert-rules', alertRulesRoutes);
app.use('/api/reliability', reliabilityRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/npm-generator', npmGeneratorRoutes);
app.use('/metrics', metricsRoutes);
app.use('/api/debug', debugRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'UP', timestamp: new Date().toISOString() });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Sentinel Microservice Health Monitor API',
    version: '1.0.0'
  });
});

// Database connection flag
let dbConnected = false;

const startServer = async () => {
  try {
    // Connect DB
    await connectDB();
    dbConnected = true;

    // Start cron jobs after DB connection
    initializeHealthCheckCron(io);

    const PORT = process.env.PORT || 5000;

    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🏥 Health endpoint: /health`);
      console.log(`📈 Metrics endpoint: /metrics`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Start server
startServer();

// Export for routes
export { dbConnected };
