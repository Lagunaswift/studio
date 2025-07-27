
import * as admin from 'firebase-admin';
import type { Auth } from 'firebase-admin/auth';
import type { Firestore } from 'firebase-admin/firestore';
// The path must be relative from this file to the project root.
import serviceAccount from '../../serviceAccount.json';

// This function ensures the Firebase Admin SDK is initialized only once.
function initializeFirebaseAdmin() {
    // Check if the app is already initialized to prevent errors in hot-reload environments.
    if (admin.apps.length > 0) {
        return admin.app();
    }

    // The service account key is imported as a JSON module.
    // We must cast the imported JSON to the ServiceAccount type expected by the SDK.
    const serviceAccountInfo = serviceAccount as admin.ServiceAccount;

    try {
        console.log(`Initializing Firebase Admin SDK with explicit Project ID: ${serviceAccountInfo.project_id}`);

        return admin.initializeApp({
            credential: admin.credential.cert({
                // Spread the existing service account info
                ...serviceAccountInfo,
                // And override the private key with the correctly formatted version
                private_key: serviceAccountInfo.private_key.replace(/
/g, '
'),
            }),
            databaseURL: `https://${serviceAccountInfo.project_id}.firebaseio.com`
        });
    } catch (error: any) {
        console.error("CRITICAL ERROR: Failed to parse or initialize with Service Account Key.", error);
        throw new Error("Could not initialize Firebase Admin SDK. Please check the contents of your serviceAccount.json file and the import path in firebase-admin.ts.");
    }
}

// Initialize the app when this module is first loaded.
const app = initializeFirebaseAdmin();

// Export getter functions that return the initialized services.
export function getDb(): Firestore {
    return admin.firestore(app);
}

export function getAuth(): Auth {
    return admin.auth(app);
}
