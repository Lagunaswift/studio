// src/utils/authDebug.ts
import { getAuth } from '@/lib/firebase-admin'; // Correct import
import { getAuth as getClientAuth, onAuthStateChanged } from 'firebase/auth';

interface AuthDebugResult {
  hasToken: boolean;
  hasFirebaseUser: boolean;
  uid?: string;
  tokenLength: number;
  error?: string;
}

export const debugAuthenticationFlow = async (): Promise<AuthDebugResult> => {
  console.log('=== AUTHENTICATION DEBUG START ===');
  try {
    const isClient = typeof window !== 'undefined';
    console.log('Environment:', isClient ? 'Client' : 'Server');
    if (isClient) {
      const token = localStorage.getItem('authToken') ||
                   sessionStorage.getItem('authToken') ||
                   document.cookie.split(';').find(c => c.trim().startsWith('authToken='))?.split('=')[1];
      console.log('Client Token Present:', !!token);
      console.log('Token Type:', typeof token);
      console.log('Token Length:', token?.length || 0);
      const auth = getClientAuth();
      return new Promise((resolve) => {
        onAuthStateChanged(auth, (user) => {
          console.log('Firebase Auth User:', !!user);
          console.log('User UID:', user?.uid || 'Not available');
          console.log('User Email:', user?.email || 'Not available');
          console.log('Token Valid:', !!user?.accessToken);
          resolve({
            hasToken: !!token,
            hasFirebaseUser: !!user,
            uid: user?.uid,
            tokenLength: token?.length || 0,
          });
        });
      });
    }
    return {
      hasToken: false,
      hasFirebaseUser: false,
      tokenLength: 0,
      error: 'Not running on client side',
    };
  } catch (error: any) {
    console.error('Debug Error:', error.message);
    return {
      hasToken: false,
      hasFirebaseUser: false,
      tokenLength: 0,
      error: error.message,
    };
  } finally {
    console.log('=== AUTHENTICATION DEBUG END ===');
  }
};

export const debugGetUserIdFromToken = async (token: string): Promise<string> => {
  console.log('🔍 Token verification debug started');
  console.log('Token present:', !!token);
  console.log('Token type:', typeof token);
  console.log('Token length:', token?.length || 0);
  if (!token) {
    console.error('❌ No token provided');
    throw new Error('No authentication token provided');
  }
  try {
    const cleanToken = token.replace(/^Bearer\s+/i, '');
    console.log('Cleaned token length:', cleanToken.length);
    console.log('📡 Attempting token verification...');
    const auth = getAuth(); // Use exported getAuth
    const decodedToken = await auth.verifyIdToken(cleanToken);
    console.log('✅ Token verified successfully');
    console.log('User ID:', decodedToken.uid);
    console.log('Token expiry:', new Date(decodedToken.exp * 1000));
    return decodedToken.uid;
  } catch (error: any) {
    console.error('❌ Token verification failed');
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    if (error.message.includes('default Firebase app does not exist')) {
      console.error('🔥 Firebase Admin not initialized properly');
      throw new Error('Firebase Admin SDK not initialized. Check server configuration.');
    } else if (error.message.includes('expired')) {
      throw new Error('Authentication token has expired. Please sign in again.');
    } else if (error.message.includes('invalid')) {
      throw new Error('Invalid authentication token. Please sign in again.');
    } else {
      throw new Error(`Authentication error: ${error.message}`);
    }
  }
};