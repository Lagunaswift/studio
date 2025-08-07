// src/app/(auth)/layout.tsx
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If auth is done loading and we have a user, redirect them to the main page.
    if (!isLoading && user) {
      router.push('/'); 
    }
  }, [user, isLoading, router]);

  // While loading, show a blank screen or a spinner to prevent flicker
  if (isLoading || user) {
    return null; 
  }

  // If not loading and no user, show the auth page (login, signup, etc.)
  return <>{children}</>;
}
