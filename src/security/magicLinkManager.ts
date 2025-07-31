/**
 * Secure Magic Link Manager
 * Handles magic link generation, validation, and one-time use enforcement
 */

import crypto from 'crypto';
import jwt from 'jsonwebtoken';

export interface MagicLinkData {
  email: string;
  token: string;
  expires: Date;
  used: boolean;
  createdAt: Date;
  ipAddress?: string;
  userAgent?: string;
}

export interface MagicLinkValidationResult {
  isValid: boolean;
  email?: string;
  errors: string[];
  securityViolations: string[];
}

export class MagicLinkManager {
  // In production, this should be stored in Redis or database for horizontal scaling
  private static magicLinks: Map<string, MagicLinkData> = new Map();
  
  // Security constants
  private static readonly EXPIRATION_TIME = 15 * 60 * 1000; // 15 minutes
  private static readonly MAX_ATTEMPTS_PER_IP = 5;
  private static readonly MAX_LINKS_PER_EMAIL = 3;
  private static readonly RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
  
  // Track attempts for rate limiting
  private static attemptTracker: Map<string, { count: number; firstAttempt: Date }> = new Map();

  /**
   * Generate a secure magic link with proper expiration and tracking
   */
  static async generateMagicLink(
    email: string, 
    ipAddress?: string, 
    userAgent?: string
  ): Promise<{ token: string; expires: Date } | { error: string }> {
    
    // Rate limiting by email
    const emailAttempts = this.getEmailAttempts(email);
    if (emailAttempts >= this.MAX_LINKS_PER_EMAIL) {
      return { error: 'Too many magic links requested for this email. Please wait before requesting another.' };
    }

    // Rate limiting by IP
    if (ipAddress && this.isIpRateLimited(ipAddress)) {
      return { error: 'Too many requests from this IP address. Please wait before trying again.' };
    }

    // Generate cryptographically secure token
    const token = this.generateSecureToken();
    const expires = new Date(Date.now() + this.EXPIRATION_TIME);

    // Clean up expired links for this email first
    this.cleanupExpiredLinksForEmail(email);

    // Store magic link data
    const magicLinkData: MagicLinkData = {
      email,
      token,
      expires,
      used: false,
      createdAt: new Date(),
      ipAddress,
      userAgent
    };

    this.magicLinks.set(token, magicLinkData);

    // Track attempt for rate limiting
    this.trackAttempt(email, ipAddress);

    // Log security event
    console.log(`[Magic Link] Generated for ${email} from IP ${ipAddress}, expires at ${expires.toISOString()}`);

    return { token, expires };
  }

  /**
   * Validate a magic link with comprehensive security checks
   */
  static validateMagicLink(
    token: string, 
    email: string,
    ipAddress?: string,
    userAgent?: string
  ): MagicLinkValidationResult {
    
    const result: MagicLinkValidationResult = {
      isValid: false,
      errors: [],
      securityViolations: []
    };

    // Basic validation
    if (!token || !email) {
      result.errors.push('Token and email are required');
      return result;
    }

    // Check if token exists
    const magicLinkData = this.magicLinks.get(token);
    if (!magicLinkData) {
      result.securityViolations.push('Invalid or non-existent token');
      console.warn(`[Magic Link Security] Invalid token attempted: ${token.substring(0, 8)}... for email ${email}`);
      return result;
    }

    // Check if token matches email
    if (magicLinkData.email !== email) {
      result.securityViolations.push('Token does not match email');
      console.warn(`[Magic Link Security] Token/email mismatch: token for ${magicLinkData.email}, attempted with ${email}`);
      return result;
    }

    // Check if token has expired
    if (new Date() > magicLinkData.expires) {
      result.errors.push('Magic link has expired');
      this.magicLinks.delete(token); // Clean up expired token
      return result;
    }

    // Check if token has already been used
    if (magicLinkData.used) {
      result.securityViolations.push('Magic link has already been used');
      console.warn(`[Magic Link Security] Attempted reuse of token for ${email}`);
      return result;
    }

    // Optional: Check IP address consistency (could be too strict for some users)
    if (magicLinkData.ipAddress && ipAddress && magicLinkData.ipAddress !== ipAddress) {
      console.warn(`[Magic Link Security] IP address changed for ${email}: ${magicLinkData.ipAddress} -> ${ipAddress}`);
      // Don't block, but log for security monitoring
    }

    // Mark token as used immediately to prevent race conditions
    magicLinkData.used = true;
    
    result.isValid = true;
    result.email = email;

    // Log successful validation
    console.log(`[Magic Link] Successful validation for ${email}, token created at ${magicLinkData.createdAt.toISOString()}`);

    // Clean up the used token after successful validation
    setTimeout(() => {
      this.magicLinks.delete(token);
    }, 1000);

    return result;
  }

