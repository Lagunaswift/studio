//src/context/AppContext.tsx
"use client";

import React, { createContext, useContext, useMemo, useCallback, useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useAuth } from './AuthContext';
import { db, getOrCreateUserProfile } from '@/lib/db';
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
  SubscriptionStatus,
  UKSupermarketCategory
} from '@/types';
import { ACTIVITY_LEVEL_OPTIONS } from '@/types';
import { getAllRecipes as getAllRecipesFromDataFile, calculateTotalMacros as calculateTotalMacrosUtil, generateShoppingList as generateShoppingListUtil, parseIngredientString as parseIngredientStringUtil, assignCategory as assignCategoryUtil, calculateTrendWeight } from '@/lib/data';
import { runPreppy, type PreppyInput, type PreppyOutput } from '@/ai/flows/pro-coach-flow';
import { format, subDays, differenceInDays } from 'date-fns';
import { addOrUpdateMealPlan, deleteMealFromPlan, addOrUpdatePantryItem, deletePantryItem, addRecipe as addRecipeAction, updateUserProfile } from '@/app/(main)/profile/actions';


// --- Calculation Helpers ---
const processProfile = (profileData: UserProfileSettings | undefined | null): UserProfileSettings | null => {
    if (!profileData) return null;
    const p = { ...profileData };
    p.tdee = calculateTDEE(p.weightKg, p.heightCm, p.age, p.sex, p.activityLevel);
    p.leanBodyMassKg = calculateLBM(p.weightKg, p.bodyFatPercentage);
    p.rda = getRdaProfile(p.sex, p.age);
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
  isSubscribed: boolean;

  // Loaders
  isRecipeCacheLoading: boolean;
  isAppDataLoading: boolean;

  // Actions
  addMealToPlan: (recipe: Recipe, date: string, mealType: MealType, servings: number) => Promise<void>;
  removeMealFromPlan: (plannedMealId: string) => Promise<void>;
  updatePlannedMealServings: (plannedMealId: string, newServings: number) => Promise<void>;
  updateMealStatus: (plannedMealId: string, status: 'planned' | 'eaten') => Promise<void>;
  clearMealPlanForDate: (date: string) => Promise<void>;
  clearEntireMealPlan: () => Promise<void>;
  toggleFavoriteRecipe: (recipeId: number) => Promise<void>;
  addPantryItem: (name: string, quantity: number, unit: string, category: string, expiryDate?: string) => Promise<void>;
  removePantryItem: (itemId: string) => Promise<void>;
  updatePantryItemQuantity: (itemId: string, newQuantity: number) => Promise<void>;
  addCustomRecipe: (recipeData: RecipeFormData) => Promise<any>;
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

    const idToUse = useMemo(() => userId || 'local-user', [userId]);

    const rawProfile = useLiveQuery(
      async () => {
        if (isAuthLoading) return undefined;
        return db.userProfile.get(idToUse);
      },
      [idToUse, isAuthLoading], 
      undefined 
    );
    
    useEffect(() => {
      const ensureProfileExists = async () => {
        if (!isAuthLoading && rawProfile === undefined) {
          await getOrCreateUserProfile(idToUse);
        }
      };
      ensureProfileExists();
    }, [isAuthLoading, rawProfile, idToUse]);

    const processedProfile = useMemo(() => processProfile(rawProfile), [rawProfile]);

    const userRecipes = useLiveQuery(() => db.recipes.where({ isCustom: 1 }).toArray(), [], []);
    const mealPlan = useLiveQuery(() => db.plannedMeals.toArray(), [], []);
    const pantryItems = useLiveQuery(() => db.pantryItems.toArray(), [], []);
    const dailyWeightLog = useLiveQuery(() => db.dailyWeightLog.orderBy('date').reverse().toArray(), [], []);
    const dailyVitalsLog = useLiveQuery(() => db.dailyVitalsLog.orderBy('date').reverse().toArray(), [], []);
    const dailyManualMacrosLog = useLiveQuery(() => db.dailyManualMacrosLog.orderBy('date').reverse().toArray(), [], []);

    const userProfile = useMemo(() => {
      if (!processedProfile) return null;
      return {
        ...processedProfile,
        dailyWeightLog,
        dailyVitalsLog,
        dailyManualMacrosLog,
      };
    }, [processedProfile, dailyWeightLog, dailyVitalsLog, dailyManualMacrosLog]);

    const isSubscribed = useMemo(() => userProfile?.subscription_status === 'active', [userProfile?.subscription_status]);


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
    
    const isAppDataLoading = isAuthLoading || isStaticRecipeLoading || rawProfile === undefined;

    const allRecipesCache = useMemo(() => {
        let recipes = [...staticRecipes, ...(userRecipes || [])];
        recipes = Array.from(new Map(recipes.map(recipe => [recipe.id, recipe])).values());
        
        if (isSubscribed) {
          return recipes;
        } else {
          const freeRecipes = recipes.filter(r => !r.isCustom).slice(0, 15);
          const customRecipes = recipes.filter(r => r.isCustom);
          return [...freeRecipes, ...customRecipes];
        }

    }, [staticRecipes, userRecipes, isSubscribed]);

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
        
        // This should also be a server action now.
        const result = await updateUserProfile({ tdee: newDynamicTDEE, lastCheckInDate: format(new Date(), 'yyyy-MM-dd') });
        if (result.success && result.data) {
           await db.userProfile.put(result.data);
        } else {
            console.error("Failed to update user profile after check-in:", result.error);
        }
    
        return { success: true, message: "Check-in complete!", recommendation };
    }, [userProfile, dailyWeightLog, getConsumedMacrosForDate, userId]);

    return {
        mealPlan: mealPlan || [],
        pantryItems: pantryItems || [],
        userRecipes: userRecipes || [],
        userProfile: userProfile || null,
        isAppDataLoading,
        isSubscribed,
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
  
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    setIsOnline(true);
  }, []); 
  
  const {
      mealPlan,
      pantryItems,
      userRecipes,
      userProfile,
      isAppDataLoading,
      isSubscribed,
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

  // --- ACTIONS ---
  const setUserInformation = useCallback(async (updates: Partial<UserProfileSettings>) => {
      const result = await updateUserProfile(updates);
      if (result.success && result.data) {
          await db.userProfile.put(result.data);
      } else {
          console.error("Failed to update user profile:", result.error);
          throw new Error(result.error);
      }
  }, []);

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
    const newPlannedMeal: Omit<PlannedMeal, 'user_id' | 'id'> & { id?: string } = { 
      recipeId: recipe.id, 
      date, 
      mealType, 
      servings,
      status: 'planned',
    };
    const result = await addOrUpdateMealPlan(newPlannedMeal);
    if (result.success && result.data) {
        await db.plannedMeals.put(result.data);
    } else {
        throw new Error(result.error);
    }
  }, []);

  const removeMealFromPlan = useCallback(async (plannedMealId: string) => {
    const result = await deleteMealFromPlan(plannedMealId);
    if (result.success) {
      await db.plannedMeals.delete(plannedMealId);
    } else {
      throw new Error(result.error);
    }
  }, []);

  const updateMealServingsOrStatus = useCallback(async (plannedMealId: string, updates: Partial<Pick<PlannedMeal, 'servings' | 'status'>>) => {
      const meal = await db.plannedMeals.get(plannedMealId);
      if (!meal) throw new Error("Meal not found locally.");
      
      const updatedMealData = { ...meal, ...updates };

      const result = await addOrUpdateMealPlan(updatedMealData);
      if (result.success && result.data) {
          await db.plannedMeals.put(result.data);
      } else {
          throw new Error(result.error);
      }
  }, []);

  const updatePlannedMealServings = (plannedMealId: string, newServings: number) => updateMealServingsOrStatus(plannedMealId, { servings: newServings });
  const updateMealStatus = (plannedMealId: string, status: 'planned' | 'eaten') => updateMealServingsOrStatus(plannedMealId, { status });

  const clearMealPlanForDate = useCallback(async (date: string) => {
    const mealsToDelete = await db.plannedMeals.where('date').equals(date).primaryKeys();
    for (const id of mealsToDelete) {
        await removeMealFromPlan(id);
    }
  }, [removeMealFromPlan]);

  const clearEntireMealPlan = useCallback(async () => {
    const allMeals = await db.plannedMeals.toArray();
    for (const meal of allMeals) {
        await removeMealFromPlan(meal.id);
    }
  }, [removeMealFromPlan]);

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

    let itemToSave: PantryItem;
    if (existingItem) {
        itemToSave = {
            ...existingItem,
            quantity: existingItem.quantity + quantity,
            expiryDate: expiryDate // Optionally update expiry date
        };
    } else {
        itemToSave = {
            id: `pantry_${Date.now()}_${Math.random()}`,
            name, quantity, unit, 
            category: category as UKSupermarketCategory, 
            expiryDate
        };
    }
    const result = await addOrUpdatePantryItem(itemToSave);
    if(result.success && result.data){
        await db.pantryItems.put(result.data);
    } else {
        throw new Error(result.error);
    }
  }, []);

  const removePantryItem = useCallback(async (itemId: string) => {
    const result = await deletePantryItem(itemId);
    if(result.success){
        await db.pantryItems.delete(itemId);
    } else {
        throw new Error(result.error);
    }
  }, []);

  const updatePantryItemQuantity = useCallback(async (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      return removePantryItem(itemId);
    }
    const item = await db.pantryItems.get(itemId);
    if (!item) throw new Error("Pantry item not found locally.");
    
    const updatedItem = { ...item, quantity: newQuantity };
    const result = await addOrUpdatePantryItem(updatedItem);
     if(result.success && result.data){
        await db.pantryItems.put(result.data);
    } else {
        throw new Error(result.error);
    }
  }, [removePantryItem]);

  const addCustomRecipe = useCallback(async (recipeData: RecipeFormData) => {
    const result = await addRecipeAction(recipeData);
    if(result.success && result.data){
        await db.recipes.add(result.data);
    }
    return result; // Pass result back to UI for redirect etc.
  }, []);

  const contextValue = useMemo(() => ({
    mealPlan, pantryItems, userRecipes, userProfile,
    allRecipesCache, shoppingList, isRecipeCacheLoading, isAppDataLoading, isOnline, isSubscribed,
    addMealToPlan, removeMealFromPlan, updatePlannedMealServings, updateMealStatus, 
    clearMealPlanForDate, clearEntireMealPlan,
    toggleFavoriteRecipe, addPantryItem, removePantryItem, updatePantryItemQuantity,
    addCustomRecipe, runWeeklyCheckin,
    setUserInformation, setMacroTargets, setMealStructure, setDashboardSettings, acceptTerms,
    assignIngredientCategory,
    getConsumedMacrosForDate, getPlannedMacrosForDate, getMealsForDate, isRecipeFavorite,
  }), [
    mealPlan, pantryItems, userRecipes, userProfile,
    allRecipesCache, shoppingList, isRecipeCacheLoading, isAppDataLoading, isOnline, isSubscribed,
    addMealToPlan, removeMealFromPlan, updatePlannedMealServings, updateMealStatus,
    clearMealPlanForDate, clearEntireMealPlan, 
    toggleFavoriteRecipe, addPantryItem, removePantryItem, updatePantryItemQuantity,
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
