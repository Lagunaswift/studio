
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
} from '@/types';
import { getAllRecipes as getAllRecipesFromDataFile, calculateTotalMacros as calculateTotalMacrosUtil, generateShoppingList as generateShoppingListUtil, parseIngredientString as parseIngredientStringUtil, assignCategory as assignCategoryUtil, calculateTrendWeight } from '@/lib/data';
import { runPreppy, type PreppyInput, type PreppyOutput } from '@/ai/flows/pro-coach-flow';
import { suggestMicronutrients } from '@/ai/flows/suggest-micronutrients-flow';
import { format, subDays, differenceInDays } from 'date-fns';
import { supabase } from '@/lib/supabaseClient';
import { loadState, saveState } from '@/lib/localStorage';

// Helper to determine if we should use Supabase or fallback to local storage
const isOnlineMode = () => process.env.NEXT_PUBLIC_SERVICE_STATUS === 'online';

interface AppContextType {
  // State
  mealPlan: PlannedMeal[];
  shoppingList: ShoppingListItem[];
  pantryItems: PantryItem[];
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
  const { user, profile, isLoading: isAuthLoading, setProfile } = useAuth();
  
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
            // Don't modify local state if Supabase fails to keep it consistent
            return; 
        }
    }
    
    // Always update local state for immediate UI feedback or for local mode
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
                const { data, error } = await supabase.from('pantry_items').insert({ ...newItem, user_id: user.id }).select().single();
                if (error) throw error;
                if (data) setPantryItems(prev => [...prev, data]);
            }
        } catch (e) {
            console.error("Supabase failed. Falling back to local storage.", e);
            // Fallback logic
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
    setProfile(p => p ? ({ ...p, weightKg }) : null);
  }, [user, setDailyWeightLog, setProfile]);

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
      // setShoppingList(prev => prev.map(item => item.id === itemId ? {...item, purchased: !item.purchased} : item));
  }, []);

  const runWeeklyCheckin = useCallback(async (): Promise<{ success: boolean; message: string; recommendation?: PreppyOutput | null }> => {
    if (!profile || !dailyWeightLog || dailyWeightLog.length < 14) {
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
      primaryGoal: profile.primaryGoal || 'maintenance',
      targetWeightChangeRateKg: profile.targetWeightChangeRateKg || 0,
      dynamicTdee: newDynamicTDEE,
      actualAvgCalories: averageDailyCalories,
      actualWeeklyWeightChangeKg: actualWeeklyWeightChangeKg,
      currentProteinTarget: profile.macroTargets?.protein || 0,
      currentFatTarget: profile.macroTargets?.fat || 0,
    };

    const recommendation = await runPreppy(preppyInput);
    
    setProfile(p => p ? ({ ...p, tdee: newDynamicTDEE, lastCheckInDate: format(new Date(), 'yyyy-MM-dd') }) : null);

    return { success: true, message: "Check-in complete!", recommendation };
  }, [profile, allRecipesCache, getConsumedMacrosForDate, setProfile, dailyWeightLog]);

  const contextValue = useMemo(() => ({
    mealPlan, shoppingList, pantryItems, userProfile: profile, userRecipes, allRecipesCache,
    addMealToPlan, removeMealFromPlan, updatePlannedMealServings, getConsumedMacrosForDate,
    toggleShoppingListItem, clearMealPlanForDate, getMealsForDate,
    isRecipeCacheLoading, isAppDataLoading, favoriteRecipeIds, toggleFavoriteRecipe,
    isRecipeFavorite, addPantryItem, removePantryItem, updatePantryItemQuantity,
    parseIngredient, assignIngredientCategory, addCustomRecipe, 
    updateMealStatus, logWeight, getPlannedMacrosForDate, runWeeklyCheckin, logVitals,
    logManualMacros, clearEntireMealPlan, dailyWeightLog, dailyVitalsLog, dailyManualMacrosLog
  }), [
    mealPlan, shoppingList, pantryItems, profile, userRecipes, allRecipesCache, addMealToPlan, removeMealFromPlan,
    updatePlannedMealServings, getConsumedMacrosForDate, toggleShoppingListItem,
    clearMealPlanForDate, getMealsForDate, isRecipeCacheLoading,
    isAppDataLoading, favoriteRecipeIds, toggleFavoriteRecipe, isRecipeFavorite,
    addPantryItem, removePantryItem, updatePantryItemQuantity, parseIngredient, assignIngredientCategory,
    addCustomRecipe, updateMealStatus, logWeight, getPlannedMacrosForDate, runWeeklyCheckin, logVitals,
    logManualMacros, clearEntireMealPlan, dailyWeightLog, dailyVitalsLog, dailyManualMacrosLog
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
                    setPantryItems(pantryRes.data || []);
                    if (userRecipesRes.error) throw userRecipesRes.error;
                    setUserRecipes(userRecipesRes.data || []);
                    if (favoritesRes.error) throw favoritesRes.error;
                    setFavoriteRecipeIds(favoritesRes.data?.map(f => f.recipe_id) || []);
                    if (weightLogsRes.error) throw weightLogsRes.error;
                    setDailyWeightLog(weightLogsRes.data || []);
                    if (vitalsLogsRes.error) throw vitalsLogsRes.error;
                    setDailyVitalsLog(vitalsLogsRes.data || []);
                    if (manualMacrosLogsRes.error) throw manualMacrosLogsRes.error;
                    setDailyManualMacrosLog(manualMacrosLogsRes.data || []);

                } catch (error) {
                    console.error("Supabase fetch failed, falling back to local storage.", error);
                    // If any Supabase fetch fails, load everything from local storage
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
        } else if (!isAuthLoading) { // Offline mode or logged out
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
