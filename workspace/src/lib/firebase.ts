
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
export const appHasAllConfig =
  !!firebaseConfig.apiKey &&
  !!firebaseConfig.authDomain &&
  !!firebaseConfig.projectId &&
  !!firebaseConfig.storageBucket &&
  !!firebaseConfig.messagingSenderId &&
  !!firebaseConfig.appId;

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;

if (appHasAllConfig) {
  try {
    app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
  } catch (error) {
    console.error("Error initializing Firebase:", error);
    // In case of initialization error, ensure services are null
    app = null;
    auth = null;
    db = null;
    storage = null;
  }
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
