//src/app/(main)/page.tsx - COMPLETE FIXED VERSION WITH BAR CHARTS
"use client";
import Link from 'next/link';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';

import { 
  Target, 
  Edit, 
  Star, 
  Loader2, 
  CalendarCheck, 
  PlusCircle, 
  UtensilsCrossed, 
  Zap,
  SlidersHorizontal, 
  Scale, 
  Save, 
  Frown, 
  Meh, 
  Smile, 
  BatteryLow, 
  BatteryMedium, 
  BatteryFull, 
  CheckCircle2, 
  Moon, 
  Sun, 
  Utensils, 
  Droplets, 
  BookOpen, 
  BrainCircuit,
  Wand2
} from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { format, parseISO, isValid } from 'date-fns';
import { cn } from '@/lib/utils';

// FIXED IMPORTS
import { useAuth } from '@/context/AuthContext';
import { useAppContext } from '@/context/AppContext';
import { useOptimizedRecipes, useOptimizedProfile } from '@/hooks/useOptimizedFirestore';
import { useToast } from '@/hooks/use-toast';

// Types
import type { MacroTargets, Macros, Recipe, PlannedMeal } from '@/types';

// Components
import { RecipeCard } from '@/components/shared/RecipeCard';
import { ProgressSummary } from '@/components/shared/ProgressSummary';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from '@/components/ui/badge';
import { UsageDashboard } from '@/components/subscription/UsageDashboard';

// Charts (same as weekly planner)
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig
} from "@/components/ui/chart";

const chartConfig = {
  consumed: { label: "Consumed", color: "hsl(var(--chart-1))" },
  target: { label: "Target", color: "hsl(var(--chart-2))" },
} satisfies ChartConfig;

