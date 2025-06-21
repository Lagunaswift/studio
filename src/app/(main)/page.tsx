
"use client";

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Target, Edit, Star, Loader2, CalendarCheck, PlusCircle, UtensilsCrossed } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { format, parseISO, isValid } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import type { MacroTargets, Macros, Recipe, PlannedMeal } from '@/types';
import { RecipeCard } from '@/components/shared/RecipeCard';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from '@/components/ui/badge';

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
  const { user, isLoading: isAuthLoading, profile: authProfile } = useAuth();
  const {
    getDailyMacros,
    macroTargets: appContextMacroTargets,
    setMacroTargets,
    mealPlan,
    allRecipesCache,
    isRecipeCacheLoading: isAppRecipeCacheLoading,
    userProfile: appContextUserProfile,
    getMealsForDate,
  } = useAppContext();
  const { toast } = useToast();

  const [clientTodayDate, setClientTodayDate] = useState<string>('');
  const [clientTodayMacros, setClientTodayMacros] = useState<Macros>({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  const [dailyPlannedMeals, setDailyPlannedMeals] = useState<PlannedMeal[]>([]);
  const [showSetTargetsDialog, setShowSetTargetsDialog] = useState(false);
  const [featuredRecipe, setFeaturedRecipe] = useState<Recipe | null>(null);

  const currentMacroTargets = appContextUserProfile?.macroTargets || appContextMacroTargets;
  const welcomeName = appContextUserProfile?.name || appContextUserProfile?.email || authProfile?.name || authProfile?.email || user?.email || 'User';

  useEffect(() => {
    const today = new Date();
    setClientTodayDate(format(today, 'yyyy-MM-dd'));
  }, []);

  useEffect(() => {
    if (clientTodayDate && getDailyMacros) {
      const newMacros = getDailyMacros(clientTodayDate);
      setClientTodayMacros(newMacros);
      const todaysMeals = getMealsForDate(clientTodayDate);
      setDailyPlannedMeals(todaysMeals);
    }
  }, [clientTodayDate, getDailyMacros, getMealsForDate, mealPlan]);


  useEffect(() => {
    if (!isAppRecipeCacheLoading && allRecipesCache.length > 0) {
      const randomIndex = Math.floor(Math.random() * allRecipesCache.length);
      setFeaturedRecipe(allRecipesCache[randomIndex]);
    } else {
      setFeaturedRecipe(null);
    }
  }, [isAppRecipeCacheLoading, allRecipesCache]);


  const macroTargetForm = useForm<MacroTargetFormValues>({
    resolver: zodResolver(macroTargetSchema),
    defaultValues: currentMacroTargets || { calories: 2000, protein: 150, carbs: 200, fat: 60 },
  });

  const proteinValue = macroTargetForm.watch("protein");
  const carbsValue = macroTargetForm.watch("carbs");
  const fatValue = macroTargetForm.watch("fat");

  useEffect(() => {
    const protein = parseFloat(proteinValue as any) || 0;
    const carbs = parseFloat(carbsValue as any) || 0;
    const fat = parseFloat(fatValue as any) || 0;
    const calculatedCalories = (protein * 4) + (carbs * 4) + (fat * 9);

    const currentCalories = macroTargetForm.getValues("calories");
    if (Math.round(calculatedCalories) !== Math.round(currentCalories)) {
      macroTargetForm.setValue("calories", Math.round(calculatedCalories), {
        shouldValidate: true,
        shouldDirty: true
      });
    }
  }, [proteinValue, carbsValue, fatValue, macroTargetForm]);


  useEffect(() => {
    if (showSetTargetsDialog) {
      if (currentMacroTargets) {
        macroTargetForm.reset(currentMacroTargets);
      } else {
        const defaultP = 150, defaultC = 200, defaultF = 60;
        macroTargetForm.reset({ protein: defaultP, carbs: defaultC, fat: defaultF, calories: (defaultP*4 + defaultC*4 + defaultF*9) });
      }
    }
  }, [currentMacroTargets, showSetTargetsDialog, macroTargetForm]);

  const handleSetTargets: SubmitHandler<MacroTargetFormValues> = (data) => {
    setMacroTargets(data);
    toast({
      title: "Targets Updated",
      description: "Your macro targets have been saved.",
    });
    setShowSetTargetsDialog(false);
    macroTargetForm.reset(data);
  };

  const caloriesChartData = currentMacroTargets ? [
    { name: "Calories", consumed: clientTodayMacros.calories || 0, target: currentMacroTargets.calories || 0, unit: 'kcal' },
  ] : [];

  const macrosChartData = currentMacroTargets ? [
    { name: "Protein", consumed: clientTodayMacros.protein || 0, target: currentMacroTargets.protein || 0, unit: 'g' },
    { name: "Carbs", consumed: clientTodayMacros.carbs || 0, target: currentMacroTargets.carbs || 0, unit: 'g' },
    { name: "Fat", consumed: clientTodayMacros.fat || 0, target: currentMacroTargets.fat || 0, unit: 'g' },
  ] : [];


  if (isAuthLoading || (isAppRecipeCacheLoading && !user && !authProfile)) {
    return (
      <PageWrapper title={`Welcome, ${welcomeName}!`}>
        <div className="flex flex-col items-center justify-center h-60 text-muted-foreground">
          <Loader2 className="h-16 w-16 animate-spin text-accent mb-6" />
          <p className="text-lg">Loading dashboard data...</p>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title={`Welcome, ${welcomeName}!`}>
      <section className="mb-12">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold font-headline text-primary">
            {"Today's Macros"} ({clientTodayDate && isValid(parseISO(clientTodayDate)) ? format(parseISO(clientTodayDate), "MMMM dd, yyyy") : 'Loading...'})
          </h2>
          <Button variant="outline" onClick={() => setShowSetTargetsDialog(true)}>
            {currentMacroTargets ? <Edit className="mr-2 h-4 w-4" /> : <Target className="mr-2 h-4 w-4" />}
            {currentMacroTargets ? "Update Targets" : "Set Targets"}
          </Button>
        </div>

        {currentMacroTargets ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Calories (kcal)</CardTitle>
              </CardHeader>
              <CardContent className="pt-2 h-[250px]"> {/* Ensure CardContent has height for chart */}
                <ChartContainer config={chartConfig} className="w-full h-full">
                  <BarChart accessibilityLayer data={caloriesChartData} layout="vertical">
                    <CartesianGrid horizontal={false} />
                    <XAxis type="number" dataKey="value" tickFormatter={(value) => `${value}`} />
                    <YAxis dataKey="name" type="category" tickLine={false} tickMargin={10} axisLine={false} width={80} />
                    <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
                    <Bar dataKey="consumed" fill="var(--color-consumed)" radius={4} barSize={30} name="Consumed" />
                    <Bar dataKey="target" fill="var(--color-target)" radius={4} barSize={30} name="Target" />
                    <ChartLegend content={<ChartLegendContent />} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Macronutrients (grams)</CardTitle>
              </CardHeader>
              <CardContent className="pt-2 h-[250px]">
                <ChartContainer config={chartConfig} className="w-full h-full">
                   <BarChart accessibilityLayer data={macrosChartData} layout="vertical">
                    <CartesianGrid horizontal={false} />
                     <XAxis type="number" dataKey="value" tickFormatter={(value) => `${value}g`} />
                    <YAxis dataKey="name" type="category" tickLine={false} tickMargin={10} axisLine={false} width={80} />
                    <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
                    <Bar dataKey="consumed" fill="var(--color-consumed)" radius={4} barSize={20} name="Consumed" />
                    <Bar dataKey="target" fill="var(--color-target)" radius={4} barSize={20} name="Target" />
                    <ChartLegend content={<ChartLegendContent />} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card className="shadow-md">
            <CardContent className="pt-6 text-center">
              <p className="text-foreground/70 mb-4">
                Set your daily macro targets to track your progress!
              </p>
              <Button onClick={() => setShowSetTargetsDialog(true)} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                <Target className="mr-2 h-4 w-4" /> Set Targets Now
              </Button>
            </CardContent>
          </Card>
        )}
      </section>
      
      <section className="mb-12">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-xl font-bold font-headline text-primary flex items-center">
              <CalendarCheck className="mr-2 h-5 w-5 text-accent" /> Today's Menu
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dailyPlannedMeals.length > 0 ? (
              <ul className="space-y-3">
                {dailyPlannedMeals.map(meal => (
                  <li key={meal.id} className="p-3 bg-muted/30 rounded-md hover:bg-muted/50 transition-colors">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-primary-focus">
                        <Link href={`/recipes/${meal.recipeId}`} className="hover:underline">
                          {meal.recipeDetails?.name || 'Recipe Name Missing'}
                        </Link>
                      </span>
                      <Badge variant="outline" className="text-xs">{meal.mealType}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">Servings: {meal.servings}</p>
                    {meal.recipeDetails && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Approx. {(meal.recipeDetails.macrosPerServing.calories * meal.servings).toFixed(0)} kcal
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-4">
                <p className="text-muted-foreground mb-3">No meals planned for today yet.</p>
                <Button asChild variant="default" size="sm" className="bg-accent hover:bg-accent/90 text-accent-foreground">
                  <Link href="/meal-plan">
                    <PlusCircle className="mr-2 h-4 w-4" /> Go to Meal Planner
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-bold font-headline text-primary mb-6 flex items-center">
          <Star className="mr-2 h-6 w-6 text-accent" /> Featured Recipe
        </h2>
        {isAppRecipeCacheLoading && !featuredRecipe ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-2 text-muted-foreground">Loading featured recipe...</p>
          </div>
        ) : featuredRecipe ? (
          <div className="max-w-sm mx-auto md:max-w-md">
            <RecipeCard
              recipe={featuredRecipe}
              showViewDetailsButton={true}
              showAddToMealPlanButton={false}
              className="shadow-xl border-2 border-accent/50"
            />
          </div>
        ) : (
          <Alert>
            <UtensilsCrossed className="h-4 w-4" />
            <AlertTitle>No Recipes Available</AlertTitle>
            <AlertDescription>
              There are no recipes to feature right now. Try adding some recipes to the app!
            </AlertDescription>
          </Alert>
        )}
      </section>

      <Dialog open={showSetTargetsDialog} onOpenChange={setShowSetTargetsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-headline text-primary">Set Your Daily Macro Targets</DialogTitle>
            <DialogDescription>Enter your desired daily intake for calories and macronutrients. Calories will be auto-calculated.</DialogDescription>
          </DialogHeader>
          <form onSubmit={macroTargetForm.handleSubmit(handleSetTargets)} className="space-y-4 py-4">
            <div>
              <Label htmlFor="protein">Protein (g)</Label>
              <Input id="protein" type="number" min="0" {...macroTargetForm.register("protein")} />
              {macroTargetForm.formState.errors.protein && <p className="text-sm text-destructive mt-1">{macroTargetForm.formState.errors.protein.message}</p>}
            </div>
            <div>
              <Label htmlFor="carbs">Carbohydrates (g)</Label>
              <Input id="carbs" type="number" min="0" {...macroTargetForm.register("carbs")} />
              {macroTargetForm.formState.errors.carbs && <p className="text-sm text-destructive mt-1">{macroTargetForm.formState.errors.carbs.message}</p>}
            </div>
            <div>
              <Label htmlFor="fat">Fat (g)</Label>
              <Input id="fat" type="number" min="0" {...macroTargetForm.register("fat")} />
              {macroTargetForm.formState.errors.fat && <p className="text-sm text-destructive mt-1">{macroTargetForm.formState.errors.fat.message}</p>}
            </div>
            <div>
              <Label htmlFor="calories">Calculated Calories (kcal)</Label>
              <Input id="calories" type="number" min="0" {...macroTargetForm.register("calories")} readOnly className="bg-muted/50 cursor-not-allowed"/>
              {macroTargetForm.formState.errors.calories && <p className="text-sm text-destructive mt-1">{macroTargetForm.formState.errors.calories.message}</p>}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowSetTargetsDialog(false)}>Cancel</Button>
              <Button type="submit" className="bg-accent hover:bg-accent/90 text-accent-foreground" disabled={!macroTargetForm.formState.isDirty || macroTargetForm.formState.isSubmitting}>Save Targets</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
