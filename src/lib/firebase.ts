
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, initializeFirestore, memoryLocalCache } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// =================================================================================
// NOTA IMPORTANTE: La API Key ahora se gestiona desde el archivo .env
// =================================================================================
// Asegúrese de que su archivo .env en la raíz del proyecto contenga la línea:
// NEXT_PUBLIC_FIREBASE_API_KEY="SU_API_KEY_AQUI"
// =================================================================================
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: "almacenador-cloud.firebaseapp.com",
  projectId: "almacenador-cloud",
  storageBucket: "almacenador-cloud.appspot.com",
  messagingSenderId: "790911154631",
  appId: "1:790911154631:web:91e2d71d8ccfbf058301e2",
  measurementId: "G-R2NQTYM2GX"
};

let app: FirebaseApp;

if (!getApps().length) {
  if (!firebaseConfig.apiKey || firebaseConfig.apiKey === "TU_API_KEY_VA_AQUI") {
    console.error("¡ERROR CRÍTICO DE CONFIGURACIÓN! La API Key de Firebase no está definida en el archivo .env. La aplicación no funcionará.");
  }
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const auth = getAuth(app);
const db = initializeFirestore(app, { localCache: memoryLocalCache() });
const storage = getStorage(app);

export { app, auth, db, storage, firebaseConfig };
