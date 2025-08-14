
// src/app/(main)/profile/actions.ts
'use server';
import { optimizedFirestore } from '@/lib/firestore/OptimizedFirestore';
import { revalidatePath } from 'next/cache';
import { serverFirestore } from '@/utils/firestoreRecovery';
import { debugGetUserIdFromToken } from '@/utils/authDebug';
import type { UserProfileSettings, Sex, ActivityLevel } from '@/types';
import { ACTIVITY_LEVEL_OPTIONS } from '@/types';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { mergeWithDefaults } from '@/utils/profileDefaults';
import { migrateEnumValues, validateAndFallbackEnums } from '@/utils/enumMigration';
import { parseIngredientString } from '@/lib/data';

// --- Ingredient Processing Helpers ---
const cleanIngredientName = (name: string): string => {
  if (!name) return '';
  
  let cleaned = name
    .toLowerCase()
    .trim()
    // Remove common prefixes that shouldn't be in ingredient names
    .replace(/^(from\s+\d+\s+|of\s+|½\s*|¼\s*|¾\s*|\d+\/\d+\s*|\/\d+\s*)/g, '')
    // Remove trailing descriptors in parentheses or after commas for most cases
    .replace(/\s*,\s*(peeled|chopped|diced|sliced|minced|halved|quartered).*$/g, '')
    // Clean up common parsing artifacts
    .replace(/\s+fillets?\s+\d+g\s+each.*$/, ' salmon fillets')
    .replace(/\s+whites?$/, ' egg whites')
    .replace(/\s+leaves?$/, ' lettuce')
    .replace(/\s+cloves?,?\s+minced.*$/, ' garlic')
    // Remove leading dots and spaces
    .replace(/^[\s.]+/, '')
    // Remove trailing dots and spaces
    .replace(/[\s.]+$/, '')
    // Convert multiple spaces to single space
    .replace(/\s+/g, ' ')
    .trim();
    
  return cleaned;
};

// Convert recipe quantities to shopping-friendly quantities
const convertToShoppingQuantity = (quantity: number, unit: string, ingredientName: string): { quantity: number; unit: string; name: string } => {
  const name = ingredientName.toLowerCase();
  
  // Lettuce: Convert leaves to heads
  if (name.includes('lettuce') && (unit === 'items' || unit.includes('leaves'))) {
    const heads = Math.ceil(quantity / 8); // ~8 leaves per head
    return { quantity: heads, unit: 'head', name: 'lettuce' };
  }
  
  // Garlic: Convert cloves to bulbs
  if (name.includes('garlic') && (unit === 'items' || unit.includes('cloves'))) {
    const bulbs = Math.ceil(quantity / 6); // ~6 cloves per bulb
    return { quantity: bulbs, unit: 'bulb', name: 'garlic' };
  }
  
  // Eggs: Always round up to whole eggs, combine different types
  if (name.includes('egg') && !name.includes('plant')) {
    const totalEggs = Math.ceil(quantity);
    return { quantity: totalEggs, unit: 'large', name: 'eggs' };
  }
  
  // Onions: Convert fractional onions to whole onions
  if (name.includes('onion') && quantity < 1) {
    return { quantity: 1, unit: 'medium', name: name.includes('red') ? 'red onions' : 'onions' };
  }
  
  // Potatoes: Convert grams to approximate count
  if (name.includes('potato') && unit === 'grams') {
    const count = Math.ceil(quantity / 150); // ~150g per medium potato
    return { quantity: count, unit: 'medium', name: name.includes('sweet') ? 'sweet potatoes' : 'potatoes' };
  }
  
  // Tomatoes: Cherry tomatoes by container
  if (name.includes('tomato') && name.includes('cherry')) {
    const containers = Math.ceil(quantity / 20); // ~20 cherry tomatoes per container
    return { quantity: containers, unit: 'container', name: 'cherry tomatoes' };
  }
  
  // Lemons/Limes: Always whole fruits
  if (name.includes('lemon') || name.includes('lime')) {
    const count = Math.ceil(quantity);
    return { quantity: count, unit: 'whole', name: name.includes('lemon') ? 'lemons' : 'limes' };
  }
  
  // Milk alternatives: Convert small amounts to standard carton
  if (name.includes('almond milk') || name.includes('oat milk') || name.includes('soy milk')) {
    const liters = Math.max(1, Math.ceil(quantity * 0.25)); // Min 1L carton
    return { quantity: liters, unit: 'liter', name: name };
  }
  
  // Oils: Convert small amounts to standard bottle
  if (name.includes('olive oil') || name.includes('coconut oil')) {
    const bottles = Math.max(0.5, Math.ceil(quantity / 500)); // 500ml standard bottle
    return { quantity: bottles, unit: 'bottle', name: name };
  }
  
  // Spices and small quantities: Always minimum package
  if (unit.includes('tsp') || unit.includes('tbsp') || unit.includes('pinch')) {
    return { quantity: 1, unit: 'package', name: name };
  }
  
  // Small gram quantities: Convert to reasonable package sizes
  if (unit === 'grams' && quantity < 50) {
    return { quantity: 1, unit: 'package', name: name };
  }
  
  // Large gram quantities: Convert to kg or standard packages
  if (unit === 'grams' && quantity > 500) {
    const kg = Math.ceil(quantity / 1000);
    return { quantity: kg, unit: 'kg', name: name };
  }
  
  // Default: return as-is but with cleaned values
  return { 
    quantity: Math.max(0.1, Math.round(quantity * 10) / 10), // Round to 1 decimal
    unit: unit, 
    name: ingredientName 
  };
};

