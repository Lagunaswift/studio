
// src/lib/firebase.ts
import { initializeApp, getApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "macro-teal-meal-planner",
  appId: "1:724190135561:web:941f2a7f3c7be2563e3fd8",
  storageBucket: "macro-teal-meal-planner.appspot.com",
  apiKey: "REDACTED",
  authDomain: "macro-teal-meal-planner.firebaseapp.com",
  messagingSenderId: "724190135561"
};

// Singleton pattern to ensure Firebase is initialized only once
let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);

export { app, auth, db };
