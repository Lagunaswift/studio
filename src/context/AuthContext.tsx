
'use client';

import { createContext, useState, useEffect, useContext, ReactNode } from 'react';
// import { supabase } from '@/lib/supabaseClient'; // Supabase is no longer used for auth
import type { Session, User } from '@supabase/supabase-js';
import type { UserProfileSettings } from '@/types';

// The Profile type here will be a subset of UserProfileSettings.
interface Profile extends Partial<UserProfileSettings> {
  id: string;
  email?: string;
  name?: string | null;
  updated_at?: string;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Define a mock user and profile for local development
const MOCK_USER: User = {
  id: 'local-user-123',
  app_metadata: {},
  user_metadata: { name: 'Local User' },
  aud: 'authenticated',
  created_at: new Date().toISOString(),
};

const MOCK_PROFILE: Profile = {
    id: 'local-user-123',
    email: 'user@example.com',
    name: 'Local User',
    hasAcceptedTerms: true, // Assume terms are accepted for local dev
};


export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // In local mode, we immediately set a mock user session.
    // There's no need to interact with Supabase for authentication.
    console.log("AuthProvider: Running in local mode. Setting mock user.");
    setUser(MOCK_USER);
    setProfile(MOCK_PROFILE);
    setSession({
        user: MOCK_USER,
        access_token: 'mock-token',
        refresh_token: 'mock-refresh-token',
        expires_in: 3600,
        token_type: 'bearer',
    });
    setIsLoading(false);

    // The Supabase auth listener is not needed in local mode.
    // const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => { ... });
    // return () => { authListener.subscription.unsubscribe(); };
  }, []);

  const signOut = async () => {
    // In local mode, signOut can just log a message as there's no session to clear.
    console.log("Signing out (local mode) - no remote action taken.");
    setUser(null);
    setSession(null);
    setProfile(null);
    return Promise.resolve();
  };

  const value = { session, user, profile, isLoading, signOut };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
