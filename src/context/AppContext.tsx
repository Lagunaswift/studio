
"use client";

import type React from 'react';
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
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
  AthleteType,
  PrimaryGoal,
  SubscriptionStatus,
  UKSupermarketCategory,
  RecipeFormData, // Added for custom recipe form
} from '@/types';
import { ACTIVITY_LEVEL_OPTIONS } from '@/types';
import { loadState, saveState } from '@/lib/localStorage';
import { getAllRecipes as getAllRecipesFromDataFile, calculateTotalMacros, generateShoppingList as generateShoppingListUtil, parseIngredientString as parseIngredientStringUtil, assignCategory as assignCategoryUtil } from '@/lib/data';

const MEAL_PLAN_KEY = 'macroTealMealPlan';
const SHOPPING_LIST_KEY = 'macroTealShoppingList';
const USER_PROFILE_KEY = 'macroTealUserProfile';
const FAVORITE_RECIPES_KEY = 'macroTealFavoriteRecipes';
const PANTRY_ITEMS_KEY = 'macroTealPantryItems';
const USER_RECIPES_KEY = 'macroTealUserRecipes'; // Key for user-created recipes

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
  allRecipesCache: Recipe[]; // This will be the combined list
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
  favoriteRecipeIds: number[];
  toggleFavoriteRecipe: (recipeId: number) => void;
  isRecipeFavorite: (recipeId: number) => boolean;
  addPantryItem: (name: string, quantity: number, unit: string, category: UKSupermarketCategory, expiryDate?: string) => void;
  removePantryItem: (itemId: string) => void;
  updatePantryItemQuantity: (itemId: string, newQuantity: number) => void;
  parseIngredient: (ingredientString: string) => { name: string; quantity: number; unit: string };
  assignIngredientCategory: (ingredientName: string) => UKSupermarketCategory;
  addCustomRecipe: (recipeData: RecipeFormData) => void; // Added for custom recipes
  userRecipes: Recipe[]; // Expose user recipes
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mealPlan, setMealPlan] = useState<PlannedMeal[]>([]);
  const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>([]);
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfileSettings | null>(null);
  
  const [staticRecipes, setStaticRecipes] = useState<Recipe[]>([]);
  const [userRecipes, setUserRecipes] = useState<Recipe[]>([]); // For user-created recipes
  
  const [isStaticRecipeLoading, setIsStaticRecipeLoading] = useState(true);
  const [isUserRecipeLoading, setIsUserRecipeLoading] = useState(true);
  
  const [favoriteRecipeIds, setFavoriteRecipeIds] = useState<number[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Combined recipe list
  const allRecipesCache = useMemo(() => {
    const combined = [...staticRecipes, ...userRecipes];
    // Ensure unique IDs if there's any overlap risk, though unlikely with current ID strategy
    const uniqueRecipes = Array.from(new Map(combined.map(recipe => [recipe.id, recipe])).values());
    return uniqueRecipes;
  }, [staticRecipes, userRecipes]);
  
  const isRecipeCacheLoading = isStaticRecipeLoading || isUserRecipeLoading;

  useEffect(() => {
    const initializeData = async () => {
      setIsStaticRecipeLoading(true);
      setIsUserRecipeLoading(true);
      
      let recipesFromFile: Recipe[] = [];
      try {
        recipesFromFile = await getAllRecipesFromDataFile();
        setStaticRecipes(recipesFromFile);
      } catch (error) {
        console.error("Failed to load static recipes:", error);
        setStaticRecipes([]);
      } finally {
        setIsStaticRecipeLoading(false);
      }

      const loadedUserRecipes = loadState<Recipe[]>(USER_RECIPES_KEY) || [];
      setUserRecipes(loadedUserRecipes);
      setIsUserRecipeLoading(false);

      const loadedMealPlan = loadState<PlannedMeal[]>(MEAL_PLAN_KEY) || [];
      const loadedShoppingList = loadState<ShoppingListItem[]>(SHOPPING_LIST_KEY) || [];
      let loadedUserProfile = loadState<UserProfileSettings>(USER_PROFILE_KEY);
      const loadedFavoriteRecipeIds = loadState<number[]>(FAVORITE_RECIPES_KEY) || [];
      setFavoriteRecipeIds(loadedFavoriteRecipeIds);
      const loadedPantryItems = loadState<PantryItem[]>(PANTRY_ITEMS_KEY) || [];
      setPantryItems(loadedPantryItems);

      if (!loadedUserProfile) {
        loadedUserProfile = { ...DEFAULT_USER_PROFILE };
      } else {
        loadedUserProfile = { ...DEFAULT_USER_PROFILE, ...loadedUserProfile };
      }
      for (const key in DEFAULT_USER_PROFILE) {
        if (loadedUserProfile[key as keyof UserProfileSettings] === undefined) {
          loadedUserProfile[key as keyof UserProfileSettings] = DEFAULT_USER_PROFILE[key as keyof UserProfileSettings];
        }
      }
      
      let initialBFP = loadedUserProfile.bodyFatPercentage;
      if (initialBFP === null) { 
        initialBFP = calculateNavyBodyFatPercentage(
          loadedUserProfile.sex, loadedUserProfile.heightCm, loadedUserProfile.neckCircumferenceCm,
          loadedUserProfile.abdomenCircumferenceCm, loadedUserProfile.waistCircumferenceCm, loadedUserProfile.hipCircumferenceCm
        );
      }
      loadedUserProfile.bodyFatPercentage = initialBFP; 
      loadedUserProfile.tdee = calculateTDEE(
        loadedUserProfile.weightKg, loadedUserProfile.heightCm, loadedUserProfile.age,
        loadedUserProfile.sex, loadedUserProfile.activityLevel
      );
      loadedUserProfile.leanBodyMassKg = calculateLBM(loadedUserProfile.weightKg, loadedUserProfile.bodyFatPercentage);
      setUserProfile(loadedUserProfile);
      
      // Defer meal plan processing until all recipes are potentially loaded
      // This will be handled by the useEffect that depends on allRecipesCache

      setIsInitialized(true); // Initialization flag set after all async and sync loads
    };
    initializeData();
  }, []);

  // Effect to update mealPlan with recipeDetails and regenerate shopping list when allRecipesCache changes
  useEffect(() => {
    if (isInitialized && !isRecipeCacheLoading) {
        const populatedMealPlan = mealPlan.map(pm => {
            if (!pm.recipeDetails || pm.recipeDetails.id !== pm.recipeId) { // Also check if details are stale
                const recipeDetails = allRecipesCache.find(r => r.id === pm.recipeId);
                return {...pm, recipeDetails: recipeDetails || undefined };
            }
            return pm;
        });
        setMealPlan(populatedMealPlan); // This will trigger the mealPlan save effect

        // Regenerate shopping list after meal plan is potentially updated and all recipes are loaded
        regenerateShoppingList(populatedMealPlan, pantryItems);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allRecipesCache, isInitialized, isRecipeCacheLoading, pantryItems]); // Add pantryItems dependency


  useEffect(() => {
    if (isInitialized && userProfile) {
      saveState(USER_PROFILE_KEY, userProfile);
    }
  }, [userProfile, isInitialized]);

  useEffect(() => {
    if (isInitialized && !isRecipeCacheLoading) { // Ensure recipes are loaded before saving meal plan without details
      saveState(MEAL_PLAN_KEY, mealPlan.map(({recipeDetails, ...pm}) => pm));
      regenerateShoppingList(mealPlan, pantryItems);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mealPlan, pantryItems, isInitialized, isRecipeCacheLoading]);

  useEffect(() => {
    if (isInitialized) {
      saveState(SHOPPING_LIST_KEY, shoppingList);
    }
  }, [shoppingList, isInitialized]);

  useEffect(() => {
    if (isInitialized) {
      saveState(FAVORITE_RECIPES_KEY, favoriteRecipeIds);
    }
  }, [favoriteRecipeIds, isInitialized]);

  useEffect(() => {
    if (isInitialized) {
      saveState(PANTRY_ITEMS_KEY, pantryItems);
      if(!isRecipeCacheLoading) regenerateShoppingList(mealPlan, pantryItems);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pantryItems, mealPlan, isInitialized, isRecipeCacheLoading]);

  useEffect(() => {
    if (isInitialized) {
        saveState(USER_RECIPES_KEY, userRecipes);
        // No direct need to regenerate shopping list here, as `allRecipesCache` memo will trigger its own effect
    }
  }, [userRecipes, isInitialized]);


  const regenerateShoppingList = useCallback((currentMealPlan: PlannedMeal[], currentPantryItems: PantryItem[]) => {
    if (isRecipeCacheLoading) return; // Don't regenerate if recipes aren't fully loaded
    const newShoppingList = generateShoppingListUtil(currentMealPlan, allRecipesCache, currentPantryItems);
    setShoppingList(newShoppingList);
  }, [allRecipesCache, isRecipeCacheLoading]);

  const addMealToPlan = useCallback((recipe: Recipe, date: string, mealType: MealType, servings: number) => {
    const newPlannedMeal: PlannedMeal = {
      id: `${recipe.id}-${date}-${mealType}-${Date.now()}`,
      recipeId: recipe.id,
      date,
      mealType,
      servings,
      recipeDetails: recipe,
    };
    setMealPlan(prev => [...prev, newPlannedMeal]);
  }, []);

  const removeMealFromPlan = useCallback((plannedMealId: string) => {
    setMealPlan(prev => prev.filter(pm => pm.id !== plannedMealId));
  }, []);

  const updatePlannedMealServings = useCallback((plannedMealId: string, newServings: number) => {
    setMealPlan(prev => 
      prev.map(pm =>
        pm.id === plannedMealId ? { ...pm, servings: newServings } : pm
      )
    );
  }, []);

  const getDailyMacros = useCallback((date: string): Macros => {
    if (isRecipeCacheLoading) return { protein: 0, carbs: 0, fat: 0, calories: 0 };
    const dailyMeals = mealPlan.filter(pm => pm.date === date);
    return calculateTotalMacros(dailyMeals, allRecipesCache);
  }, [mealPlan, allRecipesCache, isRecipeCacheLoading]);

  const getMealsForDate = useCallback((date: string): PlannedMeal[] => {
    if (isRecipeCacheLoading) return [];
    return mealPlan.filter(pm => pm.date === date).map(pm => ({
      ...pm,
      recipeDetails: pm.recipeDetails || allRecipesCache.find(r => r.id === pm.recipeId)
    }));
  }, [mealPlan, allRecipesCache, isRecipeCacheLoading]);

  const toggleShoppingListItem = useCallback((itemId: string) => {
    setShoppingList(prev =>
      prev.map(item =>
        item.id === itemId ? { ...item, purchased: !item.purchased } : item
      )
    );
  }, []);

  const clearMealPlanForDate = useCallback((date: string) => {
    setMealPlan(prev => prev.filter(pm => pm.date !== date));
  }, []);

  const clearAllData = useCallback(() => {
    setMealPlan([]);
    setShoppingList([]);
    setUserProfile({ ...DEFAULT_USER_PROFILE });
    setFavoriteRecipeIds([]);
    setPantryItems([]);
    setUserRecipes([]); // Clear user recipes
  }, []);

  const updateUserProfileState = useCallback((updates: Partial<UserProfileSettings>) => {
    setUserProfile(prevProfile => {
      const currentProfile = prevProfile || { ...DEFAULT_USER_PROFILE };
      let newProfileData = { ...currentProfile, ...updates };
      let finalBodyFatPercentage = newProfileData.bodyFatPercentage;
      if (updates.bodyFatPercentage !== undefined) finalBodyFatPercentage = updates.bodyFatPercentage;
      else if (finalBodyFatPercentage === null) {
        const navyBFP = calculateNavyBodyFatPercentage(
            newProfileData.sex, newProfileData.heightCm, newProfileData.neckCircumferenceCm,
            newProfileData.abdomenCircumferenceCm, newProfileData.waistCircumferenceCm, newProfileData.hipCircumferenceCm
        );
        if (navyBFP !== null && isFinite(navyBFP)) finalBodyFatPercentage = navyBFP;
      }
      newProfileData.bodyFatPercentage = finalBodyFatPercentage;
      newProfileData.leanBodyMassKg = calculateLBM(newProfileData.weightKg, newProfileData.bodyFatPercentage);
      newProfileData.tdee = calculateTDEE(
        newProfileData.weightKg, newProfileData.heightCm, newProfileData.age,
        newProfileData.sex, newProfileData.activityLevel
      );
      return newProfileData;
    });
  }, []);

  const setMacroTargets = useCallback((targets: MacroTargets) => updateUserProfileState({ macroTargets: targets }), [updateUserProfileState]);
  const setDietaryPreferences = useCallback((preferences: string[]) => updateUserProfileState({ dietaryPreferences: preferences }), [updateUserProfileState]);
  const setAllergens = useCallback((allergens: string[]) => updateUserProfileState({ allergens }), [updateUserProfileState]);
  const setMealStructure = useCallback((mealStructure: MealSlotConfig[]) => updateUserProfileState({ mealStructure }), [updateUserProfileState]);
  const setUserInformation = useCallback((info: Partial<UserProfileSettings>) => updateUserProfileState(info), [updateUserProfileState]);

  const toggleFavoriteRecipe = useCallback((recipeId: number) => {
    setFavoriteRecipeIds(prevIds => prevIds.includes(recipeId) ? prevIds.filter(id => id !== recipeId) : [...prevIds, recipeId]);
  }, []);

  const isRecipeFavorite = useCallback((recipeId: number): boolean => favoriteRecipeIds.includes(recipeId), [favoriteRecipeIds]);

  const addPantryItem = useCallback((name: string, quantity: number, unit: string, category: UKSupermarketCategory, expiryDate?: string) => {
    const id = `${name.toLowerCase().trim()}|${unit.toLowerCase().trim()}`;
    setPantryItems(prevItems => {
      const existingItemIndex = prevItems.findIndex(item => item.id === id);
      if (existingItemIndex > -1) {
        const updatedItems = [...prevItems];
        updatedItems[existingItemIndex].quantity += quantity;
        if (updatedItems[existingItemIndex].quantity <= 0) return updatedItems.filter((_, index) => index !== existingItemIndex);
        return updatedItems;
      } else if (quantity > 0) return [...prevItems, { id, name, quantity, unit, category, expiryDate }];
      return prevItems;
    });
  }, []);

  const removePantryItem = useCallback((itemId: string) => setPantryItems(prevItems => prevItems.filter(item => item.id !== itemId)), []);
  const updatePantryItemQuantity = useCallback((itemId: string, newQuantity: number) => {
    setPantryItems(prevItems => newQuantity <= 0 ? prevItems.filter(item => item.id !== itemId) : prevItems.map(item => item.id === itemId ? { ...item, quantity: newQuantity } : item));
  }, []);
  
  const parseIngredient = useCallback((ingredientString: string) => parseIngredientStringUtil(ingredientString), []);
  const assignIngredientCategory = useCallback((ingredientName: string) => assignCategoryUtil(ingredientName), []);

  const addCustomRecipe = useCallback((recipeData: RecipeFormData) => {
    setUserRecipes(prevUserRecipes => {
      const highestCurrentId = Math.max(
        0, 
        ...staticRecipes.map(r => r.id), 
        ...prevUserRecipes.map(r => r.id)
      );
      const newId = Math.max(10000, highestCurrentId + 1); // Start custom IDs high

      const newRecipe: Recipe = {
        id: newId,
        name: recipeData.name,
        description: recipeData.description || "",
        image: recipeData.image || `https://placehold.co/600x400.png?text=${encodeURIComponent(recipeData.name)}`,
        servings: recipeData.servings,
        prepTime: recipeData.prepTime,
        cookTime: recipeData.cookTime,
        chillTime: recipeData.chillTime || undefined,
        ingredients: recipeData.ingredients.map(ing => ing.value),
        macrosPerServing: {
          calories: recipeData.calories,
          protein: recipeData.protein,
          carbs: recipeData.carbs,
          fat: recipeData.fat,
        },
        instructions: recipeData.instructions.map(inst => inst.value),
        tags: recipeData.tags || [], // Ensure tags is an array
        isCustom: true,
        // Redundant fields, populated from macrosPerServing for consistency
        calories: recipeData.calories,
        protein: recipeData.protein,
        carbs: recipeData.carbs,
        fat: recipeData.fat,
      };
      return [...prevUserRecipes, newRecipe];
    });
  }, [staticRecipes]);


  const contextValue = useMemo(() => ({
    mealPlan, shoppingList, pantryItems, userProfile, allRecipesCache,
    addMealToPlan, removeMealFromPlan, updatePlannedMealServings, getDailyMacros,
    toggleShoppingListItem, clearMealPlanForDate, clearAllData, getMealsForDate,
    setMacroTargets, setDietaryPreferences, setAllergens, setMealStructure,
    setUserInformation, isRecipeCacheLoading, favoriteRecipeIds, toggleFavoriteRecipe,
    isRecipeFavorite, addPantryItem, removePantryItem, updatePantryItemQuantity,
    parseIngredient, assignIngredientCategory, addCustomRecipe, userRecipes,
  }), [
    mealPlan, shoppingList, pantryItems, userProfile, allRecipesCache, addMealToPlan, removeMealFromPlan,
    updatePlannedMealServings, getDailyMacros, toggleShoppingListItem,
    clearMealPlanForDate, clearAllData, getMealsForDate, setMacroTargets,
    setDietaryPreferences, setAllergens, setMealStructure, setUserInformation, isRecipeCacheLoading,
    favoriteRecipeIds, toggleFavoriteRecipe, isRecipeFavorite,
    addPantryItem, removePantryItem, updatePantryItemQuantity, parseIngredient, assignIngredientCategory,
    addCustomRecipe, userRecipes
  ]);

  if (!isInitialized && isRecipeCacheLoading) {
     return <div className="flex h-screen items-center justify-center">Loading application data...</div>; // Or a proper loader component
  }
  
  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
};

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider. Context might not be initialized yet.');
  }
  return context;
};
