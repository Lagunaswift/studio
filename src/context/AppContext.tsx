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

interface AppContextType {
  mealPlan: PlannedMeal[];
  pantryItems: PantryItem[];
  userRecipes: Recipe[];
  userProfile: UserProfileSettings | null;
  allRecipesCache: Recipe[];
  shoppingList: ShoppingListItem[];
  isOnline: boolean;
  isSubscribed: boolean;
  isAppDataLoading: boolean;
  isRecipeCacheLoading: boolean;
  addMealToPlan: (recipe: Recipe, date: string, mealType: MealType, servings: number) => Promise<void>;
  removeMealFromPlan: (plannedMealId: string) => Promise<void>;
  updatePlannedMealServings: (plannedMealId: string, newServings: number) => Promise<void>;
  updateMealStatus: (plannedMealId: string, status: 'planned' | 'eaten') => Promise<void>;
  clearMealPlanForDate: (date: string) => Promise<void>;
  clearEntireMealPlan: () => Promise<void>;
  toggleFavoriteRecipe: (recipeId: number) => Promise<void>;
  toggleShoppingListItem: (itemId: string) => Promise<void>;
  addPantryItem: (name: string, quantity: number, unit: string, category: string, expiryDate?: string) => Promise<void>;
  removePantryItem: (itemId: string) => Promise<void>;
  updatePantryItemQuantity: (itemId: string, newQuantity: number) => Promise<void>;
  addCustomRecipe: (recipeData: RecipeFormData) => Promise<any>;
  runWeeklyCheckin: () => Promise<{ success: boolean; message: string; recommendation?: ProCoachRecommendation | null }>;
  setUserInformation: (updates: Partial<UserProfileSettings>) => Promise<void>;
  setMacroTargets: (targets: Macros) => Promise<void>;
  setMealStructure: (structure: MealSlotConfig[]) => Promise<void>;
  setDashboardSettings: (settings: Partial<DashboardSettings>) => Promise<void>;
  acceptTerms: () => Promise<void>;
  assignIngredientCategory: (ingredientName: string) => UKSupermarketCategory;
  getConsumedMacrosForDate: (date: string) => Macros;
  getPlannedMacrosForDate: (date: string) => Macros;
  getMealsForDate: (date: string) => PlannedMeal[];
  isRecipeFavorite: (recipeId: number) => boolean;
  logWeight: (weightData: Omit<DailyWeightLog, 'id' | 'user_id'>) => Promise<void>;
  logVitals: (vitalsData: Omit<DailyVitalsLog, 'id' | 'user_id'>) => Promise<void>;
  logManualMacros: (macrosData: Omit<DailyManualMacrosLog, 'id' | 'user_id'>) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const userId = user?.uid;
  
