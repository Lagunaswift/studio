
"use client";

import React, { createContext, useContext, useMemo, useCallback, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '@/lib/firebase';
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
  type UKSupermarketCategory,
  type PrimaryGoal
} from '@/types';
import { ACTIVITY_LEVEL_OPTIONS } from '@/types';
import { calculateTotalMacros as calculateTotalMacrosUtil, generateShoppingList as generateShoppingListUtil, assignCategory as assignCategoryUtil, calculateTrendWeight } from '@/lib/data';
import { runProCoachFlow } from '@/ai/flows/pro-coach-flow';
import { ProCoachOutputSchema } from '@/ai/flows/schemas';
import { format, subDays, differenceInDays } from 'date-fns';
import { addOrUpdateMealPlan, deleteMealFromPlan, addOrUpdatePantryItem, deletePantryItem, addRecipe as addRecipeAction, updateUserProfile, addOrUpdateVitalsLog, addOrUpdateWeightLog, addOrUpdateManualMacrosLog } from '@/app/dashboard/profile/actions';
import { z } from 'zod';

// --- Enhanced Client-side Helper for Server Actions ---
const callServerActionWithAuth = async (action: (idToken: string, ...args: any[]) => Promise<any>, ...args: any[]) => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User not authenticated for server action.');
  }

  try {
    // Force refresh the token to ensure it's not expired.
    const idToken = await user.getIdToken(true);
    return await action(idToken, ...args);
  } catch (error: any) {
    console.error(`Error in callServerActionWithAuth for action "${action.name}":`, error);
    throw error; // Re-throw the original error after logging
  }
};


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
    p.rda = getRdaProfile(p.sex, p.age, p.menopauseStatus ?? null, p.weightKg);
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
  isRecipeCacheLoading: boolean;

  // Actions
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
  runWeeklyCheckin: () => Promise<{ success: boolean; message: string; recommendation?: z.infer<typeof ProCoachOutputSchema> | null }>;
  
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

