/**
 * Enhanced JWT Security
 * Provides secure JWT token generation, validation, and management
 */

import jwt from 'jsonwebtoken';
import crypto from 'crypto';

export interface JwtPayload {
  email: string;
  isAdmin: boolean;
  iat: number;
  exp: number;
  jti: string; // JWT ID for revocation
  aud: string; // Audience
  iss: string; // Issuer
}

export interface TokenValidationResult {
  isValid: boolean;
  payload?: JwtPayload;
  errors: string[];
  securityViolations: string[];
}

// Blacklisted tokens (in production, use Redis or database)
const blacklistedTokens: Set<string> = new Set();

// Token usage tracking for anomaly detection
const tokenUsage: Map<string, { lastUsed: Date; useCount: number; ipHistory: string[] }> = new Map();

export class JwtSecurityManager {
  private static readonly JWT_SECRET = process.env.JWT_SECRET;
  private static readonly TOKEN_EXPIRY = '1h'; // 1 hour
  private static readonly REFRESH_TOKEN_EXPIRY = '7d'; // 7 days
  private static readonly ISSUER = 'daydream-portal';
  private static readonly AUDIENCE = 'daydream-users';

  /**
   * Generate a secure JWT token with enhanced security features
   */
  static generateToken(email: string, ipAddress?: string, isAdmin: boolean = false): string {
    if (!this.JWT_SECRET) {
      throw new Error('JWT_SECRET not configured');
    }

    // Generate unique token ID for tracking and revocation
    const jti = crypto.randomBytes(16).toString('hex');
    
    const payload = {
      email: email.toLowerCase(),
      isAdmin,
      jti,
    };

    const options: jwt.SignOptions = {
      expiresIn: this.TOKEN_EXPIRY,
      algorithm: 'HS256',
      issuer: this.ISSUER,
      audience: this.AUDIENCE,
    };

    const token = jwt.sign(payload, this.JWT_SECRET, options);

    // Track token creation
    this.trackTokenUsage(jti, ipAddress);

    console.log(`[JWT] Token generated for ${email} with ID ${jti} (Admin: ${isAdmin})`);
    return token;
  }

