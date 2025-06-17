
"use client";

import { useState, useEffect, useMemo } from 'react';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { RecipeCard } from '@/components/shared/RecipeCard';
import { MEAL_TYPES } from '@/lib/data'; 
import type { Recipe, MealType } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, startOfDay, addDays, isWithinInterval } from 'date-fns';
import { Calendar as CalendarIcon, Filter, Search, PlusCircle, Loader2, Info, Lock, Wheat, Milk, Shell, Fish, Egg, Peanut, TreeDeciduous, Drumstick } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

const FREE_TIER_RECIPE_DISPLAY_LIMIT = 15;

const isDateAllowedForFreeTier = (date: Date | undefined): boolean => {
  if (!date) return false;
  const today = startOfDay(new Date());
  const tomorrow = addDays(today, 1);
  return isWithinInterval(startOfDay(date), { start: today, end: tomorrow });
};

const DIETARY_PREFERENCE_TO_TAG_MAP: { [key: string]: string } = {
  "Vegetarian": "V",
  "Vegan": "VG",
  "Pescatarian": "P",
  "Gluten-Free": "GF",
  "Dairy-Free": "DF",
  "Low Carb": "LC",
  "Keto": "KETO", // Assuming a KETO tag if used
};

// Simplified allergen keywords for client-side filtering.
// For more robust allergen detection, a backend service or more comprehensive library would be better.
const ALLERGEN_KEYWORD_MAP: { [key: string]: string[] } = {
  nuts: ['nut', 'almond', 'walnut', 'pecan', 'cashew', 'pistachio', 'hazelnut', 'macadamia'], // Excludes "peanut" intentionally
  peanuts: ['peanut'],
  dairy: ['milk', 'cheese', 'butter', 'cream', 'yogurt', 'yoghurt', 'casein', 'lactose', 'whey', 'dairy'],
  eggs: ['egg', 'eggs'],
  soy: ['soy', 'soya', 'tofu', 'tempeh', 'edamame', 'miso'],
  gluten: ['gluten', 'wheat', 'barley', 'rye', 'flour', 'bread', 'pasta', 'couscous'], // Note: "flour" is broad
  fish: ['fish', 'salmon', 'tuna', 'cod', 'haddock', 'trout', 'sardine', 'anchovy'],
  shellfish: ['shellfish', 'shrimp', 'prawn', 'crab', 'lobster', 'mussel', 'oyster', 'clam'],
  sesame: ['sesame'],
  mustard: ['mustard'],
};

const containsAllergenKeyword = (text: string, keywords: string[]): boolean => {
  const lowerText = text.toLowerCase();
  return keywords.some(keyword => lowerText.includes(keyword));
};

