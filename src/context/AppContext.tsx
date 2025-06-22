
"use client";

import type React from 'react';
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '@/lib/supabaseClient';
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
  Sex,
  ActivityLevel,
  RecipeFormData,
  DashboardSettings,
  UKSupermarketCategory,
} from '@/types';
import { ACTIVITY_LEVEL_OPTIONS } from '@/types';
import { getAllRecipes as getAllRecipesFromDataFile, calculateTotalMacros as calculateTotalMacrosUtil, generateShoppingList as generateShoppingListUtil, parseIngredientString as parseIngredientStringUtil, assignCategory as assignCategoryUtil } from '@/lib/data';

const DEFAULT_MEAL_STRUCTURE: MealSlotConfig[] = [
  { id: 'default-breakfast', name: 'Breakfast', type: 'Breakfast' },
  { id: 'default-lunch', name: 'Lunch', type: 'Lunch' },
  { id: 'default-dinner', name: 'Dinner', type: 'Dinner' },
  { id: 'default-snack1', name: 'Snack', type: 'Snack' },
];

const DEFAULT_DASHBOARD_SETTINGS: DashboardSettings = {
  showMacros: true,
  showMenu: true,
  showFeaturedRecipe: true,
  showQuickRecipes: true,
};

const FREE_TIER_RECIPE_DISPLAY_LIMIT = 15;

// ... (calculation functions remain the same)
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
    let bf: number;
    if (sex === 'male') {
      if (!abdomenCm || abdomenCm <= 0 || neckCm <= 0 || abdomenCm <= neckCm) return null;
      const logTerm = abdomenCm - neckCm;
      if (logTerm <= 0 || heightCm <= 0) return null;
      bf = 86.010 * Math.log10(logTerm) - 70.041 * Math.log10(heightCm) + 36.76;
    } else if (sex === 'female') {
      if (!waistCm || waistCm <= 0 || !hipCm || hipCm <= 0 || neckCm <= 0) return null;
      const logTerm = waistCm + hipCm - neckCm;
      if (logTerm <= 0 || heightCm <= 0) return null;
      bf = 163.205 * Math.log10(logTerm) - 97.684 * Math.log10(heightCm) - 78.387;
    } else {
      return null;
    }
    if (isNaN(bf) || !isFinite(bf)) return null;
    const resultBFP = parseFloat(bf.toFixed(1));
    return isNaN(resultBFP) || !isFinite(resultBFP) ? null : Math.max(1, Math.min(100, resultBFP));
  } catch (error) {
    console.error("Error calculating Navy Body Fat %:", error);
    return null;
  }
};

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

interface AppContextType {
  mealPlan: PlannedMeal[];
  shoppingList: ShoppingListItem[];
  pantryItems: PantryItem[];
  userProfile: UserProfileSettings | null;
  allRecipesCache: Recipe[];
  addMealToPlan: (recipe: Recipe, date: string, mealType: MealType, servings: number) => Promise<void>;
  removeMealFromPlan: (plannedMealId: string) => Promise<void>;
  updatePlannedMealServings: (plannedMealId: string, newServings: number) => Promise<void>;
  getDailyMacros: (date: string) => Macros;
  toggleShoppingListItem: (itemId: string) => Promise<void>;
  clearMealPlanForDate: (date: string) => Promise<void>;
  clearAllData: () => Promise<void>;
  getMealsForDate: (date: string) => PlannedMeal[];
  setMacroTargets: (targets: MacroTargets) => Promise<void>;
  setDietaryPreferences: (preferences: string[]) => Promise<void>;
  setAllergens: (allergens: string[]) => Promise<void>;
  setMealStructure: (mealStructure: MealSlotConfig[]) => Promise<void>;
  setDashboardSettings: (settings: DashboardSettings) => Promise<void>;
  setUserInformation: (info: Partial<UserProfileSettings>) => Promise<void>;
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
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [mealPlan, setMealPlan] = useState<PlannedMeal[]>([]);
  const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>([]);
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfileSettings | null>(null);
  const [userRecipes, setUserRecipes] = useState<Recipe[]>([]);
  const [favoriteRecipeIds, setFavoriteRecipeIds] = useState<number[]>([]);

