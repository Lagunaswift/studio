
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import type { DailyVitalsLog, DailyManualMacrosLog, Macros, PlannedMeal, PantryItem, RecipeFormData, UserProfileSettings } from '@/types';

// --- User Profile Actions ---
export async function updateUserProfile(updates: Partial<UserProfileSettings>) {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Authentication required.' }

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single();

  if (error) {
    console.error('Error updating profile:', error)
    return { error: 'Could not update your profile.' }
  }

  revalidatePath('/profile', 'layout')
  return { success: true, data }
}

// --- Recipe Actions ---
export async function addRecipe(recipeData: RecipeFormData) {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be logged in to add a recipe.' }
  }

  const dataToInsert = {
    name: recipeData.name,
    description: recipeData.description,
    image: recipeData.image || `https://placehold.co/600x400.png?text=${encodeURIComponent(recipeData.name)}`,
    servings: recipeData.servings,
    prepTime: recipeData.prepTime,
    cookTime: recipeData.cookTime,
    chillTime: recipeData.chillTime,
    ingredients: recipeData.ingredients.map(ing => ing.value),
    macrosPerServing: { 
        calories: recipeData.calories, 
        protein: recipeData.protein, 
        carbs: recipeData.carbs, 
        fat: recipeData.fat 
    },
    instructions: recipeData.instructions.map(inst => inst.value),
    tags: recipeData.tags,
    isCustom: true,
    user_id: user.id,
  };

  const { data, error } = await supabase
    .from('recipes')
    .insert(dataToInsert)
    .select()
    .single()

  if (error) {
    console.error('Error adding recipe:', error)
    return { error: 'Failed to save the recipe.' }
  }

  revalidatePath('/recipes')
  return { success: true, data }
}


// --- Meal Plan Actions ---
export async function addOrUpdateMealPlan(mealData: Omit<PlannedMeal, 'user_id' | 'recipeDetails'>) {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Authentication required.' }

    const dataToUpsert = {
        ...mealData,
        id: mealData.id || `meal_${Date.now()}_${Math.random()}`,
        user_id: user.id,
    };
    
    const { data, error } = await supabase
        .from('planned_meals')
        .upsert(dataToUpsert, { onConflict: 'id, user_id' })
        .select()
        .single();

    if (error) {
        console.error('Error saving meal plan item:', error)
        return { error: 'Could not save your meal plan item.' }
    }
    revalidatePath('/meal-plan', 'layout');
    return { success: true, data };
}

export async function deleteMealFromPlan(plannedMealId: string) {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Authentication required.' }

    const { error } = await supabase
        .from('planned_meals')
        .delete()
        .eq('id', plannedMealId)
        .eq('user_id', user.id);
    
    if (error) {
        console.error('Error deleting meal plan item:', error);
        return { error: 'Could not remove meal from plan.' };
    }
    revalidatePath('/meal-plan', 'layout');
    return { success: true };
}


// --- Pantry Actions ---
export async function addOrUpdatePantryItem(itemData: Omit<PantryItem, 'user_id'>) {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Authentication required.' }

    const dataToUpsert = { ...itemData, user_id: user.id };

    const { data, error } = await supabase
        .from('pantry_items')
        .upsert(dataToUpsert, { onConflict: 'id, user_id' })
        .select()
        .single();
    
    if (error) {
        console.error('Error saving pantry item:', error);
        return { error: 'Could not save item to pantry.' };
    }
    revalidatePath('/pantry');
    return { success: true, data };
}

export async function deletePantryItem(itemId: string) {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Authentication required.' }

    const { error } = await supabase
        .from('pantry_items')
        .delete()
        .eq('id', itemId)
        .eq('user_id', user.id);

    if (error) {
        console.error('Error deleting pantry item:', error);
        return { error: 'Could not remove item from pantry.' };
    }
    revalidatePath('/pantry');
    return { success: true };
}


// --- Daily Log Actions ---
export async function addOrUpdateVitalsLog(vitalsData: Omit<DailyVitalsLog, 'user_id'>) {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Authentication required.' }

  const dataToUpsert = { ...vitalsData, user_id: user.id };

  const { data, error } = await supabase
    .from('daily_vitals_logs')
    .upsert(dataToUpsert, { onConflict: 'date, user_id' }) 
    .select()
    .single() 

  if (error) {
    console.error('Error saving vitals log:', error)
    return { error: 'Could not save your daily vitals.' }
  }

  revalidatePath('/daily-log')
  return { success: true, data }
}

export async function addOrUpdateWeightLog(date: string, weight_kg: number) {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Authentication required.' }

  const { data, error } = await supabase
    .from('daily_weight_logs')
    .upsert({ user_id: user.id, date, weight_kg }, { onConflict: 'date, user_id' })
    .select()
    .single()

  if (error) {
    console.error('Error saving weight log:', error)
    return { error: 'Could not save your weight.' }
  }

  // Also update the main profile weight
  await supabase.from('profiles').update({ weightKg: weight_kg }).eq('id', user.id);

  revalidatePath('/daily-log')
  revalidatePath('/profile/user-info')
  return { success: true, data }
}

export async function addOrUpdateManualMacrosLog(macroData: Omit<DailyManualMacrosLog, 'user_id' | 'id'>) {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Authentication required.' }

    const dataToUpsert = {
        user_id: user.id,
        date: macroData.date,
        calories: macroData.macros.calories,
        protein: macroData.macros.protein,
        carbs: macroData.macros.carbs,
        fat: macroData.macros.fat,
    };

    const { data, error } = await supabase
      .from('daily_manual_macros_logs')
      .upsert(dataToUpsert, { onConflict: 'date, user_id' })
      .select()
      .single()

    if (error) {
      console.error('Error saving manual macros log:', error)
      return { error: 'Could not save your manual macros.' }
    }
    
    const resultData: DailyManualMacrosLog = {
        id: data.id,
        date: data.date,
        macros: {
            calories: data.calories,
            protein: data.protein,
            carbs: data.carbs,
            fat: data.fat,
        },
        user_id: data.user_id,
    };

    revalidatePath('/daily-log')
    return { success: true, data: resultData }
}
