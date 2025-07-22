// THIS FILE IS NO LONGER INTENTIONALLY BLANK
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "macro-teal-meal-planner",
  appId: "1:724190135561:web:941f2a7f3c7be2563e3fd8",
  storageBucket: "macro-teal-meal-planner.firebasestorage.app",
  apiKey: "AIzaSyCNPp40cv3QiH_451NmshIk_Bu1BWi9WhQ",
  authDomain: "macro-teal-meal-planner.firebaseapp.com",
  messagingSenderId: "724190135561"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
