//src/ai/flows/pro-coach-flow.ts
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
    // Correctly retrieve the prompt object first
    const proCoachPrompt = ai.prompt('proCoach');
    
    // Invoke the executable prompt with the input
    const response = await proCoachPrompt(input);

    const output = response.output; // Access output as a property
    if (!output) {
      throw new Error('AI Preppy failed to generate a recommendation.');
    }

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
