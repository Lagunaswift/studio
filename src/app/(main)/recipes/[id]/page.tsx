
"use client";

import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { getRecipeById, MEAL_TYPES, parseIngredientString } from '@/lib/data';
import type { Recipe as RecipeType, MealType, Macros, RecipeFormData } from '@/types';
import { MacroDisplay } from '@/components/shared/MacroDisplay';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Clock, Users, Utensils, ListChecks, Calendar as CalendarIcon, PlusCircle, ArrowLeft, Hourglass, Loader2, Info, Heart, Minus, Plus, Bot, Sparkles, Save, Lock, AlertTriangle } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { format, startOfDay, addDays, isWithinInterval } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from '@/lib/utils';
import { suggestRecipeModification, type SuggestRecipeModificationInput, type SuggestRecipeModificationOutput } from '@/ai/flows/suggest-recipe-modification-flow';


const isDateAllowedForFreeTier = (date: Date | undefined): boolean => {
  if (!date) return false;
  const today = startOfDay(new Date());
  const tomorrow = addDays(today, 1);
  return isWithinInterval(startOfDay(date), { start: today, end: tomorrow });
};

export default function RecipeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const idParam = typeof params.id === 'string' ? params.id : '';
  const recipeId = parseInt(idParam, 10);
  
  const [recipe, setRecipe] = useState<RecipeType | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null); 
  const { userProfile, addMealToPlan, toggleFavoriteRecipe, isRecipeFavorite, addCustomRecipe } = useAppContext();
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
  const [tweakSuggestion, setTweakSuggestion] = useState<SuggestRecipeModificationOutput | null>(null);


  const [currentImageSrc, setCurrentImageSrc] = useState<string>('');
  const [imageLoadError, setImageLoadError] = useState(false);

  const isSubscribedActive = userProfile?.subscription_status === 'active';
  const isFavorited = recipe ? isRecipeFavorite(recipe.id) : false;

  useEffect(() => {
    async function fetchRecipe() {
      if (isNaN(recipeId)) {
        setError("Invalid recipe ID.");
        setIsLoading(false);
        setCurrentImageSrc(`https://placehold.co/600x400/007bff/ffffff.png?text=Error`);
        setImageLoadError(true);
        return;
      }
      setIsLoading(true);
      setError(null);
      setImageLoadError(false);
      
      try {
        const foundRecipe = await getRecipeById(recipeId);
        if (foundRecipe) {
          setRecipe(foundRecipe);
          setCurrentImageSrc(foundRecipe.image);
          setDisplayServings(foundRecipe.servings || 1);
          setPlanServings(foundRecipe.servings || 1);
          setScaledIngredients(foundRecipe.ingredients);
          setScaledMacros(foundRecipe.macrosPerServing);
        } else {
          setError(`Recipe with ID ${recipeId} not found.`);
          setCurrentImageSrc(`https://placehold.co/600x400/007bff/ffffff.png?text=Recipe+Not+Found`);
          setImageLoadError(true);
        }
      } catch (e: any) {
        console.error("Error fetching recipe by ID:", e);
        setError(e.message || "Failed to load recipe.");
        setCurrentImageSrc(`https://placehold.co/600x400/007bff/ffffff.png?text=Error+Loading`);
        setImageLoadError(true);
      } finally {
        setIsLoading(false);
      }
    }
    fetchRecipe();
  }, [recipeId]);

  useEffect(() => {
    if (!recipe || isNaN(displayServings) || displayServings <= 0) {
      return;
    }
    
    const scalingFactor = displayServings / recipe.servings;

    const newMacros = {
      calories: recipe.macrosPerServing.calories * scalingFactor,
      protein: recipe.macrosPerServing.protein * scalingFactor,
      carbs: recipe.macrosPerServing.carbs * scalingFactor,
      fat: recipe.macrosPerServing.fat * scalingFactor,
    };
    setScaledMacros(newMacros);

    const newIngredients = recipe.ingredients.map(ing => {
      const parsed = parseIngredientString(ing);
      const originalQtyIsOneAndImplicit = parsed.quantity === 1 && !ing.trim().match(/^(1|1\.0)\s/);

      if (originalQtyIsOneAndImplicit) {
        return ing;
      }
      
      const newQuantity = parsed.quantity * scalingFactor;
      const formattedQuantity = newQuantity.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).replace(/\.00$/, '');

      if (parsed.unit === 'item(s)') {
        return `${formattedQuantity} ${parsed.name}`;
      }
      
      return `${formattedQuantity} ${parsed.unit} ${parsed.name}`;
    });
    setScaledIngredients(newIngredients);

  }, [displayServings, recipe]);


  const handleImageError = () => {
    setCurrentImageSrc(`https://placehold.co/600x400/007bff/ffffff.png?text=Recipe+ID+${recipeId}`);
    setImageLoadError(true);
  };

  const handleOpenAddToPlanDialog = () => {
    if (recipe) {
      setPlanServings(displayServings);
      setPlanDate(isSubscribedActive ? new Date() : (isDateAllowedForFreeTier(new Date()) ? new Date() : startOfDay(new Date())));
      setShowAddToPlanDialog(true);
    }
  };

  const handleAddToMealPlan = () => {
    if (recipe && planDate && planMealType && planServings > 0) {
       if (!isSubscribedActive && !isDateAllowedForFreeTier(planDate)) {
        toast({
          title: "Date Restricted",
          description: "Free users can only plan meals for today or tomorrow. Please upgrade for more flexibility.",
          variant: 'destructive',
        });
        return;
      }
      addMealToPlan(recipe, format(planDate, 'yyyy-MM-dd'), planMealType, planServings);
      toast({
        title: "Meal Added",
        description: `${recipe.name} added to your meal plan for ${format(planDate, 'PPP')} (${planMealType}).`,
      });
      setShowAddToPlanDialog(false);
    } else {
       toast({
        title: "Error",
        description: "Please fill all fields to add meal to plan.",
        variant: 'destructive',
      });
    }
  };
  
  const handleFavoriteToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    if (recipe) {
      toggleFavoriteRecipe(recipe.id);
      toast({
        title: !isFavorited ? "Recipe Favorited!" : "Recipe Unfavorited",
        description: !isFavorited ? `${recipe.name} added to your favorites.` : `${recipe.name} removed from your favorites.`,
      });
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

    if (!isSubscribedActive) {
      setTweakError("AI Recipe Tweaker is a premium feature. Please upgrade your plan to use it.");
      return;
    }

    setIsTweaking(true);
    setTweakError(null);
    setTweakSuggestion(null);

    try {
      const input: SuggestRecipeModificationInput = {
        recipeToModify: {
          name: recipe.name,
          description: recipe.description,
          ingredients: recipe.ingredients,
          instructions: recipe.instructions,
          tags: recipe.tags,
        },
        userRequest: tweakRequest,
      };
      const result = await suggestRecipeModification(input);
      setTweakSuggestion(result);
    } catch (err: any) {
      console.error("AI Tweak Error:", err);
      let detailedMessage = "Failed to get recipe modification.";
      if (err.message) {
        detailedMessage = err.message;
      }
      if (err.digest) { 
        detailedMessage += ` Server error digest: ${err.digest}.`;
      }
      setTweakError(detailedMessage);
    } finally {
      setIsTweaking(false);
    }
  };
  
  const handleSaveTweak = () => {
    if (!tweakSuggestion || !recipe) return;

    const recipeFormData: RecipeFormData = {
        name: tweakSuggestion.newName,
        description: tweakSuggestion.newDescription,
        image: recipe.image,
        servings: recipe.servings,
        prepTime: recipe.prepTime,
        cookTime: recipe.cookTime,
        chillTime: recipe.chillTime,
        ingredients: tweakSuggestion.newIngredients.map(value => ({ value })),
        instructions: tweakSuggestion.newInstructions.map(value => ({ value })),
        calories: recipe.macrosPerServing.calories,
        protein: recipe.macrosPerServing.protein,
        carbs: recipe.macrosPerServing.carbs,
        fat: recipe.macrosPerServing.fat,
        tags: [...(recipe.tags || []).filter(t => t !== 'AI-Tweaked'), 'AI-Tweaked'],
    };

    try {
        addCustomRecipe(recipeFormData);
        toast({
            title: "New Recipe Saved!",
            description: `"${tweakSuggestion.newName}" has been added to your recipes.`,
        });
        router.push('/recipes');
    } catch (error: any) {
        console.error("Error saving tweaked recipe:", error);
        toast({
            title: "Error Saving Recipe",
            description: error.message || "Could not save the new recipe.",
            variant: "destructive",
        });
    }
  };


  const todayForCalendar = startOfDay(new Date());
  const tomorrowForCalendar = addDays(todayForCalendar, 1);
  const disabledCalendarMatcher = isSubscribedActive ? undefined : (date: Date) => !isWithinInterval(startOfDay(date), {start: todayForCalendar, end: tomorrowForCalendar});

  const aiHint = recipe && recipe.tags && recipe.tags.length > 0 ? recipe.tags.slice(0, 2).join(' ') : "food meal";

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

  return (
    <PageWrapper>
      <Button onClick={() => router.back()} variant="outline" className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Recipes
      </Button>
      <Card className="overflow-hidden shadow-xl rounded-lg">
        <div className="relative w-full h-64 md:h-96">
          <Image
            src={currentImageSrc} 
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
          <CardTitle className="text-3xl md:text-4xl font-bold font-headline text-primary">{recipe.name}</CardTitle>
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
                    {ingredient}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Separator className="my-12" />

      {isSubscribedActive ? (
        <Card className="shadow-lg mt-8">
          <CardHeader>
            <CardTitle className="font-headline text-primary flex items-center">
              <Bot className="w-6 h-6 mr-2 text-accent" />
              AI Recipe Tweaker
            </CardTitle>
            <CardDescription>
              Want to change something? Ask the AI to modify this recipe for you.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="e.g., Make this vegetarian, replace mushrooms, suggest a low-carb side dish..."
              rows={3}
              value={tweakRequest}
              onChange={(e) => setTweakRequest(e.target.value)}
              disabled={isTweaking}
            />
            <Button onClick={handleTweakRecipe} disabled={isTweaking || !tweakRequest.trim()} className="bg-primary hover:bg-primary/90">
              {isTweaking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              Tweak Recipe
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Alert variant="default" className="border-accent mt-8">
          <Lock className="h-5 w-5 text-accent" />
          <AlertTitle className="text-accent font-headline">Premium Feature Locked</AlertTitle>
          <AlertDescription>
            The AI Recipe Tweaker is available for subscribed users.
            <Link href="/profile/subscription" className="underline hover:text-primary font-semibold ml-1">Upgrade your plan</Link> to unlock this feature.
          </AlertDescription>
        </Alert>
      )}
      
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
                    <Sparkles className="w-6 h-6 mr-2 text-accent" />
                    AI's Modified Recipe: {tweakSuggestion.newName}
                </CardTitle>
                <CardDescription>{tweakSuggestion.newDescription}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div>
                    <h4 className="text-lg font-semibold mb-2 text-primary-focus">AI's Justification:</h4>
                    <p className="text-sm text-foreground/80 bg-secondary/50 p-3 rounded-md italic">"{tweakSuggestion.aiJustification}"</p>
                </div>
                
                <Separator/>

                <div className="grid md:grid-cols-2 gap-8">
                    <div>
                        <h4 className="text-lg font-semibold mb-2 text-primary-focus">New Ingredients</h4>
                        <ul className="space-y-2 list-disc list-inside bg-secondary/30 p-4 rounded-md text-sm">
                            {tweakSuggestion.newIngredients.map((ing, i) => <li key={i}>{ing}</li>)}
                        </ul>
                    </div>
                    <div>
                        <h4 className="text-lg font-semibold mb-2 text-primary-focus">New Instructions</h4>
                        <ol className="space-y-3 list-decimal list-inside text-sm">
                            {tweakSuggestion.newInstructions.map((step, i) => <li key={i}>{step}</li>)}
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
              {!isSubscribedActive && " Free users can plan for today or tomorrow only."}
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
                    mode="single"
                    selected={planDate}
                    onSelect={setPlanDate}
                    disabled={disabledCalendarMatcher}
                    initialFocus={!isSubscribedActive}
                    fromDate={!isSubscribedActive ? todayForCalendar : undefined}
                    toDate={!isSubscribedActive ? tomorrowForCalendar : undefined}
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
                  {MEAL_TYPES.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
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
              disabled={!isSubscribedActive && !isDateAllowedForFreeTier(planDate)}
            >
              <PlusCircle className="mr-2 h-4 w-4" /> Add to Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
