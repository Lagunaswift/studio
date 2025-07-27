
// src/lib/firebase.ts
import { initializeApp, getApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

const firebaseConfig = {
    "apiKey": "SECRET_API_KEY",
    "authDomain": "macro-teal-meal-planner.firebaseapp.com",
    "projectId": "macro-teal-meal-planner",
    "storageBucket": "macro-teal-meal-planner.appspot.com",
    "messagingSenderId": "724190135561",
    "appId": "1:724190135561:web:941f2a7f3c7be2563e3fd8"
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
