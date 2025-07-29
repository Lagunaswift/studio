import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { firebase } from '@genkit-ai/firebase';
import { firebaseApp } from '@/lib/firebase-admin-init';

export const ai = genkit({
  plugins: [
    googleAI(),
    firebase(firebaseApp),
  ],
});
