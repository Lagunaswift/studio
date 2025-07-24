// src/lib/firebase.ts
import { initializeApp, getApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "macro-teal-meal-planner",
  appId: "1:724190135561:web:941f2a7f3c7be2563e3fd8",
  storageBucket: "macro-teal-meal-planner.firebasestorage.app",
  apiKey: "AIzaSyCNPp40cv3QiH_451NmshIk_Bu1BWi9WhQ",
  authDomain: "macro-teal-meal-planner.firebaseapp.com",
  messagingSenderId: "724190135561"
};

// Singleton pattern to ensure Firebase is initialized only once
const getFirebaseApp = (): FirebaseApp => {
  if (!getApps().length) {
    return initializeApp(firebaseConfig);
  }
  return getApp();
};

const app = getFirebaseApp();
const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);

export { app, auth, db };
