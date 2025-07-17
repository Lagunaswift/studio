
"use client";

import React, { createContext, useContext, useMemo, useCallback, useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useAuth } from './AuthContext';
import { db, getOrCreateUserProfile, updateUserProfile } from '@/lib/db';
import type {
  PlannedMeal,
  ShoppingListItem,
  PantryItem,
  Recipe,
  MealType,
  Macros,
  UserProfileSettings,
  RecipeFormData,
  DailyWeightLog,
  DailyVitalsLog,
  DailyManualMacrosLog,
  Sex,
  ActivityLevel,
  RDA,
  MealSlotConfig,
  DashboardSettings,
} from '@/types';
import { ACTIVITY_LEVEL_OPTIONS } from '@/types';
import { getAllRecipes as getAllRecipesFromDataFile, calculateTotalMacros as calculateTotalMacrosUtil, generateShoppingList as generateShoppingListUtil, parseIngredientString as parseIngredientStringUtil, assignCategory as assignCategoryUtil, calculateTrendWeight } from '@/lib/data';
import { runPreppy, type PreppyInput, type PreppyOutput } from '@/ai/flows/pro-coach-flow';
import { format, subDays, differenceInDays } from 'date-fns';

const isOnline = process.env.NEXT_PUBLIC_SERVICE_STATUS === 'online';

const processProfile = (profileData: UserProfileSettings | undefined): UserProfileSettings | null => {
    if (!profileData) return null;
    const p = { ...profileData };
    p.tdee = calculateTDEE(p.weightKg, p.heightCm, p.age, p.sex, p.activityLevel);
    p.leanBodyMassKg = calculateLBM(p.weightKg, p.bodyFatPercentage);
    p.rda = getRdaProfile(p.sex, p.age);
    return p;
};

// --- Calculation Helpers ---
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

const getRdaProfile = (sex: Sex | null | undefined, age: number | null | undefined): RDA | null => {
    if (!sex || !age) {
        return null;
    }
    // Simplified RDA values for demonstration. A real app would use a more complex table.
    // Values are for adults aged 19-50.
    if (age >= 19 && age <= 50) {
        if (sex === 'male') {
            return { iron: 8, calcium: 1000, potassium: 3400, vitaminA: 900, vitaminC: 90, vitaminD: 15 };
        } else { // female
            return { iron: 18, calcium: 1000, potassium: 2600, vitaminA: 700, vitaminC: 75, vitaminD: 15 };
        }
    }
    // Default for other age groups for now
    return { iron: 10, calcium: 1200, potassium: 3000, vitaminA: 800, vitaminC: 80, vitaminD: 15 };
};


interface AppContextType {
  // State from DB (via useLiveQuery)
  mealPlan: PlannedMeal[];
  pantryItems: PantryItem[];
  userRecipes: Recipe[];
  userProfile: UserProfileSettings | null;
  
  // Computed State
  allRecipesCache: Recipe[];
  shoppingList: ShoppingListItem[];
  isOnline: boolean;

  // Loaders
  isRecipeCacheLoading: boolean;
  isAppDataLoading: boolean;

  // Actions
  addMealToPlan: (recipe: Recipe, date: string, mealType: MealType, servings: number) => Promise<void>;
  removeMealFromPlan: (plannedMealId: string) => Promise<void>;
  updatePlannedMealServings: (plannedMealId: string, newServings: number) => Promise<void>;
  updateMealStatus: (plannedMealId: string, status: 'planned' | 'eaten') => Promise<void>;
  logWeight: (date: string, weightKg: number) => Promise<void>;
  logVitals: (date: string, vitals: Omit<DailyVitalsLog, 'date' >) => Promise<void>;
  logManualMacros: (date: string, macros: Macros) => Promise<void>;
  clearMealPlanForDate: (date: string) => Promise<void>;
  clearEntireMealPlan: () => Promise<void>;
  toggleFavoriteRecipe: (recipeId: number) => Promise<void>;
  addPantryItem: (name: string, quantity: number, unit: string, category: string, expiryDate?: string) => Promise<void>;
  removePantryItem: (itemId: string) => Promise<void>;
  updatePantryItemQuantity: (itemId: string, newQuantity: number) => Promise<void>;
  addCustomRecipe: (recipeData: RecipeFormData) => Promise<void>;
  runWeeklyCheckin: () => Promise<{ success: boolean; message: string; recommendation?: PreppyOutput | null }>;
  
