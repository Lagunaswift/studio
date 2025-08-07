// src/hooks/useOptimizedFirestore.ts - COMPREHENSIVE FIX VERSION
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

                // 🚀 ROBUST RECIPE LOADING STRATEGY
                // Strategy 1: Try to load built-in recipes with multiple approaches
                console.log('📚 Loading built-in recipes...');
                let builtInRecipes: Recipe[] = [];
                
                try {
                    // Approach 1A: Query for null user_id (original approach)
                    console.log('📖 Attempting null user_id query...');
                    const builtInQuery = query(collection(db, "recipes"), where("user_id", "==", null));
                    const builtInSnapshot = await getDocs(builtInQuery);
                    console.log('📖 Built-in recipes from null query:', builtInSnapshot.docs.length);
                    
                    if (builtInSnapshot.docs.length > 0) {
                        builtInRecipes = builtInSnapshot.docs.map(doc => {
                            console.log('📖 Built-in recipe (null):', doc.id, doc.data().name || 'Unnamed');
                            return { id: parseInt(doc.id, 10), ...doc.data() } as Recipe;
                        });
                    }
                } catch (nullQueryError) {
                    console.warn('⚠️ Null query failed:', nullQueryError);
                }

                // Approach 1B: If null query failed, try missing user_id field
                if (builtInRecipes.length === 0) {
                    try {
                        console.log('📖 Attempting missing user_id field query...');
                        // Load all recipes and filter client-side for those without user_id
                        const allRecipesRef = collection(db, "recipes");
                        const allSnapshot = await getDocs(allRecipesRef);
                        console.log('📖 Total recipes in database:', allSnapshot.docs.length);
                        
                        builtInRecipes = allSnapshot.docs
                            .filter(doc => {
                                const data = doc.data();
                                // Consider built-in if user_id is null, undefined, or empty string
                                return !data.user_id || data.user_id === null || data.user_id === '';
                            })
                            .map(doc => {
                                console.log('📖 Built-in recipe (filtered):', doc.id, doc.data().name || 'Unnamed');
                                return { id: parseInt(doc.id, 10), ...doc.data() } as Recipe;
                            });
                        
                        console.log('📖 Built-in recipes from client filtering:', builtInRecipes.length);
                    } catch (filterError) {
                        console.warn('⚠️ Client filtering failed:', filterError);
                    }
                }

                // Approach 1C: If still no built-in recipes, try a specific collection
                if (builtInRecipes.length === 0) {
                    try {
                        console.log('📖 Attempting default-recipes collection...');
                        const defaultRecipesRef = collection(db, "default-recipes");
                        const defaultSnapshot = await getDocs(defaultRecipesRef);
                        console.log('📖 Default recipes collection:', defaultSnapshot.docs.length);
                        
                        if (defaultSnapshot.docs.length > 0) {
                            builtInRecipes = defaultSnapshot.docs.map(doc => {
                                console.log('📖 Default recipe:', doc.id, doc.data().name || 'Unnamed');
                                return { id: parseInt(doc.id, 10), ...doc.data() } as Recipe;
                            });
                        }
                    } catch (defaultError) {
                        console.warn('⚠️ Default recipes collection not found:', defaultError);
                    }
                }

                console.log('✅ Built-in recipes loaded:', builtInRecipes.length);

                // Strategy 2: Load user-specific recipes
                let userRecipes: Recipe[] = [];
                
                if (userId) {
                    console.log('👤 Loading user recipes for userId:', userId);
                    
                    try {
                        // Approach 2A: Root collection with user_id filter
                        console.log('👤 Querying root collection for user recipes...');
                        const userQueryRoot = query(collection(db, "recipes"), where("user_id", "==", userId));
                        const userSnapshotRoot = await getDocs(userQueryRoot);
                        console.log('👤 User recipes in root collection:', userSnapshotRoot.docs.length);
                        
                        userRecipes = userSnapshotRoot.docs.map(doc => {
                            console.log('👤 User recipe (root):', doc.id, doc.data().name || 'Unnamed');
                            return { id: parseInt(doc.id, 10), ...doc.data() } as Recipe;
                        });
                    } catch (userRootError) {
                        console.warn('⚠️ User root query failed:', userRootError);
                    }

                    // Approach 2B: User subcollection as additional source
                    try {
                        console.log('👤 Checking user subcollection...');
                        const userRecipesRef = collection(db, `profiles/${userId}/recipes`);
                        const userSnapshotSub = await getDocs(userRecipesRef);
                        console.log('👤 User recipes in subcollection:', userSnapshotSub.docs.length);
                        
                        // Add subcollection recipes, avoiding duplicates
                        userSnapshotSub.docs.forEach(doc => {
                            const data = doc.data();
                            const recipe = { id: parseInt(doc.id, 10), ...data } as Recipe;
                            
                            // Check for duplicates (same ID already in userRecipes)
                            if (!userRecipes.some(r => r.id === recipe.id)) {
                                userRecipes.push(recipe);
                                console.log('👤 Added subcollection recipe:', recipe.name || `ID:${recipe.id}`);
                            } else {
                                console.log('👤 Duplicate recipe in subcollection, skipping:', recipe.id);
                            }
                        });
                    } catch (userSubError) {
                        console.log('ℹ️ User subcollection not accessible (normal if empty):', userSubError);
                    }
                } else {
                    console.log('❌ No userId provided, skipping user recipes');
                }

                // Strategy 3: Combine and validate results
                const allRecipes = [...builtInRecipes, ...userRecipes];
                
                console.log('🎯 Recipe loading summary:');
                console.log('├── Built-in recipes:', builtInRecipes.length);
                console.log('├── User recipes:', userRecipes.length); 
                console.log('├── Total recipes:', allRecipes.length);
                console.log('└── Sample built-in names:', builtInRecipes.slice(0, 3).map(r => r.name || `ID:${r.id}`));

                // Strategy 4: Handle edge cases and set appropriate state
                if (allRecipes.length === 0) {
                    const warningMsg = 'No recipes found in database. This might indicate:\n' +
                        '1. Database is empty or not properly seeded\n' +
                        '2. Permission issues accessing recipes\n' +
                        '3. Network connectivity problems\n' +
                        '4. Recipe collection structure differs from expected format';
                    
                    console.warn('⚠️ No recipes loaded:', warningMsg);
                    setError(warningMsg);
                    setRecipes([]); // Ensure clean state
                } else {
                    console.log('✅ Successfully loaded recipes!');
                    setError(null);
                    setRecipes(allRecipes);
                }
                
                // Strategy 5: Update cache for future requests
                cacheRef.current = { data: allRecipes, timestamp: now };
                setLoading(false);
                
            } catch (globalError: any) {
                console.error('❌ Critical recipe loading error:', globalError);
                const errorMsg = `Failed to load recipes: ${globalError.message || 'Unknown error'}`;
                setError(errorMsg);
                setLoading(false);
                setRecipes([]); // Ensure clean state on error
            }
        };

        // Execute loading immediately
        loadRecipes();
        
        // Set up periodic refresh for cache invalidation
        const refreshInterval = setInterval(() => {
            console.log('🔄 Periodic recipe refresh triggered');
            loadRecipes();
        }, RECIPES_CACHE_DURATION);
        
        // Cleanup function
        return () => {
            console.log('🧹 Cleaning up recipe loading interval');
            clearInterval(refreshInterval);
        };
        
    }, [userId]); // Only re-run when userId changes

    // Debug logging for hook state
    console.log('📊 useOptimizedRecipes state:', {
        loading,
        recipesCount: recipes.length,
        hasError: !!error,
        cacheTimestamp: cacheRef.current.timestamp
    });

    return { recipes, loading, error };
}

// Keep the existing profile hook unchanged for now
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
            try {
                const docRef = doc(db, 'profiles', userId);
                const docSnap = await getDoc(docRef);
                
                if (docSnap.exists()) {
                    const data = docSnap.data() as UserProfileSettings;
                    cacheRef.current = { data, timestamp: now };
                    setProfile(data);
                } else {
                    setProfile(null);
                }
            } catch (error) {
                console.error('Error loading profile:', error);
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