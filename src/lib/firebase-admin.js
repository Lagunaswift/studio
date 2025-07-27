
import * as admin from 'firebase-admin';

// This function ensures the Firebase Admin SDK is initialized only once.
function initializeFirebaseAdmin() {
    // If an app is already initialized, return it to prevent re-initialization errors.
    if (admin.apps.length > 0) {
        return admin.apps[0];
    }

    const serviceAccountKeyBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_BASE64;
    
    // In a deployed environment (like Firebase App Hosting), the SDK can initialize
    // without a service key by using default credentials.
    if (!serviceAccountKeyBase64) {
        console.log("Service Account Key not found. Attempting to initialize with default credentials...");
        return admin.initializeApp();
    }

    try {
        const serviceAccountJson = Buffer.from(serviceAccountKeyBase64, 'base64').toString('utf-8');
        const serviceAccount = JSON.parse(serviceAccountJson);
        
        console.log(`Initializing Admin SDK with explicit Project ID: ${serviceAccount.project_id}`);
        
        return admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
        });
    } catch (error) {
        console.error("CRITICAL ERROR: Failed to parse or initialize with Service Account Key.", error);
        // Throwing the error is important to stop a misconfigured server from running.
        throw new Error("Could not initialize Firebase Admin SDK. " + error.message);
    }
}

// Initialize the app immediately when this module is loaded.
const app = initializeFirebaseAdmin();

// Export getter functions that return the initialized services.
export function getDb() {
    return admin.firestore(app);
}

export function getAuth() {
    return admin.auth(app);
}
