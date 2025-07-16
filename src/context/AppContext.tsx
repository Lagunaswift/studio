
"use client";

import React, { createContext, useContext, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from './AuthContext';
import type {
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

  const [staticRecipes, setStaticRecipes] = React.useState<Recipe[]>([]);
  const [isRecipeCacheLoading, setIsRecipeCacheLoading] = React.useState(true);
  
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
    if (!user) { throw new Error("User not available. Cannot add meal to plan."); }
    const newPlannedMeal = { 
      user_id: user.id,
      recipe_id: recipe.id, 
      date, 
      meal_type: mealType, 
      servings,
      status: 'planned' as 'planned' | 'eaten',
    };
    const { data, error } = await supabase.from('planned_meals').insert(newPlannedMeal).select().single();
    if (error) throw error;
    if (data) setMealPlan(prev => [...prev, data as PlannedMeal]);
  }, [user, setMealPlan]);

  const removeMealFromPlan = useCallback(async (plannedMealId: string) => {
    if (!user) return;
    const { error } = await supabase.from('planned_meals').delete().eq('id', plannedMealId);
    if (error) throw error;
    setMealPlan(prev => prev.filter(pm => pm.id !== plannedMealId));
  }, [user, setMealPlan]);

  const updatePlannedMealServings = useCallback(async (plannedMealId: string, newServings: number) => {
    if (!user) return;
    const { data, error } = await supabase.from('planned_meals').update({ servings: newServings }).eq('id', plannedMealId).select().single();
    if (error) throw error;
    if (data) setMealPlan(prev => prev.map(pm => pm.id === plannedMealId ? data as PlannedMeal : pm));
  }, [user, setMealPlan]);

  const updateMealStatus = useCallback(async (plannedMealId: string, status: 'planned' | 'eaten') => {
    if (!user) return;
    const { data, error } = await supabase.from('planned_meals').update({ status }).eq('id', plannedMealId).select().single();
    if (error) throw error;
    if (data) setMealPlan(prev => prev.map(pm => pm.id === plannedMealId ? data as PlannedMeal : pm));
  }, [user, setMealPlan]);

  const clearMealPlanForDate = useCallback(async (date: string) => {
    if (!user) return;
    const { error } = await supabase.from('planned_meals').delete().eq('user_id', user.id).eq('date', date);
    if (error) throw error;
    setMealPlan(prev => prev.filter(pm => pm.date !== date));
  }, [user, setMealPlan]);

  const clearEntireMealPlan = useCallback(async () => {
    if (!user) return;
    const { error } = await supabase.from('planned_meals').delete().eq('user_id', user.id);
    if (error) throw error;
    setMealPlan([]);
  }, [user, setMealPlan]);
  
  const toggleFavoriteRecipe = useCallback(async (recipeId: number) => {
    if (!user) return;
    const isCurrentlyFavorite = favoriteRecipeIds.includes(recipeId);

    if (isCurrentlyFavorite) {
        const { error } = await supabase.from('favorite_recipes').delete().eq('user_id', user.id).eq('recipe_id', recipeId);
        if (error) throw error;
        setFavoriteRecipeIds(prev => prev.filter(id => id !== recipeId));
    } else {
        const { error } = await supabase.from('favorite_recipes').insert({ user_id: user.id, recipe_id: recipeId });
        if (error) throw error;
        setFavoriteRecipeIds(prev => [...prev, recipeId]);
    }
  }, [user, favoriteRecipeIds, setFavoriteRecipeIds]);
  
  const isRecipeFavorite = useCallback((recipeId: number): boolean => favoriteRecipeIds.includes(recipeId), [favoriteRecipeIds]);

  const addPantryItem = useCallback(async (name: string, quantity: number, unit: string, category: string, expiryDate?: string) => {
    if (!user) return;
    const existingItem = pantryItems.find(p => p.name.toLowerCase() === name.toLowerCase() && p.unit === unit);

    if (existingItem) {
        const newQuantity = existingItem.quantity + quantity;
        const { data, error } = await supabase.from('pantry_items').update({ quantity: newQuantity, expiry_date: expiryDate }).eq('id', existingItem.id).select().single();
        if (error) throw error;
        if(data) setPantryItems(prev => prev.map(p => p.id === existingItem.id ? data : p));
    } else {
        const newItem = { user_id: user.id, name, quantity, unit, category, expiry_date: expiryDate };
        const { data, error } = await supabase.from('pantry_items').insert(newItem).select().single();
        if (error) throw error;
        if (data) setPantryItems(prev => [...prev, data]);
    }
  }, [user, pantryItems, setPantryItems]);

  const removePantryItem = useCallback(async (itemId: string) => {
    if(!user) return;
    const { error } = await supabase.from('pantry_items').delete().eq('id', itemId);
    if (error) throw error;
    setPantryItems(prev => prev.filter(p => p.id !== itemId));
  }, [user, setPantryItems]);

  const updatePantryItemQuantity = useCallback(async (itemId: string, newQuantity: number) => {
    if (!user) return;
    if (newQuantity <= 0) {
      await removePantryItem(itemId);
    } else {
      const { data, error } = await supabase.from('pantry_items').update({ quantity: newQuantity }).eq('id', itemId).select().single();
      if (error) throw error;
      if (data) setPantryItems(prev => prev.map(p => p.id === itemId ? data : p));
    }
  }, [user, removePantryItem, setPantryItems]);
  
  const addCustomRecipe = useCallback(async (recipeData: RecipeFormData) => {
    if (!user) return;
    
    const baseRecipe = {
        user_id: user.id,
        name: recipeData.name,
        description: recipeData.description,
        image: recipeData.image || `https://placehold.co/600x400.png?text=${encodeURIComponent(recipeData.name)}`,
        servings: recipeData.servings,
        prep_time: recipeData.prepTime,
        cook_time: recipeData.cookTime,
        chill_time: recipeData.chillTime,
        ingredients: recipeData.ingredients.map(ing => ing.value),
        macros_per_serving: {
          calories: recipeData.calories, protein: recipeData.protein, carbs: recipeData.carbs, fat: recipeData.fat,
        },
        instructions: recipeData.instructions.map(inst => inst.value),
        tags: recipeData.tags,
    };
    
    let fullRecipe: any = {...baseRecipe, micronutrients_per_serving: null};

    try {
      const ingredientsPerServing = fullRecipe.ingredients.map((ingStr: string) => {
          const parsed = parseIngredientStringUtil(ingStr);
          const quantityPerServing = parsed.quantity / (fullRecipe.servings || 1);
          return `${quantityPerServing.toFixed(2)} ${parsed.unit} ${parsed.name}`;
      });
      
      const micros = await suggestMicronutrients({ ingredients: ingredientsPerServing });
      fullRecipe.micronutrients_per_serving = micros;

    } catch (e) {
      console.warn("AI Micronutrient estimation failed for new recipe:", e);
    }
    
    const { data: newRecipeData, error } = await supabase.from('user_recipes').insert(fullRecipe).select().single();
    if(error) throw error;
    
    if(newRecipeData) setUserRecipes(prev => [...prev, newRecipeData]);
  }, [user, setUserRecipes]);

  const logWeight = useCallback(async (date: string, weightKg: number) => {
      if (!user) return;
      const { error: deleteError } = await supabase.from('daily_weight_logs').delete().match({ user_id: user.id, date });
      if (deleteError) console.error('Error clearing old weight log:', deleteError);
      
      const { data, error } = await supabase.from('daily_weight_logs').insert({ user_id: user.id, date, weight_kg: weightKg }).select().single();
      if (error) throw error;
      
      setDailyWeightLog(prev => [...prev.filter(log => log.date !== date), data]);
      setProfile(p => p ? ({ ...p, weightKg }) : null);

  }, [user, setDailyWeightLog, setProfile]);

  const logVitals = useCallback(async (date: string, vitals: Omit<DailyVitalsLog, 'date' | 'id' | 'user_id' | 'created_at'>) => {
    if (!user) return;
    const { error: deleteError } = await supabase.from('daily_vitals_logs').delete().match({ user_id: user.id, date });
    if (deleteError) console.error('Error clearing old vitals log:', deleteError);
    
    const { data, error } = await supabase.from('daily_vitals_logs').insert({ user_id: user.id, date, ...vitals }).select().single();
    if (error) throw error;

    setDailyVitalsLog(prev => [...prev.filter(log => log.date !== date), data]);
  }, [user, setDailyVitalsLog]);
  
  const logManualMacros = useCallback(async (date: string, macros: Macros) => {
    if (!user) return;
    const { error: deleteError } = await supabase.from('daily_manual_macros_logs').delete().match({ user_id: user.id, date });
    if (deleteError) console.error('Error clearing old manual macros log:', deleteError);
    
    const { data, error } = await supabase.from('daily_manual_macros_logs').insert({ user_id: user.id, date, macros }).select().single();
    if (error) throw error;

    setDailyManualMacrosLog(prev => [...prev.filter(log => log.date !== date), data]);
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
      .map(pm => ({ ...pm, recipeDetails: allRecipesCache.find(r => r.id === pm.recipe_id) }));
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
    const [mealPlan, setMealPlan] = React.useState<PlannedMeal[]>([]);
    const [pantryItems, setPantryItems] = React.useState<PantryItem[]>([]);
    const [userRecipes, setUserRecipes] = React.useState<Recipe[]>([]);
    const [favoriteRecipeIds, setFavoriteRecipeIds] = React.useState<number[]>([]);
    const [dailyWeightLog, setDailyWeightLog] = React.useState<DailyWeightLog[]>([]);
    const [dailyVitalsLog, setDailyVitalsLog] = React.useState<DailyVitalsLog[]>([]);
    const [dailyManualMacrosLog, setDailyManualMacrosLog] = React.useState<DailyManualMacrosLog[]>([]);

    useEffect(() => {
        if (userId && !isAuthLoading) {
            const fetchData = async () => {
                const fetchTable = async (tableName: string) => {
                    const { data } = await supabase.from(tableName).select('*').eq('user_id', userId).order('date', { ascending: false });
                    return data || [];
                };
                
                const fetchFavorites = async () => {
                   const { data } = await supabase.from('favorite_recipes').select('recipe_id').eq('user_id', userId);
                   return data?.map(f => f.recipe_id) || [];
                }

                const [
                    mealPlanData, pantryData, userRecipesData, favoritesData,
                    weightLogs, vitalsLogs, manualMacrosLogs
                ] = await Promise.all([
                    fetchTable('planned_meals'),
                    fetchTable('pantry_items'),
                    fetchTable('user_recipes'),
                    fetchFavorites(),
                    fetchTable('daily_weight_logs'),
                    fetchTable('daily_vitals_logs'),
                    fetchTable('daily_manual_macros_logs'),
                ]);

                setMealPlan(mealPlanData);
                setPantryItems(pantryData);
                setUserRecipes(userRecipesData);
                setFavoriteRecipeIds(favoritesData);
                setDailyWeightLog(weightLogs);
                setDailyVitalsLog(vitalsLogs);
                setDailyManualMacrosLog(manualMacrosLogs);
            };
            fetchData();
        } else if (!userId && !isAuthLoading) {
            // Clear data on logout
            setMealPlan([]);
            setPantryItems([]);
            setUserRecipes([]);
            setFavoriteRecipeIds([]);
            setDailyWeightLog([]);
            setDailyVitalsLog([]);
            setDailyManualMacrosLog([]);
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
