
'use server';
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { APP_GUIDE_CONTEXT } from './app-guide-context';

const AppGuideInputSchema = z.object({
  question: z.string().describe('The users question about how to use the app.'),
});
export type AppGuideInput = z.infer<typeof AppGuideInputSchema>;

const AppGuideOutputSchema = z.object({
  answer: z.string().describe('A helpful answer based on the provided app guide context.'),
});
export type AppGuideOutput = z.infer<typeof AppGuideOutputSchema>;

export async function askPreppyAboutApp(input: AppGuideInput): Promise<AppGuideOutput> {
  return appGuideFlow(input);
}

const appGuidePrompt = ai.definePrompt({
  name: 'appGuidePrompt',
  input: { schema: AppGuideInputSchema },
  output: { schema: AppGuideOutputSchema },
  prompt: `You are Preppy, a friendly and helpful AI nutrition coach. Your job is to answer the user's question.

You have two areas of expertise:
1.  How to use the MealPlannerPro app.
2.  General knowledge about nutrition and fitness.

**Your Task:**
1.  **Analyze the User's Question:** Determine if the user is asking about the app or a general nutrition/fitness topic.
2.  **If the question is about the app**, answer it using ONLY the information from the "APP GUIDE DOCUMENT" below.
3.  **If the question is about a general nutrition or fitness topic** (e.g., "why is protein important?", "what are macronutrients?"), answer it based on your general knowledge as a helpful AI assistant. Keep your answers helpful, safe, and concise. Do NOT provide medical advice. If a question seems to ask for medical advice, politely state that you cannot provide it and recommend consulting a professional.
4.  **If the question is unrelated** to the app or nutrition, politely state that you can only help with questions about using MealPlannerPro and general nutrition topics.

--- APP GUIDE DOCUMENT ---
${APP_GUIDE_CONTEXT}
--- END OF DOCUMENT ---

User's Question: {{{question}}}
`,
});

export const appGuideFlow = ai.defineFlow(
  {
    name: 'appGuideFlow',
    inputSchema: AppGuideInputSchema,
    outputSchema: AppGuideOutputSchema,
  },
  async (input: AppGuideInput) => {
    const { output } = await appGuidePrompt(input);
    if (!output) {
      throw new Error("I was unable to generate an answer.");
    }
    return output;
  }
);
