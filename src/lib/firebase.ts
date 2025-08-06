
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

// =================================================================================
// CONFIGURACIÓN CENTRALIZADA USANDO VARIABLES DE ENTORNO
// =================================================================================
// Las variables de entorno son proporcionadas por el entorno de App Hosting.
export const firebaseConfig = {
  apiKey: "AIzaSyBpRAXR8mTcBTXwuXV5VaXdqCP6yx85MUE",
  authDomain: "almacenador-cloud.firebaseapp.com",
  projectId: "almacenador-cloud",
  storageBucket: "almacenador-cloud.firebasestorage.app",
  messagingSenderId: "790911154631",
  appId: "1:790911154631:web:91e2d71d8ccfbf058301e2",
  measurementId: "G-R2NQTYM2GX"
};

const appHasAllConfig =
  !!firebaseConfig.apiKey &&
  !!firebaseConfig.authDomain &&
  !!firebaseConfig.projectId;

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;

if (appHasAllConfig) {
  app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
} else {
  if (typeof window !== 'undefined') {
    console.warn(
      'ADVERTENCIA: Faltan variables de configuración de Firebase en el entorno. ' +
      'La aplicación no se puede inicializar correctamente. ' +
      'Asegúrese de que la aplicación esté conectada a un backend de Firebase App Hosting y las variables de entorno estén configuradas.'
    );
  }
}

export { app, auth, db, storage };
