
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

// Singleton pattern to ensure Firebase is initialized only once
let app;
if (!getApps().length) {
    app = initializeApp(firebaseConfig);
}
else {
    app = getApp();
}
const auth = getAuth(app);
const db = getFirestore(app);
export { app, auth, db };
