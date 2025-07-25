
import * as admin from 'firebase-admin';

function initializeFirebaseAdmin() {
    if (admin.apps.length > 0) {
        return admin.app();
    }
    
    console.log("Attempting to initialize Firebase Admin SDK...");

    const serviceAccountKeyBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_BASE64;
    
    if (serviceAccountKeyBase64) {
        try {
            const serviceAccount = JSON.parse(Buffer.from(serviceAccountKeyBase64, 'base64').toString('utf-8'));
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
            });
            console.log("Firebase Admin SDK initialized with Service Account.");
        } catch (error) {
            console.error("CRITICAL ERROR: Failed to initialize Firebase Admin SDK with Service Account Key.", error.message);
        }
    } else {
        // In a deployed environment (like Firebase App Hosting), rely on default credentials
        console.log("Service Account Key not found. Attempting to initialize with default credentials...");
        try {
            admin.initializeApp();
            console.log("Firebase Admin SDK initialized with default credentials.");
        } catch (error) {
            console.error("CRITICAL ERROR: Default Firebase Admin SDK initialization failed.", error.message);
        }
    }

    return admin.app();
}

let db;
let auth;

export function getDb() {
    if (!db) {
        db = admin.firestore(initializeFirebaseAdmin());
    }
    return db;
}

export function getAuth() {
    if (!auth) {
        auth = admin.auth(initializeFirebaseAdmin());
    }
    return auth;
}
