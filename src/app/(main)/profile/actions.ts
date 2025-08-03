'use server';

// src/app/(main)/profile/actions.ts
import { revalidatePath } from 'next/cache';
import { serverFirestore } from '@/utils/firestoreRecovery';
import { debugGetUserIdFromToken } from '@/utils/authDebug';
import type { UserProfileSettings } from '@/types';
import { admin } from '@/lib/firebase-admin';

export async function getUserIdFromToken(idToken: string): Promise<string> {
  return await debugGetUserIdFromToken(idToken);
}

export async function updateUserProfile(idToken: string, updates: Partial<Omit<UserProfileSettings, 'id'>>) {
  try {
    const decodedToken = await serverFirestore.verifyToken(idToken);
    const userId = decodedToken.uid;
    const result = await serverFirestore.updateUserProfile(idToken, userId, {
      ...updates,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    revalidatePath('/profile', 'layout');
    revalidatePath('/', 'layout');
    return result;
  } catch (error: any) {
    console.error('updateUserProfile error:', {
      code: error.code,
      message: error.message,
      stack: error.stack,
    });
    return { success: false, error: `Could not update profile: ${error.message}` };
  }
}

export async function deleteMealFromPlan(idToken: string, mealId: string) {
  try {
    const decodedToken = await serverFirestore.verifyToken(idToken);
    const userId = decodedToken.uid;
    await admin.firestore().collection('users').doc(userId).collection('mealPlan').doc(mealId).delete();
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

export async function deletePantryItem(idToken: string, itemId: string) {
  try {
    const decodedToken = await serverFirestore.verifyToken(idToken);
    const userId = decodedToken.uid;
    await admin.firestore().collection('users').doc(userId).collection('pantry').doc(itemId).delete();
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
