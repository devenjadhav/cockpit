import express from 'express';
import { airtableService } from '../services/airtableService';
import { adminAuth } from '../middleware/adminAuth';
import { ApiResponse } from '../types/api';
import { Event } from '../types/event';

interface AuthenticatedRequest extends express.Request {
  user?: { email: string };
}

const router = express.Router();

// Get all events (admin only)
router.get('/events', adminAuth, async (req, res) => {
  try {
    const events = await airtableService.getAllEvents();
    
    const response: ApiResponse<Event[]> = {
      success: true,
      data: events
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error fetching all events:', error);
    
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch events'
    };
    
    res.status(500).json(response);
  }
});

// Check admin status
router.get('/status', adminAuth, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user?.email) {
      return res.status(401).json({
        success: false,
        error: 'User email not found'
      });
    }

    const admin = await airtableService.getAdminByEmail(req.user.email);
    
    const response: ApiResponse<{ isAdmin: boolean; admin: any }> = {
      success: true,
      data: {
        isAdmin: true,
        admin
      }
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error checking admin status:', error);
    
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check admin status'
    };
    
    res.status(500).json(response);
  }
});

export default router;
