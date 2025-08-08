//src/app/(main)/page.tsx - TRY ALTERNATIVE Wand2 ICONS
"use client";
import Link from 'next/link';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';

// TRY DIFFERENT Wand2 VARIATIONS
import { 
  Target, 
  Edit, 
  Star, 
  Loader2, 
  CalendarCheck, 
  PlusCircle, 
  UtensilsCrossed, 
  Zap,  // This could work as alternative to Wand2
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
  Wand2  // Another alternative to Wand2
} from 'lucide-react';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from '@/components/ui/badge';
// Charts
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig
} from "@/components/ui/chart";

const macroTargetSchema = z.object({
  calories: z.coerce.number().min(0, "Calories must be positive").default(0),
  protein: z.coerce.number().min(0, "Protein must be positive").default(0),
  carbs: z.coerce.number().min(0, "Carbs must be positive").default(0),
  fat: z.coerce.number().min(0, "Fat must be positive").default(0),
});
type MacroTargetFormValues = z.infer<typeof macroTargetSchema>;
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
  const [showSetTargetsDialog, setShowSetTargetsDialog] = useState(false);
  const [featuredRecipe, setFeaturedRecipe] = useState<Recipe | null>(null);
  const [quickRecipe, setQuickRecipe] = useState<Recipe | null>(null);
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
  // Form setup for macro targets
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue
  } = useForm<MacroTargetFormValues>({
    resolver: zodResolver(macroTargetSchema),
    defaultValues: {
      calories: currentMacroTargets?.calories || 0,
      protein: currentMacroTargets?.protein || 0,
      carbs: currentMacroTargets?.carbs || 0,
      fat: currentMacroTargets?.fat || 0,
    }
  });
  // Update form when profile loads
  useEffect(() => {
    if (currentMacroTargets) {
      setValue('calories', currentMacroTargets.calories);
      setValue('protein', currentMacroTargets.protein);
      setValue('carbs', currentMacroTargets.carbs);
      setValue('fat', currentMacroTargets.fat);
    }
  }, [currentMacroTargets, setValue]);
  // Handle macro targets submission
  const onSubmitMacroTargets: SubmitHandler<MacroTargetFormValues> = async (data) => {
    try {
      await updateProfile({ macroTargets: data });
      setShowSetTargetsDialog(false);
      toast({
        title: "Targets Updated",
        description: "Your macro targets have been successfully updated.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update your macro targets. Please try again.",
        variant: "destructive",
      });
    }
  };
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
                <CardTitle className="text-xl font-semibold">Today's Macros</CardTitle>
                <CardDescription>
                  Track your daily nutrition goals
                </CardDescription>
              </div>
              <Dialog open={showSetTargetsDialog} onOpenChange={setShowSetTargetsDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Target className="h-4 w-4 mr-2" />
                    Set Targets
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Set Your Macro Targets</DialogTitle>
                    <DialogDescription>
                      Define your daily nutrition goals to track your progress.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit(onSubmitMacroTargets)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="calories">Calories</Label>
                        <Input
                          id="calories"
                          type="number"
                          {...register('calories')}
                          placeholder="e.g., 2000"
                        />
                        {errors.calories && (
                          <p className="text-sm text-red-600 mt-1">{errors.calories.message}</p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="protein">Protein (g)</Label>
                        <Input
                          id="protein"
                          type="number"
                          {...register('protein')}
                          placeholder="e.g., 150"
                        />
                        {errors.protein && (
                          <p className="text-sm text-red-600 mt-1">{errors.protein.message}</p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="carbs">Carbs (g)</Label>
                        <Input
                          id="carbs"
                          type="number"
                          {...register('carbs')}
                          placeholder="e.g., 200"
                        />
                        {errors.carbs && (
                          <p className="text-sm text-red-600 mt-1">{errors.carbs.message}</p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="fat">Fat (g)</Label>
                        <Input
                          id="fat"
                          type="number"
                          {...register('fat')}
                          placeholder="e.g., 80"
                        />
                        {errors.fat && (
                          <p className="text-sm text-red-600 mt-1">{errors.fat.message}</p>
                        )}
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            Save Targets
                          </>
                        )}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {currentMacroTargets ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { key: 'calories', label: 'Calories', consumed: consumedTodayMacros.calories, target: currentMacroTargets.calories, unit: '', color: 'text-blue-600' },
                      { key: 'protein', label: 'Protein', consumed: consumedTodayMacros.protein, target: currentMacroTargets.protein, unit: 'g', color: 'text-green-600' },
                      { key: 'carbs', label: 'Carbs', consumed: consumedTodayMacros.carbs, target: currentMacroTargets.carbs, unit: 'g', color: 'text-orange-600' },
                      { key: 'fat', label: 'Fat', consumed: consumedTodayMacros.fat, target: currentMacroTargets.fat, unit: 'g', color: 'text-red-600' }
                    ].map(({ key, label, consumed, target, unit, color }) => (
                      <div key={key} className="text-center">
                        <div className={`text-2xl font-bold ${color}`}>
                          {Math.round(consumed)}<span className="text-sm">/{target}{unit}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">{label}</div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-300 ${
                              key === 'calories' ? 'bg-blue-600' :
                              key === 'protein' ? 'bg-green-600' :
                              key === 'carbs' ? 'bg-orange-600' : 'bg-red-600'
                            }`}
                            style={{ width: `${Math.min(macroPercentages[key as keyof typeof macroPercentages], 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">
                    Set your daily macro targets to start tracking your nutrition.
                  </p>
                  <Button onClick={() => setShowSetTargetsDialog(true)}>
                    <Target className="h-4 w-4 mr-2" />
                    Set Your Targets
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <Link href="/daily-check-in">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CheckCircle2 className="h-5 w-5 mr-2 text-green-600" />
                  Daily Check-in
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Log your weight, vitals, and how you're feeling today.
                </p>
              </CardContent>
            </Link>
          </Card>
          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <Link href="/meal-plan">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CalendarCheck className="h-5 w-5 mr-2 text-blue-600" />
                  Plan Meals
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Organize your weekly meals and track your nutrition.
                </p>
              </CardContent>
            </Link>
          </Card>
          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <Link href="/ai-suggestions">
              <CardHeader>
                <CardTitle className="flex items-center">
                  {/* TRY WAND2 INSTEAD OF Wand2 */}
                  <Wand2 className="h-5 w-5 mr-2 text-purple-600" />
                  AI Suggestions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Get personalized meal plans generated by AI.
                </p>
              </CardContent>
            </Link>
          </Card>
        </div>
        {/* Today's Meal Plan */}
        {showMenu && dailyPlannedMeals.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Utensils className="h-5 w-5 mr-2" />
                Today's Meals
              </CardTitle>
              <CardDescription>
                Your planned meals for {format(new Date(), 'EEEE, MMMM d')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dailyPlannedMeals.map((meal) => {
                  const recipe = allRecipesCache.find(r => r.id === meal.recipeId);
                  return (
                    <div key={meal.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Badge variant="outline">{meal.mealType}</Badge>
                        <div>
                          <p className="font-medium">{recipe?.name || 'Unknown Recipe'}</p>
                          <p className="text-sm text-muted-foreground">
                            {meal.servings} serving{meal.servings !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/recipes/${meal.recipeId}`}>
                          View Recipe
                        </Link>
                      </Button>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </PageWrapper>
  );
}