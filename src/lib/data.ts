import type { Recipe, Macros, Ingredient, MealType, PlannedMeal, ShoppingListItem } from '@/types';

const mockRecipesData: Recipe[] = [
  {
    id: '1',
    name: 'Chicken Stir-fry with Broccoli',
    description: 'A quick and healthy chicken stir-fry packed with protein and vegetables.',
    image: 'https://placehold.co/600x400.png',
    servings: 2,
    prepTime: '15 mins',
    cookTime: '15 mins',
    ingredients: [
      { name: 'Chicken Breast', quantity: 300, unit: 'g', category: 'Meat' },
      { name: 'Broccoli Florets', quantity: 200, unit: 'g', category: 'Produce' },
      { name: 'Soy Sauce', quantity: 2, unit: 'tbsp', category: 'Pantry' },
      { name: 'Sesame Oil', quantity: 1, unit: 'tbsp', category: 'Pantry' },
      { name: 'Garlic', quantity: 2, unit: 'cloves', category: 'Produce' },
      { name: 'Ginger', quantity: 1, unit: 'inch', category: 'Produce' },
      { name: 'Brown Rice (cooked)', quantity: 1, unit: 'cup', category: 'Pantry' },
    ],
    macrosPerServing: { protein: 45, carbs: 35, fat: 15, calories: 455 },
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
  },
  {
    id: '2',
    name: 'Salmon with Roasted Asparagus',
    description: 'Flavorful baked salmon with tender roasted asparagus.',
    image: 'https://placehold.co/600x400.png',
    servings: 1,
    prepTime: '10 mins',
    cookTime: '20 mins',
    ingredients: [
      { name: 'Salmon Fillet', quantity: 150, unit: 'g', category: 'Seafood' },
      { name: 'Asparagus', quantity: 150, unit: 'g', category: 'Produce' },
      { name: 'Olive Oil', quantity: 1, unit: 'tbsp', category: 'Pantry' },
      { name: 'Lemon', quantity: 0.5, unit: 'fruit', category: 'Produce' },
      { name: 'Salt', quantity: 0.25, unit: 'tsp', category: 'Pantry' },
      { name: 'Black Pepper', quantity: 0.125, unit: 'tsp', category: 'Pantry' },
    ],
    macrosPerServing: { protein: 35, carbs: 10, fat: 25, calories: 405 },
    instructions: [
      'Preheat oven to 200°C (400°F).',
      'Toss asparagus with half the olive oil, salt, and pepper. Spread on a baking sheet.',
      'Season salmon fillet with salt, pepper, and remaining olive oil. Place on the same baking sheet.',
      'Roast for 12-15 minutes, or until salmon is cooked through and asparagus is tender.',
      'Squeeze fresh lemon juice over salmon and asparagus before serving.',
    ],
    tags: ['healthy', 'omega-3', 'low-carb'],
  },
  {
    id: '3',
    name: 'Quinoa Salad with Chickpeas and Feta',
    description: 'A refreshing and protein-rich quinoa salad.',
    image: 'https://placehold.co/600x400.png',
    servings: 2,
    prepTime: '20 mins',
    cookTime: '15 mins (for quinoa)',
    ingredients: [
      { name: 'Quinoa (uncooked)', quantity: 0.5, unit: 'cup', category: 'Pantry' },
      { name: 'Chickpeas (canned, rinsed)', quantity: 1, unit: 'cup', category: 'Pantry' },
      { name: 'Cucumber', quantity: 0.5, unit: 'large', category: 'Produce' },
      { name: 'Cherry Tomatoes', quantity: 1, unit: 'cup', category: 'Produce' },
      { name: 'Red Onion', quantity: 0.25, unit: 'medium', category: 'Produce' },
      { name: 'Feta Cheese', quantity: 50, unit: 'g', category: 'Dairy' },
      { name: 'Fresh Parsley', quantity: 0.25, unit: 'cup', category: 'Produce' },
      { name: 'Lemon Juice', quantity: 2, unit: 'tbsp', category: 'Produce' },
      { name: 'Olive Oil', quantity: 1, unit: 'tbsp', category: 'Pantry' },
    ],
    macrosPerServing: { protein: 18, carbs: 55, fat: 15, calories: 427 },
    instructions: [
      'Cook quinoa according to package directions. Let cool.',
      'Dice cucumber, halve cherry tomatoes, and finely chop red onion and parsley.',
      'In a large bowl, combine cooked quinoa, chickpeas, cucumber, tomatoes, red onion, and parsley.',
      'Crumble feta cheese over the salad.',
      'In a small bowl, whisk together lemon juice and olive oil. Pour over the salad and toss to combine.',
      'Season with salt and pepper to taste.',
    ],
    tags: ['vegetarian', 'salad', 'high-fiber'],
  },
  {
    id: '4',
    name: 'Greek Yogurt with Berries and Nuts',
    description: 'A simple and nutritious breakfast or snack.',
    image: 'https://placehold.co/600x400.png',
    servings: 1,
    prepTime: '5 mins',
    cookTime: '0 mins',
    ingredients: [
      { name: 'Greek Yogurt (plain)', quantity: 1, unit: 'cup', category: 'Dairy' },
      { name: 'Mixed Berries (fresh or frozen)', quantity: 0.5, unit: 'cup', category: 'Produce' },
      { name: 'Almonds (slivered)', quantity: 2, unit: 'tbsp', category: 'Pantry' },
      { name: 'Honey (optional)', quantity: 1, unit: 'tsp', category: 'Pantry' },
    ],
    macrosPerServing: { protein: 22, carbs: 20, fat: 12, calories: 276 },
    instructions: [
      'Spoon Greek yogurt into a bowl.',
      'Top with mixed berries and slivered almonds.',
      'Drizzle with honey if desired.',
    ],
    tags: ['breakfast', 'snack', 'quick', 'high-protein'],
  },
];

