import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://mealpreppypro.com';

  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/meal-plan',
          '/recipes',
          '/ai-recipe-finder',
          '/ai-suggestions',
          '/shopping-list',
          '/pantry',
          '/guide',
          '/upgrade',
          '/privacy',
          '/terms',
          '/updates',
        ],
        disallow: [
          '/profile/',
          '/api/',
          '/_next/',
          '/admin/',
          '/dashboard/',
          '/auth/',
          '/login',
          '/signup',
          '/reset-password',
          '/update-password',
          '/daily-check-in',
          '/weekly-check-in',
          '/upgrade/success',
        ],
      },
      {
        userAgent: 'GPTBot',
        disallow: '/',
      },
      {
        userAgent: 'ChatGPT-User',
        disallow: '/',
      },
      {
        userAgent: 'CCBot',
        disallow: '/',
      },
      {
        userAgent: 'anthropic-ai',
        disallow: '/',
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}