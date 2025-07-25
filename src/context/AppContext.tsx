//src/context/AppContext.tsx
"use client";

import React, { createContext, useContext, useMemo, useCallback, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { db } from '@/lib/firebase';
import {
  collection,
  onSnapshot,
  query,
  where,
  doc,
} from "firebase/firestore";
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
  type RDA,
  type MealSlotConfig,
  type DashboardSettings,
  type SubscriptionStatus,
  type UKSupermarketCategory
} from '@/types';
import { ACTIVITY_LEVEL_OPTIONS } from '@/types';
import { calculateTotalMacros as calculateTotalMacrosUtil, generateShoppingList as generateShoppingListUtil, parseIngredientString as parseIngredientStringUtil, assignCategory as assignCategoryUtil, calculateTrendWeight } from '@/lib/data';
import { runPreppy, type PreppyInput, type PreppyOutput } from '@/ai/flows/pro-coach-flow';
import { format, subDays, differenceInDays } from 'date-fns';
import { addOrUpdateMealPlan, deleteMealFromPlan, addOrUpdatePantryItem, deletePantryItem, addRecipe as addRecipeAction, updateUserProfile, addOrUpdateVitalsLog, addOrUpdateWeightLog, addOrUpdateManualMacrosLog, reportBug } from '@/app/(main)/profile/actions';


// --- Calculation Helpers ---
const processProfile = (profileData: UserProfileSettings | undefined | null): UserProfileSettings | null => {
    if (!profileData) return null;

    const validation = UserProfileSettingsSchema.safeParse(profileData);
    if (!validation.success) {
      console.warn("Invalid user profile data, using defaults. Errors:", validation.error.flatten());
      return null;
    }

    const p = { ...validation.data };
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
  // State from DB
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
    const [userProfileData, setUserProfileData] = useState<UserProfileSettings | null>(null);
    const [userRecipes, setUserRecipes] = useState<Recipe[]>([]);
    const [builtInRecipes, setBuiltInRecipes] = useState<Recipe[]>([]);
    const [mealPlan, setMealPlan] = useState<PlannedMeal[]>([]);
    const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);
    const [dailyWeightLog, setDailyWeightLog] = useState<DailyWeightLog[]>([]);
    const [dailyVitalsLog, setDailyVitalsLog] = useState<DailyVitalsLog[]>([]);
    const [dailyManualMacrosLog, setDailyManualMacrosLog] = useState<DailyManualMacrosLog[]>([]);
    const [isDataLoading, setIsDataLoading] = useState(true);

    const idToUse = useMemo(() => userId, [userId]);
    
    useEffect(() => {
      const unsubscribes: (() => void)[] = [];

      // Listener for built-in recipes (where user_id is null)
      const builtInQuery = query(collection(db, "recipes"), where("user_id", "==", null));
      unsubscribes.push(onSnapshot(builtInQuery, (snapshot) => {
        const recipes = snapshot.docs.map(doc => ({ id: parseInt(doc.id, 10), ...doc.data() } as Recipe));
        setBuiltInRecipes(recipes);
      }));

      if (!idToUse) {
        // If no user, only load built-in recipes and clear user data
        setUserProfileData(null);
        setUserRecipes([]);
        setMealPlan([]);
        setPantryItems([]);
        setDailyWeightLog([]);
        setDailyVitalsLog([]);
        setDailyManualMacrosLog([]);
        setIsDataLoading(false);
      } else {
        // If there is a user, load their specific data
        setIsDataLoading(true);

        unsubscribes.push(onSnapshot(doc(db, "profiles", idToUse), (doc) => {
            const data = doc.data() as UserProfileSettings | undefined;
            setUserProfileData(data || null);
        }));

        const collections: {name: string, setter: React.Dispatch<any>}[] = [
            { name: "recipes", setter: setUserRecipes },
            { name: "planned_meals", setter: setMealPlan },
            { name: "pantry_items", setter: setPantryItems },
            { name: "daily_weight_logs", setter: setDailyWeightLog },
            { name: "daily_vitals_logs", setter: setDailyVitalsLog },
            { name: "daily_manual_macros_logs", setter: setDailyManualMacrosLog },
        ];

        collections.forEach(c => {
            const q = query(collection(db, c.name), where("user_id", "==", idToUse));
            unsubscribes.push(onSnapshot(q, (querySnapshot) => {
                const items = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                c.setter(items);
            }));
        });
        
        // A simple way to know when initial data has been fetched.
        const initialLoadTimer = setTimeout(() => setIsDataLoading(false), 2000); 
        unsubscribes.push(() => clearTimeout(initialLoadTimer));
      }

      return () => unsubscribes.forEach(unsub => unsub());

    }, [idToUse]);

    const userProfile = useMemo(() => {
        if (!userProfileData) return null;
        const processed = processProfile(userProfileData);
        if (!processed) return userProfileData;

        return {
            ...processed,
            dailyWeightLog,
            dailyVitalsLog,
            dailyManualMacrosLog,
        };
    }, [userProfileData, dailyWeightLog, dailyVitalsLog, dailyManualMacrosLog]);


    const isSubscribed = useMemo(() => userProfile?.subscription_status === 'active', [userProfile?.subscription_status]);
    
    const isAppDataLoading = isAuthLoading || isDataLoading;

    const allRecipesCache = useMemo(() => {
        let recipes = [...userRecipes, ...builtInRecipes];
        recipes = Array.from(new Map(recipes.map(recipe => [recipe.id, recipe])).values());
        
        if (isSubscribed) {
          return recipes;
        } else {
          const freeRecipes = recipes.filter(r => !r.isCustom).slice(0, 15);
          const customRecipes = recipes.filter(r => r.isCustom);
          return [...freeRecipes, ...customRecipes];
        }

    }, [userRecipes, builtInRecipes, isSubscribed]);

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
          targetWeightChangeRateKg: userProfile.target_weight_change_rate_kg || 0,
          dynamicTdee: newDynamicTDEE,
          actualAvgCalories: averageDailyCalories,
          actualWeeklyWeightChangeKg: actualWeeklyWeightChangeKg,
          currentProteinTarget: userProfile.macroTargets?.protein || 0,
          currentFatTarget: userProfile.macroTargets?.fat || 0,
        };
    
        const recommendation = await runPreppy(preppyInput);
        
        await updateUserProfile({ id: idToUse!, tdee: newDynamicTDEE, last_check_in_date: format(new Date(), 'yyyy-MM-dd') });

        return { success: true, message: "Check-in complete!", recommendation };
    }, [userProfile, getConsumedMacrosForDate, idToUse]);


    return {
        mealPlan, pantryItems, userRecipes, userProfile,
        isAppDataLoading, isSubscribed, allRecipesCache,
        shoppingList, getConsumedMacrosForDate, getPlannedMacrosForDate,
        getMealsForDate, isRecipeFavorite, runWeeklyCheckin
    };
}


