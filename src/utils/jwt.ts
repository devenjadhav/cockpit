import jwt from 'jsonwebtoken';
import { JWTPayload } from '../types/auth';

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

  static generateToken(email: string): string {
    const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
      email,
    };

    return jwt.sign(payload, this.getSecret(), {
      expiresIn: this.getExpiresIn(),
    } as jwt.SignOptions);
  }

  static verifyToken(token: string): JWTPayload | null {
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
}
