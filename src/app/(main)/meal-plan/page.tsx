
"use client";

import { useState, useEffect, useCallback } from 'react';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { useAppContext } from '@/context/AppContext';
import type { PlannedMeal, MealType, Recipe, Macros } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
// import { MacroDisplay } from '@/components/shared/MacroDisplay'; // Replaced by charts
import { Calendar } from '@/components/ui/calendar';
import { format, addDays, subDays, isValid, startOfDay, isWithinInterval } from 'date-fns';
import { ChevronLeft, ChevronRight, Trash2, Edit3, PlusCircle, Loader2, Info, Lock, CalendarDays as CalendarDaysIcon } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter as EditDialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { MEAL_TYPES } from '@/lib/data';
import { RecipeCard } from '@/components/shared/RecipeCard';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { MacroDisplay } from '@/components/shared/MacroDisplay'; // Still used for individual meal macros

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig
} from "@/components/ui/chart";

const MEAL_SLOT_CONFIG: Array<{ type: MealType; displayName: string }> = [
  { type: "Breakfast", displayName: "Breakfast" },
  { type: "Lunch", displayName: "Lunch" },
  { type: "Dinner", displayName: "Dinner" },
  { type: "Snack", displayName: "Snack 1" },
  { type: "Snack", displayName: "Snack 2" },
];

const FREE_TIER_RECIPE_PICKER_LIMIT = 15;

// const isDateAllowedForFreeTier = (date: Date | undefined): boolean => { // TEMPORARILY UNLOCKED
//   if (!date) return false;
//   const today = startOfDay(new Date());
//   const tomorrow = addDays(today, 1);
//   return isWithinInterval(startOfDay(date), { start: today, end: tomorrow });
// };

const chartConfig = {
  consumed: { label: "Consumed", color: "hsl(var(--chart-1))" },
  target: { label: "Target", color: "hsl(var(--chart-2))" },
} satisfies ChartConfig;


