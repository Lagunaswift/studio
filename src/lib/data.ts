import type { PlannedMeal, Recipe, PantryItem, ShoppingListItem, UKSupermarketCategory, Macros, MealType, DailyWeightLog, Sex, RDA } from '@/types';
import { RecipeSchema, UserProfileSettingsSchema } from '@/types'; // Import the Zod schema
import { getAllRecipes as getAllRecipesFromRegistry } from '@/features/recipes/recipeRegistry';

// Helper function to map registry recipes to the full Recipe type
const mapToFullRecipe = (rawRecipe: any): Recipe | null => {
  const validation = RecipeSchema.safeParse({
    ...rawRecipe,
    macrosPerServing: {
        calories: rawRecipe.calories,
        protein: rawRecipe.protein,
        carbs: rawRecipe.carbs,
        fat: rawRecipe.fat,
    },
    micronutrientsPerServing: null, // Default to null for now
  });

  if (!validation.success) {
    console.warn(`Skipping invalid raw recipe data (ID: ${rawRecipe.id}):`, validation.error.flatten().fieldErrors);
    return null;
  }
  
  const servings = typeof validation.data.servings === 'number' && validation.data.servings > 0 ? validation.data.servings : 1;
  
  return {
    ...validation.data,
    servings,
    image: validation.data.image || `https://placehold.co/600x400.png?text=${encodeURIComponent(validation.data.name)}`,
  };
};

const allRecipesCache: Recipe[] = getAllRecipesFromRegistry()
  .map(mapToFullRecipe)
  .filter((recipe): recipe is Recipe => recipe !== null);


export const MEAL_TYPES: MealType[] = ["Breakfast", "Lunch", "Dinner", "Snack"];

export const getAllRecipes = async (): Promise<Recipe[]> => {
  return Promise.resolve(allRecipesCache);
};

export const getRecipeById = async (id: number): Promise<Recipe | undefined> => {
  const foundRecipe = allRecipesCache.find(recipe => recipe.id === id);
  return Promise.resolve(foundRecipe);
};

export const calculateTotalMacros = (plannedMeals: PlannedMeal[], recipesSource?: Recipe[]): Macros => {
  const recipesToUse = recipesSource && recipesSource.length > 0 ? recipesSource : allRecipesCache;
  return plannedMeals.reduce((acc, plannedMeal) => {
    const recipe = plannedMeal.recipeDetails || recipesToUse.find(r => r.id === plannedMeal.recipeId);
    if (recipe) {
      acc.calories += recipe.macrosPerServing.calories * plannedMeal.servings;
      acc.protein += recipe.macrosPerServing.protein * plannedMeal.servings;
      acc.carbs += recipe.macrosPerServing.carbs * plannedMeal.servings;
      acc.fat += recipe.macrosPerServing.fat * plannedMeal.servings;
    }
    return acc;
  }, { protein: 0, carbs: 0, fat: 0, calories: 0 });
};


// --- START: FINALIZED SHOPPING LIST CODE ---

function unicodeFractionToNumber(str: string): number {
  const fractions: { [key: string]: number } = {
    '½': 0.5, '¼': 0.25, '¾': 0.75, '⅐': 0.142, '⅑': 0.111, '⅒': 0.1,
    '⅓': 0.333, '⅔': 0.666, '⅕': 0.2, '⅖': 0.4, '⅗': 0.6, '⅘': 0.8,
    '⅙': 0.166, '⅚': 0.833, '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875,
  };
  return fractions[str] || 0;
}

