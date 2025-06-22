
"use client";

import { useState, useEffect } from 'react';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { suggestMealPlan, type SuggestMealPlanInput, type SuggestMealPlanOutput, type RecipeForAI, type MealSlotForAI } from '@/ai/flows/suggest-meal-plan';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Lightbulb, ChefHat, Sparkles, Send, Settings, Info, PlusCircle } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import type { Recipe, Macros, MealSlotConfig } from '@/types';
import { MacroDisplay } from '@/components/shared/MacroDisplay';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function AISuggestionsPage() {
  const {
    addMealToPlan,
    allRecipesCache,
    isRecipeCacheLoading: isAppRecipeCacheLoading,
    userProfile,
  } = useAppContext();

  const { user, isLoading: isAuthLoading } = useAuth();

  const { toast } = useToast();
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [suggestion, setSuggestion] = useState<SuggestMealPlanOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recipesForAI, setRecipesForAI] = useState<RecipeForAI[]>([]);

  const userSettingsToUse = userProfile;

  useEffect(() => {
    if (!isAppRecipeCacheLoading) {
      if (allRecipesCache.length > 0) {
        const transformedForAI = allRecipesCache.map(r => ({
          id: r.id,
          name: r.name,
          macrosPerServing: r.macrosPerServing,
          tags: r.tags || [],
        }));
        setRecipesForAI(transformedForAI);
      } else {
        setRecipesForAI([]);
      }
    }
  }, [allRecipesCache, isAppRecipeCacheLoading]);

  const handleGeneratePlan = async () => {
    if (!userSettingsToUse) {
      setError("User profile not loaded from AppContext. Please wait or try refreshing.");
      return;
    }

    if (!userSettingsToUse.mealStructure || userSettingsToUse.mealStructure.length === 0) {
      setError("Please set up your meal structure in Profile Settings before generating a plan.");
      return;
    }
    if (!userSettingsToUse.macroTargets) {
      setError("Please set your Macro Targets in Profile Settings for the AI to generate a more accurate plan.");
    }
    if (isAppRecipeCacheLoading) {
      setError("Recipe data is still loading. Please wait a moment and try again.");
      return;
    }
    if (recipesForAI.length === 0) {
       setError(`No recipes available for AI planning. Add recipes or ensure they have loaded.`);
      return;
    }

    setIsGeneratingPlan(true);
    setError(null);
    setSuggestion(null);

    const mealStructureForAI: MealSlotForAI[] = userSettingsToUse.mealStructure.map(ms => ({
      id: ms.id,
      name: ms.name,
      type: ms.type,
    }));

    const input: SuggestMealPlanInput = {
      macroTargets: userSettingsToUse.macroTargets,
      dietaryPreferences: userSettingsToUse.dietaryPreferences || [],
      allergens: userSettingsToUse.allergens || [],
      mealStructure: mealStructureForAI,
      availableRecipes: recipesForAI,
      currentDate: format(new Date(), 'yyyy-MM-dd'),
    };

    try {
      const result = await suggestMealPlan(input);
      setSuggestion(result);
    } catch (err: any) {
      console.error("AI Suggestion Error:", err);
      let detailedMessage = "Failed to get meal suggestion. Please try again.";
      if (err.message) {
        detailedMessage = err.message;
      }
      if (err.digest) { 
        detailedMessage += ` Server error digest: ${err.digest}. Check server logs for more details. Ensure your GOOGLE_API_KEY is correctly set up.`;
      } else {
        detailedMessage += " This might be a server-side issue. Check server logs for more details and ensure your GOOGLE_API_KEY is correctly set up if using AI features.";
      }
      setError(detailedMessage);
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const handleAddPlanToCalendar = (date: Date) => {
    if (!suggestion || !suggestion.plannedMeals || allRecipesCache.length === 0 || !userSettingsToUse) return;

    suggestion.plannedMeals.forEach(plannedMealItem => {
      const fullRecipe = allRecipesCache.find(r => r.id === plannedMealItem.recipeId);
      if (fullRecipe) {
        const originalMealSlot = userSettingsToUse.mealStructure?.find(ms => ms.id === plannedMealItem.mealSlotId);
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

  const isProfileSetupMissing = !userSettingsToUse || !userSettingsToUse.mealStructure || userSettingsToUse.mealStructure.length === 0;

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
            {isProfileSetupMissing && userSettingsToUse ? (
              <Alert variant="default" className="border-accent">
                <Info className="h-5 w-5 text-accent" />
                <AlertTitle className="text-accent">Profile Setup Recommended</AlertTitle>
                <AlertDescription>
                  To get the best AI-generated meal plan, please ensure you have:
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    {!userSettingsToUse.mealStructure || userSettingsToUse.mealStructure.length === 0 ? (
                      <li>Defined your <Link href="/profile/meal-structure" className="underline hover:text-accent">Meal Structure</Link>.</li>
                    ) : null}
                    {!userSettingsToUse.macroTargets ? (
                       <li>Set your <Link href="/profile/targets" className="underline hover:text-accent">Macro Targets</Link>.</li>
                    ) : null}
                     {(!userSettingsToUse.dietaryPreferences || userSettingsToUse.dietaryPreferences.length === 0) && (!userSettingsToUse.allergens || userSettingsToUse.allergens.length === 0) ? (
                       <li>Configured your <Link href="/profile/diet-type" className="underline hover:text-accent">Diet Type</Link> and <Link href="/profile/allergens" className="underline hover:text-accent">Allergens</Link>.</li>
                    ) : null}
                  </ul>
                   <Button onClick={handleGeneratePlan} disabled={isGeneratingPlan || isAppRecipeCacheLoading || recipesForAI.length === 0} className="w-full mt-4 bg-accent hover:bg-accent/90 text-accent-foreground">
                      {isGeneratingPlan || isAppRecipeCacheLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="mr-2 h-4 w-4" />
                      )}
                      Generate Plan Anyway
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

               {userSettingsToUse?.macroTargets && (
                <div className="mt-4">
                    <h4 className="text-md font-semibold text-muted-foreground mb-1">Comparison to Your Targets:</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                        {(Object.keys(userSettingsToUse.macroTargets) as Array<keyof Macros>).map(key => {
                            const target = userSettingsToUse.macroTargets![key] || 0;
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
