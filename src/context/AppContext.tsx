
"use client";

import type React from 'react';
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type {
  PlannedMeal,
  ShoppingListItem,
  Recipe,
  MealType,
  Macros,
  MacroTargets,
  UserProfileSettings,
  MealSlotConfig,
  Sex,
  ActivityLevel,
  AthleteType,
  PrimaryGoal,
  SubscriptionStatus
} from '@/types';
import { ACTIVITY_LEVEL_OPTIONS } from '@/types';
import { loadState, saveState } from '@/lib/localStorage';
// Import getAllRecipes directly, it's now using mock data but keeps async signature
import { getAllRecipes as getAllRecipesFromData, calculateTotalMacros, generateShoppingList as generateShoppingListUtil } from '@/lib/data';


const MEAL_PLAN_KEY = 'macroTealMealPlan';
const SHOPPING_LIST_KEY = 'macroTealShoppingList';
const USER_PROFILE_KEY = 'macroTealUserProfile';

const DEFAULT_MEAL_STRUCTURE: MealSlotConfig[] = [
  { id: 'default-breakfast', name: 'Breakfast', type: 'Breakfast' },
  { id: 'default-lunch', name: 'Lunch', type: 'Lunch' },
  { id: 'default-dinner', name: 'Dinner', type: 'Dinner' },
  { id: 'default-snack1', name: 'Snack', type: 'Snack' },
];

const DEFAULT_USER_PROFILE: UserProfileSettings = {
  macroTargets: null,
  dietaryPreferences: [],
  allergens: [],
  mealStructure: DEFAULT_MEAL_STRUCTURE,
  heightCm: null,
  weightKg: null,
  age: null,
  sex: null,
  activityLevel: null,
  bodyFatPercentage: null,
  athleteType: 'notSpecified',
  primaryGoal: 'notSpecified',
  tdee: null,
  leanBodyMassKg: null,
  subscription_status: 'active', 
  plan_name: null,
  subscription_start_date: null,
  subscription_end_date: null,
  subscription_duration: null,
};

