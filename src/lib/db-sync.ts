// src/lib/db-sync.ts
import { db as localDb } from '@/lib/db';
import { db as firebaseDb } from '@/lib/firebase-client';
import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  Timestamp 
} from 'firebase/firestore';
import type { Recipe, PlannedMeal, UserProfileSettings } from '@/types';
import { safeLocalStorage } from '@/lib/safe-storage';

export interface SyncStatus {
  lastSyncTime: Date | null;
  syncInProgress: boolean;
  hasLocalChanges: boolean;
  hasRemoteChanges: boolean;
}

class DatabaseSyncManager {
  private syncStatus: SyncStatus = {
    lastSyncTime: null,
    syncInProgress: false,
    hasLocalChanges: false,
    hasRemoteChanges: false
  };

  // Get sync status
  getSyncStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  // Mark local changes
  markLocalChanges(): void {
    this.syncStatus.hasLocalChanges = true;
    this.saveStatus();
  }

  // Save sync status to localStorage
  private saveStatus(): void {
    safeLocalStorage.setItem('sync-status', JSON.stringify(this.syncStatus));
  }

  // Load sync status from localStorage
  private loadStatus(): void {
    const saved = safeLocalStorage.getItem('sync-status');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        this.syncStatus = {
          ...this.syncStatus,
          ...parsed,
          lastSyncTime: parsed.lastSyncTime ? new Date(parsed.lastSyncTime) : null
        };
      } catch (error) {
        console.warn('Failed to load sync status:', error);
      }
    }
  }

  // Initialize sync manager
  async initialize(): Promise<void> {
    this.loadStatus();
    
    // Check for local changes by looking at modification timestamps
    try {
      const hasLocalRecipes = (await localDb.recipes.count()) > 0;
      const hasLocalMeals = (await localDb.plannedMeals.count()) > 0;
      
      this.syncStatus.hasLocalChanges = hasLocalRecipes || hasLocalMeals;
      this.saveStatus();
    } catch (error) {
      console.warn('Failed to check local changes:', error);
    }
  }

  // Full bidirectional sync
  async performFullSync(userId: string): Promise<void> {
    if (this.syncStatus.syncInProgress) {
      console.warn('Sync already in progress');
      return;
    }

    this.syncStatus.syncInProgress = true;
    this.saveStatus();

    try {
      console.log('🔄 Starting full database sync...');

      // Sync recipes
      await this.syncRecipes(userId);
      
      // Sync meal plans
      await this.syncMealPlans(userId);
      
      // Sync user profile
      await this.syncUserProfile(userId);

      // Update sync status
      this.syncStatus.lastSyncTime = new Date();
      this.syncStatus.hasLocalChanges = false;
      this.syncStatus.hasRemoteChanges = false;
      
      console.log('✅ Full database sync completed');
      
    } catch (error) {
      console.error('❌ Database sync failed:', error);
      throw error;
    } finally {
      this.syncStatus.syncInProgress = false;
      this.saveStatus();
    }
  }

  // Sync recipes between local and remote
  private async syncRecipes(userId: string): Promise<void> {
    try {
      // Get local recipes
      const localRecipes = await localDb.recipes.toArray();
      
      // Get remote recipes
      const recipesRef = collection(firebaseDb, 'users', userId, 'recipes');
      const remoteSnapshot = await getDocs(recipesRef);
      const remoteRecipes: Recipe[] = [];
      
      remoteSnapshot.forEach(doc => {
        remoteRecipes.push({ id: doc.id, ...doc.data() } as Recipe);
      });

      // Create maps for efficient comparison
      const localRecipeMap = new Map(localRecipes.map(r => [r.id, r]));
      const remoteRecipeMap = new Map(remoteRecipes.map(r => [r.id, r]));

      // Sync from local to remote (upload new/modified local recipes)
      for (const localRecipe of localRecipes) {
        const remoteRecipe = remoteRecipeMap.get(localRecipe.id);
        
        if (!remoteRecipe || this.needsUpdate(localRecipe, remoteRecipe)) {
          const recipeDoc = doc(firebaseDb, 'users', userId, 'recipes', localRecipe.id);
          await setDoc(recipeDoc, this.sanitizeForFirestore(localRecipe));
          console.log(`📤 Uploaded recipe: ${localRecipe.name}`);
        }
      }

      // Sync from remote to local (download new/modified remote recipes)
      for (const remoteRecipe of remoteRecipes) {
        const localRecipe = localRecipeMap.get(remoteRecipe.id);
        
        if (!localRecipe || this.needsUpdate(remoteRecipe, localRecipe)) {
          await localDb.recipes.put(remoteRecipe);
          console.log(`📥 Downloaded recipe: ${remoteRecipe.name}`);
        }
      }

      // Remove deleted recipes (exist locally but not remotely)
      for (const localRecipe of localRecipes) {
        if (!remoteRecipeMap.has(localRecipe.id) && localRecipe.isCustom) {
          // Only delete custom recipes that don't exist remotely
          await localDb.recipes.delete(localRecipe.id);
          console.log(`🗑️ Removed local recipe: ${localRecipe.name}`);
        }
      }

    } catch (error) {
      console.error('Failed to sync recipes:', error);
      throw error;
    }
  }

  // Sync meal plans between local and remote
  private async syncMealPlans(userId: string): Promise<void> {
    try {
      // Get local planned meals
      const localMeals = await localDb.plannedMeals.toArray();
      
      // Get remote planned meals
      const mealsRef = collection(firebaseDb, 'users', userId, 'plannedMeals');
      const remoteSnapshot = await getDocs(mealsRef);
      const remoteMeals: PlannedMeal[] = [];
      
      remoteSnapshot.forEach(doc => {
        remoteMeals.push({ id: doc.id, ...doc.data() } as PlannedMeal);
      });

      // Create maps for efficient comparison
      const localMealMap = new Map(localMeals.map(m => [m.id, m]));
      const remoteMealMap = new Map(remoteMeals.map(m => [m.id, m]));

      // Sync from local to remote
      for (const localMeal of localMeals) {
        const remoteMeal = remoteMealMap.get(localMeal.id);
        
        if (!remoteMeal || this.needsUpdate(localMeal, remoteMeal)) {
          const mealDoc = doc(firebaseDb, 'users', userId, 'plannedMeals', localMeal.id);
          await setDoc(mealDoc, this.sanitizeForFirestore(localMeal));
          console.log(`📤 Uploaded meal plan: ${localMeal.date} - ${localMeal.mealType}`);
        }
      }

      // Sync from remote to local
      for (const remoteMeal of remoteMeals) {
        const localMeal = localMealMap.get(remoteMeal.id);
        
        if (!localMeal || this.needsUpdate(remoteMeal, localMeal)) {
          await localDb.plannedMeals.put(remoteMeal);
          console.log(`📥 Downloaded meal plan: ${remoteMeal.date} - ${remoteMeal.mealType}`);
        }
      }

    } catch (error) {
      console.error('Failed to sync meal plans:', error);
      throw error;
    }
  }

  // Sync user profile
  private async syncUserProfile(userId: string): Promise<void> {
    try {
      // Get local profile
      const localProfile = await localDb.userProfile.get(userId);
      
      // Get remote profile
      const profileDoc = doc(firebaseDb, 'users', userId);
      const remoteSnapshot = await getDocs(query(collection(firebaseDb, 'users'), where('id', '==', userId), limit(1)));
      
      let remoteProfile: UserProfileSettings | null = null;
      if (!remoteSnapshot.empty) {
        const docData = remoteSnapshot.docs[0].data();
        remoteProfile = { id: userId, ...docData } as UserProfileSettings;
      }

      // Determine which profile is more recent
      if (localProfile && (!remoteProfile || this.needsUpdate(localProfile, remoteProfile))) {
        // Upload local profile
        await setDoc(doc(firebaseDb, 'users', userId), this.sanitizeForFirestore(localProfile));
        console.log('📤 Uploaded user profile');
      } else if (remoteProfile && (!localProfile || this.needsUpdate(remoteProfile, localProfile))) {
        // Download remote profile
        await localDb.userProfile.put(remoteProfile);
        console.log('📥 Downloaded user profile');
      }

    } catch (error) {
      console.error('Failed to sync user profile:', error);
      throw error;
    }
  }

  // Check if an item needs updating based on timestamps
  private needsUpdate(newer: any, older: any): boolean {
    if (!newer.updatedAt || !older.updatedAt) return true;
    
    const newerTime = new Date(newer.updatedAt);
    const olderTime = new Date(older.updatedAt);
    
    return newerTime > olderTime;
  }

  // Remove undefined fields and prepare for Firestore
  private sanitizeForFirestore(obj: any): any {
    if (obj === null || obj === undefined) return null;
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeForFirestore(item));
    }
    
    if (typeof obj === 'object') {
      const sanitized: any = {};
      
      for (const [key, value] of Object.entries(obj)) {
        if (value !== undefined) {
          if (value instanceof Date) {
            sanitized[key] = Timestamp.fromDate(value);
          } else {
            sanitized[key] = this.sanitizeForFirestore(value);
          }
        }
      }
      
      return sanitized;
    }
    
    return obj;
  }

  // Queue offline action for later sync
  async queueOfflineAction(action: string, data: any): Promise<void> {
    const offlineActions = JSON.parse(safeLocalStorage.getItem('offline-actions') || '[]');
    
    offlineActions.push({
      id: crypto.randomUUID(),
      action,
      data,
      timestamp: new Date().toISOString()
    });
    
    safeLocalStorage.setItem('offline-actions', JSON.stringify(offlineActions));
    this.markLocalChanges();

    // Try to register background sync
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.sync.register('offline-actions-sync');
      } catch (error) {
        console.warn('Failed to register background sync:', error);
      }
    }
  }

  // Process queued offline actions
  async processOfflineActions(userId: string): Promise<void> {
    const offlineActions = JSON.parse(safeLocalStorage.getItem('offline-actions') || '[]');
    
    if (offlineActions.length === 0) return;

    console.log(`🔄 Processing ${offlineActions.length} offline actions...`);

    for (const action of offlineActions) {
      try {
        await this.processOfflineAction(userId, action);
        
        // Remove processed action
        const remainingActions = offlineActions.filter((a: any) => a.id !== action.id);
        safeLocalStorage.setItem('offline-actions', JSON.stringify(remainingActions));
        
      } catch (error) {
        console.error('Failed to process offline action:', action, error);
        // Keep failed actions for retry
      }
    }

    console.log('✅ Offline actions processed');
  }

  // Process individual offline action
  private async processOfflineAction(userId: string, action: any): Promise<void> {
    switch (action.action) {
      case 'create-recipe':
        const recipeDoc = doc(firebaseDb, 'users', userId, 'recipes', action.data.id);
        await setDoc(recipeDoc, this.sanitizeForFirestore(action.data));
        break;
        
      case 'update-recipe':
        const updateRecipeDoc = doc(firebaseDb, 'users', userId, 'recipes', action.data.id);
        await setDoc(updateRecipeDoc, this.sanitizeForFirestore(action.data), { merge: true });
        break;
        
      case 'delete-recipe':
        const deleteRecipeDoc = doc(firebaseDb, 'users', userId, 'recipes', action.data.id);
        await deleteDoc(deleteRecipeDoc);
        break;
        
      case 'create-meal-plan':
        const mealDoc = doc(firebaseDb, 'users', userId, 'plannedMeals', action.data.id);
        await setDoc(mealDoc, this.sanitizeForFirestore(action.data));
        break;
        
      case 'update-meal-plan':
        const updateMealDoc = doc(firebaseDb, 'users', userId, 'plannedMeals', action.data.id);
        await setDoc(updateMealDoc, this.sanitizeForFirestore(action.data), { merge: true });
        break;
        
      case 'delete-meal-plan':
        const deleteMealDoc = doc(firebaseDb, 'users', userId, 'plannedMeals', action.data.id);
        await deleteDoc(deleteMealDoc);
        break;
        
      default:
        console.warn('Unknown offline action:', action.action);
    }
  }

  // Force download all data from remote (useful for debugging)
  async forceDownloadFromRemote(userId: string): Promise<void> {
    console.log('🔄 Force downloading all data from remote...');
    
    try {
      // Clear local data
      await localDb.recipes.clear();
      await localDb.plannedMeals.clear();
      await localDb.userProfile.clear();
      
      // Download everything
      await this.performFullSync(userId);
      
      console.log('✅ Force download completed');
    } catch (error) {
      console.error('❌ Force download failed:', error);
      throw error;
    }
  }

  // Check connection and sync if needed
  async smartSync(userId: string): Promise<void> {
    if (!navigator.onLine) {
      console.log('📴 Offline - skipping sync');
      return;
    }

    const timeSinceLastSync = this.syncStatus.lastSyncTime 
      ? Date.now() - this.syncStatus.lastSyncTime.getTime()
      : Infinity;

    // Sync if it's been more than 5 minutes or there are local changes
    if (timeSinceLastSync > 5 * 60 * 1000 || this.syncStatus.hasLocalChanges) {
      await this.performFullSync(userId);
    }
  }
}

// Export singleton instance
export const dbSyncManager = new DatabaseSyncManager();
