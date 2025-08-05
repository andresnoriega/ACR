import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, initializeFirestore, memoryLocalCache } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// =================================================================================
// CONFIGURACIÓN CORREGIDA PARA EL PROYECTO: asistente-acr-cloud
// =================================================================================
const firebaseConfig = {
  apiKey: "AIzaSyBpRAXR8mTcBTXwuXV5VaXdqCP6yx85MUE",
  authDomain: "asistente-acr-cloud.firebaseapp.com",
  projectId: "asistente-acr-cloud",
  storageBucket: "asistente-acr-cloud.appspot.com",
  messagingSenderId: "790911154631",
  appId: "1:790911154631:web:2c5f18c6454a869e9f7834",
  measurementId: "G-1T4X7V4X7B"
};


let app: FirebaseApp;

// Evitar reinicializar la app
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage, firebaseConfig };