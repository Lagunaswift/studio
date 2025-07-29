
import { config as dotenvConfig } from 'dotenv';
import path from 'path';

// Explicitly load .env file from the project root
// This ensures GOOGLE_API_KEY is loaded before genkit initializes googleAI plugin
dotenvConfig({ path: path.resolve(process.cwd(), '.env') });

import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { firebase } from '@genkit-ai/firebase/plugin';


// This is the primary export that other files should use
export const ai = genkit({
  plugins: [
    googleAI(),
    firebase(), // Add the Firebase plugin for auth context
  ],
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});

// The genkit export is now only used for the API route configuration
export { genkit };
