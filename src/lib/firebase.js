// src/lib/firebase.js
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
    projectId: "macro-teal-meal-planner",
    appId: "1:724190135561:web:941f2a7f3c7be2563e3fd8",
    storageBucket: "macro-teal-meal-planner.appspot.com",
    apiKey: "REDACTED",
    authDomain: "macro-teal-meal-planner.firebaseapp.com",
    messagingSenderId: "724190135561"
};

const getFirebaseApp = () => {
  if (!getApps().length) {
    return initializeApp(firebaseConfig);
  }
  return getApp();
};

export const getFirebaseAuth = () => {
  const app = getFirebaseApp();
  return getAuth(app);
}

export const getFirebaseDb = () => {
  const app = getFirebaseApp();
  return getFirestore(app);
}

export const app = getFirebaseApp();
export const auth = getFirebaseAuth();
export const db = getFirebaseDb();
