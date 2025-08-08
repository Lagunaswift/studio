import dynamic from 'next/dynamic';

// Heavy components - load only when needed
export const RecipeForm = dynamic(() => import('@/components/recipes/RecipeForm'), {
  loading: () => <div className="animate-pulse bg-gray-200 h-96 rounded-lg" />,
  ssr: false
});

export const ChartComponent = dynamic(() => import('@/components/ui/chart'), {
  loading: () => <div className="animate-pulse bg-gray-200 h-64 rounded-lg" />,
  ssr: false
});

export const AISuggestionForm = dynamic(() => import('@/components/ai/AISuggestionForm'), {
  loading: () => <div className="animate-pulse bg-gray-200 h-48 rounded-lg" />,
  ssr: false
});

// Calendar component (heavy)
export const Calendar = dynamic(() => import('@/components/ui/calendar'), {
  loading: () => <div className="animate-pulse bg-gray-200 h-80 rounded-lg" />,
  ssr: false
});

// Usage in components:
// Replace: import { RecipeForm } from '@/components/recipes/RecipeForm'
// With: import { RecipeForm } from '@/components/dynamic-imports'