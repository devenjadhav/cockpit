import crypto from 'crypto';

export class TokenGenerator {
  static generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  static generateMagicLinkToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  static generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }
}
