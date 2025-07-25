import * as admin from 'firebase-admin';
import { config } from 'dotenv';
import path from 'path';
// Load environment variables from .env file
config({ path: path.resolve(process.cwd(), '.env') });
const serviceAccountKeyBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_BASE64;
if (!serviceAccountKeyBase64) {
    console.error('❌ FIREBASE_SERVICE_ACCOUNT_KEY_BASE64 environment variable is not set.');
    process.exit(1);
}
let serviceAccount;
try {
    const serviceAccountString = Buffer.from(serviceAccountKeyBase64, 'base64').toString('utf8');
    serviceAccount = JSON.parse(serviceAccountString);
}
catch (error) {
    console.error('❌ Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY_BASE64. Make sure it is a valid Base64 encoded JSON string. Error: ' + error.message);
    process.exit(1);
}
try {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        // Explicitly setting the projectId to remove any ambiguity
        projectId: serviceAccount.project_id,
    });
    console.log("✅ Firebase Admin SDK initialized successfully for test write.");
}
catch (error) {
    console.error("❌ Firebase Admin SDK initialization error:", error);
    process.exit(1);
}
const db = admin.firestore();
async function testWrite() {
    try {
        console.log(`Attempting to write to collection 'recipes' in project '${serviceAccount.project_id}'...`);
        await db.collection('recipes').doc('test-recipe').set({
            name: 'Test Recipe',
            ingredients: ['test ingredient'],
            steps: ['test step'],
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log('✅ Write succeeded!');
        // Clean up the test document
        await db.collection('recipes').doc('test-recipe').delete();
        console.log('✅ Test document cleaned up.');
        process.exit(0);
    }
    catch (e) {
        console.error('❌ Write failed:', e);
        if (e.code === 5) {
            console.log('\n🔧 Troubleshooting NOT_FOUND error:');
            console.log(`1. Verify the project ID in your service account key ('${serviceAccount.project_id}') matches the project in the Firebase Console.`);
            console.log('2. Ensure the Firestore database has been fully created in that project (not just enabled).');
            console.log('3. Check Firestore security rules to ensure they are not blocking admin writes (though this is rare).');
        }
        process.exit(1);
    }
}
testWrite();
