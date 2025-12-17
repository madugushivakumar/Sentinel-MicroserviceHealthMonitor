import rateLimit from 'express-rate-limit';

// Helper to get real client IP (works with proxies like Vercel/Render)
const getClientIp = (req) => {
  // Trust proxy is set in server.js, so req.ip should work
  // But also check X-Forwarded-For header for better accuracy
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    // X-Forwarded-For can contain multiple IPs, take the first one (original client)
    const ips = forwarded.split(',').map(ip => ip.trim());
    return ips[0] || req.ip;
  }
  return req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || 'unknown';
};

export const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 5 * 60 * 1000, // 5 minutes (shorter window = faster recovery)
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 20000, // 20,000 requests per 5 minutes
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for localhost in development
    const isDev = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';
    if (isDev) {
      const ip = getClientIp(req);
      return ip.includes('127.0.0.1') || ip === '::1' || ip === '::ffff:127.0.0.1' || !ip || ip === 'localhost';
    }
    return false;
  },
  // Better key generator that uses real client IP
  keyGenerator: (req) => {
    const isDev = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';
    if (isDev) {
      return 'dev-client';
    }
    // Use real client IP (works with trust proxy)
    return getClientIp(req);
  },
  // Skip successful requests from rate limit count (only count errors/429s)
  skipSuccessfulRequests: false,
  // Skip failed requests from rate limit count
  skipFailedRequests: false
});

export const healthCheckLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 500, // Increased to 500 for production
  message: 'Too many health check requests',
  keyGenerator: (req) => {
    const isDev = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';
    if (isDev) {
      return 'dev-client';
    }
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      const ips = forwarded.split(',').map(ip => ip.trim());
      return ips[0] || req.ip;
    }
    return req.ip || req.connection?.remoteAddress || 'unknown';
  },
  skip: (req) => {
    const isDev = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';
    if (isDev) {
      const ip = getClientIp(req);
      return ip.includes('127.0.0.1') || ip === '::1' || ip === '::ffff:127.0.0.1' || !ip || ip === 'localhost';
    }
    return false;
  }
});
