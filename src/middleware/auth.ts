import { Request, Response, NextFunction } from 'express';
import { JWTUtils } from '../utils/jwt';
import { AuthenticatedRequest } from '../types/auth';

export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access token required',
    });
  }

  // Extract IP address for security validation
  const ipAddress = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] as string;
  
  const { payload, validationResult } = JWTUtils.verifyToken(token, ipAddress);
  
  if (!validationResult.isValid || !payload) {
    // Log security violations for monitoring
    if (validationResult.securityViolations.length > 0) {
      console.warn(`[Auth Security] Token validation failed from ${ipAddress}: ${validationResult.securityViolations.join(', ')}`);
    }
    
    const message = validationResult.errors.length > 0 
      ? validationResult.errors[0] 
      : 'Invalid or expired token';
    
    return res.status(403).json({
      success: false,
      message,
    });
  }

  req.user = {
    email: payload.email,
  };

  next();
};

export const optionalAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    const ipAddress = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] as string;
    const { payload, validationResult } = JWTUtils.verifyToken(token, ipAddress);
    
    if (validationResult.isValid && payload) {
      req.user = {
        email: payload.email,
      };
    } else if (validationResult.securityViolations.length > 0) {
      // Log security violations but don't block request for optional auth
      console.warn(`[Auth Security] Optional auth validation failed from ${ipAddress}: ${validationResult.securityViolations.join(', ')}`);
    }
  }

  next();
};
