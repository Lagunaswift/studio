
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

const isDateAllowedForFreeTier = (date: Date | undefined): boolean => { // This specific check can remain as it's for adding to calendar
  if (!date) return false;
  const today = startOfDay(new Date());
  const tomorrow = addDays(today, 1);
  return isWithinInterval(startOfDay(date), { start: today, end: tomorrow });
};

const DIETARY_PREFERENCE_TO_TAG_MAP: { [key: string]: string } = {
  "Vegetarian": "V",
  "Vegan": "VG",
  "Pescatarian": "P", // Assuming P tag if you have one
  "Gluten-Free": "GF",
  "Dairy-Free": "DF",
  "Low Carb": "LC", // Assuming LC tag
  "Keto": "KETO", // Assuming KETO tag
};

const ALLERGEN_KEYWORD_MAP: { [key: string]: string[] } = {
  nuts: ['nut', 'almond', 'walnut', 'pecan', 'cashew', 'pistachio', 'hazelnut', 'macadamia'],
  peanuts: ['peanut'],
  dairy: ['milk', 'cheese', 'butter', 'cream', 'yogurt', 'yoghurt', 'casein', 'lactose', 'whey', 'dairy', 'feta', 'mozzarella', 'parmesan', 'ricotta', 'quark', 'burrata', 'cheddar'],
  eggs: ['egg', 'eggs', 'omelet', 'frittata', 'mayonnaise'],
  soy: ['soy', 'soya', 'tofu', 'tempeh', 'edamame', 'miso', 'tamari'], // tamari is soy sauce
  gluten: ['gluten', 'wheat', 'barley', 'rye', 'flour', 'bread', 'pasta', 'couscous', 'panko', 'breadcrumbs', 'digestive biscuits', 'spelt'],
  fish: ['fish', 'salmon', 'tuna', 'cod', 'haddock', 'trout', 'sardine', 'anchovy', 'sea bass', 'halibut'],
  shellfish: ['shellfish', 'shrimp', 'prawn', 'crab', 'lobster', 'mussel', 'oyster', 'clam', 'calamari'],
  sesame: ['sesame', 'tahini'],
  mustard: ['mustard'],
};