export const parseIngredientString = (ingredientString: string): { name: string; quantity: number; unit: string } => {
    if (!ingredientString) {
        return { name: 'Unknown', quantity: 0, unit: '' };
    }

    // 1. Pre-process the string for better matching
    let workingString = ingredientString.toLowerCase().trim()
        .replace(/[\u00BC-\u00BE\u2150-\u215E]/g, match => ` ${unicodeFractionToNumber(match)} `) // Handle unicode fractions
        .replace(/\b(tbsp|tsp)\./g, '$1') // Handle tbsp. tsp.
        .split(',')[0] // Take only the part before the first comma
        .trim()
        .replace(/\s+/g, ' '); // Standardize spacing

    if (workingString.includes('to taste') || workingString.includes('if needed') || workingString.includes('to serve')) {
        return { name: 'non-item', quantity: 0, unit: '' };
    }
    
    // 2. Define units and descriptors
    const unitMap: { [key: string]: string } = {
        'gram': 'g', 'grams': 'g', 'g': 'g',
        'kilogram': 'kg', 'kilograms': 'kg', 'kg': 'kg',
        'ml': 'ml', 'milliliter': 'ml', 'milliliters': 'ml',
        'l': 'l', 'liter': 'l', 'liters': 'l',
        'tsp': 'tsp', 'teaspoon': 'tsp', 'teaspoons': 'tsp',
        'tbsp': 'tbsp', 'tablespoon': 'tbsp', 'tablespoons': 'tbsp',
        'cup': 'cup', 'cups': 'cup',
        'oz': 'oz', 'ounce': 'oz', 'ounces': 'oz',
        'pinch': 'pinch', 'pinches': 'pinch',
        'handful': 'handful', 'handfuls': 'handful',
        'clove': 'clove', 'cloves': 'clove',
        'slice': 'slice', 'slices': 'slice',
        'can': 'can', 'cans': 'can',
        'small': 'small', 'medium': 'medium', 'large': 'large',
    };
    const units = Object.keys(unitMap);
    const descriptors = ['chopped', 'frozen', 'sliced', 'peeled', 'drained', 'in water', 'finely', 'minced', 'thinly', 'grated', 'natural', 'lean', 'ground', 'fresh', 'smoked', 'liquid', 'mashed', 'plant or dairy', 'peel only', 'rinsed and', 'cooked', 'cut into cubes', 'cut into pieces', 'halved', 'lightly beaten', 'packed', 'softened', 'white', 'unsalted'];

    // 3. The main parsing Regex - with word boundaries `\b` for units
    const regex = new RegExp(
        `^(\\d*\\s*\\d/\\d|\\d+\\.\\d+|\\d+)?\\s*(\\b(?:${units.join('|')})\\b)?\\s*(.*)$`
    );
    let match = workingString.match(regex);

    if (!match) {
        return { name: ingredientString.trim(), quantity: 1, unit: 'item' };
    }

    let [, quantityStr, unitStr, nameStr] = match;

    // 4. Extract and clean up parts
    let quantity: number = 1;
    if (quantityStr && quantityStr.trim()) {
        const trimmedQty = quantityStr.trim();
        if (trimmedQty.includes('/')) {
            const parts = trimmedQty.split(' ');
            quantity = parts.reduce((acc, part) => acc + eval(part), 0);
        } else {
            quantity = parseFloat(trimmedQty);
        }
    }
    
    let unit = unitStr ? unitMap[unitStr] : 'item';
    let name = nameStr.trim();
    
    // If no unit was found but the name is plural (like 'eggs'), singularize it.
    if (unit === 'item' && name.endsWith('s')) {
        name = name.slice(0, -1);
    }
    
    // Remove descriptors from the name
    const descriptorRegex = new RegExp(`\\b(${descriptors.join('|')})\\b`, 'g');
    name = name.replace(descriptorRegex, '').replace(/^of\s+/, '').trim();

    // 5. Standardize the final ingredient name for grouping
    const nameMap: { [key: string]: string } = {
        'egg': 'egg', 'potato': 'potato', 'onion': 'onion', 'zucchini': 'zucchini',
        'olive oil': 'olive oil', 'cottage cheese': 'cottage cheese',
        'watercress': 'watercress', 'lemon': 'lemon', 'soy milk': 'soy milk',
        'mixed herbs': 'mixed herbs', 'coconut oil': 'oil', 'oil': 'oil',
        'salmon': 'smoked salmon',
    };

    const standardizedName = name; // Simplified for now
   
    return {
        name: standardizedName.charAt(0).toUpperCase() + standardizedName.slice(1),
        quantity: isNaN(quantity) ? 1 : quantity,
        unit: unit
    };
};


