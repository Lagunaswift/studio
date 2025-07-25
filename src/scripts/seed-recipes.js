// scripts/seed-recipes.ts
import * as admin from 'firebase-admin';
import { config } from 'dotenv';
import path from 'path';
import recipes from './converted_recipes_for_seeding.json';
// Load environment variables from .env file
config({ path: path.resolve(process.cwd(), '.env') });
// --- Initialize Firebase Admin SDK ---
const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_BASE64;
if (!serviceAccountBase64) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY_BASE64 environment variable is not set. The application cannot initialize the admin SDK.');
}
let serviceAccount;
try {
    // Decode the Base64 string back to JSON string, then parse it
    const serviceAccountString = Buffer.from(serviceAccountBase64, 'base64').toString('utf8');
    serviceAccount = JSON.parse(serviceAccountString);
}
catch (error) {
    throw new Error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY_BASE64. Make sure it is a valid Base64 encoded JSON string. Error: ' + error.message);
}
if (!admin.apps.length) {
    try {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            projectId: serviceAccount.project_id,
        });
        console.log("Firebase Admin SDK initialized successfully for seeding.");
    }
    catch (error) {
        console.error("Firebase Admin SDK initialization error:", error);
        process.exit(1);
    }
}
const db = admin.firestore();
const recipesCollection = db.collection('recipes');
async function seedDatabase() {
    if (!recipes || recipes.length === 0) {
        console.log("No recipes found in converted_recipes_for_seeding.json. Exiting.");
        return;
    }
    try {
        console.log('Attempting a minimal test write to Firestore...');
        await db.collection('debug_test').doc('test').set({ hello: 'world' });
        console.log("✅ Minimal test write succeeded!");
    }
    catch (error) {
        console.error('❌ Minimal test write FAILED. This indicates a core connection or permission issue.', error);
        process.exit(1);
    }
    console.log(`Starting to seed ${recipes.length} recipes...`);
    // Firestore allows a maximum of 500 operations in a single batch.
    const batchSize = 100; // Using a smaller batch size for safety
    const totalBatches = Math.ceil(recipes.length / batchSize);
    for (let i = 0; i < recipes.length; i += batchSize) {
        const batch = db.batch();
        const chunk = recipes.slice(i, i + batchSize);
        const batchNumber = Math.floor(i / batchSize) + 1;
        console.log(`Processing batch ${batchNumber}/${totalBatches}...`);
        chunk.forEach((recipe) => {
            // The recipe ID from the JSON file will be used as the document ID in Firestore.
            const docRef = recipesCollection.doc(String(recipe.id));
            batch.set(docRef, {
                ...recipe,
                user_id: null, // Ensure built-in recipes are available to all users
                isCustom: false,
            });
        });
        try {
            await batch.commit();
            console.log(`✅ Batch ${batchNumber} committed successfully.`);
            // Add a small delay between batches to avoid hitting rate limits
            if (batchNumber < totalBatches) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        catch (error) {
            console.error(`❌ Error committing batch ${batchNumber}:`, error);
            // Exit on error to prevent partial writes
            process.exit(1);
        }
    }
    console.log("🎉 Database seeding completed successfully!");
}
seedDatabase().catch((error) => {
    console.error("💥 An error occurred during database seeding:", error);
    process.exit(1);
});
