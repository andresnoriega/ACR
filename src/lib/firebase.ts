
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, initializeFirestore, memoryLocalCache } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// =================================================================================
// SOLUCIÓN DEFINITIVA: Configuración de Firebase Codificada Directamente
// Se usa la configuración verificada para garantizar la conexión.
// =================================================================================
const firebaseConfig = {
  "projectId": "rca-assistant-jk3ja",
  "appId": "1:1044963774198:web:4ae00d1ee674f1864ea6d7",
  "storageBucket": "rca-assistant-jk3ja.appspot.com",
  "apiKey": "AIzaSyA3a8UytRbwFKWT9ISF1OlYaizC37b3rZQ",
  "authDomain": "rca-assistant-jk3ja.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "1044963774198"
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
