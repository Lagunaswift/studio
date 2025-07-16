
"use client";

import type React from 'react';
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import type {
  PlannedMeal,
  ShoppingListItem,
  PantryItem,
  Recipe,
  MealType,
  Macros,
  MacroTargets,
  UserProfileSettings,
  MealSlotConfig,
  RecipeFormData,
  DashboardSettings,
  UKSupermarketCategory,
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
  mealPlan: PlannedMeal[];
  shoppingList: ShoppingListItem[];
  pantryItems: PantryItem[];
  userProfile: UserProfileSettings | null;
  allRecipesCache: Recipe[];
  addMealToPlan: (recipe: Recipe, date: string, mealType: MealType, servings: number) => Promise<void>;
  removeMealFromPlan: (plannedMealId: string) => Promise<void>;
  updatePlannedMealServings: (plannedMealId: string, newServings: number) => Promise<void>;
  updateMealStatus: (plannedMealId: string, status: 'planned' | 'eaten') => Promise<void>;
  logWeight: (date: string, weightKg: number) => Promise<void>;
  logVitals: (date: string, vitals: Omit<DailyVitalsLog, 'date'>) => Promise<void>;
  logManualMacros: (date: string, macros: Macros) => Promise<void>;
  getConsumedMacrosForDate: (date: string) => Macros;
  getPlannedMacrosForDate: (date: string) => Macros;
  toggleShoppingListItem: (itemId: string) => Promise<void>;
  clearMealPlanForDate: (date: string) => Promise<void>;
  clearEntireMealPlan: () => Promise<void>;
  getMealsForDate: (date: string) => PlannedMeal[];
  isRecipeCacheLoading: boolean;
  isAppDataLoading: boolean;
  favoriteRecipeIds: number[];
  toggleFavoriteRecipe: (recipeId: number) => Promise<void>;
  isRecipeFavorite: (recipeId: number) => boolean;
  addPantryItem: (name: string, quantity: number, unit: string, category: UKSupermarketCategory, expiryDate?: string) => Promise<void>;
  removePantryItem: (itemId: string) => Promise<void>;
  updatePantryItemQuantity: (itemId: string, newQuantity: number) => Promise<void>;
  parseIngredient: (ingredientString: string) => { name: string; quantity: number; unit: string };
  assignIngredientCategory: (ingredientName: string) => UKSupermarketCategory;
  addCustomRecipe: (recipeData: RecipeFormData) => Promise<void>;
  userRecipes: Recipe[];
  runWeeklyCheckin: () => Promise<{ success: boolean; message: string; recommendation?: PreppyOutput | null }>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile: userProfile, isLoading: isAuthLoading, updateUserProfileInDb } = useAuth();
  
  const [mealPlan, setMealPlan] = useState<PlannedMeal[]>([]);
  const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>([]);
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);
  const [userRecipes, setUserRecipes] = useState<Recipe[]>([]);
  const [favoriteRecipeIds, setFavoriteRecipeIds] = useState<number[]>([]);

  const [staticRecipes, setStaticRecipes] = useState<Recipe[]>([]);
  const [isRecipeCacheLoading, setIsRecipeCacheLoading] = useState(true);
  
  const isAppDataLoading = isAuthLoading || isRecipeCacheLoading;

  useEffect(() => {
    getAllRecipesFromDataFile().then(recipes => {
      setStaticRecipes(recipes);
      setIsRecipeCacheLoading(false);
    });
  }, []);
  
  const allRecipesCache = useMemo(() => {
    const combined = [...staticRecipes, ...userRecipes];
    const uniqueRecipes = Array.from(new Map(combined.map(recipe => [recipe.id, recipe])).values());
    return uniqueRecipes;
  }, [staticRecipes, userRecipes]);

  // Load data from Supabase when user is available
  useEffect(() => {
    if (user && !isAuthLoading) {
      const fetchData = async () => {
        const userId = user.id;

        const { data: mealPlanData } = await supabase.from('planned_meals').select('*').eq('user_id', userId);
        setMealPlan(mealPlanData || []);

        const { data: pantryData } = await supabase.from('pantry_items').select('*').eq('user_id', userId);
        setPantryItems(pantryData || []);

        const { data: userRecipesData } = await supabase.from('user_recipes').select('*').eq('user_id', userId);
        setUserRecipes(userRecipesData || []);
        
        const { data: favoritesData } = await supabase.from('favorite_recipes').select('recipe_id').eq('user_id', userId);
        setFavoriteRecipeIds(favoritesData?.map(f => f.recipe_id) || []);
      };
      fetchData();
    } else if (!user && !isAuthLoading) {
        // Clear data on logout
        setMealPlan([]);
        setPantryItems([]);
        setUserRecipes([]);
        setFavoriteRecipeIds([]);
    }
  }, [user, isAuthLoading]);


  // Regenerate shopping list when dependencies change
  useEffect(() => {
    if (!isAppDataLoading) {
      const newShoppingList = generateShoppingListUtil(mealPlan, allRecipesCache, pantryItems);
      setShoppingList(newShoppingList);
    }
  }, [mealPlan, pantryItems, allRecipesCache, isAppDataLoading]);
  
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
  }, [user]);

  const removeMealFromPlan = useCallback(async (plannedMealId: string) => {
    if (!user) return;
    const { error } = await supabase.from('planned_meals').delete().eq('id', plannedMealId);
    if (error) throw error;
    setMealPlan(prev => prev.filter(pm => pm.id !== plannedMealId));
  }, [user]);

  const updatePlannedMealServings = useCallback(async (plannedMealId: string, newServings: number) => {
    if (!user) return;
    const { data, error } = await supabase.from('planned_meals').update({ servings: newServings }).eq('id', plannedMealId).select().single();
    if (error) throw error;
    if (data) setMealPlan(prev => prev.map(pm => pm.id === plannedMealId ? data as PlannedMeal : pm));
  }, [user]);

  const updateMealStatus = useCallback(async (plannedMealId: string, status: 'planned' | 'eaten') => {
    if (!user) return;
    const { data, error } = await supabase.from('planned_meals').update({ status }).eq('id', plannedMealId).select().single();
    if (error) throw error;
    if (data) setMealPlan(prev => prev.map(pm => pm.id === plannedMealId ? data as PlannedMeal : pm));
  }, [user]);

  const clearMealPlanForDate = useCallback(async (date: string) => {
    if (!user) return;
    const { error } = await supabase.from('planned_meals').delete().eq('user_id', user.id).eq('date', date);
    if (error) throw error;
    setMealPlan(prev => prev.filter(pm => pm.date !== date));
  }, [user]);

  const clearEntireMealPlan = useCallback(async () => {
    if (!user) return;
    const { error } = await supabase.from('planned_meals').delete().eq('user_id', user.id);
    if (error) throw error;
    setMealPlan([]);
  }, [user]);
  
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
  }, [user, favoriteRecipeIds]);
  
  const isRecipeFavorite = useCallback((recipeId: number): boolean => favoriteRecipeIds.includes(recipeId), [favoriteRecipeIds]);

  const addPantryItem = useCallback(async (name: string, quantity: number, unit: string, category: UKSupermarketCategory, expiryDate?: string) => {
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
  }, [user, pantryItems]);

  const removePantryItem = useCallback(async (itemId: string) => {
    if(!user) return;
    const { error } = await supabase.from('pantry_items').delete().eq('id', itemId);
    if (error) throw error;
    setPantryItems(prev => prev.filter(p => p.id !== itemId));
  }, [user]);

  const updatePantryItemQuantity = useCallback(async (itemId: string, newQuantity: number) => {
    if (!user) return;
    if (newQuantity <= 0) {
      await removePantryItem(itemId);
    } else {
      const { data, error } = await supabase.from('pantry_items').update({ quantity: newQuantity }).eq('id', itemId).select().single();
      if (error) throw error;
      if (data) setPantryItems(prev => prev.map(p => p.id === itemId ? data : p));
    }
  }, [user, removePantryItem]);
  
  const addCustomRecipe = useCallback(async (recipeData: RecipeFormData) => {
    if (!user) return;
    
    let baseRecipe = {
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
  }, [user]);

  const logData = useCallback(async (logType: 'daily_weight_log' | 'daily_vitals_log' | 'daily_manual_macros_log', date: string, data: any) => {
    if (!userProfile || !user) return;
    
    let newLogEntry: any = { user_id: user.id, date, ...data };
    if (logType === 'daily_manual_macros_log') {
        newLogEntry = { user_id: user.id, date, macros: data };
    }
    
    const { error: deleteError } = await supabase.from(logType).delete().eq('user_id', user.id).eq('date', date);
    if(deleteError) console.error(`Error deleting existing log for ${date}:`, deleteError);

    const { data: upsertedData, error: upsertError } = await supabase.from(logType).insert(newLogEntry).select();
    
    if (upsertError) {
        console.error(`Error upserting log for ${logType}:`, upsertError);
        return;
    }
    
    const { data: allLogs, error: fetchError } = await supabase.from(logType).select('*').eq('user_id', user.id).order('date', { ascending: false });
    if(fetchError) {
      console.error(`Error fetching updated logs for ${logType}:`, fetchError);
      return;
    }

    const updates: Partial<UserProfileSettings> = { [logType]: allLogs || [] };
    if (logType === 'daily_weight_log') {
        updates.weightKg = data.weightKg;
    }
    
    updateUserProfileInDb(updates);
  }, [user, userProfile, updateUserProfileInDb]);


  const logWeight = (date: string, weightKg: number) => logData('daily_weight_log', date, { weightKg });
  const logVitals = (date: string, vitals: Omit<DailyVitalsLog, 'date'>) => logData('daily_vitals_log', date, vitals);
  const logManualMacros = (date: string, macros: Macros) => logData('daily_manual_macros_log', date, macros);

  const getConsumedMacrosForDate = useCallback((date: string): Macros => {
    const manualLog = userProfile?.daily_manual_macros_log?.find(log => log.date === date);
    if (manualLog) {
      return manualLog.macros;
    }
    return calculateTotalMacrosUtil(mealPlan.filter(pm => pm.date === date && pm.status === 'eaten'), allRecipesCache);
  }, [mealPlan, allRecipesCache, userProfile?.daily_manual_macros_log]);
  
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
      setShoppingList(prev => prev.map(item => item.id === itemId ? {...item, purchased: !item.purchased} : item));
  }, []);

  const runWeeklyCheckin = useCallback(async (): Promise<{ success: boolean; message: string; recommendation?: PreppyOutput | null }> => {
    if (!userProfile || !userProfile.daily_weight_log || userProfile.daily_weight_log.length < 14) {
      return { success: false, message: "At least 14 days of weight and calorie data are needed for an accurate calculation." };
    }
    
    const logsWithTrend = calculateTrendWeight(userProfile.daily_weight_log);
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
    
    await updateUserProfileInDb({ tdee: newDynamicTDEE, lastCheckInDate: format(new Date(), 'yyyy-MM-dd') });

    return { success: true, message: "Check-in complete!", recommendation };
  }, [userProfile, allRecipesCache, getConsumedMacrosForDate, updateUserProfileInDb]);

  const contextValue = useMemo(() => ({
    mealPlan, shoppingList, pantryItems, userProfile, allRecipesCache,
    addMealToPlan, removeMealFromPlan, updatePlannedMealServings, getConsumedMacrosForDate,
    toggleShoppingListItem, clearMealPlanForDate, getMealsForDate,
    isRecipeCacheLoading, isAppDataLoading, favoriteRecipeIds, toggleFavoriteRecipe,
    isRecipeFavorite, addPantryItem, removePantryItem, updatePantryItemQuantity,
    parseIngredient, assignIngredientCategory, addCustomRecipe, userRecipes, 
    updateMealStatus, logWeight, getPlannedMacrosForDate, runWeeklyCheckin, logVitals,
    logManualMacros, clearEntireMealPlan
  }), [
    mealPlan, shoppingList, pantryItems, userProfile, allRecipesCache, addMealToPlan, removeMealFromPlan,
    updatePlannedMealServings, getConsumedMacrosForDate, toggleShoppingListItem,
    clearMealPlanForDate, getMealsForDate, isRecipeCacheLoading,
    isAppDataLoading, favoriteRecipeIds, toggleFavoriteRecipe, isRecipeFavorite,
    addPantryItem, removePantryItem, updatePantryItemQuantity, parseIngredient, assignIngredientCategory,
    addCustomRecipe, userRecipes, updateMealStatus, logWeight, getPlannedMacrosForDate, runWeeklyCheckin, logVitals,
    logManualMacros, clearEntireMealPlan
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
