
// src/app/(main)/profile/actions.ts
'use server';
import { optimizedFirestore } from '@/lib/firestore/OptimizedFirestore';
import { revalidatePath } from 'next/cache';
import { serverFirestore } from '@/utils/firestoreRecovery';
import { debugGetUserIdFromToken } from '@/utils/authDebug';
import type { UserProfileSettings, Sex, ActivityLevel } from '@/types';
import { ACTIVITY_LEVEL_OPTIONS } from '@/types';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { mergeWithDefaults } from '@/utils/profileDefaults';
import { migrateEnumValues, validateAndFallbackEnums } from '@/utils/enumMigration';
import { parseIngredientString, normalizeIngredientName, normalizeUnit, roundQuantityForShopping, generateConsolidationKey, assignCategory } from '@/lib/data';

// Helper function for token verification
async function verifyTokenAndGetUserId(idToken: string): Promise<string> {
  if (!idToken) {
    throw new Error('No authentication token provided');
  }

  try {
    console.log('🔐 Starting token verification...');
    
    // Check if adminAuth is available
    if (!adminAuth) {
      console.error('❌ adminAuth is not available');
      throw new Error('Firebase Admin Auth not initialized');
    }

    const cleanToken = idToken.replace(/^Bearer\s+/i, '');
    console.log('🎫 Token cleaned, length:', cleanToken.length);
    
    // Additional debugging for Firebase Admin state
    const { getApps } = await import('firebase-admin/app');
    console.log('🔧 Firebase Admin apps count:', getApps().length);
    
    // Try token verification with revocation check first
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(cleanToken, true);
      console.log('✅ Token verified with revocation check for user:', decodedToken.uid);
    } catch (revocationError: any) {
      console.warn('⚠️ Token verification with revocation check failed, trying without revocation check:', revocationError.message);
      
      // Fallback: verify without revocation check
      try {
        decodedToken = await adminAuth.verifyIdToken(cleanToken, false);
        console.log('✅ Token verified without revocation check for user:', decodedToken.uid);
      } catch (fallbackError: any) {
        console.error('❌ Both token verification methods failed');
        throw revocationError; // Throw the original error
      }
    }
    
    return decodedToken.uid;
  } catch (error: any) {
    console.error('❌ Token verification failed:', {
      error: error.message,
      code: error.code,
      errorType: error.constructor.name,
      stack: error.stack?.substring(0, 300)
    });
    
    // Provide more specific error messages
    let userFriendlyMessage = error.message;
    if (error.message.includes('secretOrPrivateKey must be an asymmetric key')) {
      userFriendlyMessage = 'Firebase Admin SDK private key configuration error';
      console.error('🔑 Private key configuration issue detected');
    } else if (error.message.includes('Invalid key format')) {
      userFriendlyMessage = 'Firebase private key format is invalid';
    } else if (error.code === 'auth/id-token-expired') {
      userFriendlyMessage = 'Authentication token has expired';
    } else if (error.code === 'auth/id-token-revoked') {
      userFriendlyMessage = 'Authentication token has been revoked';
    }
    
    throw new Error(`Authentication error: Could not verify user. ${userFriendlyMessage}`);
  }
}

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
    const userId = await verifyTokenAndGetUserId(idToken);
    
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
    const userId = await verifyTokenAndGetUserId(idToken);
    
    const dailyMealPlanRef = adminDb.collection('profiles').doc(userId).collection('dailyMealPlans').doc(date);
    const doc = await dailyMealPlanRef.get();
    
    let currentMeals = [];
    if (doc.exists) {
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
    const userId = await verifyTokenAndGetUserId(idToken);
    
    const dailyMealPlanRef = adminDb.collection('profiles').doc(userId).collection('dailyMealPlans').doc(date);
    const doc = await dailyMealPlanRef.get();
    
    if (!doc.exists) {
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
    const userId = await verifyTokenAndGetUserId(idToken);
    
    const dailyMealPlanRef = adminDb.collection('profiles').doc(userId).collection('dailyMealPlans').doc(date);
    const doc = await dailyMealPlanRef.get();
    
    if (!doc.exists) {
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
    console.log('clearDailyMealPlan: Starting for date:', date);
    
    const userId = await verifyTokenAndGetUserId(idToken);
    console.log('clearDailyMealPlan: Token verified for user:', userId);
    
    const dailyMealPlanRef = adminDb.collection('profiles').doc(userId).collection('dailyMealPlans').doc(date);
    
    await dailyMealPlanRef.set({
      date,
      meals: [],
      updatedAt: FieldValue.serverTimestamp(),
    });
    
    console.log('clearDailyMealPlan: Successfully cleared meal plan for date:', date);
    revalidatePath('/meal-plan');
    return { success: true };
  } catch (error: any) {
    console.error('clearDailyMealPlan error:', {
      error: error.message,
      code: error.code,
      stack: error.stack,
      idTokenPresent: !!idToken,
      date,
    });
    return { success: false, error: `Could not clear daily meal plan: ${error.message}` };
  }
}

// LEGACY MEAL PLAN FUNCTIONS (Old Structure: Individual Meals)
// DEPRECATED: Legacy function redirected to new structure
export async function addOrUpdateMealPlan(idToken: string, mealData: any) {
  console.warn('⚠️ DEPRECATED: addOrUpdateMealPlan called, redirecting to new structure');
  
  try {
    const userId = await verifyTokenAndGetUserId(idToken);
    
    // Redirect to new daily meal plan structure
    if (!mealData.date) {
      throw new Error('Date is required for meal plan operations');
    }
    
    if (mealData.id) {
      // For updates, try to find and update in the new structure
      console.log(`🔄 Attempting to update meal ${mealData.id} in new structure`);
      
      // Try to find the meal in the new structure across recent dates
      const dates = [mealData.date, format(new Date(), 'yyyy-MM-dd')];
      let found = false;
      
      for (const date of dates) {
        const dailyRef = adminDb.collection('profiles').doc(userId).collection('dailyMealPlans').doc(date);
        const doc = await dailyRef.get();
        
        if (doc.exists) {
          const meals = doc.data()?.meals || [];
          const mealIndex = meals.findIndex((m: any) => m.id === mealData.id);
          
          if (mealIndex >= 0) {
            meals[mealIndex] = { ...meals[mealIndex], ...mealData, updatedAt: FieldValue.serverTimestamp() };
            await dailyRef.set({ date, meals, updatedAt: FieldValue.serverTimestamp() });
            found = true;
            console.log(`✅ Updated meal in new structure for date ${date}`);
            break;
          }
        }
      }
      
      if (!found) {
        // If not found in new structure, fall back to legacy update but also add to new structure
        console.log(`🔄 Meal not found in new structure, updating legacy and adding to new`);
        const mealPlanRef = adminDb.collection('profiles').doc(userId).collection('mealPlan');
        await mealPlanRef.doc(mealData.id).update({
          ...mealData,
          updatedAt: FieldValue.serverTimestamp(),
        });
        
        // Also add to new structure
        return await addMealToDay(idToken, mealData.date, mealData);
      }
    } else {
      // For new meals, always use the new structure
      console.log(`➡️ Redirecting new meal to addMealToDay`);
      return await addMealToDay(idToken, mealData.date, mealData);
    }
    
    revalidatePath('/meal-plan');
    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    console.error('addOrUpdateMealPlan (deprecated) error:', {
      code: error.code,
      message: error.message,
      stack: error.stack,
      mealData
    });
    return { success: false, error: `Could not save meal plan: ${error.message}` };
  }
}





// SHOPPING LIST FUNCTIONS
export async function addOrUpdateShoppingListItem(idToken: string, itemData: any) {
  try {
    const userId = await verifyTokenAndGetUserId(idToken);
    
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
    const userId = await verifyTokenAndGetUserId(idToken);
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
    const userId = await verifyTokenAndGetUserId(idToken);
    
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
    const userId = await verifyTokenAndGetUserId(idToken);
    
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
    const userId = await verifyTokenAndGetUserId(idToken);
    
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
    
    // STEP 1: Parse and consolidate ingredients with smart grouping
    const consolidatedIngredients: { [key: string]: { 
      name: string; 
      quantity: number; 
      unit: string; 
      recipes: any[];
      originalIngredients: string[];
    } } = {};
    
    mealPlan.forEach(meal => {
      const recipe = allRecipes.find(r => r.id == meal.recipeId);
      if (recipe && recipe.ingredients) {
        recipe.ingredients.forEach(ing => {
          const ingStr = typeof ing === 'string' ? ing : `${ing.quantity} ${ing.unit} ${ing.name}`;
          
          // Parse ingredient
          const parsedIngredient = parseIngredientString(ingStr);
          console.log('🥕 Parsing ingredient:', { original: ingStr, parsed: parsedIngredient });
          
          if (parsedIngredient && parsedIngredient.name && parsedIngredient.name !== 'non-item') {
            // Normalize ingredient name and unit using new functions
            const normalizedName = normalizeIngredientName(parsedIngredient.name);
            const normalizedUnit = normalizeUnit(parsedIngredient.unit);
            
            // Skip invalid ingredients
            if (!normalizedName || normalizedName.length < 2) {
              console.log('⚠️ Skipping invalid ingredient:', normalizedName);
              return;
            }
            
            // Calculate scaled quantity
            const scaledQuantity = (parsedIngredient.quantity / (recipe.servings || 1)) * (meal.servings || 1);
            
            // Generate consolidation key for smart grouping (handles eggs, onions, tomatoes, etc.)
            const consolidationKey = generateConsolidationKey(normalizedName, normalizedUnit);
            console.log('🔗 Consolidation key:', { 
              original: normalizedName,
              unit: normalizedUnit,
              key: consolidationKey 
            });
            
            if (!consolidatedIngredients[consolidationKey]) {
              const [consolidatedName, consolidatedUnit] = consolidationKey.split('|');
              consolidatedIngredients[consolidationKey] = {
                name: consolidatedName,
                quantity: 0,
                unit: consolidatedUnit,
                recipes: [],
                originalIngredients: []
              };
            }
            
            // Add to consolidated ingredient
            consolidatedIngredients[consolidationKey].quantity += scaledQuantity;
            consolidatedIngredients[consolidationKey].recipes.push({
              recipeId: meal.recipeId,
              recipeName: recipe.name,
              plannedMealId: meal.id,
              originalIngredient: ingStr
            });
            consolidatedIngredients[consolidationKey].originalIngredients.push(ingStr);
          }
        });
      }
    });
    
    // STEP 2: Apply shopping-friendly rounding and create final shopping list
    for (const [key, ingredient] of Object.entries(consolidatedIngredients)) {
      console.log('🛒 Processing consolidated ingredient:', { 
        key, 
        name: ingredient.name,
        quantity: ingredient.quantity,
        unit: ingredient.unit,
        recipeCount: ingredient.recipes.length
      });
      
      // Apply shopping-friendly quantity rounding
      const shoppingQuantity = roundQuantityForShopping(ingredient.quantity, ingredient.unit);
      
      // Check pantry for existing stock (with normalized matching)
      const pantryItem = pantryItems.find(p => 
        normalizeIngredientName(p.name || '').toLowerCase() === ingredient.name.toLowerCase() && 
        normalizeUnit(p.unit || '') === ingredient.unit
      );
      
      const neededQuantity = Math.max(0, shoppingQuantity - (pantryItem?.quantity || 0));
      
      if (neededQuantity > 0) {
        // Apply enhanced categorization
        const category = assignCategory(ingredient.name);
        
        const newItemRef = shoppingListRef.doc();
        batch.set(newItemRef, {
          name: ingredient.name,
          quantity: neededQuantity,
          unit: ingredient.unit,
          category: category,
          purchased: false,
          recipes: ingredient.recipes,
          originalIngredients: ingredient.originalIngredients,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
        
        console.log('✅ Added to shopping list:', {
          name: ingredient.name,
          quantity: neededQuantity,
          unit: ingredient.unit,
          category: category,
          recipeCount: ingredient.recipes.length
        });
      } else {
        console.log('⏭️ Skipping (sufficient in pantry):', ingredient.name);
      }
    }
    
    await batch.commit();
    revalidatePath('/shopping-list');
    
    return { 
      success: true, 
      itemsGenerated: Object.keys(consolidatedIngredients).length,
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
    const userId = await verifyTokenAndGetUserId(idToken);
    
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
    const userId = await verifyTokenAndGetUserId(idToken);
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
    const userId = await verifyTokenAndGetUserId(idToken);
    
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
    const userId = await verifyTokenAndGetUserId(idToken);
    
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
    const userId = await verifyTokenAndGetUserId(idToken);
    
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
    const userId = await verifyTokenAndGetUserId(idToken);
    
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

// Migration function to move legacy meal plan data to new daily structure
export async function migrateLegacyMealPlanData(idToken: string) {
  try {
    const userId = await verifyTokenAndGetUserId(idToken);
    
    console.log(`🚀 Starting meal plan migration for user ${userId}`);
    
    // Get legacy meal plan data
    const legacyMealPlanRef = adminDb.collection('profiles').doc(userId).collection('mealPlan');
    const legacySnapshot = await legacyMealPlanRef.get();
    
    if (legacySnapshot.empty) {
      console.log(`ℹ️ No legacy meal plan data found for user ${userId}`);
      return { success: true, message: 'No legacy data to migrate' };
    }
    
    console.log(`📋 Found ${legacySnapshot.docs.length} legacy meal plan entries`);
    
    // Group meals by date
    const mealsByDate: { [date: string]: any[] } = {};
    
    legacySnapshot.docs.forEach(doc => {
      const meal = { id: doc.id, ...doc.data() };
      const date = meal.date;
      
      if (date) {
        if (!mealsByDate[date]) {
          mealsByDate[date] = [];
        }
        mealsByDate[date].push({
          ...meal,
          source: 'legacy',
          migratedAt: FieldValue.serverTimestamp()
        });
      }
    });
    
    const dates = Object.keys(mealsByDate);
    console.log(`📅 Migrating meals for ${dates.length} dates:`, dates);
    
    // Migrate each date to new structure
    const batch = adminDb.batch();
    let migratedCount = 0;
    
    for (const date of dates) {
      const meals = mealsByDate[date];
      const dailyMealPlanRef = adminDb.collection('profiles').doc(userId).collection('dailyMealPlans').doc(date);
      
      // Check if this date already exists in new structure
      const existingDoc = await dailyMealPlanRef.get();
      if (existingDoc.exists && existingDoc.data()?.meals?.length > 0) {
        console.log(`⏭️ Skipping ${date} - already exists in new structure with ${existingDoc.data()?.meals?.length} meals`);
        continue;
      }
      
      batch.set(dailyMealPlanRef, {
        date,
        meals,
        migrated: true,
        migratedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      });
      
      migratedCount += meals.length;
      console.log(`✅ Prepared migration for ${date}: ${meals.length} meals`);
    }
    
    if (dates.length > 0) {
      await batch.commit();
      console.log(`🎉 Migration completed: ${migratedCount} meals across ${dates.length} dates`);
    }
    
    revalidatePath('/meal-plan');
    revalidatePath('/');
    
    return { 
      success: true, 
      message: `Successfully migrated ${migratedCount} meals across ${dates.length} dates`,
      migratedDates: dates,
      migratedMealsCount: migratedCount
    };
    
  } catch (error: any) {
    console.error('Migration error:', {
      code: error.code,
      message: error.message,
      stack: error.stack,
    });
    return { success: false, error: `Migration failed: ${error.message}` };
  }
}

// Helper function to check if migration is needed
export async function checkMigrationStatus(idToken: string) {
  try {
    const userId = await verifyTokenAndGetUserId(idToken);
    
    // Check if there's any legacy data
    const legacyMealPlanRef = adminDb.collection('profiles').doc(userId).collection('mealPlan');
    const legacySnapshot = await legacyMealPlanRef.limit(1).get();
    const hasLegacyData = !legacySnapshot.empty;
    
    // Check if there's any new structure data
    const newMealPlanRef = adminDb.collection('profiles').doc(userId).collection('dailyMealPlans');
    const newSnapshot = await newMealPlanRef.limit(1).get();
    const hasNewData = !newSnapshot.empty;
    
    return {
      success: true,
      hasLegacyData,
      hasNewData,
      needsMigration: hasLegacyData && !hasNewData
    };
    
  } catch (error: any) {
    console.error('Migration status check error:', error);
    return { success: false, error: error.message };
  }
}
