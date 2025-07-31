import express from 'express';
import { adminAuth } from '../middleware/adminAuth';
import { claudeService } from '../services/claudeService';
import { ApiResponse } from '../types/api';

interface AuthenticatedRequest extends express.Request {
  user?: { email: string };
}

const router = express.Router();

interface ConsoleQueryRequest {
  query: string;
}

interface ConsoleQueryResponse {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
  timestamp: string;
}

// POST /api/admin-console/query
router.post('/query', adminAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { query }: ConsoleQueryRequest = req.body;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Query is required and must be a non-empty string',
        error: 'Invalid query parameter'
      } as ApiResponse<null>);
    }

    // Sanitize and validate query length
    const sanitizedQuery = query.trim();
    if (sanitizedQuery.length > 500) {
      return res.status(400).json({
        success: false,
        message: 'Query is too long. Maximum 500 characters allowed.',
        error: 'Query too long'
      } as ApiResponse<null>);
    }

    // Log the query for audit purposes
    console.log(`[Admin Console] Query by ${req.user?.email}: ${sanitizedQuery}`);

    // Process the query with Claude service
    const result = await claudeService.processQuery(sanitizedQuery);

    const response: ConsoleQueryResponse = {
      ...result,
      timestamp: new Date().toISOString()
    };

    // Return success regardless of query result (Claude service handles its own errors)
    res.json({
      success: true,
      data: response,
      message: 'Query processed successfully'
    } as ApiResponse<ConsoleQueryResponse>);

  } catch (error: any) {
    console.error('Admin console API error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while processing console query',
      error: error.message
    } as ApiResponse<null>);
  }
});

// GET /api/admin-console/status
router.get('/status', adminAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const isConfigured = !!process.env.ANTHROPIC_API_KEY;
    
    res.json({
      success: true,
      data: {
        claudeConfigured: isConfigured,
        status: isConfigured ? 'ready' : 'not_configured',
        message: isConfigured 
          ? 'Admin console is ready for queries' 
          : 'Claude API key not configured'
      },
      message: 'Console status retrieved successfully'
    } as ApiResponse<{
      claudeConfigured: boolean;
      status: string;
      message: string;
    }>);

  } catch (error: any) {
    console.error('Admin console status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check console status',
      error: error.message
    } as ApiResponse<null>);
  }
});

export default router;
