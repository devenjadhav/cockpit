import express from 'express';
import { DashboardService } from '../services/dashboardService';
import { authenticateToken } from '../middleware/auth';
import { AuthenticatedRequest } from '../types/auth';
import { ApiResponse } from '../types/api';
import { airtableService } from '../services/airtableService';
import { Event } from '../types/event';
import { dashboardRateLimit } from '../middleware/rateLimiting';

const router = express.Router();

// Apply authentication middleware to all routes
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

    console.log(`[Dashboard Route] User: ${req.user.email}, isAdmin: ${isAdmin}, organizationSlug: ${req.user.organizationSlug}`);

    // All users must have an organization
    if (!req.user.organizationSlug) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You must be part of an organization to access this portal.',
      } as ApiResponse);
    }

    // Extract filter parameters from query
    const triageStatusFilter = req.query.triageStatus as string;

    console.log(`[Dashboard Route] Calling getDashboardData with organizationSlug: ${req.user.organizationSlug}`);

    const dashboardData = await DashboardService.getDashboardData(
      req.user.email, 
      isAdmin, 
      { triageStatus: triageStatusFilter },
      req.user.organizationSlug
    );
    
    console.log(`[Dashboard Route] Returning ${dashboardData.events.length} events`);

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
    
    // All users must have an organization
    if (!req.user.organizationSlug) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You must be part of an organization to access this portal.',
      } as ApiResponse);
    }
    
    // Get events by organization slug for all users
    const events = await airtableService.getEventsByOrganizationSlug(req.user.organizationSlug);

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