export default function MealPlanPage() {
  const {
    userProfile,
    getDailyMacros,
    removeMealFromPlan,
    updatePlannedMealServings,
    clearMealPlanForDate,
    getMealsForDate,
    addMealToPlan,
    allRecipesCache,
    isRecipeCacheLoading: isAppRecipeCacheLoading
  } = useAppContext();

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [editingMeal, setEditingMeal] = useState<PlannedMeal | null>(null);
  const [newServings, setNewServings] = useState<number>(1);
  const { toast } = useToast();

  const [recipePickerIndices, setRecipePickerIndices] = useState<{[key: string]: number}>(
    MEAL_SLOT_CONFIG.reduce((acc, slot, index) => {
      acc[`${slot.type}-${index}`] = 0;
      return acc;
    }, {} as {[key: string]: number})
  );

  const isSubscribedActive = true;
  const availableRecipesForPicker = allRecipesCache;

  const formattedDate = format(selectedDate, 'yyyy-MM-dd');
  const dailyMacros = getDailyMacros(formattedDate);
  const currentMacroTargets = userProfile?.macroTargets;
  const dailyMeals = getMealsForDate(formattedDate);


  const caloriesChartData = currentMacroTargets ? [
    { name: "Calories", consumed: dailyMacros.calories || 0, target: currentMacroTargets.calories || 0, unit: 'kcal' },
  ] : [{ name: "Calories", consumed: dailyMacros.calories || 0, target: 0, unit: 'kcal' }];

  const macrosChartData = currentMacroTargets ? [
    { name: "Protein", consumed: dailyMacros.protein || 0, target: currentMacroTargets.protein || 0, unit: 'g' },
    { name: "Carbs", consumed: dailyMacros.carbs || 0, target: currentMacroTargets.carbs || 0, unit: 'g' },
    { name: "Fat", consumed: dailyMacros.fat || 0, target: currentMacroTargets.fat || 0, unit: 'g' },
  ] : [
    { name: "Protein", consumed: dailyMacros.protein || 0, target: 0, unit: 'g' },
    { name: "Carbs", consumed: dailyMacros.carbs || 0, target: 0, unit: 'g' },
    { name: "Fat", consumed: dailyMacros.fat || 0, target: 0, unit: 'g' },
  ];


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
    if (availableRecipesForPicker.length === 0) return;
    setRecipePickerIndices(prev => {
      const currentIndex = prev[slotKey] || 0;
      let newIndex;
      if (direction === 'next') {
        newIndex = (currentIndex + 1) % availableRecipesForPicker.length;
      } else {
        newIndex = (currentIndex - 1 + availableRecipesForPicker.length) % availableRecipesForPicker.length;
      }
      return { ...prev, [slotKey]: newIndex };
    });
  };

  const handleAddRecipeFromPicker = (slotKey: string, mealType: MealType) => {
    if (availableRecipesForPicker.length === 0) return;
    const recipeIndex = recipePickerIndices[slotKey] || 0;
    const recipeToAdd = availableRecipesForPicker[recipeIndex];
    if (recipeToAdd) {
      addMealToPlan(recipeToAdd, formattedDate, mealType, recipeToAdd.servings);
      toast({
        title: "Meal Added",
        description: `${recipeToAdd.name} added as ${mealType} for ${format(selectedDate, 'PPP')}.`,
      });
    }
  };

  const getPlannedMealForSlot = (slotType: MealType, slotIndexWithinType: number): PlannedMeal | undefined => {
    const mealsOfThisType = dailyMeals.filter(dm => dm.mealType === slotType);
    return mealsOfThisType[slotIndexWithinType];
  };

  const todayForCalendar = startOfDay(new Date());
  const tomorrowForCalendar = addDays(todayForCalendar, 1);
  const disabledCalendarMatcher = undefined;

  return (
    <PageWrapper title="Daily Meal Planner">
      {false && !isSubscribedActive && (
         <Alert variant="default" className="mb-6 border-accent">
          <Lock className="h-5 w-5 text-accent" />
          <AlertTitle className="text-accent">Limited Access</AlertTitle>
          <AlertDescription>
            You are on the free plan. Meal planning is restricted to today and tomorrow only.
            Recipe selection for planning is limited to {FREE_TIER_RECIPE_PICKER_LIMIT} items.
            <Link href="/profile/subscription" className="underline hover:text-primary"> Upgrade your plan </Link>
            for full access.
          </AlertDescription>
        </Alert>
      )}
       <div className="mb-6 flex justify-end">
        <Button asChild variant="outline">
          <Link href="/meal-plan/weekly">
            <CalendarDaysIcon className="mr-2 h-4 w-4" />
            Switch to Weekly View
          </Link>
        </Button>
      </div>
      <div className="flex flex-col lg:flex-row gap-8 mb-8">
        <div className="w-full lg:w-[380px] lg:flex-shrink-0">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="font-headline text-primary">Select Date</CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateChange}
                disabled={disabledCalendarMatcher}
                className="rounded-md border"
                initialFocus={false}
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
        <div className="w-full lg:flex-1">
           <Card className="shadow-lg h-full">
            <CardHeader>
              <CardTitle className="font-headline text-primary">Daily Totals for {format(selectedDate, 'PPP')}</CardTitle>
              <CardDescription>
                {currentMacroTargets ? "Review your macronutrient intake against your targets." : "Review your macronutrient intake. Set targets in profile for comparison."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-md font-semibold mb-1">Calories (kcal)</h3>
                <div className="h-[200px]">
                  <ChartContainer config={chartConfig} className="w-full h-full">
                    <BarChart accessibilityLayer data={caloriesChartData} layout="vertical">
                      <CartesianGrid horizontal={false} />
                      <XAxis type="number" tickFormatter={(value) => `${value}`} />
                      <YAxis dataKey="name" type="category" tickLine={false} tickMargin={10} axisLine={false} width={60} />
                      <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
                      <Bar dataKey="consumed" fill="var(--color-consumed)" radius={4} barSize={25} name="Consumed" />
                      {currentMacroTargets && <Bar dataKey="target" fill="var(--color-target)" radius={4} barSize={25} name="Target" />}
                      <ChartLegend content={<ChartLegendContent />} />
                    </BarChart>
                  </ChartContainer>
                </div>
              </div>
              <div>
                <h3 className="text-md font-semibold mb-1">Macronutrients (grams)</h3>
                <div className="h-[200px]">
                  <ChartContainer config={chartConfig} className="w-full h-full">
                    <BarChart accessibilityLayer data={macrosChartData} layout="vertical">
                      <CartesianGrid horizontal={false} />
                      <XAxis type="number" tickFormatter={(value) => `${value}g`} />
                      <YAxis dataKey="name" type="category" tickLine={false} tickMargin={10} axisLine={false} width={60}/>
                      <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
                      <Bar dataKey="consumed" fill="var(--color-consumed)" radius={4} barSize={15} name="Consumed" />
                      {currentMacroTargets && <Bar dataKey="target" fill="var(--color-target)" radius={4} barSize={15} name="Target" />}
                       <ChartLegend content={<ChartLegendContent />} />
                    </BarChart>
                  </ChartContainer>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Separator className="my-12"/>

      <section className="space-y-10">
        <h2 className="text-2xl font-bold font-headline text-primary mb-6">
          Plan Your Meals for {format(selectedDate, 'PPP')}
        </h2>

        {isAppRecipeCacheLoading && (
          <div className="flex justify-center items-center min-h-[200px]">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="ml-4 text-muted-foreground">Loading recipes...</p>
          </div>
        )}

        {!isAppRecipeCacheLoading && allRecipesCache.length === 0 && (
           <Alert variant="destructive">
            <Info className="h-4 w-4" />
            <AlertTitle>No Recipes Available</AlertTitle>
            <AlertDescription>
              No recipes found in the database. Please add some recipes or check if the database is accessible.
            </AlertDescription>
          </Alert>
        )}
         {!isAppRecipeCacheLoading && !isSubscribedActive && allRecipesCache.length > 0 && availableRecipesForPicker.length === 0 && (
             <Alert variant="default" className="border-info">
                <Info className="h-4 w-4" />
                <AlertTitle>Recipe Limit Note</AlertTitle>
                <AlertDescription>
                The free tier recipe picker is limited. If the first {FREE_TIER_RECIPE_PICKER_LIMIT} recipes in the database don't load correctly, the picker might appear empty. (Full picker unlocked for testing)
                </AlertDescription>
            </Alert>
        )}


        {!isAppRecipeCacheLoading && availableRecipesForPicker.length > 0 && MEAL_SLOT_CONFIG.map((slotConfig, index) => {
          const slotKey = `${slotConfig.type}-${index}`;
          let NthInstanceOfType = 0;
          for(let i=0; i < index; i++){
            if(MEAL_SLOT_CONFIG[i].type === slotConfig.type) {
                NthInstanceOfType++;
            }
          }
          const mealToDisplay = getPlannedMealForSlot(slotConfig.type, NthInstanceOfType);

          return (
            <div key={slotKey} className="p-4 border rounded-lg shadow-md bg-card">
              <h3 className="text-xl font-semibold font-headline text-primary/90 mb-4">{slotConfig.displayName}</h3>
              {mealToDisplay ? (
                <div className="w-full max-w-lg mx-auto">
                  <Card className="overflow-hidden shadow-md flex flex-col sm:flex-row">
                    {mealToDisplay.recipeDetails?.image && (
                      <div className="sm:w-1/3 relative h-32 sm:h-auto">
                        <Image
                          src={mealToDisplay.recipeDetails.image}
                          alt={mealToDisplay.recipeDetails.name}
                          fill
                          className="object-cover"
                          data-ai-hint={mealToDisplay.recipeDetails.tags ? mealToDisplay.recipeDetails.tags.slice(0,2).join(' ') : "food meal"}
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
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-x-2 sm:gap-x-4">
                    <Button variant="outline" size="icon" onClick={() => handleRecipePickerNavigate(slotKey, 'prev')} disabled={availableRecipesForPicker.length <= 1}>
                      <ChevronLeft className="h-5 w-5" />
                      <span className="sr-only">Previous Recipe</span>
                    </Button>
                    <div className="flex-grow w-full max-w-md mx-auto">
                      {availableRecipesForPicker.length > 0 && (
                        <RecipeCard
                          recipe={availableRecipesForPicker[recipePickerIndices[slotKey] || 0]}
                          showAddToMealPlanButton={false}
                          showViewDetailsButton={true}
                          className="w-full shadow-none border-0"
                        />
                      )}
                    </div>
                    <Button variant="outline" size="icon" onClick={() => handleRecipePickerNavigate(slotKey, 'next')} disabled={availableRecipesForPicker.length <= 1}>
                      <ChevronRight className="h-5 w-5" />
                      <span className="sr-only">Next Recipe</span>
                    </Button>
                  </div>
                  {availableRecipesForPicker.length > 0 && (
                    <Button
                      onClick={() => handleAddRecipeFromPicker(slotKey, slotConfig.type)}
                      className="w-full sm:w-auto mx-auto flex items-center justify-center bg-accent hover:bg-accent/90 text-accent-foreground"
                      disabled={!availableRecipesForPicker[recipePickerIndices[slotKey] || 0]}
                    >
                      <PlusCircle className="mr-2 h-5 w-5" />
                      Add "{availableRecipesForPicker[recipePickerIndices[slotKey] || 0]?.name}" as {slotConfig.displayName}
                    </Button>
                  )}
                  {false && !isSubscribedActive && (
                     <p className="text-xs text-destructive text-center">Planning for this date is restricted on the free plan.</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </section>

      <Separator className="my-12"/>

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
            {dailyMeals.map((meal) => {
                const recipe = meal.recipeDetails || allRecipesCache.find(r => r.id === meal.recipeId);
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
                    </Card>
                );
            })}
          </div>
        )}
      </section>

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
