
"use client";

import type React from 'react';
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { PlannedMeal, ShoppingListItem, Recipe, MealType, Macros, MacroTargets, UserProfileSettings, MealSlotConfig } from '@/types';
import { loadState, saveState } from '@/lib/localStorage';
import { getRecipeById, calculateTotalMacros, generateShoppingList as generateShoppingListUtil, MEAL_TYPES } from '@/lib/data';

const MEAL_PLAN_KEY = 'macroTealMealPlan';
const SHOPPING_LIST_KEY = 'macroTealShoppingList';
const USER_PROFILE_KEY = 'macroTealUserProfile';

// Default meal structure
const DEFAULT_MEAL_STRUCTURE: MealSlotConfig[] = [
  { id: 'default-breakfast', name: 'Breakfast', type: 'Breakfast' },
  { id: 'default-lunch', name: 'Lunch', type: 'Lunch' },
  { id: 'default-dinner', name: 'Dinner', type: 'Dinner' },
  { id: 'default-snack1', name: 'Snack', type: 'Snack' },
];

interface AppContextType {
  mealPlan: PlannedMeal[];
  shoppingList: ShoppingListItem[];
  userProfile: UserProfileSettings | null;
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
  setMealStructure: (mealStructure: MealSlotConfig[]) => void; // Added
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mealPlan, setMealPlan] = useState<PlannedMeal[]>([]);
  const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfileSettings | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const loadedMealPlan = loadState<PlannedMeal[]>(MEAL_PLAN_KEY) || [];
    const loadedShoppingList = loadState<ShoppingListItem[]>(SHOPPING_LIST_KEY) || [];
    const loadedUserProfile = loadState<UserProfileSettings>(USER_PROFILE_KEY) || {
      macroTargets: null,
      dietaryPreferences: [],
      allergens: [],
      mealStructure: DEFAULT_MEAL_STRUCTURE, // Initialize with default
    };
    // Ensure mealStructure exists, if loading from older state
    if (!loadedUserProfile.mealStructure) {
        loadedUserProfile.mealStructure = DEFAULT_MEAL_STRUCTURE;
    }


    const populatedMealPlan = loadedMealPlan.map(pm => {
      const recipeDetails = getRecipeById(pm.recipeId);
      return {...pm, recipeDetails: recipeDetails || undefined };
    });
    setMealPlan(populatedMealPlan);
    
    setUserProfile(loadedUserProfile);

    if (loadedShoppingList.length === 0 && populatedMealPlan.length > 0) {
      setShoppingList(generateShoppingListUtil(populatedMealPlan));
    } else {
      setShoppingList(loadedShoppingList);
    }
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    if (isInitialized && userProfile) { // Check userProfile is not null
      saveState(USER_PROFILE_KEY, userProfile);
    }
  }, [userProfile, isInitialized]);
  
  // Save mealPlan and shoppingList separately as before
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
    const newShoppingList = generateShoppingListUtil(currentMealPlan);
    setShoppingList(newShoppingList);
  }, []);

  const addMealToPlan = useCallback((recipe: Recipe, date: string, mealType: MealType, servings: number) => {
    const newPlannedMeal: PlannedMeal = {
      id: `${recipe.id}-${date}-${mealType}-${Date.now()}`, // Ensure mealType is part of ID for uniqueness if user adds same recipe as different meal types
      recipeId: recipe.id,
      date,
      mealType, // This mealType refers to the general category selected during planning
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
    return calculateTotalMacros(dailyMeals);
  }, [mealPlan]);

  const getMealsForDate = useCallback((date: string): PlannedMeal[] => {
    return mealPlan.filter(pm => pm.date === date).map(pm => ({
      ...pm,
      recipeDetails: pm.recipeDetails || getRecipeById(pm.recipeId)
    }));
  }, [mealPlan]);

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
    setUserProfile({ 
      macroTargets: null, 
      dietaryPreferences: [], 
      allergens: [],
      mealStructure: DEFAULT_MEAL_STRUCTURE, // Reset to default
    });
  }, []);

  const updateUserProfileState = useCallback((updates: Partial<UserProfileSettings>) => {
    setUserProfile(prev => ({
      ...(prev || { macroTargets: null, dietaryPreferences: [], allergens: [], mealStructure: DEFAULT_MEAL_STRUCTURE }),
      ...updates,
    }));
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

  const contextValue = useMemo(() => ({
    mealPlan,
    shoppingList,
    userProfile,
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
    setMealStructure, // Added
  }), [
    mealPlan, shoppingList, userProfile, addMealToPlan, removeMealFromPlan, 
    updatePlannedMealServings, getDailyMacros, toggleShoppingListItem, 
    clearMealPlanForDate, clearAllData, getMealsForDate, setMacroTargets,
    setDietaryPreferences, setAllergens, setMealStructure // Added
  ]);

  if (!isInitialized) {
    // Potentially return a loading state or null if preferred, 
    // to avoid consumers using the context before it's ready
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
