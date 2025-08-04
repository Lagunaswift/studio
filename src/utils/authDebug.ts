// src/utils/authDebug.ts
import { adminAuth } from '@/lib/firebase-admin'; // Fixed import
import { getAuth as getClientAuth, onAuthStateChanged } from 'firebase/auth';

interface AuthDebugResult {
  serverValid: boolean;
  clientUser: any;
  serverError?: string;
  clientError?: string;
}

export async function debugAuth(): Promise<AuthDebugResult> {
  const result: AuthDebugResult = {
    serverValid: false,
    clientUser: null,
  };

  try {
    // Client-side auth check
    const auth = getClientAuth();
    const user = auth.currentUser;
    
    if (user) {
      result.clientUser = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
      };

      // Get the ID token (not accessToken)
      const idToken = await user.getIdToken();
      
      // Verify with server
      try {
        const decodedToken = await adminAuth().verifyIdToken(idToken);
        result.serverValid = true;
        console.log('✅ Server token verification successful:', decodedToken.uid);
      } catch (serverError: any) {
        result.serverError = serverError.message;
        console.error('❌ Server token verification failed:', serverError);
      }
    } else {
      result.clientError = 'No authenticated user';
      console.log('❌ No authenticated user on client');
    }
  } catch (clientError: any) {
    result.clientError = clientError.message;
    console.error('❌ Client auth error:', clientError);
  }

  return result;
}

export async function debugGetUserIdFromToken(idToken: string): Promise<string> {
  try {
    const decodedToken = await adminAuth().verifyIdToken(idToken);
    console.log('✅ Token verified successfully for user:', decodedToken.uid);
    return decodedToken.uid;
  } catch (error: any) {
    console.error('❌ Token verification failed:', error);
    throw new Error(`Token verification failed: ${error.message}`);
  }
}

// Helper function to get current user's ID token
export async function getCurrentUserIdToken(): Promise<string | null> {
  try {
    const auth = getClientAuth();
    const user = auth.currentUser;
    
    if (!user) {
      return null;
    }
    
    return await user.getIdToken();
  } catch (error: any) {
    console.error('❌ Failed to get ID token:', error);
    return null;
  }
}

// Promise-based auth state listener
export function waitForAuthState(): Promise<any> {
  return new Promise((resolve) => {
    const auth = getClientAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
}