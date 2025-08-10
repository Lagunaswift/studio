
import type React from 'react';

interface PageWrapperProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
  maxWidth?: 'container' | 'max-w-5xl' | 'max-w-6xl' | 'max-w-7xl' | 'max-w-full';
}

export function PageWrapper({ children, title, className = '', maxWidth = 'max-w-full' }: PageWrapperProps) {
  const wrapperClasses = {
    'container': 'max-w-7xl mx-auto px-6',
    'max-w-5xl': 'max-w-5xl mx-auto px-6',
    'max-w-6xl': 'max-w-6xl mx-auto px-6',
    'max-w-7xl': 'max-w-7xl mx-auto px-6',
    'max-w-full': 'w-full px-6', 
  };
  const appliedMaxWidthClass = wrapperClasses[maxWidth] || wrapperClasses['max-w-7xl'];

  return (
    <div className={`${appliedMaxWidthClass} py-8 ${className}`}>
      {title && (
        <h1 className="text-3xl font-bold font-headline text-primary mb-8 border-b-2 border-accent pb-2">
          {title}
        </h1>
      )}
      {children}
    </div>
  );
}
