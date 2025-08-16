import { generateMetadata } from '@/lib/seo';

export const metadata = generateMetadata({
  title: 'AI Nutrition Coach - Personalized Health Suggestions',
  description: 'Get personalized nutrition advice and meal suggestions from our AI coach. Receive tailored recommendations based on your goals, preferences, and current eating patterns.',
  keywords: [
    'AI nutrition coach',
    'personalized nutrition',
    'nutrition suggestions',
    'AI health coach',
    'meal suggestions',
    'nutrition advice',
    'dietary guidance',
    'health recommendations',
    'nutrition AI',
    'wellness coach',
    'smart nutrition',
    'health optimization',
    'nutrition planning',
    'diet coaching',
    'AI wellness'
  ],
  section: 'AI Coach',
  image: '/icons/og-ai-coach.png',
  url: '/ai-suggestions'
});

export default function AISuggestionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}