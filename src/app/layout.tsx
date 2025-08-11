// src/app/layout.tsx - ADD AppProvider
import type { Metadata, Viewport } from 'next';
import { PWAInstaller } from '@/components/PWAInstaller';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { OptimizedAppProvider } from '@/context/OptimizedAppContext';
import { AppProvider } from '@/context/AppContext'; // ADD THIS IMPORT
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider } from "next-themes";
import { defaultMetadata, generateWebsiteJsonLd, generateOrganizationJsonLd } from '@/lib/seo';

export const metadata: Metadata = {
  ...defaultMetadata,
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'MealPreppyPro',
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
  icons: {
    icon: [
      { url: '/icons/icon-48x48.png', sizes: '48x48' },
      { url: '/icons/icon-72x72.png', sizes: '72x72' },
      { url: '/icons/icon-96x96.png', sizes: '96x96' },
      { url: '/icons/icon-128x128.png', sizes: '128x128' },
      { url: '/icons/icon-144x144.png', sizes: '144x144' },
      { url: '/icons/icon-152x152.png', sizes: '152x152' },
      { url: '/icons/icon-192x192.png', sizes: '192x192' },
      { url: '/icons/icon-384x384.png', sizes: '384x384' },
      { url: '/icons/icon-512x512.png', sizes: '512x512' },
    ],
    apple: '/icons/apple-icon-180x180.png',
    shortcut: '/favicon.ico'
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
  const websiteJsonLd = generateWebsiteJsonLd();
  const organizationJsonLd = generateOrganizationJsonLd();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/icons/apple-icon-180x180.png" />
        <link rel="mask-icon" href="/icons/safari-pinned-tab.svg" color="#2563eb" />
        <meta name="msapplication-TileColor" content="#2563eb" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
        
        {/* Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
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