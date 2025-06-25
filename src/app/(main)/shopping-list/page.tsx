
"use client";

import { useState, useMemo } from 'react';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { useAppContext } from '@/context/AppContext';
import { ShoppingListItemComponent } from '@/components/shopping/ShoppingListItemComponent';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, ShoppingCart, Trash2, ListChecks, Utensils } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ShoppingListItem } from '@/types';
import { parseIngredientString } from '@/lib/data';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

interface IngredientForRecipeView {
  id: string; 
  plannedMealId: string;
  recipeId: number;
  originalIngredientString: string;
  parsedName: string;
  parsedQuantity: number;
  parsedUnit: string;
  shoppingListItemId?: string; 
  purchased?: boolean;
}

interface RecipeShoppingGroup {
  plannedMealId: string;
  recipeName: string;
  recipeId: number;
  ingredients: IngredientForRecipeView[];
}

export default function ShoppingListPage() {
  const { shoppingList, toggleShoppingListItem, clearAllData, mealPlan, allRecipesCache } = useAppContext();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"aisle" | "recipe">("aisle");

  const handleClearList = () => {
    clearAllData(); 
    toast({
      title: "Shopping List Cleared",
      description: "Your shopping list and meal plan have been cleared.",
    });
  };

  const groupedListByAisle: { [category: string]: ShoppingListItem[] } = useMemo(() => {
    if (activeTab !== 'aisle') return {};
    return shoppingList.reduce((acc, item) => {
      (acc[item.category] = acc[item.category] || []).push(item);
      return acc;
    }, {} as { [category: string]: ShoppingListItem[] });
  }, [shoppingList, activeTab]);

  const categoriesByAisle = useMemo(() => Object.keys(groupedListByAisle).sort(), [groupedListByAisle]);

  const recipeShoppingGroups: RecipeShoppingGroup[] = useMemo(() => {
    if (activeTab !== 'recipe') return [];

    return mealPlan.map(pm => {
      const recipeDetails = pm.recipeDetails || allRecipesCache.find(r => r.id === pm.recipeId);
      const ingredientsForRecipeView: IngredientForRecipeView[] = [];

      if (recipeDetails) {
        recipeDetails.ingredients.forEach((ingStr, index) => {
          const parsedOriginal = parseIngredientString(ingStr);
          const quantityForThisMeal = parsedOriginal.quantity * pm.servings;
          
          let correspondingShoppingListItem = shoppingList.find(sli => 
            sli.name.toLowerCase().trim() === parsedOriginal.name.toLowerCase().trim() &&
            (sli.unit.toLowerCase() === parsedOriginal.unit.toLowerCase() || sli.recipes.some(r => r.recipeId === pm.recipeId))
          );
          
          if(!correspondingShoppingListItem){
             correspondingShoppingListItem = shoppingList.find(sli => 
                sli.name.toLowerCase().trim() === parsedOriginal.name.toLowerCase().trim() &&
                sli.recipes.some(r => r.recipeId === pm.recipeId)
            );
          }

          ingredientsForRecipeView.push({
            id: `${pm.id}-${recipeDetails.id}-${index}`,
            plannedMealId: pm.id,
            recipeId: recipeDetails.id,
            originalIngredientString: ingStr,
            parsedName: parsedOriginal.name,
            parsedQuantity: parseFloat(quantityForThisMeal.toFixed(2)),
            parsedUnit: parsedOriginal.unit,
            shoppingListItemId: correspondingShoppingListItem?.id,
            purchased: correspondingShoppingListItem?.purchased || false,
          });
        });
      }
      return {
        plannedMealId: pm.id,
        recipeName: recipeDetails?.name || "Unknown Recipe",
        recipeId: recipeDetails?.id || -1,
        ingredients: ingredientsForRecipeView,
      };
    }).filter(group => group.ingredients.length > 0);
  }, [mealPlan, shoppingList, allRecipesCache, activeTab]);


  const purchasedCount = shoppingList.filter(item => item.purchased).length;
  const totalCount = shoppingList.length;

  return (
    <PageWrapper title="Your Shopping List">
      <Card className="shadow-xl">
        <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
          <div>
            <CardTitle className="font-headline text-primary flex items-center">
              <ShoppingCart className="w-6 h-6 mr-2 text-accent" />
              Grocery Items
            </CardTitle>
            <CardDescription>
              {totalCount > 0 ? `You have ${totalCount - purchasedCount} item(s) left to buy.` : "Your shopping list is currently empty. Add meals to your plan to generate a list."}
            </CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-4 mt-4 sm:mt-0">
            {totalCount > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">
                    <Trash2 className="mr-2 h-4 w-4" /> Clear List & Plan
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action will clear your entire shopping list and meal plan. This cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleClearList} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                      Confirm Clear
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "aisle" | "recipe")} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="aisle" className="flex items-center gap-2">
                <ListChecks className="w-4 h-4" /> By Aisle
              </TabsTrigger>
              <TabsTrigger value="recipe" className="flex items-center gap-2">
                <Utensils className="w-4 h-4" /> By Recipe
              </TabsTrigger>
            </TabsList>
            <TabsContent value="aisle">
              {totalCount === 0 ? (
                 <Card className="text-center py-10 shadow-none border-dashed">
                    <CardHeader>
                        <CardTitle className="text-xl font-semibold text-muted-foreground flex justify-center items-center">
                            <ShoppingCart className="h-8 w-8 text-primary/50 mr-4"/> Your List is Empty
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">Add meals to your plan to auto-generate a shopping list.</p>
                    </CardContent>
                 </Card>
              ) : categoriesByAisle.length === 0 && totalCount > 0 ? (
                 <div className="text-center py-10 text-muted-foreground">
                    <AlertCircle className="mx-auto h-12 w-12 text-primary/50 mb-4" />
                    <p>No items match current filters or view.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {categoriesByAisle.map((category) => (
                    <div key={category}>
                      <h3 className="text-lg font-semibold text-primary mb-2 capitalize border-b border-border pb-1">
                        {category} ({groupedListByAisle[category].length})
                      </h3>
                      <div className="space-y-2">
                        {groupedListByAisle[category].map((item) => (
                          <ShoppingListItemComponent
                            key={item.id}
                            item={item}
                            onToggle={toggleShoppingListItem}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
            <TabsContent value="recipe">
              {mealPlan.length === 0 || recipeShoppingGroups.length === 0 ? (
                 <Card className="text-center py-10 shadow-none border-dashed">
                    <CardHeader>
                        <CardTitle className="text-xl font-semibold text-muted-foreground flex justify-center items-center">
                            <ShoppingCart className="h-8 w-8 text-primary/50 mr-4"/> No Planned Meals
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">Add some recipes to your meal plan first to see the ingredients here.</p>
                    </CardContent>
                 </Card>
              ) : (
                <div className="space-y-6">
                  {recipeShoppingGroups.map((group) => (
                    <div key={group.plannedMealId}>
                      <h3 className="text-lg font-semibold text-primary mb-2 capitalize border-b border-border pb-1">
                        {group.recipeName}
                      </h3>
                      <div className="space-y-2 pl-4">
                        {group.ingredients.map((ing) => (
                          <div key={ing.id} className="flex items-center space-x-3 py-1">
                            <Checkbox
                              id={ing.id}
                              checked={ing.purchased}
                              onCheckedChange={() => {
                                if (ing.shoppingListItemId) {
                                  toggleShoppingListItem(ing.shoppingListItemId);
                                } else {
                                  toast({
                                    title: "Item not on Shopping List",
                                    description: `${ing.parsedName} might be fully covered by your pantry or is part of an aggregated item. Check 'By Aisle' view.`,
                                    variant: "default"
                                  })
                                }
                              }}
                              disabled={!ing.shoppingListItemId}
                              aria-label={`Mark ${ing.parsedName} as purchased`}
                            />
                            <label
                              htmlFor={ing.id}
                              className={`text-sm ${ing.purchased && ing.shoppingListItemId ? "line-through text-muted-foreground" : "text-foreground"}`}
                            >
                              {ing.parsedQuantity.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} {ing.parsedUnit} {ing.parsedName}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
        {totalCount > 0 && (
          <CardFooter className="border-t pt-4">
            <p className="text-sm text-muted-foreground">
              {purchasedCount} of {totalCount} items purchased.
            </p>
          </CardFooter>
        )}
      </Card>
      <Alert className="mt-8 border-accent">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle className="font-semibold text-accent">Safety Reminder</AlertTitle>
        <AlertDescription>
          Brands and ingredients can vary by location and change over time. Please double-check all product labels carefully for allergens before you buy.
        </AlertDescription>
      </Alert>
    </PageWrapper>
  );
}
