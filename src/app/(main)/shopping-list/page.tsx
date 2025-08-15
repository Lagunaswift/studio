"use client";

import { PageWrapper } from '@/components/layout/PageWrapper';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { ShoppingCart, Trash2, RefreshCw, AlertCircle } from 'lucide-react';
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

// Import our modular components
import { useShoppingList } from './hooks/useShoppingList';
import { ShoppingStatsComponent } from './components/ShoppingStats';
import { ShoppingFilters } from './components/ShoppingFilters';
import { AisleView } from './components/AisleView';
import { RecipeView } from './components/RecipeView';

export default function ShoppingListPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Use our custom hook for all shopping list logic
  const {
    // Data
    shoppingList,
    aisleItems,
    aisleGroups,
    recipeGroups,
    stats,
    
    // UI State
    activeView,
    searchQuery,
    selectedCategory,
    isLoading,
    
    // Computed
    sortedCategories,
    filteredAisleItems,
    filteredRecipeGroups,
    
    // Actions
    setActiveView,
    setSearchQuery,
    setSelectedCategory,
    toggleShoppingListItem,
    toggleAisleItem,
    handleClearList,
    handleGenerateShoppingList,
  } = useShoppingList();

  // Loading state
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

  const totalItems = shoppingList.length;
  const purchasedItems = shoppingList.filter(item => item.purchased).length;
  const filteredItemsCount = activeView === 'aisle' 
    ? filteredAisleItems.length 
    : filteredRecipeGroups.reduce((sum, group) => sum + group.ingredients.length, 0);

  return (
    <PageWrapper title="Your Shopping List">
      <div className="space-y-6">
        {/* Header Card */}
        <Card className="shadow-xl">
          <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <div className="flex-1 min-w-0">
              <CardTitle className="font-headline text-primary flex items-center">
                <ShoppingCart className="w-6 h-6 mr-2 text-accent" />
                Grocery Shopping
                {totalItems > 0 && (
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    ({purchasedItems}/{totalItems})
                  </span>
                )}
              </CardTitle>
              <p className="text-muted-foreground mt-1">
                {totalItems > 0 
                  ? `You have ${totalItems - purchasedItems} item(s) left to buy.`
                  : "Your shopping list is currently empty. Click 'Generate from Meal Plan' to create a list from your planned meals."
                }
              </p>
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
              {totalItems > 0 && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full sm:w-auto">
                      <Trash2 className="mr-2 h-4 w-4" /> Clear List
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
        </Card>

        {/* Stats */}
        {totalItems > 0 && (
          <ShoppingStatsComponent stats={stats} />
        )}

        {/* Main Content */}
        {totalItems === 0 ? (
          // Empty state
          <Card className="text-center py-12 shadow-none border-dashed">
            <CardContent>
              <ShoppingCart className="h-16 w-16 text-primary/30 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-muted-foreground mb-2">Your List is Empty</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Add meals to your plan, then click "Generate from Meal Plan" to create your shopping list.
              </p>
              <Button 
                onClick={handleGenerateShoppingList}
                variant="default"
                size="lg"
              >
                <RefreshCw className="mr-2 h-4 w-4" /> 
                Generate from Meal Plan
              </Button>
            </CardContent>
          </Card>
        ) : (
          // Main shopping interface
          <Card className="shadow-xl">
            <CardContent className="p-6">
              {/* Filters and Search */}
              <ShoppingFilters
                activeView={activeView}
                onViewChange={setActiveView}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                selectedCategory={selectedCategory}
                onCategoryChange={setSelectedCategory}
                sortedCategories={sortedCategories}
                totalItems={totalItems}
                filteredItemsCount={filteredItemsCount}
                className="mb-6"
              />

              {/* Content Views */}
              <div className="mt-6">
                {activeView === 'aisle' ? (
                  <AisleView
                    aisleGroups={aisleGroups}
                    filteredAisleItems={filteredAisleItems}
                    sortedCategories={sortedCategories}
                    onToggleItem={toggleAisleItem}
                  />
                ) : (
                  <RecipeView
                    recipeGroups={recipeGroups}
                    filteredRecipeGroups={filteredRecipeGroups}
                    onToggleItem={toggleShoppingListItem}
                  />
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Safety Alert */}
        <Alert className="border-accent">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle className="font-semibold text-accent">Safety Reminder</AlertTitle>
          <AlertDescription>
            Brands and ingredients can vary by location and change over time. Please double-check all product labels carefully for allergens before you buy.
          </AlertDescription>
        </Alert>
      </div>
    </PageWrapper>
  );
}