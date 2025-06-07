"use client";

import type React from 'react';
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { PlannedMeal, ShoppingListItem, Recipe, MealType, Macros, MacroTargets } from '@/types';
import { loadState, saveState } from '@/lib/localStorage';
import { getRecipeById, calculateTotalMacros, generateShoppingList as generateShoppingListUtil } from '@/lib/data';

const MEAL_PLAN_KEY = 'macroTealMealPlan';
const SHOPPING_LIST_KEY = 'macroTealShoppingList';
const MACRO_TARGETS_KEY = 'macroTealMacroTargets';

interface AppContextType {
  mealPlan: PlannedMeal[];
  shoppingList: ShoppingListItem[];
  macroTargets: MacroTargets | null;
  addMealToPlan: (recipe: Recipe, date: string, mealType: MealType, servings: number) => void;
  removeMealFromPlan: (plannedMealId: string) => void;
  updatePlannedMealServings: (plannedMealId: string, newServings: number) => void;
  getDailyMacros: (date: string) => Macros;
  toggleShoppingListItem: (itemId: string) => void;
  clearMealPlanForDate: (date: string) => void;
  clearAllData: () => void;
  getMealsForDate: (date: string) => PlannedMeal[];
  setMacroTargets: (targets: MacroTargets) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mealPlan, setMealPlan] = useState<PlannedMeal[]>([]);
  const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>([]);
  const [macroTargets, setMacroTargetsState] = useState<MacroTargets | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const loadedMealPlan = loadState<PlannedMeal[]>(MEAL_PLAN_KEY) || [];
    const loadedShoppingList = loadState<ShoppingListItem[]>(SHOPPING_LIST_KEY) || [];
    const loadedMacroTargets = loadState<MacroTargets>(MACRO_TARGETS_KEY) || null;

    setMealPlan(loadedMealPlan.map(pm => ({...pm, recipeDetails: getRecipeById(pm.recipeId)})));
    setMacroTargetsState(loadedMacroTargets);

    if (loadedShoppingList.length === 0 && loadedMealPlan.length > 0) {
      setShoppingList(generateShoppingListUtil(loadedMealPlan));
    } else {
      setShoppingList(loadedShoppingList);
    }
    setIsInitialized(true);
  }, []);

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

  useEffect(() => {
    if (isInitialized) {
      saveState(MACRO_TARGETS_KEY, macroTargets);
    }
  }, [macroTargets, isInitialized]);
  
  const regenerateShoppingList = useCallback((currentMealPlan: PlannedMeal[]) => {
    const newShoppingList = generateShoppingListUtil(currentMealPlan);
    setShoppingList(newShoppingList);
  }, []);

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
    setMacroTargetsState(null);
  }, []);

  const setMacroTargets = useCallback((targets: MacroTargets) => {
    setMacroTargetsState(targets);
  }, []);

  const contextValue = useMemo(() => ({
    mealPlan,
    shoppingList,
    macroTargets,
    addMealToPlan,
    removeMealFromPlan,
    updatePlannedMealServings,
    getDailyMacros,
    toggleShoppingListItem,
    clearMealPlanForDate,
    clearAllData,
    getMealsForDate,
    setMacroTargets,
  }), [mealPlan, shoppingList, macroTargets, addMealToPlan, removeMealFromPlan, updatePlannedMealServings, getDailyMacros, toggleShoppingListItem, clearMealPlanForDate, clearAllData, getMealsForDate, setMacroTargets]);

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
};

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
