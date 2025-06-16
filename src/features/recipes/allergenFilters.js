// Comprehensive allergen filter handling
// We use multiple strategies for each allergen:
// 1. Look for explicit "free" tags first (if they exist)
// 2. Infer from dietary tags (vegetarian, vegan)
// 3. Check ingredient lists and recipe names for allergen keywords

// Keyword lists for allergen detection
const allergenKeywords = {
    gluten: ['gluten', 'wheat', 'barley', 'rye', 'flour', 'pasta', 'bread', 'pizza', 'pastry', 'cake', 'cookie', 'cracker', 'beer', 'soy sauce', 'bulgur', 'couscous', 'seitan'],
    dairy: ['milk', 'cheese', 'butter', 'cream', 'yogurt', 'yoghurt', 'whey', 'casein', 'lactose', 'ghee', 'custard', 'pudding', 'ice cream', 'sour cream'],
    nuts: ['nut', 'almond', 'walnut', 'pecan', 'cashew', 'pistachio', 'hazelnut', 'macadamia', 'peanut', 'pine nut'],
    eggs: ['egg', 'omelet', 'quiche', 'frittata', 'meringue', 'mayonnaise', 'custard'],
    soy: ['soy', 'tofu', 'tempeh', 'edamame', 'soya', 'miso', 'tamari', 'soy sauce', 'soy milk'],
    fish: ['fish', 'salmon', 'tuna', 'cod', 'tilapia', 'haddock', 'trout', 'sardine', 'anchovy', 'mahi', 'halibut', 'bass', 'snapper', 'mackerel', 'herring', 'caviar'],
    shellfish: ['shellfish', 'shrimp', 'prawn', 'crab', 'lobster', 'scallop', 'mussel', 'clam', 'oyster', 'crayfish', 'langoustine', 'crawfish', 'calamari'],
    wheat: ['wheat', 'flour', 'bread', 'pasta', 'couscous', 'bulgur', 'cracker', 'biscuit', 'cake', 'pastry', 'pizza', 'cereal', 'ramen', 'noodle', 'pita', 'tortilla', 'bun', 'roll']
  };
  
  // Helper function to check if a recipe contains any keywords
  const containsKeywords = (recipe, keywordList) => {
    // Check if recipe is valid
    if (!recipe) {
      return false;
    }
    
    // Check if recipe name exists and is a string
    if (!recipe.name || typeof recipe.name !== 'string') {
      return false;
    }
    
    const nameLower = recipe.name.toLowerCase();
    
    // Check recipe name
    if (keywordList.some(keyword => nameLower.includes(keyword))) {
      return true;
    }
    
    // Check ingredients if available
    if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
      return recipe.ingredients.some(ingredient => {
        // Add null check for ingredients
        if (!ingredient || typeof ingredient !== 'string') {
          return false;
        }
        
        const ingredientLower = ingredient.toLowerCase();
        return keywordList.some(keyword => ingredientLower.includes(keyword));
      });
    }
    
    return false;
  };
  
  // Common tags your recipes already use
  const commonTags = {
    'GF': 'Gluten Free',
    'DF': 'Dairy Free',
    'V': 'Vegetarian',
    'VG': 'Vegan', 
    'HP': 'High Protein',
    'LC': 'Low Carb',
    'Q': 'Quick',
    'MP': 'Meal Prep',
    'N': 'Contains Nuts'
  };
  
  // Map allergen filters to tag handling strategy
  const allergenFilterStrategy = {
    // No gluten
    'no-gluten': (recipe) => {
      // Check if recipe is valid with tags
      if (!recipe || !recipe.tags || !Array.isArray(recipe.tags)) {
        return false;
      }
      
      // If explicitly tagged as gluten-free, include it
      if (recipe.tags.includes('GF')) return true;
      
      // Exclude based on keywords
      return !containsKeywords(recipe, allergenKeywords.gluten);
    },
    
    // No dairy
    'no-dairy': (recipe) => {
      // Check if recipe is valid with tags
      if (!recipe || !recipe.tags || !Array.isArray(recipe.tags)) {
        return false;
      }
      
      // If explicitly tagged as dairy-free or vegan, include it
      if (recipe.tags.includes('DF') || recipe.tags.includes('VG')) return true;
      
      // Exclude based on keywords
      return !containsKeywords(recipe, allergenKeywords.dairy);
    },
    
    // No nuts
    'no-nuts': (recipe) => {
      // Check if recipe is valid with tags
      if (!recipe || !recipe.tags || !Array.isArray(recipe.tags)) {
        return false;
      }
      
      // If explicitly tagged as containing nuts, exclude it
      if (recipe.tags.includes('N')) return false;
      
      // Exclude based on keywords
      return !containsKeywords(recipe, allergenKeywords.nuts);
    },
    
    // No eggs
    'no-eggs': (recipe) => {
      // Check if recipe is valid with tags
      if (!recipe || !recipe.tags || !Array.isArray(recipe.tags)) {
        return false;
      }
      
      // Vegan recipes don't contain eggs
      if (recipe.tags.includes('VG')) return true;
      
      // Exclude based on keywords
      return !containsKeywords(recipe, allergenKeywords.eggs);
    },
    
    // No soy
    'no-soy': (recipe) => {
      // Check if recipe is valid
      if (!recipe) {
        return false;
      }
      
      // Exclude based on keywords
      return !containsKeywords(recipe, allergenKeywords.soy);
    },
    
    // No fish
    'no-fish': (recipe) => {
      // Check if recipe is valid with tags
      if (!recipe || !recipe.tags || !Array.isArray(recipe.tags)) {
        return false;
      }
      
      // Vegetarian and vegan recipes don't contain fish
      if (recipe.tags.includes('V') || recipe.tags.includes('VG')) return true;
      
      // Exclude based on keywords
      return !containsKeywords(recipe, allergenKeywords.fish);
    },
    
    // No shellfish
    'no-shellfish': (recipe) => {
      // Check if recipe is valid with tags
      if (!recipe || !recipe.tags || !Array.isArray(recipe.tags)) {
        return false;
      }
      
      // Vegetarian and vegan recipes don't contain shellfish
      if (recipe.tags.includes('V') || recipe.tags.includes('VG')) return true;
      
      // Exclude based on keywords
      return !containsKeywords(recipe, allergenKeywords.shellfish);
    },
    
    // No wheat
    'no-wheat': (recipe) => {
      // Check if recipe is valid with tags
      if (!recipe || !recipe.tags || !Array.isArray(recipe.tags)) {
        return false;
      }
      
      // Gluten-free recipes are also wheat-free
      if (recipe.tags.includes('GF')) return true;
      
      // Exclude based on keywords
      return !containsKeywords(recipe, allergenKeywords.wheat);
    }
  };
  
  /**
   * Filters recipes based on diet tags, allergen filters, and search text
   * 
   * @param {string} type - 'meals' or 'snacks'
   * @param {Array} allRecipes - All available recipes
   * @param {Array} activeFilters - Diet filters (e.g., 'GF', 'V', 'LC')
   * @param {Array} activeAllergenFilters - Allergen filters (e.g., 'no-gluten', 'no-dairy')
   * @param {string} searchText - Text to search for in recipe names
   * @returns {Array} - Filtered recipes
   */
  export function getFilteredRecipesWithAllergens(type, allRecipes, activeFilters = [], activeAllergenFilters = [], searchText = '') {
    // Ensure we have a valid array of recipes
    if (!allRecipes || !Array.isArray(allRecipes)) {
      return [];
    }
    
    // Filter by meal type, with defensive checks
    let filtered = type === 'meals' 
      ? allRecipes.filter(r => r && r.tags && Array.isArray(r.tags) && !r.tags.includes('S')) 
      : allRecipes.filter(r => r && r.tags && Array.isArray(r.tags) && r.tags.includes('S'));
    
    // Apply active diet filters with defensive checks
    if (activeFilters && activeFilters.length > 0) {
      filtered = filtered.filter(recipe => 
        recipe && recipe.tags && Array.isArray(recipe.tags) && 
        activeFilters.every(filter => recipe.tags.includes(filter))
      );
    }
    
    // Apply allergen filters using the strategy pattern
    if (activeAllergenFilters && activeAllergenFilters.length > 0) {
      filtered = filtered.filter(recipe => {
        if (!recipe) return false;
        
        return activeAllergenFilters.every(allergenFilter => {
          // Use the appropriate strategy function for this allergen filter
          const strategyFn = allergenFilterStrategy[allergenFilter];
          
          // If we don't have a strategy for this allergen filter, assume it passes
          if (!strategyFn) return true;
          
          // Apply the strategy function to this recipe
          return strategyFn(recipe);
        });
      });
    }
    
    // Apply text search filter if provided
    if (searchText && typeof searchText === 'string' && searchText.trim() !== '') {
      const searchLower = searchText.toLowerCase().trim();
      filtered = filtered.filter(recipe => {
        if (!recipe) return false;
        
        // Check name contains search text
        const nameMatches = recipe.name && 
                            typeof recipe.name === 'string' && 
                            recipe.name.toLowerCase().includes(searchLower);
        
        // Check tags contain search text
        const tagMatches = recipe.tags && 
                           Array.isArray(recipe.tags) && 
                           recipe.tags.some(tag => 
                             tag && typeof tag === 'string' && 
                             tag.toLowerCase().includes(searchLower)
                           );
                           
        return nameMatches || tagMatches;
      });
    }
    
    return filtered;
  }