'use server';
/**
 * @fileOverview An automated meal planning AI agent.
 * It uses user profile settings (macros, diet, allergens, meal structure)
 * and a list of available recipes to generate a daily meal plan.
 *
 * - suggestMealPlan - A function that suggests a meal plan.
 * - SuggestMealPlanInput - The input type for the suggestMealPlan function.
 * - SuggestMealPlanOutput - The return type for the suggestMealPlan function.
 */
import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { MEAL_TYPES } from '@/lib/data'; // Assuming MEAL_TYPES is exported from here
import { MacroDataSchema } from './schemas';
// Schema for recipes as provided to the AI
const RecipeSchemaForAI = z.object({
    id: z.number().describe("Unique ID of the recipe"),
    name: z.string().describe("Name of the recipe"),
    macrosPerServing: MacroDataSchema.describe("Macronutrients per single serving of this recipe"),
    tags: z.array(z.string()).optional().describe("Tags associated with the recipe, e.g., 'vegetarian', 'gluten-free', 'quick'"),
    // Note: Full ingredients and instructions are omitted to keep the prompt concise.
    // The AI will select based on name, macros, and tags.
});
// Schema for user's macronutrient targets
const MacroTargetsSchemaForAI = MacroDataSchema.extend({
// any specific target variations if needed
}).describe("User's daily macronutrient targets. Aim to meet these.");
// Schema for user's meal structure slots
const MealSlotSchemaForAI = z.object({
    id: z.string().describe("Unique ID of the meal slot"),
    name: z.string().describe("User-defined name for the meal slot (e.g., 'Breakfast', 'Mid-morning Snack')"),
    type: z.enum(MEAL_TYPES).describe("The general category of the meal (e.g., 'Breakfast', 'Lunch')"),
});
// Input schema for the meal planning flow
const SuggestMealPlanInputSchema = z.object({
    macroTargets: MacroTargetsSchemaForAI.optional().nullable().describe("User's daily macronutrient targets. Aim to meet these. Can be null if not set."),
    dietaryPreferences: z.array(z.string()).optional().describe("List of dietary preferences (e.g., 'Vegetarian', 'Vegan'). Adhere to these strictly."),
    allergens: z.array(z.string()).optional().describe("List of allergens to avoid (e.g., 'Nuts', 'Dairy'). Exclude recipes containing these."),
    mealStructure: z.array(MealSlotSchemaForAI).describe("The user's desired meal structure for the day. Plan one recipe for each slot."),
    availableRecipes: z.array(RecipeSchemaForAI).describe("List of available recipes to choose from."),
    currentDate: z.string().optional().describe("The date for which the meal plan is being generated (YYYY-MM-DD). For context if needed."),
});
// Schema for a single planned recipe item in the output
const PlannedRecipeItemSchema = z.object({
    mealSlotId: z.string().describe("The ID of the meal slot this recipe is planned for."),
    mealSlotName: z.string().describe("The name of the meal slot (e.g., 'Breakfast')."),
    recipeId: z.number().describe("The ID of the chosen recipe."),
    recipeName: z.string().describe("The name of the chosen recipe."),
    servings: z.number().finite().describe("Number of servings of the recipe to plan for this meal slot (e.g., 1, 1.5, 0.5). Must be a positive number, at least 0.25, based on prompt guidance."),
    calculatedMacros: MacroDataSchema.describe("Calculated macros for the chosen recipe and servings for this specific meal."),
});
// Output schema for the meal planning flow
const SuggestMealPlanOutputSchema = z.object({
    plannedMeals: z.array(PlannedRecipeItemSchema).describe("An array of recipes planned for each meal slot."),
    totalAchievedMacros: MacroDataSchema.describe("The total aggregated macronutrients for the entire suggested meal plan."),
    aiJustification: z.string().describe("A brief justification from the AI explaining its choices and how it tried to meet the targets and preferences."),
    fitnessAssessment: z.string().describe("A brief assessment of how well the plan meets the targets (e.g., 'Calories are slightly over, protein target met.'). Consider macro percentages too."),
});
export async function suggestMealPlan(input) {
    // Potentially add pre-processing for recipes here if needed, e.g., filtering out
    // recipes that clearly violate allergens before sending to LLM if the list is huge.
    // For now, we send all and rely on the LLM.
    return suggestMealPlanFlow(input);
}
const planGenerationPrompt = ai.definePrompt({
    name: 'automatedMealPlannerPrompt',
    input: { schema: SuggestMealPlanInputSchema },
    output: { schema: SuggestMealPlanOutputSchema },
    prompt: `You are an expert Meal Planning AI. Your task is to create a one-day meal plan by selecting appropriate recipes from the 'availableRecipes' list to fit the user's 'mealStructure'.

Context:
- Today's Date (for context, if relevant for seasonal suggestions, otherwise ignore): {{{currentDate}}}

User Profile & Constraints:
- Macro Targets for the Day: {{#if macroTargets}}Calories: {{macroTargets.calories}}kcal, Protein: {{macroTargets.protein}}g, Carbs: {{macroTargets.carbs}}g, Fat: {{macroTargets.fat}}g{{else}}No specific macro targets set. Prioritize a balanced and varied diet.{{/if}}
- Dietary Preferences (Strictly Adhere): {{#if dietaryPreferences}}{{#each dietaryPreferences}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}{{else}}None specified.{{/if}}
- Allergens to AVOID (Strictly Exclude): {{#if allergens}}{{#each allergens}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}{{else}}None specified.{{/if}}
- Meal Structure for the Day (Plan ONE recipe per slot):
{{#each mealStructure}}
  - Slot ID: {{id}}, Slot Name: "{{name}}", Expected Meal Type: {{type}}
{{/each}}

Available Recipes Database (Recipe ID, Name, Macros per SINGLE serving, Tags):
{{#each availableRecipes}}
- ID: {{id}}, Name: "{{name}}", MacrosPerServing: (Calories: {{macrosPerServing.calories}}, Protein: {{macrosPerServing.protein}}, Carbs: {{macrosPerServing.carbs}}, Fat: {{macrosPerServing.fat}}), Tags: [{{#if tags}}{{#each tags}}"{{this}}"{{#unless @last}}, {{/unless}}{{/each}}{{else}}No tags{{/if}}]
{{/each}}

Your Task:
1.  For EACH slot in the 'mealStructure', select ONE recipe from the 'availableRecipes'.
2.  Determine an appropriate number of servings for EACH selected recipe. Servings can be fractional (e.g., 1.5, 0.75, 0.5) but must be at least 0.25. Adjust servings to help meet overall daily macro targets. Ensure the servings output is a positive number.
3.  CRITICAL: Ensure your recipe choices and tags align with the user's 'dietaryPreferences' (e.g., if "Vegetarian", only select recipes tagged 'vegetarian' or those that are inherently vegetarian).
4.  CRITICAL: Ensure your recipe choices strictly AVOID any ingredients implied by the user's 'allergens' (e.g., if "Nuts", avoid recipes that might contain nuts based on their name or typical ingredients, even if not explicitly tagged). Use common sense for allergens.
5.  For each planned meal, calculate the 'calculatedMacros' based on the recipe's 'macrosPerServing' multiplied by your chosen 'servings'.
6.  Calculate 'totalAchievedMacros' by summing the 'calculatedMacros' for all planned meals.
7.  Provide a concise 'aiJustification' (2-3 sentences) explaining your key recipe choices and serving adjustments, particularly how they relate to the user's profile.
8.  Provide a 'fitnessAssessment' (2-3 sentences) on how well the generated plan meets the daily 'macroTargets'. If no targets, comment on overall balance.

Output the entire response as a single, valid JSON object that conforms EXACTLY to the 'SuggestMealPlanOutputSchema'. Do NOT include any text or formatting outside of this JSON object.

JSON Output Structure Reminder:
{
  "plannedMeals": [
    { "mealSlotId": "...", "mealSlotName": "...", "recipeId": ..., "recipeName": "...", "servings": ..., "calculatedMacros": { "calories": ..., "protein": ..., "carbs": ..., "fat": ... }},
    // ... more planned meal objects
  ],
  "totalAchievedMacros": { "calories": ..., "protein": ..., "carbs": ..., "fat": ... },
  "aiJustification": "...",
  "fitnessAssessment": "..."
}
`,
});
const suggestMealPlanFlow = ai.defineFlow({
    name: 'suggestMealPlanFlow',
    inputSchema: SuggestMealPlanInputSchema,
    outputSchema: SuggestMealPlanOutputSchema,
}, async (input) => {
    // Basic validation: Ensure meal structure and recipes are provided
    if (!input.mealStructure || input.mealStructure.length === 0) {
        throw new Error("Meal structure is required to generate a plan.");
    }
    if (!input.availableRecipes || input.availableRecipes.length === 0) {
        throw new Error("Available recipes are required to generate a plan.");
    }
    // Prepare input for the prompt, ensuring all optional fields are handled.
    const promptInput = {
        ...input,
        macroTargets: input.macroTargets, // Can be null
        dietaryPreferences: input.dietaryPreferences || [],
        allergens: input.allergens || [],
        currentDate: input.currentDate || new Date().toISOString().split('T')[0],
    };
    const { output } = await planGenerationPrompt(promptInput);
    if (!output) {
        throw new Error("AI failed to generate a meal plan output.");
    }
    // The output should already be parsed by Genkit based on the outputSchema.
    // Additional validation or transformation can happen here if needed.
    // For example, ensuring all meal slots from input are covered in output.
    if (output.plannedMeals.length !== input.mealStructure.length) {
        console.warn("AI did not plan for all meal slots. Input slots:", input.mealStructure.length, "Planned meals:", output.plannedMeals.length);
        // Depending on strictness, could throw an error or attempt to fill gaps.
        // For now, we'll allow it but log a warning.
    }
    // Additional check to ensure servings are positive if the AI somehow missed the prompt.
    // This is a safeguard. Ideally, the prompt handles this.
    output.plannedMeals = output.plannedMeals.map(meal => {
        if (meal.servings <= 0) {
            console.warn(`AI generated non-positive servings (${meal.servings}) for ${meal.recipeName}. Setting to 0.25.`);
            // Recalculate macros if servings are changed
            const originalRecipe = input.availableRecipes.find(r => r.id === meal.recipeId);
            if (originalRecipe) {
                meal.calculatedMacros = {
                    calories: originalRecipe.macrosPerServing.calories * 0.25,
                    protein: originalRecipe.macrosPerServing.protein * 0.25,
                    carbs: originalRecipe.macrosPerServing.carbs * 0.25,
                    fat: originalRecipe.macrosPerServing.fat * 0.25,
                };
            }
            meal.servings = 0.25; // Default to a small positive number
        }
        return meal;
    });
    return output;
});
