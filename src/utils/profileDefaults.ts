// src/utils/profileDefaults.ts
import type { UserProfileSettings } from '@/types';

export function getDefaultUserProfile(userId: string): UserProfileSettings {
  return {
    id: userId,
    macroTargets: {
      protein: 120,    // grams
      carbs: 200,      // grams  
      fat: 60,         // grams
      calories: 1800   // calories
    },
    dietaryPreferences: [], // empty array for no specific preferences
    allergens: [],          // empty array for no allergies
    mealStructure: [        // Array of meal objects based on your type
      { id: 'breakfast', name: 'Breakfast', type: 'Breakfast' },
      { id: 'lunch', name: 'Lunch', type: 'Lunch' },
      { id: 'dinner', name: 'Dinner', type: 'Dinner' },
      { id: 'snack1', name: 'Morning Snack', type: 'Snack' },
      { id: 'snack2', name: 'Evening Snack', type: 'Snack' }
    ],
    heightCm: 170,            // 5'7" average height
    weightKg: 70,             // 154 lbs average weight
    age: 30,                  // default age
    sex: 'notSpecified',      // Fixed: using correct enum value
    activityLevel: 'moderate', // moderate activity level
    training_experience_level: 'beginner',
    bodyFatPercentage: 18,    // healthy average
    athleteType: null,        // Fixed: using null as it's nullable
    primaryGoal: null,        // Fixed: using null as it's nullable
    tdee: 1800,              // total daily energy expenditure
    leanBodyMassKg: 57,      // calculated from weight and body fat
    rda: {                   // Fixed: using correct property names
      iron: 8,
      calcium: 1000,
      potassium: 2500,
      vitaminA: 900,
      vitaminC: 90,          // Fixed: was vitamin_c, now vitaminC
      vitaminD: 20,          // Fixed: was vitamin_d, now vitaminD
    },
    subscription_status: 'inactive',  // Fixed: using correct enum value
    has_accepted_terms: true
    // FIXED: Removed createdAt as it doesn't exist in UserProfileSettings type
    // If you need timestamps, add them to your type definition first
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