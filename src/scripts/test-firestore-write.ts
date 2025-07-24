
import * as admin from 'firebase-admin';
import { config } from 'dotenv';
import path from 'path';

// Load environment variables from .env file
config({ path: path.resolve(process.cwd(), '.env') });

const serviceAccountKeyBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_BASE64;

if (!serviceAccountKeyBase64) {
  console.error('FIREBASE_SERVICE_ACCOUNT_KEY_BASE64 environment variable is not set.');
  process.exit(1);
}

let serviceAccount;
try {
  const serviceAccountString = Buffer.from(serviceAccountKeyBase64, 'base64').toString('utf8');
  serviceAccount = JSON.parse(serviceAccountString);
} catch (error: any) {
  console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY_BASE64. Error: ' + error.message);
  process.exit(1);
}

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });
  console.log("Firebase Admin SDK initialized successfully for test write.");
} catch (error: any) {
  console.error("Firebase Admin SDK initialization error:", error);
  process.exit(1);
}

const db = admin.firestore();

async function testWrite() {
  try {
    console.log(`Attempting to write to collection 'test_collection'...`);
    await db.collection('test_collection').doc('hello').set({ msg: 'world' });
    console.log('✅ Write succeeded!');
    process.exit(0);
  } catch (e: any) {
    console.error('❌ Write failed:', e);
    if (e.code === 5) {
      console.log('\n🔧 Troubleshooting NOT_FOUND error:');
      console.log('1. Verify Firebase project ID in configuration matches the console.');
      console.log('2. Check service account key for correctness and permissions.');
      console.log('3. Ensure Firestore database is fully created (not just enabled) in the Firebase Console.');
    }
    process.exit(1);
  }
}

testWrite();
