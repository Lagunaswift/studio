
"use client";

import type React from 'react';
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
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
  DailyManualMacrosLog,
} from '@/types';
import { ACTIVITY_LEVEL_OPTIONS } from '@/types';
import { getAllRecipes as getAllRecipesFromDataFile, calculateTotalMacros as calculateTotalMacrosUtil, generateShoppingList as generateShoppingListUtil, parseIngredientString as parseIngredientStringUtil, assignCategory as assignCategoryUtil, calculateTrendWeight, getRdaProfile } from '@/lib/data';
import { loadState, saveState } from '@/lib/localStorage';
import { runPreppy, type PreppyInput, type PreppyOutput } from '@/ai/flows/pro-coach-flow';
import { suggestMicronutrients } from '@/ai/flows/suggest-micronutrients-flow';
import { format, subDays, differenceInDays } from 'date-fns';

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
  const { user, profile: authProfile, isLoading: isAuthLoading, acceptTerms, updateUserProfileInDb } = useAuth();
  
  const [mealPlan, setMealPlan] = useState<PlannedMeal[]>([]);
  const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>([]);
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);
  const userProfile = authProfile;
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

  // Load data from localStorage when user is available
  useEffect(() => {
    if (user && !isAuthLoading && authProfile) { 
      const userId = user.id;
      setMealPlan(loadState(`mealPlan_${userId}`) || []);
      setPantryItems(loadState(`pantryItems_${userId}`) || []);
      setUserRecipes(loadState(`userRecipes_${userId}`) || []);
      setFavoriteRecipeIds(loadState(`favoriteRecipeIds_${userId}`) || []);
    }
  }, [user, isAuthLoading, authProfile]);

  // Save data to localStorage when it changes
  useEffect(() => {
    if (user && !isAppDataLoading) {
      const userId = user.id;
      saveState(`mealPlan_${userId}`, mealPlan);
      saveState(`pantryItems_${userId}`, pantryItems);
      saveState(`userRecipes_${userId}`, userRecipes);
      saveState(`favoriteRecipeIds_${userId}`, favoriteRecipeIds);
    }
  }, [user, mealPlan, pantryItems, userRecipes, favoriteRecipeIds, isAppDataLoading]);

  // Regenerate shopping list when dependencies change
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

  const setMacroTargets = useCallback((targets: MacroTargets) => updateUserProfileInDb({ macroTargets: targets }), [updateUserProfileInDb]);
  const setDietaryPreferences = useCallback((preferences: string[]) => updateUserProfileInDb({ dietaryPreferences: preferences }), [updateUserProfileInDb]);
  const setAllergens = useCallback((allergens: string[]) => updateUserProfileInDb({ allergens }), [updateUserProfileInDb]);
  const setMealStructure = useCallback((mealStructure: MealSlotConfig[]) => updateUserProfileInDb({ mealStructure }), [updateUserProfileInDb]);
  const setDashboardSettings = useCallback((settings: DashboardSettings) => updateUserProfileInDb({ dashboardSettings: settings }), [updateUserProfileInDb]);
  
  const setUserInformation = useCallback(async (info: Partial<UserProfileSettings>) => {
    if (!user || !userProfile) return;
    await updateUserProfileInDb(info);
  }, [user, userProfile, updateUserProfileInDb]);
  
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
        micronutrientsPerServing: null,
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
    const userId = user.id;
    localStorage.removeItem(`mealPlan_${userId}`);
    localStorage.removeItem(`pantryItems_${userId}`);
    localStorage.removeItem(`userRecipes_${userId}`);
    localStorage.removeItem(`favoriteRecipeIds_${userId}`);
  }, [user]);
  
    const logData = useCallback(async (logType: 'dailyWeightLog' | 'dailyVitalsLog' | 'dailyManualMacrosLog', date: string, data: any) => {
        if (!userProfile || !user) return;
        
        let newLogEntry = { date, ...data };
        if (logType === 'dailyManualMacrosLog') {
             newLogEntry = { date, macros: data };
        }


        const currentLogs = userProfile[logType] || [];
        const existingLogIndex = currentLogs.findIndex(log => log.date === date);

        let updatedLogs: any[];
        if (existingLogIndex > -1) {
            updatedLogs = [...currentLogs];
            updatedLogs[existingLogIndex] = newLogEntry;
        } else {
            updatedLogs = [...currentLogs, newLogEntry];
        }

        updatedLogs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        const updates: Partial<UserProfileSettings> = { [logType]: updatedLogs };
        if (logType === 'dailyWeightLog') {
            updates.weightKg = data.weightKg;
        }
        
        updateUserProfileInDb(updates);
    }, [user, userProfile, updateUserProfileInDb]);


    const logWeight = (date: string, weightKg: number) => logData('dailyWeightLog', date, { weightKg });
    const logVitals = (date: string, vitals: Omit<DailyVitalsLog, 'date'>) => logData('dailyVitalsLog', date, vitals);
    const logManualMacros = (date: string, macros: Macros) => logData('dailyManualMacrosLog', date, macros);
    const logWellness = (date: string, mood: Mood, energy: Energy) => { /* Deprecated, use logVitals */ };


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
