
import { type PlannedMeal, type Recipe, type ShoppingListItem, type PantryItem, type UKSupermarketCategory, UK_SUPERMARKET_CATEGORIES, type DailyWeightLog } from '@/types';
import { parse as dateParse, differenceInDays } from 'date-fns';

export const MEAL_TYPES: MealType[] = ["Breakfast", "Lunch", "Dinner", "Snack"];

export function parseIngredientString(ingredient: string): { name: string; quantity: number; unit: string } {
  // Enhanced regex to capture quantities, units, and names more robustly
  const regex = /^((\d*\.?\d+)\s*([a-zA-Z]+)?)\s+(.*)$/;
  const match = ingredient.match(regex);

  if (match) {
    const quantity = parseFloat(match[2]);
    const unit = match[3] || 'unit'; // Default to 'unit' if not specified
    const name = match[4];
    return { name, quantity, unit };
  }
  
  // Fallback for ingredients without a clear quantity-unit structure (e.g., "a pinch of salt")
  return { name: ingredient, quantity: 1, unit: 'unit' };
}

export const assignCategory = (ingredientName: string): UKSupermarketCategory => {
  const lowerCaseName = ingredientName.toLowerCase();
  
  // More specific keywords for better categorization
  const categoryKeywords: { [key in UKSupermarketCategory]: string[] } = {
    'Fresh Fruit & Vegetables': ['apple', 'banana', 'carrot', 'broccoli', 'spinach', 'onion', 'garlic', 'potato', 'tomato', 'lettuce', 'pepper'],
    'Meat & Poultry': ['chicken', 'beef', 'pork', 'lamb', 'turkey', 'mince', 'sausage', 'bacon'],
    'Fish & Seafood': ['salmon', 'tuna', 'cod', 'haddock', 'prawns', 'shrimp'],
    'Dairy, Butter & Eggs': ['milk', 'cheese', 'yogurt', 'butter', 'egg', 'cream'],
    'Bakery': ['bread', 'baguette', 'croissant', 'wrap', 'roll'],
    'Food Cupboard': ['pasta', 'rice', 'flour', 'sugar', 'oil', 'vinegar', 'soy sauce', 'ketchup', 'mayonnaise', 'canned tomatoes', 'beans', 'lentils', 'spice', 'herb', 'stock', 'bouillon'],
    'Frozen': ['frozen peas', 'frozen corn', 'ice cream', 'frozen pizza'],
    'Drinks': ['water', 'juice', 'soda', 'coffee', 'tea'],
    'Health & Beauty': [],
    'Household': [],
    'Other': []
  };

  for (const category of UK_SUPERMARKET_CATEGORIES) {
    if (categoryKeywords[category as UKSupermarketCategory]?.some(keyword => lowerCaseName.includes(keyword))) {
      return category as UKSupermarketCategory;
    }
  }

  return 'Other'; 
};

export const generateShoppingList = (
  plannedMeals: PlannedMeal[],
  allRecipes: Recipe[],
  pantryItems: PantryItem[]
): ShoppingListItem[] => {
  const requiredIngredients: { [key: string]: { quantity: number; unit: string } } = {};

  plannedMeals.forEach(meal => {
    const recipe = allRecipes.find(r => r.id === meal.recipeId);
    if (recipe) {
      recipe.ingredients.forEach(ing => {
        const key = `${ing.name.toLowerCase()}-${ing.unit}`;
        if (!requiredIngredients[key]) {
          requiredIngredients[key] = { quantity: 0, unit: ing.unit };
        }
        requiredIngredients[key].quantity += ing.quantity * meal.servings;
      });
    }
  });

  const shoppingList: ShoppingListItem[] = [];
  Object.keys(requiredIngredients).forEach(key => {
    const [name, unit] = key.split('-');
    const required = requiredIngredients[key];
    const pantryItem = pantryItems.find(p => p.name.toLowerCase() === name && p.unit === unit);
    
    const neededQuantity = required.quantity - (pantryItem?.quantity || 0);

    if (neededQuantity > 0) {
      shoppingList.push({
        id: `shop-${name}-${unit}`,
        name: name.charAt(0).toUpperCase() + name.slice(1),
        quantity: neededQuantity,
        unit: required.unit,
        category: assignCategory(name),
        completed: false,
      });
    }
  });

  return shoppingList;
};

export const calculateTotalMacros = (plannedMeals: PlannedMeal[], allRecipes: Recipe[]): Macros => {
  if (!allRecipes || allRecipes.length === 0) {
    return { protein: 0, carbs: 0, fat: 0, calories: 0 };
  }
  
  return plannedMeals.reduce((acc, plannedMeal) => {
    const recipe = plannedMeal.recipeDetails || allRecipes.find(r => r.id === plannedMeal.recipeId);
    
    if (recipe && recipe.macrosPerServing) {
      acc.calories += (recipe.macrosPerServing.calories || 0) * plannedMeal.servings;
      acc.protein += (recipe.macrosPerServing.protein || 0) * plannedMeal.servings;
      acc.carbs += (recipe.macrosPerServing.carbs || 0) * plannedMeal.servings;
      acc.fat += (recipe.macrosPerServing.fat || 0) * plannedMeal.servings;
    } else {
      console.warn('Recipe missing macrosPerServing data:', recipe?.name || 'Unknown recipe');
    }
    
    return acc;
  }, { protein: 0, carbs: 0, fat: 0, calories: 0 });
};


export function calculateTrendWeight(weightLogs: DailyWeightLog[]): DailyWeightLog[] {
  if (!weightLogs || weightLogs.length === 0) return [];
  
  const sortedLogs = [...weightLogs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  // If there's only one log, trend weight is the weight itself.
  if (sortedLogs.length === 1) {
    return [{ ...sortedLogs[0], trendWeightKg: sortedLogs[0].weightKg }];
  }

  // Simple moving average for demonstration - a more robust solution would use exponential smoothing
  const windowSize = 7;
  const trendWeightLogs: DailyWeightLog[] = sortedLogs.map((log, index, logs) => {
    const start = Math.max(0, index - windowSize + 1);
    const end = index + 1;
    const window = logs.slice(start, end);
    const avgWeight = window.reduce((sum, current) => sum + current.weightKg, 0) / window.length;
    return { ...log, trendWeightKg: parseFloat(avgWeight.toFixed(2)) };
  });

  return trendWeightLogs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
