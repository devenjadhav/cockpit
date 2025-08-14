/**
 * Security Headers Middleware
 * Implements comprehensive security headers for production deployment
 */

import helmet from 'helmet';
import { Request, Response, NextFunction } from 'express';

/**
 * Production-ready security headers configuration
 */
export const securityHeaders = helmet({
  // Content Security Policy - prevents XSS attacks
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: [
        "'self'", 
        "'unsafe-inline'", // Required for Tailwind CSS and inline styles
        "https://fonts.googleapis.com"
      ],
      fontSrc: [
        "'self'",
        "https://fonts.gstatic.com"
      ],
      scriptSrc: [
        "'self'",
        // Add hashes for any inline scripts if needed
        "'unsafe-eval'" // Remove in production if not needed
      ],
      imgSrc: [
        "'self'",
        "data:", // For base64 images
        "https:", // For external images
      ],
      connectSrc: [
        "'self'",
        "https://api.airtable.com", // Airtable API
        "https://loops.so", // Loops email service
        "https://api.anthropic.com", // Claude API
        process.env.NODE_ENV === 'development' ? 'http://localhost:*' : "'self'"
      ],
      frameSrc: ["'none'"], // Prevent embedding in frames
      objectSrc: ["'none'"], // Disable object/embed tags
      ...(process.env.NODE_ENV === 'production' ? { upgradeInsecureRequests: [] } : {}),
    },
  },

  // HTTP Strict Transport Security
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },

  // Prevent MIME type sniffing
  noSniff: true,

  // Prevent clickjacking
  frameguard: { action: 'deny' },

  // Hide X-Powered-By header
  hidePoweredBy: true,

  // Prevent XSS attacks
  xssFilter: true,

  // Referrer Policy
  referrerPolicy: { policy: "strict-origin-when-cross-origin" }
});

/**
 * Custom security headers for API responses
 */
export const apiSecurityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Prevent caching of sensitive API responses
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');

  // Additional security headers for API
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // CORS headers for API (supplementary to main CORS middleware)
  res.setHeader('Vary', 'Origin, Access-Control-Request-Method, Access-Control-Request-Headers');
  
  // Security information for debugging (remove in production)
  if (process.env.NODE_ENV === 'development') {
    res.setHeader('X-Security-Headers', 'enabled');
  }

  next();
};

/**
 * Enhanced CORS configuration for production
 */
export const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) {
      return callback(null, true);
    }

    // Check for Vercel domains (handles preview deployments)
    if (origin.includes('vercel.app') || origin.includes('daydream-portal')) {
      return callback(null, true);
    }

    // Production origins
    const allowedOrigins = [
      'https://your-custom-domain.com', // If you add a custom domain
      'https://cockpit.hackclub.dev',
    ];

    // Development origins
    if (process.env.NODE_ENV === 'development') {
      allowedOrigins.push(
        'http://localhost:3000',
        'http://localhost:3001',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3001'
      );
    }

    // Check if origin is allowed
    if (allowedOrigins.some(allowedOrigin => {
      if (allowedOrigin.includes('*')) {
        // Handle wildcard domains
        const pattern = allowedOrigin.replace(/\*/g, '.*');
        return new RegExp(`^${pattern}$`).test(origin);
      }
      return allowedOrigin === origin;
    })) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Blocked request from unauthorized origin: ${origin}`);
      callback(new Error('Not allowed by CORS policy'), false);
    }
  },
  
  credentials: true,
  optionsSuccessStatus: 200, // For legacy browser support
  
  // Allowed methods
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
  
  // Allowed headers
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Cache-Control',
    'X-Access-Token'
  ],
  
  // Exposed headers (what the client can access)
  exposedHeaders: [
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
    'Content-Length',
    'Date'
  ],

  // Preflight cache time
  maxAge: 86400, // 24 hours
};

/**
 * Security audit middleware - logs security-related events
 */
export const securityAuditMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const securityEvents: string[] = [];

  // Check for suspicious headers
  const suspiciousHeaders = [
    'x-forwarded-host',
    'x-original-url',
    'x-rewrite-url'
  ];

  for (const header of suspiciousHeaders) {
    if (req.headers[header]) {
      securityEvents.push(`Suspicious header: ${header}=${req.headers[header]}`);
    }
  }

  // Check for admin access from non-admin routes
  if (req.path.includes('/admin') && !req.headers.authorization) {
    securityEvents.push('Unauthenticated admin access attempt');
  }

  // Check for unusual user agents
  const userAgent = req.headers['user-agent'] || '';
  if (userAgent.length === 0 || userAgent.length > 500) {
    securityEvents.push(`Unusual user agent: ${userAgent.substring(0, 100)}`);
  }

  // Log security events
  if (securityEvents.length > 0) {
    console.warn(`[Security Audit] ${req.ip} - ${req.method} ${req.path} - ${securityEvents.join(', ')}`);
  }

  next();
};

/**
 * Request timeout middleware to prevent slow loris attacks
 */
export const requestTimeoutMiddleware = (timeoutMs: number = 30000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Set timeout for the request
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        console.warn(`[Security] Request timeout from ${req.ip} - ${req.method} ${req.path}`);
        res.status(408).json({
          success: false,
          message: 'Request timeout'
        });
      }
    }, timeoutMs);

    // Clear timeout when response is finished
    res.on('finish', () => {
      clearTimeout(timeout);
    });

    next();
  };
};
