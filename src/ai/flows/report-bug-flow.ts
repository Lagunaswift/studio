
'use server';
import { z } from 'zod';
import { ai } from '../genkit';
import { BugReportInputSchema, BugReportOutputSchema } from './schemas';
import { onCallGenkit } from 'firebase-functions/v2/https';

export const reportBugFlow = ai.defineFlow(
  {
    name: 'reportBugFlow',
    inputSchema: BugReportInputSchema,
    outputSchema: BugReportOutputSchema,
  },
  async (input: z.infer<typeof BugReportInputSchema>) => {
    const { output } = await ai.prompt('reportBug').run({
      ...input,
      appVersion: input.appVersion || '1.0.0', // Provide a default if not specified
    });
    if (!output) {
      throw new Error('The AI failed to process the bug report.');
    }
    return output;
  }
);

export const processBugReport = onCallGenkit(
  {},
  reportBugFlow
);