  // Profile Actions
  setUserInformation: (updates: Partial<UserProfileSettings>) => Promise<void>;
  setMacroTargets: (targets: Macros) => Promise<void>;
  setMealStructure: (structure: MealSlotConfig[]) => Promise<void>;
  setDashboardSettings: (settings: Partial<DashboardSettings>) => Promise<void>;
  acceptTerms: () => Promise<void>;
  assignIngredientCategory: (ingredientName: string) => UKSupermarketCategory;

  // Getters
  getConsumedMacrosForDate: (date: string) => Macros;
  getPlannedMacrosForDate: (date: string) => Macros;
  getMealsForDate: (date: string) => PlannedMeal[];
  isRecipeFavorite: (recipeId: number) => boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

function useAppData(userId: string | undefined, isAuthLoading: boolean) {
    const [staticRecipes, setStaticRecipes] = useState<Recipe[]>([]);
    const [isStaticRecipeLoading, setIsStaticRecipeLoading] = useState(true);

    const dbProfile = useLiveQuery(() => {
        const idToUse = userId || 'local-user';
        if (isAuthLoading && !userId) return undefined; // Prevent query with undefined id during auth loading
        return db.userProfile.get(idToUse);
    }, [userId, isAuthLoading]);

    useEffect(() => {
        const idToUse = userId || 'local-user';
        if (!isAuthLoading) {
            getOrCreateUserProfile(idToUse);
        }
    }, [userId, isAuthLoading]);
    
    const userRecipes = useLiveQuery(() => db.recipes.where({ isCustom: 1 }).toArray(), [], []);
    const mealPlan = useLiveQuery(() => db.plannedMeals.toArray(), [], []);
    const pantryItems = useLiveQuery(() => db.pantryItems.toArray(), [], []);
    const dailyWeightLog = useLiveQuery(() => db.dailyWeightLog.orderBy('date').reverse().toArray(), [], []);
    const dailyVitalsLog = useLiveQuery(() => db.dailyVitalsLog.orderBy('date').reverse().toArray(), [], []);
    const dailyManualMacrosLog = useLiveQuery(() => db.dailyManualMacrosLog.orderBy('date').reverse().toArray(), [], []);

    const userProfile = useMemo(() => {
      if (!dbProfile) return null;
      const processed = processProfile(dbProfile);
      if (processed) {
        processed.dailyWeightLog = dailyWeightLog;
        processed.dailyVitalsLog = dailyVitalsLog;
        processed.dailyManualMacrosLog = dailyManualMacrosLog;
      }
      return processed;
    }, [dbProfile, dailyWeightLog, dailyVitalsLog, dailyManualMacrosLog]);


    useEffect(() => {
        async function loadStaticRecipes() {
            setIsStaticRecipeLoading(true);
            try {
                const recipes = await getAllRecipesFromDataFile();
                await db.transaction('rw', db.recipes, async () => {
                    for (const recipe of recipes) {
                        const exists = await db.recipes.get(recipe.id);
                        if (!exists) {
                            await db.recipes.add(recipe);
                        }
                    }
                });
                setStaticRecipes(recipes);
            } catch (error) {
                console.error("Failed to load or save static recipes:", error);
            } finally {
                setIsStaticRecipeLoading(false);
            }
        }
        loadStaticRecipes();
    }, []);
    
    const isAppDataLoading = isAuthLoading || isStaticRecipeLoading || dbProfile === undefined;

    const allRecipesCache = useMemo(() => {
        const combined = [...staticRecipes, ...(userRecipes || [])];
        const uniqueRecipes = Array.from(new Map(combined.map(recipe => [recipe.id, recipe])).values());
        return uniqueRecipes;
    }, [staticRecipes, userRecipes]);

    const favoriteRecipeIds = useMemo(() => userProfile?.favorite_recipe_ids || [], [userProfile]);

    const shoppingList = useMemo(() => {
        if (isAppDataLoading || !mealPlan || !allRecipesCache || !pantryItems) return [];
        return generateShoppingListUtil(mealPlan, allRecipesCache, pantryItems);
    }, [mealPlan, pantryItems, allRecipesCache, isAppDataLoading]);

    const getConsumedMacrosForDate = useCallback((date: string): Macros => {
        const manualLog = dailyManualMacrosLog?.find(log => log.date === date);
        if (manualLog) {
          return manualLog.macros;
        }
        return calculateTotalMacrosUtil(mealPlan?.filter(pm => pm.date === date && pm.status === 'eaten') || [], allRecipesCache);
    }, [mealPlan, allRecipesCache, dailyManualMacrosLog]);
    
    const getPlannedMacrosForDate = useCallback((date: string): Macros => calculateTotalMacrosUtil(mealPlan?.filter(pm => pm.date === date) || [], allRecipesCache), [mealPlan, allRecipesCache]);
    
    const getMealsForDate = useCallback((date: string): PlannedMeal[] => {
        return (mealPlan || [])
          .filter(pm => pm.date === date)
          .map(pm => ({ ...pm, recipeDetails: allRecipesCache.find(r => r.id === pm.recipeId) }));
    }, [mealPlan, allRecipesCache]);

    const isRecipeFavorite = useCallback((recipeId: number): boolean => (favoriteRecipeIds || []).includes(recipeId), [favoriteRecipeIds]);

    const runWeeklyCheckin = useCallback(async (): Promise<{ success: boolean; message: string; recommendation?: PreppyOutput | null }> => {
        if (!userProfile || !dailyWeightLog || dailyWeightLog.length < 14) {
          return { success: false, message: "At least 14 days of weight and calorie data are needed for an accurate calculation." };
        }
        
        const logsWithTrend = calculateTrendWeight(dailyWeightLog);
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
        
        await updateUserProfile(userId || 'local-user', { tdee: newDynamicTDEE, lastCheckInDate: format(new Date(), 'yyyy-MM-dd') });
    
        return { success: true, message: "Check-in complete!", recommendation };
    }, [userProfile, dailyWeightLog, getConsumedMacrosForDate, userId]);

    return {
        mealPlan: mealPlan || [],
        pantryItems: pantryItems || [],
        userRecipes: userRecipes || [],
        userProfile,
        isAppDataLoading,
        allRecipesCache,
        isRecipeCacheLoading: isStaticRecipeLoading,
        shoppingList,
        favoriteRecipeIds,
        getConsumedMacrosForDate,
        getPlannedMacrosForDate,
        getMealsForDate,
        isRecipeFavorite,
        runWeeklyCheckin
    };
}


export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading: isAuthLoading } = useAuth();
  
  const {
      mealPlan,
      pantryItems,
      userRecipes,
      userProfile,
      isAppDataLoading,
      allRecipesCache,
      isRecipeCacheLoading,
      shoppingList,
      getConsumedMacrosForDate,
      getPlannedMacrosForDate,
      getMealsForDate,
      isRecipeFavorite,
      runWeeklyCheckin
  } = useAppData(user?.id, isAuthLoading);

  const userId = user?.id || 'local-user';

  const withLogging = async <T extends (...args: any[]) => any>(
    fn: T, 
    ...args: Parameters<T>
  ): Promise<ReturnType<T>> => {
    if (isOnline && process.env.NODE_ENV === 'development') {
      console.log(`[Supabase] Attempting to call ${fn.name} for user: ${userId}`);
    }
    try {
      const result = await fn(...args);
      if (isOnline && process.env.NODE_ENV === 'development') {
         console.log(`[Supabase] Successfully called ${fn.name}.`);
      }
      return result;
    } catch (error: any) {
      if (isOnline && process.env.NODE_ENV === 'development') {
        console.error(`[Supabase] Error calling ${fn.name} for user ${userId}:`, error.message);
      }
      // Fallback logic could be added here if needed
      throw error; // Re-throw the error to be handled by the caller
    }
  };


  // --- ACTIONS ---
  const setUserInformation = useCallback(async (updates: Partial<UserProfileSettings>) => {
    const updatedProfile = { ...(userProfile || {}), ...updates };
    const processed = processProfile(updatedProfile as UserProfileSettings);
    if (!isOnline) {
      return await db.userProfile.put(processed as UserProfileSettings);
    }
    await withLogging(db.userProfile.put.bind(db.userProfile), processed as UserProfileSettings);
  }, [userId, userProfile]);

  const acceptTerms = useCallback(async () => {
    await setUserInformation({ hasAcceptedTerms: true });
  }, [setUserInformation]);

  const setMacroTargets = useCallback(async (targets: Macros) => {
    await setUserInformation({ macroTargets: targets });
  }, [setUserInformation]);
  
  const setMealStructure = useCallback(async (structure: MealSlotConfig[]) => {
    await setUserInformation({ mealStructure: structure });
  }, [setUserInformation]);

  const setDashboardSettings = useCallback(async (settings: Partial<DashboardSettings>) => {
    const newSettings = { ...(userProfile?.dashboardSettings || {}), ...settings };
    await setUserInformation({ dashboardSettings: newSettings });
  }, [userProfile?.dashboardSettings, setUserInformation]);

  const addMealToPlan = useCallback(async (recipe: Recipe, date: string, mealType: MealType, servings: number) => {
    const newPlannedMeal: PlannedMeal = { 
      id: `meal_${Date.now()}_${Math.random()}`,
      recipeId: recipe.id, 
      date, 
      mealType, 
      servings,
      status: 'planned',
    };
    if (!isOnline) {
      return await db.plannedMeals.add(newPlannedMeal);
    }
    await withLogging(db.plannedMeals.add.bind(db.plannedMeals), newPlannedMeal);
  }, []);

  const removeMealFromPlan = useCallback(async (plannedMealId: string) => {
    if (!isOnline) {
      return await db.plannedMeals.delete(plannedMealId);
    }
    await withLogging(db.plannedMeals.delete.bind(db.plannedMeals), plannedMealId);
  }, []);

  const updatePlannedMealServings = useCallback(async (plannedMealId: string, newServings: number) => {
    if (!isOnline) {
      return await db.plannedMeals.update(plannedMealId, { servings: newServings });
    }
    await withLogging(db.plannedMeals.update.bind(db.plannedMeals), plannedMealId, { servings: newServings });
  }, []);

  const updateMealStatus = useCallback(async (plannedMealId: string, status: 'planned' | 'eaten') => {
    if (!isOnline) {
      return await db.plannedMeals.update(plannedMealId, { status });
    }
    await withLogging(db.plannedMeals.update.bind(db.plannedMeals), plannedMealId, { status });
  }, []);

  const clearMealPlanForDate = useCallback(async (date: string) => {
    const mealsToDelete = await db.plannedMeals.where('date').equals(date).primaryKeys();
    if (!isOnline) {
      return await db.plannedMeals.bulkDelete(mealsToDelete);
    }
    await withLogging(db.plannedMeals.bulkDelete.bind(db.plannedMeals), mealsToDelete);
  }, []);

  const clearEntireMealPlan = useCallback(async () => {
    if (!isOnline) {
      return await db.plannedMeals.clear();
    }
    await withLogging(db.plannedMeals.clear.bind(db.plannedMeals));
  }, []);

  const toggleFavoriteRecipe = useCallback(async (recipeId: number) => {
    const currentFavorites = userProfile?.favorite_recipe_ids || [];
    const isCurrentlyFavorite = currentFavorites.includes(recipeId);
    const newFavorites = isCurrentlyFavorite
      ? currentFavorites.filter(id => id !== recipeId)
      : [...currentFavorites, recipeId];
    await setUserInformation({ favorite_recipe_ids: newFavorites });
  }, [userProfile?.favorite_recipe_ids, setUserInformation]);
  
  const assignIngredientCategory = useCallback((ingredientName: string): UKSupermarketCategory => {
    return assignCategoryUtil(ingredientName);
  }, []);

  const addPantryItem = useCallback(async (name: string, quantity: number, unit: string, category: string, expiryDate?: string) => {
    const existingItem = await db.pantryItems
      .where('name').equalsIgnoreCase(name)
      .and(item => item.unit === unit)
      .first();

    if (existingItem) {
      const updateData = { 
        quantity: existingItem.quantity + quantity,
        expiryDate: expiryDate // Optionally update expiry date
      };
      if (!isOnline) {
        return await db.pantryItems.update(existingItem.id, updateData);
      }
      return await withLogging(db.pantryItems.update.bind(db.pantryItems), existingItem.id, updateData);
    } else {
      const newItem: PantryItem = {
        id: `pantry_${Date.now()}_${Math.random()}`,
        name, quantity, unit, 
        category: category as UKSupermarketCategory, 
        expiryDate
      };
      if (!isOnline) {
        return await db.pantryItems.add(newItem);
      }
      return await withLogging(db.pantryItems.add.bind(db.pantryItems), newItem);
    }
  }, []);

  const removePantryItem = useCallback(async (itemId: string) => {
    if (!isOnline) {
      return await db.pantryItems.delete(itemId);
    }
    await withLogging(db.pantryItems.delete.bind(db.pantryItems), itemId);
  }, []);

  const updatePantryItemQuantity = useCallback(async (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      return removePantryItem(itemId);
    } else {
      if (!isOnline) {
        return await db.pantryItems.update(itemId, { quantity: newQuantity });
      }
      return await withLogging(db.pantryItems.update.bind(db.pantryItems), itemId, { quantity: newQuantity });
    }
  }, [removePantryItem]);

  const addCustomRecipe = useCallback(async (recipeData: RecipeFormData) => {
    const newRecipe: Recipe = {
        id: Date.now(),
        name: recipeData.name,
        description: recipeData.description,
        image: recipeData.image || `https://placehold.co/600x400.png?text=${encodeURIComponent(recipeData.name)}`,
        servings: recipeData.servings,
        prepTime: recipeData.prepTime,
        cookTime: recipeData.cookTime,
        chillTime: recipeData.chillTime,
        ingredients: recipeData.ingredients.map(ing => ing.value),
        macrosPerServing: { calories: recipeData.calories, protein: recipeData.protein, carbs: recipeData.carbs, fat: recipeData.fat },
        micronutrientsPerServing: null,
        instructions: recipeData.instructions.map(inst => inst.value),
        tags: recipeData.tags,
        isCustom: true,
        user_id: userId
    };
    if (!isOnline) {
      return await db.recipes.add(newRecipe);
    }
    await withLogging(db.recipes.add.bind(db.recipes), newRecipe);
  }, [userId]);

  const logWeight = useCallback(async (date: string, weightKg: number) => {
    const newLog: DailyWeightLog = { date, weightKg };
    if (!isOnline) {
        await db.dailyWeightLog.put(newLog);
        return await db.userProfile.update(userId, { weightKg: weightKg, dailyWeightLog: [...(userProfile?.dailyWeightLog || []), newLog] });
    }
    await withLogging(db.dailyWeightLog.put.bind(db.dailyWeightLog), newLog);
    await withLogging(updateUserProfile, userId, { weightKg: weightKg, dailyWeightLog: [...(userProfile?.dailyWeightLog || []), newLog] });
  }, [userId, userProfile]);

  const logVitals = useCallback(async (date: string, vitals: Omit<DailyVitalsLog, 'date' >) => {
    const newLog: DailyVitalsLog = { date, ...vitals };
    if (!isOnline) {
      return await db.dailyVitalsLog.put(newLog);
    }
    await withLogging(db.dailyVitalsLog.put.bind(db.dailyVitalsLog), newLog);
  }, []);
  
  const logManualMacros = useCallback(async (date: string, macros: Macros) => {
    const newLog: DailyManualMacrosLog = { date, macros };
    if (!isOnline) {
      return await db.dailyManualMacrosLog.put(newLog);
    }
    await withLogging(db.dailyManualMacrosLog.put.bind(db.dailyManualMacrosLog), newLog);
  }, []);

  const contextValue = useMemo(() => ({
    mealPlan, pantryItems, userRecipes, userProfile,
    allRecipesCache, shoppingList, isRecipeCacheLoading, isAppDataLoading, isOnline,
    addMealToPlan, removeMealFromPlan, updatePlannedMealServings, updateMealStatus, 
    logWeight, logVitals, logManualMacros,
    clearMealPlanForDate, clearEntireMealPlan,
    toggleFavoriteRecipe, addPantryItem, removePantryItem, updatePantryItemQuantity,
    addCustomRecipe, runWeeklyCheckin,
    setUserInformation, setMacroTargets, setMealStructure, setDashboardSettings, acceptTerms,
    assignIngredientCategory,
    getConsumedMacrosForDate, getPlannedMacrosForDate, getMealsForDate, isRecipeFavorite,
  }), [
    mealPlan, pantryItems, userRecipes, userProfile,
    allRecipesCache, shoppingList, isRecipeCacheLoading, isAppDataLoading,
    addMealToPlan, removeMealFromPlan, updatePlannedMealServings, updateMealStatus,
    logWeight, logVitals, logManualMacros, clearMealPlanForDate,
    clearEntireMealPlan, toggleFavoriteRecipe, addPantryItem, removePantryItem, updatePantryItemQuantity,
    addCustomRecipe, runWeeklyCheckin, setUserInformation, setMacroTargets, setMealStructure,
    setDashboardSettings, acceptTerms, assignIngredientCategory, getConsumedMacrosForDate, getPlannedMacrosForDate, getMealsForDate, isRecipeFavorite,
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
