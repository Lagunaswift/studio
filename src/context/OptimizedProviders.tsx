// src/context/OptimizedProviders.tsx - Enhanced version
'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { enableFirebasePersistence, setupFirebaseConnectionMonitoring } from '@/lib/firebase-client';
import { db as localDb } from '@/lib/db'; // Dexie database
import { syncUsageToFirebase, loadUsageFromFirebase } from '@/utils/usageTracker';

interface PersistenceState {
  firebasePersistenceEnabled: boolean;
  indexedDbAvailable: boolean;
  localStorageAvailable: boolean;
  isOnline: boolean;
  lastSyncTime: Date | null;
  syncInProgress: boolean;
}

interface OptimizedAppContextType {
  persistenceState: PersistenceState;
  initializePersistence: () => Promise<void>;
  forceSyncData: () => Promise<void>;
  clearLocalData: () => Promise<void>;
  // ... existing context properties
}

const OptimizedAppContext = createContext<OptimizedAppContextType | null>(null);

export const OptimizedAppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [persistenceState, setPersistenceState] = useState<PersistenceState>({
    firebasePersistenceEnabled: false,
    indexedDbAvailable: false,
    localStorageAvailable: false,
    isOnline: navigator?.onLine ?? true,
    lastSyncTime: null,
    syncInProgress: false
  });

  // Initialize persistence when component mounts
  const initializePersistence = useCallback(async () => {
    console.log('🔧 Initializing app persistence...');
    
    // Check browser storage capabilities
    const localStorageAvailable = (() => {
      try {
        const testKey = '__storage_test__';
        localStorage.setItem(testKey, 'test');
        localStorage.removeItem(testKey);
        return true;
      } catch {
        return false;
      }
    })();

    const indexedDbAvailable = (() => {
      try {
        return 'indexedDB' in window && indexedDB !== null;
      } catch {
        return false;
      }
    })();

    // Enable Firebase persistence
    const firebasePersistenceEnabled = await enableFirebasePersistence();

    // Test IndexedDB with Dexie
    let dexieWorking = false;
    try {
      await localDb.open();
      dexieWorking = true;
      console.log('✅ Dexie IndexedDB connection established');
    } catch (error) {
      console.error('❌ Dexie IndexedDB failed:', error);
    }

    setPersistenceState(prev => ({
      ...prev,
      firebasePersistenceEnabled,
      indexedDbAvailable: indexedDbAvailable && dexieWorking,
      localStorageAvailable,
    }));

    console.log('📊 Persistence Status:', {
      firebase: firebasePersistenceEnabled,
      indexedDB: indexedDbAvailable && dexieWorking,
      localStorage: localStorageAvailable
    });

    // Load user data from Firebase if user exists
    if (user?.uid) {
      await loadUsageFromFirebase(user.uid);
    }

  }, [user?.uid]);

  // Force sync data between local and remote
  const forceSyncData = useCallback(async () => {
    if (!user?.uid || persistenceState.syncInProgress) return;
    
    setPersistenceState(prev => ({ ...prev, syncInProgress: true }));
    
    try {
      console.log('🔄 Force syncing data...');
      
      // Sync usage data
      await syncUsageToFirebase(user.uid);
      
      // TODO: Add more sync operations for recipes, meal plans, etc.
      // Example:
      // await syncRecipesToFirebase(user.uid);
      // await syncMealPlansToFirebase(user.uid);
      
      setPersistenceState(prev => ({ 
        ...prev, 
        lastSyncTime: new Date(),
        syncInProgress: false 
      }));
      
      console.log('✅ Data sync completed');
    } catch (error) {
      console.error('❌ Data sync failed:', error);
      setPersistenceState(prev => ({ ...prev, syncInProgress: false }));
    }
  }, [user?.uid, persistenceState.syncInProgress]);

  // Clear all local data (for troubleshooting)
  const clearLocalData = useCallback(async () => {
    try {
      console.log('🗑️ Clearing all local data...');
      
      // Clear localStorage
      if (persistenceState.localStorageAvailable) {
        localStorage.clear();
      }
      
      // Clear IndexedDB
      if (persistenceState.indexedDbAvailable) {
        await localDb.delete();
        await localDb.open(); // Recreate empty database
      }
      
      console.log('✅ Local data cleared');
    } catch (error) {
      console.error('❌ Failed to clear local data:', error);
    }
  }, [persistenceState]);

  // Monitor online/offline status
  useEffect(() => {
    const updateOnlineStatus = () => {
      const isOnline = navigator.onLine;
      setPersistenceState(prev => ({ ...prev, isOnline }));
      
      if (isOnline && user?.uid) {
        // Auto-sync when coming back online
        forceSyncData();
      }
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    // Setup Firebase connection monitoring
    const cleanupFirebaseMonitoring = setupFirebaseConnectionMonitoring();

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
      cleanupFirebaseMonitoring();
    };
  }, [user?.uid, forceSyncData]);

  // Initialize persistence when user changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      initializePersistence();
    }
  }, [initializePersistence]);

  // Auto-sync periodically when online
  useEffect(() => {
    if (!user?.uid || !persistenceState.isOnline) return;

    const syncInterval = setInterval(() => {
      forceSyncData();
    }, 5 * 60 * 1000); // Sync every 5 minutes

    return () => clearInterval(syncInterval);
  }, [user?.uid, persistenceState.isOnline, forceSyncData]);

  const contextValue: OptimizedAppContextType = {
    persistenceState,
    initializePersistence,
    forceSyncData,
    clearLocalData,
    // ... include existing context properties
  };

  return (
    <OptimizedAppContext.Provider value={contextValue}>
      {children}
    </OptimizedAppContext.Provider>
  );
};

export const useOptimizedApp = () => {
  const context = useContext(OptimizedAppContext);
  if (!context) {
    throw new Error('useOptimizedApp must be used within OptimizedAppProvider');
  }
  return context;
};
