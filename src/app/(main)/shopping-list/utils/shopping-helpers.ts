import type { ShoppingListItem, UKSupermarketCategory } from '@/types';
import { format, isToday, isTomorrow, isThisWeek } from 'date-fns';

// Smart item name extraction patterns
const MEASUREMENT_PATTERNS = [
  /^\d+(\.\d+)?\s*(g|kg|ml|l|litre|liters?|tsp|tbsp|tablespoon|teaspoon|cup|cups|oz|pound|lb|lbs)\s+/i,
  /^\d+(\.\d+)?\s+/,  // Any number at start
  /^(a\s+|an\s+)/i,   // "a" or "an" 
];

const COOKING_DESCRIPTORS = [
  'chopped', 'diced', 'sliced', 'minced', 'crushed', 'grated', 'shredded',
  'ground', 'fresh', 'dried', 'frozen', 'canned', 'jarred', 'bottled',
  'organic', 'free-range', 'grass-fed', 'raw', 'cooked', 'roasted',
  'pitted', 'peeled', 'trimmed', 'boneless', 'skinless', 'filleted',
  'whole', 'halved', 'quartered', 'extra virgin', 'virgin', 'refined',
  'unrefined', 'cold-pressed', 'smoked', 'salted', 'unsalted', 'low-fat',
  'full-fat', 'skimmed', 'semi-skimmed', 'light', 'dark'
];

const ITEM_MAPPINGS = new Map([
  // Common mappings for better shopping names
  ['ground turkey breast', 'Turkey mince'],
  ['ground chicken breast', 'Chicken mince'],
  ['ground beef', 'Beef mince'],
  ['pitted dates', 'Dates'],
  ['ground almonds', 'Almond flour'],
  ['coconut oil', 'Coconut oil'],
  ['olive oil', 'Olive oil'],
  ['sesame oil', 'Sesame oil'],
  ['soy sauce', 'Soy sauce'],
  ['dark chocolate', 'Dark chocolate'],
  ['cocoa powder', 'Cocoa powder'],
  ['chia seeds', 'Chia seeds'],
  ['breadcrumbs', 'Breadcrumbs'],
  ['chicken breast', 'Chicken breast'],
  ['roasted chicken breast', 'Chicken breast'],
]);

export interface SimplifiedShoppingItem {
  id: string;
  name: string;
  category: UKSupermarketCategory;
  recipeCount: number;
  purchased: boolean;
  originalItems: ShoppingListItem[];
  totalQuantity?: string;
  priority: 'today' | 'tomorrow' | 'later';
  bulkSuggestion?: string;
}

export interface RecipeShoppingGroup {
  recipeId: string;
  recipeName: string;
  mealType: string;
  mealDate: string;
  servings: number;
  ingredients: ShoppingListItem[];
  completedCount: number;
  totalCount: number;
  isComplete: boolean;
  priority: 'today' | 'tomorrow' | 'later';
}

export interface AisleGroups {
  [category: string]: SimplifiedShoppingItem[];
}

export interface ShoppingStats {
  totalItems: number;
  purchasedItems: number;
  completionPercentage: number;
  recipesReady: number;
  totalRecipes: number;
}

/**
 * Extract clean ingredient name from ingredient string
 */
