// src/hooks/useOptimizedFirestore.ts - NULL QUERY WORKAROUND VERSION
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

                // 🚨 WORKAROUND: Load ALL recipes and filter client-side
                // This bypasses potential Firestore null query issues
                console.log('📚 Loading all recipes and filtering client-side...');
                const allRecipesRef = collection(db, "recipes");
                const allSnapshot = await getDocs(allRecipesRef);
                console.log('📚 Total recipes in database:', allSnapshot.docs.length);
                
                const builtInRecipes: Recipe[] = [];
                const userRecipes: Recipe[] = [];
                const parseErrors: string[] = [];
                
                allSnapshot.docs.forEach(doc => {
                    const data = doc.data();
                    
                    try {
                        // Parse the document ID as integer
                        const numericId = parseInt(doc.id, 10);
                        if (isNaN(numericId)) {
                            console.warn(`⚠️ Document ${doc.id} has non-numeric ID, skipping`);
                            parseErrors.push(`Non-numeric ID: ${doc.id}`);
                            return;
                        }

                        const recipe = { 
                            id: numericId,
                            ...data 
                        } as Recipe;
                        
                        // 🔧 CLIENT-SIDE FILTERING: Check user_id field
                        const docUserId = data.user_id;
                        
                        if (docUserId === null || docUserId === undefined || !('user_id' in data)) {
                            // Built-in recipe (user_id is null, undefined, or missing)
                            builtInRecipes.push(recipe);
                            console.log(`📖 Built-in recipe: ${recipe.name || `ID:${recipe.id}`} (user_id: ${docUserId})`);
                        } else if (userId && docUserId === userId) {
                            // User-specific recipe
                            userRecipes.push(recipe);
                            console.log(`👤 User recipe: ${recipe.name || `ID:${recipe.id}`} (user_id: ${docUserId})`);
                        } else {
                            // Recipe belongs to different user - skip
                            console.log(`👥 Other user's recipe: ${recipe.name || `ID:${recipe.id}`} (user_id: ${docUserId})`);
                        }
                        
                    } catch (parseError) {
                        console.warn(`⚠️ Failed to parse recipe doc ${doc.id}:`, parseError);
                        parseErrors.push(`Parse error for ${doc.id}: ${parseError}`);
                    }
                });

                // Also check user subcollection as fallback
                if (userId) {
                    console.log('👤 Checking user subcollection for additional recipes...');
                    try {
                        const userRecipesRef = collection(db, `profiles/${userId}/recipes`);
                        const userSnapshotSub = await getDocs(userRecipesRef);
                        console.log('👤 User recipes in subcollection:', userSnapshotSub.docs.length);
                        
                        userSnapshotSub.docs.forEach(doc => {
                            const data = doc.data();
                            try {
                                const recipe = { 
                                    id: parseInt(doc.id, 10), 
                                    ...data 
                                } as Recipe;
                                
                                // Check for duplicates (same ID already in userRecipes)
                                if (!userRecipes.some(r => r.id === recipe.id)) {
                                    userRecipes.push(recipe);
                                    console.log('👤 Added subcollection recipe:', recipe.name || `ID:${recipe.id}`);
                                } else {
                                    console.log('👤 Duplicate recipe in subcollection, skipping:', recipe.id);
                                }
                            } catch (parseError) {
                                console.warn('⚠️ Failed to parse subcollection recipe doc:', doc.id, parseError);
                                parseErrors.push(`Subcollection parse error for ${doc.id}: ${parseError}`);
                            }
                        });
                    } catch (subError) {
                        console.log('ℹ️ User subcollection not accessible:', subError);
                    }
                }

                const allRecipes = [...builtInRecipes, ...userRecipes];
                
                console.log('✅ Recipe loading complete!');
                console.log('📊 Final breakdown:', {
                    builtInRecipes: builtInRecipes.length,
                    userRecipes: userRecipes.length,
                    totalRecipes: allRecipes.length,
                    parseErrors: parseErrors.length,
                    sampleBuiltInNames: builtInRecipes.slice(0, 3).map(r => r.name || `ID:${r.id}`),
                    errors: parseErrors.length > 0 ? parseErrors : undefined
                });
                
                if (allRecipes.length === 0) {
                    const warningMsg = `No recipes loaded. Database has ${allSnapshot.docs.length} documents, but none matched filtering criteria.`;
                    console.warn('⚠️', warningMsg);
                    setError(warningMsg);
                } else {
                    setError(null);
                }
                
                // Update cache and state
                cacheRef.current = { data: allRecipes, timestamp: now };
                setRecipes(allRecipes);
                setLoading(false);
                
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

// Keep existing profile hook unchanged
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