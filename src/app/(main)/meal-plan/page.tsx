// src/app/(main)/meal-plan/page.tsx
"use client";

import { useState, useEffect, useCallback } from 'react';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { useOptimizedRecipes, useOptimizedProfile } from '@/hooks/useOptimizedFirestore';
import { useAuth } from '@/context/AuthContext';
import type { PlannedMeal, MealType, Recipe, Macros, MealSlotConfig } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { format, addDays, subDays, isValid } from 'date-fns';
import { ChevronLeft, ChevronRight, Trash2, Edit3, PlusCircle, Loader2, Info, CalendarDays as CalendarDaysIcon, CheckCircle2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter as EditDialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { RecipeCard } from '@/components/shared/RecipeCard';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { MacroDisplay } from '@/components/shared/MacroDisplay';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronUp, ChevronDown, Flame, Beef, Wheat, Droplets } from 'lucide-react';
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

const MEAL_SLOT_CONFIG: Array<{ type: MealType; displayName: string }> = [
  { type: "Breakfast", displayName: "Breakfast" },
  { type: "Lunch", displayName: "Lunch" },
  { type: "Dinner", displayName: "Dinner" },
  { type: "Snack", displayName: "Snack 1" },
  { type: "Snack", displayName: "Snack 2" },
];

const chartConfig = {
  consumed: { label: "Consumed", color: "hsl(var(--chart-1))" },
  target: { label: "Target", color: "hsl(var(--chart-2))" },
} satisfies ChartConfig;

