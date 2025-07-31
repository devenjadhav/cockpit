/**
 * Secure Error Handling Middleware
 * Prevents information disclosure while maintaining helpful error messages
 */

import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../types/api';

export interface SecurityError extends Error {
  statusCode?: number;
  securityViolation?: boolean;
  sensitiveData?: any;
}

/**
 * Global error handling middleware
 */
export const globalErrorHandler = (
  error: SecurityError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';

  // Log the full error for internal monitoring
  console.error(`[Error] ${req.method} ${req.path} from ${ipAddress}:`, {
    message: error.message,
    stack: isDevelopment ? error.stack : 'Hidden in production',
    statusCode: error.statusCode,
    securityViolation: error.securityViolation,
    timestamp: new Date().toISOString(),
    userAgent: req.headers['user-agent'],
    body: req.method === 'POST' ? sanitizeRequestBody(req.body) : undefined
  });

  // Determine response status code
  const statusCode = error.statusCode || 500;

  // Create safe error response
  const errorResponse: ApiResponse<null> = {
    success: false,
    message: getSafeErrorMessage(error, statusCode, isDevelopment),
    error: isDevelopment ? error.message : undefined
  };

  // Additional security logging for violations
  if (error.securityViolation) {
    console.warn(`[Security Violation] ${error.message} from ${ipAddress}`);
  }

  // Set appropriate headers
  res.status(statusCode);
  res.setHeader('Content-Type', 'application/json');

  // Send response
  res.json(errorResponse);
};

/**
 * Async error wrapper for route handlers
 */
export const asyncErrorHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Get a safe error message that doesn't leak sensitive information
 */
function getSafeErrorMessage(error: SecurityError, statusCode: number, isDevelopment: boolean): string {
  // Security violations get generic messages
  if (error.securityViolation) {
    return 'Security policy violation';
  }

  // Known safe error messages
  const safeMessages: Record<number, string> = {
    400: 'Bad request',
    401: 'Authentication required',
    403: 'Access denied',
    404: 'Resource not found',
    429: 'Too many requests',
    500: 'Internal server error',
    502: 'Service temporarily unavailable',
    503: 'Service temporarily unavailable'
  };

  // In development, show more details
  if (isDevelopment) {
    return error.message || safeMessages[statusCode] || 'An error occurred';
  }

  // In production, use safe messages
  return safeMessages[statusCode] || 'An error occurred';
}

/**
 * Sanitize request body for logging (remove sensitive data)
 */
function sanitizeRequestBody(body: any): any {
  if (!body || typeof body !== 'object') {
    return body;
  }

  const sensitiveFields = [
    'password', 'token', 'secret', 'key', 'auth', 'authorization',
    'apikey', 'api_key', 'creditcard', 'ssn', 'social_security'
  ];

  const sanitized = { ...body };

  function sanitizeObject(obj: any, depth = 0): any {
    if (depth > 5) return '[Max depth reached]';

    if (Array.isArray(obj)) {
      return obj.slice(0, 10).map(item => sanitizeObject(item, depth + 1));
    }

    if (obj && typeof obj === 'object') {
      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        const lowerKey = key.toLowerCase();
        
        if (sensitiveFields.some(field => lowerKey.includes(field))) {
          result[key] = '[REDACTED]';
        } else if (typeof value === 'string' && value.length > 1000) {
          result[key] = '[Large string truncated]';
        } else {
          result[key] = sanitizeObject(value, depth + 1);
        }
      }
      return result;
    }

    return obj;
  }

  return sanitizeObject(sanitized);
}

/**
 * 404 handler for undefined routes
 */
export const notFoundHandler = (req: Request, res: Response) => {
  const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
  
  console.warn(`[404] ${req.method} ${req.path} from ${ipAddress}`);

  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  } as ApiResponse<null>);
};

/**
 * Security-specific error classes
 */
export class SecurityViolationError extends Error implements SecurityError {
  statusCode = 403;
  securityViolation = true;

  constructor(message: string, public sensitiveData?: any) {
    super(message);
    this.name = 'SecurityViolationError';
  }
}

export class RateLimitError extends Error implements SecurityError {
  statusCode = 429;
  securityViolation = true;

  constructor(message: string = 'Rate limit exceeded') {
    super(message);
    this.name = 'RateLimitError';
  }
}

export class ValidationError extends Error implements SecurityError {
  statusCode = 400;

  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends Error implements SecurityError {
  statusCode = 401;

  constructor(message: string = 'Authentication required') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error implements SecurityError {
  statusCode = 403;

  constructor(message: string = 'Access denied') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

/**
 * Uncaught exception handler
 */
export const uncaughtExceptionHandler = (error: Error) => {
  console.error('[Uncaught Exception]', {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString()
  });

  // In production, you might want to restart the process
  if (process.env.NODE_ENV === 'production') {
    console.error('Uncaught exception in production - process will exit');
    process.exit(1);
  }
};

/**
 * Unhandled rejection handler
 */
export const unhandledRejectionHandler = (reason: any, promise: Promise<any>) => {
  console.error('[Unhandled Rejection]', {
    reason: reason?.message || reason,
    stack: reason?.stack,
    timestamp: new Date().toISOString()
  });

  // In production, you might want to restart the process
  if (process.env.NODE_ENV === 'production') {
    console.error('Unhandled rejection in production - process will exit');
    process.exit(1);
  }
};

/**
 * Database error handler
 */
export const handleDatabaseError = (error: any): SecurityError => {
  // Never expose database connection strings or internal errors
  console.error('[Database Error]', {
    code: error.code,
    message: error.message,
    timestamp: new Date().toISOString()
  });

  const dbError = new Error('Database operation failed') as SecurityError;
  dbError.statusCode = 500;
  
  return dbError;
};

/**
 * External API error handler
 */
export const handleExternalApiError = (service: string, error: any): SecurityError => {
  console.error(`[External API Error - ${service}]`, {
    status: error.response?.status,
    message: error.message,
    timestamp: new Date().toISOString()
  });

  const apiError = new Error(`${service} service temporarily unavailable`) as SecurityError;
  apiError.statusCode = 502;
  
  return apiError;
};
