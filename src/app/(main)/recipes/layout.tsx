import { generateMetadata } from '@/lib/seo';

export const metadata = generateMetadata({
  title: 'Healthy Recipes - AI-Curated Recipe Collection',
  description: 'Discover thousands of healthy recipes with detailed nutrition information. Filter by dietary preferences, cooking time, and ingredients. Perfect for meal planning and healthy eating.',
  keywords: [
    'healthy recipes',
    'nutrition recipes',
    'meal prep recipes',
    'diet recipes',
    'cooking',
    'healthy cooking',
    'recipe collection',
    'nutritious meals',
    'balanced diet recipes',
    'fitness recipes',
    'weight loss recipes',
    'low carb recipes',
    'high protein recipes',
    'vegetarian recipes',
    'vegan recipes'
  ],
  section: 'Recipes',
  image: '/icons/og-recipes.png',
  url: '/recipes'
});

export default function RecipesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}