export const generateShoppingList = (
    plannedMeals: PlannedMeal[],
    recipesSource?: Recipe[],
    pantryItems: PantryItem[] = []
): ShoppingListItem[] => {
    const ingredientMap = new Map<string, { quantity: number; unit: string; recipes: { recipeId: number; recipeName: string }[] }>();
    const recipesToUse = recipesSource && recipesSource.length > 0 ? recipesSource : allRecipesCache;

    plannedMeals.forEach(plannedMeal => {
        const recipe = recipesToUse.find(r => r.id === plannedMeal.recipeId);
        if (recipe) {
            recipe.ingredients.forEach(ingredientString => {
                const parsed = parseIngredientString(ingredientString as string);
                if (!parsed.name || parsed.quantity <= 0 || parsed.name.toLowerCase() === 'non-item') return;

                const recipeBaseServings = recipe.servings > 0 ? recipe.servings : 1;
                const quantityPerServing = parsed.quantity / recipeBaseServings;
                const totalRequired = quantityPerServing * plannedMeal.servings;

                const key = `${parsed.name.toLowerCase()}|${parsed.unit}`;
                let entry = ingredientMap.get(key);

                if (!entry) {
                    entry = { quantity: 0, unit: parsed.unit, recipes: [] };
                }

                entry.quantity += totalRequired;
                if (!entry.recipes.some(r => r.recipeId === recipe.id)) {
                    entry.recipes.push({ recipeId: recipe.id, recipeName: recipe.name });
                }
                ingredientMap.set(key, entry);
            });
        }
    });

    pantryItems.forEach(pantryItem => {
        const key = `${pantryItem.name.toLowerCase()}|${pantryItem.unit}`;
        const requiredItem = ingredientMap.get(key);
        if (requiredItem) {
            requiredItem.quantity -= pantryItem.quantity;
        }
    });
    
    const shoppingList: ShoppingListItem[] = [];
    const wholeUnitItems = ['egg', 'banana', 'apple', 'avocado', 'onion', 'tomato', 'potato', 'zucchini', 'pepper', 'lemon', 'lime'];
    
    ingredientMap.forEach((value, key) => {
        if (value.quantity <= 0) return;

        const [name, unit] = key.split('|');
        
        const isWholeUnit = wholeUnitItems.some(item => name.toLowerCase().includes(item)) && unit === 'item';
        const finalQuantity = isWholeUnit ? Math.ceil(value.quantity) : value.quantity;

        const displayQuantity = finalQuantity % 1 !== 0 && !isWholeUnit
            ? parseFloat(finalQuantity.toFixed(2))
            : Math.round(finalQuantity);

        if (displayQuantity <= 0) return;

        shoppingList.push({
            id: key,
            name: name.charAt(0).toUpperCase() + name.slice(1),
            quantity: displayQuantity,
            unit: value.unit,
            category: assignCategory(name) as UKSupermarketCategory,
            purchased: false,
            recipes: value.recipes
        });
    });

    return shoppingList.sort((a, b) => {
        if (a.category < b.category) return -1;
        if (a.category > b.category) return 1;
        return a.name.localeCompare(b.name);
    });
};

