// scripts/convert-recipes.js
// Create this file in your project's 'scripts' folder.

const fs = require('fs');
const path = require('path');

// --- START: Copy relevant code from src/lib/data.ts ---
// Paste the unitMap, nameMap, descriptors, descriptorRegex,
// parseQuantity, parseIngredientString,
// volumeConversionRates, massConversionRates, densityMap, standardizeIngredient
// functions and constants here directly from src/lib/data.ts

// --- Constants & Maps (from src/lib/data.ts) ---
const unitMap = new Map([
  ['cup', 'cup'], ['cups', 'cup'], ['c', 'cup'],
  ['tablespoon', 'tbsp'], ['tablespoons', 'tbsp'], ['tbsp', 'tbsp'], ['tbs', 'tbsp'],
  ['teaspoon', 'tsp'], ['teaspoons', 'tsp'], ['tsp', 'tsp'],
  ['milliliter', 'ml'], ['milliliters', 'ml'], ['ml', 'ml'],
  ['liter', 'l'], ['liters', 'l'], ['l', 'l'],
  ['ounce', 'oz'], ['ounces', 'oz'], ['oz', 'oz'], ['fl oz', 'oz'], ['fluid ounce', 'oz'],
  ['pint', 'pt'], ['pints', 'pt'], ['pt', 'pt'],
  ['quart', 'qt'], ['quarts', 'qt'], ['qt', 'qt'],
  ['gallon', 'gal'], ['gallons', 'gal'], ['gal', 'gal'],
  ['gram', 'g'], ['grams', 'g'], ['g', 'g'],
  ['kilogram', 'kg'], ['kilograms', 'kg'], ['kg', 'kg'],
  ['pound', 'lb'], ['pounds', 'lb'], ['lbs', 'lb'],
  ['clove', 'clove'], ['cloves', 'clove'], ['cl', 'clove'],
  ['packet', 'packet'], ['packets', 'packet'], ['pkt', 'packet'],
  ['head', 'head'],
  ['bunch', 'bunch'],
  ['sprig', 'sprig'],
  ['stalk', 'stalk'],
  ['slice', 'slice'], ['slices', 'slice'],
  ['piece', 'piece'], ['pieces', 'piece'],
  ['fillet', 'fillet'], ['fillets', 'fillet'],
  ['can', 'can'], ['cans', 'can'],
  ['dash', 'dash'],
  ['pinch', 'pinch'],
  ['splash', 'splash'],
  ['handful', 'handful'],
]);

const nameMap = new Map([
  ['extra virgin olive oil', 'olive oil'],
  ['yellow onion', 'onion'], ['red onion', 'onion'], ['white onion', 'onion'], ['onions', 'onion'],
  ['scallion', 'spring onion'], ['scallions', 'spring onion'], ['green onion', 'spring onion'], ['green onions', 'spring onion'],
  ['chicken breast fillets', 'chicken breast'], ['chicken breasts', 'chicken breast'], ['skinless boneless chicken breast', 'chicken breast'],
  ['chicken thighs', 'chicken thigh'],
  ['cherry tomatoes', 'tomato'], ['plum tomatoes', 'tomato'], ['canned tomatoes', 'tomato'], ['diced tomatoes', 'tomato'], ['tomatoes', 'tomato'],
  ['ground beef', 'beef mince'], ['lean ground beef', 'beef mince'],
  ['ground turkey', 'turkey mince'],
  ['parmesan cheese', 'parmesan'], ['parmigiano-reggiano', 'parmesan'],
  ['grated cheddar', 'cheddar cheese'], ['cheddar', 'cheddar cheese'],
  ['coriander', 'cilantro'],
  ['courgette', 'zucchini'],
  ['bell peppers', 'bell pepper'], ['red bell pepper', 'bell pepper'], ['green bell pepper', 'bell pepper'],
  ['potatoes', 'potato'], ['baby potatoes', 'potato'],
  ['soy sauce', 'soy sauce'], ['tamari', 'soy sauce'],
  ['chilli', 'chili pepper'], ['chillies', 'chili pepper'], ['chili', 'chili pepper'],
  ['almonds', 'almond'],
  ['walnuts', 'walnut'],
  ['eggs', 'egg'],
]);

