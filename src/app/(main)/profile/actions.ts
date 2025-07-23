
'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import type { DailyVitalsLog, DailyManualMacrosLog, DailyWeightLog, PlannedMeal, PantryItem, RecipeFormData, UserProfileSettings } from '@/types';
import { auth, db } from '@/lib/firebase'; // Firestore DB
import { doc, updateDoc, collection, addDoc, getDoc, setDoc, deleteDoc, writeBatch, serverTimestamp } from "firebase/firestore";
import { processBugReport, type BugReportInput, type BugReportOutput } from '@/ai/flows/report-bug-flow';


// This is a placeholder for getting the current user's UID.
// In a real app, you would get this from the session or auth state.
// For now, we are assuming a fixed user for server actions until full auth is passed.
// IMPORTANT: This will need to be replaced with actual user authentication state management.
async function getUserId() {
  // This is NOT a secure way to get the user, it's a placeholder for the migration.
  // We'll need to re-architect this later.
  // For now, we will leave it commented out, as we can't proceed without a user id.
  // const { data: { user } } = await supabase.auth.getUser()
  // if (!user) return null;
  // return user.id;

  // Let's hardcode a temporary user ID for the purpose of making the code compile.
  // THIS MUST BE REPLACED.
  return "placeholder-user-id";
}


// --- User Profile Actions ---
export async function updateUserProfile(updates: Partial<UserProfileSettings>) {
  const userId = await getUserId();
  if (!userId) return { error: 'Authentication required.' };

  const profileRef = doc(db, "profiles", userId);

  try {
    await updateDoc(profileRef, updates);
    revalidatePath('/profile', 'layout')
    revalidatePath('/', 'layout') 
    
    // Firestore doesn't return the updated document by default on update.
    // We'll fetch it if needed, but for now, let's just confirm success.
    const updatedDoc = await getDoc(profileRef);

    return { success: true, data: updatedDoc.data() }
  } catch (error: any) {
    console.error('Error updating profile:', error);
    return { error: `Could not update your profile. DB error: ${error.message}` };
  }
}

// --- Recipe Actions ---
export async function addRecipe(recipeData: RecipeFormData) {
  const userId = await getUserId();
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
    const docRef = await addDoc(collection(db, "recipes"), dataToInsert);
    const newDoc = await getDoc(docRef);
    const finalData = { ...newDoc.data(), id: newDoc.id };

    revalidatePath('/recipes');
    return { success: true, data: finalData };
  } catch (error: any) {
    console.error('Error adding recipe:', error);
    return { error: 'Failed to save the recipe.' };
  }
}


// --- Meal Plan Actions ---
export async function addOrUpdateMealPlan(mealData: Omit<PlannedMeal, 'recipeDetails' | 'user_id'> & {id?: string}) {
  const userId = await getUserId();
  if (!userId) return { error: 'Authentication required.' };

  const { syncStatus, ...restOfMealData } = mealData;
  const docId = restOfMealData.id || `meal_${Date.now()}_${Math.random()}`;
  
  const dataToSet = {
      ...restOfMealData,
      id: docId,
      user_id: userId,
  };

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
    const userId = await getUserId();
    if (!userId) return { error: 'Authentication required.' };
    
    // We can't enforce RLS here as easily, so we just delete by ID.
    // Proper security rules in Firestore are CRITICAL.
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
export async function addOrUpdatePantryItem(itemData: Omit<PantryItem, 'user_id'>) {
    const userId = await getUserId();
    if (!userId) return { error: 'Authentication required.' };

    const { syncStatus, ...restOfItemData } = itemData;
    const dataToSet = { ...restOfItemData, user_id: userId };
    
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
    const userId = await getUserId();
    if (!userId) return { error: 'Authentication required.' };

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
export async function addOrUpdateVitalsLog(vitalsData: Omit<DailyVitalsLog, 'user_id'>) {
  const userId = await getUserId();
  if (!userId) return { error: 'Authentication required.' };

  const { syncStatus, ...restOfVitalsData } = vitalsData;
  const dataToSet = { ...restOfVitalsData, user_id: userId };
  
  const docId = `${userId}_${vitalsData.date}`; // Create a predictable ID
  const vitalsRef = doc(db, "daily_vitals_logs", docId);

  try {
    await setDoc(vitalsRef, dataToSet, { merge: true });
    const updatedDoc = await getDoc(vitalsRef);
    revalidatePath('/daily-log');
    return { success: true, data: updatedDoc.data() };
  } catch (error: any) {
    console.error('Error saving vitals log:', error);
    return { error: 'Could not save your daily vitals.' };
  }
}

export async function addOrUpdateWeightLog(date: string, weightKg: number) {
  const userId = await getUserId();
  if (!userId) return { error: 'Authentication required.' };

  const logData = { date, weightKg, user_id: userId };
  const docId = `${userId}_${date}`; // Predictable ID
  
  const weightLogRef = doc(db, "daily_weight_logs", docId);
  const profileRef = doc(db, "profiles", userId);

  try {
    const batch = writeBatch(db);
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

export async function addOrUpdateManualMacrosLog(macroData: Omit<DailyManualMacrosLog, 'user_id'>) {
    const userId = await getUserId();
    if (!userId) return { error: 'Authentication required.' };

    const { syncStatus, ...restOfMacroData } = macroData;
    const docId = restOfMacroData.id || `${userId}_${macroData.date}_macros`;

    const dataToSet = {
        ...restOfMacroData,
        id: docId,
        user_id: userId
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
export async function reportBug(description: string): Promise<{ success: boolean, error?: string, data?: BugReportOutput }> {
    const userId = await getUserId();
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