// Add data-ai-hint attributes to mock recipe images
mockRecipesData.forEach(recipe => {
  if (recipe.image === 'https://placehold.co/600x400.png') {
    const keywords = recipe.name.toLowerCase().split(' ').slice(0, 2).join(' ');
    // @ts-ignore
    recipe['data-ai-hint'] = keywords;
  }
});

export const MEAL_TYPES: MealType[] = ["Breakfast", "Lunch", "Dinner", "Snack"];

/**
 * Retrieves a recipe by its ID.
 * For now, it fetches from mock data. In the future, this could fetch from a database.
 * NOTE: This function is currently synchronous. When integrating a database,
 * it will likely become asynchronous (returning a Promise).
 */
export const getRecipeById = (id: string): Recipe | undefined => {
  return mockRecipesData.find(recipe => recipe.id === id);
};

/**
 * Retrieves all recipes.
 * For now, it fetches from mock data. In the future, this would fetch from a database.
 */
export const getAllRecipes = async (): Promise<Recipe[]> => {
  // Simulate API delay
  // await new Promise(resolve => setTimeout(resolve, 500));
  return Promise.resolve(mockRecipesData);
};


export const calculateTotalMacros = (plannedMeals: PlannedMeal[]): Macros => {
  return plannedMeals.reduce((acc, plannedMeal) => {
    const recipe = getRecipeById(plannedMeal.recipeId);
    if (recipe) {
      const servingsRatio = plannedMeal.servings / recipe.servings;
      acc.calories += recipe.macrosPerServing.calories * servingsRatio;
      acc.protein += recipe.macrosPerServing.protein * servingsRatio;
      acc.carbs += recipe.macrosPerServing.carbs * servingsRatio;
      acc.fat += recipe.macrosPerServing.fat * servingsRatio;
    }
    return acc;
  }, { protein: 0, carbs: 0, fat: 0, calories: 0 });
};

export const generateShoppingList = (plannedMeals: PlannedMeal[]): ShoppingListItem[] => {
  const ingredientMap = new Map<string, ShoppingListItem>();

  plannedMeals.forEach(plannedMeal => {
    const recipe = getRecipeById(plannedMeal.recipeId);
    if (recipe) {
      const servingsMultiplier = plannedMeal.servings / recipe.servings;
      recipe.ingredients.forEach(ingredient => {
        const itemId = `${ingredient.name.toLowerCase()}_${ingredient.unit.toLowerCase()}`;
        const existingItem = ingredientMap.get(itemId);
        const quantityToAdd = ingredient.quantity * servingsMultiplier;

        if (existingItem) {
          existingItem.quantity += quantityToAdd;
          if (!existingItem.recipes.find(r => r.recipeId === recipe.id)) {
            existingItem.recipes.push({ recipeId: recipe.id, recipeName: recipe.name });
          }
        } else {
          ingredientMap.set(itemId, {
            id: itemId,
            name: ingredient.name,
            quantity: quantityToAdd,
            unit: ingredient.unit,
            category: ingredient.category,
            purchased: false,
            recipes: [{ recipeId: recipe.id, recipeName: recipe.name }],
          });
        }
      });
    }
  });

  return Array.from(ingredientMap.values()).sort((a,b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
};
