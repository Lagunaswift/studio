
import type { PlannedMeal, Macros, MealType, DailyWeightLog, Sex, RDA, Recipe, PantryItem } from '@/types';

export const MEAL_TYPES: MealType[] = ["Breakfast", "Lunch", "Dinner", "Snack"];

export const calculateTotalMacros = (plannedMeals: PlannedMeal[], allRecipes: Recipe[]): Macros => {
  if (!allRecipes || allRecipes.length === 0) {
    return { protein: 0, carbs: 0, fat: 0, calories: 0 };
  }
  return plannedMeals.reduce((acc, plannedMeal) => {
    const recipe = plannedMeal.recipeDetails || allRecipes.find(r => r.id === plannedMeal.recipeId);
    if (recipe && recipe.macrosPerServing) {
      acc.calories += recipe.macrosPerServing.calories * plannedMeal.servings;
      acc.protein += recipe.macrosPerServing.protein * plannedMeal.servings;
      acc.carbs += recipe.macrosPerServing.carbs * plannedMeal.servings;
      acc.fat += recipe.macrosPerServing.fat * plannedMeal.servings;
    }
    return acc;
  }, { protein: 0, carbs: 0, fat: 0, calories: 0 });
};

// #region TYPE DEFINITIONS
export interface ParsedIngredient {
  quantity: number;
  unit: string | null;
  name: string;
}

export interface ShoppingListItem extends ParsedIngredient {
  id: string;
  category: string;
  purchased: boolean;
  recipes: { recipeId: number; recipeName: string }[];
}
// #endregion

// =================================================================================
// SECTION 1.1: INGREDIENT PARSING & STANDARDIZATION
// =================================================================================
const unitMap: Map<string, string> = new Map([
  ['cup', 'cup'], ['cups', 'cup'], ['c', 'cup'],
  ['tablespoon', 'tbsp'], ['tablespoons', 'tbsp'], ['tbsp', 'tbsp'], ['tbs', 'tbsp'],
  ['teaspoon', 'tsp'], ['teaspoons', 'tsp'], ['tsp', 'tsp'],
  ['milliliter', 'ml'], ['milliliters', 'ml'], ['ml', 'ml'],
  ['liter', 'l'], ['liters', 'l'], ['l', 'l'],
  ['ounce', 'oz'], ['ounces', 'oz'], ['oz', 'oz'], ['fl oz', 'oz'], ['fluid ounce', 'oz'],
  ['pint', 'pt'], ['pints', 'pt'], ['pt', 'pt'],
  ['quart', 'qt'], ['quarts', 'qt'], ['qt', 'qt'],
  ['gallon', 'gal'], ['gallons', 'gal'], ['gal', 'gal'],
  ['gram', 'g'], ['grams', 'g'], ['g', 'g'],
  ['kilogram', 'kg'], ['kilograms', 'kg'], ['kg', 'kg'],
  ['pound', 'lb'], ['pounds', 'lb'], ['lbs', 'lb'],
  ['clove', 'clove'], ['cloves', 'clove'], ['cl', 'clove'],
  ['packet', 'packet'], ['packets', 'packet'], ['pkt', 'packet'],
  ['head', 'head'],
  ['bunch', 'bunch'],
  ['sprig', 'sprig'],
  ['stalk', 'stalk'],
  ['slice', 'slice'], ['slices', 'slice'],
  ['piece', 'piece'], ['pieces', 'piece'],
  ['fillet', 'fillet'], ['fillets', 'fillet'],
  ['can', 'can'], ['cans', 'can'],
  ['dash', 'dash'],
  ['pinch', 'pinch'],
  ['splash', 'splash'],
  ['handful', 'handful'],
]);

