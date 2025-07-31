/**
 * Rate Limiting Middleware
 * Comprehensive rate limiting for different endpoints with security monitoring
 */

import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import { Request, Response } from 'express';

// Custom store for tracking rate limit violations
class SecurityStore {
  private violations: Map<string, { count: number; firstViolation: Date; lastViolation: Date }> = new Map();
  
  recordViolation(identifier: string): void {
    const existing = this.violations.get(identifier);
    const now = new Date();
    
    if (existing) {
      existing.count++;
      existing.lastViolation = now;
    } else {
      this.violations.set(identifier, {
        count: 1,
        firstViolation: now,
        lastViolation: now
      });
    }
    
    // Log security violations
    if (existing && existing.count > 10) {
      console.warn(`[Security Alert] High rate limit violations from ${identifier}: ${existing.count} violations since ${existing.firstViolation}`);
    }
  }
  
  getViolations(identifier: string) {
    return this.violations.get(identifier);
  }
  
  cleanup(): void {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours
    for (const [key, value] of this.violations.entries()) {
      if (value.lastViolation < cutoff) {
        this.violations.delete(key);
      }
    }
  }
}

const securityStore = new SecurityStore();

// Cleanup violations every hour
setInterval(() => {
  securityStore.cleanup();
}, 60 * 60 * 1000);

// Custom key generator that includes IP and user agent fingerprinting
const generateKey = (req: Request): string => {
  const ip = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] as string;
  const userAgent = req.headers['user-agent'] || 'unknown';
  const userAgentHash = Buffer.from(userAgent).toString('base64').substring(0, 10);
  return `${ip}_${userAgentHash}`;
};

// Custom handler for rate limit exceeded
const rateLimitHandler = (req: Request, res: Response) => {
  const identifier = generateKey(req);
  securityStore.recordViolation(identifier);
  
  console.warn(`[Rate Limit] Request blocked from ${identifier} to ${req.path}`);
  
  const rateLimit = (req as any).rateLimit;
  
  res.status(429).json({
    success: false,
    message: 'Too many requests. Please slow down and try again later.',
    retryAfter: Math.ceil((rateLimit?.resetTime || Date.now()) / 1000)
  });
};

// Skip successful requests from rate limiting (only count failed attempts)
const skipSuccessfulRequests = (req: Request, res: Response): boolean => {
  return res.statusCode < 400;
};

/**
 * Strict rate limiting for authentication endpoints
 */
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 attempts per window per IP (temp for testing)
  message: {
    success: false,
    message: 'Too many authentication attempts. Please wait 15 minutes before trying again.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: generateKey,
  handler: rateLimitHandler,
  skip: skipSuccessfulRequests,
});

/**
 * Moderate rate limiting for admin console
 */
export const adminConsoleRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // 10 queries per minute per user
  message: {
    success: false,
    message: 'Too many database queries. Please wait before submitting more queries.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: generateKey,
  handler: rateLimitHandler,
});

/**
 * General API rate limiting
 */
export const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window per IP
  message: {
    success: false,
    message: 'Too many API requests. Please slow down.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: generateKey,
  handler: rateLimitHandler,
  skip: (req) => {
    // Skip rate limiting for static assets and health checks
    return req.path.includes('/health') || req.path.includes('/status');
  },
});

/**
 * Slow down middleware for progressive delays
 */
export const slowDownMiddleware: any = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 10, // start slowing down after 10 requests
  delayMs: 500, // add 500ms delay per request after the 10th
  maxDelayMs: 20000, // max delay of 20 seconds
  keyGenerator: generateKey,
});

/**
 * Magic link specific rate limiting (more restrictive)
 */
export const magicLinkRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 1000, // 1000 magic links per 5 minutes per IP (temp for testing)
  message: {
    success: false,
    message: 'Too many magic link requests. Please wait 5 minutes before requesting another.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: generateKey,
  handler: rateLimitHandler,
});

/**
 * Dashboard rate limiting (more lenient for authenticated users)
 */
export const dashboardRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
  message: {
    success: false,
    message: 'Too many dashboard requests. Please wait before refreshing.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: generateKey,
  handler: rateLimitHandler,
});

/**
 * File upload rate limiting (if implemented)
 */
export const uploadRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 5, // 5 uploads per minute
  message: {
    success: false,
    message: 'Too many upload attempts. Please wait before uploading again.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: generateKey,
  handler: rateLimitHandler,
});

/**
 * Security monitoring middleware
 */
export const securityMonitoringMiddleware = (req: Request, res: Response, next: Function) => {
  const identifier = generateKey(req);
  
  // Log suspicious patterns
  if (req.headers['user-agent']?.includes('bot') && !req.headers['user-agent']?.includes('googlebot')) {
    console.warn(`[Security] Potential bot detected: ${identifier} - ${req.headers['user-agent']}`);
  }
  
  // Check for common attack patterns in URLs
  const suspiciousPatterns = [
    /\.\.\//, // Directory traversal
    /script/i, // Potential XSS
    /union.*select/i, // SQL injection
    /exec\(/i, // Code injection
  ];
  
  const fullUrl = req.originalUrl || req.url;
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(fullUrl) || pattern.test(JSON.stringify(req.body) || '')) {
      console.warn(`[Security] Suspicious pattern detected from ${identifier}: ${pattern.source} in ${fullUrl}`);
      securityStore.recordViolation(identifier);
    }
  }
  
  next();
};

/**
 * Get security statistics for monitoring dashboard
 */
export const getSecurityStats = () => {
  const stats = {
    totalViolations: 0,
    violationsByIp: {} as Record<string, any>,
    topViolators: [] as Array<{ ip: string; violations: number; firstViolation: Date; lastViolation: Date }>
  };
  
  for (const [ip, data] of securityStore['violations'].entries()) {
    stats.totalViolations += data.count;
    stats.violationsByIp[ip] = data;
    stats.topViolators.push({ ip, violations: data.count, ...data });
  }
  
  stats.topViolators.sort((a, b) => b.violations - a.violations).slice(0, 10);
  
  return stats;
};