  /**
   * Validate JWT token with comprehensive security checks
   */
  static validateToken(token: string, ipAddress?: string): TokenValidationResult {
    const result: TokenValidationResult = {
      isValid: false,
      errors: [],
      securityViolations: []
    };

    if (!token) {
      result.errors.push('Token is required');
      return result;
    }

    if (!this.JWT_SECRET) {
      result.errors.push('JWT configuration error');
      return result;
    }

    try {
      // Basic JWT validation
      const decoded = jwt.verify(token, this.JWT_SECRET, {
        algorithms: ['HS256'],
        issuer: this.ISSUER,
        audience: this.AUDIENCE,
      }) as JwtPayload;

      // Check if token is blacklisted
      if (blacklistedTokens.has(decoded.jti)) {
        result.securityViolations.push('Token has been revoked');
        return result;
      }

      // Check token age (additional validation)
      const tokenAge = Date.now() - (decoded.iat * 1000);
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours max
      if (tokenAge > maxAge) {
        result.securityViolations.push('Token too old');
        return result;
      }

      // Check for suspicious usage patterns
      const suspiciousUsage = this.checkSuspiciousUsage(decoded.jti, ipAddress);
      if (suspiciousUsage.length > 0) {
        result.securityViolations.push(...suspiciousUsage);
        // Don't return here - log but allow access for now
        console.warn(`[JWT Security] Suspicious token usage for ${decoded.email}: ${suspiciousUsage.join(', ')}`);
      }

      // Update token usage tracking
      this.updateTokenUsage(decoded.jti, ipAddress);

      result.isValid = true;
      result.payload = decoded;

    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        result.errors.push('Token has expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        result.securityViolations.push('Invalid token format');
      } else if (error instanceof jwt.NotBeforeError) {
        result.errors.push('Token not active yet');
      } else {
        result.errors.push('Token validation failed');
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.warn(`[JWT Security] Token validation failed: ${errorMessage}`);
    }

    return result;
  }

  /**
   * Revoke a specific token by adding it to blacklist
   */
  static revokeToken(jti: string): void {
    blacklistedTokens.add(jti);
    tokenUsage.delete(jti);
    console.log(`[JWT Security] Token revoked: ${jti}`);
  }

  /**
   * Revoke all tokens for a specific user
   */
  static revokeAllUserTokens(email: string): number {
    let revokedCount = 0;
    
    for (const [jti, usage] of tokenUsage.entries()) {
      // This is a simplified approach - in production, store email in token tracking
      // For now, we'll clear all tracking data and rely on short token expiry
      tokenUsage.delete(jti);
      blacklistedTokens.add(jti);
      revokedCount++;
    }

    console.log(`[JWT Security] Revoked ${revokedCount} tokens for user ${email}`);
    return revokedCount;
  }

  /**
   * Track token usage for anomaly detection
   */
  private static trackTokenUsage(jti: string, ipAddress?: string): void {
    const usage = {
      lastUsed: new Date(),
      useCount: 1,
      ipHistory: ipAddress ? [ipAddress] : []
    };
    
    tokenUsage.set(jti, usage);
  }

  /**
   * Update token usage tracking
   */
  private static updateTokenUsage(jti: string, ipAddress?: string): void {
    const existing = tokenUsage.get(jti);
    
    if (existing) {
      existing.lastUsed = new Date();
      existing.useCount++;
      
      if (ipAddress && !existing.ipHistory.includes(ipAddress)) {
        existing.ipHistory.push(ipAddress);
        
        // Keep only last 5 IP addresses
        if (existing.ipHistory.length > 5) {
          existing.ipHistory.shift();
        }
      }
    } else {
      this.trackTokenUsage(jti, ipAddress);
    }
  }

  /**
   * Check for suspicious token usage patterns
   */
  private static checkSuspiciousUsage(jti: string, ipAddress?: string): string[] {
    const violations: string[] = [];
    const usage = tokenUsage.get(jti);
    
    if (!usage) {
      return violations;
    }

    // Check for excessive usage
    if (usage.useCount > 1000) {
      violations.push('Excessive token usage');
    }

    // Check for IP address hopping
    if (usage.ipHistory.length > 3) {
      violations.push('Multiple IP addresses used');
    }

    // Check for rapid requests (if this usage is very recent)
    const timeSinceLastUse = Date.now() - usage.lastUsed.getTime();
    if (timeSinceLastUse < 100 && usage.useCount > 10) {
      violations.push('Rapid consecutive requests');
    }

    return violations;
  }

  /**
   * Clean up expired token tracking data
   */
  static cleanupExpiredTokens(): number {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours
    let cleanedCount = 0;
    
    for (const [jti, usage] of tokenUsage.entries()) {
      if (usage.lastUsed < cutoff) {
        tokenUsage.delete(jti);
        blacklistedTokens.delete(jti);
        cleanedCount++;
      }
    }
    
    console.log(`[JWT Cleanup] Cleaned up ${cleanedCount} expired token records`);
    return cleanedCount;
  }

  /**
   * Generate a secure refresh token (for future implementation)
   */
  static generateRefreshToken(email: string): string {
    if (!this.JWT_SECRET) {
      throw new Error('JWT_SECRET not configured');
    }

    const jti = crypto.randomBytes(32).toString('hex');
    
    const payload = {
      email: email.toLowerCase(),
      jti,
      type: 'refresh',
      aud: this.AUDIENCE,
      iss: this.ISSUER,
    };

    return jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.REFRESH_TOKEN_EXPIRY,
      algorithm: 'HS256',
    });
  }

  /**
   * Get token statistics for monitoring
   */
  static getTokenStats(): {
    activeTokens: number;
    blacklistedTokens: number;
    totalUsage: number;
    averageUsagePerToken: number;
  } {
    const totalUsage = Array.from(tokenUsage.values())
      .reduce((sum, usage) => sum + usage.useCount, 0);

    return {
      activeTokens: tokenUsage.size,
      blacklistedTokens: blacklistedTokens.size,
      totalUsage,
      averageUsagePerToken: tokenUsage.size > 0 ? totalUsage / tokenUsage.size : 0
    };
  }

  /**
   * Validate JWT secret strength
   */
  static validateJwtSecret(): { isSecure: boolean; warnings: string[] } {
    const warnings: string[] = [];
    
    if (!this.JWT_SECRET) {
      return { isSecure: false, warnings: ['JWT_SECRET not configured'] };
    }

    if (this.JWT_SECRET.length < 32) {
      warnings.push('JWT secret should be at least 32 characters long');
    }

    if (!/[A-Z]/.test(this.JWT_SECRET)) {
      warnings.push('JWT secret should contain uppercase letters');
    }

    if (!/[a-z]/.test(this.JWT_SECRET)) {
      warnings.push('JWT secret should contain lowercase letters');
    }

    if (!/[0-9]/.test(this.JWT_SECRET)) {
      warnings.push('JWT secret should contain numbers');
    }

    if (!/[^A-Za-z0-9]/.test(this.JWT_SECRET)) {
      warnings.push('JWT secret should contain special characters');
    }

    return {
      isSecure: warnings.length === 0,
      warnings
    };
  }
}

// Start periodic cleanup (every hour)
setInterval(() => {
  JwtSecurityManager.cleanupExpiredTokens();
}, 60 * 60 * 1000);
