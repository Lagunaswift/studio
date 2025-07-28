// src/lib/firebase-admin.ts
import * as admin from 'firebase-admin';
import type { App } from 'firebase-admin/app';
import type { Auth } from 'firebase-admin/auth';
import type { Firestore } from 'firebase-admin/firestore';

let adminAppInstance: App | null = null;

/**
 * Initializes the Firebase Admin SDK if it hasn't been already.
 * This function is designed to be safely called multiple times.
 * @returns The initialized Firebase Admin App instance.
 */
function initializeFirebaseAdmin(): App {
  // Return the existing instance if it's already been initialized.
  if (adminAppInstance) {
    return adminAppInstance;
  }

  // Check if any app has already been initialized by another process
  if (admin.apps.length > 0 && admin.apps[0]) {
    adminAppInstance = admin.apps[0];
    return adminAppInstance;
  }

  console.log('Attempting to initialize Firebase Admin SDK...');
  try {
    const isDevelopment = process.env.NODE_ENV === 'development';

    if (isDevelopment) {
      console.log('Development environment: Configuring emulators and using local service account.');

      // Set emulator hosts BEFORE initializing the app. This is crucial.
      // Using port 8080 for Firestore as indicated in the firebase.json.
      process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
      process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';

      const serviceAccount = require('../../serviceAccount.json');
      adminAppInstance = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id,
      });
      console.log('Firebase Admin SDK initialized for development.');
    } else {
      console.log('Production environment: Using credentials from environment variables.');
      if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY_BASE64) {
        throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY_BASE64 environment variable not set for production.');
      }
      const serviceAccountJson = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY_BASE64, 'base64').toString('utf8');
      const serviceAccount = JSON.parse(serviceAccountJson);
      adminAppInstance = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id,
      });
      console.log('Firebase Admin SDK initialized for production.');
    }
    return adminAppInstance;
  } catch (error: any) {
    console.error("CRITICAL: Firebase Admin SDK Initialization failed.", error);
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
