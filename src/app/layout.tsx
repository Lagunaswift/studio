// src/app/layout.tsx - ADD AppProvider
import type { Metadata, Viewport } from 'next';
import { PWAInstaller } from '@/components/PWAInstaller';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { OptimizedAppProvider } from '@/context/OptimizedAppContext';
import { AppProvider } from '@/context/AppContext'; // ADD THIS IMPORT
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider } from "next-themes";

export const metadata: Metadata = {
  title: 'MealPlannerPro - Smart Nutrition & Meal Planning',
  description: 'AI-powered meal planning with nutrition tracking, recipe management, and smart shopping lists',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'MealPlannerPro',
    startupImage: [
      '/icons/apple-splash-2048-2732.png',
      '/icons/apple-splash-1668-2224.png',
      '/icons/apple-splash-1536-2048.png',
      '/icons/apple-splash-1125-2436.png',
      '/icons/apple-splash-1242-2208.png',
      '/icons/apple-splash-750-1334.png',
      '/icons/apple-splash-828-1792.png'
    ]
  },
  formatDetection: {
    telephone: false
  },
  openGraph: {
    type: 'website',
    siteName: 'MealPlannerPro',
    title: 'MealPlannerPro - Smart Nutrition & Meal Planning',
    description: 'AI-powered meal planning with nutrition tracking',
    images: ['/og-image.png']
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MealPlannerPro - Smart Nutrition & Meal Planning',
    description: 'AI-powered meal planning with nutrition tracking',
    images: ['/twitter-image.png']
  },
  icons: {
    icon: '/icons/icon-192x192.png',
    apple: '/icons/apple-icon-180x180.png'
  }
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#2563eb'
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/icons/apple-icon-180x180.png" />
        <link rel="mask-icon" href="/icons/safari-pinned-tab.svg" color="#2563eb" />
        <meta name="msapplication-TileColor" content="#2563eb" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
      </head>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <OptimizedAppProvider>
              <AppProvider>
                {children}
                <Toaster />
                <PWAInstaller />
              </AppProvider>
            </OptimizedAppProvider>
          </AuthProvider>
        </ThemeProvider>
        <script dangerouslySetInnerHTML={{
          __html: `
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js')
                  .then(function(registration) {
                    console.log('✅ SW registered: ', registration);
                  })
                  .catch(function(registrationError) {
                    console.log('❌ SW registration failed: ', registrationError);
                  });
              });
            }
          `
        }} />
      </body>
    </html>
  );
}