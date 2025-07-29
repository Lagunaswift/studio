// src/lib/firebase-admin.ts
import * as admin from 'firebase-admin';
import type { App } from 'firebase-admin/app';
import type { Auth } from 'firebase-admin/auth';
import type { Firestore } from 'firebase-admin/firestore';

let adminAppInstance: App | null = null;

/**
 * Initializes the Firebase Admin SDK if it hasn't been already.
 * This function is designed to be safely called multiple times.
 * In a Firebase App Hosting or Cloud Functions environment, initializeApp() 
 * with no arguments will automatically use the project's service account.
 * @returns The initialized Firebase Admin App instance.
 */
function initializeFirebaseAdmin(): App {
  // Check if an app is already initialized
  if (admin.apps.length > 0 && admin.apps[0]) {
    return admin.apps[0];
  }
  
  // Check our cached instance
  if (adminAppInstance) {
      return adminAppInstance;
  }

  try {
    // In Firebase App Hosting, the SDK automatically finds the credentials
    // when initializeApp is called with no arguments.
    adminAppInstance = admin.initializeApp();
    
    console.log('Firebase Admin SDK initialized successfully in the App Hosting environment.');
    return adminAppInstance;
  } catch (error: any) {
    console.error("CRITICAL: Firebase Admin SDK Initialization failed.", error);
    // This will cause server-side functions to fail.
    throw new Error(`Could not initialize Firebase Admin SDK: ${error.message}`);
  }
}

/**
 * Gets the initialized Firestore instance.
 * @returns {Firestore} The Firestore service instance.
 */
export function getDb(): Firestore {
  const app = initializeFirebaseAdmin();
  return admin.firestore(app);
}

/**
 * Gets the initialized Auth instance.
 * @returns {Auth} The Auth service instance.
 */
export function getAuth(): Auth {
  const app = initializeFirebaseAdmin();
  return admin.auth(app);
}

/**
 * Gets the initialized Firebase Admin App instance.
 * @returns {App} The Firebase Admin App instance.
 */
export function getAdminApp(): App {
    return initializeFirebaseAdmin();
}