const normalizeUnit = (unit: string): string => {
  if (!unit) return 'items';
  
  const unitMap: { [key: string]: string } = {
    'tbsp': 'tablespoon',
    'tsp': 'teaspoon',
    'g': 'grams',
    'kg': 'kilograms',
    'ml': 'milliliters',
    'l': 'liters',
    'oz': 'ounces',
    'lb': 'pounds',
    'cups': 'cup',
    'pinch': 'pinch',
    'pinches': 'pinch'
  };
  
  const normalized = unit.toLowerCase().trim();
  return unitMap[normalized] || normalized || 'items';
};

const categorizeIngredient = (ingredientName: string): string => {
  const name = ingredientName.toLowerCase();
  
  // Produce & Fresh
  if (name.match(/\b(potato|tomato|onion|garlic|lettuce|spinach|carrot|bell pepper|avocado|lemon|apple|banana|asparagus|sweet potato|cherry|broccoli|cucumber|celery|zucchini|lime|orange|grapefruit|grapes|strawberries|blueberries|mushroom|corn|peas|green beans)\b/)) {
    return 'Produce';
  }
  
  // Proteins & Meat  
  if (name.match(/\b(chicken|beef|pork|salmon|tuna|turkey|fish|meat|fillet|ground beef|ground turkey|bacon|ham|sausage|shrimp|crab|lobster)\b/)) {
    return 'Meat & Seafood';
  }
  
  // Eggs (separate from other dairy for shopping convenience)
  if (name.match(/\b(eggs|egg whites|egg white|large eggs)\b/)) {
    return 'Dairy & Eggs';
  }
  
  // Dairy
  if (name.match(/\b(milk|cheese|butter|yogurt|cream|sour cream|cottage cheese|cheddar|mozzarella|parmesan|almond milk|oat milk|soy milk)\b/)) {
    return 'Dairy & Eggs';
  }
  
  // Pantry & Dry Goods
  if (name.match(/\b(flour|sugar|salt|pepper|oil|vinegar|baking|spice|seasoning|powder|seeds|nuts|oats|rice|pasta|beans|lentils|quinoa|coconut|chia|flax|vanilla|cinnamon|paprika|cumin|oregano|basil|thyme|rosemary)\b/)) {
    return 'Pantry';
  }
  
  // Condiments & Sauces
  if (name.match(/\b(sauce|dressing|mustard|ketchup|mayo|honey|syrup|puree|paste|jam|jelly|peanut butter|almond butter|tahini)\b/)) {
    return 'Condiments';
  }
  
  // Frozen
  if (name.match(/\b(frozen)\b/)) {
    return 'Frozen';
  }
  
  // Bakery
  if (name.match(/\b(bread|roll|bagel|muffin|croissant|bun|tortilla|pita|naan)\b/)) {
    return 'Bakery';
  }
  
  // Beverages
  if (name.match(/\b(juice|water|soda|tea|coffee|wine|beer)\b/)) {
    return 'Beverages';
  }
  
  return 'Other';
};

// --- Calculation Helpers ---
const calculateLBM = (weightKg: number | null, bodyFatPercentage: number | null): number | null => {
  if (weightKg && weightKg > 0 && bodyFatPercentage && bodyFatPercentage > 0 && bodyFatPercentage < 100) {
    const lbm = weightKg * (1 - bodyFatPercentage / 100);
    if (isNaN(lbm) || !isFinite(lbm) || lbm <= 0) return null;
    return parseFloat(lbm.toFixed(1));
  }
  return null;
};

