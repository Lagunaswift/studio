/**
 * Utilities for testing pantry ingredient matching
 */

import { checkPantryMatch, extractBaseIngredient } from './ingredient-matching';

// Test cases for ingredient matching
const TEST_CASES = [
  // Exact matches
  { ingredient: "flour", pantryItem: "flour", shouldMatch: true, name: "Exact match" },
  { ingredient: "Salt", pantryItem: "salt", shouldMatch: true, name: "Case insensitive match" },
  
  // Partial matches
  { ingredient: "all-purpose flour", pantryItem: "flour", shouldMatch: true, name: "Ingredient contains pantry item" },
  { ingredient: "milk", pantryItem: "whole milk", shouldMatch: true, name: "Pantry item contains ingredient" },
  
  // With measurements
  { ingredient: "2 cups flour", pantryItem: "flour", shouldMatch: true, name: "With measurement" },
  { ingredient: "1/2 tsp. salt", pantryItem: "salt", shouldMatch: true, name: "With fraction measurement" },
  
  // Multiple words
  { ingredient: "red bell pepper", pantryItem: "bell pepper", shouldMatch: true, name: "Multiple word partial match" },
  { ingredient: "fresh basil leaves", pantryItem: "basil", shouldMatch: true, name: "Ingredient with adjectives" },
  
  // Non-matches
  { ingredient: "baking powder", pantryItem: "baking soda", shouldMatch: false, name: "Similar but different items" },
  { ingredient: "vegetable oil", pantryItem: "olive oil", shouldMatch: false, name: "Different types of same category" },
  
  // Edge cases
  { ingredient: "", pantryItem: "salt", shouldMatch: false, name: "Empty ingredient" },
  { ingredient: "pepper", pantryItem: "", shouldMatch: false, name: "Empty pantry item" }
];

/**
 * Run test cases for pantry matching logic
 * @returns {Object} Test results
 */
export function testPantryMatching() {
  const results = {
    passed: 0,
    failed: 0,
    details: []
  };
  
  console.log("Running pantry matching tests...");
  
  TEST_CASES.forEach(testCase => {
    // Create a mock pantry with the test item
    const mockPantry = testCase.pantryItem ? {
      [testCase.pantryItem]: { quantity: "1 unit" }
    } : {};
    
    // Run the matching function
    const result = isIngredientInPantry(testCase.ingredient, mockPantry);
    const passed = result.inPantry === testCase.shouldMatch;
    
    // Record the result
    results.details.push({
      name: testCase.name,
      ingredient: testCase.ingredient,
      pantryItem: testCase.pantryItem,
      expected: testCase.shouldMatch,
      actual: result.inPantry,
      passed,
      confidence: result.confidence,
      performance: result.performance
    });
    
    if (passed) {
      results.passed++;
    } else {
      results.failed++;
      console.warn(`Test failed: ${testCase.name}`);
      console.warn(`  Ingredient: "${testCase.ingredient}"`);
      console.warn(`  Pantry item: "${testCase.pantryItem}"`);
      console.warn(`  Expected: ${testCase.shouldMatch}, Got: ${result.inPantry}`);
    }
  });
  
  // Test extractBaseIngredient function
  const extractionTests = [
    { input: "2 cups flour", expected: "flour" },
    { input: "1/2 tsp. salt", expected: "salt" },
    { input: "3 tbsp. of olive oil", expected: "olive oil" },
    { input: "4 large eggs", expected: "large eggs" }
  ];
  
  extractionTests.forEach(test => {
    const result = extractBaseIngredient(test.input);
    const passed = result === test.expected;
    
    results.details.push({
      name: `Extract base: ${test.input}`,
      input: test.input,
      expected: test.expected,
      actual: result,
      passed
    });
    
    if (passed) {
      results.passed++;
    } else {
      results.failed++;
      console.warn(`Extraction test failed: "${test.input}"`);
      console.warn(`  Expected: "${test.expected}", Got: "${result}"`);
    }
  });
  
  // Log summary
  console.log(`Test summary: ${results.passed} passed, ${results.failed} failed`);
  
  return results;
}

/**
 * Performance test for ingredient matching with large datasets
 * @returns {Object} Performance results
 */
export function testPantryMatchingPerformance() {
  // Generate test data
  const generateLargePantry = (size) => {
    const pantry = {};
    const ingredients = [
      "flour", "sugar", "salt", "pepper", "garlic", "onion", "butter", 
      "eggs", "milk", "cheese", "chicken", "beef", "pasta", "rice", 
      "oil", "vinegar", "tomato", "carrot", "potato", "celery"
    ];
    
    // Generate variations to reach the desired size
    for (let i = 0; i < size; i++) {
      const base = ingredients[i % ingredients.length];
      const variation = Math.floor(i / ingredients.length);
      const key = variation > 0 ? `${base} type ${variation}` : base;
      pantry[key] = { quantity: "1 unit" };
    }
    
    return pantry;
  };
  
  const testSizes = [10, 50, 100, 200, 500];
  const results = { sizes: [] };
  
  for (const size of testSizes) {
    const pantry = generateLargePantry(size);
    const testIngredients = [
      "2 cups flour",
      "1 tsp salt", 
      "3 cloves garlic",
      "1 cup milk",
      "non-existent ingredient"
    ];
    
    const sizeResults = { 
      size,
      tests: [],
      averageDuration: 0
    };
    
    // Run tests and measure performance
    for (const ingredient of testIngredients) {
      const startTime = performance.now();
      const result = isIngredientInPantry(ingredient, pantry);
      const duration = performance.now() - startTime;
      
      sizeResults.tests.push({
        ingredient,
        inPantry: result.inPantry,
        confidence: result.confidence,
        duration
      });
    }
    
    // Calculate average
    sizeResults.averageDuration = sizeResults.tests.reduce((sum, test) => sum + test.duration, 0) / sizeResults.tests.length;
    
    results.sizes.push(sizeResults);
  }
  
  return results;
}