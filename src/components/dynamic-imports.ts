import dynamic from 'next/dynamic';

// Heavy components - load only when needed (no loading UI)
export const RecipeForm = dynamic(() => import('@/components/recipes/RecipeForm'), {
  ssr: false
});

export const ChartComponent = dynamic(() => import('@/components/ui/chart'), {
  ssr: false
});

export const AISuggestionForm = dynamic(() => import('@/components/ai/AISuggestionForm'), {
  ssr: false
});

export const Calendar = dynamic(() => import('@/components/ui/calendar'), {
  ssr: false
});