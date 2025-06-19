
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
  id: number;
  name: string;
  description?: string;
  image: string;
  servings: number;
  prepTime: string;
  cookTime: string;
  chillTime?: string;
  ingredients: string[];
  macrosPerServing: Macros;
  instructions: string[];
  tags?: string[];

  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export type MealType = "Breakfast" | "Lunch" | "Dinner" | "Snack";

export interface PlannedMeal {
  id: string;
  recipeId: number;
  date: string; // YYYY-MM-DD
  mealType: MealType;
  servings: number;
  recipeDetails?: Recipe;
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
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: UKSupermarketCategory;
  purchased: boolean;
  recipes: Array<{ recipeId: number; recipeName: string }>;
}

export interface PantryItem {
  id: string; // Typically ingredientName.toLowerCase() + unit.toLowerCase()
  name: string;
  quantity: number;
  unit: string;
  category: UKSupermarketCategory;
  expiryDate?: string; // YYYY-MM-DD format
  // lastUpdated?: string; // ISO date string - for future use
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
  id: string;
  name: string;
  type: MealType;
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

export type SubscriptionStatus = 'active' | 'inactive' | 'none' | null;

export interface UserProfileSettings {
  name?: string | null;
  email?: string | null;
  macroTargets: MacroTargets | null;
  dietaryPreferences: string[];
  allergens: string[];
  mealStructure: MealSlotConfig[];
  heightCm: number | null;
  weightKg: number | null;
  age: number | null;
  sex: Sex | null;
  activityLevel: ActivityLevel | null;
  bodyFatPercentage: number | null;
  athleteType: AthleteType | null;
  primaryGoal: PrimaryGoal | null;
  tdee: number | null;
  leanBodyMassKg: number | null;
  // Navy Body Fat Calculation Inputs
  neckCircumferenceCm?: number | null;
  abdomenCircumferenceCm?: number | null; // Male
  waistCircumferenceCm?: number | null;   // Female
  hipCircumferenceCm?: number | null;     // Female
  subscription_status: SubscriptionStatus;
  plan_name?: string | null;
  subscription_start_date?: string | null;
  subscription_end_date?: string | null;
  subscription_duration?: string | null;
}

