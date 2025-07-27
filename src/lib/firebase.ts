import { initializeApp, getApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, type Firestore, connectFirestoreEmulator } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyCNPp40cv3QiH_451NmshIk_Bu1BWi9WhQ",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "macro-teal-meal-planner.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "macro-teal-meal-planner",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "macro-teal-meal-planner.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "724190135561",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:724190135561:web:839c4baeb27fac063e3fd8"
};

const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);

// Connect to emulators ONLY on the client-side during development.
// The server-side code will connect to the actual Firebase backend.
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  console.log('Development mode (client-side): Connecting to emulators.');

  // Check if auth is already connected to an emulator
  if (!auth.emulatorConfig) {
    try {
      connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
      console.log('Auth emulator connection established.');
    } catch (error) {
      console.warn('Could not connect to Auth emulator:', error);
    }
  }

  // Check if firestore is already connected to an emulator
  // Note: The Firestore emulator connection doesn't have a simple property like auth.emulatorConfig
  // We'll rely on try-catch, which is safe.
  try {
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
    console.log('Firestore emulator connection established.');
  } catch (error: any) {
    // It's common for this to throw an error if already connected.
    // We can safely ignore the 'failed-precondition' error.
    if (error.code !== 'failed-precondition') {
        console.warn('Could not connect to Firestore emulator:', error);
    }
  }
}

export { app, auth, db };
