
import { type PlannedMeal, type Recipe, type ShoppingListItem, type PantryItem, type UKSupermarketCategory, UK_SUPERMARKET_CATEGORIES, type DailyWeightLog } from '@/types';
import { parse as dateParse, differenceInDays } from 'date-fns';

export const MEAL_TYPES: MealType[] = ["Breakfast", "Lunch", "Dinner", "Snack"];

// Unit standardization mapping
const UNIT_NORMALIZER: { [key: string]: string } = {
  // Tablespoons
  'tbsp.': 'tablespoon', 'tbsp': 'tablespoon', 'tablespoons': 'tablespoon',
  // Teaspoons  
  'tsp.': 'teaspoon', 'tsp': 'teaspoon', 'teaspoons': 'teaspoon',
  // Items/Units
  'unit': 'item', 'units': 'items', 'pcs': 'items', 'piece': 'item', 'pieces': 'items',
  // Weights
  'g': 'grams', 'kg': 'kilograms', 'oz': 'ounces', 'lb': 'pounds', 'lbs': 'pounds',
  // Volumes
  'ml': 'milliliters', 'l': 'liters', 'fl oz': 'fluid ounces', 'cups': 'cup', 'pints': 'pint',
  // Other common units
  'pinches': 'pinch', 'Pinch': 'pinch', 'cloves': 'clove', 'leaves': 'leaf',
  // Remove periods from abbreviated units
  'cup.': 'cup', 'pint.': 'pint', 'qt.': 'quart'
};

// Ingredient name cleaning and normalization
export const normalizeIngredientName = (name: string): string => {
  if (!name) return '';
  
  let cleaned = name.toLowerCase().trim();
  
  // Handle specific problematic ingredient names
  const nameMapping: { [key: string]: string } = {
    'leaves': 'lettuce leaves',
    'whites': 'egg whites', 
    'cloves': 'garlic cloves',
    'fillets': 'salmon fillets',
    'zest': 'lemon zest',
    's': 'eggs' // Common parsing artifact
  };
  
  if (nameMapping[cleaned]) {
    return nameMapping[cleaned];
  }
  
  // Remove descriptor prefixes
  cleaned = cleaned.replace(/^(from\s+\d+\s+|of\s+|½\s*|¼\s*|¾\s*|\d+\/\d+\s*|\/\d+\s*)/g, '');
  
  // Remove cooking instructions and descriptors
  cleaned = cleaned.replace(/\s*,\s*(peeled|chopped|diced|sliced|minced|halved|quartered|finely|thinly|roughly).*$/g, '');
  
  // Remove size descriptors but keep important ones
  cleaned = cleaned.replace(/\b(fresh|organic|free-range)\b/g, '').trim();
  
  // Clean up specific patterns
  cleaned = cleaned
    .replace(/\s+fillets?\s+\d+g\s+each.*$/, ' fillets')
    .replace(/\s+\(\d+g\).*$/, '') // Remove weight specifications
    .replace(/^[\s.]+|[\s.]+$/g, '') // Remove leading/trailing dots and spaces
    .replace(/\s+/g, ' ') // Multiple spaces to single space
    .trim();
    
  return cleaned || name.toLowerCase().trim(); // Fallback to original if cleaning resulted in empty string
};

// Smart quantity rounding for shopping
export const roundQuantityForShopping = (quantity: number, unit: string): number => {
  if (!quantity || quantity <= 0) return 0;
  
  const normalizedUnit = UNIT_NORMALIZER[unit.toLowerCase()] || unit.toLowerCase();
  
  // Whole items - always round up
  if (['item', 'items', 'whole', 'head', 'bulb', 'package', 'bottle', 'can', 'jar'].includes(normalizedUnit)) {
    return Math.ceil(quantity);
  }
  
  // Very small quantities - use more precision
  if (quantity < 1) {
    return Math.round(quantity * 100) / 100;
  }
  
  // Medium quantities - round to quarters for measurements
  if (quantity < 10) {
    return Math.round(quantity * 4) / 4;
  }
  
  // Large quantities - round to nearest whole number
  return Math.round(quantity);
};

// Normalize units for consistency
export const normalizeUnit = (unit: string): string => {
  if (!unit) return 'item';
  
  const normalized = unit.toLowerCase().trim();
  return UNIT_NORMALIZER[normalized] || normalized;
};

