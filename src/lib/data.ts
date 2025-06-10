
import type { Recipe, Macros, MealType, PlannedMeal, ShoppingListItem, UKSupermarketCategory } from '@/types';
// Removed Firestore imports: import { db } from '@/lib/firebase';
// Removed Firestore imports: import { collection, getDocs, query, where, doc, getDoc, limit } from 'firebase/firestore';

// Helper to create a full Recipe object from the new partial structure
// This remains for the initial mock data.
const createRecipeFromNewFormat = (data: Omit<Recipe, 'macrosPerServing' | 'image' | 'description'> & { description?: string, image?: string }): Recipe => {
  return {
    ...data,
    description: data.description || "No description available.",
    image: data.image || 'https://placehold.co/600x400.png',
    macrosPerServing: {
      calories: data.calories,
      protein: data.protein,
      carbs: data.carbs,
      fat: data.fat,
    },
  };
};

// Kept for migration script - user will import this
export const mockRecipesInput: Array<Omit<Recipe, 'macrosPerServing' | 'image' | 'description'> & { description?: string, image?: string }> = [
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
    name: "Egg & Turkey Stuffed Peppers",
    calories: 329,
    protein: 43,
    carbs: 11,
    fat: 12,
    servings: 4,
    ingredients: [
      "4 eggs",
      "4 egg whites",
      "2 tbsp almond milk",
      "1 tsp coconut oil",
      "1 small onion, chopped",
      "450g lean ground turkey",
      "2 tsp oregano",
      "1 tsp cumin",
      "2 cups (60g) spinach, chopped",
      "4 red medium bell peppers",
      "½ cup (50g) cheese (dairy or plant-based)",
      "parsley, chopped to serve"
    ],
    tags: ["GF", "LC", "MP", "HP", "Q"],
    prepTime: "5 mins",
    cookTime: "20 mins",
    instructions: [
      "Heat oven to 400°F (200°C).",
      "Beat the eggs, egg whites and milk, then set aside.",
      "Heat the coconut oil in a pan over medium heat. Add the onion and cook for 3 minutes until softened and browned.",
      "Add in the turkey, oregano and cumin, season with salt and pepper. Cook until meat is cooked through, about 5 minutes. Then add the spinach, and mix until it wilts about 2 minutes.",
      "Increase the heat and add in the eggs. Pull the eggs across the skillet with a spatula. Repeat for about 3 minutes until eggs are cooked. Then set aside.",
      "Cut the peppers horizontally and remove the seeds, then stuff with the scrambled eggs and turkey.",
      "Place the peppers in a baking dish and sprinkle them with grated cheese.",
      "Bake in the oven for 15 minutes, until cheese has melted and the edges have browned.",
      "To serve, sprinkle with chopped parsley."
    ],
    description: "Flavorful and protein-packed stuffed peppers."
  },
  {
    id: 4,
    name: "Smoked Salmon, Feta & Asparagus Omelet",
    calories: 302,
    protein: 20,
    carbs: 6,
    fat: 21,
    servings: 2,
    ingredients: [
      "125g asparagus",
      "1 tsp coconut oil",
      "3 large eggs",
      "70ml milk, plant or dairy",
      "60g smoked salmon, cut into pieces",
      "30g feta cheese, cubed",
      "4 cherry tomatoes, halved",
      "dill, to serve"
    ],
    tags: ["GF", "LC", "MP", "Q", "HP"],
    prepTime: "10 mins",
    cookTime: "15 mins",
    instructions: [
      "Wash the asparagus, break off the hard ends then discard (they will break themselves in the right place). Cut the softer stalks diagonally to about ½ cm pieces.",
      "Boil in lightly salted water for about 2 minutes, then strain and set aside.",
      "In a bowl, whisk eggs with the milk, salt and pepper. Add asparagus, salmon and cubed cheese, mix everything well.",
      "Heat the oven to 350°F (180°C). Heat the oil in a pan (diameter of approx. 24cm) over medium heat, and pour in the egg mixture. Rearrange the toppings if necessary. Top with the halved cherry tomatoes (cut end up).",
      "Cover the pan with a lid and cook until the mass is set for about 5 minutes. Then place in the oven (without cover), and cook for another 6-10 minutes, until the mass sets.",
      "To serve sprinkle with fresh dill and season with freshly ground black pepper."
    ],
    description: "A delicious and satisfying omelet with salmon and feta."
  },
  {
    id: 5,
    name: "High Protein Blueberry Pancakes",
    calories: 257,
    protein: 36,
    carbs: 18,
    fat: 5,
    servings: 1,
    ingredients: [
      "¼ cup liquid egg whites (around 4 eggs)",
      "1 scoop (25g) of vanilla whey powder",
      "½ banana, mashed",
      "almond milk, if needed",
      "¼ cup (25g) fresh or frozen blueberries",
      "½ tsp coconut oil"
    ],
    tags: ["GF", "LC", "HP", "V", "Q", "N"],
    prepTime: "5 mins",
    cookTime: "10 mins",
    instructions: [
      "Whisk together the egg whites and protein powder.",
      "Stir in the mashed banana and add the blueberries. If the pancake mixture seems too thick, add a splash of almond milk to thin it.",
      "Heat the coconut oil in a pan to low-medium. Pour in the pancake mixture and cook until little bubbles form (about 5 minutes).",
      "Make sure the pancake has set enough before you try flipping it, then flip over. Cook the pancake for another 2-3 minutes.",
      "You can also make 3 small pancakes instead of 1 large.",
      "Serve with your favorite toppings."
    ],
    description: "Fluffy, protein-rich pancakes with blueberries."
  },
  {
    id: 6,
    name: "Eggs Fried On Tomatoes With Tuna",
    calories: 307,
    protein: 32,
    carbs: 8,
    fat: 15,
    servings: 1,
    ingredients: [
      "1 large tomato",
      "1 tsp coconut oil",
      "2 eggs",
      "3 oz. (80g) tuna in brine",
      "pinch of oregano",
      "pinch of chili flakes",
      "parsley, chopped, to serve"
    ],
    tags: ["GF", "LC", "MP", "Q", "HP"],
    prepTime: "5 mins",
    cookTime: "10 mins",
    instructions: [
      "Slice the tomato into ½ inch thick slices. Heat the oil in a pan, and fry the tomato slices on both sides for about 2 minutes.",
      "Place the fried tomato slices on a plate, leaving the remaining oil in the pan.",
      "Fry the eggs to your preference in the same pan. Place on top of the tomatoes.",
      "Season with salt, pepper, oregano and chili flakes. Add the tuna to the plate. Sprinkle with fresh parsley and serve."
    ],
    description: "A quick and savory meal with eggs, tomatoes, and tuna."
  },
  // Add more recipes from your other chunks here
];

