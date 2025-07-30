import express from 'express';
import { DashboardService } from '../services/dashboardService';
import { authenticateToken } from '../middleware/auth';
import { AuthenticatedRequest } from '../types/auth';
import { ApiResponse } from '../types/api';

const router = express.Router();

// Temporary test endpoint without auth - MUST be before auth middleware
router.get('/test', async (req, res) => {
  try {
    console.log('Testing dashboard for dev@hackclub.com');
    const dashboardData = await DashboardService.getDashboardData('dev@hackclub.com');
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

// GET /api/dashboard - overview of all organizer's events
router.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user?.email) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      } as ApiResponse);
    }

    const dashboardData = await DashboardService.getDashboardData(req.user.email);

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

export default router;
