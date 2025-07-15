
"use client";

import type React from 'react';
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
// import { supabase } from '@/lib/supabaseClient'; // Supabase is no longer used
import type {
  PlannedMeal,
  ShoppingListItem,
  PantryItem,
  Recipe,
  MealType,
  Macros,
  MacroTargets,
  UserProfileSettings,
  MealSlotConfig,
  Sex,
  ActivityLevel,
  RecipeFormData,
  DashboardSettings,
  UKSupermarketCategory,
  DailyWeightLog,
  Mood,
  Energy,
  DailyVitalsLog,
  DailyWellnessLog,
  RDA,
} from '@/types';
import { ACTIVITY_LEVEL_OPTIONS } from '@/types';
import { getAllRecipes as getAllRecipesFromDataFile, calculateTotalMacros as calculateTotalMacrosUtil, generateShoppingList as generateShoppingListUtil, parseIngredientString as parseIngredientStringUtil, assignCategory as assignCategoryUtil, calculateTrendWeight, getRdaProfile } from '@/lib/data';
import { loadState, saveState } from '@/lib/localStorage';
import { runPreppy, type PreppyInput, type PreppyOutput } from '@/ai/flows/pro-coach-flow';
import { suggestMicronutrients } from '@/ai/flows/suggest-micronutrients-flow';
import { format, subDays, differenceInDays } from 'date-fns';

