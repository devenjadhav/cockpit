import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { airtableService } from '../services/airtableService';

interface AuthenticatedRequest extends Request {
  user?: { email: string };
}

export const adminAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET not configured');
    }

    // Verify the JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as { email: string };
    
    // Check if the user is an admin
    const isAdmin = await airtableService.isAdmin(decoded.email);
    
    if (!isAdmin) {
      console.log('Admin auth failed: User is not an admin');
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }

    req.user = decoded;
    next();
  } catch (error) {
    console.error('Admin auth error:', error);
    return res.status(401).json({ message: 'Invalid token.' });
  }
};
