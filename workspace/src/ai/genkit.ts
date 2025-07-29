
import { config as dotenvConfig } from 'dotenv';
import path from 'path';

// Explicitly load .env file from the project root
// This ensures GOOGLE_API_KEY is loaded before genkit initializes googleAI plugin
dotenvConfig({ path: path.resolve(process.cwd(), '.env') });

import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { firebase } from '@genkit-ai/firebase/plugin';


// This is the primary export that other files should use
// It is now a clean interface for defining flows, prompts, etc.
// The plugins are configured in the API route where the flows are executed.
export const ai = genkit();
