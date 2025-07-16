
'use client';

import { createContext, useState, useEffect, useContext, ReactNode, useMemo } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import type { UserProfileSettings } from '@/types';
import { supabase } from '@/lib/supabaseClient'; // Import the singleton client

// The Profile type here will be a subset of UserProfileSettings.
interface Profile extends UserProfileSettings {
  id: string;
  email: string;
  name: string | null;
  updated_at?: string;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
  setProfile: React.Dispatch<React.SetStateAction<Profile | null>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const getActiveSession = async () => {
      try {
        const { data: { session: activeSession } } = await supabase.auth.getSession();
        setSession(activeSession);
        setUser(activeSession?.user ?? null);
        if (activeSession?.user) {
          await fetchAndSetProfile(activeSession.user);
        }
      } catch (error) {
        console.error("Error getting active session:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    getActiveSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchAndSetProfile(session.user);
      } else {
        setProfile(null);
      }
      setIsLoading(false);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);
  
  const fetchAndSetProfile = async (user: User) => {
      try {
        const { data: profileData, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116: "No rows found"
            throw error;
        }

        if (profileData) {
            setProfile(profileData as Profile);
        } else {
            // Profile doesn't exist, create it
            const newProfile: Partial<Profile> = {
                id: user.id,
                email: user.email,
                name: user.user_metadata?.name || user.email,
                // Set default values for other UserProfileSettings fields here if needed
            };
            const { data: createdProfile, error: insertError } = await supabase
                .from('profiles')
                .insert(newProfile)
                .select()
                .single();
            
            if (insertError) throw insertError;
            setProfile(createdProfile as Profile);
        }
      } catch(e) {
          console.error("Error fetching or creating profile:", e);
          setProfile(null);
      }
  };


  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) console.error("Error signing out:", error);
    // The onAuthStateChange listener will handle setting user and profile to null
  };

  const value = useMemo(() => ({ supabase, session, user, profile, isLoading, signOut, setProfile }), 
    [session, user, profile, isLoading]
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
