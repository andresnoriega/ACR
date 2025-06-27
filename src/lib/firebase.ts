// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, type User as FirebaseUser } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Configuration directly from Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyA3a8UytRbwFKWT9ISF1OlYaizC37b3rZQ",
  authDomain: "rca-assistant-jk3ja.firebaseapp.com",
  projectId: "rca-assistant-jk3ja",
  storageBucket: "rca-assistant-jk3ja.appspot.com",
  messagingSenderId: "1044963774198",
  appId: "1:1044963774198:web:4ae00d1ee674f1864ea6d7"
};

// Initialize Firebase
// This pattern prevents re-initializing the app on every hot-reload.
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app); // Relies on storageBucket from firebaseConfig

export { app, auth, db, storage, type FirebaseUser };
