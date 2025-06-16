// Import recipe chunks
import recipesChunk1 from './data/recipes-1';
import recipesChunk2 from './data/recipes-2';
import recipesChunk3 from './data/recipes-3';
import recipesChunk4 from './data/recipes-4';
import recipesChunk5 from './data/recipes-5';
import recipesChunk6 from './data/recipes-6';

// Internal state
const allRecipes = [];
const recipeMap = {};
const mainMeals = [];
const snacks = [];

// Initialize function - called immediately
function initializeRegistry() {
  // Clear existing data in case this runs more than once
  allRecipes.length = 0;
  Object.keys(recipeMap).forEach(key => delete recipeMap[key]);
  mainMeals.length = 0;
  snacks.length = 0;
  
  // Process all recipe chunks
  const recipeChunks = [
    recipesChunk1,
    recipesChunk2,
    recipesChunk3,
    recipesChunk4,
    recipesChunk5,
    recipesChunk6
  ];
  
  recipeChunks.forEach(chunk => {
    if (Array.isArray(chunk)) {
      chunk.forEach(recipe => {
        if (recipe && recipe.id && !recipeMap[recipe.id]) {
          // Add to main collection
          allRecipes.push(recipe);
          recipeMap[recipe.id] = recipe;
          
          // Categorize
          if (recipe.tags && recipe.tags.includes('S')) {
            snacks.push(recipe);
          } else {
            mainMeals.push(recipe);
          }
        }
      });
    }
  });
  
  console.log(`Registry initialized with ${allRecipes.length} recipes`);
}

// Run initialization immediately
initializeRegistry();

// Export accessor functions
export function getAllRecipes() {
  return [...allRecipes]; // Return copy to prevent mutation
}

export function getRecipeById(id) {
  // Handle string IDs by converting to number
  const numId = typeof id === 'string' ? parseInt(id, 10) : id;
  return recipeMap[numId] || null;
}

export function getMainMeals() {
  return [...mainMeals];
}

export function getSnacks() {
  return [...snacks];
}

export function searchRecipes(query, context = 'all') {
  if (!query) return getAllRecipes();
  
  const searchTerm = query.toLowerCase();
  const searchPool = 
    context === 'meals' ? mainMeals :
    context === 'snacks' ? snacks :
    allRecipes;
  
  return searchPool.filter(recipe => {
    // Search by name
    if (recipe.name.toLowerCase().includes(searchTerm)) {
      return true;
    }
    
    // Search by ingredients
    if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
      return recipe.ingredients.some(ingredient => 
        typeof ingredient === 'string' && 
        ingredient.toLowerCase().includes(searchTerm)
      );
    }
    
    return false;
  });
}

// Export default
export default allRecipes;
