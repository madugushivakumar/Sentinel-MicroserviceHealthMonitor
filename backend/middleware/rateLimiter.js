import rateLimit from 'express-rate-limit';

export const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000, // Increased from 100 to 1000
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for localhost in development (or when NODE_ENV is not production)
    const isDev = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';
    if (isDev) {
      const ip = req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || '';
      return ip.includes('127.0.0.1') || ip === '::1' || ip === '::ffff:127.0.0.1' || !ip || ip === 'localhost';
    }
    return false;
  },
  // Use a more lenient key generator in development
  keyGenerator: (req) => {
    // In development, use a single key for all requests to avoid rate limiting
    const isDev = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';
    if (isDev) {
      return 'dev-client';
    }
    return req.ip || req.connection?.remoteAddress || 'unknown';
  }
});

export const healthCheckLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 300, // Increased from 60 to 300
  message: 'Too many health check requests',
  skip: (req) => {
    // Skip rate limiting for localhost in development (or when NODE_ENV is not production)
    const isDev = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';
    if (isDev) {
      const ip = req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || '';
      return ip.includes('127.0.0.1') || ip === '::1' || ip === '::ffff:127.0.0.1' || !ip || ip === 'localhost';
    }
    return false;
  }
});
