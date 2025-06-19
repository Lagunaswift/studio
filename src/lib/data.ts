
import type { Recipe, Macros, MealType, PlannedMeal, ShoppingListItem, UKSupermarketCategory, PantryItem } from '@/types';
import { getAllRecipes as getAllRecipesFromRegistry } from '@/features/recipes/recipeRegistry';

// Helper function to map registry recipes to the full Recipe type
const mapToFullRecipe = (rawRecipe: any): Recipe => {
  // Basic validation for essential fields
  if (typeof rawRecipe.id !== 'number' || !rawRecipe.name || typeof rawRecipe.name !== 'string') {
    console.warn('Skipping invalid raw recipe data:', rawRecipe);
    return {
        id: -1, name: 'Invalid Recipe Data', calories: 0, protein: 0, carbs: 0, fat: 0,
        servings: 0, ingredients: [], instructions: [], prepTime: '', cookTime: '',
        macrosPerServing: { calories: 0, protein: 0, carbs: 0, fat: 0 },
        image: 'https://placehold.co/600x400/007bff/ffffff.png?text=Error', // Blue placeholder for invalid data
        description: "This recipe data was invalid and could not be loaded."
    } as Recipe;
  }

  return {
    id: rawRecipe.id,
    name: rawRecipe.name,
    calories: typeof rawRecipe.calories === 'number' ? rawRecipe.calories : 0,
    protein: typeof rawRecipe.protein === 'number' ? rawRecipe.protein : 0,
    carbs: typeof rawRecipe.carbs === 'number' ? rawRecipe.carbs : 0,
    fat: typeof rawRecipe.fat === 'number' ? rawRecipe.fat : 0,
    servings: typeof rawRecipe.servings === 'number' && rawRecipe.servings > 0 ? rawRecipe.servings : 1,
    ingredients: Array.isArray(rawRecipe.ingredients) ? rawRecipe.ingredients : [],
    tags: Array.isArray(rawRecipe.tags) ? rawRecipe.tags : [],
    prepTime: typeof rawRecipe.prepTime === 'string' ? rawRecipe.prepTime : "N/A",
    cookTime: typeof rawRecipe.cookTime === 'string' ? rawRecipe.cookTime : "N/A",
    chillTime: typeof rawRecipe.chillTime === 'string' ? rawRecipe.chillTime : undefined,
    instructions: Array.isArray(rawRecipe.instructions) ? rawRecipe.instructions : [],
    macrosPerServing: {
      calories: typeof rawRecipe.calories === 'number' ? rawRecipe.calories : 0,
      protein: typeof rawRecipe.protein === 'number' ? rawRecipe.protein : 0,
      carbs: typeof rawRecipe.carbs === 'number' ? rawRecipe.carbs : 0,
      fat: typeof rawRecipe.fat === 'number' ? rawRecipe.fat : 0,
    },
    // Use existing image if provided, otherwise construct path to /public/images/{id}.jpg
    image: rawRecipe.image || `/images/${rawRecipe.id}.jpg`,
    description: rawRecipe.description || "No description available.",
  };
};

const allRegisteredRecipesFull: Recipe[] = getAllRecipesFromRegistry()
  .map(mapToFullRecipe)
  .filter(recipe => recipe.id !== -1); // Filter out any invalid recipes marked by mapToFullRecipe

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

const KNOWN_UNITS_REGEX_PART = "(?:cups?|tbsp|tablespoons?|tsp|teaspoons?|g|grams?|kg|kilograms?|ml|milliliters?|L|liters?|oz|ounces?|cans?|bunches?|cloves?|stalks?|sprigs?|slices?|sheets?|fillets?|heads?|eggs?|scoops?)";

const DESCRIPTOR_SUFFIXES_ARRAY = [
  'peeled', 'chopped', 'diced', 'sliced', 'minced', 'grated', 'crushed', 'trimmed', 'halved', 'quartered',
  'rinsed', 'drained', 'frozen', 'fresh', 'cooked', 'uncooked', 'ripe', 'large', 'medium', 'small',
  'thin', 'thinly', 'finely', 'coarsely', 'skinless', 'boneless', 'canned', 'tinned', 'shelled', 'raw',
  'plus extra', 'plus more', 'for garnish', 'to serve', 'to taste', 'optional', 'room temperature',
  'softened', 'melted', 'unsalted', 'unsweetened', 'light', 'full fat', 'reduced fat', 'lean', 'extra lean',
  'natural', 'organic', 'heaping', 'rounded-sm', 'scant', 'ends trimmed', 'cut into chunks',
  'cut into pieces', 'cut into strips', 'cut into bite-size pieces', 'white parts only', 'green part',
  'flesh only', 'tough bottoms removed', 'core removed', 'seeds removed', 'stems removed', 'skin removed',
  'skin on', 'bone-in', 'in brine', 'in olive oil', 'in water', 'in juice', 'with liquid', 'including juices',
  'rehydrated', 'store bought or homemade', 'unthawed', 'boneless and skinless', 'boneless, skinless',
  'pitted', 'deseeded', 'without stone',
  // compound terms
  'thinly sliced', 'finely chopped', 'coarsely grated', 'cut into matchsticks', 'peeled and chopped',
  'peeled and diced', 'peeled and sliced', 'peeled and grated',
  'drained and rinsed', 'rinsed and drained',
  'skin on', 'skin off', 'bone in', 'bone out', 'seeds removed', 'stems removed', 'core removed'
];
DESCRIPTOR_SUFFIXES_ARRAY.sort((a, b) => b.length - a.length); // Important: match longer phrases first
const suffixPatternString = `,?\\s*(?:${DESCRIPTOR_SUFFIXES_ARRAY.join('|').replace(/\s/g, '\\s*')}|\\(.*?\\))(\\s+(?:${DESCRIPTOR_SUFFIXES_ARRAY.join('|').replace(/\s/g, '\\s*')}))*$`;
const suffixPatternGlobalString = `(?:,?\\s*(?:${DESCRIPTOR_SUFFIXES_ARRAY.join('|').replace(/\s/g, '\\s*')}|\\(.*?\\)))+`;


