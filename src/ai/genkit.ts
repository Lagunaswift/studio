// src/ai/genkit.ts - For Genkit 1.15.5
import { googleAI } from '@genkit-ai/googleai';
import { enableFirebaseTelemetry } from '@genkit-ai/firebase';
import { genkit } from 'genkit';
import * as path from 'path';

//enable Firebase telemetry only in production with proper Firebase config
if (process.env.NODE_ENV === 'production' && process.env.FIREBASE_PROJECT_ID) {
  try {
    enableFirebaseTelemetry();
  } catch (error) {
    console.warn('Firebase telemetry could not be enabled:', error);
  }
}

// Define prompt directory based on environment
const promptDir = process.env.NODE_ENV === 'production' 
  ? path.join(process.cwd(), '.next/server/prompts')  // Use build output path in production
  : './prompts'; // Use source path in development

console.log('🗂️ Genkit prompt directory:', promptDir);
console.log('📍 Current working directory:', process.cwd());
console.log('⚙️ Environment:', process.env.NODE_ENV);

// Configure the Genkit instance - THIS is what you need to export
export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY,
    }),
  ],
  model: 'googleai/gemini-1.5-flash', // Set default model with googleai/ prefix
  promptDir: promptDir, // Use calculated prompt directory
});

// Ensure prompts are loaded by explicitly importing them
// This helps with deployment environments where prompts might not be auto-discovered
try {
  console.log('🔧 Loading Genkit prompts...');
  
  // Test if the prompt can be accessed
  try {
    const promptTest = ai.prompt('suggestMealPlan');
    console.log('✅ suggestMealPlan prompt loaded successfully');
  } catch (error) {
    console.error('❌ suggestMealPlan prompt failed to load:', error);
  }
  
} catch (error: any) {
  console.error('⚠️ Error loading prompts:', {
    message: error.message,
    name: error.name,
    stack: error.stack?.substring(0, 200)
  });
  
  // In deployment, prompts might not be available immediately
  // This is not necessarily fatal, but we should log it
  console.log('📁 Current working directory:', process.cwd());
  console.log('🗂️ Prompt directory should be:', './prompts');
}

//Enable logging
import { logger } from 'genkit/logging';
logger.setLogLevel('debug');