export function extractIngredientName(ingredientString: string): string {
  let cleaned = ingredientString.toLowerCase().trim();
  
  // Remove measurements from the beginning
  for (const pattern of MEASUREMENT_PATTERNS) {
    cleaned = cleaned.replace(pattern, '');
  }
  
  // Remove cooking descriptors
  const words = cleaned.split(' ');
  const filteredWords = words.filter(word => 
    !COOKING_DESCRIPTORS.includes(word.toLowerCase())
  );
  
  cleaned = filteredWords.join(' ').trim();
  
  // Apply specific mappings
  const mapped = ITEM_MAPPINGS.get(cleaned);
  if (mapped) {
    return mapped;
  }
  
  // Capitalize first letter of each word
  return cleaned.split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Determine priority based on meal date (if available)
 */
export function getMealPriority(item: ShoppingListItem): 'today' | 'tomorrow' | 'later' {
  // For now, return 'later' as we don't have meal date context in current structure
  // This will be enhanced when meal planning integration is added
  return 'later';
}

/**
 * Get bulk buying suggestion
 */
export function getBulkBuyingSuggestion(item: SimplifiedShoppingItem): string | null {
  if (item.recipeCount >= 3) {
    return `💡 Used in ${item.recipeCount} recipes - consider buying in bulk`;
  }
  if (item.recipeCount >= 2 && ['oil', 'rice', 'pasta', 'flour'].some(bulk => 
    item.name.toLowerCase().includes(bulk))) {
    return `💡 Frequently used ingredient - bulk size may be available`;
  }
  return null;
}

/**
 * Consolidate shopping items for Aisle View
 */
export function consolidateShoppingItems(shoppingList: ShoppingListItem[]): SimplifiedShoppingItem[] {
  const itemMap = new Map<string, SimplifiedShoppingItem>();
  
  shoppingList.forEach(item => {
    const simpleName = extractIngredientName(item.name);
    const key = `${simpleName}-${item.category}`;
    
    const priority = getMealPriority(item);
    
    if (itemMap.has(key)) {
      const existing = itemMap.get(key)!;
      existing.recipeCount += (item.recipes?.length || 1);
      existing.originalItems.push(item);
      existing.purchased = existing.purchased && item.purchased;
      // Higher priority takes precedence
      if (priority === 'today' || (priority === 'tomorrow' && existing.priority === 'later')) {
        existing.priority = priority;
      }
    } else {
      const newItem: SimplifiedShoppingItem = {
        id: `simplified-${Date.now()}-${Math.random()}`,
        name: simpleName,
        category: item.category,
        recipeCount: item.recipes?.length || 1,
        purchased: item.purchased,
        originalItems: [item],
        priority
      };
      newItem.bulkSuggestion = getBulkBuyingSuggestion(newItem);
      itemMap.set(key, newItem);
    }
  });
  
  return Array.from(itemMap.values());
}

/**
 * Group simplified items by aisle/category
 */
export function groupItemsByAisle(items: SimplifiedShoppingItem[]): AisleGroups {
  const groups: AisleGroups = {};
  
  items.forEach(item => {
    if (!groups[item.category]) {
      groups[item.category] = [];
    }
    groups[item.category].push(item);
  });
  
  return groups;
}

/**
 * Group items by recipe for Recipe View
 */
export function groupItemsByRecipe(shoppingList: ShoppingListItem[]): RecipeShoppingGroup[] {
  const recipeMap = new Map<string, RecipeShoppingGroup>();
  
  shoppingList.forEach(item => {
    // For now, create mock recipe groups since we don't have full meal context
    // This will be enhanced when meal planning integration is added
    if (item.recipes && item.recipes.length > 0) {
      item.recipes.forEach(recipe => {
        const recipeKey = `${recipe.recipeId}-${recipe.recipeName}`;
        
        if (recipeMap.has(recipeKey)) {
          const existing = recipeMap.get(recipeKey)!;
          existing.ingredients.push(item);
          existing.totalCount++;
          if (item.purchased) existing.completedCount++;
        } else {
          recipeMap.set(recipeKey, {
            recipeId: recipe.recipeId.toString(),
            recipeName: recipe.recipeName,
            mealType: 'dinner', // Default for now
            mealDate: format(new Date(), 'yyyy-MM-dd'), // Today as default
            servings: 4, // Default servings
            ingredients: [item],
            completedCount: item.purchased ? 1 : 0,
            totalCount: 1,
            isComplete: false,
            priority: 'today'
          });
        }
      });
    }
  });
  
  // Calculate completion status 
  recipeMap.forEach(group => {
    group.isComplete = group.completedCount === group.totalCount;
  });
  
  return Array.from(recipeMap.values());
}

/**
 * Get aisle ordering for better shopping flow
 */
export function getAisleOrder(): Record<UKSupermarketCategory, number> {
  return {
    'Fresh Fruit & Vegetables': 1,
    'Dairy, Eggs & Chilled': 2,
    'Meat, Poultry & Fish': 3,
    'Frozen Food': 4,
    'Food Cupboard': 5,
    'Bakery': 6,
    'Drinks': 7,
    'Health & Beauty': 8,
    'Household': 9,
    'Pet Care': 10,
    'Other Food Items': 11
  };
}

/**
 * Sort categories by aisle order
 */
export function sortCategoriesByAisle(categories: UKSupermarketCategory[]): UKSupermarketCategory[] {
  const aisleOrder = getAisleOrder();
  return categories.sort((a, b) => (aisleOrder[a] || 999) - (aisleOrder[b] || 999));
}

/**
 * Calculate shopping statistics
 */
export function calculateShoppingStats(
  shoppingList: ShoppingListItem[],
  recipeGroups: RecipeShoppingGroup[]
): ShoppingStats {
  const totalItems = shoppingList.length;
  const purchasedItems = shoppingList.filter(item => item.purchased).length;
  const completionPercentage = totalItems > 0 ? Math.round((purchasedItems / totalItems) * 100) : 0;
  
  const recipesReady = recipeGroups.filter(group => group.isComplete).length;
  const totalRecipes = recipeGroups.length;
  
  return {
    totalItems,
    purchasedItems,
    completionPercentage,
    recipesReady,
    totalRecipes
  };
}

/**
 * Cross-view synchronization: sync aisle item status to original items
 */
export function syncAisleToRecipe(
  aisleItems: SimplifiedShoppingItem[],
  onToggleOriginalItem: (itemId: string) => void
): void {
  aisleItems.forEach(aisleItem => {
    aisleItem.originalItems.forEach(originalItem => {
      if (originalItem.purchased !== aisleItem.purchased) {
        onToggleOriginalItem(originalItem.id);
      }
    });
  });
}

/**
 * Calculate recipe progress
 */
export function calculateRecipeProgress(recipeId: string, items: ShoppingListItem[]): number {
  const recipeItems = items.filter(item => 
    item.recipes?.some(recipe => recipe.recipeId.toString() === recipeId)
  );
  
  if (recipeItems.length === 0) return 0;
  
  const completedItems = recipeItems.filter(item => item.purchased).length;
  return Math.round((completedItems / recipeItems.length) * 100);
}

/**
 * Format meal date for display
 */
export function formatMealDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    if (isThisWeek(date)) return format(date, 'EEEE'); // Monday, Tuesday, etc.
    return format(date, 'MMM dd'); // Jan 15
  } catch {
    return dateString;
  }
}

/**
 * Get meal type emoji
 */
export function getMealTypeEmoji(mealType: string): string {
  const mealTypeMap: Record<string, string> = {
    'breakfast': '🌅',
    'lunch': '🥪',
    'dinner': '🍽️',
    'snack': '🍪',
    'dessert': '🧁'
  };
  
  return mealTypeMap[mealType.toLowerCase()] || '🍽️';
}

/**
 * Priority badge styles
 */
export function getPriorityBadgeVariant(priority: 'today' | 'tomorrow' | 'later'): 'destructive' | 'default' | 'secondary' {
  switch (priority) {
    case 'today': return 'destructive';
    case 'tomorrow': return 'default';
    default: return 'secondary';
  }
}