export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading: isAuthLoading } = useAuth();
  
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
  
  const {
      mealPlan, pantryItems, userRecipes, userProfile,
      isAppDataLoading, isSubscribed, allRecipesCache,
      shoppingList, getConsumedMacrosForDate, getPlannedMacrosForDate,
      getMealsForDate, isRecipeFavorite, runWeeklyCheckin
  } = useAppData(user?.uid, isAuthLoading);

  const callServerActionWithAuth = useCallback(async (action: (...args: any[]) => Promise<any>, ...args: any[]) => {
    if (!user) {
        console.error("Attempted to call server action without authenticated user.");
        throw new Error("Authentication required.");
    }
    const idToken = await user.getIdToken();
    
    // The `headers()` in the server action will automatically pick up this header
    // when using Next.js's built-in fetch patching for server actions.
    // However, to be explicit, this is where you'd construct headers if needed.
    // The current setup relies on the automatic forwarding.
    return action(...args);

  }, [user]);

  const setUserInformation = useCallback(async (updates: Partial<UserProfileSettings>) => {
    await callServerActionWithAuth(updateUserProfile, updates);
  }, [callServerActionWithAuth]);

  const acceptTerms = useCallback(async () => {
    await setUserInformation({ has_accepted_terms: true });
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
    const newPlannedMeal: Partial<Omit<PlannedMeal, 'id' | 'user_id' | 'recipeDetails'>> = { 
      recipeId: recipe.id, 
      date, 
      mealType, 
      servings,
      status: 'planned',
    };
    await callServerActionWithAuth(addOrUpdateMealPlan, newPlannedMeal);
  }, [callServerActionWithAuth]);

  const removeMealFromPlan = useCallback(async (plannedMealId: string) => {
    await callServerActionWithAuth(deleteMealFromPlan, plannedMealId);
  }, [callServerActionWithAuth]);

  const updateMealServingsOrStatus = useCallback(async (plannedMealId: string, updates: Partial<Pick<PlannedMeal, 'servings' | 'status'>>) => {
      const meal = mealPlan.find(m => m.id === plannedMealId);
      if (!meal) throw new Error("Meal not found locally.");
      
      const { recipeDetails, ...restOfMeal } = meal;
      const updatedMealData = { ...restOfMeal, ...updates };

      await callServerActionWithAuth(addOrUpdateMealPlan, updatedMealData);
  }, [mealPlan, callServerActionWithAuth]);

  const updatePlannedMealServings = (plannedMealId: string, newServings: number) => updateMealServingsOrStatus(plannedMealId, { servings: newServings });
  const updateMealStatus = (plannedMealId: string, status: 'planned' | 'eaten') => updateMealServingsOrStatus(plannedMealId, { status });

  const clearMealPlanForDate = useCallback(async (date: string) => {
    const mealsToDelete = mealPlan.filter(pm => pm.date === date);
    for (const meal of mealsToDelete) {
        await callServerActionWithAuth(deleteMealFromPlan, meal.id);
    }
  }, [mealPlan, callServerActionWithAuth]);

  const clearEntireMealPlan = useCallback(async () => {
    for (const meal of mealPlan) {
        await callServerActionWithAuth(deleteMealFromPlan, meal.id);
    }
  }, [mealPlan, callServerActionWithAuth]);

  const toggleFavoriteRecipe = useCallback(async (recipeId: number) => {
    if (!userProfile) return;
    const currentFavorites = userProfile.favorite_recipe_ids || [];
    const isCurrentlyFavorite = currentFavorites.includes(recipeId);
    const newFavorites = isCurrentlyFavorite
      ? currentFavorites.filter(id => id !== recipeId)
      : [...currentFavorites, recipeId];
    await setUserInformation({ favorite_recipe_ids: newFavorites });
  }, [userProfile, setUserInformation]);
  
  const assignIngredientCategory = useCallback((ingredientName: string): UKSupermarketCategory => {
    return assignCategoryUtil(ingredientName);
  }, []);

  const addPantryItem = useCallback(async (name: string, quantity: number, unit: string, category: string, expiryDate?: string) => {
    const existingItem = pantryItems.find(item => 
        item.name.toLowerCase() === name.toLowerCase() && item.unit === unit
    );

    let itemToSave: Omit<PantryItem, 'user_id'>;
    if (existingItem) {
        itemToSave = {
            ...existingItem,
            quantity: existingItem.quantity + quantity,
            expiryDate: expiryDate || existingItem.expiryDate
        };
    } else {
        itemToSave = {
            id: `pantry_${Date.now()}_${Math.random()}`,
            name, quantity, unit, 
            category: category as UKSupermarketCategory, 
            expiryDate
        };
    }
    await callServerActionWithAuth(addOrUpdatePantryItem, itemToSave);
  }, [pantryItems, callServerActionWithAuth]);

  const removePantryItem = useCallback(async (itemId: string) => {
    await callServerActionWithAuth(deletePantryItem, itemId);
  }, [callServerActionWithAuth]);

  const updatePantryItemQuantity = useCallback(async (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      return removePantryItem(itemId);
    }
    const item = pantryItems.find(p => p.id === itemId);
    if (!item) throw new Error("Pantry item not found locally.");
    
    const { user_id, ...restOfItem } = item;
    const updatedItem = { ...restOfItem, quantity: newQuantity };
    await callServerActionWithAuth(addOrUpdatePantryItem, updatedItem);
  }, [pantryItems, removePantryItem, callServerActionWithAuth]);

  const addCustomRecipe = useCallback(async (recipeData: RecipeFormData) => {
    return await callServerActionWithAuth(addRecipeAction, recipeData);
  }, [callServerActionWithAuth]);

  const contextValue = useMemo(() => ({
    mealPlan, pantryItems, userRecipes, userProfile,
    allRecipesCache, shoppingList, isAppDataLoading, isOnline, isSubscribed,
    addMealToPlan, removeMealFromPlan, updatePlannedMealServings, updateMealStatus, 
    clearMealPlanForDate, clearEntireMealPlan,
    toggleFavoriteRecipe, addPantryItem, removePantryItem, updatePantryItemQuantity,
    addCustomRecipe, runWeeklyCheckin,
    setUserInformation, setMacroTargets, setMealStructure, setDashboardSettings, acceptTerms,
    assignIngredientCategory,
    getConsumedMacrosForDate, getPlannedMacrosForDate, getMealsForDate, isRecipeFavorite,
  }), [
    mealPlan, pantryItems, userRecipes, userProfile,
    allRecipesCache, shoppingList, isAppDataLoading, isOnline, isSubscribed,
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
