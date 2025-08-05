
// src/lib/tdee/test-data-generator.ts
import type { UserProfileSettings, DailyWeightLog, DailyManualMacrosLog } from '@/types';
import { format, subDays } from 'date-fns';

/**
 * Generates realistic test data for weight and macro logs.
 * @param userProfile The current user's profile.
 * @param goal 'fatLoss' or 'muscleGain' to simulate a trend.
 * @returns An object containing arrays of daily weight and macro logs.
 */
export function generateTestCoachingData(userProfile: UserProfileSettings | null, goal: 'fatLoss' | 'muscleGain' | 'maintenance'): {
  dailyWeightLog: Omit<DailyWeightLog, 'id' | 'user_id'>[];
  dailyManualMacrosLog: Omit<DailyManualMacrosLog, 'id' | 'user_id'>[];
} {
  if (!userProfile || !userProfile.weightKg || !userProfile.tdee) {
    throw new Error("User profile with weight and TDEE is required to generate test data.");
  }

  const NUM_DAYS = 21;
  const weightLog: Omit<DailyWeightLog, 'id' | 'user_id'>[] = [];
  const macroLog: Omit<DailyManualMacrosLog, 'id' | 'user_id'>[] = [];
  const today = new Date();

  let currentWeight = userProfile.weightKg;
  
  // Define goal-based daily changes
  const dailyWeightChange = goal === 'fatLoss' ? -0.05 : (goal === 'muscleGain' ? 0.03 : 0); // Approx. 0.35kg/week loss or 0.21kg/week gain
  const calorieTarget = goal === 'fatLoss' ? userProfile.tdee - 350 : (goal === 'muscleGain' ? userProfile.tdee + 250 : userProfile.tdee);

  for (let i = 0; i < NUM_DAYS; i++) {
    const date = format(subDays(today, i), 'yyyy-MM-dd');
    
    // Simulate daily weight fluctuations (+/- 0.5kg)
    const fluctuation = (Math.random() - 0.5) * 1.0;
    const recordedWeight = parseFloat((currentWeight + fluctuation).toFixed(2));
    
    weightLog.push({
      date,
      weightKg: recordedWeight,
    });

    // Simulate daily calorie intake fluctuations (+/- 150 kcal)
    const calorieFluctuation = (Math.random() - 0.5) * 300;
    const recordedCalories = Math.round(calorieTarget + calorieFluctuation);
    
    // Simple macro split for test data (e.g., 40% C, 30% P, 30% F)
    const protein = Math.round((recordedCalories * 0.30) / 4);
    const fat = Math.round((recordedCalories * 0.30) / 9);
    const carbs = Math.round((recordedCalories * 0.40) / 4);

    macroLog.push({
      date,
      macros: {
        calories: recordedCalories,
        protein,
        carbs,
        fat,
      }
    });

    // Update the base weight for the next day's trend
    currentWeight += dailyWeightChange;
  }

  return { dailyWeightLog: weightLog.reverse(), dailyManualMacrosLog: macroLog.reverse() };
}
