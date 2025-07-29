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
  if (admin.apps.length > 0 && admin.apps[0]) {
    return admin.apps[0];
  }
  
  try {
    const serviceAccountKeyBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_BASE64;
    if (!serviceAccountKeyBase64) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY_BASE64 environment variable not set.');
    }
    
    const serviceAccountString = Buffer.from(serviceAccountKeyBase64, 'base64').toString('utf8');
    const serviceAccount = JSON.parse(serviceAccountString);

    adminAppInstance = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id,
    });
    
    console.log('Firebase Admin SDK initialized successfully.');
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