// Default user profile for a fresh start in local mode
const DEFAULT_USER_PROFILE: UserProfileSettings = {
    name: 'Local User',
    email: 'user@example.com',
    macroTargets: { calories: 2000, protein: 150, carbs: 200, fat: 60 },
    dietaryPreferences: [],
    allergens: [],
    mealStructure: [
      { id: 'default-breakfast', name: 'Breakfast', type: 'Breakfast' },
      { id: 'default-lunch', name: 'Lunch', type: 'Lunch' },
      { id: 'default-dinner', name: 'Dinner', type: 'Dinner' },
      { id: 'default-snack1', name: 'Snack', type: 'Snack' },
    ],
    heightCm: null,
    weightKg: null,
    age: null,
    sex: null,
    activityLevel: null,
    bodyFatPercentage: null,
    athleteType: 'notSpecified',
    primaryGoal: 'maintenance',
    targetWeightChangeRateKg: 0,
    tdee: null,
    leanBodyMassKg: null,
    rda: null,
    dailyWeightLog: [],
    dailyWellnessLog: [],
    dailyVitalsLog: [],
    dailyManualMacrosLog: [], // Added for new feature
    dashboardSettings: {
        showMacros: true,
        showMenu: true,
        showFeaturedRecipe: true,
        showQuickRecipes: true,
    },
    hasAcceptedTerms: false, // Set to false to trigger modal for local dev
    subscription_status: 'active',
    lastCheckInDate: null,
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
  shoppingList: ShoppingListItem[];
  pantryItems: PantryItem[];
  userProfile: UserProfileSettings | null;
  allRecipesCache: Recipe[];
  addMealToPlan: (recipe: Recipe, date: string, mealType: MealType, servings: number) => Promise<void>;
  removeMealFromPlan: (plannedMealId: string) => Promise<void>;
  updatePlannedMealServings: (plannedMealId: string, newServings: number) => Promise<void>;
  updateMealStatus: (plannedMealId: string, status: 'planned' | 'eaten') => Promise<void>;
  logWeight: (date: string, weightKg: number) => Promise<void>;
  logWellness: (date: string, mood: Mood, energy: Energy) => Promise<void>;
  logVitals: (date: string, vitals: Omit<DailyVitalsLog, 'date'>) => Promise<void>;
  logManualMacros: (date: string, macros: Macros) => Promise<void>;
  getConsumedMacrosForDate: (date: string) => Macros;
  getPlannedMacrosForDate: (date: string) => Macros;
  toggleShoppingListItem: (itemId: string) => Promise<void>;
  clearMealPlanForDate: (date: string) => Promise<void>;
  clearEntireMealPlan: () => Promise<void>;
  clearAllData: () => Promise<void>;
  getMealsForDate: (date: string) => PlannedMeal[];
  setMacroTargets: (targets: MacroTargets) => Promise<void>;
  setDietaryPreferences: (preferences: string[]) => Promise<void>;
  setAllergens: (allergens: string[]) => Promise<void>;
  setMealStructure: (mealStructure: MealSlotConfig[]) => Promise<void>;
  setDashboardSettings: (settings: DashboardSettings) => Promise<void>;
  setUserInformation: (info: Partial<UserProfileSettings>) => Promise<void>;
  isRecipeCacheLoading: boolean;
  isAppDataLoading: boolean;
  favoriteRecipeIds: number[];
  toggleFavoriteRecipe: (recipeId: number) => Promise<void>;
  isRecipeFavorite: (recipeId: number) => boolean;
  addPantryItem: (name: string, quantity: number, unit: string, category: UKSupermarketCategory, expiryDate?: string) => Promise<void>;
  removePantryItem: (itemId: string) => Promise<void>;
  updatePantryItemQuantity: (itemId: string, newQuantity: number) => Promise<void>;
  parseIngredient: (ingredientString: string) => { name: string; quantity: number; unit: string };
  assignIngredientCategory: (ingredientName: string) => UKSupermarketCategory;
  addCustomRecipe: (recipeData: RecipeFormData) => Promise<void>;
  userRecipes: Recipe[];
  acceptTerms: () => Promise<void>;
  runWeeklyCheckin: () => Promise<{ success: boolean; message: string; recommendation?: PreppyOutput | null }>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading: isAuthLoading } = useAuth();
  
  const [mealPlan, setMealPlan] = useState<PlannedMeal[]>([]);
  const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>([]);
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfileSettings | null>(null);
  const [userRecipes, setUserRecipes] = useState<Recipe[]>([]);
  const [favoriteRecipeIds, setFavoriteRecipeIds] = useState<number[]>([]);

  const [staticRecipes, setStaticRecipes] = useState<Recipe[]>([]);
  const [isRecipeCacheLoading, setIsRecipeCacheLoading] = useState(true);
  
  const isAppDataLoading = isAuthLoading || isRecipeCacheLoading;

  useEffect(() => {
    getAllRecipesFromDataFile().then(recipes => {
      setStaticRecipes(recipes);
      setIsRecipeCacheLoading(false);
    });
  }, []);
  
  const allRecipesCache = useMemo(() => {
    const combined = [...staticRecipes, ...userRecipes];
    const uniqueRecipes = Array.from(new Map(combined.map(recipe => [recipe.id, recipe])).values());
    return uniqueRecipes;
  }, [staticRecipes, userRecipes]);

  useEffect(() => {
    if (user && !isAuthLoading) {
      const userId = user.id;
      setMealPlan(loadState(`mealPlan_${userId}`) || []);
      setPantryItems(loadState(`pantryItems_${userId}`) || []);
      setUserProfile(loadState(`userProfile_${userId}`) || DEFAULT_USER_PROFILE);
      setUserRecipes(loadState(`userRecipes_${userId}`) || []);
      setFavoriteRecipeIds(loadState(`favoriteRecipeIds_${userId}`) || []);
    }
  }, [user, isAuthLoading]);

  useEffect(() => {
    if (user && !isAppDataLoading) {
      const userId = user.id;
      saveState(`mealPlan_${userId}`, mealPlan);
      saveState(`pantryItems_${userId}`, pantryItems);
      saveState(`userProfile_${userId}`, userProfile);
      saveState(`userRecipes_${userId}`, userRecipes);
      saveState(`favoriteRecipeIds_${userId}`, favoriteRecipeIds);
    }
  }, [user, mealPlan, pantryItems, userProfile, userRecipes, favoriteRecipeIds, isAppDataLoading]);

  useEffect(() => {
    if (!isAppDataLoading) {
      const newShoppingList = generateShoppingListUtil(mealPlan, allRecipesCache, pantryItems);
      setShoppingList(newShoppingList);
    }
  }, [mealPlan, pantryItems, allRecipesCache, isAppDataLoading]);
  
  const addMealToPlan = useCallback(async (recipe: Recipe, date: string, mealType: MealType, servings: number) => {
    if (!user) { throw new Error("User not available. Cannot add meal to plan."); }
    const newPlannedMeal: PlannedMeal = { 
      id: `local-${Date.now()}-${Math.random()}`, 
      recipeId: recipe.id, 
      date: date, 
      mealType: mealType, 
      servings: servings,
      status: 'planned',
    };
    setMealPlan(prev => [...prev, newPlannedMeal]);
  }, [user]);

  const removeMealFromPlan = useCallback(async (plannedMealId: string) => {
    if (!user) return;
    setMealPlan(prev => prev.filter(pm => pm.id !== plannedMealId));
  }, [user]);

  const updatePlannedMealServings = useCallback(async (plannedMealId: string, newServings: number) => {
    if (!user) return;
    setMealPlan(prev => prev.map(pm => pm.id === plannedMealId ? { ...pm, servings: newServings } : pm));
  }, [user]);

  const clearMealPlanForDate = useCallback(async (date: string) => {
    if (!user) return;
    setMealPlan(prev => prev.filter(pm => pm.date !== date));
  }, [user]);

  const clearEntireMealPlan = useCallback(async () => {
    if (!user) return;
    setMealPlan([]);
  }, [user]);
  
  const updateUserProfileInDb = useCallback(async (updates: Partial<UserProfileSettings>) => {
    if (!user) return;
    setUserProfile(prev => prev ? { ...prev, ...updates } : null);
  }, [user]);

  const acceptTerms = useCallback(async () => {
    await updateUserProfileInDb({ hasAcceptedTerms: true });
  }, [updateUserProfileInDb]);

  const setMacroTargets = useCallback((targets: MacroTargets) => updateUserProfileInDb({ macroTargets: targets }), [updateUserProfileInDb]);
  const setDietaryPreferences = useCallback((preferences: string[]) => updateUserProfileInDb({ dietaryPreferences: preferences }), [updateUserProfileInDb]);
  const setAllergens = useCallback((allergens: string[]) => updateUserProfileInDb({ allergens }), [updateUserProfileInDb]);
  const setMealStructure = useCallback((mealStructure: MealSlotConfig[]) => updateUserProfileInDb({ mealStructure }), [updateUserProfileInDb]);
  const setDashboardSettings = useCallback((settings: DashboardSettings) => updateUserProfileInDb({ dashboardSettings: settings }), [updateUserProfileInDb]);
  
  const setUserInformation = useCallback(async (info: Partial<UserProfileSettings>) => {
    if (!user) return;
    const newProfileData = { ...(userProfile || {}), ...info } as UserProfileSettings;
    const finalBodyFatPercentage = newProfileData.bodyFatPercentage;
    const finalLbm = calculateLBM(newProfileData.weightKg, finalBodyFatPercentage);
    const finalTdee = calculateTDEE(newProfileData.weightKg, newProfileData.heightCm, newProfileData.age, newProfileData.sex, newProfileData.activityLevel);
    const finalRda = getRdaProfile(newProfileData.sex, newProfileData.age);

    setUserProfile({
      ...newProfileData,
      tdee: finalTdee,
      leanBodyMassKg: finalLbm,
      rda: finalRda
    });
  }, [user, userProfile]);
  
  const toggleFavoriteRecipe = useCallback(async (recipeId: number) => {
    if (!user) return;
    const newFavs = favoriteRecipeIds.includes(recipeId) ? favoriteRecipeIds.filter(id => id !== recipeId) : [...favoriteRecipeIds, recipeId];
    setFavoriteRecipeIds(newFavs);
  }, [user, favoriteRecipeIds]);
  
  const isRecipeFavorite = useCallback((recipeId: number): boolean => favoriteRecipeIds.includes(recipeId), [favoriteRecipeIds]);

  const addPantryItem = useCallback(async (name: string, quantity: number, unit: string, category: UKSupermarketCategory, expiryDate?: string) => {
    if (!user) return;
    setPantryItems(prev => {
      const existingIndex = prev.findIndex(p => p.name.toLowerCase() === name.toLowerCase() && p.unit === unit);
      if (existingIndex > -1) {
        const updatedItems = [...prev];
        updatedItems[existingIndex].quantity += quantity;
        updatedItems[existingIndex].expiryDate = expiryDate;
        return updatedItems;
      }
      return [...prev, { id: `local-${Date.now()}`, name, quantity, unit, category, expiryDate }];
    });
  }, [user]);

  const removePantryItem = useCallback(async (itemId: string) => {
    if(!user) return;
    setPantryItems(prev => prev.filter(p => p.id !== itemId));
  }, [user]);

  const updatePantryItemQuantity = useCallback(async (itemId: string, newQuantity: number) => {
    if (!user) return;
    if (newQuantity <= 0) {
      await removePantryItem(itemId);
    } else {
      setPantryItems(prev => prev.map(p => p.id === itemId ? { ...p, quantity: newQuantity } : p));
    }
  }, [user, removePantryItem]);
  
  const addCustomRecipe = useCallback(async (recipeData: RecipeFormData) => {
    if (!user) return;
    
    let newRecipe: Recipe = {
        id: -Date.now(),
        user_id: user.id,
        name: recipeData.name,
        description: recipeData.description,
        image: recipeData.image || `https://placehold.co/600x400.png?text=${encodeURIComponent(recipeData.name)}`,
        servings: recipeData.servings,
        prepTime: recipeData.prepTime,
        cookTime: recipeData.cookTime,
        chillTime: recipeData.chillTime,
        ingredients: recipeData.ingredients.map(ing => ing.value),
        macrosPerServing: {
          calories: recipeData.calories, protein: recipeData.protein, carbs: recipeData.carbs, fat: recipeData.fat,
        },
        micronutrientsPerServing: null, // Initialize as null
        instructions: recipeData.instructions.map(inst => inst.value),
        tags: recipeData.tags,
        isCustom: true,
    };

    try {
      const ingredientsPerServing = newRecipe.ingredients.map(ingStr => {
          const parsed = parseIngredientStringUtil(ingStr);
          const quantityPerServing = parsed.quantity / (newRecipe.servings || 1);
          return `${quantityPerServing.toFixed(2)} ${parsed.unit} ${parsed.name}`;
      });
      
      const micros = await suggestMicronutrients({ ingredients: ingredientsPerServing });
      newRecipe.micronutrientsPerServing = micros;

    } catch (e) {
      console.warn("AI Micronutrient estimation failed for new recipe:", e);
    }

    setUserRecipes(prev => [...prev, newRecipe]);
  }, [user]);

  const clearAllData = useCallback(async () => {
    if(!user) return;
    setMealPlan([]);
    setPantryItems([]);
    setUserRecipes([]);
    setFavoriteRecipeIds([]);
    setUserProfile(DEFAULT_USER_PROFILE);
    const userId = user.id;
    localStorage.removeItem(`mealPlan_${userId}`);
    localStorage.removeItem(`pantryItems_${userId}`);
    localStorage.removeItem(`userRecipes_${userId}`);
    localStorage.removeItem(`favoriteRecipeIds_${userId}`);
    localStorage.removeItem(`userProfile_${userId}`);
  }, [user]);

  const getConsumedMacrosForDate = useCallback((date: string): Macros => {
    const manualLog = userProfile?.dailyManualMacrosLog?.find(log => log.date === date);
    if (manualLog) {
      return manualLog.macros;
    }
    return calculateTotalMacrosUtil(mealPlan.filter(pm => pm.date === date && pm.status === 'eaten'), allRecipesCache);
  }, [mealPlan, allRecipesCache, userProfile?.dailyManualMacrosLog]);
  
  const getPlannedMacrosForDate = useCallback((date: string): Macros => calculateTotalMacrosUtil(mealPlan.filter(pm => pm.date === date), allRecipesCache), [mealPlan, allRecipesCache]);
  
  const getMealsForDate = useCallback((date: string): PlannedMeal[] => {
    return mealPlan
      .filter(pm => pm.date === date)
      .map(pm => ({ ...pm, recipeDetails: allRecipesCache.find(r => r.id === pm.recipeId) }));
  }, [mealPlan, allRecipesCache]);

  const parseIngredient = useCallback((ingredientString: string) => parseIngredientStringUtil(ingredientString), []);
  const assignIngredientCategory = useCallback((ingredientName: string) => assignCategoryUtil(ingredientName), []);
  const toggleShoppingListItem = useCallback(async (itemId: string) => { 
      setShoppingList(prev => prev.map(item => item.id === itemId ? {...item, purchased: !item.purchased} : item));
  }, []);

  const updateMealStatus = useCallback(async (plannedMealId: string, status: 'planned' | 'eaten') => {
    if (!user) return;
    setMealPlan(prev => prev.map(pm => pm.id === plannedMealId ? { ...pm, status } : pm));
  }, [user]);

  const logWeight = useCallback(async (date: string, weightKg: number) => {
    if (!userProfile || !user) return;
    const newLogEntry: DailyWeightLog = { date, weightKg };
    
    const currentLogs = userProfile.dailyWeightLog || [];
    const existingLogIndex = currentLogs.findIndex(log => log.date === date);

    let updatedLogs: DailyWeightLog[];
    if (existingLogIndex > -1) {
        updatedLogs = [...currentLogs];
        updatedLogs[existingLogIndex] = newLogEntry;
    } else {
        updatedLogs = [...currentLogs, newLogEntry];
    }

    updatedLogs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    updateUserProfileInDb({ dailyWeightLog: updatedLogs, weightKg });
  }, [user, userProfile, updateUserProfileInDb]);
  
  const logWellness = useCallback(async (date: string, mood: Mood, energy: Energy) => {
    if (!userProfile || !user) return;
    const newLogEntry: DailyWellnessLog = { date, mood, energy };

    const currentLogs = userProfile.dailyWellnessLog || [];
    const existingLogIndex = currentLogs.findIndex(log => log.date === date);

    let updatedLogs: DailyWellnessLog[];
    if (existingLogIndex > -1) {
        updatedLogs = [...currentLogs];
        updatedLogs[existingLogIndex] = newLogEntry;
    } else {
        updatedLogs = [...currentLogs, newLogEntry];
    }

    updatedLogs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    updateUserProfileInDb({ dailyWellnessLog: updatedLogs });
  }, [user, userProfile, updateUserProfileInDb]);

  const logVitals = useCallback(async (date: string, vitals: Omit<DailyVitalsLog, 'date'>) => {
    if (!userProfile || !user) return;
    const newLogEntry: DailyVitalsLog = { date, ...vitals };

    const currentLogs = userProfile.dailyVitalsLog || [];
    const existingLogIndex = currentLogs.findIndex(log => log.date === date);

    let updatedLogs: DailyVitalsLog[];
    if (existingLogIndex > -1) {
        updatedLogs = [...currentLogs];
        updatedLogs[existingLogIndex] = newLogEntry;
    } else {
        updatedLogs = [...currentLogs, newLogEntry];
    }
    
    updatedLogs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    updateUserProfileInDb({ dailyVitalsLog: updatedLogs });
  }, [user, userProfile, updateUserProfileInDb]);

  const logManualMacros = useCallback(async (date: string, macros: Macros) => {
    if (!userProfile || !user) return;
    const newLogEntry = { date, macros };

    const currentLogs = userProfile.dailyManualMacrosLog || [];
    const existingLogIndex = currentLogs.findIndex(log => log.date === date);

    let updatedLogs: { date: string, macros: Macros }[];
    if (existingLogIndex > -1) {
      updatedLogs = [...currentLogs];
      updatedLogs[existingLogIndex] = newLogEntry;
    } else {
      updatedLogs = [...currentLogs, newLogEntry];
    }

    updatedLogs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    updateUserProfileInDb({ dailyManualMacrosLog: updatedLogs });
  }, [user, userProfile, updateUserProfileInDb]);


  const runWeeklyCheckin = useCallback(async (): Promise<{ success: boolean; message: string; recommendation?: PreppyOutput | null }> => {
    if (!userProfile || !userProfile.dailyWeightLog || userProfile.dailyWeightLog.length < 14) {
      return { success: false, message: "At least 14 days of weight and calorie data are needed for an accurate calculation." };
    }
    
    const logsWithTrend = calculateTrendWeight(userProfile.dailyWeightLog);
    const validTrendLogs = logsWithTrend.filter(log => log.trendWeightKg !== undefined);

    if (validTrendLogs.length < 7) {
      return { success: false, message: "Not enough consistent data to establish a weight trend. Keep logging daily!" };
    }

    const endDate = new Date(validTrendLogs[0].date);
    const startDate = subDays(endDate, 21);
    
    const recentWeightLogs = validTrendLogs.filter(log => new Date(log.date) >= startDate);
    
    if (recentWeightLogs.length < 14) {
      return { success: false, message: `Need at least 14 days of weight data in the last 3 weeks. You have ${recentWeightLogs.length}.` };
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
      return { success: false, message: `Need at least 7 days of calorie logs in the analysis period. You have ${daysWithCalorieData}.` };
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
      return { success: false, message: "Calculation resulted in an invalid TDEE. Check your logged data for consistency." };
    }
    
    const preppyInput: PreppyInput = {
      primaryGoal: userProfile.primaryGoal || 'maintenance',
      targetWeightChangeRateKg: userProfile.targetWeightChangeRateKg || 0,
      dynamicTdee: newDynamicTDEE,
      actualAvgCalories: averageDailyCalories,
      actualWeeklyWeightChangeKg: actualWeeklyWeightChangeKg,
      currentProteinTarget: userProfile.macroTargets?.protein || 0,
      currentFatTarget: userProfile.macroTargets?.fat || 0,
    };

    const recommendation = await runPreppy(preppyInput);
    
    await setUserInformation({ tdee: newDynamicTDEE, lastCheckInDate: format(new Date(), 'yyyy-MM-dd') });

    return { success: true, message: "Check-in complete!", recommendation };
  }, [userProfile, allRecipesCache, setUserInformation, getConsumedMacrosForDate]);

  const contextValue = useMemo(() => ({
    mealPlan, shoppingList, pantryItems, userProfile, allRecipesCache,
    addMealToPlan, removeMealFromPlan, updatePlannedMealServings, getConsumedMacrosForDate,
    toggleShoppingListItem, clearMealPlanForDate, clearAllData, getMealsForDate,
    setMacroTargets, setDietaryPreferences, setAllergens, setMealStructure,
    setUserInformation, isRecipeCacheLoading, isAppDataLoading, favoriteRecipeIds, toggleFavoriteRecipe,
    isRecipeFavorite, addPantryItem, removePantryItem, updatePantryItemQuantity,
    parseIngredient, assignIngredientCategory, addCustomRecipe, userRecipes, setDashboardSettings,
    acceptTerms, updateMealStatus, logWeight, getPlannedMacrosForDate, runWeeklyCheckin, logWellness, logVitals,
    logManualMacros, clearEntireMealPlan
  }), [
    mealPlan, shoppingList, pantryItems, userProfile, allRecipesCache, addMealToPlan, removeMealFromPlan,
    updatePlannedMealServings, getConsumedMacrosForDate, toggleShoppingListItem,
    clearMealPlanForDate, clearAllData, getMealsForDate, setMacroTargets,
    setDietaryPreferences, setAllergens, setMealStructure, setUserInformation, isRecipeCacheLoading,
    isAppDataLoading, favoriteRecipeIds, toggleFavoriteRecipe, isRecipeFavorite,
    addPantryItem, removePantryItem, updatePantryItemQuantity, parseIngredient, assignIngredientCategory,
    addCustomRecipe, userRecipes, setDashboardSettings, acceptTerms, updateMealStatus, logWeight, getPlannedMacrosForDate, runWeeklyCheckin, logWellness, logVitals,
    logManualMacros, clearEntireMealPlan
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
