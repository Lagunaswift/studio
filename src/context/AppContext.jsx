

//src/context/AppContext.tsx
"use client";
import React, { createContext, useContext, useMemo, useCallback, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, where, doc, } from "firebase/firestore";
import { UserProfileSettingsSchema } from '@/types';
import { ACTIVITY_LEVEL_OPTIONS } from '@/types';
import { calculateTotalMacros as calculateTotalMacrosUtil, generateShoppingList as generateShoppingListUtil, assignCategory as assignCategoryUtil, calculateTrendWeight } from '@/lib/data';
import { runPreppy } from '@/ai/flows/pro-coach-flow';
import { format, subDays, differenceInDays } from 'date-fns';
import { addOrUpdateMealPlan, deleteMealFromPlan, addOrUpdatePantryItem, deletePantryItem, addRecipe as addRecipeAction, updateUserProfile } from '@/app/(main)/profile/actions';

// --- Calculation Helpers ---
const processProfile = (profileData) => {
    if (!profileData)
        return null;
    const validation = UserProfileSettingsSchema.safeParse(profileData);
    if (!validation.success) {
        console.warn("Invalid user profile data, using defaults. Errors:", validation.error.flatten());
        return null;
    }
    const p = { ...validation.data };
    p.tdee = calculateTDEE(p.weightKg, p.heightCm, p.age, p.sex, p.activityLevel);
    p.leanBodyMassKg = calculateLBM(p.weightKg, p.bodyFatPercentage);
    p.rda = getRdaProfile(p.sex, p.age);
    return p;
};
const calculateLBM = (weightKg, bodyFatPercentage) => {
    if (weightKg && weightKg > 0 && bodyFatPercentage && bodyFatPercentage > 0 && bodyFatPercentage < 100) {
        const lbm = weightKg * (1 - bodyFatPercentage / 100);
        if (isNaN(lbm) || !isFinite(lbm) || lbm <= 0)
            return null;
        return parseFloat(lbm.toFixed(1));
    }
    return null;
};
const calculateTDEE = (weightKg, heightCm, age, sex, activityLevel) => {
    if (!weightKg || !heightCm || !age || !sex || !activityLevel)
        return null;
    let bmr;
    if (sex === 'male')
        bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
    else
        bmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
    const activity = ACTIVITY_LEVEL_OPTIONS.find(opt => opt.value === activityLevel);
    if (activity) {
        const tdee = bmr * activity.multiplier;
        if (isNaN(tdee) || !isFinite(tdee) || tdee <= 0)
            return null;
        return Math.round(tdee);
    }
    return null;
};
const getRdaProfile = (sex, age) => {
    if (!sex || !age) {
        return null;
    }
    // Simplified RDA values for demonstration. A real app would use a more complex table.
    // Values are for adults aged 19-50.
    if (age >= 19 && age <= 50) {
        if (sex === 'male') {
            return { iron: 8, calcium: 1000, potassium: 3400, vitaminA: 900, vitaminC: 90, vitaminD: 15 };
        }
        else { // female
            return { iron: 18, calcium: 1000, potassium: 2600, vitaminA: 700, vitaminC: 75, vitaminD: 15 };
        }
    }
    // Default for other age groups for now
    return { iron: 10, calcium: 1200, potassium: 3000, vitaminA: 800, vitaminC: 80, vitaminD: 15 };
};

const getDefaultUserProfile = (userId, userEmail) => {
  return {
    id: userId,
    email: userEmail,
    name: null,
    macroTargets: null,
    dietaryPreferences: [],
    allergens: [],
    mealStructure: [
      { id: '1', name: 'Breakfast', type: 'Breakfast' },
      { id: '2', name: 'Lunch', type: 'Lunch' },
      { id: '3', name: 'Dinner', type: 'Dinner' },
      { id: '4', name: 'Snack', type: 'Snack' },
    ],
    heightCm: null,
    weightKg: null,
    age: null,
    sex: 'notSpecified',
    activityLevel: 'notSpecified',
    training_experience_level: 'notSpecified',
    bodyFatPercentage: null,
    athleteType: 'notSpecified',
    primaryGoal: 'notSpecified',
    tdee: null,
    leanBodyMassKg: null,
    rda: null,
    subscription_status: 'none',
    has_accepted_terms: false,
    last_check_in_date: null,
    target_weight_change_rate_kg: null,
    dashboardSettings: { showMacros: true, showMenu: true, showFeaturedRecipe: true, showQuickRecipes: true },
    favorite_recipe_ids: [],
  };
}