const calculateLBM = (weightKg: number | null, bodyFatPercentage: number | null): number | null => {
  if (weightKg && bodyFatPercentage && bodyFatPercentage > 0 && bodyFatPercentage < 100) {
    return weightKg * (1 - bodyFatPercentage / 100);
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
  if (!weightKg || !heightCm || !age || !sex || !activityLevel) {
    return null;
  }
  let bmr: number;
  if (sex === 'male') {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  } else {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
  }
  const activity = ACTIVITY_LEVEL_OPTIONS.find(opt => opt.value === activityLevel);
  if (activity) {
    return Math.round(bmr * activity.multiplier);
  }
  return null;
};

interface AppContextType {
  mealPlan: PlannedMeal[];
  shoppingList: ShoppingListItem[];
  userProfile: UserProfileSettings | null;
  allRecipesCache: Recipe[];
  addMealToPlan: (recipe: Recipe, date: string, mealType: MealType, servings: number) => void;
  removeMealFromPlan: (plannedMealId: string) => void;
  updatePlannedMealServings: (plannedMealId: string, newServings: number) => void;
  getDailyMacros: (date: string) => Macros;
  toggleShoppingListItem: (itemId: string) => void;
  clearMealPlanForDate: (date: string) => void;
  clearAllData: () => void;
  getMealsForDate: (date: string) => PlannedMeal[];
  setMacroTargets: (targets: MacroTargets) => void;
  setDietaryPreferences: (preferences: string[]) => void;
  setAllergens: (allergens: string[]) => void;
  setMealStructure: (mealStructure: MealSlotConfig[]) => void;
  setUserInformation: (info: Partial<UserProfileSettings>) => void;
  isRecipeCacheLoading: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mealPlan, setMealPlan] = useState<PlannedMeal[]>([]);
  const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfileSettings | null>(null);
  const [allRecipesCache, setAllRecipesCache] = useState<Recipe[]>([]);
  const [isRecipeCacheLoading, setIsRecipeCacheLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initializeData = async () => {
      setIsRecipeCacheLoading(true);
      let recipes: Recipe[] = [];
      try {
        // getAllRecipesFromData now refers to the function in src/lib/data.ts which uses mock data
        recipes = await getAllRecipesFromData(); 
        setAllRecipesCache(recipes);
      } catch (error) {
        console.error("Failed to load recipes into cache:", error);
        setAllRecipesCache([]);
      } finally {
        setIsRecipeCacheLoading(false);
      }

      const loadedMealPlan = loadState<PlannedMeal[]>(MEAL_PLAN_KEY) || [];
      const loadedShoppingList = loadState<ShoppingListItem[]>(SHOPPING_LIST_KEY) || [];
      let loadedUserProfile = loadState<UserProfileSettings>(USER_PROFILE_KEY);

      if (!loadedUserProfile) {
        loadedUserProfile = DEFAULT_USER_PROFILE;
      } else {
        loadedUserProfile = { ...DEFAULT_USER_PROFILE, ...loadedUserProfile };
        if (loadedUserProfile.subscription_status === undefined) { 
            loadedUserProfile.subscription_status = DEFAULT_USER_PROFILE.subscription_status;
        }
        loadedUserProfile.tdee = calculateTDEE(
          loadedUserProfile.weightKg,
          loadedUserProfile.heightCm,
          loadedUserProfile.age,
          loadedUserProfile.sex,
          loadedUserProfile.activityLevel
        );
        loadedUserProfile.leanBodyMassKg = calculateLBM(
          loadedUserProfile.weightKg,
          loadedUserProfile.bodyFatPercentage
        );
      }
      if (!loadedUserProfile.mealStructure || loadedUserProfile.mealStructure.length === 0) {
          loadedUserProfile.mealStructure = DEFAULT_MEAL_STRUCTURE;
      }
      
      setUserProfile(loadedUserProfile);

      const populatedMealPlan = loadedMealPlan.map(pm => {
        const recipeDetails = recipes.find(r => r.id === pm.recipeId); 
        return {...pm, recipeDetails: recipeDetails || undefined };
      });
      setMealPlan(populatedMealPlan);
      
      if (loadedShoppingList.length === 0 && populatedMealPlan.length > 0) {
        setShoppingList(generateShoppingListUtil(populatedMealPlan, recipes)); 
      } else {
        setShoppingList(loadedShoppingList);
      }
      setIsInitialized(true);
    };

    initializeData();
  }, []);

   useEffect(() => {
    if (allRecipesCache.length > 0 && mealPlan.some(pm => !pm.recipeDetails)) {
        setMealPlan(prevMealPlan => 
            prevMealPlan.map(pm => {
                if (!pm.recipeDetails) {
                    const recipeDetails = allRecipesCache.find(r => r.id === pm.recipeId);
                    return {...pm, recipeDetails: recipeDetails || undefined};
                }
                return pm;
            })
        );
    }
  }, [allRecipesCache, mealPlan]);


  useEffect(() => {
    if (isInitialized && userProfile) {
      saveState(USER_PROFILE_KEY, userProfile);
    }
  }, [userProfile, isInitialized]);

  useEffect(() => {
    if (isInitialized) {
      saveState(MEAL_PLAN_KEY, mealPlan.map(({recipeDetails, ...pm}) => pm));
    }
  }, [mealPlan, isInitialized]);

  useEffect(() => {
    if (isInitialized) {
      saveState(SHOPPING_LIST_KEY, shoppingList);
    }
  }, [shoppingList, isInitialized]);

  const regenerateShoppingList = useCallback((currentMealPlan: PlannedMeal[]) => {
    const newShoppingList = generateShoppingListUtil(currentMealPlan, allRecipesCache);
    setShoppingList(newShoppingList);
  }, [allRecipesCache]);

  const addMealToPlan = useCallback((recipe: Recipe, date: string, mealType: MealType, servings: number) => {
    const newPlannedMeal: PlannedMeal = {
      id: `${recipe.id}-${date}-${mealType}-${Date.now()}`,
      recipeId: recipe.id,
      date,
      mealType,
      servings,
      recipeDetails: recipe,
    };
    setMealPlan(prev => {
      const updatedPlan = [...prev, newPlannedMeal];
      regenerateShoppingList(updatedPlan);
      return updatedPlan;
    });
  }, [regenerateShoppingList]);

  const removeMealFromPlan = useCallback((plannedMealId: string) => {
    setMealPlan(prev => {
      const updatedPlan = prev.filter(pm => pm.id !== plannedMealId);
      regenerateShoppingList(updatedPlan);
      return updatedPlan;
    });
  }, [regenerateShoppingList]);

  const updatePlannedMealServings = useCallback((plannedMealId: string, newServings: number) => {
    setMealPlan(prev => {
      const updatedPlan = prev.map(pm =>
        pm.id === plannedMealId ? { ...pm, servings: newServings } : pm
      );
      regenerateShoppingList(updatedPlan);
      return updatedPlan;
    });
  }, [regenerateShoppingList]);

  const getDailyMacros = useCallback((date: string): Macros => {
    const dailyMeals = mealPlan.filter(pm => pm.date === date);
    return calculateTotalMacros(dailyMeals, allRecipesCache);
  }, [mealPlan, allRecipesCache]);

  const getMealsForDate = useCallback((date: string): PlannedMeal[] => {
    return mealPlan.filter(pm => pm.date === date).map(pm => ({
      ...pm,
      recipeDetails: pm.recipeDetails || allRecipesCache.find(r => r.id === pm.recipeId)
    }));
  }, [mealPlan, allRecipesCache]);

  const toggleShoppingListItem = useCallback((itemId: string) => {
    setShoppingList(prev =>
      prev.map(item =>
        item.id === itemId ? { ...item, purchased: !item.purchased } : item
      )
    );
  }, []);

  const clearMealPlanForDate = useCallback((date: string) => {
    setMealPlan(prev => {
      const updatedPlan = prev.filter(pm => pm.date !== date);
      regenerateShoppingList(updatedPlan);
      return updatedPlan;
    });
  }, [regenerateShoppingList]);

  const clearAllData = useCallback(() => {
    setMealPlan([]);
    setShoppingList([]); 
    setUserProfile(prevProfile => ({
      ...DEFAULT_USER_PROFILE,
       ...DEFAULT_USER_PROFILE
    }));
  }, []); 

  const updateUserProfileState = useCallback((updates: Partial<UserProfileSettings>) => {
    setUserProfile(prevProfile => {
      const currentProfile = prevProfile || DEFAULT_USER_PROFILE;
      const updatedProfile = { ...currentProfile, ...updates };
      updatedProfile.tdee = calculateTDEE(
        updatedProfile.weightKg,
        updatedProfile.heightCm,
        updatedProfile.age,
        updatedProfile.sex,
        updatedProfile.activityLevel
      );
      updatedProfile.leanBodyMassKg = calculateLBM(
        updatedProfile.weightKg,
        updatedProfile.bodyFatPercentage
      );
      return updatedProfile;
    });
  }, []);

  const setMacroTargets = useCallback((targets: MacroTargets) => {
    updateUserProfileState({ macroTargets: targets });
  }, [updateUserProfileState]);

  const setDietaryPreferences = useCallback((preferences: string[]) => {
    updateUserProfileState({ dietaryPreferences: preferences });
  }, [updateUserProfileState]);

  const setAllergens = useCallback((allergens: string[]) => {
    updateUserProfileState({ allergens });
  }, [updateUserProfileState]);

  const setMealStructure = useCallback((mealStructure: MealSlotConfig[]) => {
    updateUserProfileState({ mealStructure });
  }, [updateUserProfileState]);

  const setUserInformation = useCallback((info: Partial<UserProfileSettings>) => {
    updateUserProfileState(info);
  }, [updateUserProfileState]);

  const contextValue = useMemo(() => ({
    mealPlan,
    shoppingList,
    userProfile,
    allRecipesCache,
    addMealToPlan,
    removeMealFromPlan,
    updatePlannedMealServings,
    getDailyMacros,
    toggleShoppingListItem,
    clearMealPlanForDate,
    clearAllData,
    getMealsForDate,
    setMacroTargets,
    setDietaryPreferences,
    setAllergens,
    setMealStructure,
    setUserInformation,
    isRecipeCacheLoading,
  }), [
    mealPlan, shoppingList, userProfile, allRecipesCache, addMealToPlan, removeMealFromPlan,
    updatePlannedMealServings, getDailyMacros, toggleShoppingListItem,
    clearMealPlanForDate, clearAllData, getMealsForDate, setMacroTargets,
    setDietaryPreferences, setAllergens, setMealStructure, setUserInformation, isRecipeCacheLoading
  ]);

  if (!isInitialized && !isRecipeCacheLoading) { // Ensure we don't return null if recipes are still loading
    return null; 
  }
  
  // Still return loading indicator if cache is loading but context is otherwise ready
  if (isRecipeCacheLoading && !isInitialized) {
      // You might want a global loading spinner here, or let individual components handle it.
      // For now, returning null until fully initialized or cache loaded.
      // Consider if children should render with partial data or wait.
  }


  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
};

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider. It might be that the context is not yet initialized.');
  }
  return context;
};

