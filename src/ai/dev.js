import { config } from 'dotenv';
config();
import '@/ai/flows/suggest-meal-plan.ts';
import '@/ai/flows/suggest-protein-intake-flow.ts';
import '@/ai/flows/suggest-recipes-by-ingredients-flow.ts';
import '@/ai/flows/suggest-recipe-modification-flow.ts';
import '@/ai/flows/pro-coach-flow.ts';
import '@/ai/flows/app-guide-flow.ts'; // Added new flow
import '@/ai/flows/suggest-micronutrients-flow.ts'; // Added new flow
import '@/ai/flows/report-bug-flow.ts'; // New bug reporting flow
