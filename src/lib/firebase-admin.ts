// src/lib/firebase-admin.ts
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

let adminApp: App | null = null;

function initializeFirebaseAdmin(): App {
  // Check if already initialized
  const existingApps = getApps();
  if (existingApps.length > 0) {
    return existingApps[0];
  }

  try {
    // Validate required environment variables
    if (!process.env.FIREBASE_PROJECT_ID || 
        !process.env.FIREBASE_CLIENT_EMAIL || 
        !process.env.FIREBASE_PRIVATE_KEY) {
      throw new Error('Missing required Firebase environment variables');
    }

    // Format the private key (handle escaped newlines)
    const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');

    console.log('🔥 Initializing Firebase Admin with project:', process.env.FIREBASE_PROJECT_ID);
    
    adminApp = initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
      }),
      projectId: process.env.FIREBASE_PROJECT_ID,
    });
    
    console.log('✅ Firebase Admin initialized successfully');
    return adminApp;
    
  } catch (error: any) {
    console.error('❌ Firebase Admin initialization failed:', error.message);
    console.error('Full error:', error);
    throw error;
  }
}

// Initialize the admin app
if (!adminApp) {
  adminApp = initializeFirebaseAdmin();
}

// Export the admin services
export const admin = adminApp;
export const getAdminAuth = () => getAuth(adminApp!);
export const getAdminFirestore = () => getFirestore(adminApp!);

export default adminApp;