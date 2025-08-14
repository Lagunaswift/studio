
"use client";

import { useState, useMemo } from 'react';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { useOptimizedProfile, useOptimizedRecipes, useOptimizedShoppingList } from '@/hooks/useOptimizedFirestore';
import { useAuth } from '@/context/AuthContext';
import { ShoppingListItemComponent } from '@/components/shopping/ShoppingListItemComponent';
import { updateShoppingListItemStatus, clearShoppingList, generateShoppingListFromMealPlan } from '@/app/(main)/profile/actions';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, ShoppingCart, Trash2, ListChecks, Utensils, X, RefreshCw } from 'lucide-react';
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
import type { ShoppingListItem, PlannedMeal } from '@/types';
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
  const { user } = useAuth();
  const { profile: userProfile } = useOptimizedProfile(user?.uid);
  const { recipes: allRecipesCache } = useOptimizedRecipes(user?.uid);
  const { shoppingList, loading: shoppingListLoading } = useOptimizedShoppingList(user?.uid);
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"aisle" | "recipe">("aisle");

  const isLoading = shoppingListLoading;

  const handleClearList = async () => {
    if (!user) return;
    
    try {
      const idToken = await user.getIdToken();
      const result = await clearShoppingList(idToken);
      
      if (result.success) {
        toast({
          title: "Shopping List Cleared",
          description: `Removed ${result.deletedCount} items from your shopping list.`,
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to clear shopping list",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Clear shopping list error:', error);
      toast({
        title: "Error",
        description: "Failed to clear shopping list",
        variant: "destructive",
      });
    }
  };

  const toggleShoppingListItem = async (itemId: string) => {
    if (!user) return;
    
    const item = shoppingList.find(item => item.id === itemId);
    if (!item) return;
    
    try {
      const idToken = await user.getIdToken();
      const result = await updateShoppingListItemStatus(idToken, itemId, !item.purchased);
      
      if (!result.success) {
        toast({
          title: "Error",
          description: result.error || "Failed to update item",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Toggle shopping list item error:', error);
      toast({
        title: "Error",
        description: "Failed to update item",
        variant: "destructive",
      });
    }
  }

  const handleGenerateShoppingList = async () => {
    if (!user) return;
    
    try {
      const idToken = await user.getIdToken();
      const result = await generateShoppingListFromMealPlan(idToken);
      
      if (result.success) {
        toast({
          title: "Shopping List Generated",
          description: `Generated shopping list from ${result.mealsProcessed} planned meals with ${result.itemsGenerated} ingredient types.`,
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to generate shopping list",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Generate shopping list error:', error);
      toast({
        title: "Error",
        description: "Failed to generate shopping list",
        variant: "destructive",
      });
    }
  };


  // Note: Recipe view has been simplified for the new daily meal plan structure
  // Users can now manage meals directly from the meal plan page

  const groupedListByAisle: { [category: string]: ShoppingListItem[] } = useMemo(() => {
    if (activeTab !== 'aisle') return {};
    return shoppingList.reduce((acc, item) => {
      (acc[item.category] = acc[item.category] || []).push(item);
      return acc;
    }, {} as { [category: string]: ShoppingListItem[] });
  }, [shoppingList, activeTab]);

  const categoriesByAisle = useMemo(() => Object.keys(groupedListByAisle).sort(), [groupedListByAisle]);

  // Recipe view removed for simplicity with new daily meal plan structure
  const recipeShoppingGroups: RecipeShoppingGroup[] = [];


  const purchasedCount = shoppingList.filter(item => item.purchased).length;
  const totalCount = shoppingList.length;

  if (isLoading) {
    return (
      <PageWrapper title="Your Shopping List">
        <Card className="shadow-xl">
          <CardContent className="flex justify-center items-center py-20">
            <div className="text-center">
              <ShoppingCart className="h-12 w-12 animate-pulse text-primary/50 mx-auto mb-4" />
              <p className="text-muted-foreground">Loading your shopping list...</p>
            </div>
          </CardContent>
        </Card>
      </PageWrapper>
    );
  }

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
              {totalCount > 0 ? `You have ${totalCount - purchasedCount} item(s) left to buy.` : "Your shopping list is currently empty. Click 'Generate from Meal Plan' to create a list from your planned meals."}
            </CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 mt-4 sm:mt-0">
            <Button 
              onClick={handleGenerateShoppingList}
              variant="outline"
              className="w-full sm:w-auto"
            >
              <RefreshCw className="mr-2 h-4 w-4" /> 
              Generate from Meal Plan
            </Button>
            {totalCount > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-full sm:w-auto">
                    <Trash2 className="mr-2 h-4 w-4" /> Clear Shopping List
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action will clear your entire shopping list. This cannot be undone.
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
          <div className="mb-6">
            <div className="flex items-center gap-2 p-3 bg-secondary/30 rounded-md border">
              <ListChecks className="w-4 h-4 text-primary" />
              <span className="font-medium">Shopping List by Aisle</span>
            </div>
          </div>
              {totalCount === 0 ? (
                 <Card className="text-center py-10 shadow-none border-dashed">
                    <CardHeader>
                        <CardTitle className="text-xl font-semibold text-muted-foreground flex justify-center items-center">
                            <ShoppingCart className="h-8 w-8 text-primary/50 mr-4"/> Your List is Empty
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground mb-4">Add meals to your plan, then click "Generate from Meal Plan" to create your shopping list.</p>
                        <Button 
                          onClick={handleGenerateShoppingList}
                          variant="default"
                          className="w-full sm:w-auto"
                        >
                          <RefreshCw className="mr-2 h-4 w-4" /> 
                          Generate from Meal Plan
                        </Button>
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
