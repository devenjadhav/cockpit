import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/auth';

export const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  // First check if user is authenticated
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
  }

  // Check if user has admin privileges
  if (!req.user.isAdmin) {
    return res.status(403).json({
      success: false,
      message: 'Admin privileges required',
    });
  }

  next();
};
