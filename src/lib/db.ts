

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
    super('MealPlannerProDB_v3'); // Increment version for schema change
    this.version(2).stores({ // New version with syncStatus index
      recipes: '++id, name, *tags, isCustom', 
      plannedMeals: 'id, date, mealType, recipeId, syncStatus', // Add syncStatus
      pantryItems: 'id, name, category, syncStatus', // Add syncStatus
      dailyWeightLog: 'date, syncStatus', // Add syncStatus
      userProfile: 'id, syncStatus', // Add syncStatus
      dailyVitalsLog: 'date, syncStatus', // Add syncStatus
      dailyManualMacrosLog: 'id, date, syncStatus' // Add id as primary key & syncStatus
    }).upgrade(tx => {
       // This upgrade function will only run if the user had version 1.
       // It's a good place to migrate data if needed, but for now, we'll just let Dexie handle the schema update.
       console.log("Upgrading Dexie schema from v1 to v2");
    });
    // This is the latest schema definition.
    // If a user has v1, it will be upgraded by the function above.
    // If a user has no database, this v2 schema will be created.
    this.version(1).stores({ 
        recipes: '++id, name, *tags, isCustom', 
        plannedMeals: 'id, date, mealType, recipeId',
        pantryItems: 'id, name, category',
        dailyWeightLog: 'date',
        userProfile: 'id', 
        dailyVitalsLog: 'date',
        dailyManualMacrosLog: 'date'
    });
  }
}

export const db = new AppDatabase();

// --- Database Interaction Functions ---

// Function to get or create a user profile
export async function getOrCreateUserProfile(userId: string): Promise<UserProfileSettings> {
  let profile = await db.userProfile.get(userId);
  if (profile) {
    return profile;
  }

  // If no profile exists, create a new one.
  const newProfile: UserProfileSettings = {
      id: userId,
      email: null,
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
      trainingExperienceLevel: 'notSpecified',
      bodyFatPercentage: null,
      athleteType: 'notSpecified',
      primaryGoal: 'notSpecified',
      tdee: null,
      leanBodyMassKg: null,
      rda: null,
      subscription_status: 'none',
      hasAcceptedTerms: false,
      lastCheckInDate: null,
      targetWeightChangeRateKg: null,
      dashboardSettings: { showMacros: true, showMenu: true, showFeaturedRecipe: true, showQuickRecipes: true },
      // Initialize log arrays as empty
      dailyWeightLog: [],
      dailyVitalsLog: [],
      dailyManualMacrosLog: [],
      favorite_recipe_ids: [],
      syncStatus: 'synced',
  };

  try {
    await db.userProfile.put(newProfile);
    return newProfile;
  } catch (error) {
    console.error("Failed to create user profile:", error);
    throw error;
  }
}
