
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
  id: number; // Changed from string
  name: string;
  description?: string; // Made optional
  image: string; // URL to image, will use placeholder
  servings: number;
  prepTime: string; // e.g., "15 mins"
  cookTime: string; // e.g., "30 mins"
  chillTime?: string; // New optional field
  ingredients: string[]; // Changed from Ingredient[]
  macrosPerServing: Macros; // Will be populated from top-level cal, pro, carb, fat
  tags?: string[]; // e.g., "vegetarian", "quick", "high-protein"

  // Raw macro fields from new structure, used to populate macrosPerServing
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export type MealType = "Breakfast" | "Lunch" | "Dinner" | "Snack";

export interface PlannedMeal {
  id: string; // Unique ID for this planned instance, e.g., recipe.id + date + mealType
  recipeId: number; // Changed from string
  date: string; // YYYY-MM-DD
  mealType: MealType;
  servings: number; // Number of servings planned for this meal
  recipeDetails?: Recipe; // Optional: denormalized recipe details for easier access
}

export interface ShoppingListItem {
  id: string; // ingredientName (now a simple string)
  name: string;
  quantity: number; // Will be simplified
  unit: string; // Will be simplified
  category: string; // Will be simplified
  purchased: boolean;
  recipes: Array<{ recipeId: number; recipeName: string }>; // Track which recipes need this ingredient
}

export interface DailyMacros extends Macros {
  date: string;
}

export interface MacroTargets {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}
