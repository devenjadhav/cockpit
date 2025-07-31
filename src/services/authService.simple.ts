import { TokenGenerator } from '../utils/tokenGenerator';
import { JWTUtils } from '../utils/jwt';
import { tokenStore } from './tokenStore';
import { loopsService } from './loopsService';
import { airtableService } from './airtableService';
import { AuthResponse, LoginRequest, VerifyTokenRequest } from '../types/auth';

export class SimpleAuthService {
  async requestLogin(data: LoginRequest, ipAddress?: string, userAgent?: string): Promise<AuthResponse> {
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

      // Generate simple token
      const token = TokenGenerator.generateMagicLinkToken();
      
      // Store token
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

      console.log(`[Simple Auth] Magic link generated for ${data.email}`);

      return {
        success: true,
        message: 'Magic link sent to your email. Please check your inbox and click the link within 15 minutes.',
      };
    } catch (error) {
      console.error('Login request error:', error);
      return {
        success: false,
        message: 'An error occurred. Please try again.',
      };
    }
  }

  async verifyToken(data: VerifyTokenRequest, ipAddress?: string, userAgent?: string): Promise<AuthResponse> {
    try {
      const email = data.email.toLowerCase();
      
      // Simple token verification
      const isValidToken = tokenStore.verifyToken(email, data.token);
      
      if (!isValidToken) {
        console.log(`[Simple Auth] Invalid token for ${email}`);
        return {
          success: false,
          message: 'Invalid or expired token. Please request a new login link.',
        };
      }

      // Generate JWT
      const jwt = JWTUtils.legacyGenerateToken(email);

      console.log(`[Simple Auth] Successful login for ${email}`);

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

export const simpleAuthService = new SimpleAuthService();