export const mockRecipesData: Recipe[] = mockRecipesInput.map(createRecipeFromNewFormat);


export const MEAL_TYPES: MealType[] = ["Breakfast", "Lunch", "Dinner", "Snack"];

// Fetches all recipes. Now uses mock data.
export const getAllRecipes = async (): Promise<Recipe[]> => {
  // Simulate async fetching for now
  return Promise.resolve(mockRecipesData);
};

// Fetches a single recipe by its numeric ID. Now uses mock data.
export const getRecipeById = async (id: number): Promise<Recipe | undefined> => {
  const foundRecipe = mockRecipesData.find(recipe => recipe.id === id);
  // Simulate async fetching
  return Promise.resolve(foundRecipe);
};


export const calculateTotalMacros = (plannedMeals: PlannedMeal[], allRecipesCache?: Recipe[]): Macros => {
  const recipesToUse = allRecipesCache && allRecipesCache.length > 0 ? allRecipesCache : mockRecipesData;
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
  "Fresh Fruit & Vegetables": ["apple", "orange", "banana", "berries", "grapes", "melon", "pear", "plum", "avocado", "potato", "onion", "garlic", "ginger", "carrot", "broccoli", "spinach", "lettuce", "cabbage", "peppers", "tomato", "cucumber", "zucchini", "courgette", "aubergine", "mushroom", "corn", "peas", "beans (fresh)", "lemon", "lime", "herb (fresh)", "watercress", "spring onion", "leek", "florets", "asparagus"],
  "Bakery": ["bread", "baguette", "rolls", "croissant", "bagel", "muffin", "cake", "pastry", "wrap", "tortilla (bread)"],
  "Meat & Poultry": ["chicken", "beef", "pork", "lamb", "turkey", "mince", "sausage", "bacon", "ham", "steak", "gammon", "ground turkey"],
  "Fish & Seafood": ["salmon", "cod", "haddock", "tuna", "mackerel", "prawns", "shrimp", "scallops", "mussels", "fish", "smoked salmon"],
  "Dairy, Butter & Eggs": ["milk", "cheese", "cheddar", "mozzarella", "yogurt", "yoghurt", "butter", "cream", "eggs", "cottage cheese", "creme fraiche", "soy milk", "almond milk", "feta cheese", "egg whites", "plant or dairy"],
  "Chilled Foods": ["deli meat", "cooked meat", "pate", "fresh pasta", "fresh soup", "ready meal", "quiche", "coleslaw", "houmous", "hummus", "dip", "tofu"],
  "Frozen Foods": ["frozen peas", "frozen corn", "frozen chips", "frozen fruit", "ice cream", "frozen pizza", "frozen vegetables", "frozen blueberries"],
  "Food Cupboard": ["pasta (dried)", "rice", "noodles", "flour", "sugar", "salt", "pepper", "spice", "herbs (dried)", "oil (olive, vegetable, sunflower, coconut, sesame)", "vinegar", "tinned tomatoes", "canned tomatoes", "tinned beans", "canned beans", "lentils", "chickpeas", "soup (canned/packet)", "stock cube", "bouillon", "jam", "honey", "peanut butter", "cereal", "oats", "biscuits", "crackers", "tea", "coffee", "hot chocolate", "soy sauce", "ketchup", "mayonnaise", "mustard", "nuts", "seeds", "dried fruit", "whey powder", "oregano", "cumin", "chili flakes", "mixed herbs", "coconut oil", "vanilla whey powder"],
  "Drinks": ["water", "juice", "soda", "fizzy drink", "cordial", "squash"],
  "Other Food Items": ["parsley", "dill"] // Added dill
};

