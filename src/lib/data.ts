

import type { Recipe, Macros, MealType, PlannedMeal, ShoppingListItem, UKSupermarketCategory, PantryItem, DailyWeightLog } from '@/types';
import { getAllRecipes as getAllRecipesFromRegistry } from '@/features/recipes/recipeRegistry';

// Helper function to map registry recipes to the full Recipe type
const mapToFullRecipe = (rawRecipe: any): Recipe => {
  // Basic validation for essential fields
  if (typeof rawRecipe.id !== 'number' || !rawRecipe.name || typeof rawRecipe.name !== 'string') {
    console.warn('Skipping invalid raw recipe data:', rawRecipe);
    return {
        id: -1, name: 'Invalid Recipe Data',
        servings: 0, ingredients: [], instructions: [], prepTime: '', cookTime: '',
        macrosPerServing: { calories: 0, protein: 0, carbs: 0, fat: 0 },
        image: 'https://placehold.co/600x400/007bff/ffffff.png?text=Error', // Blue placeholder for invalid data
        description: "This recipe data was invalid and could not be loaded."
    } as Recipe;
  }

  const servings = typeof rawRecipe.servings === 'number' && rawRecipe.servings > 0 ? rawRecipe.servings : 1;
  const totalCalories = typeof rawRecipe.calories === 'number' ? rawRecipe.calories : 0;
  const totalProtein = typeof rawRecipe.protein === 'number' ? rawRecipe.protein : 0;
  const totalCarbs = typeof rawRecipe.carbs === 'number' ? rawRecipe.carbs : 0;
  const totalFat = typeof rawRecipe.fat === 'number' ? rawRecipe.fat : 0;

  return {
    id: rawRecipe.id,
    name: rawRecipe.name,
    servings: servings,
    ingredients: Array.isArray(rawRecipe.ingredients) ? rawRecipe.ingredients : [],
    tags: Array.isArray(rawRecipe.tags) ? rawRecipe.tags : [],
    prepTime: typeof rawRecipe.prepTime === 'string' ? rawRecipe.prepTime : "N/A",
    cookTime: typeof rawRecipe.cookTime === 'string' ? rawRecipe.cookTime : "N/A",
    chillTime: typeof rawRecipe.chillTime === 'string' ? rawRecipe.chillTime : undefined,
    instructions: Array.isArray(rawRecipe.instructions) ? rawRecipe.instructions : [],
    macrosPerServing: {
      calories: totalCalories / servings,
      protein: totalProtein / servings,
      carbs: totalCarbs / servings,
      fat: totalFat / servings,
    },
    image: rawRecipe.image || `https://placehold.co/600x400.png?text=${encodeURIComponent(rawRecipe.name)}`,
    description: rawRecipe.description || "No description available.",
  };
};

const allRegisteredRecipesFull: Recipe[] = getAllRecipesFromRegistry()
  .map(mapToFullRecipe)
  .filter(recipe => recipe.id !== -1);

console.log(`[AppContext/data.ts] Successfully loaded and processed ${allRegisteredRecipesFull.length} recipes from the registry.`);

export const MEAL_TYPES: MealType[] = ["Breakfast", "Lunch", "Dinner", "Snack"];

export const getAllRecipes = async (): Promise<Recipe[]> => {
  return Promise.resolve(allRegisteredRecipesFull);
};

export const getRecipeById = async (id: number): Promise<Recipe | undefined> => {
  const foundRecipe = allRegisteredRecipesFull.find(recipe => recipe.id === id);
  return Promise.resolve(foundRecipe);
};

