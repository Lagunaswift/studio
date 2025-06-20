
'use server';
/**
 * @fileOverview An AI agent that suggests recipes based on a list of ingredients provided by the user.
 *
 * - suggestRecipesByIngredients - A function that suggests recipes.
 * - SuggestRecipesByIngredientsInput - The input type for the function.
 * - SuggestRecipesByIngredientsOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { MacroDataSchema } from './suggest-meal-plan'; // For reusing macro/tag structure

// Schema for recipes as provided to this AI, including full ingredients
const RecipeWithIngredientsSchema = z.object({
  id: z.number().describe("Unique ID of the recipe"),
  name: z.string().describe("Name of the recipe"),
  ingredients: z.array(z.string()).describe("The full list of ingredients for this recipe. Example: ['1 cup flour', '2 large eggs', '100g sugar']"),
  tags: z.array(z.string()).optional().describe("Tags associated with the recipe, e.g., 'vegetarian', 'gluten-free', 'quick'"),
  // Macros could be useful for the AI to make more informed suggestions about overall meal balance.
  macrosPerServing: MacroDataSchema.optional().describe("Macronutrients per single serving of this recipe. Useful for context if available."),
});
export type RecipeWithIngredients = z.infer<typeof RecipeWithIngredientsSchema>;

// Input schema for the recipe suggestion flow
const SuggestRecipesByIngredientsInputSchema = z.object({
  userIngredients: z.array(z.string()).min(1).describe("List of ingredients the user has on hand (e.g., ['chicken breast', 'broccoli', 'onion', 'soy sauce'])."),
  availableRecipes: z.array(RecipeWithIngredients).min(1).describe("List of available recipes for the AI to consider, including their full ingredient lists."),
  dietaryPreferences: z.array(z.string()).optional().describe("User's dietary preferences (e.g., 'Vegetarian', 'Vegan'). AI should strictly adhere to these."),
  allergens: z.array(z.string()).optional().describe("Allergens to avoid (e.g., 'Nuts', 'Dairy'). AI should strictly exclude recipes containing these."),
  maxResults: z.number().optional().default(3).describe("Maximum number of recipe suggestions to return (e.g., 3 to 5)."),
});
export type SuggestRecipesByIngredientsInput = z.infer<typeof SuggestRecipesByIngredientsInputSchema>;

// Schema for a single suggested recipe item in the output
const SuggestedRecipeItemSchema = z.object({
  recipeId: z.number().describe("The ID of the suggested recipe."),
  recipeName: z.string().describe("The name of the suggested recipe."),
  utilizationScore: z.number().min(0).max(1).describe("A score from 0 to 1 indicating how well the user's ingredients are utilized by this recipe. 1 means high utilization. Consider both the number of user's ingredients used and their proportion in the recipe."),
  matchedIngredients: z.array(z.string()).describe("List of ingredients from the user's input that are present in this recipe."),
  missingKeyIngredients: z.array(z.string()).optional().describe("Up to 3-4 key ingredients required for this recipe that the user does not have. Focus on essential items."),
  notes: z.string().optional().describe("Brief notes or justification why this recipe is a good suggestion (e.g., 'Great way to use up your chicken and broccoli', 'Only missing one common pantry item')."),
});
export type SuggestedRecipeItem = z.infer<typeof SuggestedRecipeItemSchema>;

// Output schema for the recipe suggestion flow
const SuggestRecipesByIngredientsOutputSchema = z.object({
  suggestedRecipes: z.array(SuggestedRecipeItemSchema).describe("An array of recipe suggestions based on the user's ingredients."),
  aiGeneralNotes: z.string().optional().describe("Overall comments, cooking tips, or general suggestions for ingredient substitutions from the AI. This could include ideas for how to adapt recipes if some ingredients are missing."),
});
export type SuggestRecipesByIngredientsOutput = z.infer<typeof SuggestRecipesByIngredientsOutputSchema>;

export async function suggestRecipesByIngredients(input: SuggestRecipesByIngredientsInput): Promise<SuggestRecipesByIngredientsOutput> {
  return suggestRecipesByIngredientsFlow(input);
}

const recipeSuggestionPrompt = ai.definePrompt({
  name: 'suggestRecipesByIngredientsPrompt',
  input: {schema: SuggestRecipesByIngredientsInputSchema},
  output: {schema: SuggestRecipesByIngredientsOutputSchema},
  prompt: `You are an expert chef and recipe suggestion AI. Your goal is to help a home cook find recipes they can make using ingredients they already have.

User's Available Ingredients:
{{#each userIngredients}}
- {{{this}}}
{{/each}}

Available Recipes Database (ID, Name, Tags, Full Ingredients List):
{{#each availableRecipes}}
- Recipe ID: {{id}}
  Name: "{{name}}"
  Tags: [{{#if tags}}{{#each tags}}"{{this}}"{{#unless @last}}, {{/unless}}{{/each}}{{else}}No tags{{/if}}]
  Ingredients:
  {{#each ingredients}}
  - {{{this}}}
  {{/each}}
  {{#if macrosPerServing}}Macros (per serving): Calories: {{macrosPerServing.calories}}, Protein: {{macrosPerServing.protein}}g, Carbs: {{macrosPerServing.carbs}}g, Fat: {{macrosPerServing.fat}}g{{/if}}
{{/each}}

User Constraints (if any):
- Dietary Preferences (Strictly Adhere): {{#if dietaryPreferences}}{{#each dietaryPreferences}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}{{else}}None specified.{{/if}}
- Allergens to AVOID (Strictly Exclude): {{#if allergens}}{{#each allergens}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}{{else}}None specified.{{/if}}

Your Task:
1.  Analyze the 'userIngredients' list and compare it against each recipe in the 'availableRecipes' database.
2.  Select up to {{{maxResults}}} recipes that best utilize the 'userIngredients'. Prioritize recipes that use a significant number of the user's ingredients and where the user's ingredients form core components of the recipe.
3.  For each selected recipe, provide:
    *   'recipeId' and 'recipeName'.
    *   'utilizationScore': A numerical score (0.0 to 1.0) representing how well the user's ingredients are used. A higher score means better utilization. For example, if a recipe uses 3 out of 4 user ingredients and those are major parts of the recipe, that's high utilization. If it only uses 1 out of 5 user ingredients, and it's a minor one, that's low.
    *   'matchedIngredients': List the ingredients from 'userIngredients' that are actually used in the suggested recipe.
    *   'missingKeyIngredients': List up to 3-4 *essential* ingredients needed for the recipe that are NOT in 'userIngredients'. Do not list minor spices or optional items if the recipe can be made without them. If all key ingredients are present, this can be an empty array or omitted.
    *   'notes': A brief (1-2 sentences) explanation of why this recipe is a good match or any tips for making it with the given ingredients.
4.  Strictly adhere to 'dietaryPreferences' and 'allergens'. If a recipe conflicts, do not suggest it.
5.  Provide 'aiGeneralNotes' with any overall comments, like tips for ingredient substitutions if some key items are often missing, or how to think about adapting recipes.

Output the entire response as a single, valid JSON object that conforms EXACTLY to the 'SuggestRecipesByIngredientsOutputSchema'. Do NOT include any text or formatting outside of this JSON object.
The 'utilizationScore' should reflect how central the user's ingredients are to the recipe and how many of them are used.
For 'missingKeyIngredients', be specific and focus on what's truly necessary. For example, "chicken broth" is key, but "a pinch of saffron" might be omittable.
`,
});

const suggestRecipesByIngredientsFlow = ai.defineFlow(
  {
    name: 'suggestRecipesByIngredientsFlow',
    inputSchema: SuggestRecipesByIngredientsInputSchema,
    outputSchema: SuggestRecipesByIngredientsOutputSchema,
  },
  async (input) => {
    if (!input.userIngredients || input.userIngredients.length === 0) {
      throw new Error("User ingredients list cannot be empty.");
    }
    if (!input.availableRecipes || input.availableRecipes.length === 0) {
      throw new Error("Available recipes list cannot be empty.");
    }

    const promptInput = {
      ...input,
      dietaryPreferences: input.dietaryPreferences || [],
      allergens: input.allergens || [],
      maxResults: input.maxResults || 3,
    };

    const {output} = await recipeSuggestionPrompt(promptInput);

    if (!output) {
      throw new Error("AI failed to generate recipe suggestions.");
    }
    
    // Optional: Add any post-processing or validation of the AI's output here if needed.
    // For example, ensuring recipe IDs are valid, etc.

    return output;
  }
);
