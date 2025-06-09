
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCNPp40cv3QiH_451NmshIk_Bu1BWi9WhQ",
  authDomain: "macro-teal-meal-planner.firebaseapp.com",
  projectId: "macro-teal-meal-planner",
  storageBucket: "macro-teal-meal-planner.appspot.com", // Corrected: .appspot.com is typical for storageBucket
  messagingSenderId: "724190135561",
  appId: "1:724190135561:web:839c4baeb27fac063e3fd8"
};

// Initialize Firebase
let app: FirebaseApp;
let db: Firestore;

if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

db = getFirestore(app);

export { app, db };
