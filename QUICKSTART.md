# Quick Start Guide

## Prerequisites
- Node.js 18+ installed
- MongoDB running (local or cloud)

## Step 1: Start MongoDB
If using local MongoDB:
```bash
mongod
```

Or use MongoDB Atlas (cloud) and update the connection string in `backend/.env`

## Step 2: Setup Backend

```bash
cd backend
npm install
# Create .env file (see ENV_SETUP.md for the MongoDB connection string)
npm run dev
```

**MongoDB Connection String:**
```
mongodb+srv://isha4shiva_db_user:KFWa7AceeiwND8VA@cluster0.nypeof3.mongodb.net/sentinel?retryWrites=true&w=majority&appName=Cluster0
```

Create a `.env` file in the `backend/` directory with this connection string. See `backend/ENV_SETUP.md` for the complete configuration.

Backend will start on `http://localhost:5000`

## Step 3: Setup Frontend

```bash
# From project root
cd frontend
npm install
npm run dev
```

Frontend will start on `http://localhost:5173`

## Step 4: Add Your First Service

1. Open `http://localhost:5173`
2. Click "Services" in the sidebar
3. Click "+ Add Service"
4. Fill in:
   - Name: `test-service`
   - Health URL: `http://localhost:3001/health`
   - Metrics URL: `http://localhost:3001/metrics` (optional)
   - Group: `Development`
   - Owner Email: `your@email.com`

## Step 5: Test with a Microservice

Create a test microservice using the `microservice-health-endpoint` package:

```bash
npm install microservice-health-endpoint
```

Create `test-service.js`:
```javascript
const express = require('express');
const health = require('microservice-health-endpoint');

const app = express();

app.use(health({ serviceName: 'test-service' }));

app.get('/', (req, res) => {
  res.json({ message: 'Test service running' });
});

app.listen(3001, () => {
  console.log('Test service running on port 3001');
});
```

Run it:
```bash
node test-service.js
```

Now Sentinel will automatically monitor this service every 10 seconds!

## Features to Try

1. **Dashboard**: View all services and their status
2. **Service Details**: Click on any service to see detailed metrics
3. **Incidents**: View detected incidents when services go down
4. **Alerts**: Configure Slack/Telegram/Email/WhatsApp alerts
5. **Metrics**: Access Prometheus metrics at `http://localhost:5000/metrics`

## Troubleshooting

- **MongoDB connection error**: Make sure MongoDB is running and the URI in `backend/.env` is correct
- **CORS errors**: Check that frontend URL matches `FRONTEND_URL` in backend `.env`
- **Services not showing**: Make sure the service has `/health` endpoint accessible
- **No real-time updates**: Check WebSocket connection in browser console
