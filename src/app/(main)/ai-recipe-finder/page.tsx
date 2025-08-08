"use client";

import { useState } from 'react';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Lightbulb, ChefHat, Wand2, Send, Bot, Info, CookingPot, BadgePercent, CheckCircle2, AlertTriangle, Search, Lock } from 'lucide-react';
import { useOptimizedRecipes, useOptimizedProfile } from '@/hooks/useOptimizedFirestore';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ProFeature } from '@/components/shared/ProFeature';
import { optimizedAIService } from '@/lib/ai/OptimizedAIService';

// ✅ Use type imports only - no direct flow imports
type SuggestRecipesByIngredientsInput = {
  userIngredients: string[];
  availableRecipes: RecipeWithIngredients[];
  dietaryPreferences?: string[];
  allergens?: string[];
  maxResults?: number;
};

type RecipeWithIngredients = {
  id: number;
  name: string;
  ingredients: string[];
  tags?: string[];
  macrosPerServing?: any;
};

type AIRecipeSuggestionResult = {
  suggestedRecipes: Array<{
    recipeId: number;
    recipeName: string;
    utilizationScore: number;
    matchedIngredients: string[];
    missingKeyIngredients?: string[];
    notes?: string;
  }>;
  aiGeneralNotes?: string;
};

export default function AIRecipeFinderPage() {
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useOptimizedProfile(user?.uid);
  const { recipes: allRecipesCache, loading: isRecipeCacheLoading, error: recipesError } = useOptimizedRecipes(user?.uid);
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

    const userIngredients = ingredients.split(',').map(s => s.trim()).filter(Boolean);

    try {
      const result = await optimizedAIService.generateRecipeSuggestions(
        userIngredients,
        {
            dietType: profile?.dietaryPreferences?.join(', '),
            allergens: profile?.allergens
        }
      );

      if (result.success) {
        setSuggestion(result.data as any);
        if (result.data?.recipes.length === 0) {
            toast({
                title: "No Matching Recipes Found",
                description: "I couldn't find any recipes that closely match your ingredients and profile settings."
            })
        }
      } else {
          setError(result.error || 'Failed to get suggestions');
          if(result.fallback) {
            setSuggestion({ suggestedRecipes: result.fallback.recipes as any, aiGeneralNotes: "Could not connect to the AI, here is a fallback suggestion."});
          }
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

  if (!profile?.subscription_status || profile.subscription_status !== 'active') {
    return (
      <PageWrapper title="Preppy: Pantry Chef">
        <ProFeature 
          featureName="The Pantry Chef" 
          description="Let our AI, Preppy, suggest recipes you can make right now based on the ingredients you have on hand. No more wondering what's for dinner!"
        />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title="Preppy: Pantry Chef">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-2">
            <ChefHat className="h-8 w-8 text-primary" />
            <Wand2 className="h-6 w-6 text-yellow-500" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Pantry Chef</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Tell me what ingredients you have, and I'll suggest recipes you can make right now from your collection.
          </p>
        </div>

        {/* Input Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              What's in your kitchen?
            </CardTitle>
            <CardDescription>
              List the ingredients you have available (comma-separated)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="e.g., chicken breast, broccoli, onion, soy sauce, rice..."
              value={ingredients}
              onChange={(e) => setIngredients(e.target.value)}
              rows={3}
              disabled={isGenerating}
            />
            <Button 
              onClick={handleGenerateSuggestions}
              disabled={isGenerating || !ingredients.trim()}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Finding recipes...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Find Recipes
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Results */}
        {suggestion && suggestion.suggestedRecipes.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Recipe Suggestions</h2>
            </div>

            {suggestion.aiGeneralNotes && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Chef's Notes</AlertTitle>
                <AlertDescription>{suggestion.aiGeneralNotes}</AlertDescription>
              </Alert>
            )}

            <div className="grid gap-4">
              {suggestion.suggestedRecipes.map((recipe) => {
                const fullRecipe = allRecipesCache.find(r => r.id === recipe.recipeId);
                
                return (
                  <Card key={recipe.recipeId} className="border-l-4 border-l-primary">
                    <CardContent className="pt-6">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <h3 className="text-lg font-semibold">{recipe.recipeName}</h3>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="flex items-center gap-1">
                                <BadgePercent className="h-3 w-3" />
                                {Math.round(recipe.utilizationScore * 100)}% match
                              </Badge>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            <span className="text-sm font-medium">You have:</span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {recipe.matchedIngredients.map((ingredient) => (
                              <Badge key={ingredient} variant="outline" className="text-xs">
                                {ingredient}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        {recipe.missingKeyIngredients && recipe.missingKeyIngredients.length > 0 && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <CookingPot className="h-4 w-4 text-orange-500" />
                              <span className="text-sm font-medium">You'll need:</span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {recipe.missingKeyIngredients.map((ingredient) => (
                                <Badge key={ingredient} variant="secondary" className="text-xs">
                                  {ingredient}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {recipe.notes && (
                          <p className="text-sm text-muted-foreground italic">{recipe.notes}</p>
                        )}
                      </div>
                    </CardContent>
                    {fullRecipe && (
                      <CardFooter>
                        <Button asChild className="w-full">
                          <Link href={`/recipes/${fullRecipe.id}`}>
                            View Full Recipe
                          </Link>
                        </Button>
                      </CardFooter>
                    )}
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {suggestion && suggestion.suggestedRecipes.length === 0 && (
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="space-y-2">
                <Lightbulb className="h-8 w-8 text-yellow-500 mx-auto" />
                <h3 className="text-lg font-semibold">No Perfect Matches</h3>
                <p className="text-muted-foreground">
                  I couldn't find recipes that closely match your available ingredients. 
                  Try adding more common ingredients or check your <Link href="/recipes" className="text-primary underline">recipe collection</Link>.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </PageWrapper>
  );
}
