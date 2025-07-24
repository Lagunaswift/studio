
import * as admin from 'firebase-admin';
import type { Auth } from 'firebase-admin/auth';
import type { Firestore } from 'firebase-admin/firestore';

if (!admin.apps.length) {
  try {
    const serviceAccountKeyBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_BASE64;
    
    if (!serviceAccountKeyBase64) {
      console.log("Attempting to initialize Firebase Admin SDK with default credentials...");
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
  } catch (error: any) {
    console.error("CRITICAL ERROR: Firebase Admin SDK initialization failed.", error);
  }
}

export const auth: Auth = admin.auth();
export const db: Firestore = admin.firestore();
