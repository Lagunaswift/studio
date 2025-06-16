
// src/context/AuthContext.tsx
'use client';

import { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { supabase } from '@/lib/supabaseClient'; // Uses App 1's existing client
import { Session, User } from '@supabase/supabase-js';
import type { MealSlotConfig, MealType, MacroTargets, Sex, ActivityLevel, AthleteType, PrimaryGoal } from '@/types';


// Define the shape of your profile data
interface Profile {
  id: string;
  email?: string;
  full_name?: string;
  subscription_status?: 'active' | 'inactive' | 'none' | null;
  plan_name?: string | null;
  // Add any other fields from your profiles table
  heightCm?: number | null;
  weightKg?: number | null;
  age?: number | null;
  sex?: Sex | null;
  activityLevel?: ActivityLevel | null;
  bodyFatPercentage?: number | null;
  athleteType?: AthleteType | null;
  primaryGoal?: PrimaryGoal | null;
  tdee?: number | null;
  leanBodyMassKg?: number | null;
  macroTargets?: MacroTargets | null;
  dietaryPreferences?: string[];
  allergens?: string[];
  mealStructure?: MealSlotConfig[];
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
    const fetchSessionAndProfile = async () => {
      setIsLoading(true); // Ensure loading is true at the start
      try {
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error("Error fetching session:", sessionError);
          setSession(null);
          setUser(null);
          setProfile(null);
          setIsLoading(false);
          return;
        }

        setSession(currentSession);
        const currentUser = currentSession?.user;
        setUser(currentUser ?? null);

        if (currentUser) {
          const { data: userProfile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single();

          if (profileError) {
            console.error("Error fetching profile:", profileError.message);
            setProfile(null);
          } else {
            setProfile(userProfile as Profile | null);
          }
        } else {
          setProfile(null);
        }
      } catch (error: any) {
        console.error("Error in fetchSessionAndProfile:", error.message);
        setSession(null);
        setUser(null);
        setProfile(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSessionAndProfile();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        setIsLoading(true);
        setSession(newSession);
        const currentUser = newSession?.user;
        setUser(currentUser ?? null);
        if (currentUser) {
          try {
            const { data: userProfile, error: profileError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', currentUser.id)
              .single();

            if (profileError) {
              console.error("Error fetching profile on auth change:", profileError.message);
              setProfile(null);
            } else {
              setProfile(userProfile as Profile | null);
            }
          } catch (error: any) {
             console.error("Error fetching profile after auth state change:", error.message);
             setProfile(null);
          }
        } else {
          setProfile(null);
        }
        setIsLoading(false);
      }
    );

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    setIsLoading(true); // Optionally set loading true during sign out
    await supabase.auth.signOut();
    // Auth listener will handle setting user/session/profile to null and isLoading to false
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
