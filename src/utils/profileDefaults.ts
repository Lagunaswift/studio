// src/utils/profileDefaults.ts
import type { UserProfileSettings } from '@/types';

export function getDefaultUserProfile(userId: string): UserProfileSettings {
  return {
    id: userId,
    email: null, // ✅ ADDED missing field
    name: null,  // ✅ ADDED missing field
    macroTargets: {
      protein: 120,
      carbs: 200,
      fat: 60,
      calories: 1800
    },
    dietaryPreferences: [],
    allergens: [],
    mealStructure: [
      { id: 'breakfast', name: 'Breakfast', type: 'Breakfast' },
      { id: 'lunch', name: 'Lunch', type: 'Lunch' },
      { id: 'dinner', name: 'Dinner', type: 'Dinner' },
      { id: 'snack1', name: 'Morning Snack', type: 'Snack' },
      { id: 'snack2', name: 'Evening Snack', type: 'Snack' }
    ],
    heightCm: 170,
    weightKg: 70,
    age: 30,
    sex: 'notSpecified', // ✅ CORRECT
    activityLevel: 'lightlyActive', // ✅ FIXED: was 'moderate'
    training_experience_level: 'notSpecified', // ✅ CORRECT
    bodyFatPercentage: 18,
    athleteType: 'notSpecified', // ✅ FIXED: ensure valid enum
    primaryGoal: 'notSpecified', // ✅ FIXED: ensure valid enum
    tdee: 1800,
    leanBodyMassKg: 57,
    subscription_status: 'inactive',
    has_accepted_terms: true,
    last_check_in_date: null, // ✅ ADDED missing field
    target_weight_change_rate_kg: null, // ✅ ADDED missing field
    dashboardSettings: { // ✅ ADDED missing field
      showMacros: true,
      showMenu: true,
      showFeaturedRecipe: true,
      showQuickRecipes: true,
    },
    favorite_recipe_ids: [], // ✅ ADDED missing field
    // Add body measurement fields
    neck_circumference_cm: null,
    abdomen_circumference_cm: null,
    waist_circumference_cm: null,
    hip_circumference_cm: null,
    menopauseStatus: null,
  };
}

export function mergeWithDefaults(
  existingProfile: Partial<UserProfileSettings>, 
  userId: string
): UserProfileSettings {
  const defaults = getDefaultUserProfile(userId);
  
  return {
    ...defaults,
    ...existingProfile,
    id: userId, // ensure ID is always correct
  };
}

// Optional: Helper function to safely create profile with timestamp if needed elsewhere
export function createProfileWithTimestamp(userId: string) {
  const profile = getDefaultUserProfile(userId);
  return {
    ...profile,
    // Add timestamp outside of the typed profile if needed for database operations
    _metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  };
}