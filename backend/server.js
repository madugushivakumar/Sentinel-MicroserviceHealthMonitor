import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

import connectDB from './config/database.js';
import { initializeHealthCheckCron } from './cron/healthCheckCron.js';

// ✅ STEP-6: Rate Limiter import
import { apiLimiter } from './middleware/rateLimiter.js';

// Routes
import authRoutes from './routes/auth.js';
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

dotenv.config();

// ---------- PATH SETUP ----------
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ---------- ENV VALIDATION ----------
if (!process.env.MONGODB_URI) {
  console.error('❌ MONGODB_URI is not set');
  process.exit(1);
}

// ---------- APP SETUP ----------
const app = express();
const httpServer = createServer(app);

// ✅ Render / proxy fix (VERY IMPORTANT)
app.set('trust proxy', 1);

// ---------- ALLOWED ORIGINS ----------
const allowedOrigins = [
  'https://sentinel-microservice-health-monito.vercel.app',
  'https://sentinel-microservice-health-monito-eight.vercel.app',
  'http://localhost:5173'
];

// ---------- EXPRESS CORS ----------
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS not allowed'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ---------- STEP-6: RATE LIMITER (API ONLY) ----------
app.use('/api', apiLimiter);

// ---------- SOCKET.IO ----------
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

io.on('connection', (socket) => {
  console.log('🔌 Socket connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('❌ Socket disconnected:', socket.id);
  });
});

// Make socket available in routes
app.set('io', io);

// ---------- API ROUTES ----------
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/incidents', incidentsRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api/alert-rules', alertRulesRoutes);
app.use('/api/reliability', reliabilityRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/npm-generator', npmGeneratorRoutes);
app.use('/api/debug', debugRoutes);
app.use('/metrics', metricsRoutes);

// ---------- HEALTH ----------
app.get('/health', (req, res) => {
  res.json({ status: 'UP', timestamp: new Date().toISOString() });
});

// ---------- ROOT ----------
app.get('/', (req, res) => {
  res.json({
    message: 'Sentinel Microservice Health Monitor API',
    version: '1.0.0'
  });
});

// ---------- DB FLAG ----------
let dbConnected = false;

// ---------- START SERVER ----------
const startServer = async () => {
  try {
    await connectDB();
    dbConnected = true;

    initializeHealthCheckCron(io);

    const PORT = process.env.PORT || 5000;
    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('❌ Server failed to start:', err);
    process.exit(1);
  }
};

startServer();

export { dbConnected };
