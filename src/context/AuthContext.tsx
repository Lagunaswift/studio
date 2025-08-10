
"use client";

import { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { auth } from '@/lib/firebase-client';
import { onAuthStateChanged, signOut as firebaseSignOut, type User } from 'firebase/auth';
import { updateUserProfile } from '@/app/(main)/profile/actions';
import { useUserProfile } from '@/hooks/useUserProfile';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
  isRecipeFavorite: (recipeId: number) => boolean;
  toggleFavoriteRecipe: (recipeId: number) => Promise<void>;
  // ✅ Add profile data to the context
  profile: ReturnType<typeof useUserProfile>['profile'];
  profileLoading: boolean;
  profileError: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // ✅ Fix: Pass user correctly to useUserProfile hook
  const { profile, loading: profileLoading, error: profileError } = useUserProfile(user);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  const isRecipeFavorite = (recipeId: number): boolean => {
    return profile?.favorite_recipe_ids?.includes(recipeId) || false;
  };

  const toggleFavoriteRecipe = async (recipeId: number): Promise<void> => {
    if (!profile || !user) return;

    const currentFavorites = profile.favorite_recipe_ids || [];
    const newFavorites = currentFavorites.includes(recipeId)
      ? currentFavorites.filter((id: number) => id !== recipeId)
      : [...currentFavorites, recipeId];

    await updateUserProfile(user.uid, { favorite_recipe_ids: newFavorites });
  };

  const value = { 
    user, 
    isLoading, 
    signOut, 
    isRecipeFavorite, 
    toggleFavoriteRecipe,
    profile,
    profileLoading,
    profileError
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};