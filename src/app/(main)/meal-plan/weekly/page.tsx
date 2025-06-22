
"use client";

import { useState, useEffect } from 'react';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { useAppContext } from '@/context/AppContext';
import type { PlannedMeal, Recipe } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MacroDisplay } from '@/components/shared/MacroDisplay';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval } from 'date-fns';
import { ChevronLeft, ChevronRight, Loader2, CalendarDays as CalendarDaysIcon, Lock } from 'lucide-react';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function WeeklyMealPlanPage() {
  const {
    getMealsForDate,
    getDailyMacros,
    allRecipesCache,
    isRecipeCacheLoading,
    userProfile,
  } = useAppContext();

  const [currentDateInWeek, setCurrentDateInWeek] = useState<Date>(new Date());
  const [weekDays, setWeekDays] = useState<Date[]>([]);
  const [weeklyMealData, setWeeklyMealData] = useState<
    Array<{ date: Date; formattedDate: string; meals: PlannedMeal[]; macros: ReturnType<typeof getDailyMacros> }>
  >([]);
  
  const isSubscribedActive = userProfile?.subscription_status === 'active';

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
  }, [weekDays, getMealsForDate, getDailyMacros, isRecipeCacheLoading, allRecipesCache]);

  const handlePreviousWeek = () => {
    setCurrentDateInWeek(prev => subWeeks(prev, 1));
  };

  const handleNextWeek = () => {
    setCurrentDateInWeek(prev => addWeeks(prev, 1));
  };

  if (isRecipeCacheLoading && weeklyMealData.length === 0) {
    return (
      <PageWrapper title="Weekly Meal Plan" maxWidth="max-w-7xl">
        <div className="flex justify-center items-center min-h-[300px]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </PageWrapper>
    );
  }

  if (!isSubscribedActive) {
      return (
        <PageWrapper title="Weekly Meal Plan">
           <div className="mb-6 flex justify-end">
                <Button asChild variant="outline">
                <Link href="/meal-plan">
                    <CalendarDaysIcon className="mr-2 h-4 w-4" />
                    Switch to Daily View
                </Link>
                </Button>
            </div>
            <Alert variant="default" className="border-accent mt-6">
                <Lock className="h-5 w-5 text-accent" />
                <AlertTitle className="text-accent font-headline">Premium Feature Locked</AlertTitle>
                <AlertDescription>
                    The Weekly Meal Plan view is available for subscribed users.
                    Please <Link href="/profile/subscription" className="underline hover:text-primary font-semibold">upgrade your plan</Link> to unlock this feature.
                </AlertDescription>
            </Alert>
        </PageWrapper>
      )
  }
  
  const weekOfLabel = weekDays.length > 0 ? `${format(weekDays[0], 'MMM do')} - ${format(weekDays[weekDays.length -1], 'MMM do, yyyy')}` : 'Loading...';

  return (
    <PageWrapper title={`Weekly Meal Plan: ${weekOfLabel}`} maxWidth="max-w-7xl">
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

      {isRecipeCacheLoading && weeklyMealData.length > 0 && (
         <div className="text-center py-4 text-muted-foreground">
          <Loader2 className="inline-block h-5 w-5 animate-spin mr-2" />
          Updating meal data...
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {weeklyMealData.map(({ date, formattedDate, meals, macros }) => (
          <Card key={formattedDate} className="shadow-md flex flex-col h-full">
            <CardHeader className="flex-shrink-0 pb-2">
              <CardTitle className="font-headline text-primary text-md">{format(date, 'EEEE, MMM do')}</CardTitle>
              <CardDescription className="text-xs mt-1">Daily Macros:</CardDescription>
              <MacroDisplay macros={macros} title="" className="shadow-none border-none -ml-2 -mr-2" />
            </CardHeader>
            <CardContent className="flex-grow pt-2">
              <h3 className="text-sm font-semibold mb-1 text-secondary-foreground">Planned Meals:</h3>
              {meals.length > 0 ? (
                <ul className="space-y-1.5 text-xs">
                  {meals.map(meal => {
                    const recipe = meal.recipeDetails || allRecipesCache.find(r => r.id === meal.recipeId);
                    return (
                      <li key={meal.id} className="p-1.5 bg-muted/40 rounded-md hover:bg-muted/60 transition-colors">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-primary-focus truncate" title={recipe?.name || `Recipe ID: ${meal.recipeId}`}>
                            {recipe ? (
                              <Link href={`/recipes/${recipe.id}`} className="hover:underline">
                                {recipe.name}
                              </Link>
                            ) : (
                              `Recipe ID: ${meal.recipeId}`
                            )}
                          </span>
                          <span className="text-muted-foreground text-xs shrink-0 ml-1">{meal.mealType}</span>
                        </div>
                        <div className="flex justify-between items-center text-muted-foreground">
                            <span>Servings: {meal.servings}</span>
                            {recipe && (
                                <span>
                                    ~{(recipe.macrosPerServing.calories * meal.servings).toFixed(0)} kcal
                                </span>
                            )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">No meals planned.</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </PageWrapper>
  );
}
