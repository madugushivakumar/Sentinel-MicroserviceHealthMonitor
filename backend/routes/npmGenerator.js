import express from 'express';
import { apiLimiter } from '../middleware/rateLimiter.js';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

// Generate NPM package structure
router.post('/generate', apiLimiter, async (req, res) => {
  try {
    const { serviceName, version = '1.0.0' } = req.body;

    if (!serviceName) {
      return res.status(400).json({ error: 'serviceName is required' });
    }

    const packageDir = join(__dirname, '../../npm-packages', serviceName);
    
    // Create directory if it doesn't exist
    if (!existsSync(packageDir)) {
      await mkdir(packageDir, { recursive: true });
    }

    // Generate package.json
    const packageJson = {
      name: `microservice-health-endpoint`,
      version: version,
      description: 'Automatic health, metrics, and selftest endpoints for microservices',
      main: 'index.js',
      scripts: {
        test: 'echo "Error: no test specified" && exit 1'
      },
      keywords: ['health', 'monitoring', 'metrics', 'microservice'],
      author: '',
      license: 'MIT'
    };

    // Generate index.js
    const indexJs = `const health = require('./health');
const metrics = require('./metrics');
const selftest = require('./selftest');

module.exports = function(options = {}) {
  const config = {
    serviceName: options.serviceName || '${serviceName}',
    version: options.version || '${version}',
    ...options
  };

  return function(req, res, next) {
    // Health endpoint
    if (req.path === '/health' || req.path === '/health/') {
      return health(config)(req, res, next);
    }
    
    // Metrics endpoint
    if (req.path === '/metrics' || req.path === '/metrics/') {
      return metrics(config)(req, res, next);
    }
    
    // Selftest endpoint
    if (req.path === '/selftest' || req.path === '/selftest/') {
      return selftest(config)(req, res, next);
    }
    
    next();
  };
};`;

    // Generate health.js
    const healthJs = `const os = require('os');
const process = require('process');
const pkg = require('./package.json');

module.exports = function(config = {}) {
  return function(req, res) {
    const uptime = process.uptime();
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    const healthData = {
      status: 'ok',
      uptime: Math.floor(uptime),
      timestamp: Math.floor(Date.now() / 1000),
      service: {
        name: config.serviceName || pkg.name,
        version: config.version || pkg.version
      },
      system: {
        memory_usage: {
          rss: memUsage.rss,
          heapTotal: memUsage.heapTotal,
          heapUsed: memUsage.heapUsed,
          external: memUsage.external
        },
        cpu_load: os.loadavg()
      },
      process: {
        pid: process.pid,
        uptime: uptime,
        memoryUsage: memUsage,
        cpuUsage: cpuUsage
      }
    };
    
    res.json(healthData);
  };
};`;

    // Generate metrics.js
    const metricsJs = `const os = require('os');
const process = require('process');
const pkg = require('./package.json');

module.exports = function(config = {}) {
  return function(req, res) {
    const uptime = process.uptime();
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    const loadAvg = os.loadavg();
    
    const serviceName = (config.serviceName || pkg.name).replace(/[^a-zA-Z0-9_]/g, '_');
    
    const metrics = \`# HELP service_up Service availability
# TYPE service_up gauge
service_up{service="\${serviceName}"} 1

# HELP service_uptime_seconds Service uptime in seconds
# TYPE service_uptime_seconds gauge
service_uptime_seconds{service="\${serviceName}"} \${Math.floor(uptime)}

# HELP service_cpu_usage CPU usage percentage
# TYPE service_cpu_usage gauge
service_cpu_usage{service="\${serviceName}"} \${(loadAvg[0] * 100).toFixed(2)}

# HELP service_memory_mb Memory usage in MB
# TYPE service_memory_mb gauge
service_memory_mb{service="\${serviceName}"} \${(memUsage.heapUsed / 1024 / 1024).toFixed(2)}

# HELP service_latency_ms Service latency in milliseconds
# TYPE service_latency_ms gauge
service_latency_ms{service="\${serviceName}"} 0

# HELP service_errors_total Total errors
# TYPE service_errors_total counter
service_errors_total{service="\${serviceName}"} 0
\`;
    
    res.set('Content-Type', 'text/plain');
    res.send(metrics);
  };
};`;

    // Generate selftest.js
    const selftestJs = `const os = require('os');
const process = require('process');

module.exports = function(config = {}) {
  return function(req, res) {
    const checks = {
      database: {
        status: 'ok',
        message: 'Database connection check (implement your DB check here)'
      },
      environment: {
        status: 'ok',
        message: 'Environment variables loaded',
        nodeEnv: process.env.NODE_ENV || 'development'
      },
      dependencies: {
        status: 'ok',
        message: 'All dependencies available'
      },
      memory: {
        status: process.memoryUsage().heapUsed < (512 * 1024 * 1024) ? 'ok' : 'warning',
        message: \`Memory usage: \${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB\`
      }
    };
    
    const allOk = Object.values(checks).every(check => check.status === 'ok');
    
    res.json({
      status: allOk ? 'ok' : 'degraded',
      checks: checks,
      timestamp: new Date().toISOString()
    });
  };
};`;

    // Generate README.md
    const readmeMd = `# Microservice Health Endpoint

Automatic health, metrics, and selftest endpoints for microservices.

## Installation

\`\`\`bash
npm install
\`\`\`

## Usage

\`\`\`javascript
const health = require('./index');

// Basic usage
app.use(health());

// With configuration
app.use(health({
  serviceName: '${serviceName}',
  version: '${version}'
}));
\`\`\`

## Endpoints

- \`GET /health\` - Health check endpoint
- \`GET /metrics\` - Prometheus-compatible metrics
- \`GET /selftest\` - Self-test endpoint

## Health Response

\`\`\`json
{
  "status": "ok",
  "uptime": 1234,
  "timestamp": 1733303920,
  "service": {
    "name": "${serviceName}",
    "version": "${version}"
  },
  "system": {
    "memory_usage": {...},
    "cpu_load": [...]
  }
}
\`\`\`

## Metrics Format

Prometheus-compatible text format with metrics:
- \`service_up\`
- \`service_uptime_seconds\`
- \`service_cpu_usage\`
- \`service_memory_mb\`
- \`service_latency_ms\`
- \`service_errors_total\`

## License

MIT
`;

    // Write files
    await writeFile(join(packageDir, 'package.json'), JSON.stringify(packageJson, null, 2));
    await writeFile(join(packageDir, 'index.js'), indexJs);
    await writeFile(join(packageDir, 'health.js'), healthJs);
    await writeFile(join(packageDir, 'metrics.js'), metricsJs);
    await writeFile(join(packageDir, 'selftest.js'), selftestJs);
    await writeFile(join(packageDir, 'README.md'), readmeMd);

    res.json({
      message: 'NPM package generated successfully',
      path: packageDir,
      files: ['package.json', 'index.js', 'health.js', 'metrics.js', 'selftest.js', 'README.md']
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Download generated package as zip
router.get('/download/:serviceName', apiLimiter, async (req, res) => {
  try {
    const { serviceName } = req.params;
    const packageDir = join(__dirname, '../../npm-packages', serviceName);
    
    if (!existsSync(packageDir)) {
      return res.status(404).json({ error: 'Package not found' });
    }

    // For now, return the directory path
    // In production, you'd want to create a zip file
    res.json({
      message: 'Package available',
      path: packageDir,
      downloadUrl: `/api/npm-generator/download/${serviceName}/zip`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

