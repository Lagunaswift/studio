
"use client";

import { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { RecipeCard } from '@/components/shared/RecipeCard';
import { MEAL_TYPES, parseIngredientString } from '@/lib/data';
import type { Recipe, MealType, PantryItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { 
  Calendar as CalendarIcon, 
  Filter, 
  Search, 
  PlusCircle, 
  Loader2, 
  Info, 
  Heart, 
  Plus, 
  ChevronLeft, 
  ChevronRight,
  AlertTriangle 
} from 'lucide-react';
import { useOptimizedRecipes, useOptimizedProfile } from '@/hooks/useOptimizedFirestore';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from "@/components/ui/switch";

const DIETARY_PREFERENCE_TO_TAG_MAP: { [key: string]: string } = {
  "Vegetarian": "V", "Vegan": "VG", "Pescatarian": "P", "Gluten-Free": "GF",
  "Dairy-Free": "DF", "Low Carb": "LC", "Keto": "KETO",
};

const ALLERGEN_KEYWORD_MAP: { [key: string]: string[] } = {
  nuts: ['nut', 'almond', 'walnut', 'pecan', 'cashew', 'pistachio', 'hazelnut', 'macadamia'],
  peanuts: ['peanut'],
  dairy: ['milk', 'cheese', 'butter', 'cream', 'yogurt', 'yoghurt', 'casein', 'lactose', 'whey', 'dairy', 'feta', 'mozzarella', 'parmesan', 'ricotta', 'quark', 'burrata', 'cheddar'],
  eggs: ['egg', 'eggs', 'omelet', 'frittata', 'mayonnaise'],
  soy: ['soy', 'soya', 'tofu', 'tempeh', 'edamame', 'miso', 'tamari'],
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

function RecipesPageComponent() {
  const { user } = useAuth();
  const { profile: userProfile, updateProfile } = useOptimizedProfile(user?.uid);
  const { recipes: allRecipesCache, loading: isRecipeCacheLoading } = useOptimizedRecipes(user?.uid);

  const { toast } = useToast();
  
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchTermFromUrl = searchParams.get('q') || '';

  const [searchTerm, setSearchTerm] = useState(searchTermFromUrl);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [showAddToPlanDialog, setShowAddToPlanDialog] = useState(false);
  const [planDate, setPlanDate] = useState<Date | undefined>(new Date());
  const [planMealType, setPlanMealType] = useState<MealType | undefined>(MEAL_TYPES[0]);
  const [planServings, setPlanServings] = useState<number>(1);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [recipesPerPage, setRecipesPerPage] = useState(20);

  useEffect(() => {
    setSearchTerm(searchTermFromUrl);
  }, [searchTermFromUrl]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, recipesPerPage, showFavoritesOnly, userProfile]);

  const activeDietaryFilters = useMemo(() => userProfile?.dietaryPreferences || [], [userProfile]);
  const activeAllergenFilters = useMemo(() => userProfile?.allergens || [], [userProfile]);

  const handleSearchChange = (newSearchTerm: string) => {
    setSearchTerm(newSearchTerm);
    const params = new URLSearchParams(searchParams.toString());
    if (newSearchTerm) {
      params.set('q', newSearchTerm);
    } else {
      params.delete('q');
    }
    router.replace(`${pathname}?${params.toString()}`);
  };

  const isRecipeFavorite = useCallback((recipeId: number) => {
    return userProfile?.favorite_recipe_ids?.includes(recipeId) || false;
  }, [userProfile]);

  const filteredRecipes = useMemo(() => {
    if (isRecipeCacheLoading) return [];
    
    let recipes = allRecipesCache;

    if (searchTerm.trim()) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      recipes = recipes.filter(recipe =>
        recipe.name.toLowerCase().includes(lowerSearchTerm) ||
        (recipe.description && recipe.description.toLowerCase().includes(lowerSearchTerm)) ||
        (recipe.tags && recipe.tags.some(tag => tag.toLowerCase().includes(lowerSearchTerm)))
      );
    }

    if (activeDietaryFilters.length > 0) {
      recipes = recipes.filter(recipe =>
        activeDietaryFilters.every(preference => {
          const targetTag = DIETARY_PREFERENCE_TO_TAG_MAP[preference];
          return targetTag ? recipe.tags && recipe.tags.includes(targetTag) : true;
        })
      );
    }

    if (activeAllergenFilters.length > 0) {
      recipes = recipes.filter(recipe =>
        !activeAllergenFilters.some(allergen => {
          const keywords = ALLERGEN_KEYWORD_MAP[allergen.toLowerCase()];
          if (!keywords) return false;
          if (containsAllergenKeyword(recipe.name, keywords)) return true;
          if (recipe.ingredients && recipe.ingredients.some(ingredient => 
            containsAllergenKeyword(ingredient.name, keywords)
          )) return true;
          if (allergen.toLowerCase() === 'nuts' && recipe.tags?.includes('N')) return true;
          const isGlutenAllergen = allergen.toLowerCase() === 'gluten';
          const isDietaryGlutenFree = activeDietaryFilters.includes("Gluten-Free");
          if (isGlutenAllergen && !isDietaryGlutenFree && !recipe.tags?.includes('GF')) {
             if (containsAllergenKeyword(recipe.name, ALLERGEN_KEYWORD_MAP.gluten)) return true;
             if (recipe.ingredients && recipe.ingredients.some(ingredient => 
               containsAllergenKeyword(ingredient.name, ALLERGEN_KEYWORD_MAP.gluten)
             )) return true;
          }
          return false;
        })
      );
    }

    if (showFavoritesOnly) {
      recipes = recipes.filter(recipe => isRecipeFavorite(recipe.id));
    }
    return recipes;
  }, [allRecipesCache, searchTerm, activeDietaryFilters, activeAllergenFilters, showFavoritesOnly, isRecipeCacheLoading, isRecipeFavorite]);
  
  const finalRecipesForDisplay = useMemo(() => {
    const startIndex = (currentPage - 1) * recipesPerPage;
    const endIndex = startIndex + recipesPerPage;
    return filteredRecipes.slice(startIndex, endIndex);
  }, [filteredRecipes, currentPage, recipesPerPage]);

  const totalPages = useMemo(() => {
    return Math.ceil(filteredRecipes.length / recipesPerPage);
  }, [filteredRecipes, recipesPerPage]);
  
  const calculatePantryMatch = useCallback((recipe: Recipe, pantryItems: PantryItem[]) => {
      if (!pantryItems || pantryItems.length === 0 || !recipe.ingredients) {
        return { matched: 0, total: recipe.ingredients?.length || 0 };
      }
      
      const pantryIngredientNames = pantryItems.map(p => p.name.toLowerCase().trim());
      let matchedCount = 0;

      recipe.ingredients.forEach(ingredientObj => {
          if (!ingredientObj || !ingredientObj.name) return;
          const ingredientNameLower = ingredientObj.name.toLowerCase().trim();
          
          if (pantryIngredientNames.some(pName => 
            ingredientNameLower === pName || 
            ingredientNameLower.includes(pName) || 
            pName.includes(ingredientNameLower)
          )) {
              matchedCount++;
          }
      });

      return { matched: matchedCount, total: recipe.ingredients.length };
  }, []);

  const handleOpenAddToPlanDialog = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setPlanServings(recipe.servings);
    setPlanDate(new Date());
    setShowAddToPlanDialog(true);
  };

  const handleAddToMealPlan = () => {
    if (selectedRecipe && planDate && planMealType && planServings > 0) {
      const newMeal = {
        id: `${Date.now()}`,
        recipeId: selectedRecipe.id,
        date: format(planDate, 'yyyy-MM-dd'),
        mealType: planMealType,
        servings: planServings,
        status: 'planned'
      };
      // @ts-ignore
      const updatedMealPlan = [...(userProfile.mealPlan || []), newMeal];
      updateProfile({ mealPlan: updatedMealPlan });

      toast({
        title: "Meal Added",
        description: `${selectedRecipe.name} added to your meal plan for ${format(planDate, 'PPP')} (${planMealType}).`,
      });
      setShowAddToPlanDialog(false);
      setSelectedRecipe(null);
    } else {
      toast({ title: "Error", description: "Please fill all fields." });
    }
  };

  return (
  <PageWrapper title="Recipes">
    <div className="mb-6 text-muted-foreground">
      Browse, search, and manage your recipe collection.
    </div>

    {/* Search and Filter Section */}
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            type="text"
            placeholder="Search recipes by name, description, or tags..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex items-center space-x-2">
          <Heart className="h-4 w-4 text-red-500" />
          <Label htmlFor="favorites-only" className="text-sm font-medium">
            Favorites only
          </Label>
          <Switch
            id="favorites-only"
            checked={showFavoritesOnly}
            onCheckedChange={setShowFavoritesOnly}
          />
        </div>
      </div>

      {/* Active Filters Display */}
      {(activeDietaryFilters.length > 0 || activeAllergenFilters.length > 0) && (
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-muted-foreground">Active filters:</span>
          {activeDietaryFilters.map((filter) => (
            <Badge key={filter} variant="secondary" className="text-xs">
              {filter}
            </Badge>
          ))}
          {activeAllergenFilters.map((filter) => (
            <Badge key={filter} variant="destructive" className="text-xs">
              No {filter}
            </Badge>
          ))}
        </div>
      )}
    </div>

    {/* Add New Recipe Button */}
    <div className="flex justify-end">
      <Button asChild>
        <Link href="/recipes/add">
          <PlusCircle className="h-4 w-4 mr-2" />
          Add New Recipe
        </Link>
      </Button>
    </div>

    {/* Results Summary */}
    <div className="text-sm text-muted-foreground">
      {!isRecipeCacheLoading && (
        <>
          {filteredRecipes.length === allRecipesCache.length 
            ? `Showing all ${allRecipesCache.length} recipes`
            : `Found ${filteredRecipes.length} of ${allRecipesCache.length} recipes`
          }
          {filteredRecipes.length > recipesPerPage && (
            <span> (Page {currentPage} of {totalPages})</span>
          )}
        </>
      )}
    </div>

    {/* Recipe Display */}
    {isRecipeCacheLoading ? (
      <div className="flex justify-center items-center min-h-[200px]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Loading recipes...</p>
      </div>
    ) : finalRecipesForDisplay.length > 0 ? (
      <>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {finalRecipesForDisplay.map((recipe) => {
            const { matched, total } = calculatePantryMatch(recipe, (userProfile?.pantryItems as PantryItem[]) || []);
            const matchPercentage = total > 0 ? (matched / total) * 100 : 0;
            let pantryMatchStatus: 'make' | 'almost' | null = null;
            if (matchPercentage >= 80) {
              pantryMatchStatus = 'make';
            } else if (matchPercentage >= 50) {
              pantryMatchStatus = 'almost';
            }
            
            return (
              <div key={recipe.id} className="relative">
                <RecipeCard
                  recipe={recipe}
                  pantryMatchStatus={pantryMatchStatus}
                  onFavoriteToggle={() => {
                    const currentFavorites = userProfile?.favorite_recipe_ids || [];
                    const isFavorited = currentFavorites.includes(recipe.id);
                    const updatedFavorites = isFavorited 
                      ? currentFavorites.filter(id => id !== recipe.id)
                      : [...currentFavorites, recipe.id];
                    updateProfile({ favorite_recipe_ids: updatedFavorites });
                    
                    toast({
                      title: isFavorited ? "Removed from favorites" : "Added to favorites",
                      description: `${recipe.name} ${isFavorited ? 'removed from' : 'added to'} your favorites.`,
                    });
                  }}
                  isFavorited={isRecipeFavorite(recipe.id)}
                />
                
                {/* Add to Meal Plan Button - Positioned over the card */}
                <div className="absolute bottom-4 right-4 z-10">
                  <Button 
                    size="sm"
                    onClick={() => handleOpenAddToPlanDialog(recipe)}
                    className="bg-accent hover:bg-accent/90 text-white shadow-lg"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add to Plan
                  </Button>
                </div>
                
                {/* View Details Button - Positioned over the card */}
                <div className="absolute bottom-4 left-4 z-10">
                  <Button 
                    size="sm"
                    variant="outline"
                    asChild
                    className="bg-background/90 hover:bg-background shadow-lg"
                  >
                    <Link href={`/recipes/${recipe.id}`}>
                      <Info className="h-4 w-4 mr-1" />
                      Details
                    </Link>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <span>Recipes per page:</span>
              <Select
                value={String(recipesPerPage)}
                onValueChange={(value) => setRecipesPerPage(Number(value))}
              >
                <SelectTrigger className="w-[70px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </>
    ) : (
       <Card className="text-center py-10 shadow-none border-dashed">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-muted-foreground flex justify-center items-center">
            <Info className="h-8 w-8 text-primary/50 mr-4" /> No Recipes Found
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            {searchTerm || activeDietaryFilters.length > 0 || activeAllergenFilters.length > 0 || showFavoritesOnly 
              ? "No recipes match your current search criteria or filters. Try adjusting your search or removing some filters."
              : "You haven't added any recipes yet. Start building your recipe collection!"
            }
          </p>
          <Button asChild>
            <Link href="/recipes/add">
              <PlusCircle className="h-4 w-4 mr-2" />
              Add Your First Recipe
            </Link>
          </Button>
        </CardContent>
      </Card>
    )}

    {/* Add to Meal Plan Dialog */}
    <Dialog open={showAddToPlanDialog} onOpenChange={setShowAddToPlanDialog}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add to Meal Plan</DialogTitle>
          <DialogDescription>
            Add {selectedRecipe?.name} to your meal plan.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="plan-date">Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {planDate ? format(planDate, 'PPP') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={planDate}
                  onSelect={setPlanDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="plan-meal-type">Meal Type</Label>
            <Select
              value={planMealType}
              onValueChange={(value) => setPlanMealType(value as MealType)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select meal type" />
              </SelectTrigger>
              <SelectContent>
                {MEAL_TYPES.map((mealType) => (
                  <SelectItem key={mealType} value={mealType}>
                    {mealType}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="plan-servings">Servings</Label>
            <Input
              id="plan-servings"
              type="number"
              min="1"
              value={planServings}
              onChange={(e) => setPlanServings(parseInt(e.target.value, 10) || 1)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" onClick={handleAddToMealPlan}>
            Add to Meal Plan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </PageWrapper>
);

export default function RecipesPage() {
  return (
    <Suspense fallback={
      <PageWrapper title="Recipes">
        <div className="flex justify-center items-center min-h-[200px]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="ml-2 text-muted-foreground">Loading...</p>
        </div>
      </PageWrapper>
    }>
      <RecipesPageComponent />
    </Suspense>
  );
}