  /**
   * Generate a cryptographically secure token
   */
  private static generateSecureToken(): string {
    // Generate 32 bytes of random data and encode as base64url
    const randomBytes = crypto.randomBytes(32);
    return randomBytes.toString('base64url');
  }

  /**
   * Check if IP is rate limited
   */
  private static isIpRateLimited(ipAddress: string): boolean {
    const attempts = this.attemptTracker.get(ipAddress);
    if (!attempts) return false;

    const now = new Date();
    const timeDiff = now.getTime() - attempts.firstAttempt.getTime();

    // Reset if window has passed
    if (timeDiff > this.RATE_LIMIT_WINDOW) {
      this.attemptTracker.delete(ipAddress);
      return false;
    }

    return attempts.count >= this.MAX_ATTEMPTS_PER_IP;
  }

  /**
   * Track attempts for rate limiting
   */
  private static trackAttempt(email: string, ipAddress?: string): void {
    if (ipAddress) {
      const existing = this.attemptTracker.get(ipAddress);
      if (existing) {
        existing.count++;
      } else {
        this.attemptTracker.set(ipAddress, { count: 1, firstAttempt: new Date() });
      }
    }
  }

  /**
   * Get number of active magic links for an email
   */
  private static getEmailAttempts(email: string): number {
    let count = 0;
    const now = new Date();
    
    for (const [token, data] of this.magicLinks.entries()) {
      if (data.email === email && !data.used && data.expires > now) {
        count++;
      }
    }
    
    return count;
  }

  /**
   * Clean up expired links for a specific email
   */
  private static cleanupExpiredLinksForEmail(email: string): void {
    const now = new Date();
    const tokensToDelete: string[] = [];
    
    for (const [token, data] of this.magicLinks.entries()) {
      if (data.email === email && (data.used || data.expires <= now)) {
        tokensToDelete.push(token);
      }
    }
    
    tokensToDelete.forEach(token => this.magicLinks.delete(token));
  }

  /**
   * Periodic cleanup of expired tokens (should be called by a cron job)
   */
  static cleanupExpiredTokens(): number {
    const now = new Date();
    const tokensToDelete: string[] = [];
    
    for (const [token, data] of this.magicLinks.entries()) {
      if (data.used || data.expires <= now) {
        tokensToDelete.push(token);
      }
    }
    
    tokensToDelete.forEach(token => this.magicLinks.delete(token));
    
    console.log(`[Magic Link Cleanup] Removed ${tokensToDelete.length} expired/used tokens`);
    return tokensToDelete.length;
  }

  /**
   * Get statistics for monitoring
   */
  static getStats(): {
    totalActiveLinks: number;
    totalAttemptTrackers: number;
    linksByEmail: Record<string, number>;
  } {
    const now = new Date();
    const linksByEmail: Record<string, number> = {};
    let totalActiveLinks = 0;

    for (const [token, data] of this.magicLinks.entries()) {
      if (!data.used && data.expires > now) {
        totalActiveLinks++;
        linksByEmail[data.email] = (linksByEmail[data.email] || 0) + 1;
      }
    }

    return {
      totalActiveLinks,
      totalAttemptTrackers: this.attemptTracker.size,
      linksByEmail
    };
  }

  /**
   * Revoke all magic links for an email (useful for security incidents)
   */
  static revokeAllLinksForEmail(email: string): number {
    const tokensToDelete: string[] = [];
    
    for (const [token, data] of this.magicLinks.entries()) {
      if (data.email === email) {
        tokensToDelete.push(token);
      }
    }
    
    tokensToDelete.forEach(token => this.magicLinks.delete(token));
    
    console.log(`[Magic Link Security] Revoked ${tokensToDelete.length} magic links for ${email}`);
    return tokensToDelete.length;
  }
}

// Start periodic cleanup (every 5 minutes)
setInterval(() => {
  MagicLinkManager.cleanupExpiredTokens();
}, 5 * 60 * 1000);
