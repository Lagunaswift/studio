
"use client";

import React, { createContext, useContext, useEffect, useMemo, useCallback, useState } from 'react';
import { useAuth } from './AuthContext';
import {
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
} from '@/types';
import { ACTIVITY_LEVEL_OPTIONS } from '@/types';
import { getAllRecipes as getAllRecipesFromDataFile, calculateTotalMacros as calculateTotalMacrosUtil, generateShoppingList as generateShoppingListUtil, parseIngredientString as parseIngredientStringUtil, assignCategory as assignCategoryUtil, calculateTrendWeight } from '@/lib/data';
import { runPreppy, type PreppyInput, type PreppyOutput } from '@/ai/flows/pro-coach-flow';
import { format, subDays, differenceInDays } from 'date-fns';
import { supabase } from '@/lib/supabaseClient';
import { loadState, saveState } from '@/lib/localStorage';

// Helper to determine if we should use Supabase or fallback to local storage
const isOnlineMode = () => process.env.NEXT_PUBLIC_SERVICE_STATUS === 'online';

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

const processProfile = (profileData: UserProfileSettings): UserProfileSettings => {
    const p = { ...profileData };
    p.tdee = calculateTDEE(p.weightKg, p.heightCm, p.age, p.sex, p.activityLevel);
    p.leanBodyMassKg = calculateLBM(p.weightKg, p.bodyFatPercentage);
    p.rda = getRdaProfile(p.sex, p.age);
    return p;
};


interface AppContextType {
  // State
  mealPlan: PlannedMeal[];
  shoppingList: ShoppingListItem[];
  pantryItems: PantryItem[];
  userProfile: UserProfileSettings | null;
  userRecipes: Recipe[];
  allRecipesCache: Recipe[];
  favoriteRecipeIds: number[];
  dailyWeightLog: DailyWeightLog[];
  dailyVitalsLog: DailyVitalsLog[];
  dailyManualMacrosLog: DailyManualMacrosLog[];
  
  // Loaders
  isRecipeCacheLoading: boolean;
  isAppDataLoading: boolean;

  // Actions
  addMealToPlan: (recipe: Recipe, date: string, mealType: MealType, servings: number) => Promise<void>;
  removeMealFromPlan: (plannedMealId: string) => Promise<void>;
  updatePlannedMealServings: (plannedMealId: string, newServings: number) => Promise<void>;
  updateMealStatus: (plannedMealId: string, status: 'planned' | 'eaten') => Promise<void>;
  logWeight: (date: string, weightKg: number) => Promise<void>;
  logVitals: (date: string, vitals: Omit<DailyVitalsLog, 'date' | 'id' | 'user_id' | 'created_at'>) => Promise<void>;
  logManualMacros: (date: string, macros: Macros) => Promise<void>;
  toggleShoppingListItem: (itemId: string) => Promise<void>;
  clearMealPlanForDate: (date: string) => Promise<void>;
  clearEntireMealPlan: () => Promise<void>;
  toggleFavoriteRecipe: (recipeId: number) => Promise<void>;
  addPantryItem: (name: string, quantity: number, unit: string, category: string, expiryDate?: string) => Promise<void>;
  removePantryItem: (itemId: string) => Promise<void>;
  updatePantryItemQuantity: (itemId: string, newQuantity: number) => Promise<void>;
  addCustomRecipe: (recipeData: RecipeFormData) => Promise<void>;
  runWeeklyCheckin: () => Promise<{ success: boolean; message: string; recommendation?: PreppyOutput | null }>;
  setUserInformation: (updates: Partial<UserProfileSettings>) => Promise<void>;
  setMacroTargets: (targets: Macros) => Promise<void>;
  setDietaryPreferences: (preferences: string[]) => Promise<void>;
  setAllergens: (allergens: string[]) => Promise<void>;
  setMealStructure: (structure: MealSlotConfig[]) => Promise<void>;
  setDashboardSettings: (settings: Partial<DashboardSettings>) => Promise<void>;

