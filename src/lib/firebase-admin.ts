// /src/lib/firebase-admin.ts - For server-side usage (API routes, server actions)
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

let adminApp: App;

if (!getApps().length) {
  try {
    // For production - use service account
    if (process.env.FIREBASE_ADMIN_PRIVATE_KEY) {
      adminApp = initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
          clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      });
    } 
    // For development - use service account file
    else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      adminApp = initializeApp({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      });
    }
    // Fallback for local development
    else {
      console.warn('No Firebase Admin credentials found. Some server-side features may not work.');
      adminApp = initializeApp({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID || 'demo-project',
      });
    }
  } catch (error) {
    console.error('Failed to initialize Firebase Admin:', error);
    throw new Error('Firebase Admin initialization failed');
  }
} else {
  adminApp = getApps()[0];
}

export const adminAuth = getAuth(adminApp);
export const adminDb = getFirestore(adminApp);
export { adminApp };