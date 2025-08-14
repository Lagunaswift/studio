// src/app/(main)/ai-suggestions/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Lightbulb, ChefHat, Sparkles, Send, Info, PlusCircle } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import type { Macros } from '@/types';
import { MacroDisplay } from '@/components/shared/MacroDisplay';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { ProFeature } from '@/components/shared/ProFeature';
import { checkSubscriptionLimit, trackUsage } from '@/lib/subscriptionVerification';
import { MiniUpgradeButton } from '@/components/subscription/CheckoutButton';
import { safeLocalStorage } from '@/lib/safe-storage';
import { addMealToDay } from '@/app/(main)/profile/actions';

// Your actual recipe data structure (macros as individual properties)
interface RecipeWithDirectMacros {
  id: number;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servings: number;
  ingredients: string[];
  instructions: string[];
  tags?: string[];
  prepTime?: string;
  cookTime?: string;
  chillTime?: string;
  isCustom?: boolean;
  user_id?: string | null;
}

// Your actual meal slot config structure
interface MealSlotConfigLocal {
  id: string;
  name: string;
  type: string;
  displayName?: string;
}

interface MealSlotForAI {
  id: string;
  name: string;
  type: string;
}

interface PlannedRecipeItem {
  recipeId: number;
  recipeName: string;
  mealSlotId: string;
  mealSlotName: string;
  servings: number;
  calculatedMacros: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

interface SuggestMealPlanOutput {
  plannedMeals: PlannedRecipeItem[];
  totalAchievedMacros: Macros;
  aiJustification: string;
  fitnessAssessment: string;
}

// FIXED: generateFallbackMealPlan with proper error handling for your data structure
const generateFallbackMealPlan = (
  availableRecipes: RecipeWithDirectMacros[],
  mealStructure: MealSlotConfigLocal[],
  macroTargets?: { calories: number; protein: number; carbs: number; fat: number }
): SuggestMealPlanOutput => {
  console.log('generateFallbackMealPlan called with:', {
    recipeCount: availableRecipes?.length || 0,
    mealSlotCount: mealStructure?.length || 0,
    hasTargets: !!macroTargets
  });

  // Validate inputs - this prevents the original error
  if (!availableRecipes || !Array.isArray(availableRecipes) || availableRecipes.length === 0) {
    console.warn('No recipes available for fallback meal plan');
    return {
      plannedMeals: [],
      totalAchievedMacros: { calories: 0, protein: 0, carbs: 0, fat: 0 },
      aiJustification: "No recipes available to create a meal plan. Please add some recipes to your collection first.",
      fitnessAssessment: "Unable to assess without available recipes."
    };
  }

  if (!mealStructure || !Array.isArray(mealStructure) || mealStructure.length === 0) {
    console.warn('No meal structure available for fallback meal plan');
    return {
      plannedMeals: [],
      totalAchievedMacros: { calories: 0, protein: 0, carbs: 0, fat: 0 },
      aiJustification: "No meal structure defined to create a plan. Please set up your meal structure in settings.",
      fitnessAssessment: "Unable to assess without meal structure."
    };
  }

  // CRITICAL FIX: Filter out recipes with missing or invalid macro data
  // Updated to work with your actual data structure (macros as individual properties)
  const validRecipes = availableRecipes.filter((recipe, index) => {
    // Check if recipe exists and has required properties
    if (!recipe) {
      console.warn(`Recipe at index ${index} is null/undefined`);
      return false;
    }

    if (!recipe.id || !recipe.name) {
      console.warn(`Recipe at index ${index} missing id or name:`, recipe);
      return false;
    }

    // Check for macros as individual properties (your actual data structure)
    if (
      typeof recipe.calories !== 'number' ||
      typeof recipe.protein !== 'number' ||
      typeof recipe.carbs !== 'number' ||
      typeof recipe.fat !== 'number' ||
      isNaN(recipe.calories) ||
      isNaN(recipe.protein) ||
      isNaN(recipe.carbs) ||
      isNaN(recipe.fat)
    ) {
      console.warn(`Recipe "${recipe.name}" has invalid macro data - calories: ${recipe.calories}, protein: ${recipe.protein}, carbs: ${recipe.carbs}, fat: ${recipe.fat}`);
      return false;
    }

    return true;
  });

  console.log(`Filtered ${availableRecipes.length} recipes down to ${validRecipes.length} valid recipes`);

  if (validRecipes.length === 0) {
    console.error('No valid recipes found after filtering - this indicates a data quality issue');
    return {
      plannedMeals: [],
      totalAchievedMacros: { calories: 0, protein: 0, carbs: 0, fat: 0 },
      aiJustification: "No valid recipes with proper macro data available. Please check your recipe database for missing nutrition information.",
      fitnessAssessment: "Unable to create a balanced meal plan without valid recipe data."
    };
  }

  const plannedMeals: PlannedRecipeItem[] = [];
  const totalMacros = { calories: 0, protein: 0, carbs: 0, fat: 0 };

  // Create fallback plan using valid recipes
  mealStructure.forEach((slot, index) => {
    // Use modulo to cycle through available recipes
    const recipeIndex = index % validRecipes.length;
    const selectedRecipe = validRecipes[recipeIndex];
    
    // Double-check even after filtering (defensive programming)
    if (!selectedRecipe) {
      console.warn(`Skipping meal slot ${slot.displayName || slot.name || `slot-${index}`} - recipe issue`);
      return;
    }

    const servings = 1; // Simple fallback serving size
    
    // Safe macro calculation using individual macro properties (your data structure)
    const calculatedMacros = {
      calories: (selectedRecipe.calories || 0) * servings,
      protein: (selectedRecipe.protein || 0) * servings,
      carbs: (selectedRecipe.carbs || 0) * servings,
      fat: (selectedRecipe.fat || 0) * servings,
    };

    const plannedMeal: PlannedRecipeItem = {
      recipeId: selectedRecipe.id,
      recipeName: selectedRecipe.name,
      mealSlotId: slot.id || `fallback-${index}`,
      mealSlotName: slot.displayName || slot.name || `Meal ${index + 1}`,
      servings: servings,
      calculatedMacros: calculatedMacros
    };

    plannedMeals.push(plannedMeal);

    // Safely add to totals
    totalMacros.calories += calculatedMacros.calories;
    totalMacros.protein += calculatedMacros.protein;
    totalMacros.carbs += calculatedMacros.carbs;
    totalMacros.fat += calculatedMacros.fat;
  });

  // Generate assessment based on results
  const assessmentText = macroTargets 
    ? `Total calories: ${Math.round(totalMacros.calories)} (target: ${macroTargets.calories}). This fallback plan provides ${Math.round((totalMacros.calories / macroTargets.calories) * 100)}% of your calorie target.`
    : `Total calories: ${Math.round(totalMacros.calories)}. Consider setting macro targets for better meal planning.`;

  return {
    plannedMeals,
    totalAchievedMacros: totalMacros,
    aiJustification: `Created a simple fallback meal plan using ${plannedMeals.length} available recipes from your collection. This is a basic plan when AI suggestions are unavailable.`,
    fitnessAssessment: assessmentText
  };
};

// Demo meal plan generation for extreme fallback cases
const generateDemoMealPlan = (
  userProfile: any, 
  mealStructure: MealSlotForAI[]
): SuggestMealPlanOutput => {
  console.log('⚠️ Generating demo meal plan (no recipes available)...');

  const plannedMeals: PlannedRecipeItem[] = [];
  const targetCalories = userProfile?.macroTargets?.calories || 2000;
  const caloriesPerMeal = targetCalories / mealStructure.length;

  for (let i = 0; i < mealStructure.length; i++) {
    const slot = mealStructure[i];
    
    const meal: PlannedRecipeItem = {
      recipeId: i + 1,
      recipeName: `Sample ${slot.name} Recipe`,
      mealSlotId: slot.id,
      mealSlotName: slot.name,
      servings: 1,
      calculatedMacros: {
        calories: Math.round(caloriesPerMeal),
        protein: Math.round(caloriesPerMeal * 0.2 / 4), // 20% protein
        carbs: Math.round(caloriesPerMeal * 0.5 / 4), // 50% carbs  
        fat: Math.round(caloriesPerMeal * 0.3 / 9), // 30% fat
      }
    };
    
    plannedMeals.push(meal);
  }

  const totalMacros = plannedMeals.reduce((total, meal) => ({
    calories: total.calories + meal.calculatedMacros.calories,
    protein: total.protein + meal.calculatedMacros.protein,
    carbs: total.carbs + meal.calculatedMacros.carbs,
    fat: total.fat + meal.calculatedMacros.fat,
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

  return {
    plannedMeals,
    totalAchievedMacros: totalMacros,
    aiJustification: `Demo meal plan created targeting ${targetCalories} calories across your ${mealStructure.length} meal slots. Please add real recipes to your collection for Preppy's personalized suggestions.`,
    fitnessAssessment: `This demo plan provides ${totalMacros.calories} calories with a balanced macro distribution. Add recipes to get personalized suggestions from Preppy.`
  };
};

export default function AISuggestionsPage() {
  const {
    addMealToPlan,
    allRecipesCache,
    isRecipeCacheLoading: isAppRecipeCacheLoading,
    userProfile,
    isSubscribed,
    setUserInformation,
    mealPlan
  } = useAppContext();

  const { user, isLoading: isAuthLoading } = useAuth();
  const { toast } = useToast();
  
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [suggestion, setSuggestion] = useState<SuggestMealPlanOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dailyUsageCount, setDailyUsageCount] = useState(0);

  // Free tier limits
  const FREE_DAILY_GENERATIONS = 1;

  const userSettingsToUse = userProfile;

  // Load daily usage count from localStorage on mount
  useEffect(() => {
    if (!user) return;
    
    const today = format(new Date(), 'yyyy-MM-dd');
    const storageKey = `ai_usage_${user.uid}_${today}`;
    const storedCount = safeLocalStorage.getItem(storageKey);
    setDailyUsageCount(storedCount ? parseInt(storedCount, 10) : 0);
  }, [user]);

  // Check subscription limits using enhanced verification
  const checkLimitsBeforeGeneration = (): boolean => {
    if (!user) return false;
    
    const limitCheck = checkSubscriptionLimit(user.uid, 'aiRequest', userProfile);
    
    if (!limitCheck.allowed) {
      toast({
        title: "Limit Reached",
        description: limitCheck.reason || "You've reached your usage limit.",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  // Increment usage count
  const incrementUsageCount = () => {
    if (!user) return;
    
    const today = format(new Date(), 'yyyy-MM-dd');
    const storageKey = `ai_usage_${user.uid}_${today}`;
    const newCount = dailyUsageCount + 1;
    
    safeLocalStorage.setItem(storageKey, newCount.toString());
    setDailyUsageCount(newCount);
  };

  // FIXED: handleGeneratePlan to use real AI API
  const handleGeneratePlan = async () => {
    console.log('🎬 Starting handleGeneratePlan with real AI...');

    // Check subscription limits before proceeding
    if (!checkLimitsBeforeGeneration()) {
      return;
    }

    if (!userSettingsToUse) {
      setError("User profile not loaded. Please wait or try refreshing.");
      return;
    }

    if (!userSettingsToUse.mealStructure || userSettingsToUse.mealStructure.length === 0) {
      setError("Please set up your meal structure in Profile Settings before generating a plan.");
      return;
    }

    if (!allRecipesCache || allRecipesCache.length === 0) {
      setError("No recipes available. Please add some recipes to your collection first.");
      return;
    }

    // Filter and validate recipes for AI
    const validRecipes = allRecipesCache.filter((recipe: any) => 
      recipe && 
      recipe.id &&
      recipe.name &&
      typeof recipe.calories === 'number' &&
      typeof recipe.protein === 'number' &&
      typeof recipe.carbs === 'number' &&
      typeof recipe.fat === 'number'
    );

    if (validRecipes.length === 0) {
      setError('No recipes with valid macro data found. Please check your recipe database.');
      return;
    }

    setIsGeneratingPlan(true);
    setError(null);
    setSuggestion(null);

    // Prepare data for AI API in the format expected by the schema
    const requestBody = {
      macroTargets: userSettingsToUse.macroTargets ? {
        calories: userSettingsToUse.macroTargets.calories || 0,
        protein: userSettingsToUse.macroTargets.protein || 0,
        carbs: userSettingsToUse.macroTargets.carbs || 0,
        fat: userSettingsToUse.macroTargets.fat || 0
      } : null,
      dietaryPreferences: userSettingsToUse.dietaryPreferences || [],
      allergens: userSettingsToUse.allergens || [],
      mealStructure: userSettingsToUse.mealStructure.map((ms: any) => ({
        id: ms.id,
        name: ms.name,
        type: ms.type,
      })),
      availableRecipes: validRecipes.map((recipe: any) => ({
        id: recipe.id,
        name: recipe.name,
        macrosPerServing: {
          calories: recipe.calories,
          protein: recipe.protein,
          carbs: recipe.carbs,
          fat: recipe.fat
        },
        tags: recipe.tags || []
      })),
      currentDate: format(new Date(), 'yyyy-MM-dd')
    };

    try {
      console.log('🚀 Calling Preppy API with:', { 
        recipeCount: validRecipes.length, 
        mealSlots: userSettingsToUse.mealStructure.length,
        hasTargets: !!userSettingsToUse.macroTargets
      });

      console.log('📡 Request body summary:', {
        macroTargets: requestBody.macroTargets,
        mealStructureLength: requestBody.mealStructure.length,
        recipeCount: requestBody.availableRecipes.length,
        sampleRecipe: requestBody.availableRecipes[0],
        dietaryPreferences: requestBody.dietaryPreferences,
        allergens: requestBody.allergens
      });

      const response = await fetch('/api/ai/suggest-meal-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      console.log('📥 Response status:', response.status, response.statusText);

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: Failed to generate meal plan`;
        let errorDetails = null;
        try {
          const responseText = await response.text();
          console.error('❌ Error response text:', responseText);
          try {
            const errorData = JSON.parse(responseText);
            console.error('❌ Parsed error data:', errorData);
            errorMessage = errorData.error || errorData.details || errorMessage;
            errorDetails = errorData;
          } catch (jsonParseError) {
            // If it's not JSON, use the raw text
            console.error('❌ Could not parse error as JSON:', jsonParseError);
            errorMessage = responseText || errorMessage;
          }
        } catch (textError) {
          console.error('❌ Could not read error response:', textError);
        }
        
        console.error('❌ Final error message:', errorMessage);
        console.error('❌ Full error details:', errorDetails);
        throw new Error(errorMessage);
      }

      const result = await response.json();
      setSuggestion(result);
      
      // Track usage after successful generation
      if (user) {
        trackUsage(user.uid, 'aiRequest');
      }
      
      toast({
        title: "Meal Plan Generated!",
        description: "Preppy has created your personalized meal plan",
        variant: "default",
      });

    } catch (err: any) {
      console.error("AI meal plan error:", err);
      
      // Try fallback meal plan generation only as last resort
      try {
        console.log('⚠️ AI failed, trying fallback...');
        
        const mealStructureLocal: MealSlotConfigLocal[] = userSettingsToUse.mealStructure.map((ms: any) => ({
          id: ms.id,
          name: ms.name,
          type: ms.type,
        }));
        
        const fallbackResult = generateFallbackMealPlan(
          validRecipes as unknown as RecipeWithDirectMacros[],
          mealStructureLocal,
          userSettingsToUse.macroTargets || undefined
        );
        setSuggestion(fallbackResult);
        
        // Track usage for fallback generation too
        if (user) {
          trackUsage(user.uid, 'aiRequest');
        }
        
        setError(`Preppy temporarily unavailable: ${err.message}. Showing a simple fallback plan instead.`);
      } catch (fallbackError: any) {
        console.error('Even fallback failed:', fallbackError);
        setError(`Failed to generate meal plan: ${err.message}`);
      }
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const handleAddPlanToCalendar = async (date: Date) => {
    if (!suggestion || !suggestion.plannedMeals || !userSettingsToUse) return;

    try {
      console.log('🍽️ Adding meals to calendar:', {
        date: format(date, 'yyyy-MM-dd'),
        plannedMeals: suggestion.plannedMeals,
        allRecipesCount: allRecipesCache?.length || 0
      });

      // Add each meal to the user's meal plan with proper structure
      const newMeals = suggestion.plannedMeals.map(meal => {
        // Find the matching meal slot from user's structure to get correct mealSlotId and mealType
        const matchingSlot = userSettingsToUse.mealStructure.find(slot => 
          slot.id === meal.mealSlotId || slot.name === meal.mealSlotName
        );
        
        return {
          id: `${Date.now()}-${meal.recipeId}-${Math.random()}`,
          recipeId: meal.recipeId,
          date: format(date, 'yyyy-MM-dd'),
          mealType: matchingSlot ? matchingSlot.type : meal.mealSlotName, // Use the type from meal structure
          mealSlotId: matchingSlot ? matchingSlot.id : meal.mealSlotId, // Use proper mealSlotId
          servings: meal.servings,
          status: 'planned' as const
        };
      });

      console.log('🔄 Processing meals:', newMeals);

      // Add the new meals using the server action directly to preserve mealSlotId
      if (!user) {
        throw new Error('User not authenticated');
      }

      const idToken = await user.getIdToken();
      
      for (const meal of newMeals) {
        console.log(`🔍 Looking for recipe ID ${meal.recipeId} in ${allRecipesCache?.length || 0} recipes`);
        
        // Find the recipe for this meal (handle both string and number IDs)
        const recipe = allRecipesCache.find(r => r.id == meal.recipeId || r.id === Number(meal.recipeId));
        console.log('📝 Found recipe:', recipe ? `${recipe.name} (ID: ${recipe.id})` : 'NOT FOUND');
        
        if (recipe) {
          console.log(`➕ Adding meal: ${recipe.name} for ${meal.mealType} (slot: ${meal.mealSlotId}) on ${meal.date} (${meal.servings} servings)`);
          try {
            // Use server action directly to ensure mealSlotId is preserved
            const result = await addMealToDay(idToken, meal.date, {
              recipeId: meal.recipeId,
              mealType: meal.mealType,
              mealSlotId: meal.mealSlotId, // This is crucial for proper filtering on the meal plan page
              servings: meal.servings,
              status: meal.status
            });

            if (!result.success) {
              throw new Error(result.error || 'Failed to add meal');
            }
            
            console.log(`✅ Successfully added: ${recipe.name}`);
          } catch (addError: any) {
            console.error(`❌ Failed to add meal ${recipe.name}:`, addError);
            throw addError; // Re-throw to trigger the main catch block
          }
        } else {
          console.error(`❌ Recipe not found for ID: ${meal.recipeId}`);
          throw new Error(`Recipe not found for ID: ${meal.recipeId}`);
        }
      }

      toast({
        title: "Plan Added to Calendar!",
        description: `${suggestion.plannedMeals.length} meals added to your plan for ${format(date, 'PPP')}.`,
      });

      // Clear the suggestion after successful save
      setSuggestion(null);
      
    } catch (error: any) {
      console.error('Failed to add meal plan:', error);
      toast({
        title: "Error Adding Plan",
        description: "Failed to save your meal plan. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Debug function to inspect recipe data (can be removed in production)
  const debugRecipeData = () => {
    console.log('=== RECIPE DATA ANALYSIS ===');
    console.log('Total recipes:', allRecipesCache?.length || 0);
    
    if (allRecipesCache) {
      allRecipesCache.forEach((recipe: any, index: number) => {
        if (!recipe) {
          console.log(`Recipe ${index}: NULL/UNDEFINED`);
          return;
        }
        
        // Check for individual macro properties (your data structure)
        if (typeof recipe.calories !== 'number') {
          console.log(`Recipe ${index} "${recipe.name}": Invalid/missing calories:`, recipe.calories);
        }
        if (typeof recipe.protein !== 'number') {
          console.log(`Recipe ${index} "${recipe.name}": Invalid/missing protein:`, recipe.protein);
        }
        if (typeof recipe.carbs !== 'number') {
          console.log(`Recipe ${index} "${recipe.name}": Invalid/missing carbs:`, recipe.carbs);
        }
        if (typeof recipe.fat !== 'number') {
          console.log(`Recipe ${index} "${recipe.name}": Invalid/missing fat:`, recipe.fat);
        }
        
        // Log successful recipes
        if (typeof recipe.calories === 'number' && typeof recipe.protein === 'number' && 
            typeof recipe.carbs === 'number' && typeof recipe.fat === 'number') {
          console.log(`Recipe ${index} "${recipe.name}": ✅ Valid macros - Cal: ${recipe.calories}, P: ${recipe.protein}, C: ${recipe.carbs}, F: ${recipe.fat}`);
        }
      });
    }
    console.log('=== END ANALYSIS ===');
  };

  // Call debug function when recipes load (can be removed in production)
  useEffect(() => {
    if (allRecipesCache && allRecipesCache.length > 0) {
      debugRecipeData();
    }
  }, [allRecipesCache]);
  
  if (!isSubscribed) {
    return (
      <PageWrapper title="Preppy: Plan Generator">
        <ProFeature featureName="The Plan Generator" description="Let our AI, Preppy, automatically generate a full day's meal plan based on your macro targets, preferences, and available recipes. Takes the guesswork out of hitting your goals!" />
      </PageWrapper>
    );
  }

  if (isAuthLoading) {
    return (
      <PageWrapper title="Preppy: Plan Generator">
        <div className="flex flex-col items-center justify-center h-60 text-muted-foreground">
          <Loader2 className="h-16 w-16 animate-spin text-accent mb-6" />
          <p className="text-lg">Loading AI Planner...</p>
        </div>
      </PageWrapper>
    );
  }

  const isProfileSetupMissing = !userSettingsToUse || !userSettingsToUse.mealStructure || userSettingsToUse.mealStructure.length === 0;

  return (
    <PageWrapper title="Preppy: Plan Generator">
      <div className="space-y-8">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline text-primary flex items-center">
              <Sparkles className="w-6 h-6 mr-2 text-accent" />
              Let Me Plan Your Day
            </CardTitle>
            <CardDescription>
              Just say the word, and I'll craft a personalized meal plan for you based on your profile settings.
              <br />
              <small className="text-muted-foreground mt-1 block">
                {allRecipesCache && allRecipesCache.length > 0 
                  ? `🤖 Preppy will use your ${allRecipesCache.length} recipes` 
                  : '🧪 Demo version - add recipes for Preppy suggestions'
                }
              </small>
              {!isSubscribed && (
                <div className="mt-2 space-y-2">
                  <small className="text-muted-foreground block">
                    Free tier: {dailyUsageCount}/{FREE_DAILY_GENERATIONS} daily generations used
                  </small>
                  {dailyUsageCount >= FREE_DAILY_GENERATIONS - 1 && (
                    <div className="flex items-center gap-2">
                      <small className="text-accent">Upgrade for unlimited generations</small>
                      <MiniUpgradeButton />
                    </div>
                  )}
                </div>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isProfileSetupMissing ? (
              <Alert variant="default" className="border-accent">
                <Info className="h-5 w-5 text-accent" />
                <AlertTitle className="text-accent">Profile Setup Required</AlertTitle>
                <AlertDescription>
                  Please set up your <Link href="/profile/meal-structure" className="underline hover:text-accent">Meal Structure</Link> first to generate meal plans.
                </AlertDescription>
              </Alert>
            ) : (
              <Button 
                onClick={handleGeneratePlan} 
                disabled={isGeneratingPlan || (!isSubscribed && dailyUsageCount >= FREE_DAILY_GENERATIONS)} 
                className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
              >
                {isGeneratingPlan ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                {!isSubscribed && dailyUsageCount >= FREE_DAILY_GENERATIONS 
                  ? 'Daily Limit Reached - Subscribe for More' 
                  : 'Generate My Meal Plan'
                }
              </Button>
            )}
          </CardContent>
        </Card>

        {isGeneratingPlan && (
          <div className="flex flex-col items-center justify-center h-60 text-muted-foreground">
            <Loader2 className="h-16 w-16 animate-spin text-accent mb-6" />
            <p className="text-lg">Generating your personalized meal plan...</p>
            <p className="text-sm">Creating balanced nutrition...</p>
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <Info className="h-4 w-4" />
            <AlertTitle>Error Generating Plan</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {suggestion && !isGeneratingPlan && (
          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle className="font-headline text-primary flex items-center">
                <Lightbulb className="w-7 h-7 mr-3 text-accent" />
                Your Meal Plan
              </CardTitle>
              <CardDescription>
                Here's what I've cooked up for you! Review the plan and add it to your calendar if you like it.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-1 text-primary-focus">My Justification:</h3>
                <p className="text-sm text-foreground/80 bg-secondary/30 p-3 rounded-md">{suggestion.aiJustification}</p>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-1 text-primary-focus">Fitness Assessment:</h3>
                <p className="text-sm text-foreground/80 bg-secondary/30 p-3 rounded-md">{suggestion.fitnessAssessment}</p>
              </div>

              <Separator />

              <h3 className="text-xl font-semibold font-headline text-primary-focus">Planned Meals:</h3>
              <div className="space-y-4">
                {suggestion.plannedMeals.map((item, index) => (
                  <Card key={index} className="bg-card/70 border border-border hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg text-accent flex items-start">
                        <ChefHat className="w-5 h-5 mr-2 shrink-0 mt-1"/>
                        <div>
                          <span className="font-semibold">{item.mealSlotName}:</span> {item.recipeName}
                        </div>
                      </CardTitle>
                      <CardDescription>Servings: {item.servings}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <MacroDisplay macros={item.calculatedMacros} title="Macros for this meal" className="shadow-none border-none text-sm"/>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Separator />

              <div>
                <h3 className="text-xl font-semibold font-headline text-primary-focus mb-2">Total Achieved Macros for the Day:</h3>
                <MacroDisplay macros={suggestion.totalAchievedMacros} title="" highlightTotal className="shadow-md" />
              </div>

               {userSettingsToUse?.macroTargets && (
                <div className="mt-4">
                    <h4 className="text-md font-semibold text-muted-foreground mb-1">Comparison to Your Targets:</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                        {(Object.keys(userSettingsToUse.macroTargets) as Array<keyof Macros>).map(key => {
                            const target = userSettingsToUse.macroTargets![key] || 0;
                            const achieved = suggestion.totalAchievedMacros[key] || 0;
                            const diff = achieved - target;
                            return (
                                <div key={key} className="p-2 bg-muted/30 rounded">
                                    <p className="font-medium capitalize">{key}:</p>
                                    <p>Target: {target.toFixed(0)}</p>
                                    <p>Achieved: {achieved.toFixed(0)}</p>
                                    <p className={cn(diff === 0 ? "text-green-600" : diff > 0 ? "text-orange-600" : "text-blue-600")}>
                                        Diff: {diff > 0 ? '+' : ''}{diff.toFixed(0)}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button onClick={() => handleAddPlanToCalendar(new Date())} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                <PlusCircle className="mr-2 h-5 w-5" /> Add This Plan to My Calendar
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>
    </PageWrapper>
  );
}
