

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
} from '@/types';
import { ACTIVITY_LEVEL_OPTIONS } from '@/types';
import { getAllRecipes as getAllRecipesFromDataFile, calculateTotalMacros as calculateTotalMacrosUtil, generateShoppingList as generateShoppingListUtil, parseIngredientString as parseIngredientStringUtil, assignCategory as assignCategoryUtil, calculateTrendWeight } from '@/lib/data';
import { loadState, saveState } from '@/lib/localStorage';

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
    tdee: null,
    leanBodyMassKg: null,
    dailyWeightLog: [],
    dashboardSettings: {
        showMacros: true,
        showMenu: true,
        showFeaturedRecipe: true,
        showQuickRecipes: true,
    },
    hasAcceptedTerms: true, // Assume accepted for local dev
    subscription_status: 'active',
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
  getConsumedMacrosForDate: (date: string) => Macros;
  getPlannedMacrosForDate: (date: string) => Macros;
  toggleShoppingListItem: (itemId: string) => Promise<void>;
  clearMealPlanForDate: (date: string) => Promise<void>;
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
  runWeeklyCheckin: () => Promise<{ success: boolean; message: string; newTDEE?: number; }>;
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

  // Load static recipes from data file on initial mount
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

  // Load user data from local storage when user is available
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

  // Save all user data to local storage whenever it changes
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

  // Recalculate shopping list whenever meal plan or pantry changes
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

    setUserProfile({
      ...newProfileData,
      tdee: finalTdee,
      leanBodyMassKg: finalLbm
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
    const newRecipe: Recipe = {
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
        instructions: recipeData.instructions.map(inst => inst.value),
        macrosPerServing: {
          calories: recipeData.calories, protein: recipeData.protein, carbs: recipeData.carbs, fat: recipeData.fat,
        },
        tags: recipeData.tags,
        isCustom: true,
    };
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

  const getConsumedMacrosForDate = useCallback((date: string): Macros => calculateTotalMacrosUtil(mealPlan.filter(pm => pm.date === date && pm.status === 'eaten'), allRecipesCache), [mealPlan, allRecipesCache]);
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
    
    // Ensure dailyWeightLog is an array
    const currentLogs = userProfile.dailyWeightLog || [];
    
    const existingLogIndex = currentLogs.findIndex(log => log.date === date);

    let updatedLogs: DailyWeightLog[];
    if (existingLogIndex > -1) {
        // Update existing entry
        updatedLogs = [...currentLogs];
        updatedLogs[existingLogIndex] = newLogEntry;
    } else {
        // Add new entry
        updatedLogs = [...currentLogs, newLogEntry];
    }

    // Sort logs by date descending
    updatedLogs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Update the profile state
    updateUserProfileInDb({ dailyWeightLog: updatedLogs, weightKg });
  }, [user, userProfile, updateUserProfileInDb]);
  
  const runWeeklyCheckin = useCallback(async () => {
    if (!userProfile || !userProfile.dailyWeightLog || userProfile.dailyWeightLog.length < 14) {
      const message = "At least 14 days of weight and calorie data are needed for an accurate calculation.";
      console.log(message);
      return { success: false, message };
    }

    // Trend weight is calculated on a sorted-ascending array and returned sorted-descending
    const logsWithTrend = calculateTrendWeight(userProfile.dailyWeightLog);
    
    // Filter for logs that have a trend weight after calculation
    const validTrendLogs = logsWithTrend.filter(log => log.trendWeightKg !== undefined);
    
    if (validTrendLogs.length < 7) {
        const message = "Not enough consistent data to establish a weight trend. Keep logging daily!";
        console.log(message);
        return { success: false, message };
    }

    // Use last 21 days of data if available, otherwise minimum 14
    const daysToAnalyze = Math.min(21, validTrendLogs.length);
    const recentLogs = validTrendLogs.slice(0, daysToAnalyze);

    // Calculate average calorie intake over the period
    let totalCalories = 0;
    let daysWithCalorieData = 0;
    
    const dateSet = new Set(recentLogs.map(l => l.date));
    const relevantMeals = mealPlan.filter(m => dateSet.has(m.date) && m.status === 'eaten');

    recentLogs.forEach(log => {
      const macros = calculateTotalMacrosUtil(relevantMeals.filter(m => m.date === log.date), allRecipesCache);
      if (macros.calories > 0) {
        totalCalories += macros.calories;
        daysWithCalorieData++;
      }
    });
    
    if (daysWithCalorieData < 7) {
         const message = `Need at least 7 days of calorie logs in the last ${daysToAnalyze} days.`;
         console.log(message);
         return { success: false, message };
    }
    const averageDailyCalories = totalCalories / daysWithCalorieData;

    // Calculate weight change from trend
    const latestTrendWeight = recentLogs[0].trendWeightKg!;
    const oldestTrendWeight = recentLogs[recentLogs.length - 1].trendWeightKg!;
    const weightChangeKg = latestTrendWeight - oldestTrendWeight;
    const durationDays = (new Date(recentLogs[0].date).getTime() - new Date(recentLogs[recentLogs.length - 1].date).getTime()) / (1000 * 3600 * 24);

    if (durationDays < 7) {
        const message = "Trend data available for less than 7 days.";
        console.log(message);
        return { success: false, message };
    }

    // Energy balance: 1 kg of body weight ≈ 7700 kcal
    const caloriesFromWeightChange = weightChangeKg * 7700;
    const averageDailyDeficitOrSurplus = caloriesFromWeightChange / durationDays;

    const newDynamicTDEE = Math.round(averageDailyCalories - averageDailyDeficitOrSurplus);

    if (isNaN(newDynamicTDEE) || newDynamicTDEE <= 0) {
        const message = "Calculation resulted in an invalid TDEE. Check your logged data for consistency.";
        console.log(message);
        return { success: false, message };
    }
    
    console.log(`[Dynamic TDEE] Old: ${userProfile.tdee}, New: ${newDynamicTDEE}. Based on ${durationDays} days of data.`);
    // Update the profile with the new, more accurate TDEE
    await setUserInformation({ tdee: newDynamicTDEE });

    const message = `Your TDEE has been updated to ${newDynamicTDEE} kcal/day based on your recent progress.`;
    return { success: true, newTDEE: newDynamicTDEE, message };
}, [userProfile, mealPlan, allRecipesCache, setUserInformation]);


  const contextValue = useMemo(() => ({
    mealPlan, shoppingList, pantryItems, userProfile, allRecipesCache,
    addMealToPlan, removeMealFromPlan, updatePlannedMealServings, getConsumedMacrosForDate,
    toggleShoppingListItem, clearMealPlanForDate, clearAllData, getMealsForDate,
    setMacroTargets, setDietaryPreferences, setAllergens, setMealStructure,
    setUserInformation, isRecipeCacheLoading, isAppDataLoading, favoriteRecipeIds, toggleFavoriteRecipe,
    isRecipeFavorite, addPantryItem, removePantryItem, updatePantryItemQuantity,
    parseIngredient, assignIngredientCategory, addCustomRecipe, userRecipes, setDashboardSettings,
    acceptTerms, updateMealStatus, logWeight, getPlannedMacrosForDate, runWeeklyCheckin,
  }), [
    mealPlan, shoppingList, pantryItems, userProfile, allRecipesCache, addMealToPlan, removeMealFromPlan,
    updatePlannedMealServings, getConsumedMacrosForDate, toggleShoppingListItem,
    clearMealPlanForDate, clearAllData, getMealsForDate, setMacroTargets,
    setDietaryPreferences, setAllergens, setMealStructure, setUserInformation, isRecipeCacheLoading,
    isAppDataLoading, favoriteRecipeIds, toggleFavoriteRecipe, isRecipeFavorite,
    addPantryItem, removePantryItem, updatePantryItemQuantity, parseIngredient, assignIngredientCategory,
    addCustomRecipe, userRecipes, setDashboardSettings, acceptTerms, updateMealStatus, logWeight, getPlannedMacrosForDate, runWeeklyCheckin
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
