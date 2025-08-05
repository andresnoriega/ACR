
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, initializeFirestore, memoryLocalCache } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// =================================================================================
// ACCIÓN REQUERIDA: POR FAVOR, REEMPLACE ESTOS VALORES
// Vaya a la configuración de su proyecto original en la Consola de Firebase
// y copie los valores correspondientes aquí.
// =================================================================================
const firebaseConfig = {
  "projectId": "REEMPLAZAR_CON_TU_PROJECT_ID",
  "appId": "REEMPLAZAR_CON_TU_APP_ID",
  "storageBucket": "REEMPLAZAR_CON_TU_STORAGE_BUCKET",
  "apiKey": "REEMPLAZAR_CON_TU_API_KEY",
  "authDomain": "REEMPLAZAR_CON_TU_AUTH_DOMAIN",
  "measurementId": "REEMPLAZAR_CON_TU_MEASUREMENT_ID",
  "messagingSenderId": "REEMPLAZAR_CON_TU_MESSAGING_SENDER_ID"
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
