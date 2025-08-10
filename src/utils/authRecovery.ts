import { getAuth, signOut } from 'firebase/auth';

interface FirebaseError extends Error {
  code?: string;
  message: string;
}

interface AuthRecoveryResult {
  success: boolean;
  newToken?: string;
  error?: string;
  action?: string;
}

export class AuthRecoveryManager {
  private maxRetries: number;
  private retryDelay: number;

  constructor() {
    this.maxRetries = 3;
    this.retryDelay = 1000; // 1 second
  }

  async handleAuthError(error: FirebaseError | Error, context: string = 'unknown'): Promise<AuthRecoveryResult> {
    console.log(`Auth error in ${context}:`, error.message);
    
    // Categorize the error
    const errorType = this.categorizeError(error);
    
    switch (errorType) {
      case 'TOKEN_EXPIRED':
        return await this.handleTokenExpired();
      case 'TOKEN_INVALID':
        return await this.handleInvalidToken();
      case 'NO_TOKEN':
        return await this.handleMissingToken();
      case 'FIREBASE_CONFIG':
        return await this.handleFirebaseConfigError();
      default:
        return await this.handleGenericError(error);
    }
  }

  categorizeError(error: FirebaseError | Error): string {
    const message = error.message.toLowerCase();
    
    if (message.includes('expired') || message.includes('token-expired')) {
      return 'TOKEN_EXPIRED';
    }
    if (message.includes('invalid') || message.includes('malformed')) {
      return 'TOKEN_INVALID';
    }
    if (message.includes('no token') || message.includes('missing')) {
      return 'NO_TOKEN';
    }
    if (message.includes('firebase') || message.includes('config')) {
      return 'FIREBASE_CONFIG';
    }
    return 'GENERIC';
  }

  async handleTokenExpired(): Promise<AuthRecoveryResult> {
    console.log('Handling expired token...');
    
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (user) {
        // Force refresh the token
        const newToken = await user.getIdToken(true);
        console.log('Token refreshed successfully');
        
        // Update stored token if using localStorage/sessionStorage
        if (typeof window !== 'undefined') {
          const storageKey = localStorage.getItem('authToken') ? 'authToken' : 
                           sessionStorage.getItem('authToken') ? 'authToken' : null;
          
          if (storageKey) {
            const storage = localStorage.getItem('authToken') ? localStorage : sessionStorage;
            storage.setItem(storageKey, newToken);
          }
        }
        
        return { success: true, newToken };
      } else {
        return await this.handleMissingUser();
      }
    } catch (error: unknown) {
      console.error('Token refresh failed:', error);
      return await this.handleMissingUser();
    }
  }

  async handleInvalidToken(): Promise<AuthRecoveryResult> {
    console.log('Handling invalid token...');
    
    // Clear invalid token
    if (typeof window !== 'undefined') {
      localStorage.removeItem('authToken');
      sessionStorage.removeItem('authToken');
      
      // Clear cookie
      document.cookie = 'authToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    }
    
    return await this.handleMissingUser();
  }

  async handleMissingToken(): Promise<AuthRecoveryResult> {
    console.log('Handling missing token...');
    
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (user) {
        // Get fresh token
        const token = await user.getIdToken();
        console.log('Retrieved fresh token for authenticated user');
        return { success: true, newToken: token };
      } else {
        return await this.handleMissingUser();
      }
    } catch (error: unknown) {
      console.error('Failed to get token for current user:', error);
      return await this.handleMissingUser();
    }
  }

  async handleFirebaseConfigError(): Promise<AuthRecoveryResult> {
    console.error('Firebase configuration error detected');
    
    // Check if Firebase is properly initialized
    try {
      const auth = getAuth();
      console.log('Firebase Auth instance:', !!auth);
      
      return {
        success: false,
        error: 'Firebase configuration error',
        action: 'CHECK_FIREBASE_CONFIG'
      };
    } catch (error: unknown) {
      return {
        success: false,
        error: 'Firebase not initialized',
        action: 'REINITIALIZE_FIREBASE'
      };
    }
  }

  async handleMissingUser(): Promise<AuthRecoveryResult> {
    console.log('No authenticated user found, redirecting to login...');
    
    try {
      // Sign out to clear any corrupted state
      const auth = getAuth();
      await signOut(auth);
    } catch (error: unknown) {
      console.warn('Sign out failed:', error);
    }
    
    // Clear all auth-related storage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('authToken');
      sessionStorage.removeItem('authToken');
      document.cookie = 'authToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      
      // Redirect to login
      window.location.href = '/login';
    }
    
    return {
      success: false,
      error: 'User not authenticated',
      action: 'REDIRECT_LOGIN'
    };
  }

  async handleGenericError(error: FirebaseError | Error): Promise<AuthRecoveryResult> {
    console.error('Generic auth error:', error);
    
    return {
      success: false,
      error: error.message,
      action: 'CONTACT_SUPPORT'
    };
  }

  // Retry mechanism for critical operations
  async retryOperation<T>(operation: () => Promise<T>, context: string = 'operation'): Promise<T> {
    let lastError: unknown;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`Attempting ${context} (${attempt}/${this.maxRetries})`);
        const result = await operation();
        console.log(`${context} succeeded on attempt ${attempt}`);
        return result;
      } catch (error: unknown) {
        lastError = error;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.warn(`${context} failed on attempt ${attempt}:`, errorMessage);
        
        if (attempt < this.maxRetries) {
          // Try to recover from auth error - only if it's an Error object
          if (error instanceof Error) {
            const recovery = await this.handleAuthError(error, context);
            
            if (recovery.success && recovery.newToken) {
              // Update operation with new token if applicable
              console.log('Auth recovery successful, retrying with new token');
            }
          }
          
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
        }
      }
    }
    
    const finalErrorMessage = lastError instanceof Error ? lastError.message : 'Unknown error';
    throw new Error(`${context} failed after ${this.maxRetries} attempts: ${finalErrorMessage}`);
  }
}

// Singleton instance
export const authRecovery = new AuthRecoveryManager();

// Enhanced wrapper for Firestore operations
export const withAuthRecovery = <T extends (...args: any[]) => Promise<any>>(operation: T): T => {
  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    return await authRecovery.retryOperation(
      () => operation(...args),
      operation.name || 'firestore-operation'
    );
  }) as T;
};