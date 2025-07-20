
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

    let workingString = ingredientString.toLowerCase().trim()
        .replace(/[\u00BC-\u00BE\u2150-\u215E]/g, match => ` ${unicodeFractionToNumber(match)} `)
        .replace(/\b(tbsp|tsp|g|kg|ml|l|oz|lb)\./g, '$1') // remove periods after abbreviations
        .replace(/\((.*?)\)/g, '') // Remove parenthetical content
        .trim();

    if (workingString.includes('to taste') || workingString.includes('if needed') || workingString.includes('to serve') || workingString.includes('for garnish')) {
        return { name: 'non-item', quantity: 0, unit: '' };
    }

    const unitMap: { [key: string]: string } = {
        'gram': 'g', 'grams': 'g', 'g': 'g',
        'kilogram': 'kg', 'kilograms': 'kg', 'kg': 'kg',
        'ml': 'ml', 'milliliter': 'ml', 'milliliters': 'ml',
        'l': 'l', 'liter': 'l', 'liters': 'l',
        'tsp': 'tsp', 'teaspoon': 'tsp', 'teaspoons': 'tsp',
        'tbsp': 'tbsp', 'tablespoon': 'tbsp', 'tablespoons': 'tbsp',
        'cup': 'cup', 'cups': 'cup',
        'oz': 'oz', 'ounce': 'oz', 'ounces': 'oz',
        'lb': 'lb', 'lbs': 'lb', 'pound': 'lb', 'pounds': 'lb',
        'pinch': 'pinch', 'pinches': 'pinch',
        'handful': 'handful', 'handfuls': 'handful',
        'clove': 'clove', 'cloves': 'clove',
        'slice': 'slice', 'slices': 'slice',
        'can': 'can', 'cans': 'can',
        'stalk': 'stalk', 'stalks': 'stalk',
        'sprig': 'sprig', 'sprigs': 'sprig',
        'head': 'head', 'heads': 'head',
        'bunch': 'bunch',
        'pkt': 'packet', 'packet': 'packet',
    };
    const units = Object.keys(unitMap);
    
    const regex = new RegExp(
        `^(\\d+\\s+\\d/\\d|\\d+/\\d|\\d+\\.\\d+|\\d+)?\\s*(\\b(?:${units.join('|')})\\b)?\\s*(.*)$`
    );
    let match = workingString.match(regex);

    if (!match) {
        return { name: workingString.trim(), quantity: 1, unit: 'item' };
    }

    let [, quantityStr, unitStr, nameStr] = match;

    let quantity: number = 1;
    if (quantityStr && quantityStr.trim()) {
        const trimmedQty = quantityStr.trim();
        if (trimmedQty.includes(' ')) { // Handle mixed numbers like "1 1/2"
            const parts = trimmedQty.split(' ');
            quantity = parts.reduce((acc, part) => {
                if (part.includes('/')) {
                    const [num, den] = part.split('/');
                    return acc + (parseInt(num, 10) / parseInt(den, 10));
                }
                return acc + parseFloat(part);
            }, 0);
        } else if (trimmedQty.includes('/')) { // Handle simple fractions like "1/2"
             const [num, den] = trimmedQty.split('/');
             quantity = parseInt(num, 10) / parseInt(den, 10);
        } else {
            quantity = parseFloat(trimmedQty);
        }
    }
    
    let unit = unitStr ? unitMap[unitStr] : 'item';
    let name = nameStr.trim();

    const descriptors = ['chopped', 'diced', 'frozen', 'sliced', 'peeled', 'drained', 'in water', 'in oil', 'finely', 'minced', 'thinly', 'grated', 'natural', 'lean', 'ground', 'fresh', 'smoked', 'liquid', 'mashed', 'plant or dairy', 'peel only', 'rinsed and', 'cooked', 'cut into', 'halved', 'lightly beaten', 'packed', 'softened', 'white', 'unsalted', 'raw', 'boneless', 'skinless', 'ripe', 'large', 'medium', 'small', 'all-purpose', 'unsweetened', 'unpeeled', 'with skin on', 'bone-in', 'whole', 'all purpose', 'pitted', 'de-seeded', 'unpeeled', 'canned', 'dried', 'roasted', 'leaf', 'leaves', 'trimmed', 'ends trimmed', 'room temperature', 'cored'];
    const descriptorRegex = new RegExp(`\\b(${descriptors.join('|')})\\b`, 'gi');
    name = name.replace(descriptorRegex, '').replace(/\s*,\s*/g, ' ').replace(/^of\s+/, '').replace(/\s+/g, ' ').trim();

    const nameMap: { [key: string]: string } = {
        'eggs': 'egg', 'egg white': 'egg white', 'egg whites': 'egg white', 'egg yolk': 'egg yolk',
        'potatoes': 'potato', 'baby potatoes': 'potato', 'white potato': 'potato',
        'onions': 'onion', 'red onion': 'onion', 'yellow onion': 'onion', 'white onion': 'onion', 'spring onion': 'spring onion', 'green onion': 'green onion',
        'tomatoes': 'tomato', 'cherry tomatoes': 'tomato', 'plum tomatoes': 'tomato', 'diced tomatoes': 'tomato',
        'bell peppers': 'bell pepper', 'red bell pepper': 'bell pepper', 'green bell pepper': 'bell pepper', 'yellow bell pepper': 'bell pepper',
        'chili peppers': 'chili pepper', 'chili': 'chili pepper', 'chili pepper': 'chili pepper', 'jalapeño pepper': 'jalapeño pepper',
        'chicken breast': 'chicken breast', 'chicken breasts': 'chicken breast', 'chicken breast fillets': 'chicken breast',
        'chicken thigh': 'chicken thigh', 'chicken thighs': 'chicken thigh',
        'olive oil': 'olive oil', 'extra virgin olive oil': 'olive oil',
        'almonds': 'almond', 'slivered almonds': 'almond',
        'pecans': 'pecan',
        'walnuts': 'walnut',
        'berries': 'berry', 'blueberries': 'blueberry', 'raspberries': 'raspberry', 'strawberries': 'strawberry',
        'courgette': 'zucchini',
        'coriander': 'cilantro',
        'parmesan cheese': 'parmesan', 'parmigiano reggiano': 'parmesan',
        'cheddar cheese': 'cheddar',
        'goat\'s cheese': 'goat cheese',
        'ground beef': 'beef mince',
        'ground chicken': 'chicken mince',
        'ground pork': 'pork mince',
        'pork tenderloin': 'pork loin',
        'salmon fillet': 'salmon',
    };
    
    let standardizedName = nameMap[name] || name;
    if (unit === 'item' && standardizedName.endsWith('s')) {
        standardizedName = standardizedName.slice(0, -1);
    }
   
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
    const wholeUnitItems = ['egg', 'banana', 'apple', 'avocado', 'onion', 'tomato', 'potato', 'zucchini', 'pepper', 'lemon', 'lime', 'courgette', 'carrot', 'celery stick', 'bell pepper', 'chili pepper', 'can', 'slice', 'head', 'bunch', 'sprig', 'stalk', 'cob'];
    
    ingredientMap.forEach((value, key) => {
        if (value.quantity <= 0) return;

        const [name, unit] = key.split('|');
        
        const isWholeUnit = wholeUnitItems.some(item => name.toLowerCase().includes(item) || unit === item);
        const finalQuantity = isWholeUnit ? Math.ceil(value.quantity) : value.quantity;

        const displayQuantity = (finalQuantity % 1 !== 0) && !isWholeUnit
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
    'Fresh Fruit & Vegetables': ['apple', 'avocado', 'banana', 'berries', 'lettuce', 'onion', 'tomato', 'peaches', 'garlic', 'radishes', 'potato', 'zucchini', 'bell pepper', 'salad leaves', 'lemon', 'spinach', 'asparagus', 'cherry tomatoes', 'dill', 'watercress', 'parsley', 'kale', 'pomegranate', 'fig', 'kiwi', 'mango', 'squash', 'pumpkin', 'beetroot', 'celery', 'cabbage', 'edamame beans', 'bok choy', 'bean sprouts', 'lemongrass', 'kaffir lime leaves', 'cucumber', 'leek', 'shallot', 'grapefruit', 'pineapple', 'herbs'],
    'Dairy, Butter & Eggs': ['butter', 'cheese', 'egg', 'milk', 'yogurt', 'parmesan', 'feta cheese', 'cottage cheese', 'soy milk', 'almond milk', 'cream cheese', 'quark', 'burrata', 'goat cheese', 'sour cream', 'cheddar', 'mozzarella', 'ricotta'],
    'Meat & Poultry': ['bacon', 'chicken', 'turkey', 'pork', 'beef', 'lamb', 'sausage', 'ham', 'steak', 'mince', 'ground turkey', 'ribs', 'drumsticks', 'tenderloin', 'pork shoulder', 'chicken breast', 'chicken thighs', 'prosciutto', 'pancetta'],
    'Fish & Seafood': ['salmon', 'tuna', 'cod', 'haddock', 'mackerel', 'prawns', 'shrimp', 'scallops', 'mussels', 'fish', 'smoked salmon', 'sea bass', 'halibut', 'anchovies'],
    'Food Cupboard': ['beans', 'broth', 'cereal', 'chocolate', 'honey', 'jam', 'lentils', 'nuts', 'oil', 'olives', 'oregano', 'pasta', 'pesto', 'protein powder', 'rice', 'sauce', 'spices', 'stock', 'sugar', 'syrup', 'vanilla', 'vinegar', 'chili flakes', 'olive oil', 'lemon juice', 'chopped tomatoes', 'kidney beans', 'sweet corn', 'vegetable broth', 'mixed herbs', 'coconut oil', 'cumin', 'tinned tomatoes', 'canned tomatoes', 'tinned beans', 'canned beans', 'chickpeas', 'stock cube', 'bouillon', 'peanut butter', 'almond butter', 'cashew butter', 'oats', 'biscuits', 'crackers', 'soy sauce', 'tamari', 'ketchup', 'mayonnaise', 'mustard', 'dried fruit', 'whey powder', 'miso paste', 'tahini', 'curry paste', 'fish sauce', 'oyster sauce', 'hoisin sauce', 'ketjap manis', 'sriracha', 'sambal oelek', 'capers', 'coconut milk', 'cornflour', 'potato starch', 'baking powder', 'baking soda', 'cocoa powder', 'chocolate chips', 'dates', 'desiccated coconut', 'almond meal', 'coconut flour', 'nutritional yeast', 'vermicelli rice noodles', 'rice noodles', 'egg noodles', 'polenta', 'graham crackers', 'sun-dried tomatoes', 'dijon mustard', 'red wine vinegar', 'lime juice', 'quinoa', 'walnuts', 'almond', 'cashew', 'pecan', 'seeds', 'peanut', 'flour', 'panko breadcrumbs', 'breadcrumbs', 'couscous', 'bulgur'],
    'Bakery': ['bagel', 'bread', 'croissant', 'tortilla', 'wrap', 'burger buns', 'puff pastry'],
    'Drinks': ['coffee', 'juice', 'tea', 'water', 'coconut water', 'carrot juice', 'wine'],
    'Frozen': ['frozen berries', 'ice cream', 'blueberries', 'frozen peas', 'frozen corn', 'frozen green beans', 'frozen mangoes'],
    'Other Food Items': ['cilantro', 'chives', 'basil', 'mint', 'nori sheets', 'bay leaves', 'thyme', 'rosemary', 'saffron', 'za\'atar', 'coriander', 'tarragon']
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