export function assignCategory(ingredientName: string): UKSupermarketCategory {
  const name = ingredientName.toLowerCase();
  const categoryMap: { [category in UKSupermarketCategory]: string[] } = {
    'Fresh Fruit & Vegetables': ['apple', 'avocado', 'banana', 'berries', 'lettuce', 'onion', 'tomato', 'peaches', 'garlic', 'radishes', 'potato', 'zucchini', 'bell pepper', 'salad leaves', 'lemon', 'spinach', 'asparagus', 'cherry tomatoes', 'dill', 'watercress', 'parsley', 'kale', 'pomegranate', 'fig', 'kiwi', 'mango', 'squash', 'pumpkin', 'beetroot', 'celery', 'cabbage', 'edamame beans', 'bok choy', 'bean sprouts', 'lemongrass', 'kaffir lime leaves', 'cucumber'],
    'Dairy, Butter & Eggs': ['butter', 'cheese', 'egg', 'milk', 'yogurt', 'parmesan', 'feta cheese', 'cottage cheese', 'soy milk', 'almond milk', 'cream cheese', 'quark', 'burrata', 'goat cheese', 'sour cream'],
    'Meat & Poultry': ['bacon', 'chicken', 'turkey', 'pork', 'beef', 'lamb', 'sausage', 'ham', 'steak', 'mince', 'ground turkey', 'ribs', 'drumsticks', 'tenderloin', 'pork shoulder', 'chicken breast', 'chicken thighs'],
    'Fish & Seafood': ['salmon', 'tuna', 'cod', 'haddock', 'mackerel', 'prawns', 'shrimp', 'scallops', 'mussels', 'fish', 'smoked salmon', 'sea bass', 'halibut', 'anchovies'],
    'Food Cupboard': ['beans', 'broth', 'cereal', 'chocolate', 'honey', 'jam', 'lentils', 'nuts', 'oil', 'olives', 'oregano', 'pasta', 'pesto', 'protein powder', 'rice', 'sauce', 'spices', 'stock', 'sugar', 'syrup', 'vanilla', 'vinegar', 'chili flakes', 'olive oil', 'lemon juice', 'chopped tomatoes', 'kidney beans', 'sweet corn', 'vegetable broth', 'mixed herbs', 'coconut oil', 'cumin', 'tinned tomatoes', 'canned tomatoes', 'tinned beans', 'canned beans', 'chickpeas', 'stock cube', 'bouillon', 'peanut butter', 'almond butter', 'cashew butter', 'oats', 'biscuits', 'crackers', 'tea', 'coffee', 'hot chocolate', 'soy sauce', 'tamari', 'ketchup', 'mayonnaise', 'mustard', 'dried fruit', 'whey powder', 'miso paste', 'tahini', 'curry paste', 'fish sauce', 'oyster sauce', 'hoisin sauce', 'ketjap manis', 'sriracha', 'sambal oelek', 'capers', 'coconut milk', 'cornflour', 'potato starch', 'baking powder', 'baking soda', 'cocoa powder', 'chocolate chips', 'dates', 'desiccated coconut', 'almond meal', 'coconut flour', 'nutritional yeast', 'vermicelli rice noodles', 'rice noodles', 'egg noodles', 'polenta', 'graham crackers', 'sun-dried tomatoes', 'dijon mustard', 'red wine vinegar', 'lime juice', 'quinoa', 'walnuts'],
    'Bakery': ['bagel', 'bread', 'croissant', 'tortilla', 'wrap', 'panko breadcrumbs'],
    'Drinks': ['coffee', 'juice', 'tea', 'water', 'coconut water', 'carrot juice'],
    'Frozen': ['frozen berries', 'ice cream', 'blueberries', 'frozen peas', 'frozen corn', 'frozen green beans', 'frozen mangoes'],
    'Other Food Items': ['cilantro', 'chives', 'basil', 'mint', 'nori sheets', 'bay leaves', 'thyme', 'rosemary', 'saffron', 'za\'atar', 'coriander']
  };

  for (const category in categoryMap) {
    if (categoryMap[category as UKSupermarketCategory].some(item => name.includes(item))) {
      return category as UKSupermarketCategory;
    }
  }
  return 'Other Food Items';
}

// --- END: FINALIZED SHOPPING LIST CODE ---

export const calculateTrendWeight = (dailyWeightLog: DailyWeightLog[]): DailyWeightLog[] => {
  if (!dailyWeightLog || dailyWeightLog.length < 7) {
    return dailyWeightLog.map(log => ({...log, trendWeightKg: undefined}));
  }

  const sorted_logs = [...dailyWeightLog].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const trend_weight_data: DailyWeightLog[] = sorted_logs.map((log, index, arr) => {
    const start = Math.max(0, index - 3);
    const end = Math.min(arr.length, index + 4);
    
    if (end - start < 4) {
      return { ...log, trendWeightKg: undefined };
    }

    const window = arr.slice(start, end);
    const sum = window.reduce((acc, current) => acc + current.weightKg, 0);
    const trend_weight = sum / window.length;

    return { ...log, trendWeightKg: parseFloat(trend_weight.toFixed(2)) };
  });

  return trend_weight_data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

export const getRdaProfile = (sex: Sex | null | undefined, age: number | null | undefined): RDA | null => {
    if (!sex || !age) {
        return null;
    }

    // Simplified RDA values for demonstration. A real app would use a more complex table.
    // Values are for adults aged 19-50.
    if (age >= 19 && age <= 50) {
        if (sex === 'male') {
            return {
                iron: 8,
                calcium: 1000,
                potassium: 3400,
                vitaminA: 900,
                vitaminC: 90,
                vitaminD: 15
            };
        } else { // female
            return {
                iron: 18,
                calcium: 1000,
                potassium: 2600,
                vitaminA: 700,
                vitaminC: 75,
                vitaminD: 15
            };
        }
    }

    // Default for other age groups for now
    return {
        iron: 10,
        calcium: 1200,
        potassium: 3000,
        vitaminA: 800,
        vitaminC: 80,
        vitaminD: 15
    };
};
