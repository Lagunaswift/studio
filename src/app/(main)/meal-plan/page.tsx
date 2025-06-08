
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
import { ChevronLeft, ChevronRight, Trash2, Edit3, PlusCircle, Loader2, Info } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter as EditDialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { getRecipeById, getAllRecipes as fetchAllRecipes, MEAL_TYPES } from '@/lib/data';
import { RecipeCard } from '@/components/shared/RecipeCard';

const MEAL_SLOT_CONFIG: Array<{ type: MealType; displayName: string }> = [
  { type: "Breakfast", displayName: "Breakfast" },
  { type: "Lunch", displayName: "Lunch" },
  { type: "Dinner", displayName: "Dinner" },
  { type: "Snack", displayName: "Snack 1" },
  { type: "Snack", displayName: "Snack 2" }, // Example for multiple snacks
];


export default function MealPlanPage() {
  const { 
    getDailyMacros, 
    removeMealFromPlan, 
    updatePlannedMealServings, 
    clearMealPlanForDate, 
    getMealsForDate,
    addMealToPlan
  } = useAppContext();

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [editingMeal, setEditingMeal] = useState<PlannedMeal | null>(null);
  const [newServings, setNewServings] = useState<number>(1);
  const [allRecipes, setAllRecipes] = useState<Recipe[]>([]);
  const [isLoadingRecipes, setIsLoadingRecipes] = useState(true);
  const { toast } = useToast();
  
  const [recipePickerIndices, setRecipePickerIndices] = useState<{[key: string]: number}>(
    MEAL_SLOT_CONFIG.reduce((acc, slot, index) => {
      acc[`${slot.type}-${index}`] = 0; // Unique key for each slot
      return acc;
    }, {} as {[key: string]: number})
  );

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
        console.error("Failed to load recipes:", error);
        toast({ title: "Error", description: "Could not load recipes.", variant: "destructive" });
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

  const handleRecipePickerNavigate = (slotKey: string, direction: 'prev' | 'next') => {
    if (allRecipes.length === 0) return;
    setRecipePickerIndices(prev => {
      const currentIndex = prev[slotKey] || 0;
      let newIndex;
      if (direction === 'next') {
        newIndex = (currentIndex + 1) % allRecipes.length;
      } else {
        newIndex = (currentIndex - 1 + allRecipes.length) % allRecipes.length;
      }
      return { ...prev, [slotKey]: newIndex };
    });
  };

  const handleAddRecipeFromPicker = (slotKey: string, mealType: MealType) => {
    if (allRecipes.length === 0) return;
    const recipeIndex = recipePickerIndices[slotKey] || 0;
    const recipeToAdd = allRecipes[recipeIndex];
    if (recipeToAdd) {
      addMealToPlan(recipeToAdd, formattedDate, mealType, recipeToAdd.servings);
      toast({
        title: "Meal Added",
        description: `${recipeToAdd.name} added as ${mealType} for ${format(selectedDate, 'PPP')}.`,
      });
    }
  };
  
  // Determine which meal slots are filled for the current day
  const getPlannedMealsForSlot = (mealType: MealType, slotIndex: number): PlannedMeal[] => {
    // For "Snack", we need to differentiate if we allow multiple distinct snacks of type "Snack"
    // This example assumes only one meal per unique type on a given day for simplicity, 
    // or if you add multiple snacks they all get "Snack" type.
    // For a more robust system, PlannedMeal would need a unique slotKey.
    // For now, if it's a snack, we check all snacks. This logic might need refinement
    // if you want distinct "Snack 1", "Snack 2" that can't be the same recipe.
    if (mealType === "Snack") {
      return dailyMeals.filter(dm => dm.mealType === "Snack");
    }
    return dailyMeals.filter(dm => dm.mealType === mealType);
  };


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
      
      <Separator className="my-12"/>

      {/* Meal Slot Pickers / Display Section */}
      <section className="space-y-10">
        <h2 className="text-2xl font-bold font-headline text-primary mb-6">
          Plan Your Meals for {format(selectedDate, 'PPP')}
        </h2>

        {isLoadingRecipes && (
          <div className="flex justify-center items-center min-h-[200px]">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="ml-4 text-muted-foreground">Loading recipes...</p>
          </div>
        )}

        {!isLoadingRecipes && allRecipes.length === 0 && (
          <p className="text-center text-muted-foreground py-10">
            No recipes available to plan. Please add some recipes first.
          </p>
        )}

        {!isLoadingRecipes && allRecipes.length > 0 && MEAL_SLOT_CONFIG.map((slotConfig, slotIndex) => {
          const slotKey = `${slotConfig.type}-${slotIndex}`;
          // This needs a more robust way to find *the specific meal for this slot* if multiple of same type are allowed.
          // For now, assuming one meal of each type (Breakfast, Lunch, Dinner) and generic "Snack"
          const plannedMealForThisExactSlot = dailyMeals.find(dm => 
            dm.mealType === slotConfig.type && 
            // This matching logic is simple; if you add multiple snacks, it will find the first one.
            // A more complex system would assign unique IDs to plan slots.
            (slotConfig.type !== "Snack" || dm.id.includes(`Snack-${slotIndex}`)) // A pseudo-way to link if we had unique snack IDs
          );
          // A better way for snacks if we allow multiple: check if there are *enough* snacks already planned
          // For now, let's simplify: If it's a "Snack" slot, and *any* snack is planned, show it.
          // Or, check if a specific meal corresponds to this logical slot (e.g., if the plan stored slotKey)
          // The current `dailyMeals` doesn't distinguish between "Snack 1" and "Snack 2" if both are just "Snack" type.
          // For this example, we'll show a picker if *no* meal of that type exists, or if it's a snack slot and we haven't filled 'enough'
          // Let's assume for simplicity: one Breakfast, one Lunch, one Dinner. Any number of Snacks.
          // We will show picker for B,L,D if not present. For Snacks, we'll show multiple pickers.
          
          let mealToDisplay: PlannedMeal | undefined;
          if (slotConfig.type !== "Snack") {
            mealToDisplay = dailyMeals.find(dm => dm.mealType === slotConfig.type);
          } else {
            // For snacks, this is tricky. We'd need to associate planned snacks with specific slots.
            // Let's find the Nth snack if N pickers are shown.
            const snacksPlanned = dailyMeals.filter(dm => dm.mealType === "Snack");
            const currentSnackSlotIndex = MEAL_SLOT_CONFIG.filter(s => s.type === "Snack").findIndex(s => `${s.type}-${MEAL_SLOT_CONFIG.indexOf(s)}` === slotKey);
            if (currentSnackSlotIndex !== -1 && currentSnackSlotIndex < snacksPlanned.length) {
                 mealToDisplay = snacksPlanned[currentSnackSlotIndex];
            }
          }


          return (
            <div key={slotKey} className="p-4 border rounded-lg shadow-md bg-card">
              <h3 className="text-xl font-semibold font-headline text-primary/90 mb-4">{slotConfig.displayName}</h3>
              {mealToDisplay ? (
                // Display already planned meal
                <div className="w-full max-w-lg mx-auto"> {/* Centering the planned meal card */}
                  <Card className="overflow-hidden shadow-md flex flex-col sm:flex-row">
                    {mealToDisplay.recipeDetails?.image && (
                      <div className="sm:w-1/3 relative h-32 sm:h-auto">
                        <Image
                          src={mealToDisplay.recipeDetails.image}
                          alt={mealToDisplay.recipeDetails.name}
                          fill
                          className="object-cover"
                          data-ai-hint="food meal"
                        />
                      </div>
                    )}
                    <div className="sm:w-2/3 p-4 flex flex-col justify-between">
                      <div>
                        <CardTitle className="text-lg font-headline text-primary hover:underline">
                          <Link href={`/recipes/${mealToDisplay.recipeId}`}>{mealToDisplay.recipeDetails?.name}</Link>
                        </CardTitle>
                        <CardDescription>Servings: {mealToDisplay.servings}</CardDescription>
                        {mealToDisplay.recipeDetails && (
                          <div className="mt-2">
                            <MacroDisplay 
                              macros={{
                                calories: mealToDisplay.recipeDetails.macrosPerServing.calories * mealToDisplay.servings,
                                protein: mealToDisplay.recipeDetails.macrosPerServing.protein * mealToDisplay.servings,
                                carbs: mealToDisplay.recipeDetails.macrosPerServing.carbs * mealToDisplay.servings,
                                fat: mealToDisplay.recipeDetails.macrosPerServing.fat * mealToDisplay.servings,
                              }} 
                              title="" 
                            />
                          </div>
                        )}
                      </div>
                      <CardFooter className="p-0 pt-4 flex gap-2 justify-end">
                        <Button variant="outline" size="sm" onClick={() => handleEditMeal(mealToDisplay!)}>
                          <Edit3 className="mr-1 h-3 w-3" /> Edit Servings
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => {
                          removeMealFromPlan(mealToDisplay!.id);
                          toast({ title: "Meal Removed", description: `${mealToDisplay!.recipeDetails?.name} removed.`});
                        }}>
                          <Trash2 className="mr-1 h-3 w-3" /> Remove
                        </Button>
                      </CardFooter>
                    </div>
                  </Card>
                </div>
              ) : (
                // Display Recipe Picker
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-x-2 sm:gap-x-4">
                    <Button variant="outline" size="icon" onClick={() => handleRecipePickerNavigate(slotKey, 'prev')} disabled={allRecipes.length <= 1}>
                      <ChevronLeft className="h-5 w-5" />
                      <span className="sr-only">Previous Recipe</span>
                    </Button>
                    <div className="flex-grow w-full max-w-md mx-auto"> {/* Max width for the card in picker */}
                      {allRecipes.length > 0 && (
                        <RecipeCard 
                          recipe={allRecipes[recipePickerIndices[slotKey] || 0]} 
                          showAddToMealPlanButton={false} // We use a dedicated button below
                          showViewDetailsButton={true}
                          className="w-full shadow-none border-0" // Make card take full width of its constrained parent
                        />
                      )}
                    </div>
                    <Button variant="outline" size="icon" onClick={() => handleRecipePickerNavigate(slotKey, 'next')} disabled={allRecipes.length <= 1}>
                      <ChevronRight className="h-5 w-5" />
                      <span className="sr-only">Next Recipe</span>
                    </Button>
                  </div>
                  {allRecipes.length > 0 && (
                    <Button 
                      onClick={() => handleAddRecipeFromPicker(slotKey, slotConfig.type)} 
                      className="w-full sm:w-auto mx-auto flex items-center justify-center bg-accent hover:bg-accent/90 text-accent-foreground"
                      disabled={!allRecipes[recipePickerIndices[slotKey] || 0]}
                    >
                      <PlusCircle className="mr-2 h-5 w-5" />
                      Add "{allRecipes[recipePickerIndices[slotKey] || 0]?.name}" as {slotConfig.displayName}
                    </Button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </section>

      <Separator className="my-12"/>

      {/* Planned Meals Summary Display Section - This might be redundant if above shows planned meals well */}
      <section>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold font-headline text-primary">
            Summary for: {format(selectedDate, 'PPP')}
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
              <p className="text-muted-foreground mb-4">No meals planned for this day. Use the pickers above to add meals.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* This could just list the meals in a simpler format or be removed if the slot display is sufficient */}
            {dailyMeals.map((meal) => {
                const recipe = meal.recipeDetails || getRecipeById(meal.recipeId);
                if (!recipe) return null;
                const plannedServingsMacros = {
                    calories: recipe.macrosPerServing.calories * meal.servings,
                    protein: recipe.macrosPerServing.protein * meal.servings,
                    carbs: recipe.macrosPerServing.carbs * meal.servings,
                    fat: recipe.macrosPerServing.fat * meal.servings,
                };
                return (
                    <Card key={`summary-${meal.id}`} className="shadow-sm p-3">
                        <CardTitle className="text-md font-semibold">{recipe.name} ({meal.mealType}) - {meal.servings} servings</CardTitle>
                        <MacroDisplay macros={plannedServingsMacros} title=""/>
                         {/* Minimal actions here, or rely on main pickers */}
                    </Card>
                );
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
              <Label htmlFor="servings-edit">New Servings</Label>
              <Input 
                id="servings-edit" 
                type="number" 
                value={newServings} 
                onChange={(e) => setNewServings(parseInt(e.target.value, 10))}
                min="1"
              />
            </div>
            <EditDialogFooter>
              <Button variant="outline" onClick={() => setEditingMeal(null)}>Cancel</Button>
              <Button onClick={handleSaveServings} className="bg-accent hover:bg-accent/90 text-accent-foreground">Save Changes</Button>
            </EditDialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </PageWrapper>
  );
}

    