
// src/app/api/genkit/route.ts
import { genkit } from '@/ai/genkit';
import { defineFlow } from 'genkit';
import { z } from 'zod';

// Example flow, replace with your actual flows
const exampleFlow = defineFlow(
  {
    name: 'exampleFlow',
    inputSchema: z.string(),
    outputSchema: z.string(),
  },
  async (input) => {
    return `Hello, ${input}!`;
  }
);

export const POST = genkit.api({
  flows: [
    exampleFlow,
    // Add your other Genkit flows here
  ]
});
