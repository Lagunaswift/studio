
'use server'

import { revalidatePath } from 'next/cache'
import type { DailyVitalsLog, DailyManualMacrosLog, RecipeFormData, UserProfileSettings } from '@/types';
import { getAuth, getDb } from '@/lib/firebase-admin'; 
import { processBugReport } from '@/ai/flows/report-bug-flow';
import type { BugReportInput, BugReportOutput } from '@/ai/flows/report-bug-flow';
import { FieldValue } from 'firebase-admin/firestore';


async function getUserIdFromToken(idToken: string): Promise<string | null> {
  if (!idToken) {
    console.warn("getUserIdFromToken: No ID token provided.");
    return null;
  }
  try {
    const adminAuth = getAuth();
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    return decodedToken.uid;
  } catch (error) {
    console.error("getUserIdFromToken: Error verifying ID token:", error);
    return null;
  }
}

// --- Recipe Actions ---
export async function addRecipe(idToken: string, recipeData: Omit<RecipeFormData, 'user_id' | 'id'>) {
  const userId = await getUserIdFromToken(idToken);
  if (!userId) {
    return { error: 'You must be logged in to add a recipe.' };
  }

  const dataToInsert = {
    ...recipeData,
    ingredients: recipeData.ingredients.map(ing => ing.value),
    instructions: recipeData.instructions.map(inst => inst.value),
    macrosPerServing: { 
        calories: recipeData.calories, 
        protein: recipeData.protein, 
        carbs: recipeData.carbs, 
        fat: recipeData.fat 
    },
    image: recipeData.image || `https://placehold.co/600x400.png?text=${encodeURIComponent(recipeData.name)}`,
    isCustom: true,
    user_id: userId,
  };

  try {
    const db = getDb();
    const docRef = await db.collection("recipes").add(dataToInsert);
    const newDocSnapshot = await docRef.get();
    const finalData = { ...newDocSnapshot.data(), id: newDocSnapshot.id };

    revalidatePath('/recipes', 'layout');
    return { success: true, data: finalData };
  } catch (error: any) {
    console.error('Error adding recipe:', error);
    return { error: 'Failed to save the recipe.' };
  }
}


// --- Meal Plan Actions ---
export async function addOrUpdateMealPlan(idToken: string, mealData: any) {
  const userId = await getUserIdFromToken(idToken);
  if (!userId) return { error: 'Authentication required.' };

  const docId = mealData.id || `meal_${Date.now()}_${Math.random()}`;
  const { syncStatus, recipeDetails, ...dataToSet } = { ...mealData, id: docId, user_id: userId };

  const db = getDb();
  const mealRef = db.collection("planned_meals").doc(docId);

  try {
    await mealRef.set(dataToSet, { merge: true });
    const updatedDoc = await mealRef.get();
    revalidatePath('/meal-plan', 'layout');
    return { success: true, data: updatedDoc.data() };
  } catch (error: any) {
    console.error('Error saving meal plan item:', error);
    return { error: 'Could not save your meal plan item.' };
  }
}

export async function deleteMealFromPlan(idToken: string, plannedMealId: string) {
    const userId = await getUserIdFromToken(idToken);
    if (!userId) return { success: false, error: 'Authentication required.' };

    const db = getDb();
    const mealRef = db.collection("planned_meals").doc(plannedMealId);
    
    try {
        await mealRef.delete();
        revalidatePath('/meal-plan', 'layout');
        return { success: true };
    } catch (error: any) {
        console.error('Error deleting meal plan item:', error);
        return { success: false, error: 'Could not remove meal from plan.' };
    }
}


// --- Pantry Actions ---
export async function addOrUpdatePantryItem(idToken: string, itemData: any) {
    const userId = await getUserIdFromToken(idToken);
    if (!userId) return { success: false, error: 'Authentication required.' };

    const { syncStatus, ...dataToSet } = { ...itemData, user_id: userId };
    
    const db = getDb();
    const itemRef = db.collection("pantry_items").doc(itemData.id);

    try {
        await itemRef.set(dataToSet, { merge: true });
        const updatedDoc = await itemRef.get();
        revalidatePath('/pantry');
        return { success: true, data: updatedDoc.data() };
    } catch (error: any) {
        console.error('Error saving pantry item:', error);
        return { success: false, error: 'Could not save item to pantry.' };
    }
}

export async function deletePantryItem(idToken: string, itemId: string) {
    const userId = await getUserIdFromToken(idToken);
    if (!userId) return { success: false, error: 'Authentication required.' };
    const db = getDb();
    const itemRef = db.collection("pantry_items").doc(itemId);
    
    try {
        await itemRef.delete();
        revalidatePath('/pantry');
        return { success: true };
    } catch (error: any) {
        console.error('Error deleting pantry item:', error);
        return { success: false, error: 'Could not remove item from pantry.' };
    }
}


