"use client";

import React, { createContext, useContext, useMemo, useCallback, useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db, auth } from '@/lib/firebase-client';
import {
  UserProfileSettingsSchema,
  type PlannedMeal,
  type ShoppingListItem,
  type PantryItem,
  type Recipe,
  type MealType,
  type Macros,
  type UserProfileSettings,
  type RecipeFormData,
  type DailyWeightLog,
  type DailyVitalsLog,
  type DailyManualMacrosLog,
  type Sex,
  type ActivityLevel,
  type MealSlotConfig,
  type DashboardSettings,
  type UKSupermarketCategory,
} from '@/types';
import { ACTIVITY_LEVEL_OPTIONS } from '@/types';
import { calculateTotalMacros as calculateTotalMacrosUtil, generateShoppingList as generateShoppingListUtil, assignCategory as assignCategoryUtil, calculateTrendWeight } from '@/lib/data';
import { format, subDays, differenceInDays } from 'date-fns';
import { addOrUpdateMealPlan, addOrUpdatePantryItem, deletePantryItem, addRecipe as addRecipeAction, updateUserProfile, addOrUpdateVitalsLog, addOrUpdateWeightLog, addOrUpdateManualMacrosLog } from '@/app/(main)/profile/actions';
import { z } from 'zod';
import { migrateEnumValues, validateAndFallbackEnums } from '@/utils/enumMigration';
import { useOptimizedRecipes, useOptimizedProfile } from '@/hooks/useOptimizedFirestore';

// Create smaller contexts
const UserDataContext = createContext<any>(null);
const RecipeDataContext = createContext<any>(null);
const MealPlanContext = createContext<any>(null);

type ProCoachRecommendation = {
  newCalorieTarget: number;
  newProteinTarget: number;
  newFatTarget: number;
  newCarbTarget: number;
  summary: string;
  positiveFeedback: string;
  improvementSuggestion: string;
};

const callServerActionWithAuth = async (action: (idToken: string, ...args: any[]) => Promise<any>, ...args: any[]) => {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated for server action.');

  try {
    const idToken = await user.getIdToken(true);
    return await action(idToken, ...args);
  } catch (error: any) {
    console.error(`Error in callServerActionWithAuth for action "${action.name}":`, error);
    throw error;
  }
};

const processProfile = (profileData: UserProfileSettings | undefined | null): UserProfileSettings | null => {
  if (!profileData) return null;
  let migratedData = migrateEnumValues(profileData);
  migratedData = validateAndFallbackEnums(migratedData);
  const validation = UserProfileSettingsSchema.safeParse(migratedData);
  if (!validation.success) {
    console.warn("Invalid user profile data, using defaults. Errors:", validation.error.flatten());
    return null;
  }
  const p = { ...validation.data };
  p.tdee = calculateTDEE(p.weightKg, p.heightCm, p.age, p.sex, p.activityLevel);
  p.leanBodyMassKg = calculateLBM(p.weightKg, p.bodyFatPercentage);
  return p;
};

const calculateLBM = (weightKg: number | null, bodyFatPercentage: number | null): number | null => {
  if (weightKg && weightKg > 0 && bodyFatPercentage && bodyFatPercentage > 0 && bodyFatPercentage < 100) {
    const lbm = weightKg * (1 - bodyFatPercentage / 100);
    if (isNaN(lbm) || !isFinite(lbm) || lbm <= 0) return null;
    return parseFloat(lbm.toFixed(1));
  }
  return null;
};

const calculateTDEE = (
  weightKg: number | null,
  heightCm: number | null,
  age: number | null,
  sex: Sex | null,
  activityLevel: ActivityLevel | null
): number | null => {
  if (!weightKg || !heightCm || !age || !sex || !activityLevel) return null;
  let bmr: number;
  if (sex === 'male') bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  else bmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
  const activity = ACTIVITY_LEVEL_OPTIONS.find(opt => opt.value === activityLevel);
  if (activity) {
    const tdee = bmr * activity.multiplier;
    if (isNaN(tdee) || !isFinite(tdee) || tdee <= 0) return null;
    return Math.round(tdee);
  }
  return null;
};

export const OptimizedAppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const userId = user?.uid;
  
  const { profile: userProfile, loading: isProfileLoading, updateProfile } = useOptimizedProfile(userId);
  const { recipes: allRecipesCache, loading: isRecipeCacheLoading } = useOptimizedRecipes(userId);

  const [mealPlan, setMealPlan] = useState<PlannedMeal[]>([]);
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);
  const [dailyWeightLog, setDailyWeightLog] = useState<DailyWeightLog[]>([]);
  const [dailyVitalsLog, setDailyVitalsLog] = useState<DailyVitalsLog[]>([]);
  const [dailyManualMacrosLog, setDailyManualMacrosLog] = useState<DailyManualMacrosLog[]>([]);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsOnline(navigator.onLine);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const setUserInformation = useCallback(async (updates: Partial<UserProfileSettings>) => {
    await updateProfile(updates);
  }, [updateProfile]);

  const userContextValue = useMemo(() => ({
    userProfile,
    setUserInformation,
    isProfileLoading
  }), [userProfile, setUserInformation, isProfileLoading]);

  const recipeContextValue = useMemo(() => ({
    userRecipes: allRecipesCache.filter(r => r.user_id === userId),
    builtInRecipes: allRecipesCache.filter(r => !r.user_id),
    allRecipesCache,
    isRecipeCacheLoading
  }), [allRecipesCache, isRecipeCacheLoading, userId]);

  // Rest of the logic remains the same for now...
  const getConsumedMacrosForDate = useCallback((date: string): Macros => {
    const manualLog = dailyManualMacrosLog?.find(log => log.date === date);
    if (manualLog) return manualLog.macros;
    return calculateTotalMacrosUtil(mealPlan?.filter(pm => pm.date === date && pm.status === 'eaten') || [], allRecipesCache);
  }, [mealPlan, allRecipesCache, dailyManualMacrosLog]);

  const mealPlanContextValue = useMemo(() => ({
    mealPlan,
    pantryItems,
    shoppingList: generateShoppingListUtil(mealPlan, allRecipesCache, pantryItems),
    getConsumedMacrosForDate,
    // Other meal plan related functions...
  }), [mealPlan, pantryItems, allRecipesCache, getConsumedMacrosForDate]);


  return (
    <UserDataContext.Provider value={userContextValue}>
      <RecipeDataContext.Provider value={recipeContextValue}>
        <MealPlanContext.Provider value={mealPlanContextValue}>
          {children}
        </MealPlanContext.Provider>
      </RecipeDataContext.Provider>
    </UserDataContext.Provider>
  );
};

export const useUserData = () => useContext(UserDataContext);
export const useRecipeData = () => useContext(RecipeDataContext);
export const useMealPlan = () => useContext(MealPlanContext);