  const [staticRecipes, setStaticRecipes] = useState<Recipe[]>([]);
  const [isRecipeCacheLoading, setIsRecipeCacheLoading] = useState(true);
  const [isAppDataLoading, setIsAppDataLoading] = useState(true);

  // Load static recipes once on mount
  useEffect(() => {
    getAllRecipesFromDataFile().then(recipes => {
      setStaticRecipes(recipes);
      setIsRecipeCacheLoading(false);
    });
  }, []);

  const allRecipesCache = useMemo(() => {
    const combined = [...staticRecipes, ...userRecipes];
    const uniqueRecipes = Array.from(new Map(combined.map(recipe => [recipe.id, recipe])).values());

    if (userProfile?.subscription_status === 'active') {
      return uniqueRecipes;
    } else {
      // For free-tier users, return a limited subset.
      return uniqueRecipes.slice(0, FREE_TIER_RECIPE_DISPLAY_LIMIT);
    }
  }, [staticRecipes, userRecipes, userProfile]);

  // Refetch all user data when user changes
  useEffect(() => {
    if (user && !isRecipeCacheLoading) {
      console.log("User detected, fetching app data...");
      setIsAppDataLoading(true);
      fetchAllUserData(user.id).finally(() => {
        setIsAppDataLoading(false);
        console.log("App data fetch complete.");
      });
    } else if (!user) {
      // Clear data on logout
      setMealPlan([]);
      setShoppingList([]);
      setPantryItems([]);
      setUserProfile(null);
      setUserRecipes([]);
      setFavoriteRecipeIds([]);
      setIsAppDataLoading(false);
    }
  }, [user, isRecipeCacheLoading]);
  
  const fetchAllUserData = async (userId: string) => {
    const [profileRes, recipesRes, mealPlanRes, pantryRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('recipes').select('*').eq('user_id', userId),
      supabase.from('meal_plan_entries').select('*').eq('user_id', userId),
      supabase.from('pantry_items').select('*').eq('user_id', userId),
    ]);

    // Process Profile
    if (profileRes.data) {
      const dbProfile = profileRes.data;
      const calculatedProfile = {
          ...dbProfile,
          dashboardSettings: { ...DEFAULT_DASHBOARD_SETTINGS, ...(dbProfile.dashboard_settings || {}) },
          mealStructure: dbProfile.meal_structure || DEFAULT_MEAL_STRUCTURE,
          tdee: calculateTDEE(dbProfile.weight_kg, dbProfile.height_cm, dbProfile.age, dbProfile.sex, dbProfile.activity_level),
          leanBodyMassKg: calculateLBM(dbProfile.weight_kg, dbProfile.body_fat_percentage),
      };
      setUserProfile(calculatedProfile);
      setFavoriteRecipeIds(dbProfile.favorite_recipe_ids || []);
    } else {
       console.error("Profile fetch error:", profileRes.error?.message);
    }

    // Process User Recipes
    if (recipesRes.data) {
        setUserRecipes(recipesRes.data.map((r: any) => ({...r, isCustom: true, macrosPerServing: r.macros_per_serving})));
    } else {
        console.error("User recipes fetch error:", recipesRes.error?.message);
    }

    // Process Meal Plan
    if (mealPlanRes.data) {
        const populatedMealPlan = mealPlanRes.data.map(pm => {
            const recipeDetails = allRecipesCache.find(r => r.id === pm.recipe_id);
            return {
                id: pm.id,
                recipeId: pm.recipe_id,
                date: pm.meal_date,
                mealType: pm.meal_type,
                servings: pm.servings,
                recipeDetails: recipeDetails || undefined,
            };
        });
        setMealPlan(populatedMealPlan);
    } else {
        console.error("Meal plan fetch error:", mealPlanRes.error?.message);
    }

