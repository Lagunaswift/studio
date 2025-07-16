
'use client';

import { createContext, useState, useEffect, useContext, ReactNode, useMemo, useCallback } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import type { UserProfileSettings } from '@/types';
import { supabase } from '@/lib/supabaseClient'; 

// The Profile type here will be a subset of UserProfileSettings.
export interface Profile extends UserProfileSettings {
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
  acceptTerms: () => Promise<void>;
  updateUserProfileInDb: (updates: Partial<UserProfileSettings>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const updateUserProfileInDb = useCallback(async (updates: Partial<UserProfileSettings>) => {
    if (!user || !profile) return;

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating profile in Supabase:", error);
      // Optionally re-throw or handle the error in UI
    } else if (data) {
      setProfile(data as Profile); // Update profile in AuthContext
    }
  }, [user, profile]);

  const acceptTerms = useCallback(async () => {
    if (!profile) return;
    await updateUserProfileInDb({ hasAcceptedTerms: true });
    // Manually update the local state immediately after the DB call succeeds.
    setProfile(prevProfile => prevProfile ? { ...prevProfile, hasAcceptedTerms: true } : null);
  }, [profile, updateUserProfileInDb]);
  
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
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      
      if (currentUser) {
        // If user is same, don't refetch profile to avoid overwriting local changes.
        // Let other parts of the app handle profile updates.
        if (currentUser.id !== profile?.id) {
           await fetchAndSetProfile(currentUser);
        }
      } else {
        setProfile(null);
      }
      setIsLoading(false);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [profile?.id]); // Rerun if profile id changes
  
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
                email: user.email!,
                name: user.user_metadata?.name || user.email,
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
  };

  const value = useMemo(() => ({ session, user, profile, isLoading, signOut, setProfile, acceptTerms, updateUserProfileInDb }), 
    [session, user, profile, isLoading, signOut, acceptTerms, updateUserProfileInDb]
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