export default function RecipesPage() {
  const { userProfile, addMealToPlan, allRecipesCache, isRecipeCacheLoading: isAppRecipeCacheLoading } = useAppContext();
  const { toast } = useToast();
  
  const [recipesToDisplay, setRecipesToDisplay] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [showAddToPlanDialog, setShowAddToPlanDialog] = useState(false);
  const [planDate, setPlanDate] = useState<Date | undefined>(new Date());
  const [planMealType, setPlanMealType] = useState<MealType | undefined>(MEAL_TYPES[0]);
  const [planServings, setPlanServings] = useState<number>(1);

  const isSubscribedActive = userProfile?.subscription_status === 'active';

  useEffect(() => {
    if (!isAppRecipeCacheLoading) {
      setIsLoading(true);
      if (allRecipesCache.length > 0) {
        setRecipesToDisplay(allRecipesCache);
        setError(null);
      } else {
        setError("No recipes found or failed to load recipes from the database.");
        setRecipesToDisplay([]);
      }
      setIsLoading(false);
    } else {
      setIsLoading(true);
    }
  }, [allRecipesCache, isAppRecipeCacheLoading]);

  const activeDietaryFilters = useMemo(() => userProfile?.dietaryPreferences || [], [userProfile?.dietaryPreferences]);
  const activeAllergenFilters = useMemo(() => userProfile?.allergens || [], [userProfile?.allergens]);

  let filteredRecipes = useMemo(() => {
    let recipes = recipesToDisplay;

    // 1. Filter by search term
    if (searchTerm.trim()) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      recipes = recipes.filter(recipe =>
        recipe.name.toLowerCase().includes(lowerSearchTerm) ||
        (recipe.description && recipe.description.toLowerCase().includes(lowerSearchTerm)) ||
        (recipe.tags && recipe.tags.some(tag => tag.toLowerCase().includes(lowerSearchTerm)))
      );
    }

    // 2. Filter by Dietary Preferences (from userProfile)
    if (activeDietaryFilters.length > 0) {
      recipes = recipes.filter(recipe => {
        if (!recipe.tags || recipe.tags.length === 0) return false;
        return activeDietaryFilters.every(preference => {
          const targetTag = DIETARY_PREFERENCE_TO_TAG_MAP[preference];
          return targetTag ? recipe.tags.includes(targetTag) : true; 
        });
      });
    }

    // 3. Filter by Allergens (from userProfile)
    if (activeAllergenFilters.length > 0) {
      recipes = recipes.filter(recipe => {
        return !activeAllergenFilters.some(allergen => {
          const keywords = ALLERGEN_KEYWORD_MAP[allergen.toLowerCase()];
          if (!keywords) return false; 
          
          if (containsAllergenKeyword(recipe.name, keywords)) return true;
          if (recipe.ingredients.some(ing => containsAllergenKeyword(ing, keywords))) return true;
          
          // Specific tag check for nuts
          if (allergen.toLowerCase() === 'nuts' && recipe.tags?.includes('N')) return true;
          // Specific tag check for gluten (GF means it's okay)
          if (allergen.toLowerCase() === 'gluten' && !recipe.tags?.includes('GF') && containsAllergenKeyword(recipe.name, keywords)) return true;


          return false;
        });
      });
    }
    return recipes;
  }, [recipesToDisplay, searchTerm, activeDietaryFilters, activeAllergenFilters]);


  const totalFilteredRecipesCount = filteredRecipes.length;
  const finalRecipesForDisplay = isSubscribedActive ? filteredRecipes : filteredRecipes.slice(0, FREE_TIER_RECIPE_DISPLAY_LIMIT);

  const handleOpenAddToPlanDialog = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setPlanServings(recipe.servings);
    setPlanDate(isSubscribedActive ? new Date() : (isDateAllowedForFreeTier(new Date()) ? new Date() : startOfDay(new Date())));
    setShowAddToPlanDialog(true);
  };

  const handleAddToMealPlan = () => {
    if (selectedRecipe && planDate && planMealType && planServings > 0) {
      if (!isSubscribedActive && !isDateAllowedForFreeTier(planDate)) {
        toast({
          title: "Date Restricted",
          description: "Free users can only plan meals for today or tomorrow. Please upgrade for more flexibility.",
          variant: 'destructive',
        });
        return;
      }
      addMealToPlan(selectedRecipe, format(planDate, 'yyyy-MM-dd'), planMealType, planServings);
      toast({
        title: "Meal Added",
        description: `${selectedRecipe.name} added to your meal plan for ${format(planDate, 'PPP')} (${planMealType}).`,
        variant: 'default',
      });
      setShowAddToPlanDialog(false);
      setSelectedRecipe(null);
    } else {
      toast({
        title: "Error",
        description: "Please fill all fields to add meal to plan.",
        variant: 'destructive',
      });
    }
  };
  
  const todayForCalendar = startOfDay(new Date());
  const tomorrowForCalendar = addDays(todayForCalendar, 1);
  const disabledCalendarMatcher = isSubscribedActive ? undefined : (date: Date) => !isWithinInterval(startOfDay(date), {start: todayForCalendar, end: tomorrowForCalendar});

  const getIconForPreference = (preference: string) => {
    switch (preference.toLowerCase()) {
      case 'vegetarian':
      case 'vegan':
        return <Wheat className="h-4 w-4 mr-1 text-green-600" />;
      case 'gluten-free':
        return <Drumstick className="h-4 w-4 mr-1 text-yellow-600" />; // Using Drumstick as a placeholder for "no wheat/gluten"
      default:
        return <Filter className="h-4 w-4 mr-1 text-blue-600" />;
    }
  };
  
  const getIconForAllergen = (allergen: string) => {
     switch (allergen.toLowerCase()) {
      case 'nuts':
      case 'peanuts':
        return <TreeDeciduous className="h-4 w-4 mr-1 text-orange-600" />;
      case 'dairy':
        return <Milk className="h-4 w-4 mr-1 text-blue-400" />;
      case 'eggs':
        return <Egg className="h-4 w-4 mr-1 text-yellow-500" />;
      case 'fish':
        return <Fish className="h-4 w-4 mr-1 text-sky-500" />;
       case 'shellfish':
        return <Shell className="h-4 w-4 mr-1 text-pink-500" />;
      default:
        return <Info className="h-4 w-4 mr-1 text-red-600" />;
    }
  };


  return (
    <PageWrapper title="Discover Recipes">
      <div className="mb-8 flex flex-col md:flex-row gap-4">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search recipes by name, description, or tag..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {(activeDietaryFilters.length > 0 || activeAllergenFilters.length > 0) && (
        <Card className="mb-6 bg-secondary/30 border-accent/30">
          <CardContent className="pt-4">
            <p className="text-sm text-accent font-semibold mb-2">Filters from your profile are active:</p>
            <div className="flex flex-wrap gap-2">
              {activeDietaryFilters.map(pref => (
                <Badge key={pref} variant="outline" className="border-green-600 text-green-700 bg-green-100">
                  {getIconForPreference(pref)} {pref}
                </Badge>
              ))}
              {activeAllergenFilters.map(allergen => (
                <Badge key={allergen} variant="outline" className="border-red-600 text-red-700 bg-red-100">
                  {getIconForAllergen(allergen)} Avoiding: {allergen}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {!isSubscribedActive && totalFilteredRecipesCount > FREE_TIER_RECIPE_DISPLAY_LIMIT && (
        <Alert variant="default" className="mb-6 border-accent">
          <Lock className="h-5 w-5 text-accent" />
          <AlertTitle className="text-accent">Recipe Limit Reached</AlertTitle>
          <AlertDescription>
            You are viewing {FREE_TIER_RECIPE_DISPLAY_LIMIT} of {totalFilteredRecipesCount} recipes matching your filters. 
            <Link href="/profile/subscription" className="underline hover:text-primary font-semibold"> Upgrade your plan </Link> 
            to access all recipes and features.
          </AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="flex justify-center items-center min-h-[200px]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="ml-2 text-muted-foreground">Loading recipes...</p>
        </div>
      ) : error ? (
         <Alert variant="destructive">
            <Info className="h-4 w-4" />
            <AlertTitle>Error Loading Recipes</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
      ) : finalRecipesForDisplay.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {finalRecipesForDisplay.map((recipe) => (
            <RecipeCard 
              key={recipe.id} 
              recipe={recipe} 
              onAddToMealPlan={handleOpenAddToPlanDialog}
              showAddToMealPlanButton={true}
              showViewDetailsButton={true}
            />
          ))}
        </div>
      ) : (
        <p className="text-center text-muted-foreground mt-10">
          {searchTerm || activeDietaryFilters.length > 0 || activeAllergenFilters.length > 0 ? "No recipes found matching your current search and profile filters." : "No recipes available."}
        </p>
      )}

      {selectedRecipe && (
        <Dialog open={showAddToPlanDialog} onOpenChange={setShowAddToPlanDialog}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="font-headline text-primary">Add "{selectedRecipe.name}" to Meal Plan</DialogTitle>
              <DialogDescription>
                Select the date, meal type, and servings for this recipe.
                {!isSubscribedActive && " Free users can plan for today or tomorrow only."}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="date" className="text-right">Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className="col-span-3 justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {planDate ? format(planDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={planDate}
                      onSelect={setPlanDate}
                      disabled={disabledCalendarMatcher}
                      initialFocus={!isSubscribedActive}
                       fromDate={!isSubscribedActive ? todayForCalendar : undefined}
                       toDate={!isSubscribedActive ? tomorrowForCalendar : undefined}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="mealType" className="text-right">Meal Type</Label>
                <Select value={planMealType} onValueChange={(value: MealType) => setPlanMealType(value)}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select meal type" />
                  </SelectTrigger>
                  <SelectContent>
                    {MEAL_TYPES.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="servings" className="text-right">Servings</Label>
                <Input
                  id="servings"
                  type="number"
                  min="1"
                  value={planServings}
                  onChange={(e) => setPlanServings(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddToPlanDialog(false)}>Cancel</Button>
              <Button 
                onClick={handleAddToMealPlan} 
                className="bg-accent hover:bg-accent/90 text-accent-foreground"
                disabled={!isSubscribedActive && !isDateAllowedForFreeTier(planDate)}
              >
                <PlusCircle className="mr-2 h-4 w-4" /> Add to Plan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </PageWrapper>
  );
}
