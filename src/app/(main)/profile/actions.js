'use server';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { db, auth as adminAuth } from '@/lib/firebase-admin';
import { processBugReport } from '@/ai/flows/report-bug-flow';
import { collection, addDoc, getDoc, setDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
async function getUserId() {
    const authorization = headers().get('Authorization');
    if (!authorization?.startsWith('Bearer ')) {
        console.warn("getUserId: No valid Authorization header found.");
        return null;
    }
    const idToken = authorization.split('Bearer ')[1];
    try {
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        return decodedToken.uid;
    }
    catch (error) {
        console.error("getUserId: Error verifying ID token:", error);
        return null;
    }
}
// --- Recipe Actions ---
export async function addRecipe(recipeData) {
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
        const newDocSnapshot = await getDoc(docRef);
        const finalData = { ...newDocSnapshot.data(), id: newDocSnapshot.id };
        revalidatePath('/recipes', 'layout');
        return { success: true, data: finalData };
    }
    catch (error) {
        console.error('Error adding recipe:', error);
        return { error: 'Failed to save the recipe.' };
    }
}
// --- Meal Plan Actions ---
export async function addOrUpdateMealPlan(mealData) {
    const userId = await getUserId();
    if (!userId)
        return { error: 'Authentication required.' };
    const docId = mealData.id || `meal_${Date.now()}_${Math.random()}`;
    const { syncStatus, ...dataToSet } = { ...mealData, id: docId, user_id: userId };
    const mealRef = doc(db, "planned_meals", docId);
    try {
        await setDoc(mealRef, dataToSet, { merge: true });
        const updatedDoc = await getDoc(mealRef);
        revalidatePath('/meal-plan', 'layout');
        return { success: true, data: updatedDoc.data() };
    }
    catch (error) {
        console.error('Error saving meal plan item:', error);
        return { error: 'Could not save your meal plan item.' };
    }
}
export async function deleteMealFromPlan(plannedMealId) {
    const userId = await getUserId();
    if (!userId)
        return { error: 'Authentication required.' };
    const mealRef = doc(db, "planned_meals", plannedMealId);
    try {
        await deleteDoc(mealRef);
        revalidatePath('/meal-plan', 'layout');
        return { success: true };
    }
    catch (error) {
        console.error('Error deleting meal plan item:', error);
        return { error: 'Could not remove meal from plan.' };
    }
}
// --- Pantry Actions ---
export async function addOrUpdatePantryItem(itemData) {
    const userId = await getUserId();
    if (!userId)
        return { error: 'Authentication required.' };
    const { syncStatus, ...dataToSet } = { ...itemData, user_id: userId };
    const itemRef = doc(db, "pantry_items", itemData.id);
    try {
        await setDoc(itemRef, dataToSet, { merge: true });
        const updatedDoc = await getDoc(itemRef);
        revalidatePath('/pantry');
        return { success: true, data: updatedDoc.data() };
    }
    catch (error) {
        console.error('Error saving pantry item:', error);
        return { error: 'Could not save item to pantry.' };
    }
}
export async function deletePantryItem(itemId) {
    const userId = await getUserId();
    if (!userId)
        return { error: 'Authentication required.' };
    const itemRef = doc(db, "pantry_items", itemId);
    try {
        await deleteDoc(itemRef);
        revalidatePath('/pantry');
        return { success: true };
    }
    catch (error) {
        console.error('Error deleting pantry item:', error);
        return { error: 'Could not remove item from pantry.' };
    }
}
// --- Daily Log Actions ---
export async function addOrUpdateVitalsLog(vitalsData) {
    const userId = await getUserId();
    if (!userId)
        return { error: 'Authentication required.' };
    const { syncStatus, ...restOfVitalsData } = vitalsData;
    const docId = `${userId}_${vitalsData.date}`;
    const vitalsRef = doc(db, "daily_vitals_logs", docId);
    try {
        await setDoc(vitalsRef, { ...restOfVitalsData, user_id: userId, id: docId, date: vitalsData.date }, { merge: true });
        const updatedDoc = await getDoc(vitalsRef);
        revalidatePath('/daily-log');
        return { success: true, data: updatedDoc.data() };
    }
    catch (error) {
        console.error('Error saving vitals log:', error);
        return { error: 'Could not save your daily vitals.' };
    }
}
export async function addOrUpdateWeightLog(userId, date, weightKg) {
    if (!userId)
        return { error: 'Authentication required.' };
    const logData = { date, weightKg, user_id: userId };
    const docId = `${userId}_${date}`;
    const weightLogRef = doc(db, "daily_weight_logs", docId);
    const profileRef = doc(db, "profiles", userId);
    try {
        const batch = db.batch();
        batch.set(weightLogRef, logData, { merge: true });
        batch.update(profileRef, { weightKg });
        await batch.commit();
        const updatedDoc = await getDoc(weightLogRef);
        revalidatePath('/daily-log');
        revalidatePath('/profile/user-info');
        return { success: true, data: updatedDoc.data() };
    }
    catch (error) {
        console.error('Error saving weight log:', error);
        return { error: 'Could not save your weight.' };
    }
}
export async function addOrUpdateManualMacrosLog(macroData) {
    const userId = await getUserId();
    if (!userId)
        return { error: 'Authentication required.' };
    const { syncStatus, ...restOfMacroData } = macroData;
    const docId = restOfMacroData.id || `${userId}_${macroData.date}_macros`;
    const dataToSet = {
        ...restOfMacroData,
        id: docId,
        user_id: userId,
    };
    const logRef = doc(db, "daily_manual_macros_logs", docId);
    try {
        await setDoc(logRef, dataToSet, { merge: true });
        const updatedDoc = await getDoc(logRef);
        revalidatePath('/daily-log');
        return { success: true, data: updatedDoc.data() };
    }
    catch (error) {
        console.error('Error saving manual macros log:', error);
        return { error: 'Could not save your manual macros.' };
    }
}
// --- Bug Reporting Action ---
export async function reportBug(description, userId) {
    if (!userId)
        return { error: 'Authentication required to report a bug.' };
    try {
        const aiInput = {
            description,
            userId,
            appVersion: "1.0.0"
        };
        const processedReport = await processBugReport(aiInput);
        const bugReportData = {
            ...processedReport,
            originalDescription: description,
            userId: userId,
            createdAt: serverTimestamp(),
            status: 'new'
        };
        await addDoc(collection(db, "bug_reports"), bugReportData);
        revalidatePath('/updates');
        return { success: true, data: processedReport };
    }
    catch (error) {
        console.error('Error reporting bug:', error);
        return { success: false, error: 'Failed to submit bug report. Please try again later.' };
    }
}
// --- User Profile Actions ---
export async function updateUserProfile(updates) {
    const userId = await getUserId();
    if (!userId)
        return { error: 'Authentication required.' };
    const profileRef = doc(db, "profiles", userId);
    try {
        await setDoc(profileRef, { ...updates, id: userId }, { merge: true });
        revalidatePath('/profile', 'layout');
        revalidatePath('/', 'layout');
        const updatedDoc = await getDoc(profileRef);
        return { success: true, data: updatedDoc.data() };
    }
    catch (error) {
        console.error('Error updating profile:', error);
        return { error: `Could not update your profile. DB error: ${error.message}` };
    }
}
