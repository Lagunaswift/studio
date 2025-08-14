
"use client";

import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { MEAL_TYPES, parseIngredientString } from '@/lib/data';
import type { Recipe as RecipeType, MealType, Macros, RecipeFormData } from '@/types';
import { MacroDisplay } from '@/components/shared/MacroDisplay';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Clock, Users, Utensils, ListChecks, Calendar as CalendarIcon, PlusCircle, ArrowLeft, Hourglass, Loader2, Info, Heart, Minus, Plus, Bot, Wand2, Save, AlertTriangle, Lock } from 'lucide-react';
import { useOptimizedProfile, useOptimizedRecipes } from '@/hooks/useOptimizedFirestore';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from '@/lib/utils';
import { optimizedAIService } from '@/lib/ai/OptimizedAIService';
import Link from 'next/link';
import { ProFeature } from '@/components/shared/ProFeature';


export default function RecipeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const idParam = typeof params.id === 'string' ? params.id : '';
  const recipeId = parseInt(idParam, 10);
  
  const [recipe, setRecipe] = useState<RecipeType | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null); 
  const { user } = useAuth();
  const { profile: userProfile, updateProfile } = useOptimizedProfile(user?.uid);
  const { recipes: allRecipesCache } = useOptimizedRecipes(user?.uid);

  const { toast } = useToast();
  
  const [showAddToPlanDialog, setShowAddToPlanDialog] = useState(false);
  const [planDate, setPlanDate] = useState<Date | undefined>(new Date());
  const [planMealType, setPlanMealType] = useState<MealType | undefined>(MEAL_TYPES[0]);
  const [planServings, setPlanServings] = useState<number>(1);

  const [displayServings, setDisplayServings] = useState<number>(1);
  const [scaledIngredients, setScaledIngredients] = useState<string[]>([]);
  const [scaledMacros, setScaledMacros] = useState<Macros>({ calories: 0, protein: 0, carbs: 0, fat: 0 });

  const [tweakRequest, setTweakRequest] = useState('');
  const [isTweaking, setIsTweaking] = useState(false);
  const [tweakError, setTweakError] = useState<string | null>(null);
  const [tweakSuggestion, setTweakSuggestion] = useState<any | null>(null);

  const [imageLoadError, setImageLoadError] = useState(false);
  const isFavorited = recipe ? userProfile?.favorite_recipe_ids?.includes(recipe.id) : false;

  useEffect(() => {
    async function fetchRecipe() {
      if (isNaN(recipeId)) {
        setError("Invalid recipe ID.");
        setIsLoading(false);
        setImageLoadError(true);
        return;
      }
      setIsLoading(true);
      setError(null);
      setImageLoadError(false);
      
      try {
        const foundRecipe = allRecipesCache.find(r => r.id === recipeId);
        if (foundRecipe) {
          setRecipe(foundRecipe);
          setDisplayServings(foundRecipe.servings || 1);
          setPlanServings(foundRecipe.servings || 1);
        } else {
          setError(`Recipe with ID ${recipeId} not found.`);
          setImageLoadError(true);
        }
      } catch (e: any) {
        console.error("Error fetching recipe by ID:", e);
        setError(e.message || "Failed to load recipe.");
        setImageLoadError(true);
      } finally {
        setIsLoading(false);
      }
    }
    fetchRecipe();
  }, [recipeId, allRecipesCache]);

  useEffect(() => {
    if (!recipe || !recipe.macrosPerServing) {
      console.warn('Recipe or macrosPerServing is undefined:', recipe);
      return;
    }
  
    const currentDisplayServings = (!isNaN(displayServings) && displayServings > 0) ? displayServings : (recipe.servings || 1);
  
    const newMacros = {
      calories: (recipe.macrosPerServing?.calories || 0) * currentDisplayServings,
      protein: (recipe.macrosPerServing?.protein || 0) * currentDisplayServings,
      carbs: (recipe.macrosPerServing?.carbs || 0) * currentDisplayServings,
      fat: (recipe.macrosPerServing?.fat || 0) * currentDisplayServings,
    };
    setScaledMacros(newMacros);
    
    const newIngredients = recipe.ingredients.map(ing => {
        const ingStr = typeof ing === 'string' ? ing : `${ing.quantity} ${ing.unit} ${ing.name}`;
        const parsed = parseIngredientString(ingStr);
        if (!parsed.name || parsed.name.toLowerCase() === 'non-item' || parsed.quantity <= 0) {
            return null;
        }

        const recipeBaseServings = recipe.servings > 0 ? recipe.servings : 1;
        const quantityPerServing = parsed.quantity / recipeBaseServings;
        const newQuantity = quantityPerServing * currentDisplayServings;
        
        const formattedQuantity = newQuantity % 1 !== 0 ? parseFloat(newQuantity.toFixed(2)) : newQuantity;
        return `${formattedQuantity} ${parsed.unit} ${parsed.name}`;
    }).filter((ing): ing is string => ing !== null);

    setScaledIngredients(newIngredients);

  }, [displayServings, recipe]);


  const handleImageError = () => {
    if (!imageLoadError) {
      setImageLoadError(true);
    }
  };

  const handleOpenAddToPlanDialog = () => {
    if (recipe) {
      setPlanServings(displayServings);
      setPlanDate(new Date());
      setShowAddToPlanDialog(true);
    }
  };

  const handleAddToMealPlan = async () => {
    if (!recipe || !planDate || !planMealType || planServings <= 0 || !user) {
      toast({ 
        title: "Error", 
        description: "Please fill all fields.",
        variant: 'destructive'
      });
      return;
    }

    try {
      const idToken = await user.getIdToken();
      const dateStr = format(planDate, 'yyyy-MM-dd');
      
      const mealData = {
        recipeId: recipe.id,
        date: dateStr,
        mealType: planMealType,
        servings: planServings,
        status: 'planned'
      };

      // Import addMealToDay dynamically to avoid circular imports
      const { addMealToDay } = await import('@/app/(main)/profile/actions');
      const result = await addMealToDay(idToken, dateStr, mealData);
      
      if (result.success) {
        toast({
          title: "Meal Added",
          description: `${recipe.name} added to your meal plan for ${format(planDate, 'PPP')} (${planMealType}).`,
        });
        setShowAddToPlanDialog(false);
      } else {
        toast({ 
          title: "Error", 
          description: result.error || "Failed to add meal to plan.",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error('Add to meal plan error:', error);
      toast({
        title: "Error adding meal",
        description: "Failed to add meal to plan.",
        variant: 'destructive',
      });
    }
    } else {
       toast({
        title: "Error",
        description: "Please fill all fields to add meal to plan.",
        variant: 'destructive',
      });
    }
  };
  
  const handleFavoriteToggle = async (e: React.MouseEvent) => {
    e.preventDefault(); 
    e.stopPropagation();
    if (recipe) {
      try {
        const newFavorites = isFavorited ? userProfile?.favorite_recipe_ids?.filter(id => id !== recipe.id) : [...(userProfile?.favorite_recipe_ids || []), recipe.id];
        await updateProfile({ favorite_recipe_ids: newFavorites });
        toast({
            title: !isFavorited ? "Recipe Favorited!" : "Recipe Unfavorited",
            description: !isFavorited ? `${recipe.name} added to your favorites.` : `${recipe.name} removed from your favorites.`,
        });
      } catch (error: any) {
         toast({ title: "Error", description: error.message || "Could not update favorites.", variant: "destructive" });
      }
    }
  };

  const handleServingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '') {
        setDisplayServings(NaN);
    } else {
        const num = parseInt(val, 10);
        if (!isNaN(num) && num > 0) {
            setDisplayServings(num);
        }
    }
  };

  const handleServingBlur = () => {
    if (isNaN(displayServings)) {
        setDisplayServings(recipe?.servings || 1);
    }
  };
  
  const handleTweakRecipe = async () => {
    if (!recipe || !tweakRequest.trim()) return;

    setIsTweaking(true);
    setTweakError(null);
    setTweakSuggestion(null);

    try {
      const result = await optimizedAIService.generateRecipeSuggestions(
        recipe.ingredients.map(i => typeof i === 'string' ? i : i.name),
        {
            dietType: userProfile?.dietaryPreferences?.join(', '),
            allergens: userProfile?.allergens
        }
      );
      if (result.success) {
        setTweakSuggestion(result.data);
      } else {
          setTweakError(result.error);
          if(result.fallback) {
              setTweakSuggestion(result.fallback)
          }
      }

    } catch (err: any) {
      console.error("AI Tweak Error:", err);
      let detailedMessage = "Failed to get recipe modification.";
      if (err.message) {
        detailedMessage = err.message;
      }
      setTweakError(detailedMessage);
    } finally {
      setIsTweaking(false);
    }
  };
  
  const handleSaveTweak = async () => {
    if (!tweakSuggestion || !recipe) return;
    // This part would need to be re-implemented based on the new suggestion format
  };

  if (isLoading) {
    return (
      <PageWrapper title="Loading Recipe...">
        <div className="flex justify-center items-center min-h-[300px]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </PageWrapper>
    );
  }

  if (error && !recipe) { 
    return (
      <PageWrapper title="Error">
        <Alert variant="destructive">
          <Info className="h-4 w-4" />
          <AlertTitle>Could Not Load Recipe</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={() => router.back()} variant="outline" className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
        </Button>
      </PageWrapper>
    );
  }

  if (!recipe) { 
    return (
      <PageWrapper title="Recipe Not Found">
        <Alert variant="default">
           <Info className="h-4 w-4" />
          <AlertTitle>Recipe Not Found</AlertTitle>
          <AlertDescription>The recipe you are looking for does not exist or could not be loaded.</AlertDescription>
        </Alert>
        <Button onClick={() => router.back()} variant="outline" className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
        </Button>
      </PageWrapper>
    );
  }
  
  const aiHint = recipe && recipe.tags && recipe.tags.length > 0 ? recipe.tags.slice(0, 2).join(' ') : "food meal";
  const dynamicImageSrc = `/images/${recipe.id}.jpg`;
  const defaultPlaceholder = `https://placehold.co/600x400.png`;
  const imageSrc = imageLoadError ? defaultPlaceholder : dynamicImageSrc;

  const renderRecipeTweaker = () => {
    if (!userProfile?.subscription_status || userProfile.subscription_status !== 'active') {
      return (
          <ProFeature featureName="The Recipe Tweaker" description="Ask Preppy to modify this recipe to suit your needs! For example, 'make this vegetarian' or 'what can I use instead of almonds?'." hideWrapper />
      );
    }
    return (
      <>
        <CardDescription>
            Want to change something? Ask me to modify this recipe for you.
        </CardDescription>
        <CardContent className="space-y-4 pt-6">
            <Textarea
            placeholder="e.g., Make this vegetarian, replace mushrooms, suggest a low-carb side dish..."
            rows={3}
            value={tweakRequest}
            onChange={(e) => setTweakRequest(e.target.value)}
            disabled={isTweaking}
            />
            <Button onClick={handleTweakRecipe} disabled={isTweaking || !tweakRequest.trim()} className="bg-primary hover:bg-primary/90">
            {isTweaking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
            Tweak Recipe
            </Button>
        </CardContent>
      </>
    );
  };


  return (
    <PageWrapper>
      <Button onClick={() => router.back()} variant="outline" className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Recipes
      </Button>
      <Card className="overflow-hidden shadow-xl rounded-lg">
        <div className="relative w-full h-64 md:h-96">
          <Image
            src={imageSrc} 
            alt={recipe.name}
            fill
            sizes="(max-width: 768px) 100vw, 100vw"
            className="object-cover"
            priority
            data-ai-hint={imageLoadError ? aiHint : undefined}
            onError={handleImageError} 
          />
           <Button 
              variant="ghost" 
              size="icon" 
              className="absolute top-3 right-3 bg-background/70 hover:bg-background/90 text-primary hover:text-accent p-2 rounded-full shadow-md"
              onClick={handleFavoriteToggle}
              aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
            >
              <Heart className={cn("w-6 h-6", isFavorited ? "fill-accent text-accent" : "text-muted-foreground")} />
            </Button>
        </div>
        <CardHeader className="p-6">
          <CardTitle className="text-3xl md:text-4xl font-bold font-headline text-primary break-words">{recipe.name}</CardTitle>
          {imageLoadError && !error && <Alert variant="default" className="mt-2 border-accent"><AlertDescription>Original image not found. Displaying placeholder for Recipe ID {recipe.id}.</AlertDescription></Alert>}
          {error && <Alert variant="destructive" className="mt-2"><AlertDescription>{error} Displaying placeholder.</AlertDescription></Alert>}
          {recipe.description && <p className="text-muted-foreground mt-2">{recipe.description}</p>}
          <div className="mt-4 flex flex-wrap gap-4 items-center">
             <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="text-sm">
                  <Clock className="w-4 h-4 mr-1 text-accent" /> Prep: {recipe.prepTime}
                </Badge>
                <Badge variant="secondary" className="text-sm">
                  <Clock className="w-4 h-4 mr-1 text-accent" /> Cook: {recipe.cookTime}
                </Badge>
                {recipe.chillTime && (
                  <Badge variant="secondary" className="text-sm">
                    <Hourglass className="w-4 h-4 mr-1 text-accent" /> Chill: {recipe.chillTime}
                  </Badge>
                )}
                <Badge variant="secondary" className="text-sm">
                  <Users className="w-4 h-4 mr-1 text-accent" /> Serves: {recipe.servings} (Original)
                </Badge>
            </div>
          </div>
           {recipe.tags && recipe.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {recipe.tags.map(tag => (
                <Badge key={tag} variant="outline" className="text-accent border-accent">{tag}</Badge>
              ))}
            </div>
          )}
        </CardHeader>
        <CardContent className="p-6">
          <div className="mb-8 space-y-4">
            <h3 className="text-2xl font-semibold font-headline text-primary mb-4 flex items-center">
                <ListChecks className="w-6 h-6 mr-2 text-accent" /> Ingredients for <span className="text-accent ml-2">{displayServings || recipe.servings}</span> serving(s)
            </h3>
             <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                <Label htmlFor="servings-scaler" className="text-sm font-medium whitespace-nowrap">Scale Recipe:</Label>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setDisplayServings(s => Math.max(1, (isNaN(s) ? recipe.servings : s) - 1))}>
                        <Minus className="h-4 w-4" />
                    </Button>
                    <Input
                        id="servings-scaler"
                        type="number"
                        value={isNaN(displayServings) ? '' : displayServings}
                        onChange={handleServingChange}
                        onBlur={handleServingBlur}
                        className="w-20 h-8 text-center"
                        min="1"
                    />
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setDisplayServings(s => (isNaN(s) ? recipe.servings : s) + 1)}>
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>
            </div>
            <ul className="space-y-2 list-disc list-inside bg-secondary/30 p-4 rounded-md">
                {scaledIngredients.map((ingredient, index) => (
                    <li key={index} className="text-foreground/90">
                    {ingredient}
                    </li>
                ))}
            </ul>
             <Alert variant="default" className="mt-4 border-destructive/20 text-destructive dark:text-orange-300 dark:border-orange-300/30">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Health & Safety Note</AlertTitle>
                <AlertDescription className="text-xs">
                    Recipe tags and ingredients are for informational purposes. Always verify product labels to ensure they are free from your specific allergens before purchasing or consuming.
                </AlertDescription>
            </Alert>
          </div>

          <div className="mb-8">
            <MacroDisplay macros={scaledMacros} title={`Macros for ${displayServings || recipe.servings} serving(s)`} />
          </div>
          
          <Button onClick={handleOpenAddToPlanDialog} size="lg" className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground mb-8">
            <PlusCircle className="mr-2 h-5 w-5" /> Add to Meal Plan
          </Button>

          <Separator className="my-8" />

          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-2xl font-semibold font-headline text-primary mb-4 flex items-center">
                <Utensils className="w-6 h-6 mr-2 text-accent" /> Instructions
              </h3>
              <ol className="space-y-3 list-decimal list-inside">
                {recipe.instructions.map((step, index) => (
                  <li key={index} className="text-foreground/90 leading-relaxed">
                    {step}
                  </li>
                ))}
              </ol>
            </div>
            <div>
              <h3 className="text-xl font-semibold font-headline text-muted-foreground mb-4 flex items-center">
                Original Ingredients (for {recipe.servings} servings)
              </h3>
              <ul className="space-y-2 list-disc list-inside bg-muted/20 p-4 rounded-md text-sm text-muted-foreground">
                {recipe.ingredients.map((ingredient, index) => (
                  <li key={index}>
                    {ingredient.name}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Separator className="my-12" />

      <Card className="shadow-lg mt-8">
        <CardHeader>
          <CardTitle className="font-headline text-primary flex items-center">
            <Bot className="w-6 h-6 mr-2 text-accent" />
            Preppy: Recipe Tweaker
          </CardTitle>
          {renderRecipeTweaker()}
        </CardHeader>
      </Card>
      
      {isTweaking && (
        <div className="flex flex-col items-center justify-center h-60 text-muted-foreground mt-4">
            <Loader2 className="h-16 w-16 animate-spin text-accent mb-6" />
            <p className="text-lg">AI is tweaking the recipe...</p>
        </div>
      )}

      {tweakError && (
        <Alert variant="destructive" className="mt-4">
          <Info className="h-4 w-4" />
          <AlertTitle>Error Modifying Recipe</AlertTitle>
          <AlertDescription>{tweakError}</AlertDescription>
        </Alert>
      )}

      {tweakSuggestion && !isTweaking && (
         <Card className="shadow-xl mt-4 border-accent">
            <CardHeader>
                <CardTitle className="font-headline text-primary flex items-center">
                    <Wand2 className="w-6 h-6 mr-2 text-accent" />
                    My Modified Recipe: {tweakSuggestion.newName}
                </CardTitle>
                <CardDescription>{tweakSuggestion.newDescription}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div>
                    <h4 className="text-lg font-semibold mb-2 text-primary-focus">My Justification:</h4>
                    <p className="text-sm text-foreground/80 bg-secondary/50 p-3 rounded-md italic">"{tweakSuggestion.aiJustification}"</p>
                </div>
                
                <Separator/>

                <div className="grid md:grid-cols-2 gap-8">
                    <div>
                        <h4 className="text-lg font-semibold mb-2 text-primary-focus">New Ingredients</h4>
                        <ul className="space-y-2 list-disc list-inside bg-secondary/30 p-4 rounded-md text-sm">
                            {tweakSuggestion.newIngredients.map((ing: string, i: number) => <li key={i}>{ing}</li>)}
                        </ul>
                    </div>
                    <div>
                        <h4 className="text-lg font-semibold mb-2 text-primary-focus">New Instructions</h4>
                        <ol className="space-y-3 list-decimal list-inside text-sm">
                            {tweakSuggestion.newInstructions.map((step: string, i: number) => <li key={i}>{step}</li>)}
                        </ol>
                    </div>
                </div>
            </CardContent>
            <CardFooter>
                 <Button onClick={handleSaveTweak} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                    <Save className="mr-2 h-4 w-4" /> Save as New Recipe
                </Button>
            </CardFooter>
         </Card>
      )}


      <Dialog open={showAddToPlanDialog} onOpenChange={setShowAddToPlanDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="font-headline text-primary">Add "{recipe.name}" to Meal Plan</DialogTitle>
            <DialogDescription>
              Select the date, meal type, and servings for this recipe.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="date" className="text-right">Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className="col-span-3 justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {planDate ? format(planDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single" selected={planDate} onSelect={setPlanDate}
                    disabled={undefined} initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="mealType" className="text-right">Meal Type</Label>
              <Select value={planMealType} onValueChange={(value: MealType) => setPlanMealType(value)}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select meal type" />
                </SelectTrigger>
                <SelectContent>
                  {MEAL_TYPES.map(type => (<SelectItem key={type} value={type}>{type}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="servings" className="text-right">Servings</Label>
              <Input
                id="servings"
                type="number"
                min="1"
                value={planServings}
                onChange={(e) => setPlanServings(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddToPlanDialog(false)}>Cancel</Button>
            <Button 
              onClick={handleAddToMealPlan} 
              className="bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              <PlusCircle className="mr-2 h-4 w-4" /> Add to Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
