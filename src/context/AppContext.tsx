
"use client";

import React, { createContext, useContext, useMemo, useCallback, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { db } from '@/lib/firebase-client';
import {
  collection,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import {
  type PlannedMeal,
  type ShoppingListItem,
  type PantryItem,
  type Recipe,
  type MealType,
  type Macros,
  type UserProfileSettings,
  type RecipeFormData,
  type UKSupermarketCategory
} from '@/types';
import { calculateTotalMacros as calculateTotalMacrosUtil, generateShoppingList as generateShoppingListUtil, assignCategory as assignCategoryUtil } from '@/lib/data';
import { addOrUpdateMealPlan, deleteMealFromPlan, addOrUpdatePantryItem, deletePantryItem, addRecipe as addRecipeAction } from '@/app/(main)/profile/actions';

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
  toggleShoppingListItem: (itemId: string) => Promise<void>;
  addPantryItem: (name: string, quantity: number, unit: string, category: string, expiryDate?: string) => Promise<void>;
  removePantryItem: (itemId: string) => Promise<void>;
  updatePantryItemQuantity: (itemId: string, newQuantity: number) => Promise<void>;
  addCustomRecipe: (recipeData: RecipeFormData) => Promise<any>;
  assignIngredientCategory: (ingredientName: string) => UKSupermarketCategory;

  // Getters
  getConsumedMacrosForDate: (date: string) => Macros;
  getPlannedMacrosForDate: (date: string) => Macros;
  getMealsForDate: (date: string) => PlannedMeal[];
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { profile: userProfile, loading: profileLoading, error: profileError } = useUserProfile(user);
  const [userRecipes, setUserRecipes] = useState<Recipe[]>([]);
  const [builtInRecipes, setBuiltInRecipes] = useState<Recipe[]>([]);
  const [mealPlan, setMealPlan] = useState<PlannedMeal[]>([]);
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);
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
        const collections: {name: string, setter: React.Dispatch<any>}[] = [
            { name: "recipes", setter: setUserRecipes },
            { name: "planned_meals", setter: setMealPlan },
            { name: "pantry_items", setter: setPantryItems },
        ];
        
        collections.forEach(c => {
            const q = query(collection(db, c.name), where("user_id", "==", user.uid));
            unsubscribes.push(onSnapshot(q, (querySnapshot) => {
                const items = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                c.setter(items);
            }));
        });
    } else if (!isAuthLoading) {
        setUserRecipes([]);
        setMealPlan([]);
        setPantryItems([]);
    }

    return () => unsubscribes.forEach(unsub => unsub());
  }, [user?.uid, isAuthLoading]);
  
  const callServerActionWithAuth = async (action: (idToken: string, ...args: any[]) => Promise<any>, ...args: any[]) => {
    if (!user) {
      throw new Error('User not authenticated for server action.');
    }
  
    try {
      const idToken = await user.getIdToken(true);
      return await action(idToken, ...args);
    } catch (error: any) {
      console.error(`Error in callServerActionWithAuth for action "${action.name}":`, error);
      throw error;
    }
  };

  const addMealToPlan = useCallback(async (recipe: Recipe, date: string, mealType: MealType, servings: number) => {
    const newPlannedMeal: Partial<Omit<PlannedMeal, 'id' | 'user_id' | 'recipeDetails'>> = { 
      recipeId: recipe.id, 
      date, 
      mealType, 
      servings,
      status: 'planned',
    };
    await callServerActionWithAuth(addOrUpdateMealPlan, newPlannedMeal);
  }, [user]);
  
  const removeMealFromPlan = useCallback(async (plannedMealId: string) => {
    await callServerActionWithAuth(deleteMealFromPlan, plannedMealId);
  }, [user]);

  const updateMealServingsOrStatus = useCallback(async (plannedMealId: string, updates: Partial<Pick<PlannedMeal, 'servings' | 'status'>>) => {
      const meal = mealPlan.find(m => m.id === plannedMealId);
      if (!meal) throw new Error("Meal not found locally.");
      
      const { recipeDetails, ...restOfMeal } = meal;
      const updatedMealData = { ...restOfMeal, ...updates };

      await callServerActionWithAuth(addOrUpdateMealPlan, updatedMealData);
  }, [mealPlan, user]);
  
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
  }, [pantryItems, user]);

  const removePantryItem = useCallback(async (itemId: string) => {
    await callServerActionWithAuth(deletePantryItem, itemId);
  }, [user]);

  const updatePantryItemQuantity = useCallback(async (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      return removePantryItem(itemId);
    }
    const item = pantryItems.find(p => p.id === itemId);
    if (!item) throw new Error("Pantry item not found locally.");
    
    const { user_id, ...restOfItem } = item;
    const updatedItem = { ...restOfItem, quantity: newQuantity };
    await callServerActionWithAuth(addOrUpdatePantryItem, updatedItem);
  }, [pantryItems, removePantryItem, user]);
  
  const getConsumedMacrosForDate = useCallback((date: string): Macros => {
    return calculateTotalMacrosUtil(mealPlan?.filter(pm => pm.date === date && pm.status === 'eaten') || [], builtInRecipes.concat(userRecipes));
  }, [mealPlan, builtInRecipes, userRecipes]);
  
  const contextValue: AppContextType = useMemo(() => ({
    userProfile,
    userRecipes,
    mealPlan,
    pantryItems,
    isAppDataLoading: profileLoading,
    isRecipeCacheLoading,
    isOnline,
    allRecipesCache: Array.from(new Map([...builtInRecipes, ...userRecipes].map(recipe => [recipe.id, recipe])).values()),
    shoppingList: generateShoppingListUtil(mealPlan, [...builtInRecipes, ...userRecipes], pantryItems),
    
    getConsumedMacrosForDate,
    getPlannedMacrosForDate: (date: string) => calculateTotalMacrosUtil(mealPlan.filter(pm => pm.date === date), [...builtInRecipes, ...userRecipes]),
    getMealsForDate: (date: string) => mealPlan.filter(pm => pm.date === date).map(pm => ({ ...pm, recipeDetails: [...builtInRecipes, ...userRecipes].find(r => r.id === pm.recipeId) })),
    
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
    toggleShoppingListItem: async (itemId: string) => {
        console.warn("Toggling shopping list item is not implemented with Firestore yet.");
    },
    addPantryItem,
    removePantryItem,
    updatePantryItemQuantity,
    addCustomRecipe: (recipeData: RecipeFormData) => callServerActionWithAuth(addRecipeAction, recipeData),
    assignIngredientCategory: assignCategoryUtil,
  }), [
    userProfile, userRecipes, builtInRecipes, mealPlan, pantryItems, profileLoading, isRecipeCacheLoading, isOnline,
    addMealToPlan, removeMealFromPlan, updateMealServingsOrStatus, getConsumedMacrosForDate,
    addPantryItem, removePantryItem, updatePantryItemQuantity, user
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
