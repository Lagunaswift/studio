import { config as dotenvConfig } from 'dotenv';
import path from 'path';
// Explicitly load .env file from the project root
// This ensures GOOGLE_API_KEY is loaded before genkit initializes googleAI plugin
dotenvConfig({ path: path.resolve(process.cwd(), '.env') });
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
export const ai = genkit({
    plugins: [googleAI()],
    model: 'googleai/gemini-2.0-flash',
});
