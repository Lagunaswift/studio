
'use client';

import { createContext, useState, useEffect, useContext, ReactNode, useMemo, useCallback } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import type { UserProfileSettings } from '@/types';
import { supabase } from '@/lib/supabaseClient';

const isOnlineMode = () => process.env.NEXT_PUBLIC_SERVICE_STATUS === 'online';

export interface Profile extends UserProfileSettings {
  id: string;
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
    if (!isOnlineMode() || !user || !profile) return;
    
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating profile in Supabase:", error);
    } else if (data) {
      setProfile(data as Profile);
    }
  }, [user, profile]);

  const acceptTerms = useCallback(async () => {
    if (!profile) return;
    await updateUserProfileInDb({ hasAcceptedTerms: true });
    setProfile(p => p ? { ...p, hasAcceptedTerms: true } : null); // Update local state immediately
  }, [profile, updateUserProfileInDb]);
  
  const fetchAndSetProfile = useCallback(async (user: User) => {
      if (!isOnlineMode()) {
        setProfile(null);
        return;
      }
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
            // Profile doesn't exist, create it with defaults
            const newProfile: Partial<Profile> = {
                id: user.id,
                email: user.email!,
                name: user.user_metadata?.name || user.email,
                macroTargets: { calories: 2000, protein: 150, carbs: 200, fat: 60 },
                dietaryPreferences: [],
                allergens: [],
                mealStructure: [
                    { id: '1', name: 'Breakfast', type: 'Breakfast' },
                    { id: '2', name: 'Lunch', type: 'Lunch' },
                    { id: '3', name: 'Dinner', type: 'Dinner' },
                    { id: '4', name: 'Snack', type: 'Snack' },
                ],
                hasAcceptedTerms: false,
                dashboardSettings: { showMacros: true, showMenu: true, showFeaturedRecipe: true, showQuickRecipes: true },
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
  }, []);

  useEffect(() => {
    setIsLoading(true);
    if (!isOnlineMode()) {
        setIsLoading(false);
        return;
    }

    const getActiveSession = async () => {
      const { data: { session: activeSession } } = await supabase.auth.getSession();
      setSession(activeSession);
      setUser(activeSession?.user ?? null);
      if (activeSession?.user) {
        await fetchAndSetProfile(activeSession.user);
      }
      setIsLoading(false);
    };
    
    getActiveSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      
      if (event === 'SIGNED_IN' && currentUser) {
          setIsLoading(true);
          await fetchAndSetProfile(currentUser);
          setIsLoading(false);
      } else if (event === 'SIGNED_OUT') {
        setProfile(null);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [fetchAndSetProfile]);


  const signOut = async () => {
    if (!isOnlineMode()) return;
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
