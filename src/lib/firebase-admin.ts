// /src/lib/firebase-admin.ts - For server-side usage (API routes, server actions)
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { fixVercelPrivateKey } from './vercel-env-fix';

let adminApp: App;

function initializeFirebaseAdmin() {
  // Check if already initialized
  const existingApps = getApps();
  if (existingApps.length > 0) {
    console.log('🔥 Using existing Firebase Admin app');
    return existingApps[0];
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  console.log('🔧 Firebase Admin environment check:', {
    NODE_ENV: process.env.NODE_ENV,
    projectId: projectId ? '✅' : '❌',
    clientEmail: clientEmail ? '✅' : '❌',
    privateKey: privateKey ? '✅' : '❌',
    privateKeyValid: privateKey?.includes('BEGIN PRIVATE KEY') ? '✅' : '❌',
    privateKeyLength: privateKey?.length
  });

  // Handle build-time initialization
  if (!projectId || !clientEmail || !privateKey) {
    if (process.env.NODE_ENV === 'production') {
      const missing = [
        !projectId && 'FIREBASE_PROJECT_ID',
        !clientEmail && 'FIREBASE_CLIENT_EMAIL', 
        !privateKey && 'FIREBASE_PRIVATE_KEY'
      ].filter(Boolean);
      throw new Error(`Missing Firebase configuration in production: ${missing.join(', ')}`);
    } else {
      console.warn('Firebase admin configuration incomplete, using placeholder for build');
      return initializeApp({ 
        projectId: projectId || 'build-placeholder'
      });
    }
  }

  // Handle placeholder/invalid private keys during build
  if (privateKey.includes('YOUR_PRIVATE_KEY_HERE') || privateKey.includes('your_private_key') || privateKey.length < 100) {
    if (process.env.NODE_ENV === 'production' && process.env.VERCEL !== '1') {
      throw new Error('Invalid Firebase private key in production - contains placeholder text');
    } else {
      console.warn('Firebase admin using placeholder key for build, using minimal app');
      return initializeApp({ 
        projectId: projectId || 'build-placeholder'
      });
    }
  }

  try {
    // Apply Vercel-specific fixes first (includes all necessary transformations)
    const formattedPrivateKey = fixVercelPrivateKey(privateKey);
    
    // Validate the formatted key
    if (!formattedPrivateKey.includes('-----BEGIN PRIVATE KEY-----')) {
      console.error('❌ Private key missing BEGIN marker after formatting');
      console.error('Formatted key start:', formattedPrivateKey.substring(0, 100));
      console.error('Original key start:', privateKey.substring(0, 100));
      throw new Error('Invalid private key format - missing BEGIN PRIVATE KEY marker');
    }
    
    if (!formattedPrivateKey.includes('-----END PRIVATE KEY-----')) {
      console.error('❌ Private key missing END marker after formatting');
      console.error('Formatted key end:', formattedPrivateKey.slice(-100));
      console.error('Original key end:', privateKey.slice(-100));
      throw new Error('Invalid private key format - missing END PRIVATE KEY marker');
    }
    
    console.log('✅ Private key format validation passed');
    console.log('Final key length:', formattedPrivateKey.length);
    console.log('Final key structure check:', {
      hasBegin: formattedPrivateKey.includes('-----BEGIN PRIVATE KEY-----'),
      hasEnd: formattedPrivateKey.includes('-----END PRIVATE KEY-----'),
      hasNewlines: formattedPrivateKey.includes('\n'),
      lineCount: formattedPrivateKey.split('\n').length
    });

    console.log('🚀 Initializing Firebase Admin with credentials...');
    
    const serviceAccount = {
      projectId,
      clientEmail,
      privateKey: formattedPrivateKey,
    };

    const app = initializeApp({
      credential: cert(serviceAccount),
      projectId,
    });

    console.log('✅ Firebase Admin initialized successfully');
    return app;

  } catch (error: any) {
    console.error('❌ Firebase Admin initialization error:', {
      message: error.message,
      code: error.code,
      stack: error.stack?.substring(0, 500) // Limit stack trace
    });
    throw new Error(`Firebase Admin init failed: ${error.message}`);
  }
}

// Initialize Firebase Admin
try {
  adminApp = initializeFirebaseAdmin();
} catch (error: any) {
  console.error('🚨 Firebase Admin setup failed:', error.message);
  // Re-throw to prevent silent failures
  throw error;
}

export const adminAuth = getAuth(adminApp);
export const adminDb = getFirestore(adminApp);

export function getAdminFirestore() {
    return adminDb;
}

// Token verification function for middleware
export async function verifyIdToken(token: string) {
  if (!token) {
    throw new Error('No token provided');
  }
  
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    return decodedToken;
  } catch (error: any) {
    console.error('Token verification failed:', error.message);
    throw new Error('Invalid or expired token');
  }
}
