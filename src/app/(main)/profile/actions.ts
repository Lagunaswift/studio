
'use server'

import { revalidatePath } from 'next/cache'
import type { DailyVitalsLog, DailyManualMacrosLog, DailyWeightLog, PlannedMeal, PantryItem, RecipeFormData, UserProfileSettings } from '@/types';
import { getFirebaseAdmin } from '@/lib/firebase-admin'; 
import { getFirestore, doc, updateDoc, collection, addDoc, getDoc, setDoc, deleteDoc, writeBatch, serverTimestamp } from "firebase-admin/firestore";
import { processBugReport } from '@/ai/flows/report-bug-flow';
import type { BugReportInput, BugReportOutput } from '@/ai/flows/schemas';

// --- Recipe Actions ---
export async function addRecipe(recipeData: RecipeFormData & { user_id: string }) {
  const { db } = getFirebaseAdmin();
  const userId = recipeData.user_id; // Get user ID from the passed data
  if (!userId) {
    return { error: 'You must be logged in to add a recipe.' };
  }

  const { user_id, ...restOfRecipeData } = recipeData;

  const dataToInsert = {
    ...restOfRecipeData,
    ingredients: restOfRecipeData.ingredients.map(ing => ing.value),
    instructions: restOfRecipeData.instructions.map(inst => inst.value),
    macrosPerServing: { 
        calories: restOfRecipeData.calories, 
        protein: restOfRecipeData.protein, 
        carbs: restOfRecipeData.carbs, 
        fat: restOfRecipeData.fat 
    },
    image: restOfRecipeData.image || `https://placehold.co/600x400.png?text=${encodeURIComponent(restOfRecipeData.name)}`,
    isCustom: true,
    user_id: userId,
  };

  try {
    const docRef = await addDoc(collection(db, "recipes"), dataToInsert);
    const newDocSnapshot = await getDoc(docRef);
    const finalData = { ...newDocSnapshot.data(), id: newDocSnapshot.id };

    revalidatePath('/recipes');
    return { success: true, data: finalData };
  } catch (error: any) {
    console.error('Error adding recipe:', error);
    return { error: 'Failed to save the recipe.' };
  }
}


// --- Meal Plan Actions ---
export async function addOrUpdateMealPlan(mealData: Partial<Omit<PlannedMeal, 'recipeDetails'>> & { user_id: string }) {
  const { db } = getFirebaseAdmin();
  const userId = mealData.user_id;
  if (!userId) return { error: 'Authentication required.' };

  const docId = mealData.id || `meal_${Date.now()}_${Math.random()}`;
  const { syncStatus, ...dataToSet } = { ...mealData, id: docId };

  const mealRef = doc(db, "planned_meals", docId);

  try {
    await setDoc(mealRef, dataToSet, { merge: true });
    const updatedDoc = await getDoc(mealRef);
    revalidatePath('/meal-plan', 'layout');
    return { success: true, data: updatedDoc.data() };
  } catch (error: any) {
    console.error('Error saving meal plan item:', error);
    return { error: 'Could not save your meal plan item.' };
  }
}

export async function deleteMealFromPlan(plannedMealId: string) {
    const { db } = getFirebaseAdmin();
    const mealRef = doc(db, "planned_meals", plannedMealId);
    
    try {
        await deleteDoc(mealRef);
        revalidatePath('/meal-plan', 'layout');
        return { success: true };
    } catch (error: any) {
        console.error('Error deleting meal plan item:', error);
        return { error: 'Could not remove meal from plan.' };
    }
}


// --- Pantry Actions ---
export async function addOrUpdatePantryItem(itemData: Omit<PantryItem, 'user_id'> & { user_id: string }) {
    const { db } = getFirebaseAdmin();
    const userId = itemData.user_id;
    if (!userId) return { error: 'Authentication required.' };

    const { syncStatus, ...dataToSet } = itemData;
    
    const itemRef = doc(db, "pantry_items", itemData.id);

    try {
        await setDoc(itemRef, dataToSet, { merge: true });
        const updatedDoc = await getDoc(itemRef);
        revalidatePath('/pantry');
        return { success: true, data: updatedDoc.data() };
    } catch (error: any) {
        console.error('Error saving pantry item:', error);
        return { error: 'Could not save item to pantry.' };
    }
}

export async function deletePantryItem(itemId: string) {
    const { db } = getFirebaseAdmin();
    const itemRef = doc(db, "pantry_items", itemId);
    
    try {
        await deleteDoc(itemRef);
        revalidatePath('/pantry');
        return { success: true };
    } catch (error: any) {
        console.error('Error deleting pantry item:', error);
        return { error: 'Could not remove item from pantry.' };
    }
}


