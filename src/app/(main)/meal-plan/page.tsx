"use client";

import { useState } from 'react';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { useAppContext } from '@/context/AppContext';
import type { PlannedMeal, MealType, Recipe } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { MacroDisplay } from '@/components/shared/MacroDisplay';
import { Calendar } from '@/components/ui/calendar';
import { format, addDays, subDays, parseISO, isValid } from 'date-fns';
import { ChevronLeft, ChevronRight, Trash2, Edit3, PlusCircle } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { getRecipeById, MEAL_TYPES } from '@/lib/data';

export default function MealPlanPage() {
  const { mealPlan, getDailyMacros, removeMealFromPlan, updatePlannedMealServings, clearMealPlanForDate, getMealsForDate } = useAppContext();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [editingMeal, setEditingMeal] = useState<PlannedMeal | null>(null);
  const [newServings, setNewServings] = useState<number>(1);
  const { toast } = useToast();

  const formattedDate = format(selectedDate, 'yyyy-MM-dd');
  const dailyMeals = getMealsForDate(formattedDate);
  const dailyMacros = getDailyMacros(formattedDate);

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
  
  const mealOrder: MealType[] = ["Breakfast", "Lunch", "Dinner", "Snack"];

  return (
    <PageWrapper title="Your Meal Plan">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Date Selector */}
        <div className="w-full md:w-1/3 lg:w-1/4">
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
           <Card className="shadow-lg mt-6">
            <CardHeader>
              <CardTitle className="font-headline text-primary">Daily Totals</CardTitle>
              <CardDescription>{format(selectedDate, 'PPP')}</CardDescription>
            </CardHeader>
            <CardContent>
              <MacroDisplay macros={dailyMacros} title="" highlightTotal/>
            </CardContent>
          </Card>
        </div>

        {/* Daily Meal Plan Display */}
        <div className="w-full md:w-2/3 lg:w-3/4">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold font-headline text-primary">
              Meals for: {format(selectedDate, 'PPP')}
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
                <p className="text-muted-foreground mb-4">No meals planned for this day.</p>
                <Button asChild className="bg-accent hover:bg-accent/90 text-accent-foreground">
                  <Link href="/recipes">
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Meals
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {mealOrder.map(mealType => {
                const mealsForType = dailyMeals.filter(m => m.mealType === mealType);
                if (mealsForType.length === 0) return null;

                return (
                  <div key={mealType}>
                    <h3 className="text-xl font-semibold font-headline text-primary/80 mb-2 border-b border-primary/20 pb-1">{mealType}</h3>
                    <div className="space-y-4">
                    {mealsForType.map((meal) => {
                      const recipe = meal.recipeDetails || getRecipeById(meal.recipeId);
                      if (!recipe) return null;
                      return (
                        <Card key={meal.id} className="shadow-md overflow-hidden flex flex-col sm:flex-row">
                          <div className="sm:w-1/4 relative h-32 sm:h-auto">
                            <Image
                              // @ts-ignore
                              src={recipe['data-ai-hint'] ? `${recipe.image}?text=${recipe['data-ai-hint']}` : recipe.image}
                              alt={recipe.name}
                              fill
                              className="object-cover"
                              // @ts-ignore
                              data-ai-hint={recipe['data-ai-hint'] || recipe.name.toLowerCase().split(" ").slice(0,2).join(" ")}
                            />
                          </div>
                          <div className="sm:w-3/4 p-4 flex flex-col justify-between">
                            <div>
                              <CardTitle className="text-lg font-headline text-primary hover:underline">
                                <Link href={`/recipes/${recipe.id}`}>{recipe.name}</Link>
                              </CardTitle>
                              <CardDescription>Servings: {meal.servings}</CardDescription>
                              <div className="mt-2">
                                <MacroDisplay macros={{
                                  calories: recipe.macrosPerServing.calories * (meal.servings / recipe.servings),
                                  protein: recipe.macrosPerServing.protein * (meal.servings / recipe.servings),
                                  carbs: recipe.macrosPerServing.carbs * (meal.servings / recipe.servings),
                                  fat: recipe.macrosPerServing.fat * (meal.servings / recipe.servings),
                                }} title="" />
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
        </div>
      </div>

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
