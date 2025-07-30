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

  const payload = JWTUtils.verifyToken(token);
  
  if (!payload) {
    return res.status(403).json({
      success: false,
      message: 'Invalid or expired token',
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
    const payload = JWTUtils.verifyToken(token);
    if (payload) {
      req.user = {
        email: payload.email,
      };
    }
  }

  next();
};