  const { profile: userProfile, loading: isProfileLoading } = useOptimizedProfile(userId);
  const [userRecipes, setUserRecipes] = useState<Recipe[]>([]);
  const [builtInRecipes, setBuiltInRecipes] = useState<Recipe[]>([]);
  const [mealPlan, setMealPlan] = useState<PlannedMeal[]>([]);
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);
  const [dailyWeightLog, setDailyWeightLog] = useState<DailyWeightLog[]>([]);
  const [dailyVitalsLog, setDailyVitalsLog] = useState<DailyVitalsLog[]>([]);
  const [dailyManualMacrosLog, setDailyManualMacrosLog] = useState<DailyManualMacrosLog[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [isRecipeCacheLoading, setIsRecipeCacheLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);

  const recipeHookResults = useOptimizedRecipes(userId);

  useEffect(() => {
    if (!recipeHookResults.loading) {
      const builtIn = recipeHookResults.recipes.filter(r => !r.user_id);
      const userOwned = recipeHookResults.recipes.filter(r => r.user_id === userId);
      setBuiltInRecipes(builtIn);
      setUserRecipes(userOwned);
      setIsRecipeCacheLoading(false);
    }
  }, [recipeHookResults.loading, recipeHookResults.recipes, userId]);

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

  const getConsumedMacrosForDate = useCallback((date: string): Macros => {
    const manualLog = dailyManualMacrosLog?.find(log => log.date === date);
    if (manualLog) return manualLog.macros;
    return calculateTotalMacrosUtil(mealPlan?.filter(pm => pm.date === date && pm.status === 'eaten') || [], [...builtInRecipes, ...userRecipes]);
  }, [mealPlan, builtInRecipes, userRecipes, dailyManualMacrosLog]);
  
  const setUserInformation = useCallback(async (updates: Partial<UserProfileSettings>) => {
    if (!userProfile) throw new Error("User profile not loaded yet.");
    const updatedProfile = { ...userProfile, ...updates };
    const recalculatedProfile = processProfile(updatedProfile);
    await callServerActionWithAuth(updateUserProfile, recalculatedProfile as UserProfileSettings);
  }, [userProfile]);

  const runWeeklyCheckin = useCallback(async (): Promise<{ success: boolean; message: string; recommendation?: ProCoachRecommendation | null }> => {
    if (!userProfile || !dailyWeightLog || !dailyManualMacrosLog) {
      return { success: false, message: "User profile and logs are not loaded yet." };
    }
    const logsWithTrend = calculateTrendWeight(dailyWeightLog);
    const validTrendLogs = logsWithTrend.filter(log => log.trendWeightKg !== undefined);
    if (validTrendLogs.length < 7) {
      return { success: false, message: "Not enough consistent data to establish a weight trend." };
    }
    const endDate = new Date(validTrendLogs[0].date);
    const startDate = subDays(endDate, 21);
    const recentWeightLogs = validTrendLogs.filter(log => new Date(log.date) >= startDate);
    if (recentWeightLogs.length < 14) {
      return { success: false, message: `Need at least 14 days of weight data in the last 3 weeks.` };
    }
    const datesInPeriod = recentWeightLogs.map(l => l.date);
    let totalCalories = 0;
    let daysWithCalorieData = 0;
    for (const date of datesInPeriod) {
        const consumed = getConsumedMacrosForDate(date);
        if (consumed && consumed.calories > 0) {
            totalCalories += consumed.calories;
            daysWithCalorieData++;
        }
    }
    if (daysWithCalorieData < 7) {
      return { success: false, message: `Need at least 7 days of calorie logs in the analysis period.` };
    }
    const averageDailyCalories = totalCalories / daysWithCalorieData;
    const latestTrendWeight = recentWeightLogs[0].trendWeightKg!;
    const oldestTrendWeight = recentWeightLogs[recentWeightLogs.length - 1].trendWeightKg!;
    const weightChangeKg = latestTrendWeight - oldestTrendWeight;
    const durationDays = differenceInDays(new Date(recentWeightLogs[0].date), new Date(recentWeightLogs[recentWeightLogs.length - 1].date)) || 1;
    const actualWeeklyWeightChangeKg = (weightChangeKg / durationDays) * 7;
    const caloriesFromWeightChange = weightChangeKg * 7700;
    const averageDailyDeficitOrSurplus = caloriesFromWeightChange / durationDays;
    const newDynamicTDEE = Math.round(averageDailyCalories - averageDailyDeficitOrSurplus);

    if (isNaN(newDynamicTDEE) || newDynamicTDEE <= 0) {
      return { success: false, message: "Calculation resulted in an invalid TDEE." };
    }
    
    const preppyInput = {
      primaryGoal: userProfile.primaryGoal || 'maintenance',
      targetWeightChangeRateKg: userProfile.target_weight_change_rate_kg || 0,
      dynamicTdee: newDynamicTDEE,
      actualAvgCalories: averageDailyCalories,
      actualWeeklyWeightChangeKg: actualWeeklyWeightChangeKg,
      currentProteinTarget: userProfile.macroTargets?.protein || 0,
      currentFatTarget: userProfile.macroTargets?.fat || 0,
    };

    try {
      const response = await fetch('/api/genkit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preppyInput),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `API request failed with status ${response.status}`);
      }
      
      const recommendation = await response.json();

      await callServerActionWithAuth(updateUserProfile, {
        tdee: newDynamicTDEE,
        last_check_in_date: format(new Date(), 'yyyy-MM-dd'),
      });
    
      return { success: true, message: "Check-in complete!", recommendation };

    } catch (error: any) {
      console.error("Weekly check-in API call failed:", error);
      return { success: false, message: error.message || "An unexpected error occurred during the AI check-in." };
    }
  }, [userProfile, dailyWeightLog, dailyManualMacrosLog, getConsumedMacrosForDate]);
  
  const addMealToPlan = useCallback(async (recipe: Recipe, date: string, mealType: MealType, servings: number) => {
    await callServerActionWithAuth(addOrUpdateMealPlan, { recipeId: recipe.id, date, mealType, servings, status: 'planned' });
  }, []);
  
  const removeMealFromPlan = useCallback(async (plannedMealId: string) => {
    console.warn('⚠️ DEPRECATED: removeMealFromPlan called - AppContext is being phased out');
    // Legacy function removed - use dailyMealPlans structure instead
    throw new Error('Legacy meal plan function removed. Use new dailyMealPlans structure.');
  }, []);

  const updateMealServingsOrStatus = useCallback(async (plannedMealId: string, updates: Partial<Pick<PlannedMeal, 'servings' | 'status'>>) => {
      const meal = mealPlan.find(m => m.id === plannedMealId);
      if (!meal) throw new Error("Meal not found.");
      const { recipeDetails, ...restOfMeal } = meal;
      await callServerActionWithAuth(addOrUpdateMealPlan, { ...restOfMeal, ...updates });
  }, [mealPlan]);
  
  const addPantryItem = useCallback(async (name: string, quantity: number, unit: string, category: string, expiryDate?: string) => {
    const existingItem = pantryItems.find(item => item.name.toLowerCase() === name.toLowerCase() && item.unit === unit);
    let itemToSave: Omit<PantryItem, 'user_id'>;
    if (existingItem) {
      itemToSave = { ...existingItem, quantity: existingItem.quantity + quantity, expiryDate: expiryDate || existingItem.expiryDate };
    } else {
      itemToSave = { id: `pantry_${Date.now()}_${Math.random()}`, name, quantity, unit, category: category as UKSupermarketCategory, expiryDate };
    }
    await callServerActionWithAuth(addOrUpdatePantryItem, itemToSave);
  }, [pantryItems]);

  const removePantryItem = useCallback(async (itemId: string) => {
    await callServerActionWithAuth(deletePantryItem, itemId);
  }, []);

  const updatePantryItemQuantity = useCallback(async (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) return removePantryItem(itemId);
    const item = pantryItems.find(p => p.id === itemId);
    if (!item) throw new Error("Pantry item not found.");
    const { user_id, ...restOfItem } = item;
    await callServerActionWithAuth(addOrUpdatePantryItem, { ...restOfItem, quantity: newQuantity });
  }, [pantryItems, removePantryItem]);
  
  const isSubscribed = useMemo(() => userProfile?.subscription_status === 'active', [userProfile]);

  const contextValue: AppContextType = useMemo(() => ({
    userProfile,
    userRecipes,
    mealPlan,
    pantryItems,
    isAppDataLoading: isProfileLoading,
    isRecipeCacheLoading,
    isSubscribed,
    isOnline,
    allRecipesCache: [...builtInRecipes, ...userRecipes],
    shoppingList: generateShoppingListUtil(mealPlan, [...builtInRecipes, ...userRecipes], pantryItems),
    
    getConsumedMacrosForDate,
    getPlannedMacrosForDate: (date: string) => calculateTotalMacrosUtil(mealPlan.filter(pm => pm.date === date), [...builtInRecipes, ...userRecipes]),
    getMealsForDate: (date: string) => mealPlan.filter(pm => pm.date === date).map(pm => ({ ...pm, recipeDetails: [...builtInRecipes, ...userRecipes].find(r => r.id === pm.recipeId) })),
    isRecipeFavorite: (recipeId: number) => userProfile?.favorite_recipe_ids?.includes(recipeId) || false,
    
    addMealToPlan,
    removeMealFromPlan,
    updatePlannedMealServings: (id, servings) => updateMealServingsOrStatus(id, { servings }),
    updateMealStatus: (id, status) => updateMealServingsOrStatus(id, { status }),
    clearMealPlanForDate: async (date: string) => {
      console.warn('⚠️ DEPRECATED: clearMealPlanForDate called - AppContext is being phased out');
      throw new Error('Legacy meal plan function removed. Use new dailyMealPlans structure.');
    },
    clearEntireMealPlan: async () => {
      console.warn('⚠️ DEPRECATED: clearEntireMealPlan called - AppContext is being phased out');
      throw new Error('Legacy meal plan function removed. Use new dailyMealPlans structure.');
    },
    toggleFavoriteRecipe: async (recipeId: number) => {
        if (!userProfile) return;
        const newFavorites = userProfile.favorite_recipe_ids?.includes(recipeId)
          ? userProfile.favorite_recipe_ids.filter(id => id !== recipeId)
          : [...(userProfile.favorite_recipe_ids || []), recipeId];
        await setUserInformation({ favorite_recipe_ids: newFavorites });
    },
    toggleShoppingListItem: async (itemId: string) => console.warn("Toggling shopping list item not implemented yet."),
    addPantryItem,
    removePantryItem,
    updatePantryItemQuantity,
    addCustomRecipe: (data) => callServerActionWithAuth(addRecipeAction, data),
    runWeeklyCheckin,
    setUserInformation,
    setMacroTargets: (targets) => setUserInformation({ macroTargets: targets }),
    setMealStructure: (structure) => setUserInformation({ mealStructure: structure }),
    setDashboardSettings: async (settings) => {
      const defaultSettings = { showMacros: true, showMenu: true, showFeaturedRecipe: true, showQuickRecipes: true };
      await setUserInformation({ dashboardSettings: { ...(userProfile?.dashboardSettings || defaultSettings), ...settings } });
    },
    acceptTerms: () => setUserInformation({ has_accepted_terms: true }),
    assignIngredientCategory: assignCategoryUtil,
    logWeight: (data) => callServerActionWithAuth(addOrUpdateWeightLog, data),
    logVitals: (data) => callServerActionWithAuth(addOrUpdateVitalsLog, data),
    logManualMacros: (data) => callServerActionWithAuth(addOrUpdateManualMacrosLog, data),
  }), [
    userProfile, userRecipes, builtInRecipes, mealPlan, pantryItems, isProfileLoading, isRecipeCacheLoading, isOnline, isSubscribed,
    addMealToPlan, removeMealFromPlan, updateMealServingsOrStatus, getConsumedMacrosForDate,
    setUserInformation, addPantryItem, removePantryItem, updatePantryItemQuantity, runWeeklyCheckin
  ]);

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
};

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider.');
  }
  return context;
};
