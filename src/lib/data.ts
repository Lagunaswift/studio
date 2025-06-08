
import type { Recipe, Macros, MealType, PlannedMeal, ShoppingListItem, UKSupermarketCategory } from '@/types';

// Helper to create a full Recipe object from the new partial structure
const createRecipeFromNewFormat = (data: Omit<Recipe, 'macrosPerServing' | 'image' | 'description'> & { description?: string, image?: string }): Recipe => {
  return {
    ...data,
    description: data.description || "No description available.", // Default description
    image: data.image || 'https://placehold.co/600x400.png', // Default image
    macrosPerServing: {
      calories: data.calories,
      protein: data.protein,
      carbs: data.carbs,
      fat: data.fat,
    },
  };
};

const mockRecipesInput: Array<Omit<Recipe, 'macrosPerServing' | 'image' | 'description'> & { description?: string, image?: string }> = [
  {
    id: 1,
    name: "Spanish Zucchini Tortilla",
    calories: 377, 
    protein: 21,  
    carbs: 22,   
    fat: 22,     
    servings: 2,
    ingredients: [
      "1 tbsp. olive oil",
      "1 small potato, peeled, chopped",
      "1 small onion, chopped",
      "½ small zucchini, thinly sliced",
      "6 eggs"
    ],
    tags: ["GF", "DF", "LC", "HP", "Q"],
    prepTime: "10 mins",
    cookTime: "15 mins",
    chillTime: "1 hr",
    instructions: [
     "Heat oil in a non-stick pan and sear the potato and onion over medium-high heat, for about 4 minutes. Next, add the zucchini and sauté for another 4minutes.",
     "In a bowl, whisk eggs and season with salt and pepper. Transfer the vegetables from the pan into the bowl and mix well.",
     "Using the same pan, add the egg mixture on low heat and make sure everything is evenly distributed. After about 3 minutes, run a spatula through the outer edges of the tortilla to make sure it does not stick to the pan.",
    "After 8-10 minutes, flip the tortilla this might take more or less, depending on heat, size and pan, using a plate over the pan. Slide the uncooked part back into the pan.",
    "After another 5-6 minutes, the tortilla should becooked. Remove from heat and serve"
    ],
    description: "A classic Spanish tortilla with a healthy zucchini twist." 
  },
  {
    id: 2,
    name: "Omelet Wraps",
    calories: 237, 
    protein: 20,  
    carbs: 3,    
    fat: 15,     
    servings: 4,
    ingredients: [
      "200g cottage cheese",
      "4 handfuls watercress",
      "1 lemon, peel only",
      "6 eggs",
      "60ml soy milk",
      "1 tsp mixed herbs",
      "4 tsp coconut oil",
      "100g smoked salmon, chopped"
    ],
    tags: ["GF", "DF", "LC", "Q", "HP"],
    prepTime: "15 mins",
    cookTime: "10 mins",
    instructions: [
      "Place the cottage cheese, watercress and lemon peel in a high bowl and puree with the hand blender (or food processor) until smooth paste forms.",
      "Beat the eggs with the milk and herbs in a separate bowl.",
      "Heat 1 tsp of oil in the medium size frying pan and fry ¼ of the egg over medium heat for 2 minutes until the egg solidifies, then turn around. Bake the other side for ½ minute.",
      "Remove the omelet from the pan and set aside. Fry the other omelets with the rest of the oil.",
      "To serve, spread the cottage cheese paste over the omelets and top with smoked salmon. Roll up the omelet as a wrap and cut in half."
    ],
    description: "Versatile omelet wraps perfect for a light meal or snack."
  },
  {
    id: 3,
    name: 'Chicken Stir-fry with Broccoli',
    calories: 455, 
    protein: 45,   
    carbs: 35,    
    fat: 15,      
    servings: 2,
    prepTime: '15 mins',
    cookTime: '15 mins',
    ingredients: [
      '300g Chicken Breast, sliced',
      '200g Broccoli Florets',
      '2 tbsp Soy Sauce',
      '1 tbsp Sesame Oil',
      '2 cloves Garlic, chopped',
      '1 inch Ginger, chopped',
      '1 cup Brown Rice (cooked), for serving',
    ],
    instructions: [
      'Slice chicken breast into strips.',
      'Chop broccoli, garlic, and ginger.',
      'Heat sesame oil in a wok or large skillet over medium-high heat.',
      'Add chicken and cook until browned.',
      'Add garlic and ginger, cook for 1 minute until fragrant.',
      'Add broccoli and stir-fry for 3-5 minutes until tender-crisp.',
      'Stir in soy sauce. Serve over brown rice.',
    ],
    tags: ['quick', 'high-protein', 'asian'],
    description: 'A quick and healthy chicken stir-fry packed with protein and vegetables.'
  },
];

