import express from 'express';
import { newAuthService as authService } from '../services/authService.new';
import { LoginRequest, VerifyTokenRequest } from '../types/auth';
import { ApiResponse } from '../types/api';
import { authRateLimit, magicLinkRateLimit, slowDownMiddleware } from '../middleware/rateLimiting';
import { validateAuthRequest } from '../middleware/inputValidation';

const router = express.Router();

// POST /api/auth/request-login
router.post('/request-login', validateAuthRequest, async (req, res) => {
  try {
    const { email, type = 'magic-link' }: LoginRequest = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      } as ApiResponse);
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address',
      } as ApiResponse);
    }

    // Extract IP address and user agent for security tracking
    const ipAddress = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] as string;
    const userAgent = req.headers['user-agent'];

    const result = await authService.requestLogin({ email, type }, ipAddress, userAgent);

    if (!result.success) {
      return res.status(400).json(result as ApiResponse);
    }
    res.json(result as ApiResponse);
  } catch (error) {
    console.error('Request login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    } as ApiResponse);
  }
});

// POST /api/auth/verify-token
router.post('/verify-token', validateAuthRequest, async (req, res) => {
  try {
    const { email, token }: VerifyTokenRequest = req.body;

    if (!email || !token) {
      return res.status(400).json({
        success: false,
        message: 'Email and token are required',
      } as ApiResponse);
    }

    // Extract IP address and user agent for security tracking
    const ipAddress = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] as string;
    const userAgent = req.headers['user-agent'];

    const result = await authService.verifyToken({ email, token }, ipAddress, userAgent);

    if (!result.success) {
      return res.status(400).json(result as ApiResponse);
    }
    res.json(result as ApiResponse);
  } catch (error) {
    console.error('Verify token error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    } as ApiResponse);
  }
});

export default router;
