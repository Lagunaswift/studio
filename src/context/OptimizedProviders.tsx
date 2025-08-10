"use client";

import { memo, useMemo } from 'react';
import { AuthProvider } from '@/context/AuthContext';
import { OptimizedAppProvider } from '@/context/OptimizedAppContext';
import { ThemeProvider } from 'next-themes';

interface ProvidersProps {
  children: React.ReactNode;
}

const Providers = memo(({ children }: ProvidersProps) => {
  const themeProps = useMemo(() => ({
    attribute: "class",
    defaultTheme: "system",
    enableSystem: true,
    disableTransitionOnChange: true, // Faster theme switching
  }), []);

  return (
    <ThemeProvider {...themeProps}>
      <AuthProvider>
        <OptimizedAppProvider>
          {children}
        </OptimizedAppProvider>
      </AuthProvider>
    </ThemeProvider>
  );
});

Providers.displayName = 'Providers';

export default Providers;