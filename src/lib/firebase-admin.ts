
import * as admin from 'firebase-admin';
import type { Auth } from 'firebase-admin/auth';
import type { Firestore } from 'firebase-admin/firestore';

let app: admin.app.App;

function initializeFirebaseAdmin() {
    if (admin.apps.length > 0) {
        return admin.apps[0]!;
    }

    console.log("Attempting to initialize Firebase Admin SDK...");

    const serviceAccountKeyBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_BASE64;
    
    if (serviceAccountKeyBase64) {
        try {
            const serviceAccountJson = Buffer.from(serviceAccountKeyBase64, 'base64').toString('utf-8');
            const serviceAccount = JSON.parse(serviceAccountJson);
            
            console.log(`Initializing with explicit Project ID: ${serviceAccount.project_id}`);
            
            app = admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
            });
            console.log("Firebase Admin SDK initialized with Service Account.");
            return app;
        } catch (error: any) {
            console.error("CRITICAL ERROR: Failed to initialize Firebase Admin SDK with Service Account Key.", error);
            throw error; // Re-throw to indicate a fatal error
        }
    } else {
        console.log("Service Account Key not found. Attempting to initialize with default credentials (for deployed environments)...");
        try {
            app = admin.initializeApp();
            console.log("Firebase Admin SDK initialized with default credentials.");
            return app;
        } catch (error: any) {
            console.error("CRITICAL ERROR: Default Firebase Admin SDK initialization failed. This is expected in local dev if the service key is missing, but is a fatal error in production.", error);
            throw error;
        }
    }
}

// Initialize on load.
initializeFirebaseAdmin();

export function getDb(): Firestore {
    if (!admin.apps.length) {
        console.error("getDb called before admin app was initialized.");
        initializeFirebaseAdmin();
    }
    return admin.firestore();
}

export function getAuth(): Auth {
    if (!admin.apps.length) {
        console.error("getAuth called before admin app was initialized.");
        initializeFirebaseAdmin();
    }
    return admin.auth();
}