export default function MealPlanPage() {
  const { user } = useAuth();
  const { profile: userProfile, updateProfile } = useOptimizedProfile(user?.uid);
  const { recipes: allRecipesCache, loading: isAppRecipeCacheLoading } = useOptimizedRecipes(user?.uid);

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [editingMeal, setEditingMeal] = useState<PlannedMeal | null>(null);
  const [newServings, setNewServings] = useState<number>(1);
  const { toast } = useToast();

  const [recipePickerIndices, setRecipePickerIndices] = useState<{[key: string]: number}>(
    (userProfile?.mealStructure || MEAL_SLOT_CONFIG).reduce((acc, slot, index) => {
      const key = 'name' in slot ? 
        `${slot.type}-${slot.id}` : `${slot.type}-${index}`;
      acc[key] = 0;
      return acc;
    }, {} as {[key: string]: number})
  );
  
  const availableRecipesForPicker = allRecipesCache;
  const mealStructureToUse = userProfile?.mealStructure || MEAL_SLOT_CONFIG.map((s, i) => ({...s, id: `default-${i}`}));

  const formattedDate = format(selectedDate, 'yyyy-MM-dd');
  // @ts-ignore
  const dailyMeals = userProfile?.mealPlan?.filter(meal => meal.date === formattedDate) || [];

  // MealPlanRecipeCard Component
  interface MealPlanRecipeCardProps {
    recipe: Recipe;
    onAdd: () => void;
  }

  const MealPlanRecipeCard: React.FC<MealPlanRecipeCardProps> = ({ recipe, onAdd }) => {
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [imageError, setImageError] = useState(false);
    
    return (
      <div className="border rounded-lg p-3 bg-card">
        {/* Compact Header */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded overflow-hidden bg-muted flex-shrink-0">
            <img 
              src={imageError ? '/placeholder-recipe.jpg' : recipe.image}
              alt={recipe.name}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
          </div>
          
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm line-clamp-1 text-primary">
              {recipe.name}
            </h4>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {recipe.macrosPerServing && (
                <span>{recipe.macrosPerServing.calories.toFixed(0)}kcal</span>
              )}
              {recipe.calories && !recipe.macrosPerServing && (
                <span>{recipe.calories.toFixed(0)}kcal</span>
              )}
              <span>{recipe.prepTime}</span>
            </div>
          </div>
          
          <Button
            size="sm"
            onClick={onAdd}
            className="bg-accent hover:bg-accent/90"
          >
            <PlusCircle className="h-3 w-3 mr-1" />
            Add
          </Button>
        </div>
        
        {/* Collapsible Details */}
        <Collapsible open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <CollapsibleTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm"
              className="w-full justify-between text-xs"
            >
              Show Details
              {isDetailsOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </Button>
          </CollapsibleTrigger>
          
          <CollapsibleContent className="space-y-2 pt-2 border-t mt-2">
            {/* Macro Grid */}
            {(recipe.macrosPerServing || recipe.calories) && (
              <div className="grid grid-cols-4 gap-1 text-xs">
                <div className="text-center">
                  <Flame className="w-3 h-3 mx-auto text-primary" />
                  <div className="font-medium">
                    {recipe.macrosPerServing ? 
                      recipe.macrosPerServing.calories.toFixed(0) : 
                      recipe.calories?.toFixed(0) || 0
                    }
                  </div>
                  <div className="text-muted-foreground">kcal</div>
                </div>
                <div className="text-center">
                  <Beef className="w-3 h-3 mx-auto text-chart-1" />
                  <div className="font-medium">
                    {recipe.macrosPerServing ? 
                      recipe.macrosPerServing.protein.toFixed(0) : 
                      recipe.protein?.toFixed(0) || 0
                    }g
                  </div>
                  <div className="text-muted-foreground">protein</div>
                </div>
                <div className="text-center">
                  <Wheat className="w-3 h-3 mx-auto text-chart-2" />
                  <div className="font-medium">
                    {recipe.macrosPerServing ? 
                      recipe.macrosPerServing.carbs.toFixed(0) : 
                      recipe.carbs?.toFixed(0) || 0
                    }g
                  </div>
                  <div className="text-muted-foreground">carbs</div>
                </div>
                <div className="text-center">
                  <Droplets className="w-3 h-3 mx-auto text-accent" />
                  <div className="font-medium">
                    {recipe.macrosPerServing ? 
                      recipe.macrosPerServing.fat.toFixed(0) : 
                      recipe.fat?.toFixed(0) || 0
                    }g
                  </div>
                  <div className="text-muted-foreground">fat</div>
                </div>
              </div>
            )}
            
            {/* Timing & Servings */}
            <div className="text-xs space-y-1">
              <div className="flex justify-between">
                <span>Prep:</span>
                <span>{recipe.prepTime}</span>
              </div>
              <div className="flex justify-between">
                <span>Cook:</span>
                <span>{recipe.cookTime}</span>
              </div>
              <div className="flex justify-between">
                <span>Servings:</span>
                <span>{recipe.servings}</span>
              </div>
            </div>
            
            {/* Tags */}
            {recipe.tags && (
              <div className="flex flex-wrap gap-1">
                {recipe.tags.map(tag => (
                  <Badge key={tag} variant="outline" className="text-xs px-1 py-0">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      </div>
    );
  };
  
  // FIXED: Handle both old and new recipe data formats with complete safety
  // @ts-ignore
  const dailyMacros = dailyMeals.reduce((acc, meal) => {
    // Safety check for meal object
    if (!meal || typeof meal.recipeId === 'undefined' || typeof meal.servings !== 'number') {
      console.warn('Invalid meal object:', meal);
      return acc;
    }

    const recipe = allRecipesCache.find(r => r && r.id === meal.recipeId);
    if (!recipe) {
      console.warn(`Recipe not found for meal: recipeId ${meal.recipeId}`);
      return acc;
    }

    // Ensure servings is a valid number
    const servings = isNaN(meal.servings) ? 0 : meal.servings;
    if (servings <= 0) {
      console.warn(`Invalid servings (${meal.servings}) for recipe ${recipe.name}`);
      return acc;
    }

    // Handle both old and new data formats with maximum safety
    try {
      if (recipe.macrosPerServing && typeof recipe.macrosPerServing === 'object') {
        // Old format: recipe.macrosPerServing.calories
        const macros = recipe.macrosPerServing;
        acc.calories += (typeof macros.calories === 'number' ? macros.calories : 0) * servings;
        acc.protein += (typeof macros.protein === 'number' ? macros.protein : 0) * servings;
        acc.carbs += (typeof macros.carbs === 'number' ? macros.carbs : 0) * servings;
        acc.fat += (typeof macros.fat === 'number' ? macros.fat : 0) * servings;
      } else if (typeof recipe.calories === 'number') {
        // Your format: recipe.calories (direct properties)
        acc.calories += (recipe.calories || 0) * servings;
        acc.protein += (recipe.protein || 0) * servings;
        acc.carbs += (recipe.carbs || 0) * servings;
        acc.fat += (recipe.fat || 0) * servings;
      } else {
        console.warn(`Recipe ${recipe.name} (id: ${recipe.id}) has no valid macro data. Recipe structure:`, {
          hasDirectCalories: typeof recipe.calories,
          hasMacrosPerServing: typeof recipe.macrosPerServing,
          recipeKeys: Object.keys(recipe)
        });
      }
    } catch (error) {
      console.error(`Error calculating macros for recipe ${recipe.name}:`, error);
    }

    return acc;
  }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

  const currentMacroTargets = userProfile?.macroTargets;

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
      // @ts-ignore
      const updatedMealPlan = userProfile.mealPlan.map(meal => 
        meal.id === editingMeal.id ? { ...meal, servings: newServings } : meal
      );
      updateProfile({ mealPlan: updatedMealPlan });
      toast({ 
        title: "Servings Updated", 
        description: `${editingMeal.recipeDetails?.name} servings updated to ${newServings}.` 
      });
      setEditingMeal(null);
    } else {
      toast({ title: "Error", description: "Invalid servings amount." });
    }
  };

  const handleRemoveMeal = (mealToRemove: PlannedMeal) => {
    // @ts-ignore
    const updatedMealPlan = userProfile.mealPlan.filter(meal => meal.id !== mealToRemove.id);
    updateProfile({ mealPlan: updatedMealPlan });
    toast({ 
      title: "Meal Removed", 
      description: `${mealToRemove.recipeDetails?.name || 'Meal'} removed from your plan.` 
    });
  };

  const getPlannedMealForSlot = (mealType: MealType, slotInstance: number) => {
    const mealsOfType = dailyMeals.filter(meal => meal.mealType === mealType);
    return mealsOfType[slotInstance] || null;
  };

  const handleRecipePickerPrevious = (slotKey: string) => {
    setRecipePickerIndices(prev => ({
      ...prev,
      [slotKey]: Math.max(0, (prev[slotKey] || 0) - 1)
    }));
  };

  const handleRecipePickerNext = (slotKey: string) => {
    setRecipePickerIndices(prev => ({
      ...prev,
      [slotKey]: Math.min(availableRecipesForPicker.length - 1, (prev[slotKey] || 0) + 1)
    }));
  };

  const handleAddRecipeToSlot = (recipe: Recipe, slotConfig: any, slotInstance: number) => {
    const newMeal = {
      id: `${Date.now()}-${Math.random()}`,
      recipeId: recipe.id,
      date: formattedDate,
      mealType: slotConfig.type,
      servings: 1,
      status: 'planned'
    };
    
    // @ts-ignore
    const updatedMealPlan = [...(userProfile.mealPlan || []), newMeal];
    updateProfile({ mealPlan: updatedMealPlan });
    
    toast({
      title: "Meal Added",
      description: `${recipe.name} added to ${slotConfig.displayName || slotConfig.name} for ${format(selectedDate, 'PPP')}.`,
    });
  };

  const handleMarkMealAsEaten = (meal: PlannedMeal) => {
    // @ts-ignore
    const updatedMealPlan = userProfile.mealPlan.map(m => 
      m.id === meal.id ? { ...m, status: 'eaten' } : m
    );
    updateProfile({ mealPlan: updatedMealPlan });
    toast({
      title: "Meal Marked as Eaten",
      description: `${meal.recipeDetails?.name} marked as eaten.`,
    });
  };

  return (
    <PageWrapper title="Meal Plan">
      <div className="space-y-8">
        {/* Date Navigation */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CalendarDaysIcon className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Select Date</CardTitle>
              </div>
              <div className="flex items-center space-x-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setSelectedDate(subDays(selectedDate, 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="font-medium min-w-[140px] text-center">
                  {format(selectedDate, 'PPP')}
                </span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setSelectedDate(addDays(selectedDate, 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateChange}
              className="rounded-md border"
            />
          </CardContent>
        </Card>

        {/* Daily Macros Summary */}
        <div className="grid gap-6 md:grid-cols-1">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="font-headline text-primary">Daily Totals</CardTitle>
              <CardDescription>
                {currentMacroTargets ? 
                  "Review your planned macronutrient intake against your targets." : 
                  "Review your planned macronutrient intake. Set targets in profile for comparison."
                }
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
                      <Bar dataKey="consumed" fill="var(--color-consumed)" radius={4} barSize={25} name="Planned" />
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
                      <Bar dataKey="consumed" fill="var(--color-consumed)" radius={4} barSize={15} name="Planned" />
                      {currentMacroTargets && <Bar dataKey="target" fill="var(--color-target)" radius={4} barSize={15} name="Target" />}
                      <ChartLegend content={<ChartLegendContent />} />
                    </BarChart>
                  </ChartContainer>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Separator className="my-12"/>

        {/* Meal Planning Section */}
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

          {!isAppRecipeCacheLoading && allRecipesCache.length > 0 && availableRecipesForPicker.length === 0 && (
               <Alert variant="default" className="border-info">
                  <Info className="h-4 w-4" />
                  <AlertTitle>Recipe Limit Note</AlertTitle>
                  <AlertDescription>
                  The free tier recipe picker is limited. If the first 15 recipes in the database don't load correctly, the picker might appear empty.
                  </AlertDescription>
              </Alert>
          )}

          {!isAppRecipeCacheLoading && availableRecipesForPicker.length > 0 && mealStructureToUse.map((slotConfig, index) => {
            const slotKey = `${slotConfig.type}-${'id' in slotConfig ? slotConfig.id : index}`;
            let NthInstanceOfType = 0;
            for(let i=0; i < index; i++){
              if(mealStructureToUse[i].type === slotConfig.type) {
                  NthInstanceOfType++;
              }
            }
            const mealToDisplay = getPlannedMealForSlot(slotConfig.type, NthInstanceOfType);
            const slotName = 'name' in slotConfig ? slotConfig.name : ('displayName' in slotConfig ? slotConfig.displayName : slotConfig.type);

            return (
              <div key={slotKey} className="p-4 border rounded-lg shadow-md bg-card">
                <h3 className="text-xl font-semibold font-headline text-primary/90 mb-4">{slotName}</h3>
                {mealToDisplay ? (
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="text-lg font-semibold text-foreground">
                          {mealToDisplay.recipeDetails?.name || `Recipe ID: ${mealToDisplay.recipeId}`}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          Servings: {mealToDisplay.servings}
                        </p>
                        {mealToDisplay.recipeDetails && (
                          <div className="mt-2">
                            <MacroDisplay 
                              macros={{
                                calories: mealToDisplay.recipeDetails.macrosPerServing ? 
                                  mealToDisplay.recipeDetails.macrosPerServing.calories * mealToDisplay.servings :
                                  (mealToDisplay.recipeDetails.calories || 0) * mealToDisplay.servings,
                                protein: mealToDisplay.recipeDetails.macrosPerServing ? 
                                  mealToDisplay.recipeDetails.macrosPerServing.protein * mealToDisplay.servings :
                                  (mealToDisplay.recipeDetails.protein || 0) * mealToDisplay.servings,
                                carbs: mealToDisplay.recipeDetails.macrosPerServing ? 
                                  mealToDisplay.recipeDetails.macrosPerServing.carbs * mealToDisplay.servings :
                                  (mealToDisplay.recipeDetails.carbs || 0) * mealToDisplay.servings,
                                fat: mealToDisplay.recipeDetails.macrosPerServing ? 
                                  mealToDisplay.recipeDetails.macrosPerServing.fat * mealToDisplay.servings :
                                  (mealToDisplay.recipeDetails.fat || 0) * mealToDisplay.servings,
                              }}
                              title="Macros for this meal"
                              className="shadow-none border-none text-sm"
                            />
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col space-y-2 ml-4">
                        {mealToDisplay.status !== 'eaten' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleMarkMealAsEaten(mealToDisplay)}
                            className="text-green-600 border-green-600 hover:bg-green-50"
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Mark Eaten
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditMeal(mealToDisplay)}
                        >
                          <Edit3 className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleRemoveMeal(mealToDisplay)}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Remove
                        </Button>
                      </div>
                    </div>
                    {mealToDisplay.status === 'eaten' && (
                      <div className="flex items-center text-green-600 text-sm font-medium">
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Eaten
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-muted-foreground text-sm">No meal planned for this slot</p>
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRecipePickerPrevious(slotKey)}
                        disabled={!availableRecipesForPicker.length || (recipePickerIndices[slotKey] || 0) <= 0}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      
                      {/* REPLACED: Rich Recipe Card instead of basic text */}
                      {availableRecipesForPicker.length > 0 && (
                        <div className="flex-1">
                          <MealPlanRecipeCard
                            recipe={availableRecipesForPicker[recipePickerIndices[slotKey] || 0]}
                            onAdd={() => handleAddRecipeToSlot(
                              availableRecipesForPicker[recipePickerIndices[slotKey] || 0],
                              slotConfig,
                              NthInstanceOfType
                            )}
                          />
                        </div>
                      )}
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRecipePickerNext(slotKey)}
                        disabled={!availableRecipesForPicker.length || (recipePickerIndices[slotKey] || 0) >= availableRecipesForPicker.length - 1}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </section>

        {/* Edit Meal Dialog */}
        <Dialog open={!!editingMeal} onOpenChange={() => setEditingMeal(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Meal Servings</DialogTitle>
              <DialogDescription>
                Adjust the number of servings for {editingMeal?.recipeDetails?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="servings">Servings</Label>
                <Input
                  id="servings"
                  type="number"
                  min="0.25"
                  step="0.25"
                  value={newServings}
                  onChange={(e) => setNewServings(parseFloat(e.target.value) || 1)}
                />
              </div>
            </div>
            <EditDialogFooter>
              <Button variant="outline" onClick={() => setEditingMeal(null)}>
                Cancel
              </Button>
              <Button onClick={handleSaveServings}>
                Save Changes
              </Button>
            </EditDialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageWrapper>
  );
}