export default function HomePage() {
  // FIXED: All hooks properly imported
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const { profile: userProfile, loading: isProfileLoading, updateProfile } = useOptimizedProfile(user?.uid);
  const { recipes: allRecipesCache, loading: isAppRecipeCacheLoading, error: recipesError } = useOptimizedRecipes(user?.uid);
  
  // FIXED: useAppContext now properly imported
  const {
    getConsumedMacrosForDate,
    getMealsForDate,
  } = useAppContext();
  
  const { toast } = useToast();

  // Component state
  const [clientTodayDate, setClientTodayDate] = useState<string>('');
  const [featuredRecipe, setFeaturedRecipe] = useState<Recipe | null>(null);
  const [quickRecipe, setQuickRecipe] = useState<Recipe | null>(null);
  const [isClient, setIsClient] = useState(false);

  // Fix hydration issues by ensuring client-side only rendering for dates
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Derived values
  const currentMacroTargets = userProfile?.macroTargets;
  const welcomeName = userProfile?.name || userProfile?.email || user?.email || 'User';
  const {
    showMacros = true,
    showMenu = true,
    showFeaturedRecipe = true,
    showQuickRecipes = true,
  } = userProfile?.dashboardSettings || {};

  // Auth redirect effect
  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.push('/login');
    }
  }, [user, isAuthLoading, router]);

  // Set today's date
  useEffect(() => {
    const today = new Date();
    setClientTodayDate(format(today, 'yyyy-MM-dd'));
  }, []);

  // Calculate consumed macros
  const consumedTodayMacros = clientTodayDate && getConsumedMacrosForDate 
    ? getConsumedMacrosForDate(clientTodayDate) 
    : { calories: 0, protein: 0, carbs: 0, fat: 0 };

  // Get daily planned meals
  const dailyPlannedMeals = clientTodayDate && getMealsForDate 
    ? getMealsForDate(clientTodayDate) 
    : [];

  // Calculate macro percentages for visual display
  const macroPercentages = useMemo(() => {
    if (!currentMacroTargets) return { calories: 0, protein: 0, carbs: 0, fat: 0 };
    
    return {
      calories: currentMacroTargets.calories > 0 ? Math.min((consumedTodayMacros.calories / currentMacroTargets.calories) * 100, 100) : 0,
      protein: currentMacroTargets.protein > 0 ? Math.min((consumedTodayMacros.protein / currentMacroTargets.protein) * 100, 100) : 0,
      carbs: currentMacroTargets.carbs > 0 ? Math.min((consumedTodayMacros.carbs / currentMacroTargets.carbs) * 100, 100) : 0,
      fat: currentMacroTargets.fat > 0 ? Math.min((consumedTodayMacros.fat / currentMacroTargets.fat) * 100, 100) : 0,
    };
  }, [consumedTodayMacros, currentMacroTargets]);

  // Prepare chart data (same as weekly planner)
  const caloriesChartData = useMemo(() => {
    return currentMacroTargets ? [
      { name: "Calories", consumed: Math.round(consumedTodayMacros.calories) || 0, target: currentMacroTargets.calories || 0, unit: 'kcal' },
    ] : [{ name: "Calories", consumed: Math.round(consumedTodayMacros.calories) || 0, target: 0, unit: 'kcal' }];
  }, [consumedTodayMacros.calories, currentMacroTargets]);

  const macrosChartData = useMemo(() => {
    return currentMacroTargets ? [
      { name: "Protein", consumed: Math.round(consumedTodayMacros.protein) || 0, target: currentMacroTargets.protein || 0, unit: 'g' },
      { name: "Carbs", consumed: Math.round(consumedTodayMacros.carbs) || 0, target: currentMacroTargets.carbs || 0, unit: 'g' },
      { name: "Fat", consumed: Math.round(consumedTodayMacros.fat) || 0, target: currentMacroTargets.fat || 0, unit: 'g' },
    ] : [
      { name: "Protein", consumed: Math.round(consumedTodayMacros.protein) || 0, target: 0, unit: 'g' },
      { name: "Carbs", consumed: Math.round(consumedTodayMacros.carbs) || 0, target: 0, unit: 'g' },
      { name: "Fat", consumed: Math.round(consumedTodayMacros.fat) || 0, target: 0, unit: 'g' },
    ];
  }, [consumedTodayMacros, currentMacroTargets]);

  // Featured recipe effect
  useEffect(() => {
    if (allRecipesCache && allRecipesCache.length > 0) {
      const randomIndex = Math.floor(Math.random() * allRecipesCache.length);
      setFeaturedRecipe(allRecipesCache[randomIndex]);
      
      const differentIndex = randomIndex === 0 ? 1 : randomIndex - 1;
      if (allRecipesCache[differentIndex]) {
        setQuickRecipe(allRecipesCache[differentIndex]);
      }
    }
  }, [allRecipesCache]);

  // Loading state
  if (isAuthLoading || isProfileLoading) {
    return (
      <PageWrapper title="Dashboard">
        <div className="flex justify-center items-center min-h-[400px]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </PageWrapper>
    );
  }

  // Not authenticated
  if (!user) {
    return null; // Will redirect via useEffect
  }

  return (
    <PageWrapper title="Dashboard">
      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-primary mb-2">
            Welcome back, {welcomeName}!
          </h1>
          <p className="text-muted-foreground">
            Track your nutrition and plan your meals for optimal health.
          </p>
        </div>

        {/* Macro Targets Card */}
        {showMacros && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl font-semibold">
                  Today's Consumed Macros
                  {isClient && ` (${format(new Date(), 'MMMM dd, yyyy')})`}
                </CardTitle>
                <CardDescription>
                  {currentMacroTargets ? "Track your daily nutrition goals" : "Set targets to start tracking your nutrition"}
                </CardDescription>
              </div>
              <Link href="/profile/targets">
                <Button variant="outline" size="sm">
                  <Target className="h-4 w-4 mr-2" />
                  Set Targets
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {currentMacroTargets ? (
                <div className="space-y-4">
                  {/* Chart Visualizations (EXACT same as meal planner) */}
                  <div className="space-y-4">
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
                  </div>
                  
                  {/* Progress Summary */}
                  <ProgressSummary 
                    consumedMacros={consumedTodayMacros}
                    targetMacros={currentMacroTargets}
                    className="mt-4"
                  />
                </div>
              ) : (
                <div className="text-center py-8">
                  <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">
                    Set your daily macro targets to start tracking your nutrition.
                  </p>
                  <Link href="/profile/targets">
                    <Button className="bg-orange-600 hover:bg-orange-700">
                      <Target className="h-4 w-4 mr-2" />
                      Set Targets Now
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Today's Menu Card */}
        {showMenu && (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-semibold">Today's Menu</CardTitle>
              <CardDescription>
                Your planned meals for {isClient ? format(new Date(), 'MMMM dd, yyyy') : 'today'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {dailyPlannedMeals && dailyPlannedMeals.length > 0 ? (
                <div className="space-y-4">
                  {dailyPlannedMeals.map((meal, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div>
                        <h4 className="font-medium">{meal.mealType}</h4>
                        <p className="text-sm text-muted-foreground">
                          {meal.recipeDetails?.name || 'Unknown Recipe'} 
                          {meal.servings > 1 && ` (${meal.servings} servings)`}
                        </p>
                      </div>
                      <Badge variant={meal.status === 'eaten' ? 'default' : 'secondary'}>
                        {meal.status === 'eaten' ? 'Completed' : 'Planned'}
                      </Badge>
                    </div>
                  ))}
                  <div className="text-center pt-2">
                    <Link href="/meal-plan">
                      <Button variant="outline" size="sm">
                        <CalendarCheck className="h-4 w-4 mr-2" />
                        View Full Meal Plan
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <UtensilsCrossed className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">
                    No meals planned for today yet.
                  </p>
                  <Link href="/meal-plan">
                    <Button>
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Plan Your Meals
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Featured Recipe Card */}
        {showFeaturedRecipe && featuredRecipe && (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-semibold flex items-center">
                <Star className="h-5 w-5 mr-2 text-yellow-500" />
                Featured Recipe
              </CardTitle>
              <CardDescription>
                Discover something delicious from your collection
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RecipeCard recipe={featuredRecipe} />
            </CardContent>
          </Card>
        )}

        {/* Usage Overview */}
        <UsageDashboard 
          userId={user?.uid || ''} 
          userProfile={userProfile}
          defaultCollapsed={false}
          onUpgradeClick={() => {
            // TODO: Integrate with payment system
            toast({
              title: "Upgrade Coming Soon!",
              description: "Premium subscriptions will be available soon. Thanks for your interest!",
            });
          }}
        />

        {/* Quick Actions Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-semibold">Quick Actions</CardTitle>
            <CardDescription>
              Jump to the most common tasks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Link href="/recipes/add">
                <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center">
                  <PlusCircle className="h-6 w-6 mb-2" />
                  <span className="text-xs">Add Recipe</span>
                </Button>
              </Link>
              <Link href="/ai-suggestions">
                <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center">
                  <Wand2 className="h-6 w-6 mb-2" />
                  <span className="text-xs">AI Meal Plan</span>
                </Button>
              </Link>
              <Link href="/shopping-list">
                <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 mb-2" />
                  <span className="text-xs">Shopping List</span>
                </Button>
              </Link>
              <Link href="/daily-check-in">
                <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center">
                  <Scale className="h-6 w-6 mb-2" />
                  <span className="text-xs">Daily Check-in</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  );
}