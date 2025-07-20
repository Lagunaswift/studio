
import type { PlannedMeal, Macros, MealType, DailyWeightLog, Sex, RDA } from '@/types';
import { RecipeSchema } from '@/types'; // Import the Zod schema
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
  
  // Use the Recipe type defined in the refactored section below
  return {
    ...validation.data,
    name: validation.data.name, // Ensure name property exists
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
    if (recipe && recipe.macrosPerServing) {
      acc.calories += recipe.macrosPerServing.calories * plannedMeal.servings;
      acc.protein += recipe.macrosPerserving.protein * plannedMeal.servings;
      acc.carbs += recipe.macrosPerServing.carbs * plannedMeal.servings;
      acc.fat += recipe.macrosPerServing.fat * plannedMeal.servings;
    }
    return acc;
  }, { protein: 0, carbs: 0, fat: 0, calories: 0 });
};


// --- START: REFACTORED SHOPPING LIST CODE ---

// #region TYPE DEFINITIONS
// Represents a parsed ingredient with its quantity, unit, and standardized name.
export interface ParsedIngredient {
  quantity: number;
  unit: string | null;
  name: string;
}

// Represents an item on the final shopping list, including its category.
export interface ShoppingListItem extends ParsedIngredient {
  id: string;
  category: string;
  purchased: boolean;
  recipes: { recipeId: number; recipeName: string }[];
}

// Represents a recipe containing a title and a list of ingredient strings.
export interface Recipe {
  id: number;
  name: string;
  servings: number;
  ingredients: string[];
  // Other properties from the original schema can be added here if needed
  [key: string]: any;
}

// A simplified PantryItem type for the function signature.
export interface PantryItem {
    name: string;
    quantity: number;
    unit: string;
}
// #endregion

// =================================================================================
// SECTION 1.1: INGREDIENT PARSING & STANDARDIZATION
// =================================================================================

/**
 * ## Expanded Unit Mapping
 * Maps common unit variations and abbreviations to a single standard form.
 */
const unitMap: Map<string, string> = new Map([
  // Volume
  ['cup', 'cup'], ['cups', 'cup'], ['c', 'cup'],
  ['tablespoon', 'tbsp'], ['tablespoons', 'tbsp'], ['tbsp', 'tbsp'], ['tbs', 'tbsp'],
  ['teaspoon', 'tsp'], ['teaspoons', 'tsp'], ['tsp', 'tsp'],
  ['milliliter', 'ml'], ['milliliters', 'ml'], ['ml', 'ml'],
  ['liter', 'l'], ['liters', 'l'], ['l', 'l'],
  ['ounce', 'oz'], ['ounces', 'oz'], ['oz', 'oz'], ['fl oz', 'oz'], ['fluid ounce', 'oz'],
  ['pint', 'pt'], ['pints', 'pt'], ['pt', 'pt'],
  ['quart', 'qt'], ['quarts', 'qt'], ['qt', 'qt'],
  ['gallon', 'gal'], ['gallons', 'gal'], ['gal', 'gal'],

  // Mass
  ['gram', 'g'], ['grams', 'g'], ['g', 'g'],
  ['kilogram', 'kg'], ['kilograms', 'kg'], ['kg', 'kg'],
  ['pound', 'lb'], ['pounds', 'lb'], ['lbs', 'lb'],

  // Count/Piece/Misc
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

/**
 * ## Comprehensive Name Standardization
 * Normalizes different ingredient names to a consistent, generic name.
 */
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
  ['coriander', 'cilantro'], // Standardizing to one common term
  ['courgette', 'zucchini'],
  ['bell peppers', 'bell pepper'], ['red bell pepper', 'bell pepper'], ['green bell pepper', 'bell pepper'],
  ['potatoes', 'potato'], ['baby potatoes', 'potato'],
  ['soy sauce', 'soy sauce'], ['tamari', 'soy sauce'], // Grouping similar sauces
  ['chilli', 'chili pepper'], ['chillies', 'chili pepper'], ['chili', 'chili pepper'],
  ['almonds', 'almond'],
  ['walnuts', 'walnut'],
  ['eggs', 'egg'],
]);

/**
 * ## Attribute Stripping
 * A list of common descriptive adjectives to strip from ingredient names.
 */
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

