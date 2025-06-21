
import { config } from 'dotenv';
config();

import '@/ai/flows/suggest-meal-plan.ts';
import '@/ai/flows/suggest-protein-intake-flow.ts';
import '@/ai/flows/suggest-recipes-by-ingredients-flow.ts';
import '@/ai/flows/suggest-recipe-modification-flow.ts'; // Added new flow
