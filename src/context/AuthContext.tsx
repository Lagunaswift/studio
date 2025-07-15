
'use client';

import { createContext, useState, useEffect, useContext, ReactNode, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import type { Session, User, SupabaseClient } from '@supabase/supabase-js';
import type { UserProfileSettings } from '@/types';

// The Profile type here will be a subset of UserProfileSettings.
interface Profile extends Partial<UserProfileSettings> {
  id: string;
  email?: string;
  name?: string | null;
  updated_at?: string;
}

interface AuthContextType {
  supabase: SupabaseClient | null;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("Supabase credentials not found. Make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.");
      setIsLoading(false);
      return;
    }
    
    const client = createClient(supabaseUrl, supabaseAnonKey);
    setSupabase(client);

    const getActiveSession = async () => {
      const { data: { session: activeSession } } = await client.auth.getSession();
      setSession(activeSession);
      setUser(activeSession?.user ?? null);
      if (activeSession?.user) {
        // For local mode, we synthesize a profile instead of fetching.
        const synthesizedProfile: Profile = {
            id: activeSession.user.id,
            email: activeSession.user.email,
            name: activeSession.user.user_metadata.name || activeSession.user.email,
            updated_at: new Date().toISOString()
        };
        setProfile(synthesizedProfile);
      }
      setIsLoading(false);
    };
    
    getActiveSession();

    const { data: authListener } = client.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
         const synthesizedProfile: Profile = {
            id: session.user.id,
            email: session.user.email,
            name: session.user.user_metadata.name || session.user.email,
            updated_at: new Date().toISOString()
        };
        setProfile(synthesizedProfile);
      } else {
        setProfile(null);
      }
      setIsLoading(false);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) console.error("Error signing out:", error);
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  const value = useMemo(() => ({ supabase, session, user, profile, isLoading, signOut }), 
    [supabase, session, user, profile, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