const descriptors = [
  'fresh', 'organic', 'dried', 'canned', 'frozen', 'cooked',
  'chopped', 'diced', 'sliced', 'minced', 'grated', 'crushed',
  'finely', 'thinly', 'roughly',
  'large', 'medium', 'small',
  'ripe', 'peeled', 'seeded', 'pitted',
  'unsalted', 'salted', 'sweetened', 'unsweetened',
  'whole', 'halved', 'quartered',
  'all-purpose', 'all purpose',
  'toasted', 'roasted',
  'optional', 'for garnish',
  'drained', 'rinsed',
  'skinless', 'boneless',
  'room temperature',
];
const descriptorRegex = new RegExp(`\\b(${descriptors.join('|')})\\b`, 'gi');

const volumeConversionRates = { // to ml
  'cup': 236.588, 'tbsp': 14.787, 'tsp': 4.929, 'oz': 29.574,
  'l': 1000, 'ml': 1, 'pt': 473.176, 'qt': 946.353, 'gal': 3785.41,
};
const massConversionRates = { // to g
  'kg': 1000, 'lb': 453.592, 'oz': 28.35, 'g': 1,
};
const densityMap = {
  'flour': 0.529, 'sugar': 0.845, 'brown sugar': 0.93, 'butter': 0.911,
  'olive oil': 0.916, 'water': 1.0, 'milk': 1.03, 'honey': 1.42,
};

function parseQuantity(text) {
  const trimmed = text.trim();
  if (!trimmed) return 1;

  const mixedNumberMatch = trimmed.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixedNumberMatch) {
    const [, whole, num, den] = mixedNumberMatch;
    return parseInt(whole, 10) + (parseInt(num, 10) / parseInt(den, 10));
  }

  const fractionMatch = trimmed.match(/^(\d+)\/(\d+)$/);
  if (fractionMatch) {
    const [, num, den] = fractionMatch;
    return parseInt(num, 10) / parseInt(den, 10);
  }

  const num = parseFloat(trimmed);
  return isNaN(num) ? 1 : num;
}

function parseIngredientString(ingredientString) {
  const nonItemPhrases = ['to taste', 'if needed', 'for serving', 'a dash', 'a splash'];
  if (!ingredientString || nonItemPhrases.some(phrase => ingredientString.toLowerCase().includes(phrase))) {
    return { quantity: 0, unit: null, name: 'non-item' };
  }

  let workingString = ingredientString.toLowerCase()
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .trim();

  const allUnits = Array.from(unitMap.keys()).join('|');
  const quantityRegex = /^(\d+\s+\d\/\d|\d+[\/.]\d+|\d+|-)?\s*/;
  const unitRegex = new RegExp(`^(${allUnits})\\b\\s*`);

  let quantity = 1;
  let unit = null;
  let name;

  const quantityMatch = workingString.match(quantityRegex);
  if (quantityMatch && quantityMatch[1]) {
    const quantityStr = quantityMatch[1].replace('-', '').trim();
    quantity = parseQuantity(quantityStr);
    workingString = workingString.substring(quantityMatch[0].length);
  } else if (workingString.startsWith('a ') || workingString.startsWith('an ')) {
    quantity = 1;
    workingString = workingString.substring(2);
  }

  const unitMatch = workingString.match(unitRegex);
  if (unitMatch) {
    unit = unitMap.get(unitMatch[1]) || null;
    workingString = workingString.substring(unitMatch[0].length);
  }

  name = workingString
    .replace(descriptorRegex, '')
    .replace(/,/g, '') // Remove commas before standardizing
    .replace(/^of\s+/, '')
    .replace(/\s+/g, ' ')
    .trim();

  name = nameMap.get(name) || name;
  
  // This is a simplified pluralization, but helps with common cases.
  if (!unit && name.endsWith('s') && name.length > 2) {
    name = name.slice(0, -1);
  }

  if (!unit && quantity > 0) {
    unit = 'item';
  }

  return { quantity, unit, name };
}

