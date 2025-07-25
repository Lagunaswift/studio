
// src/app/api/genkit/route.ts
import { genkit } from '@/ai/genkit';
import run from '@genkit-ai/next';

export const POST = run(genkit);
