export interface Ingredient {
  name: string;
  quantity: number;
  unit: string;
  category: string; // e.g., Produce, Dairy, Meat, Pantry
}

export interface Macros {
  protein: number; // in grams
  carbs: number; // in grams
  fat: number; // in grams
  calories: number;
}

export interface Recipe {
  id: string;
  name: string;
  description: string;
  image: string; // URL to image
  servings: number; // Default servings the recipe makes
  prepTime: string; // e.g., "15 mins"
  cookTime: string; // e.g., "30 mins"
  ingredients: Ingredient[];
  macrosPerServing: Macros;
  instructions: string[];
  tags?: string[]; // e.g., "vegetarian", "quick", "high-protein"
}

export type MealType = "Breakfast" | "Lunch" | "Dinner" | "Snack";

export interface PlannedMeal {
  id: string; // Unique ID for this planned instance, e.g., recipe.id + date + mealType
  recipeId: string;
  date: string; // YYYY-MM-DD
  mealType: MealType;
  servings: number; // Number of servings planned for this meal
  recipeDetails?: Recipe; // Optional: denormalized recipe details for easier access
}

export interface ShoppingListItem {
  id: string; // ingredientName + unit
  name: string;
  quantity: number;
  unit: string;
  category: string;
  purchased: boolean;
  recipes: Array<{ recipeId: string; recipeName: string }>; // Track which recipes need this ingredient
}

export interface DailyMacros extends Macros {
  date: string;
}
