
import { type PlannedMeal, type Recipe, type ShoppingListItem, type PantryItem, type UKSupermarketCategory, UK_SUPERMARKET_CATEGORIES, type DailyWeightLog } from '@/types';
import { parse as dateParse, differenceInDays } from 'date-fns';

// ... (keep existing calculateTotalMacros, assignCategory, generateShoppingList functions)

export const calculateTotalMacros = (plannedMeals: PlannedMeal[], allRecipes: Recipe[]): Macros => {
  if (!allRecipes || allRecipes.length === 0) {
    return { protein: 0, carbs: 0, fat: 0, calories: 0 };
  }
  
  return plannedMeals.reduce((acc, plannedMeal) => {
    const recipe = plannedMeal.recipeDetails || allRecipes.find(r => r.id === plannedMeal.recipeId);
    
    // Add safety check for macrosPerServing
    if (recipe && recipe.macrosPerServing) {
      acc.calories += (recipe.macrosPerServing.calories || 0) * plannedMeal.servings;
      acc.protein += (recipe.macrosPerServing.protein || 0) * plannedMeal.servings;
      acc.carbs += (recipe.macrosPerServing.carbs || 0) * plannedMeal.servings;
      acc.fat += (recipe.macrosPerServing.fat || 0) * plannedMeal.servings;
    } else {
      console.warn('Recipe missing macrosPerServing data:', recipe?.name || 'Unknown recipe');
    }
    
    return acc;
  }, { protein: 0, carbs: 0, fat: 0, calories: 0 });
};

// ... (other functions)