export const parseIngredientString = (ingredientString: string): { name: string; quantity: number; unit: string } => {
  let cleanedString = ingredientString.replace(/\./g, ''); // Keep commas for now for better splitting later
  
  const mainRegex = new RegExp(`^(\\d+\\s*\\/?\\s*\\d*|\\d*\\s?½|\\d*\\s?¼|\\d*\\s?¾)?\\s*(${KNOWN_UNITS_REGEX_PART})?\\s*(of\\s+)?(.*)$`, 'i');
  const match = cleanedString.match(mainRegex);

  let quantity = 1;
  let unit = 'item(s)';
  let name = ingredientString.trim();

  if (match) {
    const qtyStr = match[1] ? match[1].trim() : null;
    const unitStr = match[2] ? match[2].trim().replace(/\.$/, '') : null;
    const namePart = match[4] ? match[4].trim() : '';

    if (qtyStr) {
      if (qtyStr.includes('½')) quantity = (parseFloat(qtyStr.replace('½','').trim() || "0") + 0.5) || 0.5;
      else if (qtyStr.includes('¼')) quantity = (parseFloat(qtyStr.replace('¼','').trim() || "0") + 0.25) || 0.25;
      else if (qtyStr.includes('¾')) quantity = (parseFloat(qtyStr.replace('¾','').trim() || "0") + 0.75) || 0.75;
      else if (qtyStr.includes('/')) {
        const parts = qtyStr.split('/');
        if (parts.length === 2) {
          const num = parseFloat(parts[0]);
          const den = parseFloat(parts[1]);
          quantity = (!isNaN(num) && !isNaN(den) && den !== 0) ? num / den : 1;
        }
      } else {
        quantity = parseFloat(qtyStr) || 1;
      }
    }
    
    if (unitStr) {
      unit = unitStr;
    }
    
    name = namePart || (unitStr ? ingredientString.split(unitStr)[1] || ingredientString : ingredientString).trim();
    if (name.toLowerCase().startsWith('of ')) {
      name = name.substring(3).trim();
    }
     // If name seems to still contain the quantity and unit, it means the regex didn't separate it well.
     // This happens if no unit was matched by KNOWN_UNITS_REGEX_PART but a quantity was.
     if (qtyStr && !unitStr && name.startsWith(qtyStr)) {
        name = name.substring(qtyStr.length).trim();
     }


  } else {
     // Fallback if the main regex fails, try to get at least quantity if it's simple "2 apples"
     const simpleQtyMatch = ingredientString.match(/^(\d+)\s+(.*)/);
     if (simpleQtyMatch) {
       quantity = parseInt(simpleQtyMatch[1], 10);
       name = simpleQtyMatch[2].trim();
       // unit remains 'item(s)'
     } else {
       // If all else fails, the whole string is the name
       name = ingredientString.trim();
     }
  }
  
  // Normalize Unit
  const unitLower = unit.toLowerCase();
  if (['tbsp', 'tablespoon', 'tablespoons'].includes(unitLower)) unit = 'tbsp';
  else if (['tsp', 'teaspoon', 'teaspoons'].includes(unitLower)) unit = 'tsp';
  else if (['g', 'gram', 'grams'].includes(unitLower)) unit = 'g';
  else if (['ml', 'milliliter', 'milliliters'].includes(unitLower)) unit = 'ml';
  else if (['l', 'liter', 'liters'].includes(unitLower)) unit = 'L';
  else if (['kg', 'kilogram', 'kilograms'].includes(unitLower)) unit = 'kg';
  else if (['oz', 'ounce', 'ounces'].includes(unitLower)) unit = 'oz.';
  else if (['cup', 'cups'].includes(unitLower)) unit = 'cup';
  else if (['can', 'cans'].includes(unitLower)) unit = 'can';
  else if (['scoop', 'scoops'].includes(unitLower)) unit = 'scoop';
  else if (['egg', 'eggs'].includes(unitLower)) {
      unit = 'egg'; 
      if (name.toLowerCase().includes('egg')) name = 'egg';
  } else if (!KNOWN_UNITS_REGEX_PART.includes(unitLower) && unit !== 'item(s)') { 
      // If unit is some other word but not a known one, it might be part of the name
      name = `${unit} ${name}`.trim();
      unit = 'item(s)';
  }


  // Clean Name (multi-stage)
  name = name.replace(/\(\s*[^)]*\s*\)/g, '').trim(); // Remove anything in parentheses e.g. (optional), (14oz./400g)

  // Remove specific phrases like "pitted", "without stone" globally
  name = name.replace(/,?\s*(pitted|deseeded|without stone|skin on|skin off|bone in|bone out)\s*,?/gi, '').trim();
  
  // Iteratively remove descriptor suffixes. This is more robust for multiple descriptors.
  let oldName;
  const suffixRemovalPattern = new RegExp(suffixPatternString, 'i');
  do {
    oldName = name;
    name = name.replace(suffixRemovalPattern, '').trim();
    name = name.replace(/,$/, '').trim(); // Clean trailing comma
  } while (name !== oldName && name.length > 0);

  // More general cleanup of common prep words if they are standalone or after comma
  const generalDescriptorPattern = new RegExp(`(?:^|,)\\s*(?:${DESCRIPTOR_SUFFIXES_ARRAY.join('|').replace(/\s/g, '\\s*')})\\b`, 'gi');
  name = name.replace(generalDescriptorPattern, '').trim();
  name = name.replace(/^,/, '').trim(); // Clean leading comma

  name = name.replace(/\s+/g, ' ').trim(); // Consolidate multiple spaces

  // If after all that, name is empty but unit implies name (like 'egg'), use unit as name.
  if (!name.trim() && (unit.toLowerCase() === 'egg')) {
      name = 'egg';
  }
  // If name ended up empty, and original string had some content, use a cleaned version of original.
  if (!name.trim() && ingredientString.trim()) {
      name = ingredientString.trim().split(',')[0].trim(); // take first part before a comma
      // And re-apply some basic cleanup
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


export const generateShoppingList = (plannedMeals: PlannedMeal[], recipesSource?: Recipe[], pantryItems: PantryItem[] = []): ShoppingListItem[] => {
  const ingredientMap = new Map<string, ShoppingListItem>();
  const recipesToUse = recipesSource && recipesSource.length > 0 ? recipesSource : allRegisteredRecipesFull;
  
  // Create a mutable copy of pantry quantities for this calculation session
  const tempPantryQuantities = new Map<string, number>();
  pantryItems.forEach(item => {
    tempPantryQuantities.set(item.id, item.quantity); // item.id is already mapKey format
  });

  plannedMeals.forEach(plannedMeal => {
    const recipe = plannedMeal.recipeDetails || recipesToUse.find(r => r.id === plannedMeal.recipeId);
    if (recipe) {
      recipe.ingredients.forEach(ingredientString => {
        const parsed = parseIngredientString(ingredientString);
        if (!parsed.name || parsed.name.trim() === "" || parsed.name.toLowerCase() === "unknown ingredient") return; 

        let requiredQuantityForMeal = parsed.quantity * plannedMeal.servings;
        const mapKey = `${parsed.name.toLowerCase().trim()}|${parsed.unit.toLowerCase().trim()}`;

        let quantityToAddToShoppingList = requiredQuantityForMeal;

        // Check against tempPantryQuantities and update
        const currentPantryQty = tempPantryQuantities.get(mapKey);
        if (currentPantryQty !== undefined && currentPantryQty > 0) {
          if (currentPantryQty >= requiredQuantityForMeal) {
            quantityToAddToShoppingList = 0; // Fully covered by pantry
            tempPantryQuantities.set(mapKey, parseFloat((currentPantryQty - requiredQuantityForMeal).toFixed(2))); // Reduce available pantry qty
          } else {
            quantityToAddToShoppingList = parseFloat((requiredQuantityForMeal - currentPantryQty).toFixed(2)); // Partially covered
            tempPantryQuantities.set(mapKey, 0); // All pantry qty used up
          }
        }
        
        quantityToAddToShoppingList = parseFloat(quantityToAddToShoppingList.toFixed(2));

        if (quantityToAddToShoppingList > 0) {
          const existingShoppingItem = ingredientMap.get(mapKey);
          const category = assignCategory(parsed.name);

          if (existingShoppingItem) {
            existingShoppingItem.quantity += quantityToAddToShoppingList;
            existingShoppingItem.quantity = parseFloat(existingShoppingItem.quantity.toFixed(2));
            if (!existingShoppingItem.recipes.find(r => r.recipeId === recipe.id)) {
              existingShoppingItem.recipes.push({ recipeId: recipe.id, recipeName: recipe.name });
            }
          } else {
            ingredientMap.set(mapKey, {
              id: mapKey,
              name: parsed.name,
              quantity: quantityToAddToShoppingList,
              unit: parsed.unit,
              category: category,
              purchased: false,
              recipes: [{ recipeId: recipe.id, recipeName: recipe.name }],
            });
          }
        }
      });
    }
  });
  return Array.from(ingredientMap.values()).sort((a,b) => {
    if (a.category < b.category) return -1;
    if (a.category > b.category) return 1;
    return a.name.localeCompare(b.name);
  });
};