    // Process Pantry
    if (pantryRes.data) {
        setPantryItems(pantryRes.data.map((p:any) => ({...p, expiryDate: p.expiry_date})));
    } else {
        console.error("Pantry fetch error:", pantryRes.error?.message);
    }
  };
  
  // Recalculate shopping list whenever meal plan or pantry changes
  useEffect(() => {
    if (!isAppDataLoading) {
      const newShoppingList = generateShoppingListUtil(mealPlan, allRecipesCache, pantryItems);
      setShoppingList(newShoppingList);
    }
  }, [mealPlan, pantryItems, allRecipesCache, isAppDataLoading]);

  // --- ASYNC DATA MODIFICATION FUNCTIONS ---
  
  const addMealToPlan = useCallback(async (recipe: Recipe, date: string, mealType: MealType, servings: number) => {
    if (!user) return;
    const { data, error } = await supabase.from('meal_plan_entries').insert({
      user_id: user.id,
      recipe_id: recipe.id,
      meal_date: date,
      meal_type: mealType,
      servings: servings,
    }).select().single();
    
    if (error) console.error("Error adding meal to plan:", error);
    else if (data) {
      const newPlannedMeal: PlannedMeal = { id: data.id, recipeId: data.recipe_id, date: data.meal_date, mealType: data.meal_type, servings: data.servings, recipeDetails: recipe };
      setMealPlan(prev => [...prev, newPlannedMeal]);
    }
  }, [user]);

  const removeMealFromPlan = useCallback(async (plannedMealId: string) => {
    if (!user) return;
    const { error } = await supabase.from('meal_plan_entries').delete().eq('id', plannedMealId);
    if (error) console.error("Error removing meal from plan:", error);
    else setMealPlan(prev => prev.filter(pm => pm.id !== plannedMealId));
  }, [user]);

  const updatePlannedMealServings = useCallback(async (plannedMealId: string, newServings: number) => {
    if (!user) return;
    const { error } = await supabase.from('meal_plan_entries').update({ servings: newServings }).eq('id', plannedMealId);
    if(error) console.error("Error updating servings:", error);
    else setMealPlan(prev => prev.map(pm => pm.id === plannedMealId ? { ...pm, servings: newServings } : pm));
  }, [user]);

  const clearMealPlanForDate = useCallback(async (date: string) => {
    if (!user) return;
    const { error } = await supabase.from('meal_plan_entries').delete().eq('user_id', user.id).eq('meal_date', date);
    if(error) console.error("Error clearing meal plan for date:", error);
    else setMealPlan(prev => prev.filter(pm => pm.date !== date));
  }, [user]);
  
  const updateUserProfileInDb = useCallback(async (updates: Partial<UserProfileSettings>) => {
    if (!user) return;
    const { error } = await supabase.from('profiles').update(updates).eq('id', user.id);
    if (error) console.error("Error updating user profile:", error);
    else setUserProfile(prev => prev ? { ...prev, ...updates } : null); // Optimistic UI update
  }, [user]);

  const setMacroTargets = useCallback((targets: MacroTargets) => updateUserProfileInDb({ macroTargets: targets }), [updateUserProfileInDb]);
  const setDietaryPreferences = useCallback((preferences: string[]) => updateUserProfileInDb({ dietaryPreferences: preferences }), [updateUserProfileInDb]);
  const setAllergens = useCallback((allergens: string[]) => updateUserProfileInDb({ allergens }), [updateUserProfileInDb]);
  const setMealStructure = useCallback((mealStructure: MealSlotConfig[]) => updateUserProfileInDb({ mealStructure }), [updateUserProfileInDb]);
  const setDashboardSettings = useCallback((settings: DashboardSettings) => updateUserProfileInDb({ dashboardSettings: settings }), [updateUserProfileInDb]);
  const setUserInformation = useCallback(async (info: Partial<UserProfileSettings>) => {
     if (!user) return;
      let newProfileData = { ...userProfile, ...info };
      let finalBodyFatPercentage = newProfileData.bodyFatPercentage;
      if (info.bodyFatPercentage !== undefined) finalBodyFatPercentage = info.bodyFatPercentage;
      else if (finalBodyFatPercentage === null) {
        finalBodyFatPercentage = calculateNavyBodyFatPercentage(
            newProfileData.sex, newProfileData.height_cm, newProfileData.neckCircumferenceCm,
            newProfileData.abdomenCircumferenceCm, newProfileData.waistCircumferenceCm, newProfileData.hipCircumferenceCm
        );
      }
      
      const updatesForDb: any = {
          ...info,
          body_fat_percentage: finalBodyFatPercentage,
          lean_body_mass_kg: calculateLBM(info.weightKg || userProfile?.weightKg, finalBodyFatPercentage),
          tdee: calculateTDEE(info.weightKg || userProfile?.weightKg, info.heightCm || userProfile?.heightCm, info.age || userProfile?.age, info.sex || userProfile?.sex, info.activityLevel || userProfile?.activityLevel)
      };
      
      // Clean up fields to match DB column names
      if(updatesForDb.heightCm) { updatesForDb.height_cm = updatesForDb.heightCm; delete updatesForDb.heightCm; }
      if(updatesForDb.weightKg) { updatesForDb.weight_kg = updatesForDb.weightKg; delete updatesForDb.weightKg; }
      if(updatesForDb.activityLevel) { updatesForDb.activity_level = updatesForDb.activityLevel; delete updatesForDb.activityLevel; }
      if(updatesForDb.primaryGoal) { updatesForDb.primary_goal = updatesForDb.primaryGoal; delete updatesForDb.primaryGoal; }
      if(updatesForDb.athleteType) { updatesForDb.athlete_type = updatesForDb.athleteType; delete updatesForDb.athleteType; }
      if(updatesForDb.bodyFatPercentage) { updatesForDb.body_fat_percentage = updatesForDb.bodyFatPercentage; delete updatesForDb.bodyFatPercentage; }
      if(updatesForDb.leanBodyMassKg) { updatesForDb.lean_body_mass_kg = updatesForDb.leanBodyMassKg; delete updatesForDb.leanBodyMassKg; }

      await updateUserProfileInDb(updatesForDb);
      // Refetch to ensure all calculated fields are updated in state
      await fetchAllUserData(user.id);
  }, [user, userProfile, updateUserProfileInDb]);
  
  const toggleFavoriteRecipe = useCallback(async (recipeId: number) => {
    if (!user) return;
    const newFavs = favoriteRecipeIds.includes(recipeId) ? favoriteRecipeIds.filter(id => id !== recipeId) : [...favoriteRecipeIds, recipeId];
    setFavoriteRecipeIds(newFavs); // Optimistic update
    await supabase.from('profiles').update({ favorite_recipe_ids: newFavs }).eq('id', user.id);
  }, [user, favoriteRecipeIds]);
  
  const isRecipeFavorite = useCallback((recipeId: number): boolean => favoriteRecipeIds.includes(recipeId), [favoriteRecipeIds]);

  const addPantryItem = useCallback(async (name: string, quantity: number, unit: string, category: UKSupermarketCategory, expiryDate?: string) => {
    if (!user) return;
    const { data, error } = await supabase.from('pantry_items').upsert({
        user_id: user.id,
        name: name,
        quantity: quantity,
        unit: unit,
        category: category,
        expiry_date: expiryDate,
    }, { onConflict: 'user_id,name,unit', ignoreDuplicates: false }).select();

    if (error) console.error("Error adding pantry item:", error);
    else if (data) {
        // This is complex because upsert might insert or update. Easiest is to refetch.
        await fetchAllUserData(user.id);
    }
  }, [user]);

  const removePantryItem = useCallback(async (itemId: string) => {
    if(!user) return;
    const { error } = await supabase.from('pantry_items').delete().eq('id', itemId);
    if(error) console.error("Error removing pantry item:", error);
    else setPantryItems(prev => prev.filter(p => p.id !== itemId));
  }, [user]);

  const updatePantryItemQuantity = useCallback(async (itemId: string, newQuantity: number) => {
    if (!user) return;
    if (newQuantity <= 0) {
      await removePantryItem(itemId);
    } else {
      const { error } = await supabase.from('pantry_items').update({ quantity: newQuantity }).eq('id', itemId);
      if(error) console.error("Error updating pantry quantity:", error);
      else setPantryItems(prev => prev.map(p => p.id === itemId ? { ...p, quantity: newQuantity } : p));
    }
  }, [user, removePantryItem]);
  
  const addCustomRecipe = useCallback(async (recipeData: RecipeFormData) => {
    if (!user) return;
    const newRecipeForDb = {
        user_id: user.id,
        name: recipeData.name,
        description: recipeData.description,
        image: recipeData.image || `https://placehold.co/600x400.png?text=${encodeURIComponent(recipeData.name)}`,
        servings: recipeData.servings,
        prep_time: recipeData.prepTime,
        cook_time: recipeData.cookTime,
        chill_time: recipeData.chillTime,
        ingredients: recipeData.ingredients.map(ing => ing.value),
        instructions: recipeData.instructions.map(inst => inst.value),
        macros_per_serving: {
          calories: recipeData.calories,
          protein: recipeData.protein,
          carbs: recipeData.carbs,
          fat: recipeData.fat,
        },
        tags: recipeData.tags,
    };
    const { data, error } = await supabase.from('recipes').insert(newRecipeForDb).select().single();
    if(error) console.error("Error adding custom recipe:", error);
    else if (data) {
      const addedRecipe: Recipe = {...data, isCustom: true, macrosPerServing: data.macros_per_serving};
      setUserRecipes(prev => [...prev, addedRecipe]);
    }
  }, [user]);

  const clearAllData = useCallback(async () => {
    if(!user) return;
    console.log("Clearing all user data...");
    await Promise.all([
        supabase.from('meal_plan_entries').delete().eq('user_id', user.id),
        supabase.from('pantry_items').delete().eq('user_id', user.id),
        supabase.from('recipes').delete().eq('user_id', user.id),
        // Don't delete shopping list, as it's derived.
        // Reset profile to default state
        supabase.from('profiles').update({
            macro_targets: null,
            dietary_preferences: [],
            allergens: [],
            meal_structure: DEFAULT_MEAL_STRUCTURE,
            favorite_recipe_ids: [],
        }).eq('id', user.id)
    ]);
    await fetchAllUserData(user.id);
  }, [user]);

  const getDailyMacros = useCallback((date: string): Macros => calculateTotalMacrosUtil(mealPlan.filter(pm => pm.date === date), allRecipesCache), [mealPlan, allRecipesCache]);
  const getMealsForDate = useCallback((date: string): PlannedMeal[] => mealPlan.filter(pm => pm.date === date), [mealPlan]);
  const parseIngredient = useCallback((ingredientString: string) => parseIngredientStringUtil(ingredientString), []);
  const assignIngredientCategory = useCallback((ingredientName: string) => assignCategoryUtil(ingredientName), []);
  const toggleShoppingListItem = useCallback(async (itemId: string) => { /* This is complex now - shopping list is derived. Might need a different approach. For now, it is a no-op */ }, []);

  const contextValue = useMemo(() => ({
    mealPlan, shoppingList, pantryItems, userProfile, allRecipesCache,
    addMealToPlan, removeMealFromPlan, updatePlannedMealServings, getDailyMacros,
    toggleShoppingListItem, clearMealPlanForDate, clearAllData, getMealsForDate,
    setMacroTargets, setDietaryPreferences, setAllergens, setMealStructure,
    setUserInformation, isRecipeCacheLoading, isAppDataLoading, favoriteRecipeIds, toggleFavoriteRecipe,
    isRecipeFavorite, addPantryItem, removePantryItem, updatePantryItemQuantity,
    parseIngredient, assignIngredientCategory, addCustomRecipe, userRecipes, setDashboardSettings,
  }), [
    mealPlan, shoppingList, pantryItems, userProfile, allRecipesCache, addMealToPlan, removeMealFromPlan,
    updatePlannedMealServings, getDailyMacros, toggleShoppingListItem,
    clearMealPlanForDate, clearAllData, getMealsForDate, setMacroTargets,
    setDietaryPreferences, setAllergens, setMealStructure, setUserInformation, isRecipeCacheLoading,
    isAppDataLoading, favoriteRecipeIds, toggleFavoriteRecipe, isRecipeFavorite,
    addPantryItem, removePantryItem, updatePantryItemQuantity, parseIngredient, assignIngredientCategory,
    addCustomRecipe, userRecipes, setDashboardSettings
  ]);

  if (isAppDataLoading && user) {
     return <div className="flex h-screen items-center justify-center bg-background text-foreground">Loading your data...</div>;
  }
  
  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
};

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider.');
  }
  return context;
};
