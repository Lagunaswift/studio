
'use server';
/**
 * @fileOverview An AI agent that estimates micronutrient content from a list of ingredients.
 *
 * - suggestMicronutrients - A function that handles the micronutrient estimation.
 * - MicronutrientEstimationInput - The input type for the function.
 * - MicronutrientEstimationOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { MicronutrientsSchema } from './schemas';

const MicronutrientEstimationInputSchema = z.object({
  ingredients: z.array(z.string()).describe('A list of ingredients for a single serving of a recipe, including quantities and units (e.g., ["100g chicken breast", "50g broccoli"]).'),
});
export type MicronutrientEstimationInput = z.infer<typeof MicronutrientEstimationInputSchema>;

export type MicronutrientEstimationOutput = z.infer<typeof MicronutrientsSchema>;


export async function suggestMicronutrients(input: MicronutrientEstimationInput): Promise<MicronutrientEstimationOutput> {
  return micronutrientEstimationFlow(input);
}


const micronutrientPrompt = ai.definePrompt({
  name: 'micronutrientEstimationPrompt',
  input: { schema: MicronutrientEstimationInputSchema },
  output: { schema: MicronutrientsSchema },
  prompt: `You are an expert nutritionist AI. Your task is to analyze a list of ingredients for a SINGLE serving of a recipe and provide an estimated breakdown of key micronutrients.

**Ingredient List for one serving:**
{{#each ingredients}}
- {{{this}}}
{{/each}}

**Your Task:**
1.  Carefully review the ingredients and their quantities.
2.  Estimate the amount for each of the following micronutrients.
3.  Provide the output in the specified units.
    - Iron (mg)
    - Calcium (mg)
    - Potassium (mg)
    - Vitamin A (mcg)
    - Vitamin C (mg)
    - Vitamin D (mcg)
4.  If an ingredient's contribution to a specific micronutrient is negligible or cannot be determined, set the value to null.
5.  Your response must be a single, valid JSON object that conforms EXACTLY to the 'MicronutrientsSchema'. Do not include any text or formatting outside of this JSON object.

Example Output Structure:
{
  "iron": 1.5,
  "calcium": 250,
  "potassium": 400,
  "vitaminA": 300,
  "vitaminC": 45,
  "vitaminD": 5
}
`,
});


const micronutrientEstimationFlow = ai.defineFlow(
  {
    name: 'micronutrientEstimationFlow',
    inputSchema: MicronutrientEstimationInputSchema,
    outputSchema: MicronutrientsSchema,
  },
  async (input) => {
    if (!input.ingredients || input.ingredients.length === 0) {
      throw new Error("Ingredient list cannot be empty.");
    }

    const { output } = await micronutrientPrompt(input);
    if (!output) {
        throw new Error("AI failed to generate a micronutrient estimation.");
    }
    
    return output;
  }
);
