
import * as admin from 'firebase-admin';

const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

if (!serviceAccountString) {
  throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set. The application cannot initialize the admin SDK.');
}

let serviceAccount;
try {
  serviceAccount = JSON.parse(serviceAccountString);
} catch (e) {
  console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY. Make sure it's a valid JSON string.");
  throw new Error('Invalid FIREBASE_SERVICE_ACCOUNT_KEY format.');
}

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log("Firebase Admin SDK initialized successfully.");
  } catch (error) {
    console.error("Firebase Admin SDK initialization error:", error);
    // Decide if you want to throw or handle this gracefully
    throw new Error('Could not initialize Firebase Admin SDK.');
  }
}

export const app = admin.apps[0]!;
export const db = admin.firestore(app);
export const auth = admin.auth(app);
