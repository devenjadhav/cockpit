import { AuthToken } from '../types/auth';

export class TokenStore {
  private tokens: Map<string, AuthToken> = new Map();

  storeToken(email: string, token: string, type: 'otp' | 'magic-link'): void {
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    
    this.tokens.set(email, {
      token,
      email,
      expiresAt,
      type,
    });

    setTimeout(() => {
      this.removeToken(email);
    }, 15 * 60 * 1000);
  }

  getToken(email: string): AuthToken | null {
    const authToken = this.tokens.get(email);
    
    if (!authToken) {
      return null;
    }

    if (authToken.expiresAt < new Date()) {
      this.removeToken(email);
      return null;
    }

    return authToken;
  }

  verifyToken(email: string, token: string): boolean {
    console.log('TokenStore: Verifying token for email:', email);
    console.log('TokenStore: Looking for token:', token.substring(0, 10) + '...');
    
    const authToken = this.getToken(email);
    
    if (!authToken) {
      console.log('TokenStore: No token found for email:', email);
      console.log('TokenStore: Available tokens:', Array.from(this.tokens.keys()));
      return false;
    }

    console.log('TokenStore: Found token:', authToken.token.substring(0, 10) + '...');
    const isValid = authToken.token === token;
    console.log('TokenStore: Token match:', isValid);
    
    if (isValid) {
      console.log('TokenStore: Removing token after successful verification');
      this.removeToken(email);
    }

    return isValid;
  }

  removeToken(email: string): void {
    this.tokens.delete(email);
  }

  cleanup(): void {
    const now = new Date();
    for (const [email, authToken] of this.tokens.entries()) {
      if (authToken.expiresAt < now) {
        this.removeToken(email);
      }
    }
  }
}

export const tokenStore = new TokenStore();

setInterval(() => {
  tokenStore.cleanup();
}, 5 * 60 * 1000);