  // Getters
  getConsumedMacrosForDate: (date: string) => Macros;
  getPlannedMacrosForDate: (date: string) => Macros;
  getMealsForDate: (date: string) => PlannedMeal[];
  isRecipeFavorite: (recipeId: number) => boolean;
  parseIngredient: (ingredientString: string) => { name: string; quantity: number; unit: string };
  assignIngredientCategory: (ingredientName: string) => string;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile: authProfile, isLoading: isAuthLoading, updateUserProfileInDb } = useAuth();
  
  const [userProfile, setUserProfile] = useState<UserProfileSettings | null>(null);
  const { 
    mealPlan, pantryItems, userRecipes, favoriteRecipeIds, 
    dailyWeightLog, dailyVitalsLog, dailyManualMacrosLog, 
    setMealPlan, setPantryItems, setUserRecipes, setFavoriteRecipeIds,
    setDailyWeightLog, setDailyVitalsLog, setDailyManualMacrosLog
  } = useAppData(user?.id, isAuthLoading);

  const [staticRecipes, setStaticRecipes] = useState<Recipe[]>([]);
  const [isRecipeCacheLoading, setIsRecipeCacheLoading] = useState(true);
  
  const isAppDataLoading = isAuthLoading || isRecipeCacheLoading;
  
  const allRecipesCache = useMemo(() => {
    const combined = [...staticRecipes, ...userRecipes];
    const uniqueRecipes = Array.from(new Map(combined.map(recipe => [recipe.id, recipe])).values());
    return uniqueRecipes;
  }, [staticRecipes, userRecipes]);
  
  const shoppingList = useMemo(() => {
     if (isAppDataLoading) return [];
     return generateShoppingListUtil(mealPlan, allRecipesCache, pantryItems);
  }, [mealPlan, pantryItems, allRecipesCache, isAppDataLoading]);

  useEffect(() => {
    getAllRecipesFromDataFile().then(recipes => {
      setStaticRecipes(recipes);
      setIsRecipeCacheLoading(false);
    });
  }, []);

  useEffect(() => {
    if (isOnlineMode()) {
        if (authProfile) {
            setUserProfile(processProfile(authProfile));
        } else if (!isAuthLoading) {
            setUserProfile(null);
        }
    } else if (!isAuthLoading) {
        const localProfile = loadState<UserProfileSettings>('userProfile');
        if (localProfile) {
            setUserProfile(processProfile(localProfile));
        } else {
             setUserProfile({
                macroTargets: { calories: 2000, protein: 150, carbs: 200, fat: 60 },
                dietaryPreferences: [],
                allergens: [],
                mealStructure: [
                    { id: '1', name: 'Breakfast', type: 'Breakfast' },
                    { id: '2', name: 'Lunch', type: 'Lunch' },
                    { id: '3', name: 'Dinner', type: 'Dinner' },
                    { id: '4', name: 'Snack', type: 'Snack' },
                ],
                hasAcceptedTerms: false,
             } as UserProfileSettings);
        }
    }
  }, [authProfile, isAuthLoading]);
  
  const setUserInformation = useCallback(async (updates: Partial<UserProfileSettings>) => {
    const newProfile = { ...(userProfile || {}), ...updates } as UserProfileSettings;
    const processed = processProfile(newProfile);
    setUserProfile(processed);
    if (isOnlineMode()) {
        await updateUserProfileInDb(updates);
    } else {
        saveState('userProfile', processed);
    }
  }, [userProfile, updateUserProfileInDb]);
  
  const setMacroTargets = useCallback(async (targets: Macros) => {
    await setUserInformation({ macroTargets: targets });
  }, [setUserInformation]);

  const setDietaryPreferences = useCallback(async (preferences: string[]) => {
    await setUserInformation({ dietaryPreferences: preferences });
  }, [setUserInformation]);

  const setAllergens = useCallback(async (allergens: string[]) => {
    await setUserInformation({ allergens });
  }, [setUserInformation]);

  const setMealStructure = useCallback(async (structure: MealSlotConfig[]) => {
    await setUserInformation({ mealStructure: structure });
  }, [setUserInformation]);
  
  const setDashboardSettings = useCallback(async (settings: Partial<DashboardSettings>) => {
    const newSettings = { ...(userProfile?.dashboardSettings || {}), ...settings };
    await setUserInformation({ dashboardSettings: newSettings });
  }, [userProfile, setUserInformation]);

  const addMealToPlan = useCallback(async (recipe: Recipe, date: string, mealType: MealType, servings: number) => {
    const newPlannedMeal = { 
      id: `meal_${Date.now()}`,
      recipeId: recipe.id, 
      date, 
      mealType, 
      servings,
      status: 'planned' as 'planned' | 'eaten',
    };

    if (isOnlineMode() && user) {
        try {
            const { data, error } = await supabase.from('planned_meals').insert({
                user_id: user.id, recipe_id: recipe.id, date, meal_type: mealType, servings, status: 'planned'
            }).select().single();
            if (error) throw error;
            if (data) setMealPlan(prev => [...prev, data as PlannedMeal]);
        } catch (e) {
            console.error("Supabase failed. Falling back to local storage.", e);
            setMealPlan(prev => {
                const newState = [...prev, newPlannedMeal];
                saveState('mealPlan', newState);
                return newState;
            });
        }
    } else {
        setMealPlan(prev => {
            const newState = [...prev, newPlannedMeal];
            saveState('mealPlan', newState);
            return newState;
        });
    }
  }, [user, setMealPlan]);

  const removeMealFromPlan = useCallback(async (plannedMealId: string) => {
    if (isOnlineMode() && user) {
        try {
            const { error } = await supabase.from('planned_meals').delete().eq('id', plannedMealId).eq('user_id', user.id);
            if (error) throw error;
            setMealPlan(prev => prev.filter(pm => pm.id !== plannedMealId));
        } catch (e) {
            console.error("Supabase failed. Falling back to local storage.", e);
            setMealPlan(prev => {
                const newState = prev.filter(pm => pm.id !== plannedMealId);
                saveState('mealPlan', newState);
                return newState;
            });
        }
    } else {
        setMealPlan(prev => {
            const newState = prev.filter(pm => pm.id !== plannedMealId);
            saveState('mealPlan', newState);
            return newState;
        });
    }
  }, [user, setMealPlan]);

  const updatePlannedMealServings = useCallback(async (plannedMealId: string, newServings: number) => {
     if (isOnlineMode() && user) {
        try {
            const { data, error } = await supabase.from('planned_meals').update({ servings: newServings }).eq('id', plannedMealId).select().single();
            if (error) throw error;
            if (data) setMealPlan(prev => prev.map(pm => pm.id === plannedMealId ? data as PlannedMeal : pm));
        } catch (e) {
             console.error("Supabase failed. Falling back to local storage.", e);
             setMealPlan(prev => {
                const newState = prev.map(pm => pm.id === plannedMealId ? { ...pm, servings: newServings } : pm);
                saveState('mealPlan', newState);
                return newState;
             });
        }
    } else {
         setMealPlan(prev => {
            const newState = prev.map(pm => pm.id === plannedMealId ? { ...pm, servings: newServings } : pm);
            saveState('mealPlan', newState);
            return newState;
         });
    }
  }, [user, setMealPlan]);

  const updateMealStatus = useCallback(async (plannedMealId: string, status: 'planned' | 'eaten') => {
    if (isOnlineMode() && user) {
        try {
            const { data, error } = await supabase.from('planned_meals').update({ status }).eq('id', plannedMealId).select().single();
            if (error) throw error;
            if (data) setMealPlan(prev => prev.map(pm => pm.id === plannedMealId ? data as PlannedMeal : pm));
        } catch (e) {
            console.error("Supabase failed. Falling back to local storage.", e);
            setMealPlan(prev => {
                const newState = prev.map(pm => pm.id === plannedMealId ? { ...pm, status } : pm);
                saveState('mealPlan', newState);
                return newState;
            });
        }
    } else {
        setMealPlan(prev => {
            const newState = prev.map(pm => pm.id === plannedMealId ? { ...pm, status } : pm);
            saveState('mealPlan', newState);
            return newState;
        });
    }
  }, [user, setMealPlan]);

  const clearMealPlanForDate = useCallback(async (date: string) => {
    if (isOnlineMode() && user) {
        try {
            const { error } = await supabase.from('planned_meals').delete().eq('user_id', user.id).eq('date', date);
            if (error) throw error;
            setMealPlan(prev => prev.filter(pm => pm.date !== date));
        } catch (e) {
             console.error("Supabase failed. Falling back to local storage.", e);
             setMealPlan(prev => {
                const newState = prev.filter(pm => pm.date !== date);
                saveState('mealPlan', newState);
                return newState;
             });
        }
    } else {
        setMealPlan(prev => {
            const newState = prev.filter(pm => pm.date !== date);
            saveState('mealPlan', newState);
            return newState;
        });
    }
  }, [user, setMealPlan]);

  const clearEntireMealPlan = useCallback(async () => {
    if (isOnlineMode() && user) {
        try {
            const { error } = await supabase.from('planned_meals').delete().eq('user_id', user.id);
            if (error) throw error;
            setMealPlan([]);
        } catch (e) {
            console.error("Supabase failed. Falling back to local storage.", e);
            setMealPlan([]);
            saveState('mealPlan', []);
        }
    } else {
        setMealPlan([]);
        saveState('mealPlan', []);
    }
  }, [user, setMealPlan]);
  
  const toggleFavoriteRecipe = useCallback(async (recipeId: number) => {
    const isCurrentlyFavorite = favoriteRecipeIds.includes(recipeId);
    
    if (isOnlineMode() && user) {
        try {
            if (isCurrentlyFavorite) {
                const { error } = await supabase.from('favorite_recipes').delete().eq('user_id', user.id).eq('recipe_id', recipeId);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('favorite_recipes').insert({ user_id: user.id, recipe_id: recipeId });
                if (error) throw error;
            }
        } catch(e) {
            console.error("Supabase failed. Cannot update favorite.", e);
            return; 
        }
    }
    
    const newFavoriteIds = isCurrentlyFavorite ? favoriteRecipeIds.filter(id => id !== recipeId) : [...favoriteRecipeIds, recipeId];
    setFavoriteRecipeIds(newFavoriteIds);
    if (!isOnlineMode()) {
        saveState('favoriteRecipeIds', newFavoriteIds);
    }
  }, [user, favoriteRecipeIds, setFavoriteRecipeIds]);
  
  const isRecipeFavorite = useCallback((recipeId: number): boolean => favoriteRecipeIds.includes(recipeId), [favoriteRecipeIds]);

  const addPantryItem = useCallback(async (name: string, quantity: number, unit: string, category: string, expiryDate?: string) => {
    const newItem = {
        id: `pantry_${Date.now()}`,
        name, quantity, unit, category, expiryDate,
    };

    if (isOnlineMode() && user) {
        try {
            const existingItem = pantryItems.find(p => p.name.toLowerCase() === name.toLowerCase() && p.unit === unit);
            if (existingItem) {
                const newQuantity = existingItem.quantity + quantity;
                const { data, error } = await supabase.from('pantry_items').update({ quantity: newQuantity, expiry_date: expiryDate }).eq('id', existingItem.id).select().single();
                if (error) throw error;
                if(data) setPantryItems(prev => prev.map(p => p.id === existingItem.id ? data : p));
            } else {
                const { data, error } = await supabase.from('pantry_items').insert({ ...newItem, user_id: user.id, item_name: name, expiration_date: expiryDate }).select().single();
                if (error) throw error;
                if (data) setPantryItems(prev => [...prev, data]);
            }
        } catch (e) {
            console.error("Supabase failed. Falling back to local storage.", e);
            setPantryItems(prev => {
                const existing = prev.find(p => p.name.toLowerCase() === name.toLowerCase() && p.unit === unit);
                const newState = existing ? prev.map(p => p.id === existing.id ? { ...p, quantity: p.quantity + quantity } : p) : [...prev, newItem];
                saveState('pantryItems', newState);
                return newState;
            });
        }
    } else {
        setPantryItems(prev => {
            const existing = prev.find(p => p.name.toLowerCase() === name.toLowerCase() && p.unit === unit);
            const newState = existing ? prev.map(p => p.id === existing.id ? { ...p, quantity: p.quantity + quantity } : p) : [...prev, newItem];
            saveState('pantryItems', newState);
            return newState;
        });
    }
  }, [user, pantryItems, setPantryItems]);


  const removePantryItem = useCallback(async (itemId: string) => {
    if (isOnlineMode() && user) {
        try {
            const { error } = await supabase.from('pantry_items').delete().eq('id', itemId);
            if (error) throw error;
            setPantryItems(prev => prev.filter(p => p.id !== itemId));
        } catch (e) {
            console.error("Supabase failed. Falling back to local storage.", e);
            setPantryItems(prev => {
                const newState = prev.filter(p => p.id !== itemId);
                saveState('pantryItems', newState);
                return newState;
            });
        }
    } else {
        setPantryItems(prev => {
            const newState = prev.filter(p => p.id !== itemId);
            saveState('pantryItems', newState);
            return newState;
        });
    }
  }, [user, setPantryItems]);

  const updatePantryItemQuantity = useCallback(async (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      await removePantryItem(itemId);
      return;
    }
    if (isOnlineMode() && user) {
        try {
            const { data, error } = await supabase.from('pantry_items').update({ quantity: newQuantity }).eq('id', itemId).select().single();
            if (error) throw error;
            if (data) setPantryItems(prev => prev.map(p => p.id === itemId ? data : p));
        } catch(e) {
            console.error("Supabase failed. Falling back to local storage.", e);
            setPantryItems(prev => {
                const newState = prev.map(p => p.id === itemId ? { ...p, quantity: newQuantity } : p);
                saveState('pantryItems', newState);
                return newState;
            });
        }
    } else {
        setPantryItems(prev => {
            const newState = prev.map(p => p.id === itemId ? { ...p, quantity: newQuantity } : p);
            saveState('pantryItems', newState);
            return newState;
        });
    }
  }, [user, removePantryItem, setPantryItems]);
  
  const addCustomRecipe = useCallback(async (recipeData: RecipeFormData) => {
    const localId = Date.now();
    const recipeBase = {
        name: recipeData.name,
        description: recipeData.description,
        image: recipeData.image || `https://placehold.co/600x400.png?text=${encodeURIComponent(recipeData.name)}`,
        servings: recipeData.servings,
        prepTime: recipeData.prepTime,
        cookTime: recipeData.cookTime,
        chillTime: recipeData.chillTime,
        ingredients: recipeData.ingredients.map(ing => ing.value),
        macrosPerServing: { calories: recipeData.calories, protein: recipeData.protein, carbs: recipeData.carbs, fat: recipeData.fat },
        instructions: recipeData.instructions.map(inst => inst.value),
        tags: recipeData.tags,
        isCustom: true,
    };
    
    if (isOnlineMode() && user) {
        try {
            const { data: newRecipeData, error } = await supabase.from('user_recipes').insert({ ...recipeBase, user_id: user.id }).select().single();
            if(error) throw error;
            if(newRecipeData) setUserRecipes(prev => [...prev, newRecipeData]);
        } catch(e) {
             console.error("Supabase failed. Falling back to local storage.", e);
             setUserRecipes(prev => {
                const newState = [...prev, { ...recipeBase, id: localId }];
                saveState('userRecipes', newState);
                return newState;
            });
        }
    } else {
        setUserRecipes(prev => {
            const newState = [...prev, { ...recipeBase, id: localId }];
            saveState('userRecipes', newState);
            return newState;
        });
    }
  }, [user, setUserRecipes]);

  const logWeight = useCallback(async (date: string, weightKg: number) => {
    if (isOnlineMode() && user) {
        try {
            const { error: deleteError } = await supabase.from('daily_weight_logs').delete().match({ user_id: user.id, date });
            if (deleteError) console.error('Error clearing old weight log:', deleteError);
            const { data, error } = await supabase.from('daily_weight_logs').insert({ user_id: user.id, date, weight_kg: weightKg }).select().single();
            if (error) throw error;
            setDailyWeightLog(prev => [...prev.filter(log => log.date !== date), data]);
        } catch (e) {
            console.error("Supabase failed. Falling back to local storage.", e);
            const newLog = { date, weightKg };
            setDailyWeightLog(prev => {
                const newState = [...prev.filter(l => l.date !== date), newLog];
                saveState('dailyWeightLog', newState);
                return newState;
            });
        }
    } else {
        const newLog = { date, weightKg };
        setDailyWeightLog(prev => {
            const newState = [...prev.filter(l => l.date !== date), newLog];
            saveState('dailyWeightLog', newState);
            return newState;
        });
    }
    await setUserInformation({ weightKg });
  }, [user, setDailyWeightLog, setUserInformation]);

  const logVitals = useCallback(async (date: string, vitals: Omit<DailyVitalsLog, 'date' | 'id' | 'user_id' | 'created_at'>) => {
    if (isOnlineMode() && user) {
        try {
            const { error: deleteError } = await supabase.from('daily_vitals_logs').delete().match({ user_id: user.id, date });
            if (deleteError) console.error('Error clearing old vitals log:', deleteError);
            const { data, error } = await supabase.from('daily_vitals_logs').insert({ user_id: user.id, date, ...vitals }).select().single();
            if (error) throw error;
            setDailyVitalsLog(prev => [...prev.filter(log => log.date !== date), data]);
        } catch (e) {
            console.error("Supabase failed. Falling back to local storage.", e);
            const newLog = { date, ...vitals };
            setDailyVitalsLog(prev => {
                const newState = [...prev.filter(l => l.date !== date), newLog];
                saveState('dailyVitalsLog', newState);
                return newState;
            });
        }
    } else {
        const newLog = { date, ...vitals };
        setDailyVitalsLog(prev => {
            const newState = [...prev.filter(l => l.date !== date), newLog];
            saveState('dailyVitalsLog', newState);
            return newState;
        });
    }
  }, [user, setDailyVitalsLog]);
  
  const logManualMacros = useCallback(async (date: string, macros: Macros) => {
    if (isOnlineMode() && user) {
        try {
            const { error: deleteError } = await supabase.from('daily_manual_macros_logs').delete().match({ user_id: user.id, date });
            if (deleteError) console.error('Error clearing old manual macros log:', deleteError);
            const { data, error } = await supabase.from('daily_manual_macros_logs').insert({ user_id: user.id, date, macros }).select().single();
            if (error) throw error;
            setDailyManualMacrosLog(prev => [...prev.filter(log => log.date !== date), data]);
        } catch(e) {
             console.error("Supabase failed. Falling back to local storage.", e);
             const newLog = { date, macros };
             setDailyManualMacrosLog(prev => {
                const newState = [...prev.filter(l => l.date !== date), newLog];
                saveState('dailyManualMacrosLog', newState);
                return newState;
            });
        }
    } else {
        const newLog = { date, macros };
        setDailyManualMacrosLog(prev => {
            const newState = [...prev.filter(l => l.date !== date), newLog];
            saveState('dailyManualMacrosLog', newState);
            return newState;
        });
    }
  }, [user, setDailyManualMacrosLog]);

  const getConsumedMacrosForDate = useCallback((date: string): Macros => {
    const manualLog = dailyManualMacrosLog.find(log => log.date === date);
    if (manualLog) {
      return manualLog.macros;
    }
    return calculateTotalMacrosUtil(mealPlan.filter(pm => pm.date === date && pm.status === 'eaten'), allRecipesCache);
  }, [mealPlan, allRecipesCache, dailyManualMacrosLog]);
  
  const getPlannedMacrosForDate = useCallback((date: string): Macros => calculateTotalMacrosUtil(mealPlan.filter(pm => pm.date === date), allRecipesCache), [mealPlan, allRecipesCache]);
  
  const getMealsForDate = useCallback((date: string): PlannedMeal[] => {
    return mealPlan
      .filter(pm => pm.date === date)
      .map(pm => ({ ...pm, recipeDetails: allRecipesCache.find(r => r.id === pm.recipeId) }));
  }, [mealPlan, allRecipesCache]);

  const parseIngredient = useCallback((ingredientString: string) => parseIngredientStringUtil(ingredientString), []);
  const assignIngredientCategory = useCallback((ingredientName: string) => assignCategoryUtil(ingredientName), []);
  const toggleShoppingListItem = useCallback(async (itemId: string) => { 
      // This is a client-side only operation for now
  }, []);

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
    
    await setUserInformation({ tdee: newDynamicTDEE, lastCheckInDate: format(new Date(), 'yyyy-MM-dd') });

    return { success: true, message: "Check-in complete!", recommendation };
  }, [userProfile, dailyWeightLog, getConsumedMacrosForDate, setUserInformation]);

  const contextValue = useMemo(() => ({
    mealPlan, shoppingList, pantryItems, userProfile, userRecipes, allRecipesCache,
    addMealToPlan, removeMealFromPlan, updatePlannedMealServings, getConsumedMacrosForDate,
    toggleShoppingListItem, clearMealPlanForDate, getMealsForDate,
    isRecipeCacheLoading, isAppDataLoading, favoriteRecipeIds, toggleFavoriteRecipe,
    isRecipeFavorite, addPantryItem, removePantryItem, updatePantryItemQuantity,
    parseIngredient, assignIngredientCategory, addCustomRecipe, 
    updateMealStatus, logWeight, getPlannedMacrosForDate, runWeeklyCheckin, logVitals,
    logManualMacros, clearEntireMealPlan, dailyWeightLog, dailyVitalsLog, dailyManualMacrosLog,
    setUserInformation, setMacroTargets, setDietaryPreferences, setAllergens, setMealStructure, setDashboardSettings
  }), [
    mealPlan, shoppingList, pantryItems, userProfile, userRecipes, allRecipesCache, addMealToPlan, removeMealFromPlan,
    updatePlannedMealServings, getConsumedMacrosForDate, toggleShoppingListItem,
    clearMealPlanForDate, getMealsForDate, isRecipeCacheLoading,
    isAppDataLoading, favoriteRecipeIds, toggleFavoriteRecipe, isRecipeFavorite,
    addPantryItem, removePantryItem, updatePantryItemQuantity, parseIngredient, assignIngredientCategory,
    addCustomRecipe, updateMealStatus, logWeight, getPlannedMacrosForDate, runWeeklyCheckin, logVitals,
    logManualMacros, clearEntireMealPlan, dailyWeightLog, dailyVitalsLog, dailyManualMacrosLog,
    setUserInformation, setMacroTargets, setDietaryPreferences, setAllergens, setMealStructure, setDashboardSettings
  ]);
  
  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
};


