// Fixed version of useOptimizedFirestore.ts
import { useState, useEffect, useRef } from 'react';
import { onSnapshot, doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase-client';
import type { UserProfileSettings, Recipe } from '@/types';

const PROFILE_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const RECIPES_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

export function useOptimizedRecipes(userId: string | undefined) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cacheRef = useRef<{ data: Recipe[]; timestamp: number }>({ data: [], timestamp: 0 });

  useEffect(() => {
      console.log('🔄 useOptimizedRecipes effect triggered with userId:', userId);
      
      const loadRecipes = async () => {
          try {
              console.log('📊 Starting recipe loading process...');
              const now = Date.now();
              
              // Check cache first
              if (cacheRef.current.data.length > 0 && now - cacheRef.current.timestamp < RECIPES_CACHE_DURATION) {
                  console.log('🎯 Using cached recipes:', cacheRef.current.data.length);
                  setRecipes(cacheRef.current.data);
                  setLoading(false);
                  setError(null);
                  return;
              }

              console.log('🔍 Cache miss, loading fresh data...');
              setLoading(true);
              setError(null);

              // Load built-in recipes from root collection
              console.log('📚 Querying built-in recipes...');
              const builtInQuery = query(collection(db, "recipes"), where("user_id", "==", null));
              const builtInSnapshot = await getDocs(builtInQuery);
              console.log('📚 Built-in recipes found:', builtInSnapshot.docs.length);
              
              const builtInRecipes = builtInSnapshot.docs.map(doc => {
                  console.log('📖 Built-in recipe doc:', doc.id, doc.data());
                  return { id: parseInt(doc.id, 10), ...doc.data() } as Recipe;
              });
              
              let userRecipes: Recipe[] = [];
              if (userId) {
                  console.log('👤 Querying user recipes for userId:', userId);
                  // Try both collection paths to see which one has data
                  
                  // Method 1: Root collection with user_id filter
                  const userQueryRoot = query(collection(db, "recipes"), where("user_id", "==", userId));
                  const userSnapshotRoot = await getDocs(userQueryRoot);
                  console.log('👤 User recipes in root collection:', userSnapshotRoot.docs.length);
                  
                  // Method 2: User subcollection
                  const userRecipesRef = collection(db, `profiles/${userId}/recipes`);
                  const userSnapshotSub = await getDocs(userRecipesRef);
                  console.log('👤 User recipes in subcollection:', userSnapshotSub.docs.length);
                  
                  // Use whichever has more recipes
                  const useSubcollection = userSnapshotSub.docs.length > userSnapshotRoot.docs.length;
                  const userSnapshot = useSubcollection ? userSnapshotSub : userSnapshotRoot;
                  
                  console.log('👤 Using', useSubcollection ? 'subcollection' : 'root collection', 'for user recipes');
                  
                  userRecipes = userSnapshot.docs.map(doc => {
                      console.log('👤 User recipe doc:', doc.id, doc.data());
                      return { id: parseInt(doc.id, 10), ...doc.data() } as Recipe;
                  });
              } else {
                  console.log('❌ No userId provided, skipping user recipes');
              }

              const allRecipes = [...builtInRecipes, ...userRecipes];
              console.log('✅ Total recipes loaded:', allRecipes.length);
              
              // Update cache and state
              cacheRef.current = { data: allRecipes, timestamp: now };
              setRecipes(allRecipes);
              setLoading(false);
              setError(null);
              
          } catch (err: any) {
              console.error('❌ Recipe loading error:', err);
              setError(err.message || 'Failed to load recipes');
              setLoading(false);
              setRecipes([]); // Set empty array so app doesn't break
          }
      };

      // Always call loadRecipes immediately
      loadRecipes();
      
      // Set up interval for periodic refresh
      const interval = setInterval(() => {
          console.log('🔄 Periodic recipe refresh triggered');
          loadRecipes();
      }, RECIPES_CACHE_DURATION);
      
      return () => {
          console.log('🧹 Cleaning up recipe loading interval');
          clearInterval(interval);
      };
  }, [userId]); // Only depend on userId

  console.log('📊 Hook state - loading:', loading, 'recipes:', recipes.length, 'error:', error);
  return { recipes, loading, error };
}