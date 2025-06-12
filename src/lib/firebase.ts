
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp, FirebaseError } from "firebase/app"; // Added FirebaseError
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

console.log("[Firebase] Initializing Firebase app (src/lib/firebase.ts)...");

// Configuration directly from Firebase Console - User Provided on 2024-07-23
const firebaseConfig = {
  apiKey: "AIzaSyA3a8UytRbwFKWT9ISF1OlYaizC37b3rZQ",
  authDomain: "rca-assistant-jk3ja.firebaseapp.com",
  projectId: "rca-assistant-jk3ja",
  storageBucket: "rca-assistant-jk3ja.firebasestorage.app",
  messagingSenderId: "1044963774198",
  appId: "1:1044963774198:web:4ae00d1ee674f1864ea6d7"
};

console.log("[Firebase] Config object used for initializeApp:", JSON.stringify(firebaseConfig));

let app;
try {
  if (!getApps().length) {
    console.log("[Firebase] No apps initialized. Calling initializeApp().");
    app = initializeApp(firebaseConfig);
    console.log("[Firebase] initializeApp() successful. App name:", app.name);
  } else {
    console.log("[Firebase] App already initialized. Calling getApp().");
    app = getApp();
    console.log("[Firebase] getApp() successful. App name:", app.name);
  }
} catch (e: any) { // Catch any error type
  console.error("[Firebase] CRITICAL ERROR during app initialization (initializeApp/getApp):", e);
  if (e instanceof FirebaseError) {
    console.error("[Firebase] FirebaseError Code:", e.code);
    console.error("[Firebase] FirebaseError Message:", e.message);
  } else if (e && typeof e.message === 'string') {
    console.error("[Firebase] Error Message:", e.message);
  }
  // Consider re-throwing or handling more gracefully depending on app needs
}

let auth;
if (app) {
  try {
    console.log("[Firebase] Calling getAuth().");
    auth = getAuth(app);
    console.log("[Firebase] getAuth() successful.");
  } catch (e: any) { // Catch any error type
    console.error("[Firebase] ERROR during getAuth():", e);
    if (e instanceof FirebaseError) {
      console.error("[Firebase] FirebaseError Code:", e.code);
      console.error("[Firebase] FirebaseError Message:", e.message);
    } else if (e && typeof e.message === 'string') {
      console.error("[Firebase] Error Message:", e.message);
    }
  }
} else {
  console.error("[Firebase] Firebase app object is undefined. Cannot initialize Auth.");
}

let db;
if (app) {
  try {
    console.log("[Firebase] Calling getFirestore(). This might trigger GetDatabase RPC asynchronously.");
    db = getFirestore(app);
    console.log("[Firebase] getFirestore() call initiated. Firestore client object created (or retrieved).");
  } catch (e: any) { // Catch any error type
    console.error("[Firebase] ERROR during getFirestore() call (synchronous part):", e);
    if (e instanceof FirebaseError) {
      console.error("[Firebase] FirebaseError Code:", e.code);
      console.error("[Firebase] FirebaseError Message:", e.message);
    } else if (e && typeof e.message === 'string') {
      console.error("[Firebase] Error Message:", e.message);
    }
  }
} else {
  console.error("[Firebase] Firebase app object is undefined. Cannot initialize Firestore.");
}

console.log("[Firebase] Firebase module (src/lib/firebase.ts) fully processed.");
if (app) console.log("[Firebase] App instance name:", app.name);


export { app, auth, db };
