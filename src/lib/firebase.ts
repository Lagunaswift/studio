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

// More robust singleton pattern
const getFirebaseApp = (): FirebaseApp => {
  if (!getApps().length) {
    return initializeApp(firebaseConfig);
  }
  return getApp();
};

export const getFirebaseAuth = (): Auth => {
  const app = getFirebaseApp();
  return getAuth(app);
}

export const getFirebaseDb = (): Firestore => {
  const app = getFirebaseApp();
  return getFirestore(app);
}

// For parts of the app that might just need the app instance
export const app = getFirebaseApp();
export const auth = getFirebaseAuth();
export const db = getFirebaseDb();