// --- Daily Log Actions ---
export async function addOrUpdateVitalsLog(vitalsData: Omit<DailyVitalsLog, 'user_id'> & { user_id: string }) {
  const { db } = getFirebaseAdmin();
  const userId = vitalsData.user_id;
  if (!userId) return { error: 'Authentication required.' };

  const { syncStatus, ...restOfVitalsData } = vitalsData;
  
  const docId = `${userId}_${vitalsData.date}`; // Create a predictable ID
  const vitalsRef = doc(db, "daily_vitals_logs", docId);

  try {
    await setDoc(vitalsRef, restOfVitalsData, { merge: true });
    const updatedDoc = await getDoc(vitalsRef);
    revalidatePath('/daily-log');
    return { success: true, data: updatedDoc.data() };
  } catch (error: any) {
    console.error('Error saving vitals log:', error);
    return { error: 'Could not save your daily vitals.' };
  }
}

export async function addOrUpdateWeightLog(userId: string, date: string, weightKg: number) {
  const { db } = getFirebaseAdmin();
  if (!userId) return { error: 'Authentication required.' };

  const logData = { date, weightKg, user_id: userId };
  const docId = `${userId}_${date}`; // Predictable ID
  
  const weightLogRef = doc(db, "daily_weight_logs", docId);
  const profileRef = doc(db, "profiles", userId);

  try {
    const batch = db.batch();
    batch.set(weightLogRef, logData, { merge: true });
    batch.update(profileRef, { weightKg }); // Also update the main profile weight
    await batch.commit();
    
    const updatedDoc = await getDoc(weightLogRef);

    revalidatePath('/daily-log');
    revalidatePath('/profile/user-info');
    return { success: true, data: updatedDoc.data() };
  } catch (error: any) {
    console.error('Error saving weight log:', error);
    return { error: 'Could not save your weight.' };
  }
}

export async function addOrUpdateManualMacrosLog(macroData: Omit<DailyManualMacrosLog, 'user_id'> & { user_id: string }) {
    const { db } = getFirebaseAdmin();
    const userId = macroData.user_id;
    if (!userId) return { error: 'Authentication required.' };

    const { syncStatus, ...restOfMacroData } = macroData;
    const docId = restOfMacroData.id || `${userId}_${macroData.date}_macros`;

    const dataToSet = {
        ...restOfMacroData,
        id: docId,
    };
    
    const logRef = doc(db, "daily_manual_macros_logs", docId);

    try {
        await setDoc(logRef, dataToSet, { merge: true });
        const updatedDoc = await getDoc(logRef);
        revalidatePath('/daily-log');
        return { success: true, data: updatedDoc.data() };
    } catch (error: any) {
        console.error('Error saving manual macros log:', error);
        return { error: 'Could not save your manual macros.' };
    }
}

// --- Bug Reporting Action ---
export async function reportBug(description: string, userId: string): Promise<{ success: boolean, error?: string, data?: BugReportOutput }> {
    const { db } = getFirebaseAdmin();
    if (!userId) return { error: 'Authentication required to report a bug.' };

    try {
        // 1. Process the bug report with AI
        const aiInput: BugReportInput = {
            description,
            userId,
            appVersion: "1.0.0" // This could be dynamic in a real app
        };
        const processedReport = await processBugReport(aiInput);

        // 2. Save the structured report to Firestore
        const bugReportData = {
            ...processedReport,
            originalDescription: description,
            userId: userId,
            createdAt: serverTimestamp(),
            status: 'new' // 'new', 'in-progress', 'resolved'
        };

        await addDoc(collection(db, "bug_reports"), bugReportData);

        revalidatePath('/updates');
        return { success: true, data: processedReport };

    } catch (error: any) {
        console.error('Error reporting bug:', error);
        return { success: false, error: 'Failed to submit bug report. Please try again later.' };
    }
}

// --- User Profile Actions ---
export async function updateUserProfile(updates: Partial<UserProfileSettings> & { id: string }) {
  const { db } = getFirebaseAdmin();
  const userId = updates.id;
  if (!userId) return { error: 'Authentication required.' };

  const { id, ...profileUpdates } = updates;
  const profileRef = doc(db, "profiles", userId);

  try {
    await setDoc(profileRef, profileUpdates, { merge: true }); // Use set with merge instead of update for safety
    revalidatePath('/profile', 'layout')
    revalidatePath('/', 'layout') 
    
    const updatedDoc = await getDoc(profileRef);

    return { success: true, data: updatedDoc.data() }
  } catch (error: any) {
    console.error('Error updating profile:', error);
    return { error: `Could not update your profile. DB error: ${error.message}` };
  }
}