const AppContext = createContext(undefined);

export const AppProvider = ({ children }) => {
    const { user, isLoading: isAuthLoading } = useAuth();
    const [userProfile, setUserProfile] = useState(null);
    const [userRecipes, setUserRecipes] = useState([]);
    const [builtInRecipes, setBuiltInRecipes] = useState([]);
    const [mealPlan, setMealPlan] = useState([]);
    const [pantryItems, setPantryItems] = useState([]);
    const [dailyWeightLog, setDailyWeightLog] = useState([]);
    const [dailyVitalsLog, setDailyVitalsLog] = useState([]);
    const [dailyManualMacrosLog, setDailyManualMacrosLog] = useState([]);
    const [isDataLoading, setIsDataLoading] = useState(true);
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
        const unsubscribes = [];
        setIsRecipeCacheLoading(true);
        const builtInQuery = query(collection(db, "recipes"), where("user_id", "==", null));
        unsubscribes.push(onSnapshot(builtInQuery, (snapshot) => {
            const recipes = snapshot.docs.map(doc => ({ id: parseInt(doc.id, 10), ...doc.data() }));
            setBuiltInRecipes(recipes);
            setIsRecipeCacheLoading(false);
        }, (error) => {
            console.error("Error fetching built-in recipes:", error);
            setIsRecipeCacheLoading(false);
        }));

        if (user?.uid) {
            setIsDataLoading(true);

            const profileUnsub = onSnapshot(doc(db, "profiles", user.uid), (doc) => {
                if (doc.exists()) {
                    setUserProfile(processProfile(doc.data()));
                } else {
                    const defaultProfile = getDefaultUserProfile(user.uid, user.email);
                    setUserProfile(processProfile(defaultProfile));
                }
            });
            unsubscribes.push(profileUnsub);

            const collections = [
                { name: "recipes", setter: setUserRecipes },
                { name: "planned_meals", setter: setMealPlan },
                { name: "pantry_items", setter: setPantryItems },
                { name: "daily_weight_logs", setter: setDailyWeightLog },
                { name: "daily_vitals_logs", setter: setDailyVitalsLog },
                { name: "daily_manual_macros_logs", setter: setDailyManualMacrosLog },
            ];
            collections.forEach(c => {
                const q = query(collection(db, c.name), where("user_id", "==", user.uid));
                unsubscribes.push(onSnapshot(q, (querySnapshot) => {
                    const items = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    c.setter(items);
                }));
            });
            const initialLoadTimer = setTimeout(() => setIsDataLoading(false), 2000);
            unsubscribes.push(() => clearTimeout(initialLoadTimer));
        } else if (!isAuthLoading) {
            setIsDataLoading(false);
            setUserProfile(null);
            setUserRecipes([]);
            setMealPlan([]);
            setPantryItems([]);
            setDailyWeightLog([]);
            setDailyVitalsLog([]);
            setDailyManualMacrosLog([]);
        }

        return () => unsubscribes.forEach(unsub => unsub());
    }, [user?.uid, user?.email, isAuthLoading]);

    const isSubscribed = useMemo(() => userProfile?.subscription_status === 'active', [userProfile?.subscription_status]);
    const isAppDataLoading = isAuthLoading || isDataLoading;
    const allRecipesCache = useMemo(() => {
        let recipes = [...userRecipes, ...builtInRecipes];
        recipes = Array.from(new Map(recipes.map(recipe => [recipe.id, recipe])).values());
        if (isSubscribed) {
            return recipes;
        }
        else {
            const freeRecipes = recipes.filter(r => !r.isCustom).slice(0, 15);
            const customRecipes = recipes.filter(r => r.isCustom);
            return [...freeRecipes, ...customRecipes];
        }
    }, [userRecipes, builtInRecipes, isSubscribed]);

    const shoppingList = useMemo(() => {
        if (isAppDataLoading || !mealPlan || !allRecipesCache || !pantryItems)
            return [];
        return generateShoppingListUtil(mealPlan, allRecipesCache, pantryItems);
    }, [mealPlan, pantryItems, allRecipesCache, isAppDataLoading]);

    const getConsumedMacrosForDate = useCallback((date) => {
        const manualLog = dailyManualMacrosLog?.find(log => log.date === date);
        if (manualLog) {
            return manualLog.macros;
        }
        return calculateTotalMacrosUtil(mealPlan?.filter(pm => pm.date === date && pm.status === 'eaten') || [], allRecipesCache);
    }, [mealPlan, allRecipesCache, dailyManualMacrosLog]);

    const callServerActionWithAuth = useCallback(async (action, ...args) => {
        if (!user) {
            throw new Error("You must be logged in to perform this action.");
        }
        const idToken = await user.getIdToken(true);
        return action(idToken, ...args);
    }, [user]);

    const setUserInformation = useCallback(async (updates) => {
        await callServerActionWithAuth(updateUserProfile, updates);
    }, [callServerActionWithAuth]);
    
    const runWeeklyCheckin = useCallback(async () => {
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

        const latestTrendWeight = recentWeightLogs[0].trendWeightKg;
        const oldestTrendWeight = recentWeightLogs[recentWeightLogs.length - 1].trendWeightKg;
        const weightChangeKg = latestTrendWeight - oldestTrendWeight;
        const durationDays = differenceInDays(new Date(recentWeightLogs[0].date), new Date(recentWeightLogs[recentWeightLogs.length - 1].date)) || 1;
        const actualWeeklyWeightChangeKg = (weightChangeKg / durationDays) * 7;

        const caloriesFromWeightChange = weightChangeKg * 7700;
        const averageDailyDeficitOrSurplus = caloriesFromWeightChange / durationDays;
        const newDynamicTDEE = Math.round(averageDailyCalories - averageDailyDeficitOrSurplus);

        if (isNaN(newDynamicTDEE) || newDynamicTDEE <= 0) {
          return { success: false, message: "Calculation resulted in an invalid TDEE. Check your logged data for consistency." };
        }
        
        const preppyInput = {
          primaryGoal: userProfile.primaryGoal || 'maintenance',
          targetWeightChangeRateKg: userProfile.target_weight_change_rate_kg || 0,
          dynamicTdee: newDynamicTDEE,
          actualAvgCalories: averageDailyCalories,
          actualWeeklyWeightChangeKg: actualWeeklyWeightChangeKg,
          currentProteinTarget: userProfile.macroTargets?.protein || 0,
          currentFatTarget: userProfile.macroTargets?.fat || 0,
        };

        const recommendation = await runPreppy(preppyInput);
        
        await callServerActionWithAuth(updateUserProfile, { tdee: newDynamicTDEE, last_check_in_date: format(new Date(), 'yyyy-MM-dd') });

        return { success: true, message: "Check-in complete!", recommendation };
    }, [userProfile, dailyWeightLog, getConsumedMacrosForDate, callServerActionWithAuth]);


    const contextValue = useMemo(() => ({
        userProfile,
        userRecipes,
        mealPlan,
        pantryItems,
        isAppDataLoading,
        isRecipeCacheLoading,
        isSubscribed,
        isOnline,
        allRecipesCache,
        shoppingList,
        getConsumedMacrosForDate,
        getPlannedMacrosForDate: (date) => calculateTotalMacrosUtil(mealPlan.filter(pm => pm.date === date), allRecipesCache),
        getMealsForDate: (date) => mealPlan.filter(pm => pm.date === date).map(pm => ({ ...pm, recipeDetails: allRecipesCache.find(r => r.id === pm.recipeId) })),
        isRecipeFavorite: (recipeId) => userProfile?.favorite_recipe_ids?.includes(recipeId) || false,
        addMealToPlan: (recipe, date, mealType, servings) => {
            const newPlannedMeal = {
                recipeId: recipe.id,
                date,
                mealType,
                servings,
                status: 'planned',
            };
            return callServerActionWithAuth(addOrUpdateMealPlan, newPlannedMeal);
        },
        removeMealFromPlan: (plannedMealId) => callServerActionWithAuth(deleteMealFromPlan, plannedMealId),
        updatePlannedMealServings: (plannedMealId, newServings) => {
            const meal = mealPlan.find(m => m.id === plannedMealId);
            if (!meal) throw new Error("Meal not found locally.");
            const { recipeDetails, ...restOfMeal } = meal;
            const updatedMealData = { ...restOfMeal, servings: newServings };
            return callServerActionWithAuth(addOrUpdateMealPlan, updatedMealData);
        },
        updateMealStatus: (plannedMealId, status) => {
            const meal = mealPlan.find(m => m.id === plannedMealId);
            if (!meal) throw new Error("Meal not found locally.");
            const { recipeDetails, ...restOfMeal } = meal;
            const updatedMealData = { ...restOfMeal, status };
            return callServerActionWithAuth(addOrUpdateMealPlan, updatedMealData);
        },
        clearMealPlanForDate: (date) => {
            const mealsToDelete = mealPlan.filter(pm => pm.date === date);
            mealsToDelete.forEach(meal => callServerActionWithAuth(deleteMealFromPlan, meal.id));
        },
        clearEntireMealPlan: () => {
            mealPlan.forEach(meal => callServerActionWithAuth(deleteMealFromPlan, meal.id));
        },
        toggleFavoriteRecipe: async (recipeId) => {
            if (!userProfile) return;
            const currentFavorites = userProfile.favorite_recipe_ids || [];
            const newFavorites = currentFavorites.includes(recipeId)
                ? currentFavorites.filter(id => id !== recipeId)
                : [...currentFavorites, recipeId];
            await setUserInformation({ favorite_recipe_ids: newFavorites });
        },
        toggleShoppingListItem: async (itemId) => {
             console.warn("Toggling shopping list item is not implemented with Firestore yet.");
        },
        addPantryItem: async (name, quantity, unit, category, expiryDate) => {
            const existingItem = pantryItems.find(item => item.name.toLowerCase() === name.toLowerCase() && item.unit === unit);
            let itemToSave;
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
                    category: category,
                    expiryDate
                };
            }
            await callServerActionWithAuth(addOrUpdatePantryItem, itemToSave);
        },
        removePantryItem: (itemId) => callServerActionWithAuth(deletePantryItem, itemId),
        updatePantryItemQuantity: (itemId, newQuantity) => {
            if (newQuantity <= 0) {
                return callServerActionWithAuth(deletePantryItem, itemId);
            }
            const item = pantryItems.find(p => p.id === itemId);
            if (!item) throw new Error("Pantry item not found locally.");
            const { user_id, ...restOfItem } = item;
            const updatedItem = { ...restOfItem, quantity: newQuantity };
            return callServerActionWithAuth(addOrUpdatePantryItem, updatedItem);
        },
        addCustomRecipe: (recipeData) => callServerActionWithAuth(addRecipeAction, recipeData),
        runWeeklyCheckin,
        setUserInformation,
        setMacroTargets: (targets) => setUserInformation({ macroTargets: targets }),
        setMealStructure: (structure) => setUserInformation({ mealStructure: structure }),
        setDashboardSettings: (settings) => {
            const defaultSettings = { showMacros: true, showMenu: true, showFeaturedRecipe: true, showQuickRecipes: true };
            const newSettings = { ...(userProfile?.dashboardSettings || defaultSettings), ...settings };
            setUserInformation({ dashboardSettings: newSettings });
        },
        acceptTerms: () => setUserInformation({ has_accepted_terms: true }),
        assignIngredientCategory: assignCategoryUtil,
    }), [
        userProfile, userRecipes, builtInRecipes, mealPlan, pantryItems, dailyManualMacrosLog,
        isAppDataLoading, isRecipeCacheLoading, isSubscribed, isOnline,
        allRecipesCache, shoppingList, getConsumedMacrosForDate,
        callServerActionWithAuth, setUserInformation, runWeeklyCheckin
    ]);
    
    return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
};
export const useAppContext = () => {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useAppContext must be used within an AppProvider.');
    }
    return context;
};
