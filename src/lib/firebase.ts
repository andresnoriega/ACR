// Import the functions you need from the SDKs you need
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  enableIndexedDbPersistence,
  getFirestore,
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyANyy8c6Mtz5eEsEISIFBfc0Il5nm2dj8Y",
  authDomain: "assetflow-7qwu2.firebaseapp.com",
  projectId: "assetflow-7qwu2",
  storageBucket: "assetflow-7qwu2.appspot.com",
  messagingSenderId: "176933832283",
  appId: "1:176933832283:web:3c08259cb2ec5a3799617e"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// Enable offline persistence
if (typeof window !== 'undefined') {
  try {
    enableIndexedDbPersistence(db).catch((err) => {
      if (err.code == 'failed-precondition') {
        // Multiple tabs open, persistence can only be enabled
        // in one tab at a a time.
        console.warn(
          'Firestore persistence failed to initialize. This is normal if you have multiple tabs open.'
        );
      } else if (err.code == 'unimplemented') {
        // The current browser does not support all of the
        // features required to enable persistence
        console.warn(
          'Firestore persistence is not supported in this browser.'
        );
      }
    });
  } catch (e) {
    console.error('Error enabling firestore persistence', e);
  }
}

export { db, auth, storage, app, firebaseConfig };