const containsAllergenKeyword = (text: string, keywords: string[]): boolean => {
  if (!text || typeof text !== 'string') return false;
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

  const isSubscribedActive = true; // userProfile?.subscription_status === 'active'; // TEMPORARILY UNLOCKED FOR TESTING

  useEffect(() => {
    console.log("RecipesPage: userProfile updated in AppContext or on mount:", userProfile);
  }, [userProfile]);

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

  const activeDietaryFilters = useMemo(() => {
    return userProfile?.dietaryPreferences || [];
  }, [userProfile]); 

  const activeAllergenFilters = useMemo(() => {
    return userProfile?.allergens || [];
  }, [userProfile]); 

  const filteredRecipes = useMemo(() => {
    let recipes = recipesToDisplay;

    if (searchTerm.trim()) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      recipes = recipes.filter(recipe =>
        recipe.name.toLowerCase().includes(lowerSearchTerm) ||
        (recipe.description && recipe.description.toLowerCase().includes(lowerSearchTerm)) ||
        (recipe.tags && recipe.tags.some(tag => tag.toLowerCase().includes(lowerSearchTerm)))
      );
    }

    if (activeDietaryFilters.length > 0) {
      recipes = recipes.filter(recipe => {
        return activeDietaryFilters.every(preference => {
          const targetTag = DIETARY_PREFERENCE_TO_TAG_MAP[preference];
          if (targetTag) {
            return recipe.tags && recipe.tags.includes(targetTag);
          }
          return true; 
        });
      });
    }

    if (activeAllergenFilters.length > 0) {
      recipes = recipes.filter(recipe => {
        return !activeAllergenFilters.some(allergen => {
          const keywords = ALLERGEN_KEYWORD_MAP[allergen.toLowerCase()];
          if (!keywords) return false;

          if (containsAllergenKeyword(recipe.name, keywords)) return true;
          if (recipe.ingredients.some(ing => containsAllergenKeyword(ing, keywords))) return true;
          if (allergen.toLowerCase() === 'nuts' && recipe.tags?.includes('N')) return true;
          
          const isGlutenAllergen = allergen.toLowerCase() === 'gluten';
          const isDietaryGlutenFree = activeDietaryFilters.includes("Gluten-Free");

          if (isGlutenAllergen && !isDietaryGlutenFree && !recipe.tags?.includes('GF')) {
             if (containsAllergenKeyword(recipe.name, ALLERGEN_KEYWORD_MAP.gluten)) return true;
             if (recipe.ingredients.some(ing => containsAllergenKeyword(ing, ALLERGEN_KEYWORD_MAP.gluten))) return true;
          }


          return false;
        });
      });
    }
    return recipes;
  }, [recipesToDisplay, searchTerm, activeDietaryFilters, activeAllergenFilters]);

  const totalFilteredRecipesCount = filteredRecipes.length;
  const finalRecipesForDisplay = filteredRecipes; // TEMPORARILY UNLOCKED: isSubscribedActive ? filteredRecipes : filteredRecipes.slice(0, FREE_TIER_RECIPE_DISPLAY_LIMIT);

  const handleOpenAddToPlanDialog = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setPlanServings(recipe.servings);
    // For adding to plan, still respect date restrictions if we want to keep that part tight even during testing
    setPlanDate(isDateAllowedForFreeTier(new Date()) ? new Date() : startOfDay(new Date()));
    setShowAddToPlanDialog(true);
  };

  const handleAddToMealPlan = () => {
    if (selectedRecipe && planDate && planMealType && planServings > 0) {
      // if (!isSubscribedActive && !isDateAllowedForFreeTier(planDate)) { // Date check for adding to plan can remain stricter
      //   toast({
      //     title: "Date Restricted",
      //     description: "Free users can only plan meals for today or tomorrow. Please upgrade for more flexibility.",
      //     variant: 'destructive',
      //   });
      //   return;
      // }
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
  // Calendar for "Add to Meal Plan Dialog" still respects free tier date limits
  const disabledCalendarMatcherForDialog = isSubscribedActive ? undefined : (date: Date) => !isWithinInterval(startOfDay(date), {start: todayForCalendar, end: tomorrowForCalendar});


  const getIconForPreference = (preference: string) => {
    switch (preference.toLowerCase()) {
      case 'vegetarian':
      case 'vegan':
        return <Wheat className="h-4 w-4 mr-1 text-green-600" />;
      case 'gluten-free':
        return <Drumstick className="h-4 w-4 mr-1 text-yellow-600" />;
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
            <p className="text-xs text-muted-foreground mt-2">
              To change these filters, visit your <Link href="/profile/diet-type" className="underline">Diet Type</Link> or <Link href="/profile/allergens" className="underline">Allergens</Link> settings.
            </p>
          </CardContent>
        </Card>
      )}

      {false && !isSubscribedActive && totalFilteredRecipesCount > FREE_TIER_RECIPE_DISPLAY_LIMIT && ( // TEMPORARILY HIDE THIS WARNING
        <Alert variant="default" className="mb-6 border-accent">
          <Lock className="h-5 w-5 text-accent" />
          <AlertTitle className="text-accent">Recipe Limit Reached</AlertTitle>
          <AlertDescription>
            You are viewing {FREE_TIER_RECIPE_DISPLAY_LIMIT} of {totalFilteredRecipesCount} recipes matching your filters.
            <Link href="/profile/subscription" className="underline hover:text-primary font-semibold"> Upgrade your plan </Link>
            to access all recipes and features. (Currently showing all recipes for testing)
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
        <div className="text-center py-10">
            <Info className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mt-2">
            {searchTerm || activeDietaryFilters.length > 0 || activeAllergenFilters.length > 0 ? "No recipes found matching your current search and profile filters." : "No recipes available."}
            </p>
            {(activeDietaryFilters.length > 0 || activeAllergenFilters.length > 0) && (
                <p className="text-sm text-muted-foreground mt-2">
                    Try adjusting your <Link href="/profile/diet-type" className="underline hover:text-primary">Diet Type</Link> or <Link href="/profile/allergens" className="underline hover:text-primary">Allergens</Link> settings, or broaden your search.
                </p>
            )}
        </div>
      )}

      {selectedRecipe && (
        <Dialog open={showAddToPlanDialog} onOpenChange={setShowAddToPlanDialog}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="font-headline text-primary">Add "{selectedRecipe.name}" to Meal Plan</DialogTitle>
              <DialogDescription>
                Select the date, meal type, and servings for this recipe.
                {!isSubscribedActive && " (Full date selection unlocked for testing, usually today/tomorrow only for free tier)"}
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
                      disabled={disabledCalendarMatcherForDialog} // Use specific matcher for dialog
                      initialFocus={!isSubscribedActive}
                       fromDate={!isSubscribedActive ? todayForCalendar : undefined} // For dialog, respect original restriction logic
                       toDate={!isSubscribedActive ? tomorrowForCalendar : undefined} // For dialog, respect original restriction logic
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
                disabled={!isSubscribedActive && !isDateAllowedForFreeTier(planDate)} // Keep stricter check here if desired
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


    