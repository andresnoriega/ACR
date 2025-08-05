
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, initializeFirestore, memoryLocalCache } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// =================================================================================
// SOLUCIÓN DEFINITIVA: Configuración de Firebase Codificada Directamente
// Se usa la configuración verificada para garantizar la conexión.
// =================================================================================
const firebaseConfig = {
  apiKey: "AIzaSyDPfL1Jrh1SGF0x863C9cqOa-Yn9oJcMZU",
  authDomain: "almacenador-cloud.firebaseapp.com",
  projectId: "almacenador-cloud",
  storageBucket: "almacenador-cloud.appspot.com",
  messagingSenderId: "790911154631",
  appId: "1:790911154631:web:91e2d71d8ccfbf058301e2",
  measurementId: "G-R2NQTYM2GX"
};

let app: FirebaseApp;

// Evitar reinicializar la app
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const auth = getAuth(app);
const db = initializeFirestore(app, { localCache: memoryLocalCache() });
const storage = getStorage(app);

export { app, auth, db, storage, firebaseConfig };
