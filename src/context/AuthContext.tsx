
'use client';

import { createContext, useState, useEffect, useContext, ReactNode, useMemo, useCallback } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import type { UserProfileSettings, Sex, ActivityLevel, RDA } from '@/types';
import { supabase } from '@/lib/supabaseClient';
import { ACTIVITY_LEVEL_OPTIONS } from '@/types';

// --- Calculation Helpers ---
const calculateLBM = (weightKg: number | null, bodyFatPercentage: number | null): number | null => {
  if (weightKg && weightKg > 0 && bodyFatPercentage && bodyFatPercentage > 0 && bodyFatPercentage < 100) {
    const lbm = weightKg * (1 - bodyFatPercentage / 100);
    if (isNaN(lbm) || !isFinite(lbm) || lbm <= 0) return null;
    return parseFloat(lbm.toFixed(1));
  }
  return null;
};

const calculateTDEE = (
  weightKg: number | null,
  heightCm: number | null,
  age: number | null,
  sex: Sex | null,
  activityLevel: ActivityLevel | null
): number | null => {
  if (!weightKg || !heightCm || !age || !sex || !activityLevel) return null;
  let bmr: number;
  if (sex === 'male') bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  else bmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
  const activity = ACTIVITY_LEVEL_OPTIONS.find(opt => opt.value === activityLevel);
  if (activity) {
    const tdee = bmr * activity.multiplier;
    if (isNaN(tdee) || !isFinite(tdee) || tdee <= 0) return null;
    return Math.round(tdee);
  }
  return null;
};

const getRdaProfile = (sex: Sex | null | undefined, age: number | null | undefined): RDA | null => {
    if (!sex || !age) {
        return null;
    }
    // Simplified RDA values for demonstration. A real app would use a more complex table.
    // Values are for adults aged 19-50.
    if (age >= 19 && age <= 50) {
        if (sex === 'male') {
            return { iron: 8, calcium: 1000, potassium: 3400, vitaminA: 900, vitaminC: 90, vitaminD: 15 };
        } else { // female
            return { iron: 18, calcium: 1000, potassium: 2600, vitaminA: 700, vitaminC: 75, vitaminD: 15 };
        }
    }
    // Default for other age groups for now
    return { iron: 10, calcium: 1200, potassium: 3000, vitaminA: 800, vitaminC: 80, vitaminD: 15 };
};


// The Profile type here will be a subset of UserProfileSettings.
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

  const processProfile = (profileData: UserProfileSettings | Profile): Profile => {
    const p = { ...profileData } as Profile;
    p.tdee = calculateTDEE(p.weightKg, p.heightCm, p.age, p.sex, p.activityLevel);
    p.leanBodyMassKg = calculateLBM(p.weightKg, p.bodyFatPercentage);
    p.rda = getRdaProfile(p.sex, p.age);
    return p;
  };

  const updateUserProfileInDb = useCallback(async (updates: Partial<UserProfileSettings>) => {
    if (!user || !profile) return;
    
    // Create a new profile object with updates to calculate derived values
    const updatedProfileData = { ...profile, ...updates };
    const processedUpdates = processProfile(updatedProfileData);
    
    // We only want to save the raw fields to the DB, not our calculated ones
    const dbUpdates: Partial<Profile> = {
        ...updates,
        tdee: processedUpdates.tdee,
        leanBodyMassKg: processedUpdates.leanBodyMassKg,
        rda: processedUpdates.rda,
    };

    const { data, error } = await supabase
      .from('profiles')
      .update(dbUpdates)
      .eq('id', user.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating profile in Supabase:", error);
    } else if (data) {
      setProfile(processProfile(data as Profile)); // Update local state with newly processed profile
    }
  }, [user, profile]);

  const acceptTerms = useCallback(async () => {
    if (!profile) return;
    await updateUserProfileInDb({ hasAcceptedTerms: true });
  }, [profile, updateUserProfileInDb]);
  
  const fetchAndSetProfile = useCallback(async (user: User) => {
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
            setProfile(processProfile(profileData as Profile));
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
                // other fields are null by default
            };
            const { data: createdProfile, error: insertError } = await supabase
                .from('profiles')
                .insert(newProfile)
                .select()
                .single();
            
            if (insertError) throw insertError;
            setProfile(processProfile(createdProfile as Profile));
        }
      } catch(e) {
          console.error("Error fetching or creating profile:", e);
          setProfile(null);
      }
  }, []);

  useEffect(() => {
    setIsLoading(true);
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