const mockRecipesData: Recipe[] = mockRecipesInput.map(createRecipeFromNewFormat);

export const MEAL_TYPES: MealType[] = ["Breakfast", "Lunch", "Dinner", "Snack"];

export const getRecipeById = (id: number): Recipe | undefined => {
  return mockRecipesData.find(recipe => recipe.id === id);
};

export const getAllRecipes = async (): Promise<Recipe[]> => {
  return Promise.resolve(mockRecipesData);
};

export const calculateTotalMacros = (plannedMeals: PlannedMeal[]): Macros => {
  return plannedMeals.reduce((acc, plannedMeal) => {
    const recipe = getRecipeById(plannedMeal.recipeId);
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
  "Fresh Fruit & Vegetables": ["apple", "orange", "banana", "berries", "grapes", "melon", "pear", "plum", "avocado", "potato", "onion", "garlic", "ginger", "carrot", "broccoli", "spinach", "lettuce", "cabbage", "peppers", "tomato", "cucumber", "zucchini", "courgette", "aubergine", "mushroom", "corn", "peas", "beans (fresh)", "lemon", "lime", "herb (fresh)", "watercress", "spring onion", "leek", "florets"],
  "Bakery": ["bread", "baguette", "rolls", "croissant", "bagel", "muffin", "cake", "pastry", "wrap", "tortilla (bread)"],
  "Meat & Poultry": ["chicken", "beef", "pork", "lamb", "turkey", "mince", "sausage", "bacon", "ham", "steak", "gammon"],
  "Fish & Seafood": ["salmon", "cod", "haddock", "tuna", "mackerel", "prawns", "shrimp", "scallops", "mussels", "fish"],
  "Dairy, Butter & Eggs": ["milk", "cheese", "cheddar", "mozzarella", "yogurt", "yoghurt", "butter", "cream", "eggs", "cottage cheese", "creme fraiche", "soy milk"],
  "Chilled Foods": ["deli meat", "cooked meat", "pate", "fresh pasta", "fresh soup", "ready meal", "quiche", "coleslaw", "houmous", "hummus", "dip", "tofu"],
  "Frozen Foods": ["frozen peas", "frozen corn", "frozen chips", "frozen fruit", "ice cream", "frozen pizza", "frozen vegetables"],
  "Food Cupboard": ["pasta (dried)", "rice", "noodles", "flour", "sugar", "salt", "pepper", "spice", "herbs (dried)", "oil (olive, vegetable, sunflower, coconut, sesame)", "vinegar", "tinned tomatoes", "canned tomatoes", "tinned beans", "canned beans", "lentils", "chickpeas", "soup (canned/packet)", "stock cube", "bouillon", "jam", "honey", "peanut butter", "cereal", "oats", "biscuits", "crackers", "tea", "coffee", "hot chocolate", "soy sauce", "ketchup", "mayonnaise", "mustard", "nuts", "seeds", "dried fruit"],
  "Drinks": ["water", "juice", "soda", "fizzy drink", "cordial", "squash"],
  "Other Food Items": [] // Fallback
};

// Naive ingredient parser
const parseIngredientString = (ingredientString: string): { name: string; quantity: number; unit: string } => {
  const cleanedString = ingredientString.replace(/,/g, '').replace(/\./g, ''); // Remove commas and periods for easier parsing
  
  // Regex to capture quantity (number), unit (alphabetic, can include 'tbsp', 'tsp'), and name
  const regex = /^(\d+\s*\/?\s*\d*)\s*([a-zA-Z]+)?\s*(.*)$/;
  const match = cleanedString.match(regex);

  let quantity = 1;
  let unit = 'item(s)';
  let name = ingredientString.trim(); // Default to original string if no parse

  if (match) {
    // Handle quantity (e.g., "1", "1/2", "1 1/2")
    const qtyStr = match[1].trim();
    if (qtyStr.includes('/')) {
      const parts = qtyStr.split('/');
      if (parts.length === 2) {
        const num = parseFloat(parts[0]);
        const den = parseFloat(parts[1]);
        if (!isNaN(num) && !isNaN(den) && den !== 0) {
          quantity = num / den;
        }
      }
    } else {
      quantity = parseFloat(qtyStr) || 1;
    }

    unit = match[2] ? match[2].trim() : 'item(s)';
    name = match[3] ? match[3].trim() : ingredientString.trim(); // Use rest as name
    
    // Refine name if unit was part of it (e.g. "cloves Garlic" -> name: "Garlic", unit: "cloves")
    if (name.toLowerCase().startsWith(unit.toLowerCase() + " ")) {
        name = name.substring(unit.length + 1).trim();
    }
    
    // Special case for "½"
    if (qtyStr === '½') quantity = 0.5;


  } else {
     // Fallback for strings without a leading number, e.g. "Salt to taste"
     // Or "a pinch of salt" - these are hard to quantify. For now, 1 item.
     name = ingredientString.trim();
  }
  
  // Normalize common units
  if (['tbsp', 'tablespoon', 'tablespoons'].includes(unit.toLowerCase())) unit = 'tbsp';
  if (['tsp', 'teaspoon', 'teaspoons'].includes(unit.toLowerCase())) unit = 'tsp';
  if (['g', 'gram', 'grams'].includes(unit.toLowerCase())) unit = 'g';
  if (['ml', 'milliliter', 'milliliters'].includes(unit.toLowerCase())) unit = 'ml';
  if (['l', 'liter', 'liters'].includes(unit.toLowerCase())) unit = 'L';
  if (['kg', 'kilogram', 'kilograms'].includes(unit.toLowerCase())) unit = 'kg';


  // If name is empty after parsing, use the original string for safety
  if (!name && ingredientString) name = ingredientString.trim();
  // If name only contains the unit, it's likely an error, try to extract from original more broadly
  if (name.toLowerCase() === unit.toLowerCase() && unit !== 'item(s)') {
      const parts = ingredientString.split(new RegExp(`\\s*${unit}\\s*`, 'i'));
      if (parts.length > 1) name = parts[1].trim();
      else name = ingredientString.trim();
  }


  return { name: name.charAt(0).toUpperCase() + name.slice(1), quantity, unit };
};


const assignCategory = (ingredientName: string): UKSupermarketCategory => {
  const lowerIngredientName = ingredientName.toLowerCase();
  for (const category in categoryKeywords) {
    const keywords = categoryKeywords[category as UKSupermarketCategory];
    if (keywords.some(keyword => lowerIngredientName.includes(keyword))) {
      return category as UKSupermarketCategory;
    }
  }
  return "Other Food Items";
};


export const generateShoppingList = (plannedMeals: PlannedMeal[]): ShoppingListItem[] => {
  const ingredientMap = new Map<string, ShoppingListItem>();

  plannedMeals.forEach(plannedMeal => {
    const recipe = getRecipeById(plannedMeal.recipeId);
    if (recipe) {
      recipe.ingredients.forEach(ingredientString => {
        const parsed = parseIngredientString(ingredientString);
        // Use parsed.name for map key to group similar items even if original string had notes
        const mapKey = parsed.name.toLowerCase(); 
        const existingItem = ingredientMap.get(mapKey);
        const category = assignCategory(parsed.name);
        const quantityToAdd = parsed.quantity * plannedMeal.servings;

        if (existingItem) {
          // Simple quantity addition if units are the same.
          // More complex unit conversion (e.g., tbsp to ml, g to kg) is not handled here.
          if (existingItem.unit.toLowerCase() === parsed.unit.toLowerCase()) {
            existingItem.quantity += quantityToAdd;
          } else {
            // If units differ, add as a new item variant or handle more gracefully.
            // For now, we'll just log this or add a new entry with a modified key.
            // This simple aggregation just adds recipe link.
            // To truly sum quantities, unit conversion is needed. For now, we just list.
            // The best is to make the key more specific if units can't be reconciled.
            // Let's just update the recipe list for now.
            // A more robust approach would create a new item or convert units.
          }
          if (!existingItem.recipes.find(r => r.recipeId === recipe.id)) {
            existingItem.recipes.push({ recipeId: recipe.id, recipeName: recipe.name });
          }
        } else {
          ingredientMap.set(mapKey, {
            id: mapKey, // Use parsed name as ID
            name: parsed.name, 
            quantity: quantityToAdd, 
            unit: parsed.unit, 
            category: category,
            purchased: false,
            recipes: [{ recipeId: recipe.id, recipeName: recipe.name }],
          });
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
