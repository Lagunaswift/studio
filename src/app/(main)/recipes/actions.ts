
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { RecipeFormData } from '@/types';

export async function addRecipe(recipeData: RecipeFormData) {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  // 1. Get the current user's data
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be logged in to add a recipe.' }
  }

  // 2. Prepare the data for insertion
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
    user_id: user.id, // Associate the recipe with the current user
  };


  // 3. Insert the new recipe into the 'recipes' table
  const { data, error } = await supabase
    .from('recipes')
    .insert(dataToInsert)
    .select() // Use .select() to get the newly created recipe back

  if (error) {
    console.error('Error adding recipe:', error)
    return { error: 'Failed to save the recipe.' }
  }

  // 4. Revalidate the cache for the recipes page so the new recipe appears
  revalidatePath('/recipes')

  // Optional: Redirect to the new recipe's page or back to the list
  redirect('/recipes')

  return { success: true, data: data[0] }
}
