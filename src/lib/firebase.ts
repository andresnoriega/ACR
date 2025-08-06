// Import the functions you need from the SDKs you need
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  enableIndexedDbPersistence,
  getFirestore,
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Your web app's Firebase configuration
// IMPORTANT: This object is sourced from your project's Firebase setup and is safe to be public.
export const firebaseConfig = {
  apiKey: "AIzaSyBpRAXR8mTcBTXwuXV5VaXdqCP6yx85MUE",
  authDomain: "almacenador-cloud.firebaseapp.com",
  projectId: "almacenador-cloud",
  storageBucket: "almacenador-cloud.appspot.com",
  messagingSenderId: "790911154631",
  appId: "1:790911154631:web:91e2d71d8ccfbf058301e2",
  measurementId: "G-R2NQTYM2GX"
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

export { db, auth, storage };
