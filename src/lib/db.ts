

import Dexie, { type Table } from 'dexie';
import type { Recipe, PlannedMeal, PantryItem, DailyWeightLog, UserProfileSettings, DailyVitalsLog, DailyManualMacrosLog } from '@/types';

// Define the database schema using Dexie
export class AppDatabase extends Dexie {
  recipes!: Table<Recipe>;
  plannedMeals!: Table<PlannedMeal>;
  pantryItems!: Table<PantryItem>;
  dailyWeightLog!: Table<DailyWeightLog>;
  userProfile!: Table<UserProfileSettings>;
  dailyVitalsLog!: Table<DailyVitalsLog>;
  dailyManualMacrosLog!: Table<DailyManualMacrosLog>;

  constructor() {
    super('MealPlannerProDB_v3_Firebase'); // New DB name for clean migration
    this.version(1).stores({ 
        recipes: '++id, name, *tags, isCustom', 
        plannedMeals: 'id, date, mealType, recipeId',
        pantryItems: 'id, name, category',
        dailyWeightLog: 'date',
        userProfile: 'id', 
        dailyVitalsLog: 'date',
        dailyManualMacrosLog: 'id' // Using id which is now predictable
    });
  }
}

export const db = new AppDatabase();

// --- Database Interaction Functions ---

// Function to get or create a user profile
export async function getOrCreateUserProfile(userId: string, userEmail: string | null): Promise<UserProfileSettings> {
  let profile = await db.userProfile.get(userId);
  if (profile) {
    return profile;
  }

  // If no profile exists, create a new one.
  const newProfile: UserProfileSettings = {
      id: userId,
      email: userEmail,
      name: null,
      macroTargets: null,
      dietaryPreferences: [],
      allergens: [],
      mealStructure: [
          { id: '1', name: 'Breakfast', type: 'Breakfast' },
          { id: '2', name: 'Lunch', type: 'Lunch' },
          { id: '3', name: 'Dinner', type: 'Dinner' },
          { id: '4', name: 'Snack', type: 'Snack' },
      ],
      heightCm: null,
      weightKg: null,
      age: null,
      sex: null,
      activityLevel: 'notSpecified',
      training_experience_level: 'notSpecified',
      bodyFatPercentage: null,
      athleteType: 'notSpecified',
      primaryGoal: 'notSpecified',
      tdee: null,
      leanBodyMassKg: null,
      subscription_status: 'none',
      has_accepted_terms: false,
      last_check_in_date: null,
      target_weight_change_rate_kg: null,
      dashboardSettings: { showMacros: true, showMenu: true, showFeaturedRecipe: true, showQuickRecipes: true },
      // Initialize log arrays as empty
      dailyWeightLog: [],
      dailyVitalsLog: [],
      dailyManualMacrosLog: [],
      favorite_recipe_ids: [],
  };

  try {
    await db.userProfile.put(newProfile);
    return newProfile;
  } catch (error) {
    console.error("Failed to create user profile:", error);
    throw error;
  }
}
