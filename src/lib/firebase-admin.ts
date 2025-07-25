
import * as admin from 'firebase-admin';
import type { Auth } from 'firebase-admin/auth';
import type { Firestore } from 'firebase-admin/firestore';

function initializeFirebaseAdmin() {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  const serviceAccountKeyBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_BASE64;
    
  if (!serviceAccountKeyBase64) {
    console.log("Attempting to initialize Firebase Admin SDK with default credentials...");
    // This will work in managed environments like Cloud Run (App Hosting)
    admin.initializeApp();
    console.log("Firebase Admin SDK initialized with default credentials.");
  } else {
    console.log("Attempting to initialize Firebase Admin SDK with Service Account...");
    const serviceAccount = JSON.parse(Buffer.from(serviceAccountKeyBase64, 'base64').toString('utf-8'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
    });
    console.log("Firebase Admin SDK initialized successfully with Service Account.");
  }

  return admin.app();
}

export function getDb(): Firestore {
  const app = initializeFirebaseAdmin();
  return admin.firestore(app);
}

export function getAuth(): Auth {
  const app = initializeFirebaseAdmin();
  return admin.auth(app);
}

// For direct usage if needed, though getters are safer.
export const db: Firestore = getDb();
export const auth: Auth = getAuth();
