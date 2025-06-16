import { enhancedPantryMatch } from './ingredient-matching-enhanced';

/**
 * Check if an ingredient is in the pantry using the enhanced matching system.
 * @param {string} ingredient - Raw ingredient name
 * @param {Object} pantryItems - Pantry inventory (keys are ingredient names)
 * @returns {boolean} True if a match is found, false otherwise.
 */

/**
 * Extract the base ingredient name from an ingredient string
 * @param {string} ingredient - Raw ingredient string
 * @returns {string} Base ingredient name without measurements
 */

export function checkPantryMatch(ingredient, pantryItems) {
  return enhancedPantryMatch(ingredient, pantryItems);
}

export function extractBaseIngredient(ingredient) {
  if (!ingredient || typeof ingredient !== 'string') return '';
  
  // Remove quantity and units like "2 cups" or "1 tbsp"
  return ingredient.replace(/^(\d+\/\d+|\d+\.\d+|\d+)\s*(tsp|tbsp|cup|cups|oz|lb|g|kg|ml|l|teaspoon|tablespoon|ounce|pound|gram|milliliter|liter)\.?\s*/i, '')
                  .replace(/^\s*of\s+/, '') // Remove "of" phrase like "2 cups of flour" → "flour"
                  .trim();
}


