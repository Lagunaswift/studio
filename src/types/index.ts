
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
  instructions: string[]; // Added instructions
  tags?: string[]; // e.g., "vegetarian", "quick", "high-protein"

  // Raw macro fields from new structure, used to populate macrosPerServing
  // These are kept for source data, but macrosPerServing is the canonical one
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
  mealType: MealType; // This refers to the general category of the meal
  servings: number; // Number of servings planned for this meal
  recipeDetails?: Recipe; // Optional: denormalized recipe details for easier access
  // mealSlotId?: string; // Optionally link to a specific MealSlotConfig.id if needed for more granular planning
}

export type UKSupermarketCategory =
  | "Fresh Fruit & Vegetables"
  | "Bakery"
  | "Meat & Poultry"
  | "Fish & Seafood"
  | "Dairy, Butter & Eggs"
  | "Chilled Foods"
  | "Frozen Foods"
  | "Food Cupboard"
  | "Drinks"
  | "Other Food Items";

export interface ShoppingListItem {
  id: string; // ingredientName (now a simple string)
  name: string;
  quantity: number; // Will be simplified
  unit: string; // Will be simplified
  category: UKSupermarketCategory;
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

export interface MealSlotConfig {
  id: string; // Unique ID for this slot, e.g., timestamp or uuid
  name: string; // User-defined name, e.g., "Breakfast", "Morning Snack"
  type: MealType; // The general category: "Breakfast", "Lunch", "Dinner", "Snack"
}

export type Sex = 'male' | 'female';
export const SEX_OPTIONS: Sex[] = ['male', 'female'];

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'veryActive';
export const ACTIVITY_LEVEL_OPTIONS: { value: ActivityLevel; label: string; multiplier: number }[] = [
  { value: 'sedentary', label: 'Sedentary (little or no exercise)', multiplier: 1.2 },
  { value: 'light', label: 'Lightly active (light exercise/sports 1-3 days/week)', multiplier: 1.375 },
  { value: 'moderate', label: 'Moderately active (moderate exercise/sports 3-5 days/week)', multiplier: 1.55 },
  { value: 'active', label: 'Very active (hard exercise/sports 6-7 days a week)', multiplier: 1.725 },
  { value: 'veryActive', label: 'Extra active (very hard exercise/sports & physical job)', multiplier: 1.9 },
];

export type AthleteType = 'endurance' | 'strengthPower' | 'generalFitness' | 'notSpecified';
export const ATHLETE_TYPE_OPTIONS: { value: AthleteType; label: string }[] = [
  { value: 'notSpecified', label: 'Not Specified' },
  { value: 'endurance', label: 'Endurance Athlete' },
  { value: 'strengthPower', label: 'Strength/Power Athlete' },
  { value: 'generalFitness', label: 'General Fitness' },
];

export type PrimaryGoal = 'fatLoss' | 'muscleGain' | 'maintenance' | 'notSpecified';
export const PRIMARY_GOAL_OPTIONS: { value: PrimaryGoal; label: string }[] = [
  { value: 'notSpecified', label: 'Not Specified' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'fatLoss', label: 'Fat Loss' },
  { value: 'muscleGain', label: 'Muscle Gain' },
];

export interface UserProfileSettings {
  macroTargets: MacroTargets | null;
  dietaryPreferences: string[];
  allergens: string[];
  mealStructure: MealSlotConfig[];
  // Physical attributes
  heightCm: number | null;
  weightKg: number | null;
  age: number | null;
  sex: Sex | null;
  activityLevel: ActivityLevel | null;
  bodyFatPercentage: number | null; // Optional
  athleteType: AthleteType | null;
  primaryGoal: PrimaryGoal | null;
  // Calculated values
  tdee: number | null; // Total Daily Energy Expenditure
  leanBodyMassKg: number | null;
}
