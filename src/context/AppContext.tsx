
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
  name: null,
  email: null,
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
  neckCircumferenceCm: null,
  abdomenCircumferenceCm: null,
  waistCircumferenceCm: null,
  hipCircumferenceCm: null,
  subscription_status: 'active',
  plan_name: null,
  subscription_start_date: null,
  subscription_end_date: null,
  subscription_duration: null,
};

// Helper function to calculate Navy Body Fat Percentage
const calculateNavyBodyFatPercentage = (
  sex: Sex | null,
  heightCm: number | null,
  neckCm: number | null,
  abdomenCm?: number | null,
  waistCm?: number | null,
  hipCm?: number | null
): number | null => {
  if (!sex || !heightCm || heightCm <= 0 || !neckCm || neckCm <= 0) {
    return null;
  }

  try {
    if (sex === 'male') {
      if (!abdomenCm || abdomenCm <= 0 || abdomenCm <= neckCm) {
        return null;
      }
      const bf = 86.010 * Math.log10(abdomenCm - neckCm) - 70.041 * Math.log10(heightCm) + 36.76;
      return Math.max(1, Math.min(100, parseFloat(bf.toFixed(1))));
    } else if (sex === 'female') {
      if (!waistCm || waistCm <= 0 || !hipCm || hipCm <= 0) {
        return null;
      }
      const waistPlusHipMinusNeck = waistCm + hipCm - neckCm;
      if (waistPlusHipMinusNeck <= 0) {
        return null;
      }
      const bf = 163.205 * Math.log10(waistPlusHipMinusNeck) - 97.684 * Math.log10(heightCm) - 78.387;
      return Math.max(1, Math.min(100, parseFloat(bf.toFixed(1))));
    }
  } catch (error) {
    console.error("Error calculating Navy Body Fat %:", error);
    return null;
  }
  return null;
};


const calculateLBM = (weightKg: number | null, bodyFatPercentage: number | null): number | null => {
  if (weightKg && bodyFatPercentage && bodyFatPercentage > 0 && bodyFatPercentage < 100) {
    const lbm = weightKg * (1 - bodyFatPercentage / 100);
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
        loadedUserProfile = { ...DEFAULT_USER_PROFILE };
      } else {
        loadedUserProfile = { ...DEFAULT_USER_PROFILE, ...loadedUserProfile };
      }

      // Ensure all fields from DEFAULT_USER_PROFILE are present
      for (const key in DEFAULT_USER_PROFILE) {
        if (loadedUserProfile[key as keyof UserProfileSettings] === undefined) {
          loadedUserProfile[key as keyof UserProfileSettings] = DEFAULT_USER_PROFILE[key as keyof UserProfileSettings];
        }
      }
      
      // Initial calculation of derived values if necessary
      let initialBFP = loadedUserProfile.bodyFatPercentage;
      if (initialBFP === null) {
        initialBFP = calculateNavyBodyFatPercentage(
          loadedUserProfile.sex,
          loadedUserProfile.heightCm,
          loadedUserProfile.neckCircumferenceCm,
          loadedUserProfile.abdomenCircumferenceCm,
          loadedUserProfile.waistCircumferenceCm,
          loadedUserProfile.hipCircumferenceCm
        );
      }
      loadedUserProfile.bodyFatPercentage = initialBFP;
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
    if (allRecipesCache.length > 0 && mealPlan.length > 0 && isInitialized) {
      let madeAChange = false;
      const updatedMealPlan = mealPlan.map(pm => {
        if (!pm.recipeDetails) {
          const recipeDetails = allRecipesCache.find(r => r.id === pm.recipeId);
          if (recipeDetails) {
            madeAChange = true;
            return { ...pm, recipeDetails };
          }
        }
        return pm;
      });

      if (madeAChange) {
        setMealPlan(updatedMealPlan);
      }
    }
  }, [allRecipesCache, mealPlan, isInitialized]);


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
    setUserProfile({ ...DEFAULT_USER_PROFILE });
  }, []);

  const updateUserProfileState = useCallback((updates: Partial<UserProfileSettings>) => {
    setUserProfile(prevProfile => {
      const currentProfile = prevProfile || { ...DEFAULT_USER_PROFILE };
      let newProfileData = { ...currentProfile, ...updates };

      let finalBodyFatPercentage = newProfileData.bodyFatPercentage;

      // If bodyFatPercentage was part of this specific update (e.g., user typed it or calc button set it), use that.
      // Otherwise, if it's null, try to calculate it using Navy measurements.
      if (updates.bodyFatPercentage !== undefined) {
        finalBodyFatPercentage = updates.bodyFatPercentage;
      } else if (finalBodyFatPercentage === null) {
        const navyBFP = calculateNavyBodyFatPercentage(
            newProfileData.sex,
            newProfileData.heightCm,
            newProfileData.neckCircumferenceCm,
            newProfileData.abdomenCircumferenceCm,
            newProfileData.waistCircumferenceCm,
            newProfileData.hipCircumferenceCm
        );
        if (navyBFP !== null) {
            finalBodyFatPercentage = navyBFP;
        }
      }
      
      newProfileData.bodyFatPercentage = finalBodyFatPercentage;

      newProfileData.leanBodyMassKg = calculateLBM(
        newProfileData.weightKg,
        newProfileData.bodyFatPercentage
      );
      newProfileData.tdee = calculateTDEE(
        newProfileData.weightKg,
        newProfileData.heightCm,
        newProfileData.age,
        newProfileData.sex,
        newProfileData.activityLevel
      );
      return newProfileData;
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

  if (!isInitialized && !isRecipeCacheLoading) {
    return null;
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
