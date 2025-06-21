
'use server';
/**
 * @fileOverview An AI agent that modifies existing recipes based on user requests.
 *
 * - suggestRecipeModification - A function that suggests modifications to a recipe.
 * - SuggestRecipeModificationInput - The input type for the function.
 * - SuggestRecipeModificationOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Schema for the recipe data provided to the AI for modification
const RecipeToModifySchema = z.object({
  name: z.string().describe("The original name of the recipe."),
  ingredients: z.array(z.string()).describe("The original list of ingredients."),
  instructions: z.array(z.string()).describe("The original list of instructions."),
  description: z.string().optional().describe("The original description of the recipe."),
  tags: z.array(z.string()).optional().describe("The original tags of the recipe."),
});
export type RecipeToModify = z.infer<typeof RecipeToModifySchema>;

// Input schema for the modification flow
const SuggestRecipeModificationInputSchema = z.object({
  recipeToModify: RecipeToModifySchema,
  userRequest: z.string().describe("The user's request for modification (e.g., 'make it vegetarian', 'replace chicken with tofu', 'what can I use instead of almonds?')."),
});
export type SuggestRecipeModificationInput = z.infer<typeof SuggestRecipeModificationInputSchema>;

// Output schema for the modification flow
const SuggestRecipeModificationOutputSchema = z.object({
  newName: z.string().describe("A new, fitting name for the modified recipe. For example, if the original was 'Chicken Stir-Fry' and the request was 'make it vegetarian', a good new name would be 'Tofu Stir-Fry'."),
  newDescription: z.string().describe("A brief, updated description for the modified recipe."),
  newIngredients: z.array(z.string()).describe("The new, complete list of ingredients for the modified recipe."),
  newInstructions: z.array(z.string()).describe("The new, complete list of step-by-step instructions for the modified recipe."),
  aiJustification: z.string().describe("A concise explanation of the changes made and why. For example: 'I replaced the chicken with firm tofu and adjusted the marinade to better suit it. I also added a note to press the tofu first for best results.' Important: State that macronutrient data has NOT been recalculated and is copied from the original recipe, so it must be reviewed by the user."),
});
export type SuggestRecipeModificationOutput = z.infer<typeof SuggestRecipeModificationOutputSchema>;


export async function suggestRecipeModification(input: SuggestRecipeModificationInput): Promise<SuggestRecipeModificationOutput> {
  return suggestRecipeModificationFlow(input);
}


const modificationPrompt = ai.definePrompt({
    name: 'recipeModificationPrompt',
    input: {schema: SuggestRecipeModificationInputSchema},
    output: {schema: SuggestRecipeModificationOutputSchema},
    prompt: `You are an expert recipe developer and AI chef. Your task is to modify an existing recipe based on a user's specific request.

Here is the original recipe:
Recipe Name: {{{recipeToModify.name}}}
Description: {{{recipeToModify.description}}}
Tags: {{#if recipeToModify.tags}}{{#each recipeToModify.tags}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}{{else}}None{{/if}}

Ingredients:
{{#each recipeToModify.ingredients}}
- {{{this}}}
{{/each}}

Instructions:
{{#each recipeToModify.instructions}}
- {{{this}}}
{{/each}}

---

The user's modification request is: "{{{userRequest}}}"

Your Task:
1.  **Analyze the Request**: Understand the user's goal (e.g., make vegetarian, substitute an allergen, make it quicker, suggest a side dish).
2.  **Modify Ingredients**: Change the ingredient list as needed. Add, remove, or substitute ingredients. Adjust quantities if necessary.
3.  **Modify Instructions**: Update the cooking instructions to reflect the ingredient changes. Be clear and step-by-step. If you substitute an ingredient, make sure the cooking method is still appropriate (e.g., tofu needs different prep than chicken).
4.  **Create New Name & Description**: Generate a new, descriptive name and a brief description for the tweaked recipe.
5.  **Provide Justification**: Write a short \`aiJustification\` explaining the key changes you made and why. For example, if you replace chicken with chickpeas, explain that you've added them towards the end of cooking since they don't need to be cooked as long. **Crucially, you MUST include a sentence stating that the nutritional information (macros) has not been recalculated and is based on the original recipe, advising the user to review it.**

**IMPORTANT**:
- Do not invent new recipes from scratch. Your goal is to intelligently *modify* the provided one.
- If the request is a question (e.g., "what can I use instead of almonds?"), provide the answer in the \`aiJustification\` and modify the recipe with a sensible substitution (e.g., walnuts or sunflower seeds).
- Ensure the output is a single, valid JSON object that conforms EXACTLY to the 'SuggestRecipeModificationOutputSchema'. Do not include any text outside this JSON object.
- The macros for the new recipe will be estimated by the user later, so you do not need to calculate them. Your focus is on the text of the recipe itself.
`
});


const suggestRecipeModificationFlow = ai.defineFlow(
  {
    name: 'suggestRecipeModificationFlow',
    inputSchema: SuggestRecipeModificationInputSchema,
    outputSchema: SuggestRecipeModificationOutputSchema,
  },
  async (input) => {
    if (!input.recipeToModify || !input.userRequest) {
      throw new Error("A recipe and a modification request are required.");
    }
    
    const {output} = await modificationPrompt(input);

    if (!output) {
        throw new Error("AI failed to generate a recipe modification.");
    }
    
    return output;
  }
);
