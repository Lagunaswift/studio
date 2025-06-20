
"use client";

import { useState, useEffect } from 'react';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { useAppContext } from '@/context/AppContext';
import type { PlannedMeal, Recipe } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MacroDisplay } from '@/components/shared/MacroDisplay';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval } from 'date-fns';
import { ChevronLeft, ChevronRight, Loader2, CalendarDays as CalendarDaysIcon } from 'lucide-react';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';

export default function WeeklyMealPlanPage() {
  const {
    getMealsForDate,
    getDailyMacros,
    allRecipesCache,
    isRecipeCacheLoading,
  } = useAppContext();

  const [currentDateInWeek, setCurrentDateInWeek] = useState<Date>(new Date());
  const [weekDays, setWeekDays] = useState<Date[]>([]);
  const [weeklyMealData, setWeeklyMealData] = useState<
    Array<{ date: Date; formattedDate: string; meals: PlannedMeal[]; macros: ReturnType<typeof getDailyMacros> }>
  >([]);

  useEffect(() => {
    const weekStart = startOfWeek(currentDateInWeek, { weekStartsOn: 1 }); // Monday
    const weekEnd = endOfWeek(currentDateInWeek, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
    setWeekDays(days);
  }, [currentDateInWeek]);

  useEffect(() => {
    if (weekDays.length > 0 && !isRecipeCacheLoading) {
      const data = weekDays.map(day => {
        const formatted = format(day, 'yyyy-MM-dd');
        return {
          date: day,
          formattedDate: formatted,
          meals: getMealsForDate(formatted),
          macros: getDailyMacros(formatted),
        };
      });
      setWeeklyMealData(data);
    }
  }, [weekDays, getMealsForDate, getDailyMacros, isRecipeCacheLoading]);

  const handlePreviousWeek = () => {
    setCurrentDateInWeek(prev => subWeeks(prev, 1));
  };

  const handleNextWeek = () => {
    setCurrentDateInWeek(prev => addWeeks(prev, 1));
  };

  if (isRecipeCacheLoading) {
    return (
      <PageWrapper title="Weekly Meal Plan">
        <div className="flex justify-center items-center min-h-[300px]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </PageWrapper>
    );
  }
  
  const weekOfLabel = weekDays.length > 0 ? format(weekDays[0], 'MMMM do, yyyy') : 'Loading...';

  return (
    <PageWrapper title={`Weekly Meal Plan (Week of ${weekOfLabel})`}>
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
        <Button asChild variant="outline">
          <Link href="/meal-plan">
            <CalendarDaysIcon className="mr-2 h-4 w-4" />
            Switch to Daily View
          </Link>
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePreviousWeek}>
            <ChevronLeft className="mr-2 h-4 w-4" /> Previous Week
          </Button>
          <Button variant="outline" onClick={handleNextWeek}>
            Next Week <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-8">
        {weeklyMealData.map(({ date, formattedDate, meals, macros }) => (
          <Card key={formattedDate} className="shadow-lg">
            <CardHeader>
              <CardTitle className="font-headline text-primary">{format(date, 'EEEE, MMMM do')}</CardTitle>
              <CardDescription>Macros for the day:</CardDescription>
              <MacroDisplay macros={macros} title="" />
            </CardHeader>
            <CardContent>
              <h3 className="text-lg font-semibold mb-2 text-secondary-foreground">Planned Meals:</h3>
              {meals.length > 0 ? (
                <ul className="space-y-3">
                  {meals.map(meal => {
                    const recipe = meal.recipeDetails || allRecipesCache.find(r => r.id === meal.recipeId);
                    return (
                      <li key={meal.id} className="p-3 bg-muted/30 rounded-md hover:bg-muted/50 transition-colors">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-primary-focus">
                            {recipe ? (
                              <Link href={`/recipes/${recipe.id}`} className="hover:underline">
                                {recipe.name}
                              </Link>
                            ) : (
                              `Recipe ID: ${meal.recipeId} (Not Found)`
                            )}
                          </span>
                          <span className="text-xs text-muted-foreground">{meal.mealType}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">Servings: {meal.servings}</p>
                         {recipe && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Approx. {(recipe.macrosPerServing.calories * meal.servings).toFixed(0)} kcal
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No meals planned for this day.</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </PageWrapper>
  );
}
