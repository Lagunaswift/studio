
"use client";

import { useState } from 'react';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Lightbulb, ChefHat, Sparkles, Send, Bot, Info, CookingPot, BadgePercent, CheckCircle2, AlertTriangle, Search, Lock } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ProFeature } from '@/components/shared/ProFeature';
import type { Recipe, Macros } from '@/types';

// Local type definitions to avoid importing from AI flows
type RecipeWithIngredients = {
  id: number;
  name: string;
  ingredients: string[];
  tags: string[];
  macrosPerServing: Macros;
};

type SuggestRecipesByIngredientsOutput = {
  suggestedRecipes: {
    recipeId: number;
    recipeName: string;
    utilizationScore: number;
    matchedIngredients: string[];
    missingKeyIngredients: string[];
    notes: string;
  }[];
  aiGeneralNotes: string;
};

export default function AIRecipeFinderPage() {
  const { allRecipesCache, isRecipeCacheLoading, userProfile, isSubscribed } = useAppContext();
  const { toast } = useToast();

  const [ingredients, setIngredients] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestion, setSuggestion] = useState<SuggestRecipesByIngredientsOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateSuggestions = async () => {
    if (!ingredients.trim()) {
      setError("Please enter at least one ingredient.");
      return;
    }
    if (isRecipeCacheLoading || allRecipesCache.length === 0) {
      setError("Recipe data is still loading or unavailable. Please wait and try again.");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setSuggestion(null);

    const recipesForAI: RecipeWithIngredients[] = allRecipesCache.map(r => ({
      id: r.id,
      name: r.name,
      ingredients: r.ingredients.map(i => `${i.quantity} ${i.unit} ${i.name}`),
      tags: r.tags,
      macrosPerServing: r.macrosPerServing,
    }));
    
    const userIngredients = ingredients.split(',').map(s => s.trim()).filter(Boolean);

    try {
      const response = await fetch('/api/ai/suggest-recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userIngredients,
          availableRecipes: recipesForAI,
          dietaryPreferences: userProfile?.dietaryPreferences || [],
          allergens: userProfile?.allergens || [],
          maxResults: 5,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Failed to generate suggestions');
      }

      const result = await response.json();
      setSuggestion(result);

      if (result.suggestedRecipes.length === 0) {
        toast({
            title: "No Matching Recipes Found",
            description: "I couldn't find any recipes that closely match your ingredients and profile settings."
        })
      }
    } catch (err: any) {
      console.error("AI Recipe Suggestion Error:", err);
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isSubscribed) {
    return (
      <PageWrapper title="Preppy: Pantry Chef">
        <ProFeature featureName="The Pantry Chef" description="Let our AI, Preppy, suggest recipes you can make right now based on the ingredients you have on hand. No more wondering what's for dinner!" />
      </PageWrapper>
    )
  }

  if (isRecipeCacheLoading) {
    return (
      <PageWrapper title="Preppy: Pantry Chef">
        <div className="flex flex-col items-center justify-center h-60 text-muted-foreground">
          <Loader2 className="h-16 w-16 animate-spin text-accent mb-6" />
          <p className="text-lg">Loading recipes for AI analysis...</p>
        </div>
      </PageWrapper>
    );
  }


  return (
    <PageWrapper title="Preppy: Pantry Chef">
      <div className="space-y-8">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline text-primary flex items-center">
              <ChefHat className="w-6 h-6 mr-2 text-accent" />
              What Can We Make?
            </CardTitle>
            <CardDescription>
              Enter the ingredients you have on hand, and I'll find the best recipes from your collection that you can make right now.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="e.g., chicken breast, broccoli, onion, soy sauce"
              rows={4}
              value={ingredients}
              onChange={(e) => setIngredients(e.target.value)}
              disabled={isGenerating}
            />
            <Button onClick={handleGenerateSuggestions} disabled={isGenerating || isRecipeCacheLoading} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
              {isGenerating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Search className="mr-2 h-4 w-4" />
              )}
              Find Recipes
            </Button>
          </CardContent>
        </Card>

        {isGenerating && (
          <div className="flex flex-col items-center justify-center h-60 text-muted-foreground">
            <Loader2 className="h-16 w-16 animate-spin text-accent mb-6" />
            <p className="text-lg">I'm searching for recipes...</p>
            <p className="text-sm">This might take a moment.</p>
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <Info className="h-4 w-4" />
            <AlertTitle>Error Generating Suggestions</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {suggestion && !isGenerating && (
          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle className="font-headline text-primary flex items-center">
                <Lightbulb className="w-7 h-7 mr-3 text-accent" />
                My Recipe Suggestions
              </CardTitle>
              <CardDescription>
                Based on your ingredients, here are some recipes you could make.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {suggestion.aiGeneralNotes && (
                 <div>
                    <h3 className="text-lg font-semibold mb-1 text-primary-focus">My Chef's Notes:</h3>
                    <p className="text-sm text-foreground/80 bg-secondary/30 p-3 rounded-md">{suggestion.aiGeneralNotes}</p>
                </div>
              )}
             
              <Separator />

              <h3 className="text-xl font-semibold font-headline text-primary-focus">Suggested Recipes:</h3>
              {suggestion.suggestedRecipes.length > 0 ? (
                <div className="space-y-4">
                  {suggestion.suggestedRecipes.map((item) => (
                    <Card key={item.recipeId} className="bg-card/70 border border-border hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg text-accent flex items-start h-[3.5rem] overflow-hidden">
                          <CookingPot className="w-5 h-5 mr-2 shrink-0 mt-1"/>
                          <Link href={`/recipes/${item.recipeId}`} className="hover:underline text-primary line-clamp-2 break-words" title={item.recipeName}>{item.recipeName}</Link>
                        </CardTitle>
                        <div className="flex items-center gap-x-4 text-sm text-muted-foreground pt-1">
                          <div className="flex items-center" title="How well your ingredients are used in this recipe.">
                            <BadgePercent className="w-4 h-4 mr-1 text-primary"/>
                            Utilization Score: {Math.round(item.utilizationScore * 100)}%
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3 text-sm">
                        {item.notes && <p className="text-sm text-foreground/80 bg-muted/50 p-2 rounded-md italic">"{item.notes}"</p>}
                        
                        <div>
                          <h4 className="font-semibold flex items-center text-green-700 dark:text-green-400">
                            <CheckCircle2 className="w-4 h-4 mr-2" /> Matched Ingredients:
                          </h4>
                          <div className="flex flex-wrap gap-1 p-2">
                             {item.matchedIngredients.length > 0 ? item.matchedIngredients.map(ing => <Badge key={ing} variant="secondary">{ing}</Badge>) : <span className="text-muted-foreground text-xs">None</span>}
                          </div>
                        </div>

                        {item.missingKeyIngredients && item.missingKeyIngredients.length > 0 && (
                          <div>
                            <h4 className="font-semibold flex items-center text-orange-600 dark:text-orange-400">
                              <AlertTriangle className="w-4 h-4 mr-2" /> Missing Key Ingredients:
                            </h4>
                            <div className="flex flex-wrap gap-1 p-2">
                              {item.missingKeyIngredients.map(ing => <Badge key={ing} variant="outline">{ing}</Badge>)}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-4">No specific recipes found. Try adding more ingredients or check your spelling.</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </PageWrapper>
  );
}
