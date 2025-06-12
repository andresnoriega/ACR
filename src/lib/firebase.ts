
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp, FirebaseError } from "firebase/app"; // Added FirebaseError
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

console.log("[Firebase] Initializing Firebase app (src/lib/firebase.ts)...");

const firebaseConfig = {
  apiKey: "AIzaSyA3a8UytRbwFKWT9ISF10lYaizC37b3rZQ",
  authDomain: "rca-assistant-jk3ja.firebaseapp.com",
  projectId: "rca-assistant-jk3ja",
  storageBucket: "rca-assistant-jk3ja.firebasestorage.app",
  messagingSenderId: "1044963774198",
  appId: "1:1044963774198:web:4ae00d1ee674f1864ea6d7"
};

console.log("[Firebase] Config object:", firebaseConfig);

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
} catch (e) {
  console.error("[Firebase] CRITICAL ERROR during app initialization (initializeApp/getApp):", e);
  if (e instanceof FirebaseError) {
    console.error("[Firebase] FirebaseError Code:", e.code);
    console.error("[Firebase] FirebaseError Message:", e.message);
  }
  // No re-throw here to allow other initializations if possible, but mark as critical
}

let auth;
if (app) {
  try {
    console.log("[Firebase] Calling getAuth().");
    auth = getAuth(app);
    console.log("[Firebase] getAuth() successful.");
  } catch (e) {
    console.error("[Firebase] ERROR during getAuth():", e);
    if (e instanceof FirebaseError) {
      console.error("[Firebase] FirebaseError Code:", e.code);
      console.error("[Firebase] FirebaseError Message:", e.message);
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
    // Note: The actual connection and GetDatabase RPC happens asynchronously
    // after getFirestore() is called. The console logs above only confirm the SDK call was made.
    // An error from GetDatabase will appear later in the console if it fails.
  } catch (e) {
    console.error("[Firebase] ERROR during getFirestore() call (synchronous part):", e);
    if (e instanceof FirebaseError) {
      console.error("[Firebase] FirebaseError Code:", e.code);
      console.error("[Firebase] FirebaseError Message:", e.message);
    }
  }
} else {
  console.error("[Firebase] Firebase app object is undefined. Cannot initialize Firestore.");
}

console.log("[Firebase] Firebase module (src/lib/firebase.ts) fully processed.");
if (app) console.log("[Firebase] App instance:", app);
if (auth) console.log("[Firebase] Auth instance:", auth);
if (db) console.log("[Firebase] Firestore instance:", db);


export { app, auth, db };