/**
 * Safely parses a string to extract a numerical quantity.
 * Handles integers, decimals, fractions ("1/2"), and mixed numbers ("1 1/2").
 * @param text The string part to parse.
 * @returns A number, or 1 if parsing fails.
 */
function parseQuantity(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 1;

  // Handle mixed numbers like "1 1/2"
  const mixedNumberMatch = trimmed.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixedNumberMatch) {
    const [, whole, num, den] = mixedNumberMatch;
    return parseInt(whole, 10) + (parseInt(num, 10) / parseInt(den, 10));
  }

  // Handle simple fractions like "1/2"
  const fractionMatch = trimmed.match(/^(\d+)\/(\d+)$/);
  if (fractionMatch) {
    const [, num, den] = fractionMatch;
    return parseInt(num, 10) / parseInt(den, 10);
  }

  // Handle decimals and integers
  const num = parseFloat(trimmed);
  return isNaN(num) ? 1 : num;
}

/**
 * Parses a raw ingredient string into a structured object.
 * It standardizes names, units, and quantities.
 * @param ingredientString The raw ingredient string from a recipe.
 * @returns A ParsedIngredient object.
 */
export function parseIngredientString(ingredientString: string): ParsedIngredient {
  // Handle non-items first
  const nonItemPhrases = ['to taste', 'if needed', 'for serving', 'a dash', 'a splash'];
  if (!ingredientString || nonItemPhrases.some(phrase => ingredientString.toLowerCase().includes(phrase))) {
    return { quantity: 0, unit: null, name: 'non-item' };
  }

  let workingString = ingredientString.toLowerCase()
    .replace(/\s*\([^)]*\)\s*/g, ' ') // Remove parenthetical content
    .trim();

  // Regex to capture quantity, unit, and name
  const allUnits = Array.from(unitMap.keys()).join('|');
  const quantityRegex = /^(\d+\s+\d\/\d|\d+[\/.]\d+|\d+|-)?\s*/;
  const unitRegex = new RegExp(`^(${allUnits})\\b\\s*`);

  let quantity = 1;
  let unit: string | null = null;
  let name: string;

  // 1. Extract Quantity
  const quantityMatch = workingString.match(quantityRegex);
  if (quantityMatch && quantityMatch[1]) {
    const quantityStr = quantityMatch[1].replace('-', '').trim(); // Handle ranges like "1-2" by taking first number for now
    quantity = parseQuantity(quantityStr);
    workingString = workingString.substring(quantityMatch[0].length);
  } else if (workingString.startsWith('a ') || workingString.startsWith('an ')) {
    quantity = 1;
    workingString = workingString.substring(2);
  }

  // 2. Extract Unit
  const unitMatch = workingString.match(unitRegex);
  if (unitMatch) {
    unit = unitMap.get(unitMatch[1]) || null;
    workingString = workingString.substring(unitMatch[0].length);
  }

  // 3. The rest is the name. Clean, strip, and standardize it.
  name = workingString
    .replace(descriptorRegex, '') // Strip descriptive words
    .replace(/,/g, '') // Remove commas
    .replace(/^of\s+/, '') // Remove leading "of "
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .trim();

  // Standardize the name using the map
  name = nameMap.get(name) || name;
  
  // Final singularization if it's a countable item without a specific unit
  if (!unit && name.endsWith('s')) {
    name = name.slice(0, -1);
  }

  // If no unit was found after all that, it's a countable 'item'
  if (!unit) {
    unit = 'item';
  }

  return { quantity, unit, name };
}

// =================================================================================
// SECTION 1.2: UNIT CONVERSION & AGGREGATION LOGIC
// =================================================================================

/**
 * ## Unit Conversion Tables
 * Defines conversion rates to a standard base unit (ml for volume, g for mass).
 */
const volumeConversionRates: { [unit: string]: number } = { // to ml
  'cup': 236.588,
  'tbsp': 14.787,
  'tsp': 4.929,
  'oz': 29.574, // Fluid ounce
  'l': 1000,
  'ml': 1,
  'pt': 473.176,
  'qt': 946.353,
  'gal': 3785.41,
};

const massConversionRates: { [unit: string]: number } = { // to g
  'kg': 1000,
  'lb': 453.592,
  'oz': 28.35, // Mass ounce
  'g': 1,
};

