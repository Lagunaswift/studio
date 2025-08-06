
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

// ✅ LOCAL TYPE DEFINITIONS (instead of importing from AI flows)
interface RecipeWithIngredients {
  id: number;
  name: string;
  ingredients: { name: string; quantity: number; unit: string; }[];
  tags: string[];
  macrosPerServing: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

interface SuggestedRecipe {
  recipeId: number;
  recipeName: string;
  matchPercentage: number;
  availableIngredients: string[];
  missingIngredients: string[];
  tags: string[];
  macrosPerServing: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

interface AIRecipeSuggestionResult {
  suggestedRecipes: SuggestedRecipe[];
  aiGeneralNotes: string;
}

interface SuggestRecipesByIngredientsInput {
  userIngredients: string[];
  availableRecipes: RecipeWithIngredients[];
  dietaryPreferences: string[];
  allergens: string[];
  maxResults: number;
}

export default function AIRecipeFinderPage() {
  const { allRecipesCache, isRecipeCacheLoading, userProfile, isSubscribed } = useAppContext();
  const { toast } = useToast();

  const [ingredients, setIngredients] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestion, setSuggestion] = useState<AIRecipeSuggestionResult | null>(null);
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
      ingredients: r.ingredients,
      tags: r.tags,
      macrosPerServing: r.macrosPerServing,
    }));
    
    const userIngredients = ingredients.split(',').map(s => s.trim()).filter(Boolean);

    const input: SuggestRecipesByIngredientsInput = {
      userIngredients: userIngredients,
      availableRecipes: recipesForAI,
      dietaryPreferences: userProfile?.dietaryPreferences || [],
      allergens: userProfile?.allergens || [],
      maxResults: 5,
    };

    try {
      // ✅ CALL API ROUTE instead of AI flow directly
      const response = await fetch('/api/ai/suggest-recipes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result: AIRecipeSuggestionResult = await response.json();
      setSuggestion(result);
      
      if (result.suggestedRecipes.length === 0) {
        toast({
            title: "No Matching Recipes Found",
            description: "I couldn't find any recipes that closely match your ingredients and profile settings."
        })
      }
    } catch (err: any) {
      console.error("AI Recipe Suggestion Error:", err);
      let detailedMessage = "Failed to get recipe suggestions. Please try again.";
      if (err.message) {
        detailedMessage = err.message;
      }
      setError(detailedMessage);
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
                <div className="grid gap-4">
                  {suggestion.suggestedRecipes.map((suggestedRecipe) => (
                    <Card key={suggestedRecipe.recipeId} className="p-4 border-l-4 border-l-accent">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="text-lg font-semibold text-primary">
                          <Link href={`/recipes/${suggestedRecipe.recipeId}`} className="hover:underline">
                            {suggestedRecipe.recipeName}
                          </Link>
                        </h4>
                        <Badge variant="secondary" className="ml-2">
                          <BadgePercent className="w-3 h-3 mr-1" />
                          {suggestedRecipe.matchPercentage}% match
                        </Badge>
                      </div>
                      
                      <div className="grid md:grid-cols-2 gap-4 mb-3">
                        <div>
                          <p className="text-sm font-medium text-green-700 dark:text-green-400 mb-1 flex items-center">
                            <CheckCircle2 className="w-4 h-4 mr-1" />
                            Ingredients You Have ({suggestedRecipe.availableIngredients.length}):
                          </p>
                          <p className="text-xs text-foreground/70">{suggestedRecipe.availableIngredients.join(', ')}</p>
                        </div>
                        
                        {suggestedRecipe.missingIngredients.length > 0 && (
                          <div>
                            <p className="text-sm font-medium text-orange-600 dark:text-orange-400 mb-1 flex items-center">
                              <AlertTriangle className="w-4 h-4 mr-1" />
                              Missing Ingredients ({suggestedRecipe.missingIngredients.length}):
                            </p>
                            <p className="text-xs text-foreground/70">{suggestedRecipe.missingIngredients.join(', ')}</p>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap gap-1 mb-2">
                        {suggestedRecipe.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      
                      <div className="text-xs text-muted-foreground">
                        Macros: {Math.round(suggestedRecipe.macrosPerServing.calories)} cal, 
                        {Math.round(suggestedRecipe.macrosPerServing.protein)}g protein, 
                        {Math.round(suggestedRecipe.macrosPerServing.carbs)}g carbs, 
                        {Math.round(suggestedRecipe.macrosPerServing.fat)}g fat
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No recipes found with those ingredients. 
                  Try adding more ingredients or check your spelling.
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </PageWrapper>
  );
}