function getDefaultUserProfile(userId: string, userEmail: string | null): UserProfileSettings {
  return {
    id: userId,
    email: userEmail,
    name: null,
    macroTargets: null,
    dietaryPreferences: [],
    allergens: [],
    mealStructure: [
      { id: '1', name: 'Breakfast', type: 'Breakfast' },
      { id: '2', name: 'Lunch', type: 'Lunch' },
      { id: '3', name: 'Dinner', type: 'Dinner' },
      { id: '4', name: 'Snack', type: 'Snack' },
    ],
    heightCm: null,
    weightKg: null,
    age: null,
    sex: 'notSpecified',
    menopauseStatus: 'notSpecified',
    activityLevel: 'notSpecified',
    training_experience_level: 'notSpecified',
    bodyFatPercentage: null,
    athleteType: 'notSpecified',
    primaryGoal: 'notSpecified',
    tdee: null,
    leanBodyMassKg: null,
    rda: null,
    subscription_status: 'none',
    has_accepted_terms: false,
    last_check_in_date: null,
    target_weight_change_rate_kg: null,
    dashboardSettings: { showMacros: true, showMenu: true, showFeaturedRecipe: true, showQuickRecipes: true },
    favorite_recipe_ids: [],
  };
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfileSettings | null>(null);
  const [initialUserProfile, setInitialUserProfile] = useState<UserProfileSettings | null>(null);
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

  useEffect(() => {
    const unsubscribes: (() => void)[] = [];

    setIsRecipeCacheLoading(true);
    const builtInQuery = query(collection(db, "recipes"), where("user_id", "==", null));
    unsubscribes.push(onSnapshot(builtInQuery, (snapshot) => {
      const recipes = snapshot.docs.map(doc => ({ id: parseInt(doc.id, 10), ...doc.data() } as Recipe));
      setBuiltInRecipes(recipes);
      setIsRecipeCacheLoading(false);
    }, (error) => {
      console.error("Error fetching built-in recipes:", error);
      setIsRecipeCacheLoading(false);
    }));
    
    if (user?.uid) {
        setIsDataLoading(true);

        const profileUnsub = onSnapshot(doc(db, "profiles", user.uid), (doc) => {
            if (doc.exists()) {
                const data = doc.data() as UserProfileSettings;
                const processedProfile = processProfile(data);
                setUserProfile(processedProfile);
                setInitialUserProfile(processedProfile);
            } else {
                 const defaultProfile = getDefaultUserProfile(user.uid, user.email);
                 const processedProfile = processProfile(defaultProfile);
                 setUserProfile(processedProfile);
                 setInitialUserProfile(processedProfile);
            }
        });
        unsubscribes.push(profileUnsub);

        const collections: {name: string, setter: React.Dispatch<any>}[] = [
            { name: "recipes", setter: setUserRecipes },
            { name: "planned_meals", setter: setMealPlan },
            { name: "pantry_items", setter: setPantryItems },
            { name: "daily_weight_logs", setter: setDailyWeightLog },
            { name: "daily_vitals_logs", setter: setDailyVitalsLog },
            { name: "daily_manual_macros_logs", setter: setDailyManualMacrosLog },
        ];
        
        collections.forEach(c => {
            const q = query(collection(db, c.name), where("user_id", "==", user.uid));
            unsubscribes.push(onSnapshot(q, (querySnapshot) => {
                const items = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                c.setter(items);
            }));
        });
        
        const initialLoadTimer = setTimeout(() => setIsDataLoading(false), 1500); 
        unsubscribes.push(() => clearTimeout(initialLoadTimer));
    } else if (!isAuthLoading) {
        setIsDataLoading(false);
        setUserProfile(null);
        setInitialUserProfile(null);
        setUserRecipes([]);
        setMealPlan([]);
        setPantryItems([]);
        setDailyWeightLog([]);
        setDailyVitalsLog([]);
        setDailyManualMacrosLog([]);
    }

    return () => unsubscribes.forEach(unsub => unsub());
  }, [user?.uid, user?.email, isAuthLoading]);
  
  const setUserInformation = useCallback(async (updates: Partial<UserProfileSettings>) => {
    if (!userProfile) {
        throw new Error("User profile not loaded yet.");
    }
    const updatedProfile = { ...userProfile, ...updates };

    const recalculatedProfile = processProfile(updatedProfile);
    
    const result = await callServerActionWithAuth(updateUserProfile, recalculatedProfile);
    if (result.error) {
        throw new Error(result.error);
    }
  }, [userProfile]);

  const addMealToPlan = useCallback(async (recipe: Recipe, date: string, mealType: MealType, servings: number) => {
    const newPlannedMeal: Partial<Omit<PlannedMeal, 'id' | 'user_id' | 'recipeDetails'>> = { 
      recipeId: recipe.id, 
      date, 
      mealType, 
      servings,
      status: 'planned',
    };
    await callServerActionWithAuth(addOrUpdateMealPlan, newPlannedMeal);
  }, []);
  
  const removeMealFromPlan = useCallback(async (plannedMealId: string) => {
    await callServerActionWithAuth(deleteMealFromPlan, plannedMealId);
  }, []);

  const updateMealServingsOrStatus = useCallback(async (plannedMealId: string, updates: Partial<Pick<PlannedMeal, 'servings' | 'status'>>) => {
      const meal = mealPlan.find(m => m.id === plannedMealId);
      if (!meal) throw new Error("Meal not found locally.");
      
      const { recipeDetails, ...restOfMeal } = meal;
      const updatedMealData = { ...restOfMeal, ...updates };

      await callServerActionWithAuth(addOrUpdateMealPlan, updatedMealData);
  }, [mealPlan]);
  
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
  }, [pantryItems]);

  const removePantryItem = useCallback(async (itemId: string) => {
    await callServerActionWithAuth(deletePantryItem, itemId);
  }, []);

  const updatePantryItemQuantity = useCallback(async (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      return removePantryItem(itemId);
    }
    const item = pantryItems.find(p => p.id === itemId);
    if (!item) throw new Error("Pantry item not found locally.");
    
    const { user_id, ...restOfItem } = item;
    const updatedItem = { ...restOfItem, quantity: newQuantity };
    await callServerActionWithAuth(addOrUpdatePantryItem, updatedItem);
  }, [pantryItems, removePantryItem]);
  
  const getConsumedMacrosForDate = useCallback((date: string): Macros => {
    const manualLog = dailyManualMacrosLog?.find(log => log.date === date);
    if (manualLog) {
      return manualLog.macros;
    }
    return calculateTotalMacrosUtil(mealPlan?.filter(pm => pm.date === date && pm.status === 'eaten') || [], builtInRecipes.concat(userRecipes));
  }, [mealPlan, builtInRecipes, userRecipes, dailyManualMacrosLog]);

  const runWeeklyCheckin = useCallback(async (): Promise<{ success: boolean; message: string; recommendation?: z.infer<typeof ProCoachOutputSchema> | null }> => {
    if (!userProfile || !dailyWeightLog || !dailyManualMacrosLog) {
      return { success: false, message: "User profile and logs are not loaded yet." };
    }
  
    // This is a placeholder for the advanced TDEE calculation logic.
    // You will replace this with the logic from your new TDEE library.
    const mockTdeeResult = {
        dynamicTdee: userProfile.tdee || 2000,
        weeklyWeightChangeKg: -0.5,
        avgDailyCalories: (userProfile.tdee || 2000) - 500,
        confidence: 'high',
        dataQuality: {
            weightCompleteness: 100,
            macroCompleteness: 100,
            overallQuality: 'high',
            missingDays: 0,
            interpolatedDays: 0
        },
        analysisWindows: []
    };
    
    const preppyInput = {
      primaryGoal: userProfile.primaryGoal || 'maintenance',
      targetWeightChangeRateKg: userProfile.target_weight_change_rate_kg || 0,
      dynamicTdee: mockTdeeResult.dynamicTdee,
      actualAvgCalories: mockTdeeResult.avgDailyCalories,
      actualWeeklyWeightChangeKg: mockTdeeResult.weeklyWeightChangeKg,
      currentProteinTarget: userProfile.macroTargets?.protein || 0,
      currentFatTarget: userProfile.macroTargets?.fat || 0,
    };

    const result = await runProCoachFlow(preppyInput as { primaryGoal: PrimaryGoal; targetWeightChangeRateKg: number; dynamicTdee: number; actualAvgCalories: number; actualWeeklyWeightChangeKg: number; currentProteinTarget: number; currentFatTarget: number; });

    if (result && typeof result === 'object' && 'error' in result && result.error) {
      return { success: false, message: `ProCoach flow failed: ${result.error}` };
    }
  
    const output = result && typeof result === 'object' && 'data' in result ? result.data : result;
  
    const parsedRecommendation = ProCoachOutputSchema.safeParse(output);
    if (!parsedRecommendation.success) {
      return { success: false, message: "Invalid recommendation format from ProCoach: " + JSON.stringify(parsedRecommendation.error.flatten()) };
    }
  
    await callServerActionWithAuth(updateUserProfile, {
      tdee: mockTdeeResult.dynamicTdee,
      last_check_in_date: format(new Date(), 'yyyy-MM-dd'),
    });
  
    return { success: true, message: "Check-in complete!", recommendation: parsedRecommendation.data };
  }, [userProfile, dailyWeightLog, dailyManualMacrosLog, getConsumedMacrosForDate]);
  
  const contextValue: AppContextType = useMemo(() => ({
    userProfile,
    userRecipes,
    mealPlan,
    pantryItems,
    isAppDataLoading: isDataLoading,
    isRecipeCacheLoading,
    isSubscribed: userProfile?.subscription_status === 'active',
    isOnline,
    allRecipesCache: Array.from(new Map([...builtInRecipes, ...userRecipes].map(recipe => [recipe.id, recipe])).values()),
    shoppingList: generateShoppingListUtil(mealPlan, [...builtInRecipes, ...userRecipes], pantryItems),
    
    getConsumedMacrosForDate,
    getPlannedMacrosForDate: (date: string) => calculateTotalMacrosUtil(mealPlan.filter(pm => pm.date === date), [...builtInRecipes, ...userRecipes]),
    getMealsForDate: (date: string) => mealPlan.filter(pm => pm.date === date).map(pm => ({ ...pm, recipeDetails: [...builtInRecipes, ...userRecipes].find(r => r.id === pm.recipeId) })),
    isRecipeFavorite: (recipeId: number) => userProfile?.favorite_recipe_ids?.includes(recipeId) || false,
    
    addMealToPlan,
    removeMealFromPlan,
    updatePlannedMealServings: (plannedMealId: string, newServings: number) => updateMealServingsOrStatus(plannedMealId, { servings: newServings }),
    updateMealStatus: (plannedMealId: string, status: 'planned' | 'eaten') => updateMealServingsOrStatus(plannedMealId, { status }),
    clearMealPlanForDate: async (date: string) => {
        const mealsToDelete = mealPlan.filter(pm => pm.date === date);
        await Promise.all(mealsToDelete.map(meal => callServerActionWithAuth(deleteMealFromPlan, meal.id)));
    },
    clearEntireMealPlan: async () => {
        await Promise.all(mealPlan.map(meal => callServerActionWithAuth(deleteMealFromPlan, meal.id)));
    },
    toggleFavoriteRecipe: async (recipeId: number) => {
        if (!userProfile) return;
        const currentFavorites = userProfile.favorite_recipe_ids || [];
        const newFavorites = currentFavorites.includes(recipeId)
          ? currentFavorites.filter(id => id !== recipeId)
          : [...currentFavorites, recipeId];
        await setUserInformation({ favorite_recipe_ids: newFavorites });
    },
    toggleShoppingListItem: async (itemId: string) => {
        console.warn("Toggling shopping list item is not implemented with Firestore yet.");
    },
    addPantryItem,
    removePantryItem,
    updatePantryItemQuantity,
    addCustomRecipe: (recipeData: RecipeFormData) => callServerActionWithAuth(addRecipeAction, recipeData),
    runWeeklyCheckin,
    setUserInformation,
    setMacroTargets: (targets: Macros) => setUserInformation({ macroTargets: targets }),
    setMealStructure: (structure: MealSlotConfig[]) => setUserInformation({ mealStructure: structure }),
    setDashboardSettings: async (settings: Partial<DashboardSettings>) => {
      const defaultSettings: DashboardSettings = { showMacros: true, showMenu: true, showFeaturedRecipe: true, showQuickRecipes: true };
      const newSettings = { ...(userProfile?.dashboardSettings || defaultSettings), ...settings };
      await setUserInformation({ dashboardSettings: newSettings });
    },
    acceptTerms: () => setUserInformation({ has_accepted_terms: true }),
    assignIngredientCategory: assignCategoryUtil,
  }), [
    userProfile, userRecipes, builtInRecipes, mealPlan, pantryItems, isDataLoading, isRecipeCacheLoading, isOnline,
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