const nameMap: Map<string, string> = new Map([
  ['extra virgin olive oil', 'olive oil'],
  ['yellow onion', 'onion'], ['red onion', 'onion'], ['white onion', 'onion'], ['onions', 'onion'],
  ['scallion', 'spring onion'], ['scallions', 'spring onion'], ['green onion', 'spring onion'], ['green onions', 'spring onion'],
  ['chicken breast fillets', 'chicken breast'], ['chicken breasts', 'chicken breast'], ['skinless boneless chicken breast', 'chicken breast'],
  ['chicken thighs', 'chicken thigh'],
  ['cherry tomatoes', 'tomato'], ['plum tomatoes', 'tomato'], ['canned tomatoes', 'tomato'], ['diced tomatoes', 'tomato'], ['tomatoes', 'tomato'],
  ['ground beef', 'beef mince'], ['lean ground beef', 'beef mince'],
  ['ground turkey', 'turkey mince'],
  ['parmesan cheese', 'parmesan'], ['parmigiano-reggiano', 'parmesan'],
  ['grated cheddar', 'cheddar cheese'], ['cheddar', 'cheddar cheese'],
  ['coriander', 'cilantro'],
  ['courgette', 'zucchini'],
  ['bell peppers', 'bell pepper'], ['red bell pepper', 'bell pepper'], ['green bell pepper', 'bell pepper'],
  ['potatoes', 'potato'], ['baby potatoes', 'potato'],
  ['soy sauce', 'soy sauce'], ['tamari', 'soy sauce'],
  ['chilli', 'chili pepper'], ['chillies', 'chili pepper'], ['chili', 'chili pepper'],
  ['almonds', 'almond'],
  ['walnuts', 'walnut'],
  ['eggs', 'egg'],
]);

const descriptors: string[] = [
  'fresh', 'organic', 'dried', 'canned', 'frozen', 'cooked',
  'chopped', 'diced', 'sliced', 'minced', 'grated', 'crushed',
  'finely', 'thinly', 'roughly',
  'large', 'medium', 'small',
  'ripe', 'peeled', 'seeded', 'pitted',
  'unsalted', 'salted', 'sweetened', 'unsweetened',
  'whole', 'halved', 'quartered',
  'all-purpose', 'all purpose',
  'toasted', 'roasted',
  'optional', 'for garnish',
  'drained', 'rinsed',
  'skinless', 'boneless',
  'room temperature',
];
const descriptorRegex = new RegExp(`\\b(${descriptors.join('|')})\\b`, 'gi');

function parseQuantity(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 1;

  const mixedNumberMatch = trimmed.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixedNumberMatch) {
    const [, whole, num, den] = mixedNumberMatch;
    return parseInt(whole, 10) + (parseInt(num, 10) / parseInt(den, 10));
  }

  const fractionMatch = trimmed.match(/^(\d+)\/(\d+)$/);
  if (fractionMatch) {
    const [, num, den] = fractionMatch;
    return parseInt(num, 10) / parseInt(den, 10);
  }

  const num = parseFloat(trimmed);
  return isNaN(num) ? 1 : num;
}

export function parseIngredientString(ingredientString: string): ParsedIngredient {
  const nonItemPhrases = ['to taste', 'if needed', 'for serving', 'a dash', 'a splash'];
  if (!ingredientString || nonItemPhrases.some(phrase => ingredientString.toLowerCase().includes(phrase))) {
    return { quantity: 0, unit: null, name: 'non-item' };
  }

  let workingString = ingredientString.toLowerCase()
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .trim();

  const allUnits = Array.from(unitMap.keys()).join('|');
  const quantityRegex = /^(\d+\s+\d\/\d|\d+[\/.]\d+|\d+|-)?\s*/;
  const unitRegex = new RegExp(`^(${allUnits})\\b\\s*`);

  let quantity = 1;
  let unit: string | null = null;
  let name: string;

  const quantityMatch = workingString.match(quantityRegex);
  if (quantityMatch && quantityMatch[1]) {
    const quantityStr = quantityMatch[1].replace('-', '').trim();
    quantity = parseQuantity(quantityStr);
    workingString = workingString.substring(quantityMatch[0].length);
  } else if (workingString.startsWith('a ') || workingString.startsWith('an ')) {
    quantity = 1;
    workingString = workingString.substring(2);
  }

  const unitMatch = workingString.match(unitRegex);
  if (unitMatch) {
    unit = unitMap.get(unitMatch[1]) || null;
    workingString = workingString.substring(unitMatch[0].length);
  }

  name = workingString
    .replace(descriptorRegex, '')
    .replace(/,/g, '')
    .replace(/^of\s+/, '')
    .replace(/\s+/g, ' ')
    .trim();

  name = nameMap.get(name) || name;
  
  if (!unit && name.endsWith('s')) {
    name = name.slice(0, -1);
  }

  if (!unit) {
    unit = 'item';
  }

  return { quantity, unit, name };
}

