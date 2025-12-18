# Sentinel - Microservice Health Monitor

A comprehensive MERN stack application for monitoring microservice health, reliability, and performance.

## Project Structure

```
.
├── backend/          # Node.js + Express backend
│   ├── config/      # Database configuration
│   ├── models/      # MongoDB models
│   ├── routes/      # API routes
│   ├── services/    # Business logic
│   ├── middleware/  # Auth, rate limiting
│   ├── cron/        # Scheduled tasks
│   └── server.js    # Entry point
├── frontend/        # React frontend
│   ├── src/         # Source files
│   │   ├── components/
│   │   ├── pages/
│   │   └── services/
│   └── package.json
└── README.md
```

## Features

- ✅ Real-time health monitoring (every 10 seconds)
- ✅ Incident detection and tracking
- ✅ Multi-channel alerting (Slack, Telegram, Email, WhatsApp)
- ✅ Prometheus-compatible metrics endpoint
- ✅ SLA/SLO reliability scoring
- ✅ WebSocket live updates
- ✅ Service registration and management
- ✅ Historical health data visualization

## Tech Stack

### Backend
- Node.js + Express
- MongoDB + Mongoose
- Socket.IO (WebSocket)
- Node-cron (scheduled tasks)
- Axios (HTTP client)

### Frontend
- React 18
- React Router
- Socket.IO Client
- Recharts (data visualization)
- TailwindCSS

## Prerequisites

- Node.js 18+
- MongoDB (local or cloud)
- npm or yarn

## Installation

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```bash
cp .env.example .env
```

4. Edit `.env` file and configure environment variables (see `backend/.env.example` for reference):
```env
PORT=5000
MONGODB_URI=your-mongodb-connection-string-here
JWT_SECRET=your-secret-key-change-in-production
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Alert Integrations (optional)
SLACK_WEBHOOK_URL=
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=
EMAIL_PASS=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_ACCESS_TOKEN=
```

5. Start MongoDB (if running locally):
```bash
mongod
```

6. Start the backend server:
```bash
npm run dev
```

The backend will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file (optional, defaults to localhost:5000):
```bash
cp .env.example .env
```

Edit `.env` and set:
```env
VITE_API_BASE_URL=http://localhost:5000/api
```

4. Start the development server:
```bash
npm run dev
```

The frontend will run on `http://localhost:5173`

## Using the NPM Package

The project uses the `microservice-health-endpoint` package. To add health monitoring to your microservices:

```javascript
const express = require('express');
const health = require('microservice-health-endpoint');

const app = express();

// Add health endpoints
app.use(health({ serviceName: 'my-service' }));

// Your routes...
app.get('/', (req, res) => {
  res.json({ message: 'Hello World' });
});

app.listen(3001, () => {
  console.log('Server running on port 3001');
});
```

This automatically adds:
- `GET /health` - Health check endpoint
- `GET /metrics` - Prometheus-compatible metrics

## API Endpoints

### Services
- `GET /api/services` - Get all services
- `GET /api/services/:id` - Get single service
- `POST /api/services` - Create service
- `PUT /api/services/:id` - Update service
- `DELETE /api/services/:id` - Delete service

### Health
- `GET /api/health/latest` - Get latest health for all services
- `GET /api/health/:serviceId/history` - Get health history

### Incidents
- `GET /api/incidents` - Get all incidents
- `PATCH /api/incidents/:id/close` - Close incident

### Alerts
- `GET /api/alerts` - Get alert logs
- `POST /api/alerts/test` - Send test alert

### Reliability
- `GET /api/reliability` - Get all reliability scores
- `GET /api/reliability/:serviceId` - Get service reliability
- `POST /api/reliability/recalculate` - Recalculate scores

### Metrics
- `GET /metrics` - Prometheus-compatible metrics export

## Development

### Backend Development
```bash
cd backend
npm run dev  # Auto-restart on file changes
```

### Frontend Development
```bash
cd frontend
npm run dev  # Vite dev server with HMR
```

## Production Build

### Frontend
```bash
cd frontend
npm run build
npm run preview
```

### Backend
```bash
cd backend
npm start
```

## Features in Detail

### Health Checks
- Runs every 10 seconds via cron job
- Checks `/health` endpoint on all active services
- Measures latency, CPU, memory
- Detects incidents automatically

### Incident Detection
- Service down detection
- High latency warnings (>1000ms)
- Automatic incident creation and resolution

### Alerting
- Slack webhook integration
- Telegram bot integration
- Email via SMTP (Nodemailer)
- WhatsApp via Meta Cloud API
- Alert throttling (5 minutes per service)

### Reliability Scoring
- Calculates uptime percentage
- P50, P95, P99 latency percentiles
- Error rate calculation
- SLO target comparison
- Runs hourly via cron

### Prometheus Metrics
- `service_up` - Service availability gauge
- `service_latency_ms` - Latency gauge
- `service_errors` - Error counter
- `service_cpu_usage` - CPU usage gauge
- `service_memory_mb` - Memory usage gauge

## License

MIT
