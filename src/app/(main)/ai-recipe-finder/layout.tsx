import { generateMetadata } from '@/lib/seo';

export const metadata = generateMetadata({
  title: 'AI Recipe Finder - Discover Recipes with AI',
  description: 'Find the perfect recipe using AI technology. Search by ingredients, dietary restrictions, cooking time, and preferences. Get personalized recipe recommendations instantly.',
  keywords: [
    'AI recipe finder',
    'recipe search',
    'ingredient-based recipes',
    'AI cooking assistant',
    'recipe recommendations',
    'smart recipe search',
    'recipe generator',
    'cooking AI',
    'personalized recipes',
    'recipe discovery',
    'intelligent recipe finder',
    'recipe suggestions',
    'cooking help',
    'meal ideas',
    'food AI'
  ],
  section: 'AI Tools',
  image: '/icons/og-ai-recipes.png',
  url: '/ai-recipe-finder'
});

export default function AIRecipeFinderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}