// src/ai/genkit.ts - For Genkit 1.15.5
import { googleAI } from '@genkit-ai/googleai';
import { enableFirebaseTelemetry } from '@genkit-ai/firebase';
import { genkit } from 'genkit';

//enable Firebase telemetry only in production with proper Firebase config
if (process.env.NODE_ENV === 'production' && process.env.FIREBASE_PROJECT_ID) {
  try {
    enableFirebaseTelemetry();
  } catch (error) {
    console.warn('Firebase telemetry could not be enabled:', error);
  }
}

// Configure the Genkit instance - THIS is what you need to export
export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY,
    }),
  ],
  model: 'googleai/gemini-1.5-flash', // Set default model with googleai/ prefix
  promptDir: './prompts', // Tell Genkit where to find .prompt files
});

//Enable logging
import { logger } from 'genkit/logging';
logger.setLogLevel('debug');
