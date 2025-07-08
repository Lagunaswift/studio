

export interface Macros {
  protein: number; // in grams
  carbs: number; // in grams
  fat: number; // in grams
  calories: number;
}

// New type for micronutrients
export interface Micronutrients {
  iron: number | null;
  calcium: number | null;
  potassium: number | null;
  vitaminA: number | null;
  vitaminC: number | null;
  vitaminD: number | null;
}

export type RDA = Micronutrients;

// Updated Ingredient structure
export interface Ingredient {
  name: string;
  quantity: number;
  unit: string;
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
  micronutrientsPerServing: Micronutrients | null; // Added micronutrients
  instructions: string[];
  tags?: string[];
  isCustom?: boolean;
  user_id?: string | null; // For custom recipes
}

export type MealType = "Breakfast" | "Lunch" | "Dinner" | "Snack";

export interface PlannedMeal {
  id: string; // Corresponds to id in meal_plan_entries table
  recipeId: number;
  date: string; // YYYY-MM-DD
  mealType: MealType;
  servings: number;
  status: 'planned' | 'eaten';
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
  id: string; // Corresponds to id in pantry_items table
  name: string;
  quantity: number;
  unit: string;
  category: UKSupermarketCategory;
  expiryDate?: string; // YYYY-MM-DD format
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

export type TrainingExperienceLevel = 'beginner' | 'intermediate' | 'advanced' | 'veryAdvanced' | 'notSpecified';
export const TRAINING_EXPERIENCE_OPTIONS: { value: TrainingExperienceLevel; label: string }[] = [
    { value: 'notSpecified', label: 'Not Specified' },
    { value: 'beginner', label: 'Beginner (1st year)' },
    { value: 'intermediate', label: 'Intermediate (2nd year)' },
    { value: 'advanced', label: 'Advanced (3rd year)' },
    { value: 'veryAdvanced', label: 'Very Advanced (4+ years)' },
];

export type SubscriptionStatus = 'active' | 'inactive' | 'none' | null;

export interface DashboardSettings {
  showMacros: boolean;
  showMenu: boolean;
  showFeaturedRecipe: boolean;
  showQuickRecipes: boolean;
}

export interface DailyWeightLog {
  date: string; // YYYY-MM-DD
  weightKg: number;
  trendWeightKg?: number;
}

export type Mood = 'stressed' | 'okay' | 'great';
export type Energy = 'low' | 'medium' | 'high';

export interface DailyWellnessLog {
  date: string; // YYYY-MM-DD
  mood: Mood;
  energy: Energy;
}

// --- New Types for Daily Vitals Check-in ---
export type EnergyLevelV2 = 'low' | 'moderate' | 'high' | 'vibrant';
export type SorenessLevel = 'none' | 'mild' | 'moderate' | 'severe';
export type ActivityYesterdayLevel = 'rest' | 'light' | 'moderate' | 'strenuous';

export interface DailyVitalsLog {
  date: string; // YYYY-MM-DD
  sleepQuality: number; // 1-10
  energyLevel: EnergyLevelV2;
  cravingsLevel: number; // 1-10
  muscleSoreness: SorenessLevel;
  activityYesterday: ActivityYesterdayLevel;
  notes?: string;
}
// --- End of New Types ---


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
  trainingExperienceLevel: TrainingExperienceLevel | null;
  bodyFatPercentage: number | null;
  athleteType: AthleteType | null;
  primaryGoal: PrimaryGoal | null;
  tdee: number | null;
  leanBodyMassKg: number | null;
  rda: RDA | null; // Added RDA
  neckCircumferenceCm?: number | null;
  abdomenCircumferenceCm?: number | null; // Male
  waistCircumferenceCm?: number | null;   // Female
  hipCircumferenceCm?: number | null;     // Female
  dailyWeightLog?: DailyWeightLog[];
  dailyWellnessLog?: DailyWellnessLog[];
  dailyVitalsLog?: DailyVitalsLog[]; // Added for new feature
  dashboardSettings?: DashboardSettings;
  favorite_recipe_ids?: number[];
  subscription_status: SubscriptionStatus;
  plan_name?: string | null;
  subscription_start_date?: string | null;
  subscription_end_date?: string | null;
  subscription_duration?: string | null;
  hasAcceptedTerms?: boolean;
  lastCheckInDate?: string | null; // YYYY-MM-DD
  targetWeightChangeRateKg?: number | null; // e.g., -0.5 for loss, 0.25 for gain
}

// This type will be used for the Recipe Form
export interface RecipeFormData {
  name: string;
  description?: string;
  image?: string; // URL
  servings: number;
  prepTime: string;
  cookTime: string;
  chillTime?: string;
  ingredients: { value: string }[]; // For react-hook-form field array
  instructions: { value: string }[]; // For react-hook-form field array
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  tags?: string[];
}

    