export const calculateTotalMacros = (plannedMeals: PlannedMeal[], recipesSource?: Recipe[]): Macros => {
  const recipesToUse = recipesSource && recipesSource.length > 0 ? recipesSource : allRegisteredRecipesFull;
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

const categoryKeywords: Record<UKSupermarketCategory, string[]> = {
  "Fresh Fruit & Vegetables": ["apple", "orange", "banana", "berries", "grapes", "melon", "pear", "plum", "avocado", "potato", "onion", "garlic", "ginger", "carrot", "broccoli", "spinach", "lettuce", "cabbage", "peppers", "tomato", "cucumber", "zucchini", "courgette", "aubergine", "mushroom", "corn", "peas", "beans (fresh)", "lemon", "lime", "herb (fresh)", "watercress", "spring onion", "leek", "florets", "asparagus", "kale", "radish", "beetroot", "fig", "kiwi", "pomegranate", "peach", "apricot", "pineapple", "mango", "squash", "pumpkin"],
  "Bakery": ["bread", "baguette", "rolls", "croissant", "bagel", "muffin", "cake", "pastry", "wrap", "tortilla (bread)", "crackers", "biscuit", "panko breadcrumbs", "breadcrumbs", "digestive biscuits"],
  "Meat & Poultry": ["chicken", "beef", "pork", "lamb", "turkey", "mince", "sausage", "bacon", "ham", "steak", "gammon", "ground turkey", "ribs", "drumsticks", "tenderloin", "pork shoulder", "chicken breast", "chicken thighs"],
  "Fish & Seafood": ["salmon", "cod", "haddock", "tuna", "mackerel", "prawns", "shrimp", "scallops", "mussels", "fish", "smoked salmon", "sea bass", "halibut", "anchovies"],
  "Dairy, Butter & Eggs": ["milk", "cheese", "cheddar", "mozzarella", "yogurt", "yoghurt", "butter", "cream", "eggs", "egg", "cottage cheese", "creme fraiche", "soy milk", "almond milk", "feta cheese", "egg whites", "plant or dairy", "goat's cheese", "goat cheese", "parmesan", "parmigiano reggiano", "ricotta", "cream cheese", "quark", "burrata"],
  "Chilled Foods": ["deli meat", "cooked meat", "pate", "fresh pasta", "fresh soup", "ready meal", "quiche", "coleslaw", "houmous", "hummus", "dip", "tofu", "tempeh"],
  "Frozen Foods": ["frozen peas", "frozen corn", "frozen chips", "frozen fruit", "ice cream", "frozen pizza", "frozen vegetables", "frozen blueberries", "frozen berries", "frozen raspberries", "frozen strawberries", "frozen mangoes", "frozen green beans"],
  "Food Cupboard": ["pasta (dried)", "rice", "noodles", "flour", "sugar", "salt", "pepper", "spice", "herbs (dried)", "oil (olive, vegetable, sunflower, coconut, sesame)", "vinegar", "tinned tomatoes", "canned tomatoes", "tinned beans", "canned beans", "lentils", "chickpeas", "soup (canned/packet)", "stock cube", "bouillon", "jam", "honey", "peanut butter", "almond butter", "cashew butter", "cereal", "oats", "biscuits", "crackers", "tea", "coffee", "hot chocolate", "soy sauce", "tamari", "ketchup", "mayonnaise", "mustard", "nuts", "seeds", "dried fruit", "whey powder", "protein powder", "oregano", "cumin", "chili flakes", "mixed herbs", "coconut oil", "vanilla whey powder", "maple syrup", "chia seeds", "miso paste", "tahini", "curry paste", "fish sauce", "oyster sauce", "hoisin sauce", "ketjap manis", "sriracha", "sambal oelek", "capers", "olives", "pesto", "coconut milk", "cornflour", "potato starch", "baking powder", "baking soda", "cocoa powder", "chocolate chips", "dates", "desiccated coconut", "almond meal", "coconut flour", "nutritional yeast", "vermicelli rice noodles", "rice noodles", "egg noodles", "polenta", "graham crackers", "sun-dried tomatoes", "sun dried tomatoes"],
  "Drinks": ["water", "juice", "soda", "fizzy drink", "cordial", "squash", "coconut water", "carrot juice"],
  "Other Food Items": ["parsley", "dill", "basil", "mint", "coriander", "cilantro", "chives", "lemongrass", "kaffir lime leaves", "nori sheets", "bay leaves", "thyme", "rosemary", "saffron", "za'atar"]
};

const KNOWN_UNITS_REGEX_PART = "\\b(cups?|tbsp|tablespoons?|tsp|teaspoons?|g|grams?|kg|kilograms?|ml|milliliters?|L|liters?|oz|ounces?|cans?|bunches?|cloves?|stalks?|sprigs?|slices?|sheets?|fillets?|heads?|eggs?|scoops?)\\b";

const DESCRIPTOR_SUFFIXES_ARRAY = [
  'peeled and chopped', 'peeled and diced', 'peeled and sliced', 'peeled and grated',
  'drained and rinsed', 'rinsed and drained',
  'cut into matchsticks', 'cut into bite-size pieces', 'tough bottoms removed',
  'white parts only', 'green part', 'flesh only', 'seeds removed', 'stems removed', 'core removed',
  'skin on', 'skin off', 'bone in', 'bone out',
  'pitted', 'deseeded', 'without stone',
  'thinly sliced', 'finely chopped', 'coarsely grated',
  'peeled', 'chopped', 'diced', 'sliced', 'minced', 'grated', 'crushed', 'trimmed', 'halved', 'quartered',
  'rinsed', 'drained', 'frozen', 'fresh', 'cooked', 'uncooked', 'ripe', 'large', 'medium', 'small',
  'thin', 'thick', 'whole', 'ground', 'light', 'dark', 'sweet', 'unsweetened', 'salted', 'unsalted',
  'plus extra', 'plus more', 'for garnish', 'to serve', 'to taste', 'optional', 'room temperature',
  'softened', 'melted', 'natural', 'organic', 'heaping', 'rounded-sm', 'scant',
  'in brine', 'in olive oil', 'in water', 'in juice', 'with liquid', 'including juices',
  'rehydrated', 'store bought or homemade', 'unthawed', 'boneless and skinless', 'boneless, skinless'
];
DESCRIPTOR_SUFFIXES_ARRAY.sort((a, b) => b.length - a.length);

const suffixPatternString = `(?:,?\\s+(?:${DESCRIPTOR_SUFFIXES_ARRAY.map(s => s.replace(/\s+/g, '\\s*')).join('|')}|\\(.*?\\)))+$`;
const suffixPatternGlobalString = `(?:,?\\s*(?:${DESCRIPTOR_SUFFIXES_ARRAY.map(s => s.replace(/\s+/g, '\\s*')).join('|')}|\\(.*?\\)))+`;


export const parseIngredientString = (ingredientString: string): { name: string; quantity: number; unit: string } => {
  let cleanedString = ingredientString.replace(/\./g, '');
  
  const mainRegex = new RegExp(`^(\\d+\\s*\\/?\\s*\\d*|\\d*\\s?½|\\d*\\s?¼|\\d*\\s?¾)?\\s*(${KNOWN_UNITS_REGEX_PART})?\\s*(?:of\\s+)?(.*)$`, 'i');
  const match = cleanedString.match(mainRegex);

  let quantity = 1;
  let unit = 'item(s)';
  let name = ingredientString.trim();

  if (match) {
    const qtyStr = match[1] ? match[1].trim() : null;
    const unitStr = match[2] ? match[2].trim().replace(/\.$/, '') : null; // Remove trailing dot from unit
    let namePart = match[3] ? match[3].trim() : '';

    if (qtyStr) {
      if (qtyStr.includes('½')) quantity = (parseFloat(qtyStr.replace('½','').trim() || "0") + 0.5) || 0.5;
      else if (qtyStr.includes('¼')) quantity = (parseFloat(qtyStr.replace('¼','').trim() || "0") + 0.25) || 0.25;
      else if (qtyStr.includes('¾')) quantity = (parseFloat(qtyStr.replace('¾','').trim() || "0") + 0.75) || 0.75;
      else if (qtyStr.includes('/')) {
        const parts = qtyStr.split('/');
        if (parts.length === 2) {
          const num = parseFloat(parts[0].trim()); // trim spaces for "1 / 2"
          const den = parseFloat(parts[1].trim());
          if (!isNaN(num) && !isNaN(den) && den !== 0) {
             if (parts[0].includes(' ')) { // Handle mixed fractions like "1 1/2"
                const wholeParts = parts[0].split(' ');
                const whole = parseFloat(wholeParts[0]);
                const fracNum = parseFloat(wholeParts[1]);
                quantity = whole + (fracNum / den);
             } else {
                quantity = num / den;
             }
          } else {
            quantity = 1;
          }
        }
      } else {
        quantity = parseFloat(qtyStr) || 1;
      }
    }
    
    if (unitStr) {
      unit = unitStr.toLowerCase(); // Standardize unit to lowercase early
    }
    
    name = namePart || (unitStr ? ingredientString.split(new RegExp(`\\b${unitStr}\\b`, 'i'))[1] || ingredientString : ingredientString).trim();
    if (name.toLowerCase().startsWith('of ')) {
      name = name.substring(3).trim();
    }
     if (qtyStr && !unitStr && name.startsWith(qtyStr)) {
        name = name.substring(qtyStr.length).trim();
     }

  } else {
     const simpleQtyMatch = ingredientString.match(/^(\d+)\s+(.*)/);
     if (simpleQtyMatch) {
       quantity = parseInt(simpleQtyMatch[1], 10);
       name = simpleQtyMatch[2].trim();
     } else {
       name = ingredientString.trim();
     }
  }
  
  // Normalize Unit
  if (['tbsp', 'tablespoon', 'tablespoons'].includes(unit)) unit = 'tbsp';
  else if (['tsp', 'teaspoon', 'teaspoons'].includes(unit)) unit = 'tsp';
  else if (['g', 'gram', 'grams'].includes(unit)) unit = 'g';
  else if (['ml', 'milliliter', 'milliliters'].includes(unit)) unit = 'ml';
  else if (['l', 'liter', 'liters'].includes(unit)) unit = 'L';
  else if (['kg', 'kilogram', 'kilograms'].includes(unit)) unit = 'kg';
  else if (['oz', 'ounce', 'ounces'].includes(unit)) unit = 'oz.'; // Keep oz. consistent
  else if (['cup', 'cups'].includes(unit)) unit = 'cup';
  else if (['can', 'cans'].includes(unit)) unit = 'can';
  else if (['scoop', 'scoops'].includes(unit)) unit = 'scoop';
  else if (['egg', 'eggs'].includes(unit)) {
      unit = 'egg'; 
      if (name.toLowerCase().includes('egg')) name = 'egg';
  } else if (!new RegExp(KNOWN_UNITS_REGEX_PART, 'i').test(unit) && unit !== 'item(s)') { 
      name = `${unit} ${name}`.trim();
      unit = 'item(s)';
  }


  // Clean Name
  name = name.replace(/\(\s*[^)]*\s*\)/g, '').trim(); // Remove anything in parentheses e.g. (optional), (14oz./400g)
  
  let oldName;
  const suffixRemovalPattern = new RegExp(suffixPatternString, 'i');
  do {
    oldName = name;
    name = name.replace(suffixRemovalPattern, '').trim();
    name = name.replace(/,$/, '').trim(); 
  } while (name !== oldName && name.length > 0);

  const generalDescriptorPattern = new RegExp(`(?:^|,)\\s*(?:${DESCRIPTOR_SUFFIXES_ARRAY.map(s => s.replace(/\s+/g, '\\s*')).join('|')})\\b`, 'gi');
  name = name.replace(generalDescriptorPattern, '').trim();
  name = name.replace(/^,/, '').trim(); 

  name = name.replace(/\s+/g, ' ').trim();

  // Specific typo correction
  if (name.toLowerCase() === 'ettuce leaves' || name.toLowerCase() === 'ettuce') name = 'Lettuce leaves';
  if (name.toLowerCase() === 'ranny smith apple') name = 'Granny Smith apple'; // More specific if known

  if (!name.trim() && (unit.toLowerCase() === 'egg')) {
      name = 'Egg';
  }
  if (!name.trim() && ingredientString.trim()) {
      name = ingredientString.trim().split(',')[0].trim();
      name = name.replace(new RegExp(suffixPatternGlobalString, 'gi'), '').trim();
      name = name.replace(/\s+/g, ' ').trim();
  }

  return { name: name ? name.charAt(0).toUpperCase() + name.slice(1) : "Unknown Ingredient", quantity, unit };
};


