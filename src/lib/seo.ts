import type { Metadata } from 'next';

interface SEOConfig {
  title: string;
  description: string;
  keywords?: string[];
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'product';
  publishedTime?: string;
  modifiedTime?: string;
  authors?: string[];
  section?: string;
}

const baseConfig = {
  siteName: 'MealPlannerPro',
  siteUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://mealplannerpro.com',
  defaultImage: '/icons/og-image.png',
  twitterHandle: '@MealPlannerPro',
  author: 'MealPlannerPro Team',
};

export function generateMetadata(config: SEOConfig): Metadata {
  const {
    title,
    description,
    keywords = [],
    image = baseConfig.defaultImage,
    url = baseConfig.siteUrl,
    type = 'website',
    publishedTime,
    modifiedTime,
    authors = [baseConfig.author],
    section,
  } = config;

  const fullTitle = title.includes(baseConfig.siteName) 
    ? title 
    : `${title} | ${baseConfig.siteName}`;

  const imageUrl = image.startsWith('http') ? image : `${baseConfig.siteUrl}${image}`;

  return {
    title: fullTitle,
    description,
    keywords: keywords.length > 0 ? keywords.join(', ') : undefined,
    authors: authors.map(name => ({ name })),
    creator: baseConfig.author,
    publisher: baseConfig.siteName,
    category: section,
    
    alternates: {
      canonical: url,
    },

    openGraph: {
      type: type as any,
      title: fullTitle,
      description,
      url,
      siteName: baseConfig.siteName,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: title,
        }
      ],
      locale: 'en_US',
      ...(publishedTime && { publishedTime }),
      ...(modifiedTime && { modifiedTime }),
      ...(authors && { authors: authors }),
      ...(section && { section }),
    },

    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [imageUrl],
      creator: baseConfig.twitterHandle,
      site: baseConfig.twitterHandle,
    },

    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },

    verification: {
      google: process.env.GOOGLE_SITE_VERIFICATION,
      yandex: process.env.YANDEX_VERIFICATION,
      yahoo: process.env.YAHOO_SITE_VERIFICATION,
      other: {
        me: [baseConfig.siteUrl],
      },
    },
  };
}

export const defaultMetadata = generateMetadata({
  title: 'MealPlannerPro - AI-Powered Smart Nutrition & Meal Planning',
  description: 'Transform your nutrition with AI-powered meal planning. Get personalized meal plans, track macros, manage recipes, and create smart shopping lists. Start your healthy eating journey today!',
  keywords: [
    'meal planning',
    'nutrition tracking',
    'AI meal planner',
    'healthy eating',
    'macro tracking',
    'recipe management',
    'diet planning',
    'meal prep',
    'nutrition app',
    'healthy recipes',
    'weight loss',
    'fitness nutrition',
    'personalized meal plans',
    'smart shopping lists',
    'food tracking'
  ],
});

export function generateBreadcrumbJsonLd(items: Array<{ name: string; url: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${baseConfig.siteUrl}${item.url}`,
    })),
  };
}

export function generateWebsiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: baseConfig.siteName,
    url: baseConfig.siteUrl,
    description: 'AI-powered meal planning with nutrition tracking, recipe management, and smart shopping lists',
    potentialAction: {
      '@type': 'SearchAction',
      target: `${baseConfig.siteUrl}/recipes?search={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
    sameAs: [
      'https://twitter.com/MealPlannerPro',
      'https://facebook.com/MealPlannerPro',
      'https://instagram.com/MealPlannerPro',
    ],
  };
}

export function generateOrganizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: baseConfig.siteName,
    url: baseConfig.siteUrl,
    logo: `${baseConfig.siteUrl}/icons/icon-512x512.png`,
    description: 'Leading AI-powered meal planning and nutrition tracking platform',
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+1-555-MEAL-PLAN',
      contactType: 'Customer Service',
      availableLanguage: 'English',
    },
    sameAs: [
      'https://twitter.com/MealPlannerPro',
      'https://facebook.com/MealPlannerPro',
      'https://instagram.com/MealPlannerPro',
    ],
  };
}

export function generateRecipeJsonLd(recipe: {
  name: string;
  description: string;
  image: string;
  prepTime?: number;
  cookTime?: number;
  totalTime?: number;
  recipeYield?: string;
  recipeCategory?: string;
  recipeCuisine?: string;
  nutrition?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
  };
  ingredients?: string[];
  instructions?: string[];
  author?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    name: recipe.name,
    description: recipe.description,
    image: recipe.image.startsWith('http') ? recipe.image : `${baseConfig.siteUrl}${recipe.image}`,
    author: {
      '@type': 'Person',
      name: recipe.author || baseConfig.author,
    },
    datePublished: new Date().toISOString(),
    prepTime: recipe.prepTime ? `PT${recipe.prepTime}M` : undefined,
    cookTime: recipe.cookTime ? `PT${recipe.cookTime}M` : undefined,
    totalTime: recipe.totalTime ? `PT${recipe.totalTime}M` : undefined,
    recipeYield: recipe.recipeYield,
    recipeCategory: recipe.recipeCategory,
    recipeCuisine: recipe.recipeCuisine,
    nutrition: recipe.nutrition ? {
      '@type': 'NutritionInformation',
      calories: recipe.nutrition.calories ? `${recipe.nutrition.calories} calories` : undefined,
      proteinContent: recipe.nutrition.protein ? `${recipe.nutrition.protein}g` : undefined,
      carbohydrateContent: recipe.nutrition.carbs ? `${recipe.nutrition.carbs}g` : undefined,
      fatContent: recipe.nutrition.fat ? `${recipe.nutrition.fat}g` : undefined,
    } : undefined,
    recipeIngredient: recipe.ingredients,
    recipeInstructions: recipe.instructions?.map((instruction, index) => ({
      '@type': 'HowToStep',
      text: instruction,
      position: index + 1,
    })),
  };
}