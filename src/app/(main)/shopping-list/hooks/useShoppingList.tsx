import { useState, useMemo, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useOptimizedProfile, useOptimizedRecipes, useOptimizedShoppingList } from '@/hooks/useOptimizedFirestore';
import { updateShoppingListItemStatus, clearShoppingList, generateShoppingListFromMealPlan } from '@/app/(main)/profile/actions';
import { useToast } from '@/hooks/use-toast';
import type { ShoppingListItem } from '@/types';
import {
  consolidateShoppingItems,
  groupItemsByAisle,
  groupItemsByRecipe,
  calculateShoppingStats,
  sortCategoriesByAisle,
  type SimplifiedShoppingItem,
  type RecipeShoppingGroup,
  type AisleGroups,
  type ShoppingStats
} from '../utils/shopping-helpers';

export type ViewMode = 'aisle' | 'recipe';

export interface UseShoppingListReturn {
  // Data
  shoppingList: ShoppingListItem[];
  aisleItems: SimplifiedShoppingItem[];
  aisleGroups: AisleGroups;
  recipeGroups: RecipeShoppingGroup[];
  stats: ShoppingStats;
  
  // UI State
  activeView: ViewMode;
  searchQuery: string;
  selectedCategory: string;
  isLoading: boolean;
  
  // Computed
  sortedCategories: string[];
  filteredAisleItems: SimplifiedShoppingItem[];
  filteredRecipeGroups: RecipeShoppingGroup[];
  
  // Actions
  setActiveView: (view: ViewMode) => void;
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (category: string) => void;
  toggleShoppingListItem: (itemId: string) => Promise<void>;
  toggleAisleItem: (aisleItem: SimplifiedShoppingItem) => Promise<void>;
  handleClearList: () => Promise<void>;
  handleGenerateShoppingList: () => Promise<void>;
}

export function useShoppingList(): UseShoppingListReturn {
  const { user } = useAuth();
  const { profile: userProfile } = useOptimizedProfile(user?.uid);
  const { recipes: allRecipesCache } = useOptimizedRecipes(user?.uid);
  const { shoppingList, loading: shoppingListLoading } = useOptimizedShoppingList(user?.uid);
  const { toast } = useToast();
  
  // UI State
  const [activeView, setActiveView] = useState<ViewMode>('aisle');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  const isLoading = shoppingListLoading;
  
  // Computed data for Aisle View
  const aisleItems = useMemo(() => 
    consolidateShoppingItems(shoppingList), 
    [shoppingList]
  );
  
  const aisleGroups = useMemo(() => 
    groupItemsByAisle(aisleItems), 
    [aisleItems]
  );
  
  // Computed data for Recipe View
  const recipeGroups = useMemo(() => 
    groupItemsByRecipe(shoppingList), 
    [shoppingList]
  );
  
  // Statistics
  const stats = useMemo(() => 
    calculateShoppingStats(shoppingList, recipeGroups),
    [shoppingList, recipeGroups]
  );
  
  // Sorted categories for better shopping flow
  const sortedCategories = useMemo(() => {
    const categories = Object.keys(aisleGroups);
    return sortCategoriesByAisle(categories as any);
  }, [aisleGroups]);
  
  // Filtered data based on search and category
  const filteredAisleItems = useMemo(() => {
    let filtered = aisleItems;
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(query)
      );
    }
    
    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }
    
    return filtered;
  }, [aisleItems, searchQuery, selectedCategory]);
  
  const filteredRecipeGroups = useMemo(() => {
    if (!searchQuery.trim()) return recipeGroups;
    
    const query = searchQuery.toLowerCase();
    return recipeGroups.filter(group => 
      group.recipeName.toLowerCase().includes(query) ||
      group.ingredients.some(ingredient => 
        ingredient.name.toLowerCase().includes(query)
      )
    );
  }, [recipeGroups, searchQuery]);
  
  // Actions
  const toggleShoppingListItem = useCallback(async (itemId: string) => {
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
  }, [user, shoppingList, toast]);
  
  const toggleAisleItem = useCallback(async (aisleItem: SimplifiedShoppingItem) => {
    // Toggle all original items that make up this aisle item
    const promises = aisleItem.originalItems.map(originalItem => 
      toggleShoppingListItem(originalItem.id)
    );
    
    await Promise.all(promises);
  }, [toggleShoppingListItem]);
  
  const handleClearList = useCallback(async () => {
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
  }, [user, toast]);
  
  const handleGenerateShoppingList = useCallback(async () => {
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
  }, [user, toast]);
  
  return {
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
  };
}