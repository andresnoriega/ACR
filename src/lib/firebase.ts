
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type User as FirebaseUser } from "firebase/auth";
import { getFirestore, initializeFirestore, memoryLocalCache } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
// =================================================================================
// Pega tu API Key directamente en la línea de abajo.
// Esta es la solución definitiva para asegurar que la aplicación la utilice correctamente.
// =================================================================================
const firebaseConfig = {
  apiKey: "POR_FAVOR_PEGA_AQUI_TU_API_KEY", // <--- PÉGALA AQUÍ
  authDomain: "almacenador-cloud.firebaseapp.com",
  projectId: "almacenador-cloud",
  storageBucket: "almacenador-cloud.appspot.com",
  messagingSenderId: "790911154631",
  appId: "1:790911154631:web:91e2d71d8ccfbf058301e2",
  measurementId: "G-R2NQTYM2GX"
};

// Initialize Firebase
let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const auth = getAuth(app);
const db = initializeFirestore(app, {
  localCache: memoryLocalCache()
});
const storage = getStorage(app);

export { app, auth, db, storage, type FirebaseUser };
