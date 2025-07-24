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
} catch (error: any) {
  throw new Error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY_BASE64. Make sure it is a valid Base64 encoded JSON string. Error: ' + error.message);
}

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: `https://${serviceAccount.project_id}.firebaseio.com` // Explicitly set the databaseURL
    });
    console.log("Firebase Admin SDK initialized successfully for seeding.");
  } catch (error: any) {
    console.error("Firebase Admin SDK initialization error:", error);
    process.exit(1);
  }
}

const db = admin.firestore();
const recipesCollection = db.collection('recipes');

async function seedDatabase() {
  if (!recipes || (recipes as any[]).length === 0) {
    console.log("No recipes found in converted_recipes_for_seeding.json. Exiting.");
    return;
  }

  console.log(`Starting to seed ${(recipes as any[]).length} recipes...`);

  // Firestore allows a maximum of 500 operations in a single batch.
  const batchSize = 499;
  for (let i = 0; i < (recipes as any[]).length; i += batchSize) {
    const batch = db.batch();
    const chunk = (recipes as any[]).slice(i, i + batchSize);

    console.log(`Processing batch ${Math.floor(i / batchSize) + 1}...`);

    chunk.forEach((recipe: any) => {
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
      console.log(`Batch ${Math.floor(i / batchSize) + 1} committed successfully.`);
    } catch (error) {
      console.error(`Error committing batch ${Math.floor(i / batchSize) + 1}:`, error);
      // Exit on error to prevent partial writes
      process.exit(1);
    }
  }

  console.log("Database seeding completed successfully!");
}

seedDatabase().catch((error) => {
  console.error("An error occurred during database seeding:", error);
  process.exit(1);
});
