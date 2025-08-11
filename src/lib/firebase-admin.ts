// /src/lib/firebase-admin.ts - For server-side usage (API routes, server actions)
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

let adminApp: App;

if (!getApps().length) {
  // Use individual environment variables instead of service account JSON
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  // Only throw error in runtime, not during build
  if (!projectId || !clientEmail || !privateKey) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Missing Firebase configuration: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY are required');
    } else {
      console.warn('Firebase admin configuration incomplete, using default project ID for build');
      adminApp = initializeApp({ 
        projectId: projectId || 'build-placeholder'
      });
    }
  } else {
    const serviceAccount = {
      projectId,
      clientEmail,
      privateKey: privateKey.replace(/\\n/g, '\n'), // Handle newlines properly
    };

    adminApp = initializeApp({
      credential: cert(serviceAccount),
      projectId,
    });
  }
} else {
  adminApp = getApps()[0];
}

export const adminAuth = getAuth(adminApp);
export const adminDb = getFirestore(adminApp);

export function getAdminFirestore() {
    return adminDb;
}
