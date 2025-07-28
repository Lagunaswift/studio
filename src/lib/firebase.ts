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
const isEmulatorMode = typeof window !== 'undefined' &&
  window.location.hostname === 'localhost' &&
  process.env.NEXT_PUBLIC_EMULATOR_HOST;

if (isEmulatorMode) {
  const host = process.env.NEXT_PUBLIC_EMULATOR_HOST!;
  console.log(`Development mode (client-side): Connecting to emulators at ${host}.`);

  if (!auth.emulatorConfig) {
    try {
      connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
      console.log(`Auth emulator connection established at http://${host}:9099`);
    } catch (error) {
      console.warn('Could not connect to Auth emulator:', error);
    }
  }

  // Firestore emulator connection
  // Note: The Firestore client library can be aggressive about reconnecting.
  // We check if the host is already set to avoid re-initializing.
  if (!(db as any)._settings.host.includes(host)) {
    try {
      connectFirestoreEmulator(db, host, 8080);
      console.log(`Firestore emulator connection established at ${host}:8080`);
    } catch (error: any) {
      // It's common to get a 'failed-precondition' error if you hot-reload,
      // which means the connection is already established. We can safely ignore it.
      if (error.code !== 'failed-precondition') {
        console.warn('Could not connect to Firestore emulator:', error);
      }
    }
  }
}

export { app, auth, db };
