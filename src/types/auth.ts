import { Request } from 'express';

export interface AuthToken {
  token: string;
  email: string;
  expiresAt: Date;
  type: 'otp' | 'magic-link';
}

export interface LoginRequest {
  email: string;
  type?: 'otp' | 'magic-link';
}

export interface VerifyTokenRequest {
  email: string;
  token: string;
}

export interface AuthResponse {
  success: boolean;
  jwt?: string;
  message: string;
}

export interface JWTPayload {
  email: string;
  iat: number;
  exp: number;
}

export interface AuthenticatedRequest extends Request {
  user?: {
    email: string;
  };
}
