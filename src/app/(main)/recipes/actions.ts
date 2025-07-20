
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import type { Recipe, RecipeFormData } from '@/types';

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

  return { success: true, data: data as Recipe }
}
