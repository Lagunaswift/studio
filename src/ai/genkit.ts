// src/ai/genkit.ts - For Genkit 1.15.5
import { googleAI } from '@genkit-ai/googleai';
import { firebase } from '@genkit-ai/firebase';
import { genkit } from 'genkit';

// Configure the Genkit instance - THIS is what you need to export
export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY,
    }),
    firebase(),
  ],
  model: googleAI.model('gemini-2.0-flash-exp'), // Set default model
});

// Optional: Enable logging
import { logger } from 'genkit/logging';
logger.setLogLevel('debug');