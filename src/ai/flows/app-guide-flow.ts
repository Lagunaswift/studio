'use server';
/**
 * @fileOverview An AI agent that answers user questions about how the app works.
 *
 * - askPreppyAboutApp - A function that answers questions based on the app's guide.
 * - AppGuideInput - The input type for the function.
 * - AppGuideOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// Using the provided README content as the knowledge base for the AI.
const APP_GUIDE_CONTEXT = `
# MealPlannerPro

## 🚀 Your Intelligent Adaptive Nutrition Coach

MealPlannerPro is a comprehensive, AI-powered meal planning application designed to help you achieve your health and fitness goals. Whether you want to lose fat, build muscle, or simply maintain a healthy lifestyle, our adaptive coaching system analyzes your progress and adjusts your targets to keep you on track.

---

## ✨ Core Features

### 📊 Dashboard
Your daily command center. Get a quick snapshot of your progress, including:
- **Today's Consumed Macros**: Visually track your calorie, protein, carb, and fat intake against your set goals.
- **Daily Weight Log**: Easily log your weight to enable long-term trend analysis.
- **Today's Menu**: See your planned meals for the day at a glance.
- **Featured Recipe**: Get inspired with a randomly selected recipe from your collection.

### 🥗 Recipe Management
A flexible and powerful recipe book tailored to your needs.
- **Recipe Library**: Store and browse all your favorite recipes.
- **Detailed View**: Access full ingredient lists, step-by-step instructions, and macronutrient information for every recipe.
- **AI Recipe Tweaker**: Ask the AI to modify any existing recipe to suit your needs (e.g., "make this vegetarian," "what can I use instead of almonds?").
- **Add Your Own**: Easily add your custom recipes with a comprehensive form.

### 🗓️ Meal Planning
Plan your meals with an intuitive calendar interface.
- **Daily & Weekly Views**: Switch between a detailed daily planner and a high-level weekly overview.
- **Interactive Calendar**: Select any date to plan ahead or review past logs.
- **Smart Recipe Picker**: Quickly browse and add recipes to your meal slots for any day.
- **Serving Adjustments**: Easily edit the number of servings for any planned meal.
- **Track Consumption**: Mark meals as "eaten" to differentiate planned vs. consumed macros.

### 🛒 Pantry & Shopping List
Smart inventory management that saves you time and money.
- **Pantry Tracking**: Keep a digital inventory of ingredients you have on hand, complete with quantities and expiry dates.
- **Automated Shopping List**: The app automatically generates a shopping list based on your meal plan, intelligently subtracting what you already have in your pantry.
- **Organized Views**: View your shopping list grouped by supermarket aisle or by recipe.

### 🤖 AI-Powered Tools
Leverage the power of generative AI for a truly personalized experience.
- **AI Plan Generator**: Let the AI create a complete, one-day meal plan based on your macro targets, meal structure, dietary preferences, and available recipes.
- **Pantry Chef (AI Recipe Finder)**: Don't know what to make? Enter the ingredients you have, and the AI will suggest the best recipes from your collection that you can make right now.
- **Adaptive Coach Check-in**: This is the core of MealPlannerPro's intelligence. After 14 days of data, the weekly check-in analyzes your weight trend and actual calorie intake to calculate your true energy expenditure (TDEE). It then recommends new, optimized macro targets to ensure you stay on track with your goals.

### ⚙️ Comprehensive Profile & Goal Setting
Fine-tune every aspect of your nutrition journey.
- **Detailed User Info**: Set your height, weight, age, sex, activity level, and training experience.
- **Calculated Estimates**: The app automatically calculates your TDEE (Total Daily Energy Expenditure) and LBM (Lean Body Mass) to inform your goals.
- **Customizable Targets**: Manually set your macros or use the AI-powered Goal Calculator to get evidence-based recommendations for fat loss or muscle gain.
- **Diet & Allergen Filters**: Define your dietary preferences (e.g., Vegetarian, Keto) and allergens to automatically filter recipes across the app.
- **Custom Meal Structure**: Define your own meal slots for the day (e.g., "Breakfast," "Post-Workout Meal," "Dinner").

---

## 🗺️ The User Journey: How to Get Started

1.  **Set Up Your Profile**: The more information you provide, the better the app works.
    - Go to \`Settings\` -> \`My Profile\` and fill out your user info.
    - Go to \`Settings\` -> \`Diet & Allergens\` to set your preferences.
    - Go to \`Settings\` -> \`Meal Structure\` to define your daily meals.
    - Go to \`Progress\` -> \`My Goals & Targets\` to set your initial macro goals using the Goal Calculator.

2.  **Build Your Recipe Book**: Navigate to \`Recipes\` -> \`My Saved Recipes\` and click "Add New Recipe" to start populating your collection.

3.  **Plan Your Week**: Use the \`Daily/Weekly View\` under the \`Plan\` section to manually add recipes, or let the \`AI Plan Generator\` create a plan for you.

4.  **Track Your Progress**:
    - Log your weight daily on the \`Dashboard\`.
    - Mark meals as "eaten" on the \`Meal Plan\` page.

5.  **Check In & Adapt**: After logging data for 14 days, visit the \`Adaptive Coach Check-in\` page under \`Progress\`. Run the check-in, review the AI's recommendations, and click "Accept" to automatically update your macro targets for the week ahead.
`;

const AppGuideInputSchema = z.object({
  question: z.string().describe('The user\'s question about how to use the app.'),
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

const appGuideFlow = ai.defineFlow(
  {
    name: 'appGuideFlow',
    inputSchema: AppGuideInputSchema,
    outputSchema: AppGuideOutputSchema,
  },
  async (input) => {
    const { output } = await appGuidePrompt(input);
    if (!output) {
      throw new Error("I was unable to generate an answer.");
    }
    return output;
  }
);
