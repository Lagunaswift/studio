
import * as admin from 'firebase-admin';
import type { Auth } from 'firebase-admin/auth';
import type { Firestore } from 'firebase-admin/firestore';

// This pattern ensures the Admin SDK is initialized only once.
if (!admin.apps.length) {
  try {
    const serviceAccountKeyBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_BASE64;
    
    if (!serviceAccountKeyBase64) {
      // In a deployed environment (like Firebase App Hosting), rely on default credentials
      console.log("Attempting to initialize Firebase Admin SDK with default credentials...");
      admin.initializeApp();
      console.log("Firebase Admin SDK initialized with default credentials.");
    } else {
      // For local/CI environments with a service key
      console.log("Attempting to initialize Firebase Admin SDK with Service Account...");
      const serviceAccount = JSON.parse(Buffer.from(serviceAccountKeyBase64, 'base64').toString('utf-8'));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
      });
      console.log("Firebase Admin SDK initialized successfully with Service Account.");
    }
  } catch (error: any) {
    console.error("CRITICAL ERROR: Firebase Admin SDK initialization failed.", error);
    // Do not throw here, as it can break the build process. Let functions that use it handle the lack of initialization.
  }
}

// Lazy-load and export the services. This ensures they are accessed only after initialization.
const getAuth = (): Auth => {
  if (!admin.apps.length) {
    throw new Error("Firebase Admin SDK has not been initialized.");
  }
  return admin.auth();
};

const getDb = (): Firestore => {
  if (!admin.apps.length) {
    throw new Error("Firebase Admin SDK has not been initialized.");
  }
  return admin.firestore();
};

export const auth = getAuth();
export const db = getDb();
