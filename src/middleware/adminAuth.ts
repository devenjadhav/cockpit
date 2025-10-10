/**
 * DEPRECATED: This middleware is replaced by the combination of:
 * - authenticateToken (from './auth.ts') - verifies Clerk token
 * - requireAdmin (from './adminOnly.ts') - checks admin role
 * 
 * This file is kept for backwards compatibility but should not be used.
 * Use: router.get('/path', authenticateToken, requireAdmin, handler)
 */

import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/auth';

/**
 * @deprecated Use authenticateToken + requireAdmin instead
 */
export const adminAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  console.warn('[DEPRECATED] adminAuth middleware is deprecated. Use authenticateToken + requireAdmin instead.');
  
  // Check if user was already authenticated by the new Clerk middleware
  if (req.user && req.user.isAdmin) {
    return next();
  }
  
  return res.status(403).json({ 
    success: false,
    message: 'Admin privileges required' 
  });
};
