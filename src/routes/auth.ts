import express from 'express';
import { authService } from '../services/authService';
import { LoginRequest, VerifyTokenRequest } from '../types/auth';
import { ApiResponse } from '../types/api';
import { authRateLimit, magicLinkRateLimit, slowDownMiddleware } from '../middleware/rateLimiting';
import { validateAuthRequest } from '../middleware/inputValidation';

const router = express.Router();

// POST /api/auth/request-login
router.post('/request-login', magicLinkRateLimit, slowDownMiddleware, validateAuthRequest, async (req, res) => {
  try {
    console.log('Login request received:', req.body);
    const { email, type = 'magic-link' }: LoginRequest = req.body;

    if (!email) {
      console.log('No email provided');
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      } as ApiResponse);
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log('Invalid email format:', email);
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address',
      } as ApiResponse);
    }

    // Extract IP address and user agent for security tracking
    const ipAddress = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] as string;
    const userAgent = req.headers['user-agent'];

    console.log('Processing login for:', email, 'from IP:', ipAddress);
    const result = await authService.requestLogin({ email, type }, ipAddress, userAgent);
    console.log('Login result:', result);

    if (!result.success) {
      console.log('Login failed:', result.message);
      return res.status(400).json(result as ApiResponse);
    }

    console.log('Login successful for:', email);
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
router.post('/verify-token', authRateLimit, validateAuthRequest, async (req, res) => {
  try {
    console.log('Token verification request received:', req.body);
    const { email, token }: VerifyTokenRequest = req.body;

    if (!email || !token) {
      console.log('Missing email or token in verification request');
      return res.status(400).json({
        success: false,
        message: 'Email and token are required',
      } as ApiResponse);
    }

    // Extract IP address and user agent for security tracking
    const ipAddress = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] as string;
    const userAgent = req.headers['user-agent'];

    console.log('Verifying token for email:', email, 'from IP:', ipAddress);
    const result = await authService.verifyToken({ email, token }, ipAddress, userAgent);
    console.log('Verification result:', result);

    if (!result.success) {
      console.log('Token verification failed:', result.message);
      return res.status(400).json(result as ApiResponse);
    }

    console.log('Token verification successful for:', email);
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
