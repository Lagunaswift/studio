
"use client";

import { useState, useEffect } from 'react';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { suggestMealPlan, type SuggestMealPlanInput, type SuggestMealPlanOutput, type RecipeForAI, type MealSlotForAI } from '@/ai/flows/suggest-meal-plan';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Lightbulb, ChefHat, Sparkles, Send, Settings, Info, PlusCircle, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppContext } from '@/context/AppContext'; // Still needed for addMealToPlan, allRecipesCache etc.
import { useAuth } from '@/context/AuthContext'; // <-- IMPORT THE HOOK
import type { Recipe, Macros, MealSlotConfig } from '@/types';
import { MacroDisplay } from '@/components/shared/MacroDisplay';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';
import { format, startOfDay, isSameDay } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const FREE_TIER_RECIPE_LIMIT_FOR_AI = 15; // Renamed for clarity

export default function AISuggestionsPage() {
  const { addMealToPlan, allRecipesCache, isRecipeCacheLoading: isAppRecipeCacheLoading } = useAppContext();
  const { profile, isLoading: isAuthLoading, user } = useAuth(); // <-- USE THE HOOK, also get user for profile settings
  
  const { toast } = useToast();
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [suggestion, setSuggestion] = useState<SuggestMealPlanOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recipesForAI, setRecipesForAI] = useState<RecipeForAI[]>([]);

  // User profile settings now come from AuthContext's profile, if available,
  // or could fallback to AppContext if AuthContext.profile isn't fully populated with all settings.
  // For simplicity, this example assumes AuthContext.profile contains relevant user settings
  // or that AppContext's userProfile is still valid for these non-auth-critical settings.
  // We'll primarily use `profile` from `useAuth()` for subscription status.
  // For other profile details (mealStructure, macroTargets), we might need to be careful
  // if `AuthContext.profile` doesn't include them, or if `AppContext.userProfile` is the source.
  // For now, let's assume `AuthContext.profile` will eventually hold all necessary user-specific data
  // that `AppContext.userProfile` used to hold for this page.

  // The `profile` from `AuthContext` should have `mealStructure`, `macroTargets` etc.
  // Let's call it `userSettingsFromAuth` to avoid confusion with `userProfile` from `AppContext`.
  const userSettingsFromAuth = profile; 

  const isSubscribedActive = profile?.subscription_status === 'active';

  useEffect(() => {
    if (!isAppRecipeCacheLoading) {
      if (allRecipesCache.length > 0) {
        let transformedForAI = allRecipesCache.map(r => ({
          id: r.id,
          name: r.name,
          macrosPerServing: r.macrosPerServing,
          tags: r.tags || [],
        }));
        if (!isSubscribedActive) {
          // Limit recipes considered by AI if not subscribed
          transformedForAI = transformedForAI.slice(0, FREE_TIER_RECIPE_LIMIT_FOR_AI);
        }
        setRecipesForAI(transformedForAI);
      } else {
        setRecipesForAI([]);
      }
    }
  }, [allRecipesCache, isAppRecipeCacheLoading, isSubscribedActive]);

  const handleGeneratePlan = async () => {
    if (!userSettingsFromAuth) { // Check the profile from AuthContext
      setError("User profile not loaded. Please wait or try refreshing.");
      return;
    }
    // Gating is now primarily handled by the top-level check using isAuthLoading and profile.subscription_status
    // This explicit check here becomes a safeguard.
    if (!isSubscribedActive) {
      setError("AI Meal Plan generation is a premium feature. Please upgrade your subscription to use it.");
      toast({
        title: "Premium Feature",
        description: "Upgrade to generate AI meal plans.",
        variant: "destructive",
      });
      return;
    }

    if (!userSettingsFromAuth.mealStructure || userSettingsFromAuth.mealStructure.length === 0) {
      setError("Please set up your meal structure in Profile Settings before generating a plan.");
      return;
    }
    if (!userSettingsFromAuth.macroTargets) {
      setError("Please set your Macro Targets in Profile Settings for the AI to generate a more accurate plan.");
      // Allow proceeding but with a warning or less optimal plan
    }
    if (isAppRecipeCacheLoading) {
      setError("Recipe data is still loading. Please wait a moment and try again.");
      return;
    }
    if (recipesForAI.length === 0) {
       setError(`No recipes available for AI planning. ${!isSubscribedActive ? `(Free tier limited to ${FREE_TIER_RECIPE_LIMIT_FOR_AI} recipes for AI consideration)` : 'Add recipes or ensure they have loaded.'}`);
      return;
    }

    setIsGeneratingPlan(true);
    setError(null);
    setSuggestion(null);

    const mealStructureForAI: MealSlotForAI[] = userSettingsFromAuth.mealStructure.map(ms => ({
      id: ms.id,
      name: ms.name,
      type: ms.type,
    }));

    const input: SuggestMealPlanInput = {
      macroTargets: userSettingsFromAuth.macroTargets, 
      dietaryPreferences: userSettingsFromAuth.dietaryPreferences || [],
      allergens: userSettingsFromAuth.allergens || [],
      mealStructure: mealStructureForAI,
      availableRecipes: recipesForAI, 
      currentDate: format(new Date(), 'yyyy-MM-dd'),
    };

    try {
      const result = await suggestMealPlan(input);
      setSuggestion(result);
    } catch (err: any) {
      console.error("AI Suggestion Error:", err);
      setError(err.message || "Failed to get meal suggestion. Please try again.");
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const handleAddPlanToCalendar = (date: Date) => {
    if (!suggestion || !suggestion.plannedMeals || allRecipesCache.length === 0 || !userSettingsFromAuth) return;

    if (!isSubscribedActive && !isSameDay(date, startOfDay(new Date()))) {
        toast({
            title: "Plan Addition Restricted",
            description: "Free users can only add AI-generated plans for today. Please upgrade for more flexibility.",
            variant: "destructive",
        });
        return;
    }

    suggestion.plannedMeals.forEach(plannedMealItem => {
      const fullRecipe = allRecipesCache.find(r => r.id === plannedMealItem.recipeId);
      if (fullRecipe) {
        const originalMealSlot = userSettingsFromAuth.mealStructure?.find(ms => ms.id === plannedMealItem.mealSlotId);
        if (originalMealSlot) {
           addMealToPlan(fullRecipe, format(date, 'yyyy-MM-dd'), originalMealSlot.type, plannedMealItem.servings);
        } else {
            console.warn(`Could not find original meal slot for ID: ${plannedMealItem.mealSlotId}. Defaulting meal type.`);
            addMealToPlan(fullRecipe, format(date, 'yyyy-MM-dd'), 'Snack', plannedMealItem.servings);
        }
      }
    });
    toast({
      title: "AI Plan Added!",
      description: `The suggested meal plan has been added to your calendar for ${format(date, 'PPP')}.`,
    });
  };

  if (isAuthLoading || isAppRecipeCacheLoading) {
    return (
      <PageWrapper title="Automated AI Meal Planner">
        <div className="flex flex-col items-center justify-center h-60 text-muted-foreground">
          <Loader2 className="h-16 w-16 animate-spin text-accent mb-6" />
          <p className="text-lg">Loading AI Planner...</p>
        </div>
      </PageWrapper>
    );
  }

  // Check for active subscription (using profile from useAuth)
  if (profile?.subscription_status !== 'active') {
    return (
      <PageWrapper title="Automated AI Meal Planner">
        <Alert variant="default" className="border-accent mt-6">
          <Lock className="h-5 w-5 text-accent" />
          <AlertTitle className="text-accent font-headline">Premium Feature Locked</AlertTitle>
          <AlertDescription>
            AI-powered meal plan generation is available for subscribed users. 
            Please <Link href="/profile/subscription" className="underline hover:text-primary font-semibold">upgrade your plan</Link> to unlock this feature and more.
            {/* You might want a link to a dedicated subscription page if you have one */}
          </AlertDescription>
        </Alert>
      </PageWrapper>
    );
  }
  
  // Profile is loaded and subscription is active, proceed with page content
  const isProfileSetupMissing = !userSettingsFromAuth || !userSettingsFromAuth.mealStructure || userSettingsFromAuth.mealStructure.length === 0;

  return (
    <PageWrapper title="Automated AI Meal Planner">
      <div className="space-y-8">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline text-primary flex items-center">
              <Sparkles className="w-6 h-6 mr-2 text-accent" />
              Generate Your Daily Meal Plan
            </CardTitle>
            <CardDescription>
              Let our AI craft a personalized meal plan for you based on your profile settings and recipe database.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isProfileSetupMissing && userSettingsFromAuth ? ( // Check userSettingsFromAuth before accessing its properties
              <Alert variant="default" className="border-accent">
                <Info className="h-5 w-5 text-accent" />
                <AlertTitle className="text-accent">Profile Setup Recommended</AlertTitle>
                <AlertDescription>
                  To get the best AI-generated meal plan, please ensure you have:
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    {!userSettingsFromAuth.mealStructure || userSettingsFromAuth.mealStructure.length === 0 ? (
                      <li>Defined your <Link href="/profile/meal-structure" className="underline hover:text-accent">Meal Structure</Link>.</li>
                    ) : null}
                    {!userSettingsFromAuth.macroTargets ? (
                       <li>Set your <Link href="/profile/targets" className="underline hover:text-accent">Macro Targets</Link>.</li>
                    ) : null}
                     {(!userSettingsFromAuth.dietaryPreferences || userSettingsFromAuth.dietaryPreferences.length === 0) && (!userSettingsFromAuth.allergens || userSettingsFromAuth.allergens.length === 0) ? (
                       <li>Configured your <Link href="/profile/diet-type" className="underline hover:text-accent">Diet Type</Link> and <Link href="/profile/allergens" className="underline hover:text-accent">Allergens</Link>.</li>
                    ) : null}
                  </ul>
                   <Button onClick={handleGeneratePlan} disabled={isGeneratingPlan || isAppRecipeCacheLoading || recipesForAI.length === 0} className="w-full mt-4 bg-primary hover:bg-primary/90">
                      {isGeneratingPlan || isAppRecipeCacheLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="mr-2 h-4 w-4" />
                      )}
                      Generate Plan Anyway (might be less optimal)
                  </Button>
                </AlertDescription>
              </Alert>
            ) : (
              <Button onClick={handleGeneratePlan} disabled={isGeneratingPlan || isAppRecipeCacheLoading || recipesForAI.length === 0} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                {isGeneratingPlan || isAppRecipeCacheLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Generate My AI Meal Plan
              </Button>
            )}
            {isAppRecipeCacheLoading && <p className="text-sm text-muted-foreground mt-2 text-center">Loading recipe data for AI...</p>}
            {!isAppRecipeCacheLoading && recipesForAI.length === 0 && !isGeneratingPlan && (
                 <p className="text-sm text-muted-foreground mt-2 text-center">No recipes found in the database. Add recipes to enable AI planning.</p>
            )}
            {!isAppRecipeCacheLoading && recipesForAI.length > 0 && recipesForAI.length < FREE_TIER_RECIPE_LIMIT_FOR_AI && !isSubscribedActive && (
                 <p className="text-sm text-muted-foreground mt-2 text-center">AI considerations limited to {recipesForAI.length} recipes on the free tier.</p>
            )}
          </CardContent>
        </Card>

        {isGeneratingPlan && (
          <div className="flex flex-col items-center justify-center h-60 text-muted-foreground">
            <Loader2 className="h-16 w-16 animate-spin text-accent mb-6" />
            <p className="text-lg">Generating your personalized meal plan...</p>
            <p className="text-sm">This might take a moment.</p>
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
                Your AI-Generated Meal Plan
              </CardTitle>
              <CardDescription>
                Here's what our AI chef cooked up for you for today! Review the plan and add it to your calendar.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-1 text-primary-focus">AI Justification:</h3>
                <p className="text-sm text-foreground/80 bg-secondary/30 p-3 rounded-md">{suggestion.aiJustification}</p>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-1 text-primary-focus">Fitness Assessment:</h3>
                <p className="text-sm text-foreground/80 bg-secondary/30 p-3 rounded-md">{suggestion.fitnessAssessment}</p>
              </div>
              
              <Separator />

              <h3 className="text-xl font-semibold font-headline text-primary-focus">Planned Meals:</h3>
              <div className="space-y-4">
                {suggestion.plannedMeals.map((item) => {
                  const recipeDetails = allRecipesCache.find(r => r.id === item.recipeId);
                  return (
                    <Card key={item.mealSlotId} className="bg-card/70 border border-border hover:shadow-md transition-shadow">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg text-accent flex items-center">
                          <ChefHat className="w-5 h-5 mr-2"/> {item.mealSlotName}: <Link href={`/recipes/${item.recipeId}`} className="ml-1 hover:underline text-primary">{item.recipeName}</Link>
                        </CardTitle>
                        <CardDescription>Servings: {item.servings}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {recipeDetails && item.calculatedMacros ? (
                           <MacroDisplay macros={item.calculatedMacros} title="Macros for this meal" className="shadow-none border-none text-sm"/>
                        ) : (
                          <p className="text-sm text-muted-foreground">Macro details unavailable.</p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              
              <Separator />
              
              <div>
                <h3 className="text-xl font-semibold font-headline text-primary-focus mb-2">Total Achieved Macros for the Day:</h3>
                <MacroDisplay macros={suggestion.totalAchievedMacros} title="" highlightTotal className="shadow-md" />
              </div>

               {userSettingsFromAuth?.macroTargets && ( // Use userSettingsFromAuth from AuthContext
                <div className="mt-4">
                    <h4 className="text-md font-semibold text-muted-foreground mb-1">Comparison to Your Targets:</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                        {(Object.keys(userSettingsFromAuth.macroTargets) as Array<keyof Macros>).map(key => {
                            const target = userSettingsFromAuth.macroTargets![key] || 0;
                            const achieved = suggestion.totalAchievedMacros[key] || 0;
                            const diff = achieved - target;
                            const diffPercentage = target > 0 ? (diff / target) * 100 : 0;
                            return (
                                <div key={key} className="p-2 bg-muted/30 rounded">
                                    <p className="font-medium capitalize">{key}:</p>
                                    <p>Target: {target.toFixed(0)}</p>
                                    <p>Achieved: {achieved.toFixed(0)}</p>
                                    <p className={cn(diff === 0 ? "text-green-600" : diff > 0 ? "text-orange-600" : "text-blue-600")}>
                                        Diff: {diff.toFixed(0)} ({diffPercentage > 0 ? '+' : ''}{diffPercentage.toFixed(1)}%)
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button onClick={() => handleAddPlanToCalendar(new Date())} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                <PlusCircle className="mr-2 h-5 w-5" /> Add This Plan to My Calendar ({isSubscribedActive ? "Today or other date" : "Today Only"})
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>
    </PageWrapper>
  );
}
