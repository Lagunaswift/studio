
// scripts/seed-recipes.ts
import { getDb } from '@/lib/firebase-admin';
import recipes from './converted_recipes_for_seeding.json';

async function seedDatabase() {
  const db = getDb(); // Safely get the initialized DB instance
  const recipesCollection = db.collection('recipes');

  if (!recipes || (recipes as any[]).length === 0) {
    console.log("No recipes found in converted_recipes_for_seeding.json. Exiting.");
    return;
  }
  
  try {
    console.log('Attempting a minimal test write to Firestore...');
    const testDocRef = db.collection('debug_test').doc('test-write');
    await testDocRef.set({ hello: 'world', timestamp: new Date() });
    await testDocRef.delete();
    console.log("✅ Minimal test write/delete succeeded!");
  } catch(error) {
    console.error('❌ Minimal test write FAILED. This indicates a core connection or permission issue.', error);
    process.exit(1);
  }

  console.log(`Starting to seed ${(recipes as any[]).length} recipes...`);

  // Firestore allows a maximum of 500 operations in a single batch.
  const batchSize = 100; // Using a smaller batch size for safety
  const totalBatches = Math.ceil((recipes as any[]).length / batchSize);

  for (let i = 0; i < (recipes as any[]).length; i += batchSize) {
    const batch = db.batch();
    const chunk = (recipes as any[]).slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;

    console.log(`Processing batch ${batchNumber}/${totalBatches}...`);

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
      console.log(`✅ Batch ${batchNumber} committed successfully.`);
       // Add a small delay between batches to avoid hitting rate limits
      if (batchNumber < totalBatches) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
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
