
'use server';
import { z } from 'zod';
import { ai } from '../genkit';
import { ProCoachInputSchema, ProCoachOutputSchema } from './schemas';

export const proCoachFlow = ai.defineFlow(
  {
    name: 'proCoachFlow',
    inputSchema: ProCoachInputSchema,
    outputSchema: ProCoachOutputSchema,
  },
  async (input: z.infer<typeof ProCoachInputSchema>) => {
    // Use 'data' instead of 'variables' to pass input to the prompt
    const response = await ai.generate({
      prompt: 'proCoach', // Assumes 'proCoach' is a registered prompt identifier
      data: input, // Pass input as data
    });

    const output = response.output();
    if (!output) {
      throw new Error('AI Preppy failed to generate a recommendation.');
    }

    // Validate output against ProCoachOutputSchema for robustness
    const parsedOutput = ProCoachOutputSchema.safeParse(output);
    if (!parsedOutput.success) {
      throw new Error('Invalid output format from AI: ' + JSON.stringify(parsedOutput.error.flatten()));
    }

    return parsedOutput.data;
  }
);

export const runProCoachFlow = async (
  input: z.infer<typeof ProCoachInputSchema>
) => {
  return await proCoachFlow.run(input);
};
