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

// Ensure prompts are loaded by explicitly importing them
// This helps with deployment environments where prompts might not be auto-discovered
try {
  console.log('🔧 Loading Genkit prompts...');
  
  // Test if the prompt can be accessed
  const promptTest = ai.prompt('suggestMealPlan');
  if (promptTest) {
    console.log('✅ suggestMealPlan prompt loaded successfully');
  } else {
    console.error('❌ suggestMealPlan prompt is undefined');
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
