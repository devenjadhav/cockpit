import { TokenGenerator } from '../utils/tokenGenerator';
import { JWTUtils } from '../utils/jwt';
import { tokenStore } from './tokenStore';
import { loopsService } from './loopsService';
import { airtableService } from './airtableService';
import { AuthResponse, LoginRequest, VerifyTokenRequest } from '../types/auth';
import { MagicLinkManager } from '../security/magicLinkManager';

export class AuthService {
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

      // Generate secure magic link with expiration and rate limiting
      const magicLinkResult = await MagicLinkManager.generateMagicLink(
        data.email.toLowerCase(),
        ipAddress,
        userAgent
      );

      if ('error' in magicLinkResult) {
        return {
          success: false,
          message: magicLinkResult.error,
        };
      }

      // Create magic link URL
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const loginUrl = `${baseUrl}/auth/verify?token=${magicLinkResult.token}&email=${encodeURIComponent(data.email)}`;

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

      // Log successful magic link generation for monitoring
      console.log(`[Auth] Magic link generated for ${data.email} from IP ${ipAddress}, expires at ${magicLinkResult.expires.toISOString()}`);

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
      
      // Verify token using secure magic link manager
      const validationResult = MagicLinkManager.validateMagicLink(
        data.token,
        email,
        ipAddress,
        userAgent
      );
      
      if (!validationResult.isValid) {
        // Log security violations for monitoring
        if (validationResult.securityViolations.length > 0) {
          console.warn(`[Auth Security] Token validation failed for ${email}: ${validationResult.securityViolations.join(', ')}`);
        }
        
        return {
          success: false,
          message: validationResult.errors.length > 0 
            ? validationResult.errors[0] 
            : 'Invalid or expired token. Please request a new login link.',
        };
      }

      // Generate JWT with IP tracking
      const jwt = JWTUtils.generateToken(email, ipAddress);

      // Log successful login for monitoring
      console.log(`[Auth] Successful login for ${email} from IP ${ipAddress}`);

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
