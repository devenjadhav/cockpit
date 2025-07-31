import { TokenGenerator } from '../utils/tokenGenerator';
import { JWTUtils } from '../utils/jwt';
import { tokenStore } from './tokenStore';
import { loopsService } from './loopsService';
import { airtableService } from './airtableService';
import { AuthResponse, LoginRequest, VerifyTokenRequest } from '../types/auth';

export class NewAuthService {
  async requestLogin(data: LoginRequest, ipAddress?: string, userAgent?: string): Promise<AuthResponse> {
    try {
      const email = data.email.toLowerCase();
      
      // Check if email has access (exists in either events or admin table)
      const accessCheck = await airtableService.checkEmailAccess(email);
      
      if (!accessCheck.hasAccess) {
        return {
          success: false,
          message: 'Email not found. Please contact support if you believe this is an error.',
        };
      }

      // Generate token
      const token = TokenGenerator.generateMagicLinkToken();
      
      // Store token
      tokenStore.storeToken(email, token, 'magic-link');

      // Create magic link URL
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const loginUrl = `${baseUrl}/auth/verify?token=${token}&email=${encodeURIComponent(email)}`;

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

      // Log successful magic link generation
      console.log(`[New Auth] Magic link generated for ${email} from IP ${ipAddress} (Admin: ${accessCheck.isAdmin})`);

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
      
      // Verify token exists and is valid
      const isValidToken = tokenStore.verifyToken(email, data.token);
      
      if (!isValidToken) {
        console.log(`[New Auth] Invalid token for ${email}`);
        return {
          success: false,
          message: 'Invalid or expired token. Please request a new login link.',
        };
      }

      // Re-check email access and admin status (in case it changed)
      const accessCheck = await airtableService.checkEmailAccess(email);
      
      if (!accessCheck.hasAccess) {
        return {
          success: false,
          message: 'Access denied. Please contact support.',
        };
      }

      // Generate JWT with admin status
      const jwt = JWTUtils.generateToken(email, ipAddress, accessCheck.isAdmin);

      // Log successful login
      console.log(`[New Auth] Successful login for ${email} from IP ${ipAddress} (Admin: ${accessCheck.isAdmin})`);

      return {
        success: true,
        jwt,
        message: 'Login successful.',
        isAdmin: accessCheck.isAdmin,
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

export const newAuthService = new NewAuthService();
