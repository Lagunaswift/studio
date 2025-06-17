
"use client";

import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { getRecipeById, MEAL_TYPES } from '@/lib/data';
import type { Recipe as RecipeType, MealType } from '@/types';
import { MacroDisplay } from '@/components/shared/MacroDisplay';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Clock, Users, Utensils, ListChecks, Calendar as CalendarIcon, PlusCircle, ArrowLeft, Hourglass, Loader2, Info } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { format, startOfDay, addDays, isWithinInterval } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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
  const { userProfile, addMealToPlan } = useAppContext(); 
  const { toast } = useToast();
  const [showAddToPlanDialog, setShowAddToPlanDialog] = useState(false);
  const [planDate, setPlanDate] = useState<Date | undefined>(new Date());
  const [planMealType, setPlanMealType] = useState<MealType | undefined>(MEAL_TYPES[0]);
  const [planServings, setPlanServings] = useState<number>(1);

  const [currentImageSrc, setCurrentImageSrc] = useState<string>('');
  const [imageError, setImageError] = useState(false);

  const isSubscribedActive = userProfile?.subscription_status === 'active';

  useEffect(() => {
    async function fetchRecipe() {
      if (isNaN(recipeId)) {
        setError("Invalid recipe ID.");
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      setError(null);
      setImageError(false);
      
      try {
        const foundRecipe = await getRecipeById(recipeId);
        if (foundRecipe) {
          setRecipe(foundRecipe);
          setCurrentImageSrc(foundRecipe.image); // Use image path from recipe data
          setPlanServings(foundRecipe.servings || 1);
        } else {
          setError(`Recipe with ID ${recipeId} not found.`);
          setCurrentImageSrc(`https://placehold.co/600x400/007bff/ffffff.png?text=Recipe+Not+Found`);
          setImageError(true);
        }
      } catch (e: any) {
        console.error("Error fetching recipe by ID:", e);
        setError(e.message || "Failed to load recipe.");
        setCurrentImageSrc(`https://placehold.co/600x400/007bff/ffffff.png?text=Error+Loading`);
        setImageError(true);
      } finally {
        setIsLoading(false);
      }
    }
    fetchRecipe();
  }, [recipeId]);

  const handleImageError = () => {
    if (recipe) {
      setCurrentImageSrc(`https://placehold.co/600x400/007bff/ffffff.png?text=Recipe+ID+${recipe.id}`);
    } else {
      setCurrentImageSrc(`https://placehold.co/600x400/007bff/ffffff.png?text=Image+Error`);
    }
    setImageError(true);
  };

  const handleOpenAddToPlanDialog = () => {
    if (recipe) {
      setPlanServings(recipe.servings);
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
  
  const todayForCalendar = startOfDay(new Date());
  const tomorrowForCalendar = addDays(todayForCalendar, 1);
  const disabledCalendarMatcher = isSubscribedActive ? undefined : (date: Date) => !isWithinInterval(startOfDay(date), {start: todayForCalendar, end: tomorrowForCalendar});

  const aiHint = recipe && recipe.tags ? recipe.tags.slice(0,2).join(' ') : "food meal";

  if (isLoading) {
    return (
      <PageWrapper title="Loading Recipe...">
        <div className="flex justify-center items-center min-h-[300px]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </PageWrapper>
    );
  }

  if (error && !recipe) { // Only show full error page if recipe truly couldn't be found/loaded
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

  if (!recipe) { // Should be caught by error state above mostly, but as a fallback
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
            data-ai-hint={imageError ? aiHint : undefined}
            onError={handleImageError} 
          />
        </div>
        <CardHeader className="p-6">
          <CardTitle className="text-3xl md:text-4xl font-bold font-headline text-primary">{recipe.name}</CardTitle>
          {error && <Alert variant="destructive" className="mt-2"><AlertDescription>{error} Displaying placeholder.</AlertDescription></Alert>}
          {recipe.description && <p className="text-muted-foreground mt-2">{recipe.description}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
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
              <Users className="w-4 h-4 mr-1 text-accent" /> Serves: {recipe.servings}
            </Badge>
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
          <div className="mb-8">
            <MacroDisplay macros={recipe.macrosPerServing} title="Macros per Serving" />
          </div>
          
          <Button onClick={handleOpenAddToPlanDialog} size="lg" className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground mb-8">
            <PlusCircle className="mr-2 h-5 w-5" /> Add to Meal Plan
          </Button>

          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-2xl font-semibold font-headline text-primary mb-4 flex items-center">
                <ListChecks className="w-6 h-6 mr-2 text-accent" /> Ingredients
              </h3>
              <ul className="space-y-2 list-disc list-inside bg-secondary/30 p-4 rounded-md">
                {recipe.ingredients.map((ingredient, index) => (
                  <li key={index} className="text-foreground/90">
                    {ingredient}
                  </li>
                ))}
              </ul>
            </div>
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
          </div>
        </CardContent>
      </Card>

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

    