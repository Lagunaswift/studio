import Fuse from 'fuse.js';
import { normalizeIngredientName } from '../../utils/ingredient';

// Comprehensive ingredient database with variations and normalization
const INGREDIENT_DATABASE = [
  { 
    canonical: 'milk', 
    variations: ['whole milk', 'skim milk', 'low-fat milk', 'dairy milk'],
    categories: ['dairy']
  },
  { 
    canonical: 'chicken', 
    variations: ['chicken breast', 'chicken thighs', 'ground chicken'],
    categories: ['meat', 'protein']
  },
  { 
    canonical: 'flour', 
    variations: ['all-purpose flour', 'wheat flour', 'bread flour'],
    categories: ['baking', 'pantry']
  },
  // Add more ingredients with their variations
];

// Create a Fuse instance for fuzzy searching
const fuse = new Fuse(INGREDIENT_DATABASE, {
  keys: ['canonical', 'variations'],
  includeScore: true,
  threshold: 0.4, // Adjust sensitivity of fuzzy matching
});

/**
 * Advanced ingredient matching with fuzzy search and user feedback
 * @param {string} inputIngredient Raw ingredient name entered by user
 * @returns {Object} Matching result with exact or suggested matches
 */
export function advancedIngredientMatch(inputIngredient) {
  // Normalize input
  const normalizedInput = normalizeIngredientName(inputIngredient);

  // Exact match first
  const exactMatch = INGREDIENT_DATABASE.find(
    item => 
      normalizeIngredientName(item.canonical) === normalizedInput ||
      item.variations.some(v => normalizeIngredientName(v) === normalizedInput)
  );

  if (exactMatch) {
    return {
      exact: true,
      match: exactMatch.canonical
    };
  }

  // Fuzzy matching
  const fuzzyResults = fuse.search(inputIngredient);
  
  // If good fuzzy matches found
  if (fuzzyResults.length > 0) {
    const topSuggestions = fuzzyResults
      .slice(0, 3) // Top 3 suggestions
      .map(result => result.item.canonical);

    return {
      exact: false,
      suggestions: topSuggestions
    };
  }

  // No match found
  return {
    exact: false,
    suggestions: []
  };
}

/**
 * User feedback mechanism to improve matching
 */
class IngredientMatchingFeedbackSystem {
  constructor() {
    this.userCorrections = new Map();
    this.userSuggestions = new Map();
  }

  /**
   * Record user's correction for a specific ingredient
   * @param {string} originalInput User's original input
   * @param {string} correctedName Correct ingredient name
   */
  recordCorrection(originalInput, correctedName) {
    const normalizedOriginal = normalizeIngredientName(originalInput);
    const normalizedCorrected = normalizeIngredientName(correctedName);

    this.userCorrections.set(normalizedOriginal, normalizedCorrected);
  }

  /**
   * Record user's suggestions for improving matching
   * @param {string} originalInput User's original input
   * @param {string[]} suggestedVariations Suggested variations
   */
  recordSuggestion(originalInput, suggestedVariations) {
    const normalizedOriginal = normalizeIngredientName(originalInput);
    this.userSuggestions.set(normalizedOriginal, suggestedVariations);
  }

  /**
   * Periodically update the ingredient database with user feedback
   */
  updateIngredientDatabase() {
    // In a real-world scenario, this would send data to a backend service
    // that could update the INGREDIENT_DATABASE
    this.userCorrections.forEach((corrected, original) => {
      // Logic to add or update ingredient variations
      const existingEntry = INGREDIENT_DATABASE.find(
        item => normalizeIngredientName(item.canonical) === corrected
      );

      if (existingEntry) {
        if (!existingEntry.variations.includes(original)) {
          existingEntry.variations.push(original);
        }
      }
    });

    // Reset after processing
    this.userCorrections.clear();
    this.userSuggestions.clear();
  }
}

// Export for use in pantry and shopping list components
export const ingredientMatchingFeedback = new IngredientMatchingFeedbackSystem();

/**
 * Enhanced pantry matching with user feedback integration
 * @param {string} ingredientName Ingredient to match
 * @param {Object} pantryItems Current pantry items
 * @returns {boolean} Whether the ingredient is in the pantry
 */
export function enhancedPantryMatch(ingredientName, pantryItems) {
  const matchResult = advancedIngredientMatch(ingredientName);
  
  if (matchResult.exact) {
    return Object.keys(pantryItems).some(
      item => normalizeIngredientName(item) === normalizeIngredientName(matchResult.match || '')
    );
  }

  if (matchResult.suggestions && matchResult.suggestions.length > 0) {
    return matchResult.suggestions.some(suggestion => 
      Object.keys(pantryItems).some(
        item => normalizeIngredientName(item) === normalizeIngredientName(suggestion)
      )
    );
  }

  return false;
}
