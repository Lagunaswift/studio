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
  BrainCircuit
} from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { format, parseISO, isValid } from 'date-fns';
import { cn } from '@/lib/utils';

// FIXED IMPORTS
import { useAuth } from '@/context/AuthContext';
import { useOptimizedRecipes, useOptimizedProfile, useOptimizedDailyMealPlan } from '@/hooks/useOptimizedFirestore';
import { useToast } from '@/hooks/use-toast';

// Types
import type { MacroTargets, Macros, Recipe, PlannedMeal } from '@/types';

// Components
import { RecipeCard } from '@/components/shared/RecipeCard';
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

// Enhanced Meal Item Component with Image
const TodaysMenuMealItem: React.FC<{ meal: any; index: number }> = ({ meal, index }) => {
  const [imageError, setImageError] = useState(false);
  
  const getImageSrc = () => {
    if (!meal.recipeDetails || imageError) {
      return '/placeholder-recipe.jpg';
    }
    return `/images/${meal.recipeDetails.id}.jpg`;
  };
  
  return (
    <div key={meal.id || index} className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg">
      {/* Recipe Image */}
      <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
        <img
          src={getImageSrc()}
          alt={meal.recipeDetails?.name || 'Recipe'}
          className="w-full h-full object-cover"
          onError={() => setImageError(true)}
          loading="lazy"
        />
      </div>
      
      {/* Meal Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="font-medium text-sm">{meal.mealType}</h4>
          <Badge variant={meal.status === 'eaten' ? 'default' : 'secondary'} className="text-xs">
            {meal.status === 'eaten' ? 'Completed' : 'Planned'}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground truncate">
          {meal.recipeDetails?.name || (
            <span className="text-destructive">Recipe not found (ID: {meal.recipeId})</span>
          )}
          {meal.servings && meal.servings > 1 && ` • ${meal.servings} servings`}
        </p>
        {meal.recipeDetails && (
          <p className="text-xs text-muted-foreground mt-1">
            {meal.recipeDetails.calories && `${Math.round(meal.recipeDetails.calories * (meal.servings || 1))} cal`}
            {meal.recipeDetails.prepTime && ` • ${meal.recipeDetails.prepTime}`}
          </p>
        )}
      </div>
    </div>
  );
};

export default function HomePage() {
  // FIXED: All hooks properly imported
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const { profile: userProfile, loading: isProfileLoading, updateProfile } = useOptimizedProfile(user?.uid);
  const { recipes: allRecipesCache, loading: isAppRecipeCacheLoading, error: recipesError } = useOptimizedRecipes(user?.uid);
  
  // Get consumed macros directly from user profile manual entries
  const getConsumedMacrosForDate = (date: string): Macros => {
    if (!userProfile?.dailyManualMacrosLog) {
      return { calories: 0, protein: 0, carbs: 0, fat: 0 };
    }
    
    const dayEntry = userProfile.dailyManualMacrosLog.find(entry => entry.date === date);
    return dayEntry?.macros || { calories: 0, protein: 0, carbs: 0, fat: 0 };
  };
  
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
  const consumedTodayMacros = clientTodayDate 
    ? getConsumedMacrosForDate(clientTodayDate) 
    : { calories: 0, protein: 0, carbs: 0, fat: 0 };

  // Get daily planned meals using the optimized hook with fallback
  const { meals: dailyPlannedMeals, loading: isDailyMealsLoading, error: dailyMealsError, hasMigratedData } = useOptimizedDailyMealPlan(
    user?.uid,
    clientTodayDate
  );
  
  // Enhanced meals with recipe details
  const enhancedDailyMeals = dailyPlannedMeals.map(meal => ({
    ...meal,
    recipeDetails: allRecipesCache.find(recipe => recipe.id === meal.recipeId)
  }));
  
  // Auto-migration effect
  useEffect(() => {
    const triggerMigrationIfNeeded = async () => {
      if (!user || !clientTodayDate || isDailyMealsLoading) return;
      
      try {
        const idToken = await user.getIdToken();
        console.log('🔄 Checking migration status...');
        
        // Import the migration functions dynamically
        const { checkMigrationStatus, migrateLegacyMealPlanData } = await import('@/app/(main)/profile/actions');
        const status = await checkMigrationStatus(idToken);
        
        if (status.success) {
          console.log('📊 Migration status:', status);
          
          // If we have legacy data and need migration
          if (status.needsMigration || (status.hasLegacyData && !hasMigratedData)) {
            console.log('🚀 Starting automatic migration...');
            const result = await migrateLegacyMealPlanData(idToken);
            
            if (result.success && result.migratedMealsCount && result.migratedMealsCount > 0) {
              console.log(`✅ Migration successful: ${result.message}`);
              toast({
                title: "Meal Plan Updated",
                description: `We've updated your meal plan structure. ${result.migratedMealsCount} meals have been migrated.`,
              });
            } else {
              console.log('ℹ️ Migration completed but no meals found to migrate');
            }
          } else {
            console.log('✅ No migration needed');
          }
        }
      } catch (error) {
        console.warn('⚠️ Migration check failed:', error);
      }
    };
    
    // Delay migration check to avoid race conditions
    const timeoutId = setTimeout(triggerMigrationIfNeeded, 1500);
    return () => clearTimeout(timeoutId);
  }, [user, clientTodayDate, hasMigratedData, isDailyMealsLoading, toast]);
  

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
  if (isAuthLoading || isProfileLoading || isAppRecipeCacheLoading) {
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
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-semibold">Today's Menu</CardTitle>
                  <CardDescription>
                    Your planned meals for {isClient ? format(new Date(), 'MMMM dd, yyyy') : 'today'}
                    {!hasMigratedData && dailyPlannedMeals.length > 0 && (
                      <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                        Legacy data - will be migrated automatically
                      </span>
                    )}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {isDailyMealsLoading && (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {dailyMealsError && (
                <Alert className="mb-4">
                  <AlertTitle>Error Loading Meals</AlertTitle>
                  <AlertDescription>
                    {dailyMealsError} - Try refreshing the page.
                  </AlertDescription>
                </Alert>
              )}
              {enhancedDailyMeals && enhancedDailyMeals.length > 0 ? (
                <div className="space-y-4">
                  {enhancedDailyMeals.map((meal, index) => (
                    <TodaysMenuMealItem key={meal.id || index} meal={meal} index={index} />
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
                    {isDailyMealsLoading ? 'Loading your meals...' : 'No meals planned for today yet.'}
                  </p>
                  {!isDailyMealsLoading && (
                    <Link href="/meal-plan">
                      <Button>
                        <PlusCircle className="h-4 w-4 mr-2" />
                        Plan Your Meals
                      </Button>
                    </Link>
                  )}
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

      </div>
    </PageWrapper>
  );
}