
'use client';

import { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { supabase } from '@/lib/supabaseClient'; 
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

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const getActiveSession = async () => {
      const { data: { session: activeSession } } = await supabase.auth.getSession();
      setSession(activeSession);
      setUser(activeSession?.user ?? null);
      if (activeSession?.user) {
        await fetchProfile(activeSession.user);
      }
      setIsLoading(false);
    };
    
    getActiveSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchProfile(session.user);
      } else {
        setProfile(null);
      }
      setIsLoading(false);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (user: User) => {
    // In local mode, we don't fetch a profile from Supabase.
    // Instead, we can synthesize a profile from the user object.
    const synthesizedProfile: Profile = {
        id: user.id,
        email: user.email,
        name: user.user_metadata.name || user.email,
        updated_at: new Date().toISOString()
    };
    setProfile(synthesizedProfile);
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) console.error("Error signing out:", error);
    setUser(null);
    setSession(null);
    setProfile(null);
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
