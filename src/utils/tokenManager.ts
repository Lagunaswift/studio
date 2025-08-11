
// src/utils/tokenManager.ts
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { safeLocalStorage } from '@/lib/safe-storage';

export class TokenManager {
  private currentToken: string | null = null;
  private tokenExpiry: number | null = null;
  private refreshPromise: Promise<string> | null = null;
  private refreshTimer: NodeJS.Timeout | null = null;
  private listeners: Set<(event: string, data?: any) => void> = new Set();
  private initialized: boolean = false;

  constructor() {
    this.init();
  }

  private init(): void {
    if (typeof window !== 'undefined') {
      this.setupAuthListener();
    }
  }

  private setupAuthListener(): void {
    const auth = getAuth();
    onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          console.log('User authenticated, getting token...');
          await this.refreshToken(user);
          this.notifyListeners('authenticated', { user, token: this.currentToken });
        } else {
          console.log('User not authenticated, clearing token...');
          this.clearToken();
          this.notifyListeners('unauthenticated');
        }
        this.initialized = true;
      } catch (error) {
        console.error('Auth state change error:', error);
        this.notifyListeners('error', error);
      }
    });
  }

  async refreshToken(user: User | null = null): Promise<string> {
    if (this.refreshPromise) {
      return await this.refreshPromise;
    }

    this.refreshPromise = this._performTokenRefresh(user);
    try {
      const result = await this.refreshPromise;
      return result;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async _performTokenRefresh(user: User | null = null): Promise<string> {
    try {
      const auth = getAuth();
      const currentUser = user || auth.currentUser;
      if (!currentUser) {
        throw new Error('No authenticated user available for token refresh');
      }

      console.log('Refreshing token for user:', currentUser.uid);
      const token = await currentUser.getIdToken(true);
      const payload = this.parseTokenPayload(token);

      this.currentToken = token;
      this.tokenExpiry = payload.exp * 1000;
      safeLocalStorage.setItem('authToken', token); // Ensure token is stored

      console.log('Token refreshed successfully');
      console.log('Token expires at:', new Date(this.tokenExpiry));
      this.scheduleTokenRefresh();

      return token;
    } catch (error) {
      console.error('Token refresh failed:', error);
      this.clearToken();
      throw error;
    }
  }

  private parseTokenPayload(token: string): { exp: number } {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid token format');
      }
      const payload = JSON.parse(atob(parts[1]));
      return payload;
    } catch (error) {
      console.error('Failed to parse token payload:', error);
      return { exp: Date.now() / 1000 + 3600 };
    }
  }

  private scheduleTokenRefresh(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    if (!this.tokenExpiry) return;

    const refreshTime = this.tokenExpiry - Date.now() - (5 * 60 * 1000);
    if (refreshTime > 0) {
      console.log('Scheduling token refresh in', Math.round(refreshTime / 1000), 'seconds');
      this.refreshTimer = setTimeout(async () => {
        try {
          console.log('Auto-refreshing token...');
          await this.refreshToken();
          this.notifyListeners('token-refreshed', { token: this.currentToken });
        } catch (error) {
          console.error('Auto token refresh failed:', error);
          this.notifyListeners('refresh-failed', error);
        }
      }, refreshTime);
    }
  }

  async getValidToken(): Promise<string> {
    if (!this.initialized) {
      await this.waitForInitialization();
    }

    if (!this.currentToken) {
      console.log('No current token, attempting refresh...');
      await this.refreshToken();
    }

    if (this.tokenExpiry && this.tokenExpiry - Date.now() < (2 * 60 * 1000)) {
      console.log('Token expiring soon, refreshing...');
      await this.refreshToken();
    }

    if (!this.currentToken) {
      throw new Error('Unable to obtain valid authentication token');
    }

    return this.currentToken;
  }

  private async waitForInitialization(timeout = 10000): Promise<void> {
    const start = Date.now();
    while (!this.initialized && Date.now() - start < timeout) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (!this.initialized) {
      throw new Error('Token manager initialization timeout');
    }
  }

  private clearToken(): void {
    this.currentToken = null;
    this.tokenExpiry = null;
    safeLocalStorage.removeItem('authToken');
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
    console.log('Token cleared');
  }

  isTokenValid(): boolean {
    if (!this.currentToken || !this.tokenExpiry) {
      return false;
    }
    return this.tokenExpiry - Date.now() > (60 * 1000);
  }

  onTokenChange(callback: (event: string, data?: any) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners(event: string, data: any = null): void {
    this.listeners.forEach(callback => {
      try {
        callback(event, data);
      } catch (error) {
        console.error('Token listener error:', error);
      }
    });
  }

  getTokenInfo() {
    return {
      hasToken: !!this.currentToken,
      tokenLength: this.currentToken?.length || 0,
      expiresAt: this.tokenExpiry ? new Date(this.tokenExpiry) : null,
      isValid: this.isTokenValid(),
      timeUntilExpiry: this.tokenExpiry ? this.tokenExpiry - Date.now() : null,
    };
  }
}

export const tokenManager = new TokenManager();

export const getServerToken = async (request: Request): Promise<string> => {
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  const cookies = request.headers.get('cookie');
  if (cookies) {
    const tokenCookie = cookies.split(';').find(c => c.trim().startsWith('authToken='));
    if (tokenCookie) {
      return tokenCookie.split('=')[1];
    }
  }

  if (request.method === 'POST') {
    try {
      const body = await request.json();
      if (body.token) {
        return body.token;
      }
    } catch (error) {
      // Body might not be JSON
    }
  }

  throw new Error('No authentication token found in request');
};