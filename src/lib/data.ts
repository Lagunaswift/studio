
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

function unicodeFractionToNumber(str: string): number {
  const fractions: { [key: string]: number } = {
    '¼': 0.25, '½': 0.5, '¾': 0.75, '⅐': 0.142, '⅑': 0.111, '⅒': 0.1,
    '⅓': 0.333, '⅔': 0.666, '⅕': 0.2, '⅖': 0.4, '⅗': 0.6, '⅘': 0.8,
    '⅙': 0.166, '⅚': 0.833, '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875
  };
  return fractions[str] || 0;
}

export const parseIngredientString = (ingredientString: string): { name: string; quantity: number; unit: string } => {
  if (!ingredientString) {
    return { name: 'Unknown', quantity: 0, unit: '' };
  }

  // Normalize and handle special cases
  let workingString = ingredientString.toLowerCase().trim()
    .replace(/[\u00BC-\u00BE\u2150-\u215E]/g, (match) => ` ${unicodeFractionToNumber(match)} `)
    .replace(/(\d+)\s*\/\s*(\d+)/g, (match, num, den) => ` ${parseInt(num, 10) / parseInt(den, 10)} `)
    .replace(/\s+/g, ' ');

  if (workingString.includes('to taste') || workingString.includes('if needed')) {
    return { name: ingredientString.replace(/to taste|if needed/i, '').trim(), quantity: 0, unit: 'to taste' };
  }

  // Comprehensive regex to capture quantity, unit, and name
  const ingredientRegex = new RegExp(
      /^(\d+\s\d\/\d|\d+\/\d+|\d+(?:\.\d+)?|\d+)?\s*(tbsps?|cups?|tsps?|g|grams?|kg|kgs?|ml|l|oz|pinch|handfuls?|cloves?|slices?|cans?|big\shandfuls?)?\s*(.*)$/
  );

  const match = workingString.match(ingredientRegex);

  if (!match) {
    return { name: ingredientString.trim(), quantity: 1, unit: 'item' };
  }

  let [, quantityStr, unitStr, nameStr] = match;

  // --- Quantity Processing ---
  let quantity = 1;
  if (quantityStr) {
    if (quantityStr.includes(' ')) { // Handles "1 1/2"
      const parts = quantityStr.split(' ');
      quantity = parseInt(parts[0], 10) + parseFloat(parts[1]);
    } else {
      quantity = parseFloat(quantityStr);
    }
  }

  // --- Unit Processing ---
  const unitMap: { [key: string]: string } = {
    g: 'g', gram: 'g', grams: 'g',
    kg: 'kg', kgs: 'kg',
    ml: 'ml', l: 'l',
    oz: 'oz',
    tsp: 'tsp', tsps: 'tsp',
    tbsp: 'tbsp', tbsps: 'tbsp',
    cup: 'cup', cups: 'cup',
    pinch: 'pinch',
    handful: 'handful', handfuls: 'handful', 'big handfuls': 'handful',
    clove: 'clove', cloves: 'clove',
    slice: 'slice', slices: 'slice',
    can: 'can', cans: 'can'
  };
  let unit = unitStr && unitMap[unitStr.replace(/s$/, '')] ? unitMap[unitStr.replace(/s$/, '')] : 'item';

  // --- Name Processing ---
  let name = nameStr.replace(/^of\s+/, '').replace(/,/g, '').trim();

  // Handle cases where the unit is still in the name
  const nameWords = name.split(' ');
  const potentialUnit = nameWords[0].replace(/s$/, '');
  if (unit === 'item' && unitMap[potentialUnit]) {
    unit = unitMap[potentialUnit];
    name = nameWords.slice(1).join(' ').trim();
  }

  // Final name cleanup
  name = name.replace(/s$/, ''); // Remove trailing 's' for better consolidation
  if (!name) {
    return { name: 'Unknown', quantity: 0, unit: ''}; // Avoid blank items
  }

  // Name standardization
  const nameMap: {[key: string]: string} = {
      'salad leave': 'salad leaves',
      'radish': 'radishes',
      'potato': 'potatoes',
      'zucchini': 'zucchini',
      'red bell pepper': 'red bell pepper',
      'red kidney bean': 'red kidney beans',
      'sweet corn': 'sweet corn',
  };
  name = nameMap[name] || name;


  return {
    name: name.charAt(0).toUpperCase() + name.slice(1),
    quantity: isNaN(quantity) ? 1 : quantity,
    unit: unit,
  };
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

  // Expanded list for better rounding
  const wholeUnitItems = [
    'egg', 'banana', 'apple', 'avocado', 'onion', 'tomato', 'potato', 'zucchini',
    'pepper', 'lemon', 'lime', 'garlic clove', 'salmon fillet', 'chicken breast',
    'radish', 'peach'
  ];

  plannedMeals.forEach(plannedMeal => {
    const recipe = plannedMeal.recipeDetails || recipesToUse.find(r => r.id === plannedMeal.recipeId);
    if (recipe) {
      recipe.ingredients.forEach(ingredientString => {
        const parsed = parseIngredientString(ingredientString);

        if (!parsed.name || parsed.quantity === 0 || parsed.name.trim() === '' || parsed.name === 'Unknown') return;

        const key = `${parsed.name.toLowerCase()}|${parsed.unit}`;
        let entry = ingredientMap.get(key);

        if (!entry) {
          entry = { quantity: 0, unit: parsed.unit, recipes: [] };
        }

        entry.quantity += parsed.quantity * (plannedMeal.servings || 1);
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

    const isWholeUnit = wholeUnitItems.some(item => name.toLowerCase().includes(item));
    const finalQuantity = isWholeUnit ? Math.ceil(value.quantity) : value.quantity;
    
    // Use toFixed(2) for decimal quantities to avoid long numbers, but only if it's not a whole number
    const displayQuantity = finalQuantity % 1 !== 0 ? parseFloat(finalQuantity.toFixed(2)) : finalQuantity;


    if (displayQuantity <= 0) return;

    shoppingList.push({
      id: key,
      name: name.charAt(0).toUpperCase() + name.slice(1),
      quantity: displayQuantity,
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
