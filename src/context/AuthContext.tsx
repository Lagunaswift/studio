
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { userProfile, loading: isProfileLoading, error } = useUserProfile(user?.uid);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  const isRecipeFavorite = (recipeId: number) => {
    return userProfile?.favorite_recipe_ids?.includes(recipeId) || false;
  };

  const toggleFavoriteRecipe = async (recipeId: number) => {
    if (!userProfile || !user) return;

    const currentFavorites = userProfile.favorite_recipe_ids || [];
    const newFavorites = currentFavorites.includes(recipeId)
      ? currentFavorites.filter(id => id !== recipeId)
      : [...currentFavorites, recipeId];

    await updateUserProfile(user.uid, { favorite_recipe_ids: newFavorites });
  };

  const value = { user, isLoading, signOut, isRecipeFavorite, toggleFavoriteRecipe };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