/**
 * ## Density-based Conversions
 * Converts common ingredients from volume to mass. `g_per_ml`.
 * This allows "1 cup of flour" and "50g of flour" to be aggregated.
 */
const densityMap: { [ingredient: string]: number } = {
  'flour': 0.529,       // ~120g per cup
  'sugar': 0.845,       // ~200g per cup
  'brown sugar': 0.93,  // ~220g per cup
  'butter': 0.911,      // ~227g per cup
  'olive oil': 0.916,
  'water': 1.0,
  'milk': 1.03,
  'honey': 1.42,
};

/**
 * Converts an ingredient's quantity to a standard base unit (g or ml).
 * Prioritizes converting to grams (g) if density information is available.
 * @param ingredient The ParsedIngredient to standardize.
 * @returns The ingredient with its quantity and unit standardized.
 */
function standardizeIngredient(ingredient: ParsedIngredient): ParsedIngredient {
  let { quantity, unit, name } = ingredient;

  if (!unit) return ingredient;

  // 1. Standardize mass to 'g'
  if (unit in massConversionRates) {
    // Note: The original 'oz' could be mass or volume. We assume mass if not explicitly volume.
    // The parser maps 'fl oz' to 'oz', so we check density first for liquids.
    return { quantity: quantity * massConversionRates[unit], unit: 'g', name };
  }

  // 2. Standardize volume to 'ml', then try converting to 'g' via density
  if (unit in volumeConversionRates) {
    const quantityInMl = quantity * volumeConversionRates[unit];
    const density = densityMap[name];

    if (density) {
      // Convert to grams if possible
      return { quantity: quantityInMl * density, unit: 'g', name };
    } else {
      // Otherwise, keep as milliliters
      return { quantity: quantityInMl, unit: 'ml', name };
    }
  }

  // 3. If it's a count unit (e.g., clove, slice, item), return as is.
  return ingredient;
}


// =================================================================================
// SECTION 1.3: SHOPPING LIST CATEGORY ASSIGNMENT
// =================================================================================

type UKSupermarketCategory =
  | 'Fresh Fruit & Vegetables'
  | 'Meat & Poultry'
  | 'Fish & Seafood'
  | 'Dairy, Butter & Eggs'
  | 'Bakery'
  | 'Food Cupboard'
  | 'Baking Goods'
  | 'Pasta, Rice & Grains'
  | 'Canned Goods'
  | 'Condiments & Sauces'
  | 'Herbs & Spices'
  | 'Snacks & Confectionery'
  | 'Drinks'
  | 'Frozen'
  | 'Other Food Items';

/**
 * ## Expanded Category Map
 * Assigns ingredients to supermarket categories using keyword matching.
 * More specific categories are checked first.
 */
const categoryMap: Map<UKSupermarketCategory, string[]> = new Map([
  // More specific categories first
  ['Herbs & Spices', ['herb', 'spice', 'chili flake', 'cinnamon', 'cumin', 'paprika', 'turmeric', 'oregano', 'thyme', 'rosemary', 'basil', 'parsley', 'cilantro', 'dill', 'mint', 'bay leaf', 'salt', 'pepper']],
  ['Condiments & Sauces', ['sauce', 'ketchup', 'mayonnaise', 'mustard', 'vinegar', 'pesto', 'relish', 'chutney', 'dressing', 'syrup', 'miso', 'tahini', 'hoisin', 'sriracha']],
  ['Baking Goods', ['flour', 'sugar', 'baking powder', 'baking soda', 'yeast', 'cocoa powder', 'chocolate chip', 'vanilla extract', 'sprinkles']],
  ['Pasta, Rice & Grains', ['pasta', 'spaghetti', 'penne', 'rice', 'quinoa', 'couscous', 'oats', 'noodle', 'lasagna sheet', 'bulgur']],
  ['Canned Goods', ['canned', 'tinned', 'chickpea', 'kidney bean', 'black bean', 'lentil', 'coconut milk']],
  
  // Broader categories
  ['Meat & Poultry', ['chicken', 'beef', 'pork', 'lamb', 'turkey', 'mince', 'sausage', 'bacon', 'ham', 'steak']],
  ['Fish & Seafood', ['fish', 'salmon', 'tuna', 'cod', 'prawn', 'shrimp', 'haddock', 'mackerel']],
  ['Dairy, Butter & Eggs', ['milk', 'cheese', 'cheddar', 'mozzarella', 'feta', 'parmesan', 'yogurt', 'butter', 'cream', 'egg']],
  ['Fresh Fruit & Vegetables', ['fruit', 'vegetable', 'apple', 'banana', 'berry', 'orange', 'lemon', 'lime', 'grape', 'avocado', 'tomato', 'onion', 'potato', 'carrot', 'lettuce', 'spinach', 'broccoli', 'cauliflower', 'bell pepper', 'garlic', 'zucchini', 'spring onion']],
  ['Bakery', ['bread', 'bagel', 'croissant', 'wrap', 'tortilla', 'pastry', 'cake']],
  ['Snacks & Confectionery', ['crisps', 'nuts', 'seeds', 'cracker', 'biscuit', 'chocolate', 'sweets']],
  ['Frozen', ['frozen peas', 'frozen corn', 'ice cream']],
  ['Drinks', ['water', 'juice', 'coffee', 'tea', 'wine']],
  ['Food Cupboard', ['oil', 'stock', 'broth', 'bouillon', 'honey', 'jam', 'peanut butter']], // A smaller general cupboard
]);


