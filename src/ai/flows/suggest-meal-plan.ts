//src/ai/flows/suggest-meal-plan.ts
'use server';
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { SuggestMealPlanInputSchema, SuggestMealPlanOutputSchema } from './schemas';
import { onCallGenkit } from 'firebase-functions/v2/https';
import { PlannedRecipeItem, RecipeForAI } from '@/types';

export const suggestMealPlanFlow = ai.defineFlow(
    {
        name: 'suggestMealPlanFlow',
        inputSchema: SuggestMealPlanInputSchema,
        outputSchema: SuggestMealPlanOutputSchema,
    },
    async (input: z.infer<typeof SuggestMealPlanInputSchema>) => {
        if (!input.mealStructure || input.mealStructure.length === 0) {
            throw new Error("Meal structure is required to generate a plan.");
        }
        if (!input.availableRecipes || input.availableRecipes.length === 0) {
            throw new Error("Available recipes are required to generate a plan.");
        }

        const promptInput = {
            ...input,
            macroTargets: input.macroTargets,
            dietaryPreferences: input.dietaryPreferences || [],
            allergens: input.allergens || [],
            currentDate: input.currentDate || new Date().toISOString().split('T')[0],
        };

        // Use direct model generation instead of prompt system
        console.log('🚀 Generating meal plan using direct model call...');
        
        const promptText = `You are an expert Meal Planning AI. Your task is to create a one-day meal plan by selecting appropriate recipes from the 'availableRecipes' list to fit the user's 'mealStructure'.

Context:
- Today's Date (for context, if relevant for seasonal suggestions, otherwise ignore): ${promptInput.currentDate}

User Profile & Constraints:
- Macro Targets for the Day: ${promptInput.macroTargets ? `Calories: ${promptInput.macroTargets.calories}kcal, Protein: ${promptInput.macroTargets.protein}g, Carbs: ${promptInput.macroTargets.carbs}g, Fat: ${promptInput.macroTargets.fat}g` : 'No specific macro targets set. Prioritize a balanced and varied diet.'}
- Dietary Preferences (Strictly Adhere): ${promptInput.dietaryPreferences?.length ? promptInput.dietaryPreferences.join(', ') : 'None specified.'}
- Allergens to AVOID (Strictly Exclude): ${promptInput.allergens?.length ? promptInput.allergens.join(', ') : 'None specified.'}
- Meal Structure for the Day (Plan ONE recipe per slot):
${promptInput.mealStructure.map(slot => `  - Slot ID: ${slot.id}, Slot Name: "${slot.name}", Expected Meal Type: ${slot.type}`).join('\n')}

Available Recipes Database (Recipe ID, Name, Macros per SINGLE serving, Tags):
${promptInput.availableRecipes.map(recipe => `- ID: ${recipe.id}, Name: "${recipe.name}", MacrosPerServing: (Calories: ${recipe.macrosPerServing.calories}, Protein: ${recipe.macrosPerServing.protein}, Carbs: ${recipe.macrosPerServing.carbs}, Fat: ${recipe.macrosPerServing.fat}), Tags: [${recipe.tags?.length ? recipe.tags.map(tag => `"${tag}"`).join(', ') : 'No tags'}]`).join('\n')}

Your Task:
1. For EACH slot in the 'mealStructure', select ONE recipe from the 'availableRecipes'.
2. Determine an appropriate number of servings for EACH selected recipe. Servings can be fractional (e.g., 1.5, 0.75, 0.5) but must be at least 0.25. Adjust servings to help meet overall daily macro targets. Ensure the servings output is a positive number.
3. CRITICAL: Ensure your recipe choices and tags align with the user's 'dietaryPreferences' (e.g., if "Vegetarian", only select recipes tagged 'vegetarian' or those that are inherently vegetarian).
4. CRITICAL: Ensure your recipe choices strictly AVOID any ingredients implied by the user's 'allergens' (e.g., if "Nuts", avoid recipes that might contain nuts based on their name or typical ingredients, even if not explicitly tagged). Use common sense for allergens.
5. For each planned meal, calculate the 'calculatedMacros' based on the recipe's 'macrosPerServing' multiplied by your chosen 'servings'.
6. Calculate 'totalAchievedMacros' by summing the 'calculatedMacros' for all planned meals.
7. Provide a concise 'aiJustification' (2-3 sentences) explaining your key recipe choices and serving adjustments, particularly how they relate to the user's profile.
8. Provide a 'fitnessAssessment' (2-3 sentences) on how well the generated plan meets the daily 'macroTargets'. If no targets, comment on overall balance.

Output the entire response as a single, valid JSON object that conforms EXACTLY to the expected schema. Do NOT include any text or formatting outside of this JSON object.

JSON Output Structure:
{
  "plannedMeals": [
    { "mealSlotId": "...", "mealSlotName": "...", "recipeId": ..., "recipeName": "...", "servings": ..., "calculatedMacros": { "calories": ..., "protein": ..., "carbs": ..., "fat": ... }},
    // ... more planned meal objects
  ],
  "totalAchievedMacros": { "calories": ..., "protein": ..., "carbs": ..., "fat": ... },
  "aiJustification": "...",
  "fitnessAssessment": "..."
}`;

        const response = await ai.generate({
            model: 'googleai/gemini-1.5-flash',
            prompt: promptText,
            output: {
                schema: SuggestMealPlanOutputSchema,
            },
        });
        
        console.log('✅ Direct model generation completed');

        const output = response.output; // Access output as a property

        if (!output) {
            throw new Error("AI failed to generate a meal plan output.");
        }

        const parsedOutput = SuggestMealPlanOutputSchema.safeParse(output);
        if (!parsedOutput.success) {
            throw new Error('Invalid output format from AI: ' + JSON.stringify(parsedOutput.error.flatten()));
        }

        if (parsedOutput.data.plannedMeals.length !== input.mealStructure.length) {
            console.warn("AI did not plan for all meal slots. Input slots:", input.mealStructure.length, "Planned meals:", parsedOutput.data.plannedMeals.length);
        }

        parsedOutput.data.plannedMeals = parsedOutput.data.plannedMeals.map((meal: PlannedRecipeItem) => {
            if (meal.servings <= 0) {
                console.warn(`AI generated non-positive servings (${meal.servings}) for ${meal.recipeName}. Setting to 0.25.`);
                const originalRecipe = input.availableRecipes.find((r: RecipeForAI) => r.id === meal.recipeId);
                if (originalRecipe) {
                    meal.calculatedMacros = {
                        calories: originalRecipe.macrosPerServing.calories * 0.25,
                        protein: originalRecipe.macrosPerServing.protein * 0.25,
                        carbs: originalRecipe.macrosPerServing.carbs * 0.25,
                        fat: originalRecipe.macrosPerServing.fat * 0.25,
                    };
                }
                meal.servings = 0.25;
            }
            return meal;
        });

        return parsedOutput.data;
    }
);

export const suggestMealPlan = onCallGenkit(
    {},
    suggestMealPlanFlow
);

export type SuggestMealPlanInput = z.infer<typeof SuggestMealPlanInputSchema>;
export type SuggestMealPlanOutput = z.infer<typeof SuggestMealPlanOutputSchema>;
