"use client";

import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { getRecipeById, MEAL_TYPES } from '@/lib/data';
import type { Recipe as RecipeType, MealType } from '@/types';
import { MacroDisplay } from '@/components/shared/MacroDisplay';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Clock, Users, Utensils, ListChecks, Calendar as CalendarIcon, PlusCircle, ArrowLeft } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';

export default function RecipeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === 'string' ? params.id : '';
  const recipe = getRecipeById(id);

  const { addMealToPlan } = useAppContext();
  const { toast } = useToast();
  const [showAddToPlanDialog, setShowAddToPlanDialog] = useState(false);
  const [planDate, setPlanDate] = useState<Date | undefined>(new Date());
  const [planMealType, setPlanMealType] = useState<MealType | undefined>(MEAL_TYPES[0]);
  const [planServings, setPlanServings] = useState<number>(recipe?.servings || 1);

  const handleOpenAddToPlanDialog = () => {
    if (recipe) {
      setPlanServings(recipe.servings);
      setShowAddToPlanDialog(true);
    }
  };

  const handleAddToMealPlan = () => {
    if (recipe && planDate && planMealType && planServings > 0) {
      addMealToPlan(recipe, format(planDate, 'yyyy-MM-dd'), planMealType, planServings);
      toast({
        title: "Meal Added",
        description: `${recipe.name} added to your meal plan for ${format(planDate, 'PPP')} (${planMealType}).`,
      });
      setShowAddToPlanDialog(false);
    } else {
       toast({
        title: "Error",
        description: "Please fill all fields to add meal to plan.",
        variant: 'destructive',
      });
    }
  };

  if (!recipe) {
    return (
      <PageWrapper title="Recipe Not Found">
        <p>The recipe you are looking for does not exist.</p>
        <Button onClick={() => router.back()} variant="outline" className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
        </Button>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <Button onClick={() => router.back()} variant="outline" className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Recipes
      </Button>
      <Card className="overflow-hidden shadow-xl rounded-lg">
        <div className="relative w-full h-64 md:h-96">
          <Image
            // @ts-ignore next-line
            src={recipe['data-ai-hint'] ? `${recipe.image}?text=${recipe['data-ai-hint']}` : recipe.image}
            alt={recipe.name}
            fill
            sizes="(max-width: 768px) 100vw, 100vw"
            className="object-cover"
            priority
            // @ts-ignore next-line
            data-ai-hint={recipe['data-ai-hint'] || recipe.name.toLowerCase().split(" ").slice(0,2).join(" ")}
          />
        </div>
        <CardHeader className="p-6">
          <CardTitle className="text-3xl md:text-4xl font-bold font-headline text-primary">{recipe.name}</CardTitle>
          <p className="text-muted-foreground mt-2">{recipe.description}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge variant="secondary" className="text-sm">
              <Clock className="w-4 h-4 mr-1 text-accent" /> Prep: {recipe.prepTime}
            </Badge>
            <Badge variant="secondary" className="text-sm">
              <Clock className="w-4 h-4 mr-1 text-accent" /> Cook: {recipe.cookTime}
            </Badge>
            <Badge variant="secondary" className="text-sm">
              <Users className="w-4 h-4 mr-1 text-accent" /> Serves: {recipe.servings}
            </Badge>
          </div>
          {recipe.tags && recipe.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {recipe.tags.map(tag => (
                <Badge key={tag} variant="outline" className="text-accent border-accent">{tag}</Badge>
              ))}
            </div>
          )}
        </CardHeader>
        <CardContent className="p-6">
          <div className="mb-8">
            <MacroDisplay macros={recipe.macrosPerServing} title="Macros per Serving" />
          </div>
          
          <Button onClick={handleOpenAddToPlanDialog} size="lg" className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground mb-8">
            <PlusCircle className="mr-2 h-5 w-5" /> Add to Meal Plan
          </Button>

          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-2xl font-semibold font-headline text-primary mb-4 flex items-center">
                <ListChecks className="w-6 h-6 mr-2 text-accent" /> Ingredients
              </h3>
              <ul className="space-y-2 list-disc list-inside bg-secondary/30 p-4 rounded-md">
                {recipe.ingredients.map((ingredient, index) => (
                  <li key={index} className="text-foreground/90">
                    {ingredient.quantity} {ingredient.unit} {ingredient.name}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-2xl font-semibold font-headline text-primary mb-4 flex items-center">
                <Utensils className="w-6 h-6 mr-2 text-accent" /> Instructions
              </h3>
              <ol className="space-y-3 list-decimal list-inside">
                {recipe.instructions.map((step, index) => (
                  <li key={index} className="text-foreground/90 leading-relaxed">
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showAddToPlanDialog} onOpenChange={setShowAddToPlanDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="font-headline text-primary">Add "{recipe.name}" to Meal Plan</DialogTitle>
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
    </PageWrapper>
  );
}