const parseIngredientString = (ingredientString: string): { name: string; quantity: number; unit: string } => {
  const cleanedString = ingredientString.replace(/,/g, '').replace(/\./g, ''); 
  
  const regex = /^(\d+\s*\/?\s*\d*|\d*\s?½)\s*([a-zA-Zμ]+(?:cup|tbsp|tsp|g|kg|ml|L|oz)?\.?)\s*(.*)$/i;
  const match = cleanedString.match(regex);

  let quantity = 1;
  let unit = 'item(s)';
  let name = ingredientString.trim(); 

  if (match) {
    const qtyStr = match[1].trim();
    if (qtyStr.includes('½')) {
        const parts = qtyStr.split(' ');
        quantity = parseFloat(parts[0] || "0") + 0.5;
    } else if (qtyStr.includes('/')) {
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

    unit = match[2] ? match[2].trim().replace(/\.$/, '') : 'item(s)'; 
    name = match[3] ? match[3].trim() : ingredientString.trim(); 
    
    if (name.toLowerCase().startsWith(unit.toLowerCase() + " ")) {
        name = name.substring(unit.length + 1).trim();
    }
  } else {
     const simpleQtyMatch = ingredientString.match(/^(\d+)\s+(.*)/);
     if (simpleQtyMatch) {
       quantity = parseInt(simpleQtyMatch[1], 10);
       name = simpleQtyMatch[2].trim();
       unit = 'item(s)'; 
     } else {
       name = ingredientString.trim();
     }
  }
  
  const unitLower = unit.toLowerCase();
  if (['tbsp', 'tablespoon', 'tablespoons'].includes(unitLower)) unit = 'tbsp';
  else if (['tsp', 'teaspoon', 'teaspoons'].includes(unitLower)) unit = 'tsp';
  else if (['g', 'gram', 'grams'].includes(unitLower)) unit = 'g';
  else if (['ml', 'milliliter', 'milliliters'].includes(unitLower)) unit = 'ml';
  else if (['l', 'liter', 'liters'].includes(unitLower)) unit = 'L';
  else if (['kg', 'kilogram', 'kilograms'].includes(unitLower)) unit = 'kg';
  else if (['oz', 'ounce', 'ounces'].includes(unitLower)) unit = 'oz.';
  else if (unitLower === 'cup' || unitLower === 'cups') unit = 'cup';


  if (!name && ingredientString) name = ingredientString.trim();
  if (name.toLowerCase() === unit.toLowerCase() && unit !== 'item(s)') {
      const parts = ingredientString.split(new RegExp(`\\s*${unit.replace(/\\.$/, '')}\\.?\\s*`, 'i'));
      if (parts.length > 1) name = parts.filter(p => p.trim() !== "").pop()?.trim() || ingredientString.trim();
      else name = ingredientString.trim();
  }
  if (name.toLowerCase().startsWith('of ')) {
    name = name.substring(3).trim();
  }

  // Specific fix for "around 4 eggs" type patterns
  if (name.toLowerCase().includes("(around") && name.toLowerCase().includes("eggs)")) {
    name = "eggs"; // Standardize name
    const eggQtyMatch = ingredientString.match(/around\s*(\d+)\s*eggs/i);
    if (eggQtyMatch && eggQtyMatch[1]) {
        quantity = parseInt(eggQtyMatch[1], 10);
        unit = "item(s)";
    }
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


export const generateShoppingList = (plannedMeals: PlannedMeal[], allRecipesCache?: Recipe[]): ShoppingListItem[] => {
  const ingredientMap = new Map<string, ShoppingListItem>();
  const recipesToUse = allRecipesCache && allRecipesCache.length > 0 ? allRecipesCache : mockRecipesData;

  plannedMeals.forEach(plannedMeal => {
    const recipe = plannedMeal.recipeDetails || recipesToUse.find(r => r.id === plannedMeal.recipeId);
    if (recipe) {
      recipe.ingredients.forEach(ingredientString => {
        const parsed = parseIngredientString(ingredientString);
        const mapKey = parsed.name.toLowerCase(); 
        const existingItem = ingredientMap.get(mapKey);
        const category = assignCategory(parsed.name);
        const quantityToAdd = parsed.quantity * plannedMeal.servings;

        if (existingItem) {
          if (existingItem.unit.toLowerCase() === parsed.unit.toLowerCase()) {
            existingItem.quantity += quantityToAdd;
          } else {
            const variantMapKey = `${parsed.name} (${parsed.unit})`.toLowerCase();
            const variantExistingItem = ingredientMap.get(variantMapKey);
            if(variantExistingItem){
                variantExistingItem.quantity += quantityToAdd;
                 if (!variantExistingItem.recipes.find(r => r.recipeId === recipe.id)) {
                    variantExistingItem.recipes.push({ recipeId: recipe.id, recipeName: recipe.name });
                 }
            } else {
                ingredientMap.set(variantMapKey, {
                    id: variantMapKey,
                    name: `${parsed.name} (${parsed.unit})`,
                    quantity: quantityToAdd,
                    unit: parsed.unit,
                    category: category,
                    purchased: false,
                    recipes: [{ recipeId: recipe.id, recipeName: recipe.name }],
                });
            }
          }
          if (existingItem.unit.toLowerCase() === parsed.unit.toLowerCase() && !existingItem.recipes.find(r => r.recipeId === recipe.id)) {
            existingItem.recipes.push({ recipeId: recipe.id, recipeName: recipe.name });
          }
        } else {
          ingredientMap.set(mapKey, {
            id: mapKey, 
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

    