export const assignCategory = (ingredientName: string): UKSupermarketCategory => {
  const lowerIngredientName = ingredientName.toLowerCase();
  for (const category in categoryKeywords) {
    const keywords = categoryKeywords[category as UKSupermarketCategory];
    if (keywords.some(keyword => lowerIngredientName.includes(keyword.toLowerCase()))) {
      return category as UKSupermarketCategory;
    }
  }
  if (lowerIngredientName.includes('milk') || lowerIngredientName.includes('cheese') || lowerIngredientName.includes('yogurt') || lowerIngredientName.includes('butter') || lowerIngredientName.includes('cream') || lowerIngredientName.includes('egg')) return "Dairy, Butter & Eggs";
  if (lowerIngredientName.includes('chicken') || lowerIngredientName.includes('beef') || lowerIngredientName.includes('pork') || lowerIngredientName.includes('lamb') || lowerIngredientName.includes('turkey')) return "Meat & Poultry";
  if (lowerIngredientName.includes('salmon') || lowerIngredientName.includes('cod') || lowerIngredientName.includes('tuna') || lowerIngredientName.includes('fish') || lowerIngredientName.includes('prawn')) return "Fish & Seafood";
  if (lowerIngredientName.includes('apple') || lowerIngredientName.includes('banana') || lowerIngredientName.includes('berry') || lowerIngredientName.includes('orange') || lowerIngredientName.includes('tomato') || lowerIngredientName.includes('potato') || lowerIngredientName.includes('onion') || lowerIngredientName.includes('carrot') || lowerIngredientName.includes('broccoli') || lowerIngredientName.includes('spinach') || lowerIngredientName.includes('pepper')) return "Fresh Fruit & Vegetables";
  if (lowerIngredientName.includes('bread') || lowerIngredientName.includes('pasta') || lowerIngredientName.includes('rice') || lowerIngredientName.includes('flour') || lowerIngredientName.includes('cereal') || lowerIngredientName.includes('oats')) return "Food Cupboard"; 
  return "Other Food Items";
};


