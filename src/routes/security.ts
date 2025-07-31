/**
 * Security Monitoring Dashboard API
 * Provides security statistics and alerts for administrators
 */

import express from 'express';
import { adminAuth } from '../middleware/adminAuth';
import { getSecurityStats } from '../middleware/rateLimiting';
import { JWTUtils } from '../utils/jwt';
import { MagicLinkManager } from '../security/magicLinkManager';
import { ApiResponse } from '../types/api';
import { adminConsoleRateLimit } from '../middleware/rateLimiting';

const router = express.Router();

interface AuthenticatedRequest extends express.Request {
  user?: { email: string };
}

// Apply admin authentication and rate limiting to all routes
router.use(adminConsoleRateLimit);
router.use(adminAuth);

/**
 * GET /api/security/stats - Get comprehensive security statistics
 */
router.get('/stats', async (req: AuthenticatedRequest, res) => {
  try {
    // Rate limiting statistics
    const rateLimitStats = getSecurityStats();
    
    // JWT token statistics
    const jwtStats = JWTUtils.getTokenStats();
    
    // Magic link statistics
    const magicLinkStats = MagicLinkManager.getStats();
    
    // JWT configuration validation
    const jwtConfig = JWTUtils.validateConfiguration();
    
    const securityStats = {
      timestamp: new Date().toISOString(),
      rateLimiting: {
        totalViolations: rateLimitStats.totalViolations,
        uniqueViolators: Object.keys(rateLimitStats.violationsByIp).length,
        topViolators: rateLimitStats.topViolators.slice(0, 5)
      },
      authentication: {
        activeTokens: jwtStats.activeTokens,
        blacklistedTokens: jwtStats.blacklistedTokens,
        totalTokenUsage: jwtStats.totalUsage,
        averageUsagePerToken: Math.round(jwtStats.averageUsagePerToken * 100) / 100,
        jwtSecurityStatus: jwtConfig.isSecure ? 'secure' : 'needs_attention',
        jwtWarnings: jwtConfig.warnings
      },
      magicLinks: {
        activeLinks: magicLinkStats.totalActiveLinks,
        attemptTrackers: magicLinkStats.totalAttemptTrackers,
        linksByEmail: Object.keys(magicLinkStats.linksByEmail).length
      },
      system: {
        nodeEnv: process.env.NODE_ENV || 'development',
        uptime: Math.floor(process.uptime()),
        memoryUsage: {
          rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
          heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
        }
      }
    };

    console.log(`[Security Dashboard] Stats accessed by ${req.user?.email}`);

    res.json({
      success: true,
      data: securityStats,
      message: 'Security statistics retrieved successfully'
    } as ApiResponse<typeof securityStats>);

  } catch (error: any) {
    console.error('Security stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve security statistics',
      error: error.message
    } as ApiResponse<null>);
  }
});

/**
 * GET /api/security/violations - Get recent security violations
 */
router.get('/violations', async (req: AuthenticatedRequest, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    // This is a simplified implementation - in production, store violations in database
    const rateLimitStats = getSecurityStats();
    
    const violations = Object.entries(rateLimitStats.violationsByIp)
      .map(([ip, data]) => ({
        type: 'rate_limit',
        ip,
        violationCount: data.count,
        firstViolation: data.firstViolation,
        lastViolation: data.lastViolation
      }))
      .sort((a, b) => new Date(b.lastViolation).getTime() - new Date(a.lastViolation).getTime())
      .slice(offset, offset + limit);

    console.log(`[Security Dashboard] Violations accessed by ${req.user?.email}`);

    res.json({
      success: true,
      data: {
        violations,
        pagination: {
          limit,
          offset,
          total: Object.keys(rateLimitStats.violationsByIp).length
        }
      },
      message: 'Security violations retrieved successfully'
    } as ApiResponse<any>);

  } catch (error: any) {
    console.error('Security violations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve security violations',
      error: error.message
    } as ApiResponse<null>);
  }
});

/**
 * POST /api/security/revoke-token - Revoke a specific JWT token
 */
router.post('/revoke-token', async (req: AuthenticatedRequest, res) => {
  try {
    const { jti } = req.body;

    if (!jti || typeof jti !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Token ID (jti) is required'
      } as ApiResponse<null>);
    }

    JWTUtils.revokeToken(jti);

    console.log(`[Security Action] Token ${jti} revoked by ${req.user?.email}`);

    res.json({
      success: true,
      message: 'Token revoked successfully'
    } as ApiResponse<null>);

  } catch (error: any) {
    console.error('Token revocation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to revoke token',
      error: error.message
    } as ApiResponse<null>);
  }
});

/**
 * POST /api/security/revoke-user-tokens - Revoke all tokens for a user
 */
router.post('/revoke-user-tokens', async (req: AuthenticatedRequest, res) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      } as ApiResponse<null>);
    }

    const revokedCount = JWTUtils.revokeAllUserTokens(email);

    console.log(`[Security Action] ${revokedCount} tokens revoked for ${email} by ${req.user?.email}`);

    res.json({
      success: true,
      data: { revokedCount },
      message: `${revokedCount} tokens revoked successfully`
    } as ApiResponse<{ revokedCount: number }>);

  } catch (error: any) {
    console.error('User token revocation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to revoke user tokens',
      error: error.message
    } as ApiResponse<null>);
  }
});

/**
 * POST /api/security/revoke-magic-links - Revoke all magic links for a user
 */
router.post('/revoke-magic-links', async (req: AuthenticatedRequest, res) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      } as ApiResponse<null>);
    }

    const revokedCount = MagicLinkManager.revokeAllLinksForEmail(email);

    console.log(`[Security Action] ${revokedCount} magic links revoked for ${email} by ${req.user?.email}`);

    res.json({
      success: true,
      data: { revokedCount },
      message: `${revokedCount} magic links revoked successfully`
    } as ApiResponse<{ revokedCount: number }>);

  } catch (error: any) {
    console.error('Magic link revocation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to revoke magic links',
      error: error.message
    } as ApiResponse<null>);
  }
});

/**
 * GET /api/security/health - Security health check
 */
router.get('/health', async (req: AuthenticatedRequest, res) => {
  try {
    const jwtConfig = JWTUtils.validateConfiguration();
    
    const healthChecks = {
      jwtConfiguration: {
        status: jwtConfig.isSecure ? 'healthy' : 'warning',
        issues: jwtConfig.warnings
      },
      environment: {
        status: process.env.NODE_ENV === 'production' ? 'healthy' : 'info',
        message: `Running in ${process.env.NODE_ENV || 'development'} mode`
      },
      apiKeys: {
        anthropic: !!process.env.ANTHROPIC_API_KEY,
        airtable: !!process.env.AIRTABLE_API_KEY,
        loops: !!process.env.LOOPS_API_KEY
      }
    };

    const overallStatus = Object.values(healthChecks).every(check => 
      typeof check === 'object' && 'status' in check ? check.status === 'healthy' : true
    ) ? 'healthy' : 'warning';

    res.json({
      success: true,
      data: {
        status: overallStatus,
        checks: healthChecks,
        timestamp: new Date().toISOString()
      },
      message: 'Security health check completed'
    } as ApiResponse<any>);

  } catch (error: any) {
    console.error('Security health check error:', error);
    res.status(500).json({
      success: false,
      message: 'Security health check failed',
      error: error.message
    } as ApiResponse<null>);
  }
});

export default router;
