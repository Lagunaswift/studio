
// src/types/index.ts

import { z } from 'zod';

export const SEX_OPTIONS = ['male', 'female', 'notSpecified'] as const;
export type Sex = typeof SEX_OPTIONS[number];

export const ACTIVITY_LEVEL_OPTIONS = [
    { value: 'sedentary', label: 'Sedentary (little or no exercise)', multiplier: 1.2 },
    { value: 'lightlyActive', label: 'Lightly Active (light exercise/sports 1-3 days/week)', multiplier: 1.375 },
    { value: 'moderatelyActive', label: 'Moderately Active (moderate exercise/sports 3-5 days/week)', multiplier: 1.55 },
    { value: 'veryActive', label: 'Very Active (hard exercise/sports 6-7 days a week)', multiplier: 1.725 },
    { value: 'extraActive', label: 'Extra Active (very hard exercise/sports & physical job)', multiplier: 1.9 },
    { value: 'notSpecified', label: 'Not Specified', multiplier: 1.2 }
] as const;
export type ActivityLevel = typeof ACTIVITY_LEVEL_OPTIONS[number]['value'];

export const ATHLETE_TYPE_OPTIONS = [
    { value: 'notSpecified', label: 'Not Specified' },
    { value: 'endurance', label: 'Endurance Athlete' },
    { value: 'strengthPower', label: 'Strength/Power Athlete' },
    { value: 'teamSport', label: 'Team Sport Athlete' },
    { value: 'weekendWarrior', label: 'Weekend Warrior' },
] as const;
export type AthleteType = typeof ATHLETE_TYPE_OPTIONS[number]['value'];

export const PRIMARY_GOAL_OPTIONS = [
    { value: 'notSpecified', label: 'Not Specified' },
    { value: 'fatLoss', label: 'Fat Loss' },
    { value: 'muscleGain', label: 'Muscle Gain' },
    { value: 'maintenance', label: 'Maintenance' },
] as const;
export type PrimaryGoal = typeof PRIMARY_GOAL_OPTIONS[number]['value'];

export const TRAINING_EXPERIENCE_OPTIONS = [
    { value: 'notSpecified', label: 'Not Specified' },
    { value: 'beginner', label: 'Beginner (0-1 years)' },
    { value: 'intermediate', label: 'Intermediate (1-3 years)' },
    { value: 'advanced', label: 'Advanced (3+ years)' },
] as const;

export type TrainingExperienceLevel = typeof TRAINING_EXPERIENCE_OPTIONS[number]['value'];

export const MENOPAUSE_STATUS_OPTIONS = ['notSpecified', 'pre', 'post'] as const;
export type MenopauseStatus = typeof MENOPAUSE_STATUS_OPTIONS[number];


export interface Macros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export type MacroTargets = Macros;

export interface MealSlotConfig {
  id: string;
  name: string;
  type: MealType;
}

export interface DashboardSettings {
  showMacros: boolean;
  showMenu: boolean;
  showFeaturedRecipe: boolean;
  showQuickRecipes: boolean;
}

