
// src/context/AuthContext.tsx
'use client';

import { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { supabase } from '@/lib/supabaseClient'; // Uses App 1's existing client
import { Session, User } from '@supabase/supabase-js';

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
}

type Sex = 'male' | 'female';
type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'veryActive';
type AthleteType = 'endurance' | 'strengthPower' | 'generalFitness' | 'notSpecified';
type PrimaryGoal = 'fatLoss' | 'muscleGain' | 'maintenance' | 'notSpecified';
interface MacroTargets { calories: number; protein: number; carbs: number; fat: number; }
interface MealSlotConfig { id: string; name: string; type: MealType; }
type MealType = "Breakfast" | "Lunch" | "Dinner" | "Snack";


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
  const [profile, setProfile] = useState<Profile | null>(null); // Initialize profile as null
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSessionAndProfile = async () => {
      setIsLoading(true); 
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
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
            console.error("Error fetching profile:", profileError);
            setProfile(null);
          } else {
            setProfile(userProfile as Profile | null);
          }
        } else {
          setProfile(null); 
        }
      } catch (error) {
        console.error("Error in fetchSessionAndProfile:", error);
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
              console.error("Error fetching profile on auth change:", profileError);
              setProfile(null);
            } else {
              setProfile(userProfile as Profile | null);
            }
          } catch (error) {
             console.error("Error fetching profile after auth state change:", error);
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
    setIsLoading(true);
    await supabase.auth.signOut();
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
