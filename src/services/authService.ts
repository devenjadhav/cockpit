import { TokenGenerator } from '../utils/tokenGenerator';
import { JWTUtils } from '../utils/jwt';
import { tokenStore } from './tokenStore';
import { loopsService } from './loopsService';
import { airtableService } from './airtableService';
import { AuthResponse, LoginRequest, VerifyTokenRequest } from '../types/auth';

export class AuthService {
  async requestLogin(data: LoginRequest): Promise<AuthResponse> {
    try {
      // Check if email exists in organizer emails
      const organizerEmails = await airtableService.getAllOrganizerEmails();
      const emailExists = organizerEmails.includes(data.email.toLowerCase());

      if (!emailExists) {
        return {
          success: false,
          message: 'Email not found. Please contact support if you believe this is an error.',
        };
      }

      // Generate magic link token
      const token = TokenGenerator.generateMagicLinkToken();
      
      // Store token with 15-minute expiration
      tokenStore.storeToken(data.email.toLowerCase(), token, 'magic-link');

      // Create magic link URL
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const loginUrl = `${baseUrl}/auth/verify?token=${token}&email=${encodeURIComponent(data.email)}`;

      // Send magic link email via Loops
      const emailResult = await loopsService.sendMagicLinkEmail({
        email: data.email,
        loginUrl,
        expirationMinutes: 15,
      });

      if (!emailResult.success) {
        return {
          success: false,
          message: 'Failed to send login email. Please try again.',
        };
      }

      return {
        success: true,
        message: 'Magic link sent to your email. Please check your inbox.',
      };
    } catch (error) {
      console.error('Login request error:', error);
      return {
        success: false,
        message: 'An error occurred. Please try again.',
      };
    }
  }

  async verifyToken(data: VerifyTokenRequest): Promise<AuthResponse> {
    try {
      const email = data.email.toLowerCase();
      
      // Verify token
      const isValid = tokenStore.verifyToken(email, data.token);
      
      if (!isValid) {
        return {
          success: false,
          message: 'Invalid or expired token. Please request a new login link.',
        };
      }

      // Generate JWT
      const jwt = JWTUtils.generateToken(email);

      return {
        success: true,
        jwt,
        message: 'Login successful.',
      };
    } catch (error) {
      console.error('Token verification error:', error);
      return {
        success: false,
        message: 'An error occurred during verification. Please try again.',
      };
    }
  }
}

export const authService = new AuthService();
