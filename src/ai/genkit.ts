// src/ai/genkit.ts - For Genkit 1.15.5
import { googleAI } from '@genkit-ai/googleai';
import { enableFirebaseTelemetry } from '@genkit-ai/firebase'; // Use available exports
import { genkit } from 'genkit';

// Optionally enable Firebase telemetry
enableFirebaseTelemetry();

// Configure the Genkit instance - THIS is what you need to export
export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY,
    }),
    // The 'firebase()' plugin is not available in this version.
    // Firebase integration for features like auth or firestore retrievers
    // needs to be configured differently.
  ],
  model: 'gemini-1.5-flash', // Set default model
});

// Optional: Enable logging
import { logger } from 'genkit/logging';
logger.setLogLevel('debug');