export const generateShoppingList = (
  plannedMeals: PlannedMeal[],
  recipesSource?: Recipe[],
  pantryItems: PantryItem[] = []
): ShoppingListItem[] => {
  const ingredientMap = new Map<string, { quantity: number; unit: string; recipes: { recipeId: number; recipeName: string }[] }>();
  const recipesToUse = recipesSource && recipesSource.length > 0 ? recipesSource : allRecipesCache;

  // List of ingredients that should be rounded up to the nearest whole number
  const wholeUnitItems = ['egg', 'banana', 'apple', 'avocado', 'onion', 'tomato', 'pepper', 'lemon', 'lime', 'garlic clove', 'salmon fillet', 'chicken breast'];

  plannedMeals.forEach(plannedMeal => {
    const recipe = plannedMeal.recipeDetails || recipesToUse.find(r => r.id === plannedMeal.recipeId);
    if (recipe) {
      recipe.ingredients.forEach(ingredientString => {
        const parsed = parseIngredientString(ingredientString);

        if (!parsed.name || parsed.quantity === 0 || parsed.name.trim() === '') return;

        const key = `${parsed.name.toLowerCase()}|${parsed.unit}`;
        let entry = ingredientMap.get(key);

        if (!entry) {
          entry = { quantity: 0, unit: parsed.unit, recipes: [] };
        }

        entry.quantity += parsed.quantity * plannedMeal.servings;
        if (!entry.recipes.find(r => r.recipeId === recipe.id)) {
          entry.recipes.push({ recipeId: recipe.id, recipeName: recipe.name });
        }

        ingredientMap.set(key, entry);
      });
    }
  });

  // Subtract pantry items
  pantryItems.forEach(pantryItem => {
    const key = `${pantryItem.name.toLowerCase()}|${pantryItem.unit}`;
    const requiredItem = ingredientMap.get(key);

    if (requiredItem) {
      requiredItem.quantity -= pantryItem.quantity;
      if (requiredItem.quantity <= 0) {
        ingredientMap.delete(key);
      }
    }
  });

  const shoppingList: ShoppingListItem[] = [];
  ingredientMap.forEach((value, key) => {
    const [name] = key.split('|');
    
    // Check if the ingredient should be rounded up
    const isWholeUnit = wholeUnitItems.some(item => name.toLowerCase().includes(item));
    const finalQuantity = isWholeUnit ? Math.ceil(value.quantity) : value.quantity;

    // Don't add items with zero or negative quantity to the list
    if (finalQuantity <= 0) return;

    shoppingList.push({
      id: key,
      name: name.charAt(0).toUpperCase() + name.slice(1),
      quantity: finalQuantity,
      unit: value.unit,
      category: assignCategory(name),
      purchased: false,
      recipes: value.recipes,
    });
  });

  return shoppingList.sort((a, b) => {
    if (a.category < b.category) return -1;
    if (a.category > b.category) return 1;
    return a.name.localeCompare(b.name);
  });
};


export const calculateTrendWeight = (dailyWeightLog: DailyWeightLog[]): DailyWeightLog[] => {
  if (!dailyWeightLog || dailyWeightLog.length < 7) {
    // Not enough data for a centered moving average, return original log
    return dailyWeightLog.map(log => ({...log, trendWeightKg: undefined}));
  }

  // Sort logs by date just in case they are not ordered
  const sortedLogs = [...dailyWeightLog].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const trendWeightData: DailyWeightLog[] = sortedLogs.map((log, index, arr) => {
    // Use a 7-day centered moving average
    const start = Math.max(0, index - 3);
    const end = Math.min(arr.length, index + 4);
    
    // Need at least 4 data points for a meaningful average
    if (end - start < 4) {
      return { ...log, trendWeightKg: undefined };
    }

    const window = arr.slice(start, end);
    const sum = window.reduce((acc, current) => acc + current.weightKg, 0);
    const trendWeight = sum / window.length;

    return { ...log, trendWeightKg: parseFloat(trendWeight.toFixed(2)) };
  });

  // Return sorted descending to match expected order in AppContext
  return trendWeightData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

