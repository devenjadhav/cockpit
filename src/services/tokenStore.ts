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
    const authToken = this.getToken(email);
    
    if (!authToken) {
      return false;
    }

    const isValid = authToken.token === token;
    
    if (isValid) {
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