function useAppData(userId: string | undefined, isAuthLoading: boolean) {
    const [mealPlan, setMealPlan] = useState<PlannedMeal[]>([]);
    const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);
    const [userRecipes, setUserRecipes] = useState<Recipe[]>([]);
    const [favoriteRecipeIds, setFavoriteRecipeIds] = useState<number[]>([]);
    const [dailyWeightLog, setDailyWeightLog] = useState<DailyWeightLog[]>([]);
    const [dailyVitalsLog, setDailyVitalsLog] = useState<DailyVitalsLog[]>([]);
    const [dailyManualMacrosLog, setDailyManualMacrosLog] = useState<DailyManualMacrosLog[]>([]);

    useEffect(() => {
        const onlineMode = isOnlineMode();

        if (onlineMode && userId && !isAuthLoading) {
            const fetchData = async () => {
                try {
                    const [
                        mealPlanRes, pantryRes, userRecipesRes, favoritesRes,
                        weightLogsRes, vitalsLogsRes, manualMacrosLogsRes
                    ] = await Promise.all([
                        supabase.from('planned_meals').select('*').eq('user_id', userId).order('date', { ascending: false }),
                        supabase.from('pantry_items').select('*').eq('user_id', userId),
                        supabase.from('user_recipes').select('*').eq('user_id', userId),
                        supabase.from('favorite_recipes').select('recipe_id').eq('user_id', userId),
                        supabase.from('daily_weight_logs').select('*').eq('user_id', userId).order('date', { ascending: false }),
                        supabase.from('daily_vitals_logs').select('*').eq('user_id', userId).order('date', { ascending: false }),
                        supabase.from('daily_manual_macros_logs').select('*').eq('user_id', userId).order('date', { ascending: false }),
                    ]);

                    if (mealPlanRes.error) throw mealPlanRes.error;
                    setMealPlan(mealPlanRes.data || []);
                    if (pantryRes.error) throw pantryRes.error;
                    setPantryItems(pantryRes.data.map(p => ({...p, name: p.item_name, expiryDate: p.expiration_date})) || []);
                    if (userRecipesRes.error) throw userRecipesRes.error;
                    setUserRecipes(userRecipesRes.data || []);
                    if (favoritesRes.error) throw favoritesRes.error;
                    setFavoriteRecipeIds(favoritesRes.data?.map(f => f.recipe_id) || []);
                    if (weightLogsRes.error) throw weightLogsRes.error;
                    setDailyWeightLog(weightLogsRes.data.map(l => ({...l, weightKg: l.weight_kg})) || []);
                    if (vitalsLogsRes.error) throw vitalsLogsRes.error;
                    setDailyVitalsLog(vitalsLogsRes.data || []);
                    if (manualMacrosLogsRes.error) throw manualMacrosLogsRes.error;
                    setDailyManualMacrosLog(manualMacrosLogsRes.data || []);

                } catch (error) {
                    console.error("Supabase fetch failed, falling back to local storage.", error);
                    setMealPlan(loadState('mealPlan') || []);
                    setPantryItems(loadState('pantryItems') || []);
                    setUserRecipes(loadState('userRecipes') || []);
                    setFavoriteRecipeIds(loadState('favoriteRecipeIds') || []);
                    setDailyWeightLog(loadState('dailyWeightLog') || []);
                    setDailyVitalsLog(loadState('dailyVitalsLog') || []);
                    setDailyManualMacrosLog(loadState('dailyManualMacrosLog') || []);
                }
            };
            fetchData();
        } else if (!isAuthLoading) {
            setMealPlan(loadState('mealPlan') || []);
            setPantryItems(loadState('pantryItems') || []);
            setUserRecipes(loadState('userRecipes') || []);
            setFavoriteRecipeIds(loadState('favoriteRecipeIds') || []);
            setDailyWeightLog(loadState('dailyWeightLog') || []);
            setDailyVitalsLog(loadState('dailyVitalsLog') || []);
            setDailyManualMacrosLog(loadState('dailyManualMacrosLog') || []);
        }
    }, [userId, isAuthLoading]);

    return {
        mealPlan, setMealPlan,
        pantryItems, setPantryItems,
        userRecipes, setUserRecipes,
        favoriteRecipeIds, setFavoriteRecipeIds,
        dailyWeightLog, setDailyWeightLog,
        dailyVitalsLog, setDailyVitalsLog,
        dailyManualMacrosLog, setDailyManualMacrosLog
    };
}


export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider.');
  }
  return context;
};