/**
 * Assigns a supermarket category to an ingredient.
 * @param ingredientName The standardized name of the ingredient.
 * @returns A category name.
 */
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

/**
 * Generates a categorized and aggregated shopping list from planned meals.
 * @param plannedMeals An array of meals planned by the user.
 * @param allRecipes An array of all available recipes.
 * @param pantryItems An array of items the user already has.
 * @returns A sorted and aggregated array of ShoppingListItems.
 */
export function generateShoppingList(
  plannedMeals: { recipeId: number; servings: number }[],
  allRecipes: Recipe[],
  pantryItems: PantryItem[] = []
): ShoppingListItem[] {
  const aggregatedIngredients = new Map<string, {
    quantity: number;
    unit: string;
    name: string;
    recipes: { recipeId: number; recipeName: string }[];
  }>();

  // 1. Parse, standardize, and aggregate all ingredients from recipes
  plannedMeals.forEach(meal => {
    const recipe = allRecipes.find(r => r.id === meal.recipeId);
    if (!recipe) return;

    recipe.ingredients.forEach(ingredientString => {
      const parsed = parseIngredientString(ingredientString);
      if (parsed.name === 'non-item' || parsed.quantity <= 0) return;
      
      const standard = standardizeIngredient(parsed);
      const key = `${standard.name}|${standard.unit}`;

      // Adjust quantity based on planned servings vs recipe's base servings
      const recipeBaseServings = recipe.servings > 0 ? recipe.servings : 1;
      const totalRequired = (standard.quantity / recipeBaseServings) * meal.servings;

      const entry = aggregatedIngredients.get(key) || {
        quantity: 0,
        unit: standard.unit!,
        name: parsed.name, // Keep original parsed name for display
        recipes: [],
      };

      entry.quantity += totalRequired;
      if (!entry.recipes.some(r => r.recipeId === recipe.id)) {
        entry.recipes.push({ recipeId: recipe.id, recipeName: recipe.name });
      }

      aggregatedIngredients.set(key, entry);
    });
  });

  // 2. Subtract pantry items
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


  // 3. Build the final shopping list
  const shoppingList: ShoppingListItem[] = [];
  const countBasedUnits = ['clove', 'slice', 'item', 'head', 'bunch', 'sprig', 'stalk', 'packet', 'can', 'fillet', 'piece'];

  aggregatedIngredients.forEach((value, key) => {
    if (value.quantity <= 0) return;

    // Round up for items sold in whole units
    const isCountBased = countBasedUnits.includes(value.unit);
    const finalQuantity = isCountBased ? Math.ceil(value.quantity) : parseFloat(value.quantity.toFixed(2));

    if (finalQuantity <= 0) return;

    // Capitalize name for display
    const displayName = value.name.charAt(0).toUpperCase() + value.name.slice(1);

    shoppingList.push({
      id: key,
      name: displayName,
      quantity: finalQuantity,
      unit: value.unit,
      category: assignCategory(value.name),
      purchased: false,
      recipes: value.recipes,
    });
  });

  // 4. Sort the list by category, then by name
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