import * as admin from 'firebase-admin';
import { config } from 'dotenv';
import path from 'path';
// Load .env variables
config({ path: path.resolve(process.cwd(), '.env') });
const serviceAccount = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY_BASE64, 'base64').toString());
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();
async function testWrite() {
    try {
        await db.collection('recipes').doc('test-recipe').set({
            name: 'Test Recipe',
            ingredients: ['test ingredient'],
            steps: ['test step'],
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log('✅ Test write succeeded!');
    }
    catch (error) {
        console.error('❌ Test write failed:', error);
    }
}
testWrite();
