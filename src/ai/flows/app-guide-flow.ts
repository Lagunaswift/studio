
'use server';
import { z } from 'zod';
import { ai } from '../genkit';  // Import your configured instance
import { AppGuideInputSchema, AppGuideOutputSchema } from './schemas';
import { onCallGenkit } from 'firebase-functions/v2/https';
import { APP_GUIDE_CONTEXT } from './app-guide-context';

export const askPreppyAboutApp = ai.defineFlow(
  {
    name: 'askPreppyAboutApp',
    inputSchema: AppGuideInputSchema,
    outputSchema: AppGuideOutputSchema,
  },
  async (input: z.infer<typeof AppGuideInputSchema>) => {
    const { output } = await ai.prompt('appGuide').run({
        ...input,
        appGuideContext: APP_GUIDE_CONTEXT,
      });
      if (!output) {
        throw new Error('I was unable to generate an answer.');
      }
      return output;
  }
);

// For Firebase Functions deployment
export const askPreppyAboutAppFunction = onCallGenkit(
  {},
  askPreppyAboutApp
);
