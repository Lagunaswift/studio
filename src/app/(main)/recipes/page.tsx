"use client";

import { useState } from 'react';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { RecipeCard } from '@/components/shared/RecipeCard';
import { mockRecipes, MEAL_TYPES, getRecipeById } from '@/lib/data';
import type { Recipe, MealType } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Filter, Search, PlusCircle } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';

export default function RecipesPage() {
  const { addMealToPlan } = useAppContext();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [showAddToPlanDialog, setShowAddToPlanDialog] = useState(false);
  const [planDate, setPlanDate] = useState<Date | undefined>(new Date());
  const [planMealType, setPlanMealType] = useState<MealType | undefined>(MEAL_TYPES[0]);
  const [planServings, setPlanServings] = useState<number>(1);

  const filteredRecipes = mockRecipes.filter(recipe =>
    recipe.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    recipe.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (recipe.tags && recipe.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())))
  );

  const handleOpenAddToPlanDialog = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setPlanServings(recipe.servings); // Default to recipe's default servings
    setShowAddToPlanDialog(true);
  };

  const handleAddToMealPlan = () => {
    if (selectedRecipe && planDate && planMealType && planServings > 0) {
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
        {/* Future filter button */}
        {/* <Button variant="outline">
          <Filter className="mr-2 h-4 w-4" /> Filters
        </Button> */}
      </div>

      {filteredRecipes.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRecipes.map((recipe) => (
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
        <p className="text-center text-muted-foreground mt-10">No recipes found matching your criteria.</p>
      )}

      {selectedRecipe && (
        <Dialog open={showAddToPlanDialog} onOpenChange={setShowAddToPlanDialog}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="font-headline text-primary">Add "{selectedRecipe.name}" to Meal Plan</DialogTitle>
              <DialogDescription>
                Select the date, meal type, and servings for this recipe.
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
                      initialFocus
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
              <Button onClick={handleAddToMealPlan} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                <PlusCircle className="mr-2 h-4 w-4" /> Add to Plan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </PageWrapper>
  );
}
