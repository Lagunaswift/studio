import { generateMetadata } from '@/lib/seo';

export const metadata = generateMetadata({
  title: 'AI Meal Planning - Smart Weekly Meal Plans',
  description: 'Get personalized meal plans powered by AI. Automatically plan your weekly meals based on your dietary goals, preferences, and nutrition targets. Save time and eat healthier.',
  keywords: [
    'meal planning',
    'AI meal planner',
    'weekly meal plan',
    'automatic meal planning',
    'personalized meal plans',
    'nutrition planning',
    'diet planning',
    'meal prep',
    'healthy meal planning',
    'macro meal planning',
    'custom meal plans',
    'smart meal planning',
    'meal scheduling',
    'nutrition goals',
    'balanced meals'
  ],
  section: 'Meal Planning',
  image: '/icons/og-meal-plan.png',
  url: '/meal-plan'
});

export default function MealPlanLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}