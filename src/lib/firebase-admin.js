
import * as admin from 'firebase-admin';

// This function ensures the Firebase Admin SDK is initialized only once.
function initializeFirebaseAdmin() {
    // Check if the app is already initialized to prevent errors in hot-reload environments.
    if (admin.apps.length > 0) {
        return admin.app();
    }

    const serviceAccountKeyBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_BASE64;

    if (!serviceAccountKeyBase64) {
        // In a deployed environment (like Firebase App Hosting), rely on default credentials
        // if the service account key is not explicitly provided.
        console.log("Service Account Key not found. Attempting to initialize with default credentials...");
        try {
            return admin.initializeApp();
        } catch (error) {
            console.error("CRITICAL ERROR: Default Firebase Admin SDK initialization failed.", error);
            // This is a fatal error for the server, so we re-throw.
            throw new Error("Could not initialize Firebase Admin SDK. Default credentials failed.");
        }
    }

    try {
        // Decode the Base64 string to a standard JSON string, then parse it.
        const serviceAccountJson = Buffer.from(serviceAccountKeyBase64, 'base64').toString('utf-8');
        const serviceAccount = JSON.parse(serviceAccountJson);

        console.log(`Initializing Firebase Admin SDK with explicit Project ID: ${serviceAccount.project_id}`);
        
        return admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
        });
    } catch (error) {
        console.error("CRITICAL ERROR: Failed to parse or initialize with Service Account Key.", error);
        throw new Error("Could not initialize Firebase Admin SDK. Check the format of your service account key in your .env file.");
    }
}

// Initialize the app when this module is first loaded.
const app = initializeFirebaseAdmin();

// Export getter functions that return the initialized services.
export function getDb() {
    return admin.firestore(app);
}

export function getAuth() {
    return admin.auth(app);
}
