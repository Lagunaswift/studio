
'use server';
/**
 * @fileOverview An AI agent that analyzes and categorizes user-submitted bug reports.
 *
 * - processBugReport - A function that takes a user's description, categorizes it, and returns structured data.
 * - BugReportInput - The input type for the function.
 * - BugReportOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { BugReportInputSchema, BugReportOutputSchema } from './schemas';

export type BugReportInput = z.infer<typeof BugReportInputSchema>;
export type BugReportOutput = z.infer<typeof BugReportOutputSchema>;

export async function processBugReport(input: BugReportInput): Promise<BugReportOutput> {
  return reportBugFlow(input);
}

const bugReportPrompt = ai.definePrompt({
  name: 'bugReportCategorizerPrompt',
  input: { schema: BugReportInputSchema },
  output: { schema: BugReportOutputSchema },
  prompt: `You are an expert software quality assurance engineer. Your task is to analyze a user's bug report and convert it into a structured, actionable ticket.

**User's Bug Report:**
"{{{description}}}"

**Context:**
- App Version: {{{appVersion}}}
- User ID: {{{userId}}}

**Your Task:**
1.  **Analyze the Report:** Carefully read the user's description to understand the core problem.
2.  **Generate a Title:** Create a short, clear, and descriptive title for the bug. For example, instead of "it broke", use "Cannot Add Recipe to Meal Plan".
3.  **Summarize the Issue:** Write a one-paragraph summary of the bug from the user's perspective.
4.  **Categorize the Bug:** Assign one of the following categories: 'UI/UX', 'Performance', 'Data', 'Authentication', 'AI/Preppy', 'Other'.
5.  **Assign Priority:** Estimate the priority based on the likely impact:
    *   **Critical:** App crashes, data loss, security issue, core feature completely unusable.
    *   **High:** Major feature not working correctly, significantly impacts user experience.
    *   **Medium:** Minor feature not working correctly, an inconvenience but has a workaround.
    *   **Low:** Typo, cosmetic issue, minor visual glitch.
6.  **List Steps to Reproduce:** If possible, infer the steps the user took to encounter the bug. If not clear, omit this field or leave it as an empty array.

Output the entire response as a single, valid JSON object that conforms EXACTLY to the 'BugReportOutputSchema'. Do not include any text outside this JSON object.`,
});

const reportBugFlow = ai.defineFlow(
  {
    name: 'reportBugFlow',
    inputSchema: BugReportInputSchema,
    outputSchema: BugReportOutputSchema,
  },
  async (input) => {
    const { output } = await bugReportPrompt({
        ...input,
        appVersion: input.appVersion || '1.0.0', // Provide a default if not specified
    });
    if (!output) {
      throw new Error("The AI failed to process the bug report.");
    }
    return output;
  }
);
