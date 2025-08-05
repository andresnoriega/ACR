
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, initializeFirestore, memoryLocalCache } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// =================================================================================
// CONFIGURACIÓN CORREGIDA PARA EL PROYECTO: Asistente-ACR Cloud
// =================================================================================
const firebaseConfig = {
  apiKey: "AIzaSyBpRAXR8mTcBTXwuXV5VaXdqCP6yx85MUE",
  authDomain: "almacenador-cloud.firebaseapp.com",
  projectId: "almacenador-cloud",
  storageBucket: "almacenador-cloud.appspot.com",
  messagingSenderId: "790911154631",
  // appId y measurementId no son estrictamente necesarios para los servicios
  // principales de Firestore, Auth y Storage en esta aplicación.
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
