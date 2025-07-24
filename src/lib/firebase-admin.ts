
import * as admin from 'firebase-admin';

// Check if the app is already initialized to prevent re-initialization
if (!admin.apps.length) {
  const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (serviceAccountString) {
    try {
      const serviceAccount = JSON.parse(serviceAccountString);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log("Firebase Admin SDK initialized successfully via service account key.");
    } catch (error) {
      console.error("Firebase Admin SDK initialization error from service account key:", error);
      throw new Error('Could not initialize Firebase Admin SDK. The FIREBASE_SERVICE_ACCOUNT_KEY may be invalid.');
    }
  } else {
    // This will be used in environments like Firebase App Hosting where the SDK can auto-initialize
    console.log("FIREBASE_SERVICE_ACCOUNT_KEY not found. Attempting to initialize with default credentials.");
    try {
        admin.initializeApp();
        console.log("Firebase Admin SDK initialized with default credentials.");
    } catch(error) {
        console.warn("Could not initialize with default credentials. Admin features may not work in local development without the service account key.");
    }
  }
}

const app = admin.apps[0]!;
const db = admin.firestore(app);
const auth = admin.auth(app);

export { app, db, auth };