// =================================================================================
// SECTION 1.2: UNIT CONVERSION & AGGREGATION LOGIC
// =================================================================================
const volumeConversionRates: { [unit: string]: number } = { // to ml
  'cup': 236.588, 'tbsp': 14.787, 'tsp': 4.929, 'oz': 29.574,
  'l': 1000, 'ml': 1, 'pt': 473.176, 'qt': 946.353, 'gal': 3785.41,
};
const massConversionRates: { [unit: string]: number } = { // to g
  'kg': 1000, 'lb': 453.592, 'oz': 28.35, 'g': 1,
};
const densityMap: { [ingredient: string]: number } = {
  'flour': 0.529, 'sugar': 0.845, 'brown sugar': 0.93, 'butter': 0.911,
  'olive oil': 0.916, 'water': 1.0, 'milk': 1.03, 'honey': 1.42,
};

function standardizeIngredient(ingredient: ParsedIngredient): ParsedIngredient {
  let { quantity, unit, name } = ingredient;
  if (!unit) return ingredient;
  if (unit in massConversionRates) {
    return { quantity: quantity * massConversionRates[unit], unit: 'g', name };
  }
  if (unit in volumeConversionRates) {
    const quantityInMl = quantity * volumeConversionRates[unit];
    const density = densityMap[name];
    return density
      ? { quantity: quantityInMl * density, unit: 'g', name }
      : { quantity: quantityInMl, unit: 'ml', name };
  }
  return ingredient;
}


// =================================================================================
// SECTION 1.3: SHOPPING LIST CATEGORY ASSIGNMENT
// =================================================================================
type UKSupermarketCategory =
  | 'Fresh Fruit & Vegetables' | 'Meat & Poultry' | 'Fish & Seafood' | 'Dairy, Butter & Eggs'
  | 'Bakery' | 'Food Cupboard' | 'Baking Goods' | 'Pasta, Rice & Grains' | 'Canned Goods'
  | 'Condiments & Sauces' | 'Herbs & Spices' | 'Snacks & Confectionery' | 'Drinks' | 'Frozen' | 'Other Food Items';

const categoryMap: Map<UKSupermarketCategory, string[]> = new Map([
  ['Herbs & Spices', ['herb', 'spice', 'chili flake', 'cinnamon', 'cumin', 'paprika', 'turmeric', 'oregano', 'thyme', 'rosemary', 'basil', 'parsley', 'cilantro', 'dill', 'mint', 'bay leaf', 'salt', 'pepper']],
  ['Condiments & Sauces', ['sauce', 'ketchup', 'mayonnaise', 'mustard', 'vinegar', 'pesto', 'relish', 'chutney', 'dressing', 'syrup', 'miso', 'tahini', 'hoisin', 'sriracha']],
  ['Baking Goods', ['flour', 'sugar', 'baking powder', 'baking soda', 'yeast', 'cocoa powder', 'chocolate chip', 'vanilla extract', 'sprinkles']],
  ['Pasta, Rice & Grains', ['pasta', 'spaghetti', 'penne', 'rice', 'quinoa', 'couscous', 'oats', 'noodle', 'lasagna sheet', 'bulgur']],
  ['Canned Goods', ['canned', 'tinned', 'chickpea', 'kidney bean', 'black bean', 'lentil', 'coconut milk']],
  ['Meat & Poultry', ['chicken', 'beef', 'pork', 'lamb', 'turkey', 'mince', 'sausage', 'bacon', 'ham', 'steak']],
  ['Fish & Seafood', ['fish', 'salmon', 'tuna', 'cod', 'prawn', 'shrimp', 'haddock', 'mackerel']],
  ['Dairy, Butter & Eggs', ['milk', 'cheese', 'cheddar', 'mozzarella', 'feta', 'parmesan', 'yogurt', 'butter', 'cream', 'egg']],
  ['Fresh Fruit & Vegetables', ['fruit', 'vegetable', 'apple', 'banana', 'berry', 'orange', 'lemon', 'lime', 'grape', 'avocado', 'tomato', 'onion', 'potato', 'carrot', 'lettuce', 'spinach', 'broccoli', 'cauliflower', 'bell pepper', 'garlic', 'zucchini', 'spring onion']],
  ['Bakery', ['bread', 'bagel', 'croissant', 'wrap', 'tortilla', 'pastry', 'cake']],
  ['Snacks & Confectionery', ['crisps', 'nuts', 'seeds', 'cracker', 'biscuit', 'chocolate', 'sweets']],
  ['Frozen', ['frozen peas', 'frozen corn', 'ice cream']],
  ['Drinks', ['water', 'juice', 'coffee', 'tea', 'wine']],
  ['Food Cupboard', ['oil', 'stock', 'broth', 'bouillon', 'honey', 'jam', 'peanut butter']],
]);