const calculateTDEE = (
  weightKg: number | null,
  heightCm: number | null,
  age: number | null,
  sex: Sex | null,
  activityLevel: ActivityLevel | null
): number | null => {
  if (!weightKg || !heightCm || !age || !sex || !activityLevel) return null;
  let bmr: number;
  if (sex === 'male') bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  else bmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
  const activity = ACTIVITY_LEVEL_OPTIONS.find(opt => opt.value === activityLevel);
  if (activity) {
    const tdee = bmr * activity.multiplier;
    if (isNaN(tdee) || !isFinite(tdee) || tdee <= 0) return null;
    return Math.round(tdee);
  }
  return null;
};

export async function reportBug(description: string, userId: string) {
  try {
    await adminDb.collection('bug_reports').add({
      description,
      userId,
      createdAt: FieldValue.serverTimestamp(),
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getUserIdFromToken(idToken: string): Promise<string> {
  return await debugGetUserIdFromToken(idToken);
}

export async function updateUserProfile(
  userId: string, 
  updates: Partial<UserProfileSettings>
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('🔄 Optimized profile update:', { userId, updates });
    
    // Get existing profile with caching
    const existingProfile = await optimizedFirestore.getDocument<UserProfileSettings>(
      `profiles/${userId}`,
      5 * 60 * 1000 // 5 minute cache
    );
    
    // Apply enum migrations and validation
    const existingData = existingProfile || {};
    const migratedData = migrateEnumValues(existingData as any);
    const migratedUpdates = migrateEnumValues(updates);
    
    const mergedData = { ...migratedData, ...migratedUpdates };
    const validatedData = validateAndFallbackEnums(mergedData);
    const completeProfileData = mergeWithDefaults(validatedData, userId);
    
    // Recalculate derived values
    completeProfileData.tdee = calculateTDEE(
      completeProfileData.weightKg,
      completeProfileData.heightCm,
      completeProfileData.age,
      completeProfileData.sex,
      completeProfileData.activityLevel
    );
    
    completeProfileData.leanBodyMassKg = calculateLBM(
      completeProfileData.weightKg,
      completeProfileData.bodyFatPercentage
    );
    
    // Use batch write for performance
    optimizedFirestore.batchWrite(`profiles/${userId}`, completeProfileData, 'set');
    
    // Commit immediately for profile updates (critical data)
    await optimizedFirestore.flushBatch();
    
    // Revalidate cache
    revalidatePath('/profile', 'layout');
    revalidatePath('/', 'layout');
    
    return { success: true };

  } catch (error: any) {
    console.error('❌ Optimized profile update failed:', error);
    return { 
      success: false, 
      error: `Profile update failed: ${error.message}` 
    };
  }
}

// Batch multiple profile updates
export async function batchUpdateUserProfile(
  userId: string,
  updates: Array<{ field: string; value: any }>
): Promise<{ success: boolean; error?: string }> {
  try {
    // Combine all updates into single object
    const combinedUpdates = updates.reduce((acc, update) => {
      acc[update.field] = update.value;
      return acc;
    }, {} as any);
    
    // Single batch operation instead of multiple individual updates
    return await updateUserProfile(userId, combinedUpdates);
    
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// DAILY MEAL PLAN FUNCTIONS (New Structure: One Document Per Day)
export async function setDailyMealPlan(idToken: string, date: string, meals: any[]) {
  try {
    const decodedToken = await serverFirestore.verifyToken(idToken);
    const userId = decodedToken.uid;
    
    const dailyMealPlanRef = adminDb.collection('profiles').doc(userId).collection('dailyMealPlans').doc(date);
    
    await dailyMealPlanRef.set({
      date,
      meals: meals || [],
      updatedAt: FieldValue.serverTimestamp(),
    });
    
    revalidatePath('/meal-plan');
    return { success: true };
  } catch (error: any) {
    console.error('setDailyMealPlan error:', {
      code: error.code,
      message: error.message,
      stack: error.stack,
    });
    return { success: false, error: `Could not set daily meal plan: ${error.message}` };
  }
}

export async function addMealToDay(idToken: string, date: string, meal: any) {
  try {
    const decodedToken = await serverFirestore.verifyToken(idToken);
    const userId = decodedToken.uid;
    
    const dailyMealPlanRef = adminDb.collection('profiles').doc(userId).collection('dailyMealPlans').doc(date);
    const doc = await dailyMealPlanRef.get();
    
    let currentMeals = [];
    if (doc.exists()) {
      currentMeals = doc.data()?.meals || [];
    }
    
    // Add unique ID to meal if it doesn't have one
    if (!meal.id) {
      meal.id = `meal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    
    currentMeals.push(meal);
    
    await dailyMealPlanRef.set({
      date,
      meals: currentMeals,
      updatedAt: FieldValue.serverTimestamp(),
    });
    
    revalidatePath('/meal-plan');
    return { success: true, mealId: meal.id };
  } catch (error: any) {
    console.error('addMealToDay error:', {
      code: error.code,
      message: error.message,
      stack: error.stack,
    });
    return { success: false, error: `Could not add meal to day: ${error.message}` };
  }
}

export async function updateMealInDay(idToken: string, date: string, mealId: string, updates: any) {
  try {
    const decodedToken = await serverFirestore.verifyToken(idToken);
    const userId = decodedToken.uid;
    
    const dailyMealPlanRef = adminDb.collection('profiles').doc(userId).collection('dailyMealPlans').doc(date);
    const doc = await dailyMealPlanRef.get();
    
    if (!doc.exists()) {
      return { success: false, error: 'No meals found for this date' };
    }
    
    const currentMeals = doc.data()?.meals || [];
    const updatedMeals = currentMeals.map((meal: any) => 
      meal.id === mealId ? { ...meal, ...updates } : meal
    );
    
    await dailyMealPlanRef.set({
      date,
      meals: updatedMeals,
      updatedAt: FieldValue.serverTimestamp(),
    });
    
    revalidatePath('/meal-plan');
    return { success: true };
  } catch (error: any) {
    console.error('updateMealInDay error:', {
      code: error.code,
      message: error.message,
      stack: error.stack,
    });
    return { success: false, error: `Could not update meal: ${error.message}` };
  }
}

export async function removeMealFromDay(idToken: string, date: string, mealId: string) {
  try {
    const decodedToken = await serverFirestore.verifyToken(idToken);
    const userId = decodedToken.uid;
    
    const dailyMealPlanRef = adminDb.collection('profiles').doc(userId).collection('dailyMealPlans').doc(date);
    const doc = await dailyMealPlanRef.get();
    
    if (!doc.exists()) {
      return { success: false, error: 'No meals found for this date' };
    }
    
    const currentMeals = doc.data()?.meals || [];
    const filteredMeals = currentMeals.filter((meal: any) => meal.id !== mealId);
    
    await dailyMealPlanRef.set({
      date,
      meals: filteredMeals,
      updatedAt: FieldValue.serverTimestamp(),
    });
    
    revalidatePath('/meal-plan');
    return { success: true };
  } catch (error: any) {
    console.error('removeMealFromDay error:', {
      code: error.code,
      message: error.message,
      stack: error.stack,
    });
    return { success: false, error: `Could not remove meal: ${error.message}` };
  }
}

export async function clearDailyMealPlan(idToken: string, date: string) {
  try {
    const decodedToken = await serverFirestore.verifyToken(idToken);
    const userId = decodedToken.uid;
    
    const dailyMealPlanRef = adminDb.collection('profiles').doc(userId).collection('dailyMealPlans').doc(date);
    
    await dailyMealPlanRef.set({
      date,
      meals: [],
      updatedAt: FieldValue.serverTimestamp(),
    });
    
    revalidatePath('/meal-plan');
    return { success: true };
  } catch (error: any) {
    console.error('clearDailyMealPlan error:', {
      code: error.code,
      message: error.message,
      stack: error.stack,
    });
    return { success: false, error: `Could not clear daily meal plan: ${error.message}` };
  }
}

// LEGACY MEAL PLAN FUNCTIONS (Old Structure: Individual Meals)
export async function addOrUpdateMealPlan(idToken: string, mealData: any) {
  try {
    const decodedToken = await serverFirestore.verifyToken(idToken);
    const userId = decodedToken.uid;
    
    const mealPlanRef = adminDb.collection('profiles').doc(userId).collection('mealPlan');
    
    if (mealData.id) {
      // Update existing meal
      await mealPlanRef.doc(mealData.id).update({
        ...mealData,
        updatedAt: FieldValue.serverTimestamp(),
      });
    } else {
      // Add new meal
      await mealPlanRef.add({
        ...mealData,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    
    revalidatePath('/meal-plan');
    return { success: true };
  } catch (error: any) {
    console.error('addOrUpdateMealPlan error:', {
      code: error.code,
      message: error.message,
      stack: error.stack,
    });
    return { success: false, error: `Could not save meal plan: ${error.message}` };
  }
}

export async function deleteMealFromPlan(idToken: string, mealId: string) {
  try {
    const decodedToken = await serverFirestore.verifyToken(idToken);
    const userId = decodedToken.uid;
    await adminDb.collection('profiles').doc(userId).collection('mealPlan').doc(mealId).delete();
    revalidatePath('/meal-plan');
    return { success: true };
  } catch (error: any) {
    console.error('deleteMealFromPlan error:', {
      code: error.code,
      message: error.message,
      stack: error.stack,
    });
    return { success: false, error: `Could not delete meal: ${error.message}` };
  }
}

export async function clearDayMealPlan(idToken: string, date: string) {
  try {
    const decodedToken = await serverFirestore.verifyToken(idToken);
    const userId = decodedToken.uid;
    
    // Get all meals for the specific date
    const mealPlanRef = adminDb.collection('profiles').doc(userId).collection('mealPlan');
    const snapshot = await mealPlanRef.where('date', '==', date).get();
    
    // Delete all meals for this date
    const batch = adminDb.batch();
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    revalidatePath('/meal-plan');
    return { success: true, deletedCount: snapshot.docs.length };
  } catch (error: any) {
    console.error('clearDayMealPlan error:', {
      code: error.code,
      message: error.message,
      stack: error.stack,
    });
    return { success: false, error: `Could not clear meal plan: ${error.message}` };
  }
}

export async function clearAllMealPlan(idToken: string) {
  try {
    const decodedToken = await serverFirestore.verifyToken(idToken);
    const userId = decodedToken.uid;
    
    // Get ALL meals in the meal plan
    const mealPlanRef = adminDb.collection('profiles').doc(userId).collection('mealPlan');
    const snapshot = await mealPlanRef.get();
    
    console.log(`Found ${snapshot.docs.length} meals to delete for user ${userId}`);
    
    // Delete all meals
    const batch = adminDb.batch();
    snapshot.docs.forEach(doc => {
      console.log(`Deleting meal: ${doc.id}`, doc.data());
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    revalidatePath('/meal-plan');
    revalidatePath('/shopping-list');
    
    return { success: true, deletedCount: snapshot.docs.length };
  } catch (error: any) {
    console.error('clearAllMealPlan error:', {
      code: error.code,
      message: error.message,
      stack: error.stack,
    });
    return { success: false, error: `Could not clear all meal plan: ${error.message}` };
  }
}

export async function debugMealPlan(idToken: string) {
  try {
    const decodedToken = await serverFirestore.verifyToken(idToken);
    const userId = decodedToken.uid;
    
    // Get ALL meals in the meal plan
    const mealPlanRef = adminDb.collection('profiles').doc(userId).collection('mealPlan');
    const snapshot = await mealPlanRef.get();
    
    const meals = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Group by date for easier analysis
    const mealsByDate = meals.reduce((acc, meal) => {
      const date = meal.date || 'no-date';
      if (!acc[date]) acc[date] = [];
      acc[date].push(meal);
      return acc;
    }, {} as any);
    
    console.log('Meal Plan Debug:', {
      totalMeals: meals.length,
      mealsByDate: Object.keys(mealsByDate).map(date => ({
        date,
        count: mealsByDate[date].length,
        meals: mealsByDate[date].map((m: any) => ({
          id: m.id,
          recipeId: m.recipeId,
          mealType: m.mealType,
          servings: m.servings,
          status: m.status
        }))
      }))
    });
    
    return { 
      success: true, 
      totalMeals: meals.length,
      mealsByDate: Object.keys(mealsByDate).length,
      meals 
    };
  } catch (error: any) {
    console.error('debugMealPlan error:', {
      code: error.code,
      message: error.message,
      stack: error.stack,
    });
    return { success: false, error: `Could not debug meal plan: ${error.message}` };
  }
}

// SHOPPING LIST FUNCTIONS
export async function addOrUpdateShoppingListItem(idToken: string, itemData: any) {
  try {
    const decodedToken = await serverFirestore.verifyToken(idToken);
    const userId = decodedToken.uid;
    
    const shoppingListRef = adminDb.collection('profiles').doc(userId).collection('shoppingList');
    
    if (itemData.id) {
      // Update existing item
      await shoppingListRef.doc(itemData.id).update({
        ...itemData,
        updatedAt: FieldValue.serverTimestamp(),
      });
    } else {
      // Add new item
      await shoppingListRef.add({
        ...itemData,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    
    revalidatePath('/shopping-list');
    return { success: true };
  } catch (error: any) {
    console.error('addOrUpdateShoppingListItem error:', {
      code: error.code,
      message: error.message,
      stack: error.stack,
    });
    return { success: false, error: `Could not save shopping list item: ${error.message}` };
  }
}

export async function deleteShoppingListItem(idToken: string, itemId: string) {
  try {
    const decodedToken = await serverFirestore.verifyToken(idToken);
    const userId = decodedToken.uid;
    await adminDb.collection('profiles').doc(userId).collection('shoppingList').doc(itemId).delete();
    revalidatePath('/shopping-list');
    return { success: true };
  } catch (error: any) {
    console.error('deleteShoppingListItem error:', {
      code: error.code,
      message: error.message,
      stack: error.stack,
    });
    return { success: false, error: `Could not delete shopping list item: ${error.message}` };
  }
}

export async function updateShoppingListItemStatus(idToken: string, itemId: string, purchased: boolean) {
  try {
    const decodedToken = await serverFirestore.verifyToken(idToken);
    const userId = decodedToken.uid;
    
    await adminDb.collection('profiles').doc(userId).collection('shoppingList').doc(itemId).update({
      purchased,
      updatedAt: FieldValue.serverTimestamp(),
    });
    
    revalidatePath('/shopping-list');
    return { success: true };
  } catch (error: any) {
    console.error('updateShoppingListItemStatus error:', {
      code: error.code,
      message: error.message,
      stack: error.stack,
    });
    return { success: false, error: `Could not update item status: ${error.message}` };
  }
}

export async function clearShoppingList(idToken: string) {
  try {
    const decodedToken = await serverFirestore.verifyToken(idToken);
    const userId = decodedToken.uid;
    
    // Get all shopping list items
    const shoppingListRef = adminDb.collection('profiles').doc(userId).collection('shoppingList');
    const snapshot = await shoppingListRef.get();
    
    // Delete all items
    const batch = adminDb.batch();
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    revalidatePath('/shopping-list');
    return { success: true, deletedCount: snapshot.docs.length };
  } catch (error: any) {
    console.error('clearShoppingList error:', {
      code: error.code,
      message: error.message,
      stack: error.stack,
    });
    return { success: false, error: `Could not clear shopping list: ${error.message}` };
  }
}

export async function generateShoppingListFromMealPlan(idToken: string) {
  try {
    const decodedToken = await serverFirestore.verifyToken(idToken);
    const userId = decodedToken.uid;
    
    // Get current meal plan from daily meal plans
    const dailyMealPlansRef = adminDb.collection('profiles').doc(userId).collection('dailyMealPlans');
    const dailyMealPlansSnapshot = await dailyMealPlansRef.get();
    
    console.log(`🍽️ Shopping list generation for user ${userId}:`);
    console.log(`📅 Found ${dailyMealPlansSnapshot.docs.length} daily meal plan documents`);
    
    // Aggregate all meals from all daily meal plans
    const mealPlan: any[] = [];
    dailyMealPlansSnapshot.docs.forEach(doc => {
      const dailyData = doc.data();
      console.log(`📋 Processing daily plan ${doc.id}:`, { 
        date: dailyData.date, 
        mealsCount: dailyData.meals?.length || 0,
        meals: dailyData.meals 
      });
      
      if (dailyData.meals && Array.isArray(dailyData.meals)) {
        dailyData.meals.forEach((meal: any) => {
          mealPlan.push({
            ...meal,
            date: dailyData.date || doc.id // Use document date or document ID as fallback
          });
        });
      }
    });
    
    console.log(`🥘 Total aggregated meals from daily plans: ${mealPlan.length}`, mealPlan);
    
    // FALLBACK: If no meals found in new structure, try old structure for backwards compatibility
    if (mealPlan.length === 0) {
      console.log('🔄 No meals found in new daily structure, checking old meal plan structure...');
      const oldMealPlanRef = adminDb.collection('profiles').doc(userId).collection('mealPlan');
      const oldMealPlanSnapshot = await oldMealPlanRef.get();
      const oldMeals = oldMealPlanSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      console.log(`📋 Found ${oldMeals.length} meals in old structure`);
      mealPlan.push(...oldMeals);
    }
    
    console.log(`🥘 Final total meals for shopping list: ${mealPlan.length}`);
    
    // Get all recipes (built-in + user recipes)
    const builtInRecipesSnapshot = await adminDb.collection('recipes').get();
    const userRecipesSnapshot = await adminDb.collection('profiles').doc(userId).collection('recipes').get();
    const allRecipes = [
      ...builtInRecipesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
      ...userRecipesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    ];
    
    // Get pantry items
    const pantrySnapshot = await adminDb.collection('profiles').doc(userId).collection('pantry').get();
    const pantryItems = pantrySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Clear existing shopping list
    const shoppingListRef = adminDb.collection('profiles').doc(userId).collection('shoppingList');
    const existingSnapshot = await shoppingListRef.get();
    const batch = adminDb.batch();
    existingSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    // Generate new shopping list from meal plan
    const requiredIngredients: { [key: string]: { name: string; quantity: number; unit: string; recipes: any[] } } = {};
    
    mealPlan.forEach(meal => {
      const recipe = allRecipes.find(r => r.id == meal.recipeId);
      if (recipe && recipe.ingredients) {
        recipe.ingredients.forEach(ing => {
          const ingStr = typeof ing === 'string' ? ing : `${ing.quantity} ${ing.unit} ${ing.name}`;
          
          // Enhanced ingredient parsing
          const parsedIngredient = parseIngredientString(ingStr);
          console.log('🥕 Parsing ingredient:', { original: ingStr, parsed: parsedIngredient });
          
          if (parsedIngredient && parsedIngredient.name && parsedIngredient.name !== 'non-item') {
            // Clean up the ingredient name
            let cleanName = cleanIngredientName(parsedIngredient.name);
            let cleanUnit = normalizeUnit(parsedIngredient.unit);
            
            // Skip if name is too short or invalid
            if (cleanName.length < 2) {
              console.log('⚠️ Skipping invalid ingredient name:', cleanName);
              return;
            }
            
            // Calculate scaled quantity first
            const scaledQuantity = (parsedIngredient.quantity / (recipe.servings || 1)) * (meal.servings || 1);
            
            // Convert to shopping-friendly quantities
            const shoppingQuantity = convertToShoppingQuantity(scaledQuantity, cleanUnit, cleanName);
            console.log('🛒 Shopping conversion:', { 
              original: { name: cleanName, quantity: scaledQuantity, unit: cleanUnit },
              shopping: shoppingQuantity 
            });
            
            const key = `${shoppingQuantity.name}-${shoppingQuantity.unit}`;
            
            if (!requiredIngredients[key]) {
              requiredIngredients[key] = {
                name: shoppingQuantity.name,
                quantity: 0,
                unit: shoppingQuantity.unit,
                recipes: []
              };
            }
            
            // For items that should be whole units, take the max rather than adding
            if (shoppingQuantity.unit === 'head' || shoppingQuantity.unit === 'bulb' || shoppingQuantity.unit === 'bottle' || shoppingQuantity.unit === 'package') {
              requiredIngredients[key].quantity = Math.max(requiredIngredients[key].quantity, shoppingQuantity.quantity);
            } else {
              requiredIngredients[key].quantity += shoppingQuantity.quantity;
            }
            
            requiredIngredients[key].recipes.push({
              recipeId: meal.recipeId,
              recipeName: recipe.name,
              plannedMealId: meal.id
            });
          }
        });
      }
    });
    
    // Create shopping list items, considering pantry
    for (const [key, ingredient] of Object.entries(requiredIngredients)) {
      const pantryItem = pantryItems.find(p => 
        p.name?.toLowerCase().trim() === ingredient.name && 
        p.unit === ingredient.unit
      );
      
      const neededQuantity = ingredient.quantity - (pantryItem?.quantity || 0);
      
      if (neededQuantity > 0) {
        const newItemRef = shoppingListRef.doc();
        batch.set(newItemRef, {
          name: ingredient.name,
          quantity: parseFloat(neededQuantity.toFixed(2)),
          unit: ingredient.unit,
          category: categorizeIngredient(ingredient.name),
          purchased: false,
          recipes: ingredient.recipes,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    }
    
    await batch.commit();
    revalidatePath('/shopping-list');
    
    return { 
      success: true, 
      itemsGenerated: Object.keys(requiredIngredients).length,
      mealsProcessed: mealPlan.length 
    };
  } catch (error: any) {
    console.error('generateShoppingListFromMealPlan error:', {
      code: error.code,
      message: error.message,
      stack: error.stack,
    });
    return { success: false, error: `Could not generate shopping list: ${error.message}` };
  }
}

// PANTRY FUNCTIONS
export async function addOrUpdatePantryItem(idToken: string, itemData: any) {
  try {
    const decodedToken = await serverFirestore.verifyToken(idToken);
    const userId = decodedToken.uid;
    
    const pantryRef = adminDb.collection('profiles').doc(userId).collection('pantry');
    
    if (itemData.id) {
      // Update existing item
      await pantryRef.doc(itemData.id).update({
        ...itemData,
        updatedAt: FieldValue.serverTimestamp(),
      });
    } else {
      // Add new item
      await pantryRef.add({
        ...itemData,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    
    revalidatePath('/pantry');
    return { success: true };
  } catch (error: any) {
    console.error('addOrUpdatePantryItem error:', {
      code: error.code,
      message: error.message,
      stack: error.stack,
    });
    return { success: false, error: `Could not save pantry item: ${error.message}` };
  }
}

export async function deletePantryItem(idToken: string, itemId: string) {
  try {
    const decodedToken = await serverFirestore.verifyToken(idToken);
    const userId = decodedToken.uid;
    await adminDb.collection('profiles').doc(userId).collection('pantry').doc(itemId).delete();
    revalidatePath('/pantry');
    return { success: true };
  } catch (error: any) {
    console.error('deletePantryItem error:', {
      code: error.code,
      message: error.message,
      stack: error.stack,
    });
    return { success: false, error: `Could not delete pantry item: ${error.message}` };
  }
}

// RECIPE FUNCTIONS
export async function addRecipe(idToken: string, recipeData: any) {
  try {
    const decodedToken = await serverFirestore.verifyToken(idToken);
    const userId = decodedToken.uid;
    
    const recipesRef = adminDb.collection('profiles').doc(userId).collection('recipes');
    
    const docRef = await recipesRef.add({
      ...recipeData,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    
    revalidatePath('/recipes');
    return { success: true, id: docRef.id };
  } catch (error: any) {
    console.error('addRecipe error:', {
      code: error.code,
      message: error.message,
      stack: error.stack,
    });
    return { success: false, error: `Could not add recipe: ${error.message}` };
  }
}

// VITALS LOG FUNCTIONS
export async function addOrUpdateVitalsLog(idToken: string, vitalsData: any) {
  try {
    const decodedToken = await serverFirestore.verifyToken(idToken);
    const userId = decodedToken.uid;
    
    const vitalsRef = adminDb.collection('profiles').doc(userId).collection('vitalsLogs');
    
    if (vitalsData.id) {
      // Update existing log
      await vitalsRef.doc(vitalsData.id).update({
        ...vitalsData,
        updatedAt: FieldValue.serverTimestamp(),
      });
    } else {
      // Add new log
      await vitalsRef.add({
        ...vitalsData,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    
    revalidatePath('/vitals');
    return { success: true };
  } catch (error: any) {
    console.error('addOrUpdateVitalsLog error:', {
      code: error.code,
      message: error.message,
      stack: error.stack,
    });
    return { success: false, error: `Could not save vitals log: ${error.message}` };
  }
}

// WEIGHT LOG FUNCTIONS
export async function addOrUpdateWeightLog(idToken: string, weightData: any) {
  try {
    const decodedToken = await serverFirestore.verifyToken(idToken);
    const userId = decodedToken.uid;
    
    const weightRef = adminDb.collection('profiles').doc(userId).collection('weightLogs');
    
    if (weightData.id) {
      // Update existing log
      await weightRef.doc(weightData.id).update({
        ...weightData,
        updatedAt: FieldValue.serverTimestamp(),
      });
    } else {
      // Add new log
      await weightRef.add({
        ...weightData,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    
    revalidatePath('/weight');
    return { success: true };
  } catch (error: any) {
    console.error('addOrUpdateWeightLog error:', {
      code: error.code,
      message: error.message,
      stack: error.stack,
    });
    return { success: false, error: `Could not save weight log: ${error.message}` };
  }
}

// MANUAL MACROS LOG FUNCTIONS
export async function addOrUpdateManualMacrosLog(idToken: string, macrosData: any) {
  try {
    const decodedToken = await serverFirestore.verifyToken(idToken);
    const userId = decodedToken.uid;
    
    const macrosRef = adminDb.collection('profiles').doc(userId).collection('manualMacrosLogs');
    
    if (macrosData.id) {
      // Update existing log
      await macrosRef.doc(macrosData.id).update({
        ...macrosData,
        updatedAt: FieldValue.serverTimestamp(),
      });
    } else {
      // Add new log
      await macrosRef.add({
        ...macrosData,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    
    revalidatePath('/macros');
    return { success: true };
  } catch (error: any) {
    console.error('addOrUpdateManualMacrosLog error:', {
      code: error.code,
      message: error.message,
      stack: error.stack,
    });
    return { success: false, error: `Could not save manual macros log: ${error.message}` };
  }
}
