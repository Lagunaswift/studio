
// src/app/api/genkit/route.ts
import { genkit } from '@/ai/genkit';
import { createNextApiHandler } from '@genkit-ai/next';

export const POST = createNextApiHandler({
  flows: [
    // Add your Genkit flows here
  ]
});