// Enhanced ingredient consolidation key generator
export const generateConsolidationKey = (name: string, unit: string): string => {
  const normalizedName = normalizeIngredientName(name);
  const normalizedUnit = normalizeUnit(unit);
  
  // Special consolidation rules for similar ingredients
  let consolidatedName = normalizedName;
  
  // Consolidate all egg variants
  if (normalizedName.includes('egg') && !normalizedName.includes('plant')) {
    consolidatedName = 'eggs';
  }
  
  // Consolidate onion variants
  if (normalizedName.includes('onion')) {
    if (normalizedName.includes('red')) {
      consolidatedName = 'red onions';
    } else if (normalizedName.includes('green') || normalizedName.includes('spring')) {
      consolidatedName = 'green onions';
    } else {
      consolidatedName = 'onions';
    }
  }
  
  // Consolidate tomato variants
  if (normalizedName.includes('tomato')) {
    if (normalizedName.includes('cherry')) {
      consolidatedName = 'cherry tomatoes';
    } else if (normalizedName.includes('paste') || normalizedName.includes('puree')) {
      consolidatedName = 'tomato paste';
    } else {
      consolidatedName = 'tomatoes';
    }
  }
  
  return `${consolidatedName}|${normalizedUnit}`;
};

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
  
  // Enhanced keywords for better categorization with more comprehensive coverage
  const categoryKeywords: { [key in UKSupermarketCategory]: string[] } = {
    'Fresh Fruit & Vegetables': [
      // Fruits
      'apple', 'banana', 'orange', 'lemon', 'lime', 'grape', 'strawberry', 'blueberry', 'raspberry',
      'avocado', 'mango', 'pineapple', 'kiwi', 'pear', 'peach', 'plum', 'cherry', 'melon', 'dates',
      // Vegetables
      'carrot', 'broccoli', 'spinach', 'onion', 'garlic', 'potato', 'tomato', 'lettuce', 'pepper', 
      'bell pepper', 'sweet potato', 'asparagus', 'cucumber', 'celery', 'mushroom', 'zucchini',
      'cauliflower', 'cabbage', 'kale', 'brussels sprouts', 'green beans', 'peas', 'corn',
      // Herbs and aromatics
      'basil', 'parsley', 'cilantro', 'mint', 'dill', 'rosemary', 'thyme', 'oregano', 'sage',
      'ginger', 'leek', 'shallot', 'scallion', 'green onion', 'spring onion'
    ],
    'Meat & Poultry': [
      'chicken', 'beef', 'pork', 'lamb', 'turkey', 'duck', 'mince', 'ground beef', 'ground turkey',
      'sausage', 'bacon', 'ham', 'steak', 'chop', 'fillet', 'breast', 'thigh', 'wing', 'ribs'
    ],
    'Fish & Seafood': [
      'salmon', 'tuna', 'cod', 'haddock', 'prawns', 'shrimp', 'crab', 'lobster', 'mussels', 
      'clams', 'scallops', 'mackerel', 'sardines', 'trout', 'sea bass', 'halibut'
    ],
    'Dairy, Butter & Eggs': [
      'milk', 'cheese', 'yogurt', 'butter', 'egg', 'cream', 'sour cream', 'cottage cheese',
      'cheddar', 'mozzarella', 'parmesan', 'swiss', 'goat cheese', 'feta', 'ricotta',
      'almond milk', 'oat milk', 'soy milk', 'coconut milk'
    ],
    'Bakery': [
      'bread', 'baguette', 'croissant', 'wrap', 'roll', 'bagel', 'muffin', 'pita', 'naan',
      'tortilla', 'flatbread', 'sourdough', 'whole wheat', 'rye'
    ],
    'Food Cupboard': [
      // Grains and starches
      'pasta', 'rice', 'flour', 'oat flour', 'coconut flour', 'quinoa', 'couscous', 'bulgur',
      'oats', 'barley', 'farro', 'polenta',
      // Sweeteners and basic ingredients
      'sugar', 'honey', 'maple syrup', 'agave', 'brown sugar', 'vanilla', 'vanilla extract',
      // Oils and fats
      'oil', 'olive oil', 'coconut oil', 'canola oil', 'vegetable oil', 'sesame oil',
      // Vinegars and acids
      'vinegar', 'apple cider vinegar', 'balsamic vinegar', 'white vinegar', 'lemon juice',
      // Condiments and sauces
      'soy sauce', 'worcestershire', 'hot sauce', 'sriracha', 'ketchup', 'mayonnaise', 'mustard',
      'tomato paste', 'tomato puree', 'tomato sauce',
      // Canned and preserved
      'canned tomatoes', 'beans', 'lentils', 'chickpeas', 'black beans', 'kidney beans',
      'coconut', 'desiccated coconut',
      // Spices and seasonings
      'salt', 'pepper', 'paprika', 'cumin', 'coriander', 'turmeric', 'cinnamon', 'nutmeg',
      'cardamom', 'cloves', 'allspice', 'cayenne', 'chili powder', 'garlic powder', 'onion powder',
      'dried herbs', 'bay leaves', 'red pepper flakes',
      // Baking essentials
      'baking powder', 'baking soda', 'yeast', 'cornstarch', 'gelatin',
      // Nuts and seeds
      'almonds', 'ground almonds', 'walnuts', 'pecans', 'cashews', 'peanuts', 'pine nuts',
      'chia seeds', 'flax seeds', 'sesame seeds', 'sunflower seeds', 'pumpkin seeds',
      // Nut butters
      'peanut butter', 'almond butter', 'tahini', 'sunbutter',
      // Stock and broth
      'stock', 'broth', 'bouillon', 'vegetable stock', 'chicken stock', 'beef stock',
      // Chocolate and baking
      'chocolate', 'dark chocolate', 'chocolate chips', 'cocoa powder', 'baking chocolate'
    ],
    'Frozen': [
      'frozen peas', 'frozen corn', 'frozen spinach', 'frozen berries', 'frozen fruit',
      'ice cream', 'frozen pizza', 'frozen vegetables', 'frozen meat', 'frozen fish'
    ],
    'Drinks': [
      'water', 'sparkling water', 'juice', 'orange juice', 'apple juice', 'cranberry juice',
      'soda', 'cola', 'lemonade', 'coffee', 'tea', 'green tea', 'herbal tea',
      'wine', 'beer', 'spirits', 'kombucha'
    ],
    'Health & Beauty': [],
    'Household': [],
    'Other': []
  };

  for (const category of UK_SUPERMARKET_CATEGORIES) {
    const keywords = categoryKeywords[category as UKSupermarketCategory];
    if (keywords && keywords.some(keyword => lowerCaseName.includes(keyword))) {
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
