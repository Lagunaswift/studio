
// src/context/AuthContext.tsx
'use client';

import { createContext, useState, useEffect, useContext, ReactNode } from 'react';
// import { supabase } from '@/lib/supabaseClient'; // Supabase calls commented out
import type { Session, User } from '@supabase/supabase-js';
import type { MealSlotConfig, MacroTargets, Sex, ActivityLevel, AthleteType, PrimaryGoal } from '@/types';


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

// Mock user and session for local testing
const MOCK_USER_ID = 'local-test-user';
const mockUser: User = {
  id: MOCK_USER_ID,
  app_metadata: { provider: 'email' },
  user_metadata: { full_name: 'Local Tester' },
  aud: 'authenticated',
  created_at: new Date().toISOString(),
  email: 'tester@example.com',
};

const mockSession: Session = {
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  expires_in: 3600,
  token_type: 'bearer',
  user: mockUser,
  expires_at: Date.now() + 3600 * 1000,
};

// Minimal mock profile, or null. Detailed profile comes from AppContext for local testing.
const mockProfile: Profile | null = {
    id: MOCK_USER_ID,
    email: 'tester@example.com',
    full_name: 'Local Tester',
    subscription_status: 'active', // Assuming active for testing unlocked features
    // Other fields can be null or default if AISuggestionsPage will pull from AppContext
    macroTargets: null, 
    mealStructure: [], 
};


export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(mockSession);
  const [user, setUser] = useState<User | null>(mockUser);
  const [profile, setProfile] = useState<Profile | null>(mockProfile); // Provide a minimal mock or null
  const [isLoading, setIsLoading] = useState(false); // Start as false for local testing

  useEffect(() => {
    // No Supabase listeners needed for local testing
    // Simulate initial load complete
    setIsLoading(false);
    
    // Example: if you wanted to load a profile from localStorage for AuthContext (optional)
    // const localProfile = localStorage.getItem('authContextLocalProfile');
    // if (localProfile) {
    //   setProfile(JSON.parse(localProfile));
    // } else {
    //   // setProfile(mockProfile); // Or some default if not found
    //   localStorage.setItem('authContextLocalProfile', JSON.stringify(mockProfile));
    // }

  }, []);

  const signOut = async () => {
    // For local testing, simulate sign out
    setUser(null);
    setSession(null);
    setProfile(null);
    // localStorage.removeItem('authContextLocalProfile'); // If you implement local storage for AuthContext profile
    console.log("User signed out (local mock)");
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
