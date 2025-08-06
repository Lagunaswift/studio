// src/context/OptimizedAppContext.tsx
"use client";

import React, { createContext, useContext, useMemo, useCallback, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useOptimizedProfile, useOptimizedRecipes } from '@/hooks/useOptimizedFirestore';
import { db } from '@/lib/firebase-client';
import { collection, onSnapshot, query, where } from "firebase/firestore";
import type { PlannedMeal, ShoppingListItem, PantryItem, Recipe, MealType, Macros, UserProfileSettings, RecipeFormData, UKSupermarketCategory } from '@/types';
import { calculateTotalMacros as calculateTotalMacrosUtil, generateShoppingList as generateShoppingListUtil, assignCategory as assignCategoryUtil } from '@/lib/data';
import { addOrUpdateMealPlan, deleteMealFromPlan, addOrUpdatePantryItem, deletePantryItem, addRecipe as addRecipeAction } from '@/app/(main)/profile/actions';

interface OptimizedAppContextType {
  userProfile: UserProfileSettings | null;
  allRecipesCache: Recipe[];
  mealPlan: PlannedMeal[];
  pantryItems: PantryItem[];
  isAppDataLoading: boolean;
  isRecipeCacheLoading: boolean;
  shoppingList: ShoppingListItem[];
  // Re-add your essential functions here
  addMealToPlan: (recipe: Recipe, date: string, mealType: MealType, servings: number) => Promise<void>;
  removeMealFromPlan: (plannedMealId: string) => Promise<void>;
  getConsumedMacrosForDate: (date: string) => Macros;
}

const OptimizedAppContext = createContext<OptimizedAppContextType | undefined>(undefined);

export const OptimizedAppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { profile: userProfile, loading: profileLoading } = useOptimizedProfile(user?.uid);
  const { recipes: allRecipesCache, loading: recipesLoading } = useOptimizedRecipes(user?.uid);
  
  const [mealPlan, setMealPlan] = useState<PlannedMeal[]>([]);
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);

  // Real-time listeners for critical, frequently updated data
  useEffect(() => {
    if (!user?.uid) {
        setMealPlan([]);
        setPantryItems([]);
        return;
    }

    const mealPlanQuery = query(collection(db, `profiles/${user.uid}/mealPlan`));
    const pantryQuery = query(collection(db, `profiles/${user.uid}/pantry`));
    
    const unsubMealPlan = onSnapshot(mealPlanQuery, (snapshot) => {
        const meals = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PlannedMeal));
        setMealPlan(meals);
    });

    const unsubPantry = onSnapshot(pantryQuery, (snapshot) => {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PantryItem));
        setPantryItems(items);
    });

    return () => {
        unsubMealPlan();
        unsubPantry();
    };
  }, [user?.uid]);
  
  const callServerActionWithAuth = async (action: (idToken: string, ...args: any[]) => Promise<any>, ...args: any[]) => {
    if (!user) throw new Error('User not authenticated');
    const idToken = await user.getIdToken(true);
    return action(idToken, ...args);
  };
  
  const addMealToPlan = useCallback(async (recipe: Recipe, date: string, mealType: MealType, servings: number) => {
    const newMeal = { recipeId: recipe.id, date, mealType, servings, status: 'planned' };
    await callServerActionWithAuth(addOrUpdateMealPlan, newMeal);
  }, [user]);
  
  const removeMealFromPlan = useCallback(async (mealId: string) => {
    await callServerActionWithAuth(deleteMealFromPlan, mealId);
  }, [user]);

  const getConsumedMacrosForDate = useCallback((date: string): Macros => {
    const meals = mealPlan.filter(pm => pm.date === date && pm.status === 'eaten');
    return calculateTotalMacrosUtil(meals, allRecipesCache);
  }, [mealPlan, allRecipesCache]);

  const shoppingList = useMemo(() => {
    return generateShoppingListUtil(mealPlan, allRecipesCache, pantryItems);
  }, [mealPlan, allRecipesCache, pantryItems]);


  const contextValue = useMemo(() => ({
    userProfile,
    allRecipesCache,
    mealPlan,
    pantryItems,
    isAppDataLoading: profileLoading,
    isRecipeCacheLoading: recipesLoading,
    shoppingList,
    addMealToPlan,
    removeMealFromPlan,
    getConsumedMacrosForDate,
  }), [userProfile, allRecipesCache, mealPlan, pantryItems, profileLoading, recipesLoading, shoppingList, addMealToPlan, removeMealFromPlan, getConsumedMacrosForDate]);

  return (
    <OptimizedAppContext.Provider value={contextValue}>
      {children}
    </OptimizedAppContext.Provider>
  );
};

export const useOptimizedAppContext = () => {
  const context = useContext(OptimizedAppContext);
  if (context === undefined) {
    throw new Error('useOptimizedAppContext must be used within OptimizedAppProvider');
  }
  return context;
};
