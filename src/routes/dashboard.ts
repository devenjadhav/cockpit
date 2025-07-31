import express from 'express';
import { DashboardService } from '../services/dashboardService';
import { authenticateToken } from '../middleware/auth';
import { AuthenticatedRequest } from '../types/auth';
import { ApiResponse } from '../types/api';
import { airtableService } from '../services/airtableService';
import { Event } from '../types/event';
import { dashboardRateLimit } from '../middleware/rateLimiting';

const router = express.Router();

// Temporary test endpoint without auth - MUST be before auth middleware
router.get('/test', async (req, res) => {
  try {
    console.log('Testing dashboard for dev@hackclub.com');
    const isAdmin = await airtableService.isAdmin('dev@hackclub.com');
    console.log('Testing dashboard with admin status:', isAdmin);
    const dashboardData = await DashboardService.getDashboardData('dev@hackclub.com', isAdmin);
    console.log('Dashboard data retrieved:', JSON.stringify(dashboardData, null, 2));
    res.json({
      success: true,
      data: dashboardData,
    } as ApiResponse);
  } catch (error) {
    console.error('Test dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch test dashboard data',
      error: error instanceof Error ? error.message : 'Unknown error'
    } as ApiResponse);
  }
});

// Apply authentication middleware to all other routes
router.use(authenticateToken);

// GET /api/dashboard - overview of organizer's events (or all events if admin)
router.get('/', dashboardRateLimit, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user?.email) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      } as ApiResponse);
    }

    // Check if user is an admin
    const isAdmin = await airtableService.isAdmin(req.user.email);
    console.log(`Dashboard request from ${req.user.email} - isAdmin: ${isAdmin}`);

    // Extract filter parameters from query
    const triageStatusFilter = req.query.triageStatus as string;
    console.log('Dashboard filter - triageStatus:', triageStatusFilter);

    const dashboardData = await DashboardService.getDashboardData(req.user.email, isAdmin, {
      triageStatus: triageStatusFilter
    });

    res.json({
      success: true,
      data: dashboardData,
    } as ApiResponse);
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard data',
    } as ApiResponse);
  }
});

// GET /api/dashboard/triage-statuses - get available triage status values
router.get('/triage-statuses', async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user?.email) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      } as ApiResponse);
    }

    // Check if user is an admin - only admins can see all triage statuses
    const isAdmin = await airtableService.isAdmin(req.user.email);
    
    let events: Event[];
    if (isAdmin) {
      events = await airtableService.getAllEvents();
    } else {
      events = await airtableService.getEventsByOrganizer(req.user.email);
    }

    // Extract unique triage status values
    const triageStatuses = [...new Set(events.map(event => event.triageStatus).filter(Boolean))];

    res.json({
      success: true,
      data: triageStatuses.sort(),
    } as ApiResponse);
  } catch (error) {
    console.error('Get triage statuses error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch triage statuses',
    } as ApiResponse);
  }
});

export default router;
