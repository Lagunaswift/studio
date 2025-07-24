
import * as admin from 'firebase-admin';
import type { Auth } from 'firebase-admin/auth';
import type { Firestore } from 'firebase-admin/firestore';

interface FirebaseAdminServices {
  auth: Auth;
  db: Firestore;
}

let services: FirebaseAdminServices | null = null;

function initializeFirebaseAdmin(): FirebaseAdminServices {
  // Check if the app is already initialized
  if (admin.apps.length > 0 && services) {
    return services;
  }

  try {
    const serviceAccountKeyBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_BASE64;

    if (serviceAccountKeyBase64) {
      // Decode the service account key from Base64
      const serviceAccountJson = Buffer.from(serviceAccountKeyBase64, 'base64').toString('utf-8');
      const serviceAccount = JSON.parse(serviceAccountJson);
      
      console.log("Initializing Firebase Admin SDK with Service Account Key...");
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
      });
    } else {
      // Rely on default credentials in a deployed environment
      console.log("Initializing Firebase Admin SDK with default credentials...");
      admin.initializeApp();
    }
    
    console.log("Firebase Admin SDK initialized successfully.");
  } catch (error: any) {
    console.error("CRITICAL: Firebase Admin SDK initialization failed.", error);
    // Throw a more descriptive error to help with debugging.
    throw new Error(`Firebase Admin SDK could not be initialized. Error: ${error.message}`);
  }

  // Assign services after successful initialization
  services = {
    auth: admin.auth(),
    db: admin.firestore(),
  };

  return services;
}

function getFirebaseAdmin(): FirebaseAdminServices {
  if (!services) {
    return initializeFirebaseAdmin();
  }
  return services;
}

// Export a getter for the services
export const { auth, db } = getFirebaseAdmin();
