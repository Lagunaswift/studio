// src/lib/firebase-admin.ts - Fixed version
import * as admin from 'firebase-admin';
import type { Auth } from 'firebase-admin/auth';
import type { Firestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin SDK
function initializeFirebaseAdmin() {
  // Check if the app is already initialized
  if (admin.apps.length > 0) {
    return admin.app();
  }

  try {
    console.log('Initializing Firebase Admin SDK...');

    // For development with emulators
    if (process.env.NODE_ENV === 'development') {
      console.log('Development mode: Using emulator settings');
      
      // Set emulator environment variables
      process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
      process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';
      
      // Initialize with minimal config for emulator
      return admin.initializeApp({
        projectId: 'macro-teal-meal-planner',
      });
    }

    // For production, use service account
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY_BASE64) {
      // Decode base64 service account key
      const serviceAccountJson = Buffer.from(
        process.env.FIREBASE_SERVICE_ACCOUNT_KEY_BASE64,
        'base64'
      ).toString('utf8');
      
      const serviceAccount = JSON.parse(serviceAccountJson);
      
      console.log(`Initializing Firebase Admin SDK with Project ID: ${serviceAccount.project_id}`);

      return admin.initializeApp({
        credential: admin.credential.cert({
          ...serviceAccount,
          // Fix private key line breaks - use proper regex syntax
          private_key: serviceAccount.private_key.replace(/\\n/g, '\n'),
        }),
        projectId: serviceAccount.project_id,
      });
    }

    // Fallback: try to load from local serviceAccount.json
    try {
      const serviceAccount = require('../../serviceAccount.json');
      console.log(`Fallback: Loading service account from local file for project: ${serviceAccount.project_id}`);
      
      return admin.initializeApp({
        credential: admin.credential.cert({
          ...serviceAccount,
          // Fix private key line breaks - use proper regex syntax
          private_key: serviceAccount.private_key.replace(/\\n/g, '\n'),
        }),
        projectId: serviceAccount.project_id,
      });
    } catch (fileError) {
      console.error('Could not load local serviceAccount.json:', fileError);
      throw new Error('No valid Firebase Admin credentials found');
    }

  } catch (error: any) {
    console.error("CRITICAL ERROR: Failed to initialize Firebase Admin SDK.", error);
    throw new Error(`Could not initialize Firebase Admin SDK: ${error.message}`);
  }
}

// Initialize the app when this module is first loaded
let app: admin.app.App;

try {
  app = initializeFirebaseAdmin();
} catch (error) {
  console.error('Failed to initialize Firebase Admin app:', error);
  throw error;
}

// Export getter functions that return the initialized services
export function getDb(): Firestore {
  return admin.firestore(app);
}

export function getAuth(): Auth {
  return admin.auth(app);
}

// Export app instance
export { app as adminApp };