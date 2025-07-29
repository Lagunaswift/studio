
import { initializeApp, getApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, type Firestore, connectFirestoreEmulator } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase
const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);

// Connect to emulators ONLY on the client-side during development.
// This check ensures that the code only runs in the browser environment.
if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_USE_EMULATORS === 'true') {
  const host = window.location.hostname;
  console.log(`Development mode (client-side): Connecting to emulators at ${host}.`);

  // It's important to check if the emulators are already connected to avoid errors on hot-reloads.
  if (!(auth as any)._isEmulator) {
    try {
      connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
      console.log(`Auth emulator connection established at http://${host}:9099`);
    } catch (error) {
      console.warn('Could not connect to Auth emulator:', error);
    }
  }

  // Firestore emulator connection
  if (!(db as any)._settings.host.includes('localhost')) {
     try {
      connectFirestoreEmulator(db, host, 8080);
      console.log(`Firestore emulator connection established at ${host}:8080`);
    } catch (error: any) {
      if (error.code !== 'failed-precondition') {
        console.warn('Could not connect to Firestore emulator:', error);
      }
    }
  }
}

export { app, auth, db };