export function assignCategory(ingredientName: string): UKSupermarketCategory {
  const name = ingredientName.toLowerCase();
  for (const [category, keywords] of categoryMap.entries()) {
    if (keywords.some(keyword => name.includes(keyword))) {
      return category;
    }
  }
  return 'Other Food Items';
}

// =================================================================================
// FINAL LIST GENERATION
// =================================================================================
export function generateShoppingList(
  plannedMeals: PlannedMeal[],
  allRecipes: Recipe[],
  pantryItems: PantryItem[] = []
): ShoppingListItem[] {
  const aggregatedIngredients = new Map<string, {
    quantity: number;
    unit: string;
    name: string;
    recipes: { recipeId: number; recipeName: string }[];
  }>();

  plannedMeals.forEach(meal => {
    const recipe = allRecipes.find(r => r.id === meal.recipeId);
    if (!recipe) return;

    recipe.ingredients.forEach(ingredientString => {
      const parsed = parseIngredientString(ingredientString);
      if (parsed.name === 'non-item' || parsed.quantity <= 0) return;
      
      const standard = standardizeIngredient(parsed);
      const key = `${standard.name}|${standard.unit}`;

      const recipeBaseServings = recipe.servings > 0 ? recipe.servings : 1;
      const totalRequired = (parsed.quantity / recipeBaseServings) * meal.servings;

      const entry = aggregatedIngredients.get(key) || {
        quantity: 0,
        unit: standard.unit!,
        name: parsed.name,
        recipes: [],
      };

      entry.quantity += totalRequired;
      if (!entry.recipes.some(r => r.recipeId === recipe.id)) {
        entry.recipes.push({ recipeId: recipe.id, recipeName: recipe.name });
      }

      aggregatedIngredients.set(key, entry);
    });
  });

  pantryItems.forEach(pantryItem => {
      const parsedPantry = standardizeIngredient({
          name: pantryItem.name.toLowerCase(),
          quantity: pantryItem.quantity,
          unit: pantryItem.unit
      });
      const key = `${parsedPantry.name}|${parsedPantry.unit}`;
      const requiredItem = aggregatedIngredients.get(key);
      if(requiredItem) {
          requiredItem.quantity -= parsedPantry.quantity;
      }
  });

  const shoppingList: ShoppingListItem[] = [];
  const countBasedUnits = ['clove', 'slice', 'item', 'head', 'bunch', 'sprig', 'stalk', 'packet', 'can', 'fillet', 'piece'];

  aggregatedIngredients.forEach((value, key) => {
    if (value.quantity <= 0) return;

    const isCountBased = countBasedUnits.includes(value.unit);
    const finalQuantity = isCountBased ? Math.ceil(value.quantity) : parseFloat(value.quantity.toFixed(2));

    if (finalQuantity <= 0) return;

    const displayName = value.name.charAt(0).toUpperCase() + value.name.slice(1);

    shoppingList.push({
      id: key,
      name: displayName,
      quantity: finalQuantity,
      unit: value.unit,
      category: assignCategory(value.name) as UKSupermarketCategory,
      purchased: false,
      recipes: value.recipes,
    });
  });

  return shoppingList.sort((a, b) => {
    if (a.category < b.category) return -1;
    if (a.category > b.category) return 1;
    return a.name.localeCompare(b.name);
  });
}

// --- END: REFACTORED SHOPPING LIST CODE ---


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
    if (age >= 19 && age <= 50) {
        if (sex === 'male') {
            return {
                iron: 8, calcium: 1000, potassium: 3400,
                vitaminA: 900, vitaminC: 90, vitaminD: 15
            };
        } else {
            return {
                iron: 18, calcium: 1000, potassium: 2600,
                vitaminA: 700, vitaminC: 75, vitaminD: 15
            };
        }
    }
    return {
        iron: 10, calcium: 1200, potassium: 3000,
        vitaminA: 800, vitaminC: 80, vitaminD: 15
    };
};
