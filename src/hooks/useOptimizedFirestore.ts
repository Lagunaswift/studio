// src/hooks/useOptimizedFirestore.ts
import { useState, useEffect, useRef } from 'react';
import { onSnapshot, doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase-client';
import type { UserProfileSettings, Recipe } from '@/types';

const PROFILE_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const RECIPES_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

export function useOptimizedProfile(userId: string | undefined) {
  const [profile, setProfile] = useState<UserProfileSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const cacheRef = useRef<{ data: UserProfileSettings | null; timestamp: number }>({ data: null, timestamp: 0 });

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const loadProfile = async () => {
      const now = Date.now();
      if (cacheRef.current.data && now - cacheRef.current.timestamp < PROFILE_CACHE_DURATION) {
        setProfile(cacheRef.current.data);
        setLoading(false);
        return;
      }
      
      setLoading(true);
      const docRef = doc(db, 'profiles', userId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data() as UserProfileSettings;
        cacheRef.current = { data, timestamp: now };
        setProfile(data);
      } else {
        setProfile(null);
      }
      setLoading(false);
    };

    loadProfile();
    
    // Refresh data periodically
    const interval = setInterval(loadProfile, PROFILE_CACHE_DURATION);
    
    return () => clearInterval(interval);

  }, [userId]);

  return { profile, loading };
}

export function useOptimizedRecipes(userId: string | undefined) {
    const [recipes, setRecipes] = useState<Recipe[]>([]);
    const [loading, setLoading] = useState(true);
    const cacheRef = useRef<{ data: Recipe[]; timestamp: number }>({ data: [], timestamp: 0 });

    useEffect(() => {
        const loadRecipes = async () => {
            const now = Date.now();
            if (cacheRef.current.data.length > 0 && now - cacheRef.current.timestamp < RECIPES_CACHE_DURATION) {
                setRecipes(cacheRef.current.data);
                setLoading(false);
                return;
            }

            setLoading(true);
            const builtInQuery = query(collection(db, "recipes"), where("user_id", "==", null));
            const builtInSnapshot = await getDocs(builtInQuery);
            const builtInRecipes = builtInSnapshot.docs.map(doc => ({ id: parseInt(doc.id, 10), ...doc.data() } as Recipe));
            
            let userRecipes: Recipe[] = [];
            if (userId) {
                const userQuery = query(collection(db, "recipes"), where("user_id", "==", userId));
                const userSnapshot = await getDocs(userQuery);
                userRecipes = userSnapshot.docs.map(doc => ({ id: parseInt(doc.id, 10), ...doc.data() } as Recipe));
            }

            const allRecipes = [...builtInRecipes, ...userRecipes];
            cacheRef.current = { data: allRecipes, timestamp: now };
            setRecipes(allRecipes);
            setLoading(false);
        };

        loadRecipes();
        const interval = setInterval(loadRecipes, RECIPES_CACHE_DURATION);
        return () => clearInterval(interval);
    }, [userId]);

    return { recipes, loading };
}
