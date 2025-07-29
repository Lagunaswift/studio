
// Enhanced Token Management System
// Place this in: /utils/tokenManager.js

import { getAuth, onAuthStateChanged } from 'firebase/auth';

export class TokenManager {
  constructor() {
    this.currentToken = null;
    this.tokenExpiry = null;
    this.refreshPromise = null;
    this.listeners = new Set();
    this.initialized = false;
    
    this.init();
  }

  init() {
    if (typeof window !== 'undefined') {
      this.setupAuthListener();
    }
  }

  setupAuthListener() {
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

  async refreshToken(user = null) {
    // Prevent multiple simultaneous refresh attempts
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

  async _performTokenRefresh(user = null) {
    try {
      const auth = getAuth();
      const currentUser = user || auth.currentUser;
      
      if (!currentUser) {
        throw new Error('No authenticated user available for token refresh');
      }

      console.log('Refreshing token for user:', currentUser.uid);
      
      // Get fresh token
      const token = await currentUser.getIdToken(true);
      
      // Parse token to get expiry
      const payload = this.parseTokenPayload(token);
      
      this.currentToken = token;
      this.tokenExpiry = payload.exp * 1000; // Convert to milliseconds
      
      console.log('Token refreshed successfully');
      console.log('Token expires at:', new Date(this.tokenExpiry));
      
      // Schedule auto-refresh before expiry
      this.scheduleTokenRefresh();
      
      return token;
    } catch (error) {
      console.error('Token refresh failed:', error);
      this.clearToken();
      throw error;
    }
  }

  parseTokenPayload(token) {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid token format');
      }
      
      const payload = JSON.parse(atob(parts[1]));
      return payload;
    } catch (error) {
      console.error('Failed to parse token payload:', error);
      return { exp: Date.now() / 1000 + 3600 }; // Default 1 hour
    }
  }

  scheduleTokenRefresh() {
    // Clear any existing refresh timer
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    if (!this.tokenExpiry) return;

    // Refresh 5 minutes before expiry
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

  async getValidToken() {
    // Wait for initialization if not ready
    if (!this.initialized) {
      await this.waitForInitialization();
    }

    // Check if we have a current token
    if (!this.currentToken) {
      console.log('No current token, attempting refresh...');
      await this.refreshToken();
    }

    // Check if token is expired or about to expire (within 2 minutes)
    if (this.tokenExpiry && this.tokenExpiry - Date.now() < (2 * 60 * 1000)) {
      console.log('Token expiring soon, refreshing...');
      await this.refreshToken();
    }

    if (!this.currentToken) {
      throw new Error('Unable to obtain valid authentication token');
    }

    return this.currentToken;
  }

  async waitForInitialization(timeout = 10000) {
    const start = Date.now();
    
    while (!this.initialized && Date.now() - start < timeout) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    if (!this.initialized) {
      throw new Error('Token manager initialization timeout');
    }
  }

  clearToken() {
    this.currentToken = null;
    this.tokenExpiry = null;
    
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
    
    console.log('Token cleared');
  }

  isTokenValid() {
    if (!this.currentToken || !this.tokenExpiry) {
      return false;
    }
    
    // Consider token invalid if it expires in less than 1 minute
    return this.tokenExpiry - Date.now() > (60 * 1000);
  }

  onTokenChange(callback) {
    this.listeners.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
    };
  }

  notifyListeners(event, data = null) {
    this.listeners.forEach(callback => {
      try {
        callback(event, data);
      } catch (error) {
        console.error('Token listener error:', error);
      }
    });
  }

  // Debug method
  getTokenInfo() {
    return {
      hasToken: !!this.currentToken,
      tokenLength: this.currentToken?.length || 0,
      expiresAt: this.tokenExpiry ? new Date(this.tokenExpiry) : null,
      isValid: this.isTokenValid(),
      timeUntilExpiry: this.tokenExpiry ? this.tokenExpiry - Date.now() : null
    };
  }
}

// Singleton instance
export const tokenManager = new TokenManager();

// Utility function for getting tokens in server actions
export const getServerToken = async (request) => {
  // Try different sources for the token
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // Try cookie
  const cookies = request.headers.get('cookie');
  if (cookies) {
    const tokenCookie = cookies.split(';')
      .find(c => c.trim().startsWith('authToken='));
    if (tokenCookie) {
      return tokenCookie.split('=')[1];
    }
  }
  
  // Try body for POST requests
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