function standardizeIngredient(ingredient) {
  let { quantity, unit, name } = ingredient;
  if (!unit || !quantity) return ingredient; 
  
  if (unit in massConversionRates) {
    return { quantity: parseFloat((quantity * massConversionRates[unit]).toFixed(2)), unit: 'g', name };
  }
  if (unit in volumeConversionRates) {
    const quantityInMl = quantity * volumeConversionRates[unit];
    const density = densityMap[name];
    return density
      ? { quantity: parseFloat((quantityInMl * density).toFixed(2)), unit: 'g', name }
      : { quantity: parseFloat(quantityInMl.toFixed(2)), unit: 'ml', name };
  }
  return ingredient;
}
// --- END: Copy relevant code from src/lib/data.ts ---


// --- NEW: Function to convert to UK Key Measurement Units (g, kg, ml, l, tsp, tbsp) ---
function convertToUKKeyUnits(ingredient) {
    let { quantity, unit, name } = ingredient;
    if (!unit || !quantity) return ingredient;

    // For mass (g -> kg)
    if (unit === 'g' && quantity >= 1000) {
        return { quantity: parseFloat((quantity / 1000).toFixed(2)), unit: 'kg', name };
    }
    // For volume (ml -> l)
    if (unit === 'ml' && quantity >= 1000) {
        return { quantity: parseFloat((quantity / 1000).toFixed(2)), unit: 'l', name };
    }
    // No change for tsp, tbsp, or count-based units (as these are already UK specified or counts)
    return ingredient;
}

async function convertRecipeData() {
    const dataDir = path.join(__dirname, '../src/features/recipes'); 
    const recipeFiles = fs.readdirSync(dataDir).filter(file => file.endsWith('.js') && file !== 'index.js');

    let allConvertedRecipes = [];

    for (const file of recipeFiles) {
        const filePath = path.join(dataDir, file);
        
        // --- CRITICAL FIX HERE ---
        // Access the .default property because your recipe files use 'export default'
        const recipes = require(filePath).default; 
        // --- END CRITICAL FIX ---

        const convertedRecipesInFile = recipes.map(recipe => {
            // The original 'ingredients' array on the recipe object is NOT modified here.
            // This script *outputs* the recipes with their ORIGINAL ingredient strings.
            return {
                ...recipe,
                ingredients: recipe.ingredients // Keep original ingredient strings
            };
        });
        allConvertedRecipes = allConvertedRecipes.concat(convertedRecipesInFile);
    }

    const outputFile = path.join(__dirname, 'converted_recipes_for_seeding.json');
    fs.writeFileSync(outputFile, JSON.stringify(allConvertedRecipes, null, 2));
    console.log(`Successfully processed and saved ${allConvertedRecipes.length} recipes to ${outputFile}`);

    console.log("\n--- Example Parsed & Standardized Ingredients ---");
    const exampleRecipe = allConvertedRecipes[0]; 
    if (exampleRecipe) {
        console.log(`Recipe: ${exampleRecipe.name}`);
        exampleRecipe.ingredients.forEach(originalIngredientString => {
            const parsed = parseIngredientString(originalIngredientString);
            const standardized = standardizeIngredient(parsed);
            const finalUKUnit = convertToUKKeyUnits(standardized);
            console.log(`  Original: "${originalIngredientString}"`);
            console.log(`  Parsed:   Qty=${parsed.quantity}, Unit=${parsed.unit}, Name="${parsed.name}"`);
            console.log(`  Std:      Qty=${standardized.quantity}, Unit=${standardized.unit}, Name="${standardized.name}"`);
            console.log(`  UK Units: Qty=${finalUKUnit.quantity}, Unit=${finalUKUnit.unit}, Name="${finalUKUnit.name}"`);
        });
    }
}

convertRecipeData().catch(console.error);