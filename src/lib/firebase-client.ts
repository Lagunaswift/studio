// src/lib/firebase-client.ts
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, enableNetwork, disableNetwork } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase only once
const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Enhanced offline persistence setup
let persistenceEnabled = false;

export const enableFirebasePersistence = async (): Promise<boolean> => {
  if (typeof window === 'undefined' || persistenceEnabled) return persistenceEnabled;
  
  try {
    // Import Firestore persistence functions dynamically
    const { enableIndexedDbPersistence, enableMultiTabIndexedDbPersistence } = await import('firebase/firestore');
    
    // Try multi-tab persistence first (better for PWAs)
    try {
      await enableMultiTabIndexedDbPersistence(db);
      console.log('✅ Firebase multi-tab persistence enabled');
      persistenceEnabled = true;
    } catch (multiTabError: any) {
      if (multiTabError.code === 'failed-precondition') {
        // Fall back to single-tab persistence
        try {
          await enableIndexedDbPersistence(db);
          console.log('✅ Firebase single-tab persistence enabled');
          persistenceEnabled = true;
        } catch (singleTabError) {
          console.warn('❌ Failed to enable Firebase persistence:', singleTabError);
          persistenceEnabled = false;
        }
      } else {
        console.warn('❌ Multi-tab persistence failed:', multiTabError);
        persistenceEnabled = false;
      }
    }
  } catch (error) {
    console.warn('❌ Failed to import Firebase persistence:', error);
    persistenceEnabled = false;
  }
  
  return persistenceEnabled;
};

// Enhanced network management
export const goOnline = async (): Promise<void> => {
  try {
    await enableNetwork(db);
    console.log('🌐 Firebase network enabled');
  } catch (error) {
    console.warn('Failed to enable Firebase network:', error);
  }
};

export const goOffline = async (): Promise<void> => {
  try {
    await disableNetwork(db);
    console.log('📴 Firebase network disabled');
  } catch (error) {
    console.warn('Failed to disable Firebase network:', error);
  }
};

// Connection state monitoring
export const setupFirebaseConnectionMonitoring = (): (() => void) => {
  if (typeof window === 'undefined') return () => {};
  
  const handleOnline = () => {
    console.log('🌐 Device came online, enabling Firebase network...');
    goOnline();
  };
  
  const handleOffline = () => {
    console.log('📴 Device went offline, disabling Firebase network...');
    goOffline();
  };
  
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  
  // Return cleanup function
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
};

// Development environment emulator setup
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  // Only connect to emulators if they haven't been connected yet
  if (!auth.app.name.includes('emulator')) {
    try {
      connectAuthEmulator(auth, 'http://localhost:9099');
      connectFirestoreEmulator(db, 'localhost', 8080);
      connectStorageEmulator(storage, 'localhost', 9199);
      console.log('🔧 Connected to Firebase emulators');
    } catch (error) {
      console.warn('Failed to connect to emulators:', error);
    }
  }
}

export default app;
