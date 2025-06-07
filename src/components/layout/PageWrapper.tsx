import type React from 'react';

interface PageWrapperProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
}

export function PageWrapper({ children, title, className = '' }: PageWrapperProps) {
  return (
    <div className={`container mx-auto px-4 py-8 ${className}`}>
      {title && (
        <h1 className="text-3xl font-bold font-headline text-primary mb-8 border-b-2 border-accent pb-2">
          {title}
        </h1>
      )}
      {children}
    </div>
  );
}
