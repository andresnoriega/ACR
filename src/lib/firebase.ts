
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, initializeFirestore, memoryLocalCache } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import type { User as FirebaseUser } from 'firebase/auth';


// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyA43L6Yw1NoCIj3a6dJ8hL0kZUNi_sdd2U",
  authDomain: "almacenador-cloud.firebaseapp.com",
  projectId: "almacenador-cloud",
  storageBucket: "almacenador-cloud.appspot.com",
  messagingSenderId: "790911154631",
  appId: "1:790911154631:web:91e2d71d8ccfbf058301e2",
  measurementId: "G-R2NQTYM2GX"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
// This is the correct way to initialize Firestore for this app to avoid "client is offline" issues.
const db = initializeFirestore(app, { localCache: memoryLocalCache() });
const storage = getStorage(app);

export { app, auth, db, storage, type FirebaseUser };
