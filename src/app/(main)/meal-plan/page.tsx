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
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { 
  ChevronLeft, 
  ChevronRight, 
  Trash2, 
  Edit3, 
  PlusCircle, 
  Loader2, 
  Info, 
  CalendarDays as CalendarDaysIcon, 
  CheckCircle2,
  ChevronUp,
  ChevronDown,
  Plus,
  Minus,
  Edit,
  Target,
  // Icons for MealPlanRecipeCard
  Clock,
  Users,
  Flame,
  Beef,
  Wheat,
  Droplets
} from 'lucide-react';
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

  // Mobile-optimized MealPlanRecipeCard Component
  interface MealPlanRecipeCardProps {
    recipe: Recipe;
    onAdd: () => void;
  }

  const MealPlanRecipeCard: React.FC<MealPlanRecipeCardProps> = ({ recipe, onAdd }) => {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  // **FIXED: Helper function to get macros from individual properties**
  const getMacros = () => {
    return {
      calories: recipe.calories || 0,
      protein: recipe.protein || 0,
      carbs: recipe.carbs || 0,
      fat: recipe.fat || 0
    };
  };
  
  const macros = getMacros();
  
  // **CONSISTENT IMAGE LOADING PATTERN**
  const getImageSrc = () => {
    if (imageError) {
      return '/placeholder-recipe.jpg';
    }
    return `/images/${recipe.id}.jpg`;
  };
  
  const handleImageError = () => {
    console.log(`Image not found for recipe ${recipe.id} in meal planner, falling back to placeholder`);
    setImageError(true);
  };
  
  return (
    <div className="border rounded-lg p-3 bg-card overflow-hidden">
      {/* Mobile-optimized Compact Header */}
      <div className="flex items-start gap-3 mb-3">
        {/* Recipe Image - responsive sizing with consistent loading */}
        <div className="w-32 h-32 sm:w-20 sm:h-20 rounded overflow-hidden bg-muted flex-shrink-0">
          <Image 
            src={getImageSrc()}
            alt={recipe.name}
            width={128}
            height={128}
            className="w-full h-full object-cover"
            onError={handleImageError}
            sizes="(max-width: 640px) 128px, 80px"
            priority={false}
            placeholder="blur"
            blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx4f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
          />
        </div>
          
        {/* Recipe Info with proper truncation */}
        <div className="flex-1 min-w-0 space-y-2">
          <div>
            <h4 
              className="font-medium text-sm sm:text-base leading-tight text-primary mb-1 break-words"
              style={{
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                wordBreak: 'break-word',
                hyphens: 'auto'
              }}
              title={recipe.name}
            >
              {recipe.name}
            </h4>
            
            {/* FIXED: Mobile-friendly quick stats with individual macro properties */}
            <div className="flex items-center gap-2 sm:gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3 shrink-0" />
                <span className="truncate">{recipe.prepTime}</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="w-3 h-3 shrink-0" />
                <span className="truncate">{recipe.servings}</span>
              </div>
              <div className="flex items-center gap-1">
                <Flame className="w-3 h-3 shrink-0" />
                <span className="truncate">{macros.calories} cal</span>
              </div>
            </div>
          </div>
          
          {/* Add button - touch-friendly */}
          <Button 
            onClick={onAdd} 
            className="w-full h-8 text-xs sm:text-sm bg-accent hover:bg-accent/90"
          >
            <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
            Add
          </Button>
        </div>
      </div>

      {/* FIXED: Mobile-friendly macros display using individual properties */}
      {(macros.calories > 0 || macros.protein > 0 || macros.carbs > 0 || macros.fat > 0) && (
        <div className="grid grid-cols-4 gap-1 sm:gap-2 text-center text-xs mb-3 overflow-hidden">
          <div className="min-w-0">
            <Flame className="w-3 h-3 mx-auto text-orange-500 mb-1" />
            <div className="font-medium truncate">
              {macros.calories.toFixed(0)}
            </div>
            <div className="text-muted-foreground truncate">kcal</div>
          </div>
          <div className="min-w-0">
            <Beef className="w-3 h-3 mx-auto text-red-500 mb-1" />
            <div className="font-medium truncate">
              {macros.protein.toFixed(0)}g
            </div>
            <div className="text-muted-foreground truncate">protein</div>
          </div>
          <div className="min-w-0">
            <Wheat className="w-3 h-3 mx-auto text-amber-500 mb-1" />
            <div className="font-medium truncate">
              {macros.carbs.toFixed(0)}g
            </div>
            <div className="text-muted-foreground truncate">carbs</div>
          </div>
          <div className="min-w-0">
            <Droplets className="w-3 h-3 mx-auto text-blue-500 mb-1" />
            <div className="font-medium truncate">
              {macros.fat.toFixed(0)}g
            </div>
            <div className="text-muted-foreground truncate">fat</div>
          </div>
        </div>
      )}
      
      {/* Mobile-optimized collapsible details */}
      <Collapsible open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <CollapsibleTrigger asChild>
          <Button 
            variant="ghost" 
            className="w-full justify-between p-2 h-8 text-xs font-medium hover:bg-muted/50"
          >
            <span>Details</span>
            {isDetailsOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="space-y-2 pt-2 border-t">
          {/* FIXED: Detailed macro breakdown using individual properties */}
          {(macros.calories > 0 || macros.protein > 0 || macros.carbs > 0 || macros.fat > 0) && (
            <div className="space-y-2">
              <h4 className="font-medium text-xs text-primary">Nutrition per serving:</h4>
              <div className="grid grid-cols-4 gap-1 text-center">
                <div className="text-xs">
                  <div className="flex items-center justify-center mb-1">
                    <Flame className="w-3 h-3 text-orange-500" />
                  </div>
                  <div className="font-medium">{macros.calories.toFixed(0)}</div>
                  <div className="text-muted-foreground">cal</div>
                </div>
                <div className="text-xs">
                  <div className="flex items-center justify-center mb-1">
                    <Beef className="w-3 h-3 text-red-500" />
                  </div>
                  <div className="font-medium">{macros.protein.toFixed(0)}g</div>
                  <div className="text-muted-foreground">protein</div>
                </div>
                <div className="text-xs">
                  <div className="flex items-center justify-center mb-1">
                    <Wheat className="w-3 h-3 text-amber-500" />
                  </div>
                  <div className="font-medium">{macros.carbs.toFixed(0)}g</div>
                  <div className="text-muted-foreground">carbs</div>
                </div>
                <div className="text-xs">
                  <div className="flex items-center justify-center mb-1">
                    <Droplets className="w-3 h-3 text-blue-500" />
                  </div>
                  <div className="font-medium">{macros.fat.toFixed(0)}g</div>
                  <div className="text-muted-foreground">fat</div>
                </div>
              </div>
            </div>
          )}
          
          {/* Timing & Servings - mobile layout */}
          <div className="text-xs space-y-1">
            <div className="flex justify-between">
              <span className="truncate">Prep:</span>
              <span className="shrink-0 ml-2">{recipe.prepTime}</span>
            </div>
            <div className="flex justify-between">
              <span className="truncate">Cook:</span>
              <span className="shrink-0 ml-2">{recipe.cookTime}</span>
            </div>
            <div className="flex justify-between">
              <span className="truncate">Servings:</span>
              <span className="shrink-0 ml-2">{recipe.servings}</span>
            </div>
          </div>
          
          {/* Description */}
          {recipe.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">
              {recipe.description}
            </p>
          )}
          
          {/* Tags - responsive display */}
          {recipe.tags && recipe.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {recipe.tags.map(tag => (
                <Badge key={tag} variant="outline" className="text-xs px-1 py-0 truncate max-w-full">
                  <span className="truncate">{tag}</span>
                </Badge>
              ))}
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

  
  // Component functions
  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
    }
  };

  const handleAddMeal = (recipeId: string, mealType: string, mealSlotId?: string) => {
    if (!userProfile) return;

    const newMeal: PlannedMeal = {
      id: Date.now().toString(),
      recipeId: parseInt(recipeId),
      date: formattedDate,
      mealType,
      servings: 1,
      status: 'planned',
      mealSlotId,
    };

    const updatedMealPlan = [...(userProfile.mealPlan || []), newMeal];
    updateProfile({ mealPlan: updatedMealPlan });
    
    toast({
      title: "Meal Added",
      description: `Recipe added to ${mealType} for ${format(selectedDate, 'MMM do, yyyy')}.`,
    });
  };

  const handleRemoveMeal = (mealId: string) => {
    if (!userProfile) return;

    const updatedMealPlan = userProfile.mealPlan?.filter(meal => meal.id !== mealId) || [];
    updateProfile({ mealPlan: updatedMealPlan });
    
    toast({
      title: "Meal Removed",
      description: "Meal removed from your plan.",
    });
  };

  const handleEditServings = (meal: PlannedMeal) => {
    setEditingMeal(meal);
    setNewServings(meal.servings);
  };

  const saveServings = () => {
    if (!userProfile || !editingMeal) return;

    const updatedMealPlan = userProfile.mealPlan?.map(meal => 
      meal.id === editingMeal.id ? { ...meal, servings: newServings } : meal
    ) || [];
    
    updateProfile({ mealPlan: updatedMealPlan });
    setEditingMeal(null);
    
    toast({
      title: "Servings Updated",
      description: `Servings updated to ${newServings}.`,
    });
  };

  // Calculate daily macros with safety checks
  const dailyMacros = dailyMeals.reduce((acc, meal) => {
    if (!meal || typeof meal.recipeId === 'undefined' || typeof meal.servings !== 'number') {
      return acc;
    }

    const recipe = allRecipesCache.find(r => r && r.id === meal.recipeId);
    if (!recipe) return acc;

    const servings = isNaN(meal.servings) ? 0 : meal.servings;
    if (servings <= 0) return acc;

    try {
      if (recipe.macrosPerServing && typeof recipe.macrosPerServing === 'object') {
        const macros = recipe.macrosPerServing;
        acc.calories += (typeof macros.calories === 'number' ? macros.calories : 0) * servings;
        acc.protein += (typeof macros.protein === 'number' ? macros.protein : 0) * servings;
        acc.carbs += (typeof macros.carbs === 'number' ? macros.carbs : 0) * servings;
        acc.fat += (typeof macros.fat === 'number' ? macros.fat : 0) * servings;
      }
    } catch (error) {
      console.warn(`Error calculating macros for recipe ${recipe.name}:`, error);
    }

    return acc;
  }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

  const currentMacroTargets = userProfile?.macroTargets;
  
  const progressData = currentMacroTargets ? [
    {
      name: 'Calories',
      consumed: Math.round(dailyMacros.calories),
      target: currentMacroTargets.calories,
    },
    {
      name: 'Protein',
      consumed: Math.round(dailyMacros.protein),
      target: currentMacroTargets.protein,
    },
    {
      name: 'Carbs',
      consumed: Math.round(dailyMacros.carbs),
      target: currentMacroTargets.carbs,
    },
    {
      name: 'Fat',
      consumed: Math.round(dailyMacros.fat),
      target: currentMacroTargets.fat,
    },
  ] : [];

  return (
    <PageWrapper title="Meal Plan" maxWidth="max-w-7xl">
      <div className="space-y-6 sm:space-y-8">
        {/* Mobile-optimized Date Navigation */}
        <Card>
          <CardHeader className="pb-2 px-3 sm:px-6">
            <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
              <div className="flex items-center space-x-2">
                <CalendarDaysIcon className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
                <CardTitle className="text-base sm:text-lg">Select Date</CardTitle>
              </div>
              
              {/* Mobile-friendly date navigation */}
              <div className="flex items-center justify-between sm:justify-end space-x-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setSelectedDate(subDays(selectedDate, 1))}
                  className="h-8 px-2 sm:px-3"
                >
                  <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="sr-only sm:not-sr-only sm:ml-1">Prev</span>
                </Button>
                
                <span className="font-medium text-sm sm:text-base text-center px-2 min-w-0 flex-1 sm:min-w-[140px] sm:flex-none">
                  <span className="block sm:hidden">{format(selectedDate, 'MMM do')}</span>
                  <span className="hidden sm:block">{format(selectedDate, 'PPP')}</span>
                </span>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setSelectedDate(addDays(selectedDate, 1))}
                  className="h-8 px-2 sm:px-3"
                >
                  <span className="sr-only sm:not-sr-only sm:mr-1">Next</span>
                  <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="px-3 sm:px-6">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateChange}
              className="rounded-md border w-full"
            />
          </CardContent>
        </Card>

        {/* Mobile-optimized Daily Macros Summary */}
        <Card className="shadow-lg">
          <CardHeader className="px-3 sm:px-6">
            <CardTitle className="font-headline text-primary text-lg sm:text-xl">Daily Totals</CardTitle>
            <CardDescription className="text-sm">
              {currentMacroTargets ? 
                "Review your planned macronutrient intake against your targets." : 
                "Review your planned macronutrient intake. Set targets in profile for comparison."
              }
            </CardDescription>
          </CardHeader>
          
          <CardContent className="px-3 sm:px-6">
            {currentMacroTargets ? (
              <div className="space-y-4 sm:space-y-6">
                {/* Mobile-responsive chart */}
                <div className="h-48 sm:h-64 w-full">
                  <ChartContainer config={chartConfig}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={progressData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                        <XAxis 
                          dataKey="name" 
                          className="text-xs" 
                          tick={{ fontSize: 12 }}
                        />
                        <YAxis className="text-xs" tick={{ fontSize: 10 }} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="consumed" fill="var(--color-consumed)" />
                        <Bar dataKey="target" fill="var(--color-target)" opacity={0.5} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </div>

                {/* Mobile-optimized percentage display */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                  {[
                    { key: 'calories', label: 'Calories', color: 'text-red-600' },
                    { key: 'protein', label: 'Protein', color: 'text-blue-600' },
                    { key: 'carbs', label: 'Carbs', color: 'text-green-600' },
                    { key: 'fat', label: 'Fat', color: 'text-yellow-600' },
                  ].map(({ key, label, color }) => {
                    const consumed = dailyMacros[key as keyof typeof dailyMacros];
                    const target = currentMacroTargets[key as keyof typeof currentMacroTargets];
                    const percentage = target > 0 ? Math.round((consumed / target) * 100) : 0;
                    return (
                      <div key={key} className="text-center space-y-2">
                        <div className={`font-semibold text-lg sm:text-xl ${color}`}>
                          {percentage}%
                        </div>
                        <div className="text-muted-foreground text-xs sm:text-sm">{label}</div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                          <div 
                            className={`h-1.5 rounded-full transition-all duration-300 ${
                              key === 'calories' ? 'bg-red-500' :
                              key === 'protein' ? 'bg-blue-500' :
                              key === 'carbs' ? 'bg-green-500' : 'bg-yellow-500'
                            }`}
                            style={{ width: `${Math.min(percentage, 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Target className="h-8 w-8 sm:h-12 sm:w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4 text-sm sm:text-base">
                  Set your daily macro targets to start tracking your nutrition.
                </p>
                <Link href="/profile/targets">
                  <Button className="bg-accent hover:bg-accent/90 text-sm">
                    <Target className="h-4 w-4 mr-2" />
                    Set Targets Now
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Mobile-optimized Meal Slots */}
        <div className="grid gap-4 sm:gap-6">
          {mealStructureToUse.map((mealSlot, slotIndex) => {
            const mealSlotKey = 'name' in mealSlot ? 
              `${mealSlot.type}-${mealSlot.id}` : `${mealSlot.type}-${slotIndex}`;
            
            const mealSlotId = 'id' in mealSlot ? mealSlot.id : `default-${slotIndex}`;
            const displayName = 'displayName' in mealSlot ? mealSlot.displayName : 
                              ('name' in mealSlot ? mealSlot.name : mealSlot.type);

            const plannedMeal = dailyMeals.find(meal => 
              meal.mealSlotId === mealSlotId || 
              (meal.mealType === mealSlot.type && !meal.mealSlotId)
            );

            const currentPickerIndex = recipePickerIndices[mealSlotKey] || 0;
            const recipesForThisSlot = availableRecipesForPicker || [];

            return (
              <Card key={mealSlotKey} className="overflow-hidden">
                <CardHeader className="px-3 sm:px-6 pb-3">
                  <CardTitle className="text-base sm:text-lg font-headline text-primary">
                    {displayName}
                  </CardTitle>
                </CardHeader>
                
                <CardContent className="px-3 sm:px-6">
                  {plannedMeal ? (
                    <div className="space-y-3">
                      {/* Planned meal display - mobile optimized */}
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 bg-muted/30 rounded-lg">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm sm:text-base break-words leading-tight">
                            {plannedMeal.recipeDetails?.name || 'Unknown Recipe'}
                          </h4>
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            {plannedMeal.servings} serving{plannedMeal.servings !== 1 ? 's' : ''}
                          </p>
                        </div>
                        
                        {/* Action buttons - mobile stack */}
                        <div className="flex gap-2 justify-end sm:justify-start">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditServings(plannedMeal)}
                            className="h-8 px-2 text-xs"
                          >
                            <Edit className="w-3 h-3 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemoveMeal(plannedMeal.id)}
                            className="h-8 px-2 text-xs"
                          >
                            <Trash2 className="w-3 h-3 mr-1" />
                            Remove
                          </Button>
                          <Badge 
                            variant={plannedMeal.status === 'eaten' ? 'default' : 'secondary'}
                            className="text-xs px-2 py-1"
                          >
                            {plannedMeal.status === 'eaten' ? 'Eaten' : 'Planned'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Recipe picker - mobile optimized */
                    <div className="space-y-3">
                      {recipesForThisSlot.length > 0 ? (
                        <>
                          {/* Navigation controls - mobile friendly */}
                          <div className="flex items-center justify-between gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const newIndex = currentPickerIndex > 0 ? currentPickerIndex - 1 : recipesForThisSlot.length - 1;
                                setRecipePickerIndices(prev => ({ ...prev, [mealSlotKey]: newIndex }));
                              }}
                              className="h-8 px-2"
                            >
                              <ChevronLeft className="w-3 h-3" />
                            </Button>
                            
                            <span className="text-xs text-muted-foreground text-center min-w-0 flex-1">
                              {currentPickerIndex + 1} of {recipesForThisSlot.length}
                            </span>
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const newIndex = currentPickerIndex < recipesForThisSlot.length - 1 ? currentPickerIndex + 1 : 0;
                                setRecipePickerIndices(prev => ({ ...prev, [mealSlotKey]: newIndex }));
                              }}
                              className="h-8 px-2"
                            >
                              <ChevronRight className="w-3 h-3" />
                            </Button>
                          </div>

                          {/* Recipe card */}
                          {recipesForThisSlot[currentPickerIndex] && (
                            <MealPlanRecipeCard
                              recipe={recipesForThisSlot[currentPickerIndex]}
                              onAdd={() => handleAddMeal(
                                recipesForThisSlot[currentPickerIndex].id.toString(),
                                mealSlot.type,
                                mealSlotId
                              )}
                            />
                          )}
                        </>
                      ) : (
                        <div className="text-center py-6 sm:py-8 text-muted-foreground">
                          <p className="text-sm">No recipes available</p>
                          <Link href="/recipes/add">
                            <Button variant="outline" size="sm" className="mt-2 text-xs">
                              Add Recipes
                            </Button>
                          </Link>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quick Access Links - mobile optimized */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <Link href="/meal-plan/weekly" className="flex-1">
            <Button variant="outline" className="w-full h-10 text-sm">
              <CalendarDaysIcon className="w-4 h-4 mr-2" />
              Weekly View
            </Button>
          </Link>
          <Link href="/ai-suggestions" className="flex-1">
            <Button variant="outline" className="w-full h-10 text-sm">
              <Target className="w-4 h-4 mr-2" />
              AI Meal Planner
            </Button>
          </Link>
        </div>
      </div>

      {/* Edit Servings Dialog */}
      <Dialog open={!!editingMeal} onOpenChange={() => setEditingMeal(null)}>
        <DialogContent className="sm:max-w-[425px] mx-4">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Edit Servings</DialogTitle>
            <DialogDescription className="text-sm">
              Adjust the number of servings for {editingMeal?.recipeDetails?.name || 'this recipe'}.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex items-center justify-center gap-4 py-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setNewServings(Math.max(0.5, newServings - 0.5))}
              className="h-8 w-8 p-0"
            >
              <Minus className="h-4 w-4" />
            </Button>
            
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={newServings}
                onChange={(e) => setNewServings(Number(e.target.value))}
                className="w-20 text-center h-8"
                min="0.5"
                step="0.5"
              />
              <span className="text-sm text-muted-foreground">servings</span>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setNewServings(newServings + 0.5)}
              className="h-8 w-8 p-0"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          
          <EditDialogFooter className="gap-2 sm:gap-0">
            <Button 
              variant="outline" 
              onClick={() => setEditingMeal(null)}
              className="flex-1 sm:flex-none"
            >
              Cancel
            </Button>
            <Button 
              onClick={saveServings}
              className="flex-1 sm:flex-none bg-accent hover:bg-accent/90"
            >
              Save Changes
            </Button>
          </EditDialogFooter>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
