
"use client";

import { useState, useEffect } from 'react';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { suggestMealPlan, type SuggestMealPlanInput, type SuggestMealPlanOutput, type RecipeForAI, type MealSlotForAI } from '@/ai/flows/suggest-meal-plan';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Lightbulb, ChefHat, Sparkles, Send, Settings, Info, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppContext } from '@/context/AppContext';
import { getAllRecipes } from '@/lib/data'; 
import type { Recipe, Macros, MealSlotConfig } from '@/types';
import { MacroDisplay } from '@/components/shared/MacroDisplay';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';


export default function AISuggestionsPage() {
  const { userProfile, addMealToPlan } = useAppContext();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<SuggestMealPlanOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [allRecipes, setAllRecipes] = useState<Recipe[]>([]);
  const [recipesForAI, setRecipesForAI] = useState<RecipeForAI[]>([]);

  useEffect(() => {
    const loadRecipes = async () => {
      const fetchedRecipes = await getAllRecipes();
      setAllRecipes(fetchedRecipes);
      // Transform recipes for the AI prompt
      const transformedForAI = fetchedRecipes.map(r => ({
        id: r.id,
        name: r.name,
        macrosPerServing: r.macrosPerServing,
        tags: r.tags || [],
      }));
      setRecipesForAI(transformedForAI);
    };
    loadRecipes();
  }, []);

  const handleGeneratePlan = async () => {
    if (!userProfile) {
      setError("User profile not loaded. Please wait or try refreshing.");
      return;
    }
    if (!userProfile.mealStructure || userProfile.mealStructure.length === 0) {
      setError("Please set up your meal structure in Profile Settings before generating a plan.");
      return;
    }
     if (!userProfile.macroTargets) {
      setError("Please set your Macro Targets in Profile Settings for the AI to generate a more accurate plan.");
      // Allow proceeding without macro targets, AI will be prompted to create a "balanced" plan
    }
    if (recipesForAI.length === 0) {
      setError("Recipe data is not loaded yet. Please wait.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuggestion(null);

    const mealStructureForAI: MealSlotForAI[] = userProfile.mealStructure.map(ms => ({
      id: ms.id,
      name: ms.name,
      type: ms.type,
    }));

    const input: SuggestMealPlanInput = {
      macroTargets: userProfile.macroTargets, // Can be null
      dietaryPreferences: userProfile.dietaryPreferences || [],
      allergens: userProfile.allergens || [],
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
      setIsLoading(false);
    }
  };

  const handleAddPlanToCalendar = (date: Date) => {
    if (!suggestion || !suggestion.plannedMeals) return;

    suggestion.plannedMeals.forEach(plannedMealItem => {
      const fullRecipe = allRecipes.find(r => r.id === plannedMealItem.recipeId);
      if (fullRecipe) {
        // Find the original meal slot type from userProfile.mealStructure using mealSlotId
        const originalMealSlot = userProfile?.mealStructure.find(ms => ms.id === plannedMealItem.mealSlotId);
        if (originalMealSlot) {
           addMealToPlan(fullRecipe, format(date, 'yyyy-MM-dd'), originalMealSlot.type, plannedMealItem.servings);
        } else {
            console.warn(`Could not find original meal slot for ID: ${plannedMealItem.mealSlotId}. Defaulting meal type.`);
             // Fallback if slot not found, use a default or skip
        }
      }
    });
    toast({
      title: "AI Plan Added!",
      description: `The suggested meal plan has been added to your calendar for ${format(date, 'PPP')}.`,
    });
  };


  const isProfileSetupMissing = !userProfile || !userProfile.mealStructure || userProfile.mealStructure.length === 0;


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
              Let our AI craft a personalized meal plan for you based on your profile settings (targets, preferences, meal structure) and our recipe database.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isProfileSetupMissing ? (
              <Alert variant="default" className="border-accent">
                <Info className="h-5 w-5 text-accent" />
                <AlertTitle className="text-accent">Profile Setup Required</AlertTitle>
                <AlertDescription>
                  To get the best AI-generated meal plan, please ensure you have:
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    {!userProfile?.mealStructure || userProfile.mealStructure.length === 0 ? (
                      <li>Defined your <Link href="/profile/meal-structure" className="underline hover:text-accent">Meal Structure</Link>.</li>
                    ) : null}
                    {!userProfile?.macroTargets ? (
                       <li>Set your <Link href="/profile/targets" className="underline hover:text-accent">Macro Targets</Link> (Recommended).</li>
                    ) : null}
                     {(!userProfile?.dietaryPreferences || userProfile.dietaryPreferences.length === 0) && (!userProfile?.allergens || userProfile.allergens.length === 0) ? (
                       <li>Configured your <Link href="/profile/diet-type" className="underline hover:text-accent">Diet Type</Link> and <Link href="/profile/allergens" className="underline hover:text-accent">Allergens</Link> (Recommended).</li>
                    ) : null}
                  </ul>
                   <Button onClick={handleGeneratePlan} disabled={isLoading || recipesForAI.length === 0} className="w-full mt-4 bg-primary hover:bg-primary/90">
                      {isLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="mr-2 h-4 w-4" />
                      )}
                      Generate Plan Anyway (might be less optimal)
                  </Button>
                </AlertDescription>
              </Alert>
            ) : (
              <Button onClick={handleGeneratePlan} disabled={isLoading || recipesForAI.length === 0} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Generate My AI Meal Plan
              </Button>
            )}
            {recipesForAI.length === 0 && !isLoading && <p className="text-sm text-muted-foreground mt-2 text-center">Loading recipe data...</p>}
          </CardContent>
        </Card>

        {isLoading && (
          <div className="flex flex-col items-center justify-center h-60 text-muted-foreground">
            <Loader2 className="h-16 w-16 animate-spin text-accent mb-6" />
            <p className="text-lg">Generating your personalized meal plan...</p>
            <p className="text-sm">This might take a moment.</p>
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertTitle>Error Generating Plan</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {suggestion && !isLoading && (
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
                  const recipeDetails = allRecipes.find(r => r.id === item.recipeId);
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

               {userProfile?.macroTargets && (
                <div className="mt-4">
                    <h4 className="text-md font-semibold text-muted-foreground mb-1">Comparison to Your Targets:</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                        {(Object.keys(userProfile.macroTargets) as Array<keyof Macros>).map(key => {
                            const target = userProfile.macroTargets![key] || 0;
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
                <PlusCircle className="mr-2 h-5 w-5" /> Add This Plan to My Calendar (Today)
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>
    </PageWrapper>
  );
}

    
