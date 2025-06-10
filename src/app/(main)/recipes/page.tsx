
"use client";

import { useState, useEffect } from 'react';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { RecipeCard } from '@/components/shared/RecipeCard';
import { MEAL_TYPES } from '@/lib/data'; 
import type { Recipe, MealType } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, startOfDay, addDays, isWithinInterval, isSameDay, isAfter } from 'date-fns';
import { Calendar as CalendarIcon, Filter, Search, PlusCircle, Loader2, Info, Lock } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Link from 'next/link';

const FREE_TIER_RECIPE_DISPLAY_LIMIT = 15;

const isDateAllowedForFreeTier = (date: Date | undefined): boolean => {
  if (!date) return false;
  const today = startOfDay(new Date());
  const tomorrow = addDays(today, 1);
  return isWithinInterval(startOfDay(date), { start: today, end: tomorrow });
};

export default function RecipesPage() {
  const { userProfile, addMealToPlan, allRecipesCache, isRecipeCacheLoading: isAppRecipeCacheLoading } = useAppContext();
  const { toast } = useToast();
  
  const [recipesToDisplay, setRecipesToDisplay] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [showAddToPlanDialog, setShowAddToPlanDialog] = useState(false);
  const [planDate, setPlanDate] = useState<Date | undefined>(new Date());
  const [planMealType, setPlanMealType] = useState<MealType | undefined>(MEAL_TYPES[0]);
  const [planServings, setPlanServings] = useState<number>(1);

  const isSubscribedActive = userProfile?.subscription_status === 'active';

  useEffect(() => {
    if (!isAppRecipeCacheLoading) {
      setIsLoading(true);
      if (allRecipesCache.length > 0) {
        setRecipesToDisplay(allRecipesCache);
        setError(null);
      } else {
        setError("No recipes found or failed to load recipes from the database.");
        setRecipesToDisplay([]);
      }
      setIsLoading(false);
    } else {
      setIsLoading(true);
    }
  }, [allRecipesCache, isAppRecipeCacheLoading]);

  let filteredRecipes = recipesToDisplay.filter(recipe =>
    recipe.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (recipe.description && recipe.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (recipe.tags && recipe.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())))
  );

  const totalFilteredRecipesCount = filteredRecipes.length;
  if (!isSubscribedActive) {
    filteredRecipes = filteredRecipes.slice(0, FREE_TIER_RECIPE_DISPLAY_LIMIT);
  }

  const handleOpenAddToPlanDialog = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setPlanServings(recipe.servings);
    // Reset date to today if opening dialog for free user, ensure it's valid
    setPlanDate(isSubscribedActive ? new Date() : (isDateAllowedForFreeTier(new Date()) ? new Date() : startOfDay(new Date())));
    setShowAddToPlanDialog(true);
  };

  const handleAddToMealPlan = () => {
    if (selectedRecipe && planDate && planMealType && planServings > 0) {
      if (!isSubscribedActive && !isDateAllowedForFreeTier(planDate)) {
        toast({
          title: "Date Restricted",
          description: "Free users can only plan meals for today or tomorrow. Please upgrade for more flexibility.",
          variant: 'destructive',
        });
        return;
      }
      addMealToPlan(selectedRecipe, format(planDate, 'yyyy-MM-dd'), planMealType, planServings);
      toast({
        title: "Meal Added",
        description: `${selectedRecipe.name} added to your meal plan for ${format(planDate, 'PPP')} (${planMealType}).`,
        variant: 'default',
      });
      setShowAddToPlanDialog(false);
      setSelectedRecipe(null);
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


  return (
    <PageWrapper title="Discover Recipes">
      <div className="mb-8 flex flex-col md:flex-row gap-4">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search recipes by name, description, or tag..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {!isSubscribedActive && totalFilteredRecipesCount > FREE_TIER_RECIPE_DISPLAY_LIMIT && (
        <Alert variant="default" className="mb-6 border-accent">
          <Lock className="h-5 w-5 text-accent" />
          <AlertTitle className="text-accent">Recipe Limit Reached</AlertTitle>
          <AlertDescription>
            You are viewing {FREE_TIER_RECIPE_DISPLAY_LIMIT} of {totalFilteredRecipesCount} available recipes. 
            <Link href="/profile/subscription" className="underline hover:text-primary"> Upgrade your plan </Link> 
            to access all recipes and features.
          </AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="flex justify-center items-center min-h-[200px]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="ml-2 text-muted-foreground">Loading recipes...</p>
        </div>
      ) : error ? (
         <Alert variant="destructive">
            <Info className="h-4 w-4" />
            <AlertTitle>Error Loading Recipes</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
      ) : filteredRecipes.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRecipes.map((recipe) => (
            <RecipeCard 
              key={recipe.id} 
              recipe={recipe} 
              onAddToMealPlan={handleOpenAddToPlanDialog}
              showAddToMealPlanButton={true}
              showViewDetailsButton={true}
            />
          ))}
        </div>
      ) : (
        <p className="text-center text-muted-foreground mt-10">
          {searchTerm ? "No recipes found matching your search." : "No recipes available."}
        </p>
      )}

      {selectedRecipe && (
        <Dialog open={showAddToPlanDialog} onOpenChange={setShowAddToPlanDialog}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="font-headline text-primary">Add "{selectedRecipe.name}" to Meal Plan</DialogTitle>
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
                      initialFocus={!isSubscribedActive} // Focus if restricted to ensure user sees constraint
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
      )}
    </PageWrapper>
  );
}
