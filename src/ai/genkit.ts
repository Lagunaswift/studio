// src/ai/genkit.ts
import { genkit, configure } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { firebase } from '@genkit-ai/firebase';

// This is the primary export that other files should use.
export { genkit as ai };

// Initialize Genkit
try {
  console.log('Initializing Genkit...');
  
  configure({
    plugins: [
      googleAI(),
      firebase(), // This correctly initializes Firebase functions and other resources
    ],
    // logLevel: 'debug', // This option is not supported in this version
    enableTracingAndMetrics: true,
  });

  console.log('Genkit configured successfully.');

} catch (error) {
  console.error('Failed to initialize Genkit:', error);
  // Re-throw the error to prevent the application from starting in a broken state
  throw new Error(`Could not initialize Genkit: ${(error as Error).message}`);
}
