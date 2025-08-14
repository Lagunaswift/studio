// /src/lib/firebase-admin.ts - For server-side usage (API routes, server actions)
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

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

  try {
    // More robust private key formatting
    let formattedPrivateKey = privateKey;
    
    // Handle different possible formats of the private key
    if (typeof privateKey === 'string') {
      // Replace literal \n with actual newlines
      formattedPrivateKey = privateKey.replace(/\\n/g, '\n');
      
      // Ensure proper BEGIN/END format
      if (!formattedPrivateKey.includes('-----BEGIN PRIVATE KEY-----')) {
        console.error('❌ Private key does not contain BEGIN PRIVATE KEY marker');
        console.error('First 100 chars:', formattedPrivateKey.substring(0, 100));
        throw new Error('Invalid private key format - missing BEGIN marker');
      }
      
      if (!formattedPrivateKey.includes('-----END PRIVATE KEY-----')) {
        console.error('❌ Private key does not contain END PRIVATE KEY marker');
        console.error('Last 100 chars:', formattedPrivateKey.substring(-100));
        throw new Error('Invalid private key format - missing END marker');
      }
    }

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
