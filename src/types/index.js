import { z } from 'zod';
export const MacrosSchema = z.object({
    protein: z.number().nonnegative(),
    carbs: z.number().nonnegative(),
    fat: z.number().nonnegative(),
    calories: z.number().nonnegative(),
});
export const MicronutrientsSchema = z.object({
    iron: z.number().nullable(),
    calcium: z.number().nullable(),
    potassium: z.number().nullable(),
    vitaminA: z.number().nullable(),
    vitaminC: z.number().nullable(),
    vitaminD: z.number().nullable(),
});
export const RecipeSchema = z.object({
    id: z.number(),
    name: z.string().min(1),
    description: z.string().optional(),
    image: z.string().optional(),
    servings: z.number().positive(),
    prepTime: z.string().optional(),
    cookTime: z.string().optional(),
    chillTime: z.string().optional(),
    ingredients: z.array(z.string()),
    macrosPerServing: MacrosSchema,
    micronutrientsPerServing: MicronutrientsSchema.nullable(),
    instructions: z.array(z.string()),
    tags: z.array(z.string()).optional(),
    isCustom: z.boolean().optional(),
    user_id: z.string().nullable().optional(),
    is_favorite: z.boolean().optional(),
});
export const MealSlotConfigSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.enum(["Breakfast", "Lunch", "Dinner", "Snack"]),
});
export const SEX_OPTIONS = ['male', 'female'];
export const ACTIVITY_LEVEL_OPTIONS = [
    { value: 'notSpecified', label: 'Not Specified', multiplier: 1.2 },
    { value: 'sedentary', label: 'Sedentary (little or no exercise)', multiplier: 1.2 },
    { value: 'light', label: 'Lightly active (light exercise/sports 1-3 days/week)', multiplier: 1.375 },
    { value: 'moderate', label: 'Moderately active (moderate exercise/sports 3-5 days/week)', multiplier: 1.55 },
    { value: 'active', label: 'Very active (hard exercise/sports 6-7 days a week)', multiplier: 1.725 },
    { value: 'veryActive', label: 'Extra active (very hard exercise/sports & physical job)', multiplier: 1.9 },
];
export const ATHLETE_TYPE_OPTIONS = [
    { value: 'notSpecified', label: 'Not Specified' },
    { value: 'endurance', label: 'Endurance Athlete' },
    { value: 'strengthPower', label: 'Strength/Power Athlete' },
    { value: 'generalFitness', label: 'General Fitness' },
];
export const PRIMARY_GOAL_OPTIONS = [
    { value: 'notSpecified', label: 'Not Specified' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'fatLoss', label: 'Fat Loss' },
    { value: 'muscleGain', label: 'Muscle Gain' },
];
export const TRAINING_EXPERIENCE_OPTIONS = [
    { value: 'notSpecified', label: 'Not Specified' },
    { value: 'beginner', label: 'Beginner (1st year)' },
    { value: 'intermediate', label: 'Intermediate (2nd year)' },
    { value: 'advanced', label: 'Advanced (3rd year)' },
    { value: 'veryAdvanced', label: 'Very Advanced (4+ years)' },
];
export const DashboardSettingsSchema = z.object({
    showMacros: z.boolean().default(true),
    showMenu: z.boolean().default(true),
    showFeaturedRecipe: z.boolean().default(true),
    showQuickRecipes: z.boolean().default(true),
});
export const DailyWeightLogSchema = z.object({
    date: z.string(),
    weightKg: z.number(),
    trendWeightKg: z.number().optional(),
    syncStatus: z.enum(['synced', 'pending']).optional(),
    user_id: z.string().optional(),
});
export const DailyVitalsLogSchema = z.object({
    date: z.string(),
    sleepQuality: z.number().min(1).max(10),
    energyLevel: z.enum(['low', 'moderate', 'high', 'vibrant']),
    cravingsLevel: z.number().min(1).max(10),
    muscleSoreness: z.enum(['none', 'mild', 'moderate', 'severe']),
    activityYesterday: z.enum(['rest', 'light', 'moderate', 'strenuous']),
    notes: z.string().optional(),
    syncStatus: z.enum(['synced', 'pending']).optional(),
    user_id: z.string().optional(),
});
export const DailyManualMacrosLogSchema = z.object({
    id: z.string(),
    date: z.string(),
    macros: MacrosSchema,
    user_id: z.string(),
    syncStatus: z.enum(['synced', 'pending']).optional(),
});
export const UserProfileSettingsSchema = z.object({
    id: z.string(),
    name: z.string().nullable().optional(),
    email: z.string().email().nullable().optional(),
    macroTargets: MacrosSchema.nullable(),
    dietaryPreferences: z.array(z.string()),
    allergens: z.array(z.string()),
    mealStructure: z.array(MealSlotConfigSchema),
    heightCm: z.number().positive().nullable(),
    weightKg: z.number().positive().nullable(),
    age: z.number().positive().nullable(),
    sex: z.enum(['male', 'female', 'notSpecified']).nullable(),
    activityLevel: z.enum(ACTIVITY_LEVEL_OPTIONS.map(o => o.value)).nullable(),
    training_experience_level: z.enum(TRAINING_EXPERIENCE_OPTIONS.map(o => o.value)).nullable(),
    bodyFatPercentage: z.number().min(1).max(70).nullable(),
    athleteType: z.enum(ATHLETE_TYPE_OPTIONS.map(o => o.value)).nullable(),
    primaryGoal: z.enum(PRIMARY_GOAL_OPTIONS.map(o => o.value)).nullable(),
    tdee: z.number().nullable(),
    leanBodyMassKg: z.number().nullable(),
    rda: MicronutrientsSchema.nullable(),
    neck_circumference_cm: z.number().positive().nullable().optional(),
    abdomen_circumference_cm: z.number().positive().nullable().optional(),
    waist_circumference_cm: z.number().positive().nullable().optional(),
    hip_circumference_cm: z.number().positive().nullable().optional(),
    dailyWeightLog: z.array(DailyWeightLogSchema).optional(),
    dailyVitalsLog: z.array(DailyVitalsLogSchema).optional(),
    dailyManualMacrosLog: z.array(DailyManualMacrosLogSchema).optional(),
    dashboardSettings: DashboardSettingsSchema.optional(),
    favorite_recipe_ids: z.array(z.number()).optional(),
    subscription_status: z.enum(['active', 'inactive', 'none']).nullable(),
    plan_name: z.string().nullable().optional(),
    subscription_start_date: z.string().nullable().optional(),
    subscription_end_date: z.string().nullable().optional(),
    subscription_duration: z.string().nullable().optional(),
    has_accepted_terms: z.boolean().optional(),
    last_check_in_date: z.string().nullable().optional(),
    target_weight_change_rate_kg: z.number().nullable().optional(),
    syncStatus: z.enum(['synced', 'pending']).optional(),
});
