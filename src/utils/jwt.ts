import jwt from 'jsonwebtoken';
import { JWTPayload } from '../types/auth';
import { JwtSecurityManager, TokenValidationResult } from '../security/jwtSecurity';

export class JWTUtils {
  private static getSecret(): string {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET must be set in environment variables');
    }
    return process.env.JWT_SECRET;
  }

  private static getExpiresIn(): string {
    return process.env.JWT_EXPIRES_IN || '24h';
  }

  /**
   * Generate a secure JWT token using enhanced security manager
   */
  static generateToken(email: string, ipAddress?: string): string {
    return JwtSecurityManager.generateToken(email, ipAddress);
  }

  /**
   * Verify JWT token with enhanced security validation
   */
  static verifyToken(token: string, ipAddress?: string): { payload: JWTPayload | null; validationResult: TokenValidationResult } {
    const validationResult = JwtSecurityManager.validateToken(token, ipAddress);
    
    return {
      payload: validationResult.payload || null,
      validationResult
    };
  }

  /**
   * Legacy method for backward compatibility - use verifyToken instead
   * @deprecated Use verifyToken for enhanced security
   */
  static legacyVerifyToken(token: string): JWTPayload | null {
    try {
      const decoded = jwt.verify(token, this.getSecret()) as JWTPayload;
      return decoded;
    } catch (error) {
      console.error('JWT verification error:', error);
      return null;
    }
  }

  static decodeToken(token: string): JWTPayload | null {
    try {
      const decoded = jwt.decode(token) as JWTPayload;
      return decoded;
    } catch (error) {
      console.error('JWT decode error:', error);
      return null;
    }
  }

  /**
   * Revoke a token by its ID
   */
  static revokeToken(jti: string): void {
    JwtSecurityManager.revokeToken(jti);
  }

  /**
   * Revoke all tokens for a user
   */
  static revokeAllUserTokens(email: string): number {
    return JwtSecurityManager.revokeAllUserTokens(email);
  }

  /**
   * Get token statistics for monitoring
   */
  static getTokenStats() {
    return JwtSecurityManager.getTokenStats();
  }

  /**
   * Validate JWT secret configuration
   */
  static validateConfiguration() {
    return JwtSecurityManager.validateJwtSecret();
  }
}
