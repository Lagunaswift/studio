
"use client";

import { useState, useEffect, useCallback } from 'react';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { useAppContext } from '@/context/AppContext';
import type { PlannedMeal, MealType, Recipe } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { MacroDisplay } from '@/components/shared/MacroDisplay';
import { Calendar } from '@/components/ui/calendar';
import { format, addDays, subDays, isValid } from 'date-fns';
import { ChevronLeft, ChevronRight, Trash2, Edit3, PlusCircle, Loader2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { getRecipeById, getAllRecipes as fetchAllRecipes } from '@/lib/data'; // MEAL_TYPES removed as it's defined locally for slots
import { RecipeCard } from '@/components/shared/RecipeCard';

interface MealSlot {
  label: string;
  type: MealType;
}

const mealSlots: MealSlot[] = [
  { label: "Breakfast", type: "Breakfast" },
  { label: "Lunch", type: "Lunch" },
  { label: "Dinner", type: "Dinner" },
  { label: "Snack 1", type: "Snack" },
  { label: "Snack 2", type: "Snack" },
  { label: "Snack 3", type: "Snack" },
];

export default function MealPlanPage() {
  const { 
    getDailyMacros, 
    removeMealFromPlan, 
    updatePlannedMealServings, 
    clearMealPlanForDate, 
    getMealsForDate,
    addMealToPlan // Added from context
  } = useAppContext();

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [editingMeal, setEditingMeal] = useState<PlannedMeal | null>(null);
  const [newServings, setNewServings] = useState<number>(1);
  const [allRecipes, setAllRecipes] = useState<Recipe[]>([]);
  const [isLoadingRecipes, setIsLoadingRecipes] = useState(true);
  const { toast } = useToast();

  const formattedDate = format(selectedDate, 'yyyy-MM-dd');
  const dailyMeals = getMealsForDate(formattedDate);
  const dailyMacros = getDailyMacros(formattedDate);

  useEffect(() => {
    const loadRecipes = async () => {
      setIsLoadingRecipes(true);
      try {
        const recipes = await fetchAllRecipes();
        setAllRecipes(recipes);
      } catch (error) {
        console.error("Failed to load recipes for sliders:", error);
        toast({ title: "Error", description: "Could not load recipes for planning.", variant: "destructive" });
      } finally {
        setIsLoadingRecipes(false);
      }
    };
    loadRecipes();
  }, [toast]);

  const handleDateChange = (date: Date | undefined) => {
    if (date && isValid(date)) {
      setSelectedDate(date);
    }
  };

  const handleEditMeal = (meal: PlannedMeal) => {
    setEditingMeal(meal);
    setNewServings(meal.servings);
  };

  const handleSaveServings = () => {
    if (editingMeal && newServings > 0) {
      updatePlannedMealServings(editingMeal.id, newServings);
      toast({ title: "Servings Updated", description: `${editingMeal.recipeDetails?.name} servings updated to ${newServings}.` });
      setEditingMeal(null);
    } else {
      toast({ title: "Error", description: "Invalid servings amount.", variant: "destructive" });
    }
  };

  const handleAddRecipeToPlan = (recipe: Recipe, mealType: MealType) => {
    addMealToPlan(recipe, formattedDate, mealType, recipe.servings);
    toast({
      title: "Meal Added",
      description: `${recipe.name} added to ${mealType} for ${format(selectedDate, 'PPP')}.`,
    });
  };
  
  const mealDisplayOrder: MealType[] = ["Breakfast", "Lunch", "Dinner", "Snack"];

  return (
    <PageWrapper title="Interactive Meal Planner">
      {/* Date Selector and Daily Totals */}
      <div className="flex flex-col lg:flex-row gap-8 mb-8">
        <div className="w-full lg:w-1/3 xl:w-1/4">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="font-headline text-primary">Select Date</CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateChange}
                className="rounded-md border"
              />
              <div className="flex justify-between mt-4">
                <Button variant="outline" onClick={() => handleDateChange(subDays(selectedDate, 1))}>
                  <ChevronLeft className="h-4 w-4" /> Prev
                </Button>
                <Button variant="outline" onClick={() => handleDateChange(addDays(selectedDate, 1))}>
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="w-full lg:w-2/3 xl:w-3/4">
           <Card className="shadow-lg h-full">
            <CardHeader>
              <CardTitle className="font-headline text-primary">Daily Totals for {format(selectedDate, 'PPP')}</CardTitle>
              <CardDescription>Review your macronutrient intake for the selected day.</CardDescription>
            </CardHeader>
            <CardContent>
              <MacroDisplay macros={dailyMacros} title="" highlightTotal/>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recipe Sliders Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold font-headline text-primary mb-6">Choose Your Meals for {format(selectedDate, 'PPP')}</h2>
        {isLoadingRecipes ? (
          <div className="flex justify-center items-center min-h-[200px]">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="ml-4 text-muted-foreground">Loading recipes...</p>
          </div>
        ) : (
          <div className="space-y-8">
            {mealSlots.map((slot) => (
              <div key={slot.label}>
                <h3 className="text-xl font-semibold font-headline text-primary/90 mb-3 border-b border-primary/20 pb-1">
                  {slot.label}
                </h3>
                <div className="flex overflow-x-auto space-x-4 pb-4 -mb-4 scrollbar-thin scrollbar-thumb-primary/50 scrollbar-track-muted">
                  {allRecipes.length > 0 ? allRecipes.map((recipe) => (
                    <div key={`${slot.label}-${recipe.id}`} className="min-w-[300px] md:min-w-[320px]">
                      <RecipeCard
                        recipe={recipe}
                        showViewDetailsButton={true}
                        showAddToMealPlanButton={true}
                        onAddToMealPlan={() => handleAddRecipeToPlan(recipe, slot.type)}
                      />
                    </div>
                  )) : (
                     <p className="text-muted-foreground">No recipes available to display.</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
      
      <Separator className="my-12"/>

      {/* Planned Meals Display Section */}
      <section>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold font-headline text-primary">
            Your Meals for: {format(selectedDate, 'PPP')}
          </h2>
          <Button variant="destructive" onClick={() => {
            clearMealPlanForDate(formattedDate);
            toast({ title: "Meals Cleared", description: `All meals for ${format(selectedDate, 'PPP')} have been removed.`});
          }}
          disabled={dailyMeals.length === 0}
          >
            <Trash2 className="mr-2 h-4 w-4" /> Clear Day
          </Button>
        </div>

        {dailyMeals.length === 0 ? (
          <Card className="shadow-md">
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground mb-4">No meals planned for this day. Use the sliders above to add meals.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {mealDisplayOrder.map(mealTypeToDisplay => {
              const mealsForType = dailyMeals.filter(m => m.mealType === mealTypeToDisplay);
              if (mealsForType.length === 0) return null;

              return (
                <div key={mealTypeToDisplay}>
                  <h3 className="text-xl font-semibold font-headline text-primary/80 mb-2 border-b border-primary/20 pb-1">{mealTypeToDisplay}</h3>
                  <div className="space-y-4">
                  {mealsForType.map((meal) => {
                    const recipe = meal.recipeDetails || getRecipeById(meal.recipeId);
                    if (!recipe) return null;

                    const plannedServingsMacros = {
                      calories: recipe.macrosPerServing.calories * meal.servings,
                      protein: recipe.macrosPerServing.protein * meal.servings,
                      carbs: recipe.macrosPerServing.carbs * meal.servings,
                      fat: recipe.macrosPerServing.fat * meal.servings,
                    };

                    return (
                      <Card key={meal.id} className="shadow-md overflow-hidden flex flex-col sm:flex-row">
                        <div className="sm:w-1/4 relative h-32 sm:h-auto">
                          <Image
                            src={recipe.image}
                            alt={recipe.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div className="sm:w-3/4 p-4 flex flex-col justify-between">
                          <div>
                            <CardTitle className="text-lg font-headline text-primary hover:underline">
                              <Link href={`/recipes/${recipe.id}`}>{recipe.name}</Link>
                            </CardTitle>
                            <CardDescription>Servings: {meal.servings}</CardDescription>
                            <div className="mt-2">
                              <MacroDisplay macros={plannedServingsMacros} title="" />
                            </div>
                          </div>
                          <CardFooter className="p-0 pt-4 flex gap-2 justify-end">
                            <Button variant="outline" size="sm" onClick={() => handleEditMeal(meal)}>
                              <Edit3 className="mr-1 h-3 w-3" /> Edit Servings
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => {
                              removeMealFromPlan(meal.id);
                              toast({ title: "Meal Removed", description: `${recipe.name} removed from meal plan.`});
                              }}>
                              <Trash2 className="mr-1 h-3 w-3" /> Remove
                            </Button>
                          </CardFooter>
                        </div>
                      </Card>
                    );
                  })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Edit Servings Dialog */}
      {editingMeal && (
        <Dialog open={!!editingMeal} onOpenChange={() => setEditingMeal(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-headline text-primary">Edit Servings for {editingMeal.recipeDetails?.name}</DialogTitle>
              <DialogDescription>Update the number of servings for this meal.</DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="servings">New Servings</Label>
              <Input 
                id="servings" 
                type="number" 
                value={newServings} 
                onChange={(e) => setNewServings(parseInt(e.target.value, 10))}
                min="1"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingMeal(null)}>Cancel</Button>
              <Button onClick={handleSaveServings} className="bg-accent hover:bg-accent/90 text-accent-foreground">Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </PageWrapper>
  );
}