// --- Daily Log Actions ---
export async function addOrUpdateVitalsLog(idToken: string, vitalsData: any) {
  const userId = await getUserIdFromToken(idToken);
  if (!userId) return { error: 'Authentication required.' };

  const { syncStatus, ...restOfVitalsData } = vitalsData as any;
  
  const docId = `${userId}_${vitalsData.date}`; 
  const db = getDb();
  const vitalsRef = db.collection("daily_vitals_logs").doc(docId);

  try {
    await vitalsRef.set({ ...restOfVitalsData, user_id: userId, id: docId, date: vitalsData.date }, { merge: true });
    const updatedDoc = await vitalsRef.get();
    revalidatePath('/daily-log');
    return { success: true, data: updatedDoc.data() };
  } catch (error: any) {
    console.error('Error saving vitals log:', error);
    return { error: 'Could not save your daily vitals.' };
  }
}

export async function addOrUpdateWeightLog(idToken: string, date: string, weightKg: number) {
    const userId = await getUserIdFromToken(idToken);
    if (!userId) return { error: 'Authentication required.' };

    const logData = { date, weightKg, user_id: userId };
    const docId = `${userId}_${date}`; 
    
    const db = getDb();
    const weightLogRef = db.collection("daily_weight_logs").doc(docId);
    const profileRef = db.collection("profiles").doc(userId);

    try {
        const batch = db.batch();
        batch.set(weightLogRef, logData, { merge: true });
        batch.update(profileRef, { weightKg }); 
        await batch.commit();
        
        const updatedDoc = await weightLogRef.get();

        revalidatePath('/daily-log');
        revalidatePath('/profile/user-info');
        return { success: true, data: updatedDoc.data() };
    } catch (error: any) {
        console.error('Error saving weight log:', error);
        return { error: 'Could not save your weight.' };
    }
}

export async function addOrUpdateManualMacrosLog(idToken: string, macroData: any) {
    const userId = await getUserIdFromToken(idToken);
    if (!userId) return { error: 'Authentication required.' };

    const { syncStatus, ...restOfMacroData } = macroData;
    const docId = restOfMacroData.id || `${userId}_${macroData.date}_macros`;

    const dataToSet = {
        ...restOfMacroData,
        id: docId,
        user_id: userId,
    };
    
    const db = getDb();
    const logRef = db.collection("daily_manual_macros_logs").doc(docId);

    try {
        await logRef.set(dataToSet, { merge: true });
        const updatedDoc = await logRef.get();
        revalidatePath('/daily-log');
        return { success: true, data: updatedDoc.data() };
    } catch (error: any) {
        console.error('Error saving manual macros log:', error);
        return { error: 'Could not save your manual macros.' };
    }
}

// --- Bug Reporting Action ---
export async function reportBug(idToken: string, description: string): Promise<{ success: boolean, error?: string, data?: BugReportOutput }> {
    const userId = await getUserIdFromToken(idToken);
    if (!userId) return { success: false, error: 'Authentication required to report a bug.' };

    try {
        const aiInput: BugReportInput = {
            description,
            userId,
            appVersion: "1.0.0" 
        };
        const processedReport = await processBugReport(aiInput);
        
        const db = getDb();
        const bugReportData = {
            ...processedReport,
            originalDescription: description,
            userId: userId,
            createdAt: FieldValue.serverTimestamp(),
            status: 'new' 
        };
        
        await db.collection("bug_reports").add(bugReportData);

        revalidatePath('/updates');
        return { success: true, data: processedReport };

    } catch (error: any) {
        console.error('Error reporting bug:', error);
        return { success: false, error: 'Failed to submit bug report. Please try again later.' };
    }
}

// --- User Profile Actions ---
export async function updateUserProfile(idToken: string, updates: Partial<Omit<UserProfileSettings, 'id'>>) {
  const userId = await getUserIdFromToken(idToken);
  if (!userId) return { error: 'Authentication required.' };
  
  const db = getDb();
  const profileRef = db.collection("profiles").doc(userId);

  try {
    await profileRef.set({ ...updates, id: userId }, { merge: true }); 
    revalidatePath('/profile', 'layout')
    revalidatePath('/', 'layout') 
    
    const updatedDoc = await profileRef.get();

    return { success: true, data: updatedDoc.data() }
  } catch (error: any) {
    console.error('Error updating profile:', error);
    return { error: `Could not update your profile. DB error: ${error.message}` };
  }
}