export const UserProfileSettingsSchema = z.object({
  id: z.string(),
  email: z.string().email().nullable(),
  name: z.string().nullable(),
  macroTargets: z.object({
    calories: z.number(),
    protein: z.number(),
    carbs: z.number(),
    fat: z.number(),
  }).nullable(),
  dietaryPreferences: z.array(z.string()),
  allergens: z.array(z.string()),
  mealStructure: z.array(z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
  })),
  heightCm: z.number().nullable(),
  weightKg: z.number().nullable(),
  age: z.number().nullable(),
  sex: z.enum(SEX_OPTIONS),
  menopauseStatus: z.enum(MENOPAUSE_STATUS_OPTIONS).nullable().optional(),
  activityLevel: z.enum(ACTIVITY_LEVEL_OPTIONS.map(o => o.value) as [ActivityLevel, ...ActivityLevel[]]),
  training_experience_level: z.enum(TRAINING_EXPERIENCE_OPTIONS.map(o => o.value) as [TrainingExperienceLevel, ...TrainingExperienceLevel[]]).nullable(),
  bodyFatPercentage: z.number().nullable(),
  athleteType: z.enum(ATHLETE_TYPE_OPTIONS.map(o => o.value) as [AthleteType, ...AthleteType[]]).nullable(),
  primaryGoal: z.enum(PRIMARY_GOAL_OPTIONS.map(o => o.value) as [PrimaryGoal, ...PrimaryGoal[]]).nullable(),
  tdee: z.number().nullable(),
  leanBodyMassKg: z.number().nullable(),
  rda: z.any().nullable(),
  subscription_status: z.string().nullable(),
  has_accepted_terms: z.boolean(),
  last_check_in_date: z.string().nullable(),
  target_weight_change_rate_kg: z.number().nullable(),
  dashboardSettings: z.object({
    showMacros: z.boolean(),
    showMenu: z.boolean(),
    showFeaturedRecipe: z.boolean(),
    showQuickRecipes: z.boolean(),
  }),
  favorite_recipe_ids: z.array(z.number()),
});


export type UserProfileSettings = z.infer<typeof UserProfileSettingsSchema>;

export type MealType = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';

export interface PlannedMeal {
  id: string;
  user_id: string;
  recipeId: number;
  date: string; // YYYY-MM-DD
  mealType: MealType;
  servings: number;
  status: 'planned' | 'eaten';
  recipeDetails?: Recipe; // Optional: To be populated client-side
}

export const UK_SUPERMARKET_CATEGORIES = [
  'Fresh Fruit & Vegetables',
  'Meat & Poultry', 
  'Fish & Seafood',
  'Dairy, Butter & Eggs',
  'Bakery',
  'Food Cupboard',
  'Frozen Foods',
  'Drinks',
  'Snacks & Confectionery',
  'Health & Beauty',
  'Household',
  'Other Food Items'
] as const;

export type UKSupermarketCategory = typeof UK_SUPERMARKET_CATEGORIES[number];

export interface ShoppingListItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: UKSupermarketCategory;
  completed: boolean;
}

export interface PantryItem {
  id: string;
  user_id: string;
  name: string;
  quantity: number;
  unit: string;
  category: UKSupermarketCategory;
  expiryDate?: string; // YYYY-MM-DD
}

export interface Recipe {
    id: number;
    user_id: string | null;
    name: string;
    description: string;
    servings: number;
    prepTime: number;
    cookTime: number;
    ingredients: { name: string; quantity: number; unit: string; }[];
    instructions: string[];
    macrosPerServing: Macros; // This should never be optional/undefined
    imageUrl: string;
    tags: string[];
}

// Add a helper type for potentially incomplete recipes during loading
export interface PartialRecipe extends Omit<Recipe, 'macrosPerServing'> {
    macrosPerServing?: Macros;
}

export type RecipeFormData = Omit<Recipe, 'id' | 'user_id'>;

export interface DailyWeightLog {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  weightKg: number;
  trendWeightKg?: number;
}

export interface DailyVitalsLog {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  sleepHours: number;
  stressLevel: number; // 1-10
  energyLevel: number; // 1-10
}

export interface DailyManualMacrosLog {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  macros: Macros;
}

export type SubscriptionStatus = 'active' | 'inactive' | 'trialing' | 'none';

export interface RDA {
    thiamine?: number;
    riboflavin?: number;
    niacin?: number;
    pantothenicAcid?: number;
    pyridoxine?: number;
    cobalamin?: number;
    biotin?: number;
    choline?: number;
    folate?: number;
    vitaminA?: number;
    vitaminC?: number;
    vitaminD?: number;
    vitaminE?: number;
    vitaminK?: number;
    calcium?: number;
    chromium?: number;
    copper?: number;
    fluoride?: number;
    iodine?: number;
    iron?: number;
    magnesium?: number;
    manganese?: number;
    molybdenum?: number;
    phosphorus?: number;
    potassium?: number;
    selenium?: number;
    sodium?: number;
    zinc?: number;
}
