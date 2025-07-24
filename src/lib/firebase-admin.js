import * as admin from 'firebase-admin';
// This pattern ensures the Admin SDK is initialized only once.
if (!admin.apps.length) {
    try {
        // In a deployed Firebase/Google Cloud environment, the SDK is automatically
        // initialized with default credentials.
        console.log('Initializing Firebase Admin SDK with default credentials...');
        admin.initializeApp();
        console.log('Firebase Admin SDK initialized successfully.');
    }
    catch (error) {
        console.error('Firebase Admin SDK initialization error:', error);
        // For local development, you would typically use a service account key:
        // const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
        // admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
        // Since we are in a managed environment, we rely on default credentials.
    }
}
export const auth = admin.auth();
export const db = admin.firestore();
