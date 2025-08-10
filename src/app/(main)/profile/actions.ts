
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

// MEAL PLAN FUNCTIONS
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
