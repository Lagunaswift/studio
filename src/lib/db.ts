
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
    super('MealPlannerProDB');
    this.version(2).stores({
      recipes: 'id, name, *tags, isCustom', // Added isCustom to indexes
      plannedMeals: 'id, date, mealType, recipeId',
      pantryItems: 'id, name, category',
      dailyWeightLog: 'date',
      userProfile: 'id', // Assuming a single user profile with a static ID
      dailyVitalsLog: 'date',
      dailyManualMacrosLog: 'date'
    });
  }
}

export const db = new AppDatabase();

// --- Database Interaction Functions ---

// Function to get or create a user profile
export async function getOrCreateUserProfile(userId: string): Promise<UserProfileSettings> {
    const existingProfile = await db.userProfile.get(userId);
    if (existingProfile) {
        return existingProfile;
    }

    // If no profile exists, create and add it in a separate transaction.
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
        activityLevel: null,
        trainingExperienceLevel: null,
        bodyFatPercentage: null,
        athleteType: null,
        primaryGoal: null,
        tdee: null,
        leanBodyMassKg: null,
        rda: null,
        subscription_status: 'none',
        hasAcceptedTerms: false,
        lastCheckInDate: null,
        targetWeightChangeRateKg: null,
        dashboardSettings: { showMacros: true, showMenu: true, showFeaturedRecipe: true, showQuickRecipes: true },
    };

    try {
        await db.userProfile.put(newProfile);
    } catch (error) {
        console.error("Failed to create user profile:", error);
        // Depending on requirements, you might want to re-throw or handle this differently
    }

    return newProfile;
}

// Function to update user profile
export async function updateUserProfile(userId: string, updates: Partial<UserProfileSettings>): Promise<UserProfileSettings> {
  await db.userProfile.update(userId, updates);
  return (await db.userProfile.get(userId))!;
}
