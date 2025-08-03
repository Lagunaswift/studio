// lib/firebase-admin.ts
import { initializeApp, getApps, cert, type ServiceAccount, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getAuth, type Auth } from 'firebase-admin/auth';
import * as admin from 'firebase-admin';

function getServiceAccount(): ServiceAccount {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId) {
    throw new Error('FIREBASE_PROJECT_ID environment variable is required');
  }
  if (!clientEmail) {
    throw new Error('FIREBASE_CLIENT_EMAIL environment variable is required');
  }
  if (!privateKey) {
    throw new Error('FIREBASE_PRIVATE_KEY environment variable is required');
  }

  // Return only the properties that ServiceAccount expects
  return {
    projectId,
    clientEmail,
    privateKey: privateKey.replace(/\\n/g, '\n'),
  } as ServiceAccount;
}

let adminApp: App;
let adminDb: Firestore;
let adminAuth: Auth;

function initializeFirebaseAdmin(): void {
  try {
    // Check if app is already initialized
    const existingApps = getApps();
    
    if (existingApps.length === 0) {
      const serviceAccount = getServiceAccount();
      
      adminApp = initializeApp({
        credential: cert(serviceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID,
      });
      
      console.log('Firebase Admin SDK initialized successfully');
    } else {
      // Use existing app
      adminApp = existingApps[0];
      console.log('Using existing Firebase Admin app');
    }
    
    // Initialize services
    adminDb = getFirestore(adminApp);
    adminAuth = getAuth(adminApp);
    
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
    throw error;
  }
}

// Initialize immediately
initializeFirebaseAdmin();

// Getter functions to ensure services are available
export function getAdminApp(): App {
  if (!adminApp) {
    initializeFirebaseAdmin();
  }
  return adminApp;
}

export function getAdminDb(): Firestore {
  if (!adminDb) {
    initializeFirebaseAdmin();
  }
  return adminDb;
}

export function getAdminAuth(): Auth {
  if (!adminAuth) {
    initializeFirebaseAdmin();
  }
  return adminAuth;
}

// Export the services and admin namespace
export { adminDb, adminAuth, adminApp };
export { admin };

// Alternative exports for backward compatibility
export const firebaseAdmin = {
  app: () => getAdminApp(),
  db: () => getAdminDb(),
  auth: () => getAdminAuth(),
};