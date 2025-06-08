
import type { Recipe, Macros, MealType, PlannedMeal, ShoppingListItem } from '@/types';

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
    calories: 377, // Assuming per serving
    protein: 21,  // Assuming per serving
    carbs: 22,   // Assuming per serving
    fat: 22,     // Assuming per serving
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
    description: "A classic Spanish tortilla with a healthy zucchini twist." // Added example description
  },
  {
    id: 2,
    name: "Omelet Wraps",
    calories: 237, // Assuming per serving
    protein: 20,  // Assuming per serving
    carbs: 3,    // Assuming per serving
    fat: 15,     // Assuming per serving
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
    description: "Versatile omelet wraps perfect for a light meal or snack." // Added example description
  },
  // Add more recipes here following the new structure
  // Example adapted from old structure:
  {
    id: 3,
    name: 'Chicken Stir-fry with Broccoli',
    calories: 455, // Assuming per serving
    protein: 45,   // Assuming per serving
    carbs: 35,    // Assuming per serving
    fat: 15,      // Assuming per serving
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
      // Assuming macrosPerServing is already calculated correctly for one serving of the recipe
      // and plannedMeal.servings is how many of those standard servings the user plans to eat.
      const servingsMultiplier = plannedMeal.servings / recipe.servings;
      
      // If recipe.macrosPerServing is for "recipe.servings" number of portions,
      // and plannedMeal.servings is the actual number of portions the user will eat.
      // E.g. recipe says it makes 4 servings, macrosPerServing is for 1 of those 4.
      // User plans to eat 2 of those 4 (plannedMeal.servings = 2).
      // So total macros for user is macrosPerServing * 2.

      // If the top-level calorie/protein/fat in Recipe type is for THE WHOLE RECIPE (i.e. for recipe.servings portions),
      // then macrosPerServing should be (total recipe macros / recipe.servings).
      // And the final calculation would be: (recipe.macrosPerServing.calories * plannedMeal.servings)
      // This seems to be the most logical interpretation.
      // The `createRecipeFromNewFormat` already sets `macrosPerServing` as the top-level values,
      // assuming they are per-serving. If they are total for `recipe.servings`, that helper needs adjustment.
      // For now, assuming the values in `mockRecipesInput` for cal,pro,carb,fat ARE PER SERVING.

      // If the macros in Recipe are per default serving, and user plans 'plannedMeal.servings'
      // of those default servings.
      acc.calories += recipe.macrosPerServing.calories * plannedMeal.servings;
      acc.protein += recipe.macrosPerServing.protein * plannedMeal.servings;
      acc.carbs += recipe.macrosPerServing.carbs * plannedMeal.servings;
      acc.fat += recipe.macrosPerServing.fat * plannedMeal.servings;
    }
    return acc;
  }, { protein: 0, carbs: 0, fat: 0, calories: 0 });
};

export const generateShoppingList = (plannedMeals: PlannedMeal[]): ShoppingListItem[] => {
  const ingredientMap = new Map<string, ShoppingListItem>();

  plannedMeals.forEach(plannedMeal => {
    const recipe = getRecipeById(plannedMeal.recipeId);
    if (recipe) {
      // Since recipe.ingredients is now string[], we can't accurately sum quantities or get categories.
      // We will list each ingredient string as a separate item, or count occurrences if they are identical strings.
      // For simplicity, we'll aim to list unique ingredient strings and how many recipes they are in.
      // The plannedMeal.servings multiplier is tricky without structured quantities.
      // We'll just list the ingredient as needed for the recipe.

      recipe.ingredients.forEach(ingredientString => {
        const itemId = ingredientString.toLowerCase(); // Use the string itself as an ID
        const existingItem = ingredientMap.get(itemId);

        if (existingItem) {
          // Increment if needed, or simply ensure it's on the list
          // For now, let's just make sure it's linked to all relevant recipes
          if (!existingItem.recipes.find(r => r.recipeId === recipe.id)) {
            existingItem.recipes.push({ recipeId: recipe.id, recipeName: recipe.name });
          }
           // We can't sum quantities properly anymore with string ingredients.
           // Defaulting quantity to 1 to signify "needed".
          existingItem.quantity = Math.max(existingItem.quantity, 1);
        } else {
          ingredientMap.set(itemId, {
            id: itemId,
            name: ingredientString, // The full ingredient string
            quantity: 1, // Default quantity
            unit: 'item(s)', // Default unit
            category: 'Uncategorized', // Default category
            purchased: false,
            recipes: [{ recipeId: recipe.id, recipeName: recipe.name }],
          });
        }
      });
    }
  });
  // Sort by name as category is now less reliable
  return Array.from(ingredientMap.values()).sort((a,b) => a.name.localeCompare(b.name));
};
