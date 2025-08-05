
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

// =================================================================================
// CONFIGURACIÓN CENTRALIZADA USANDO VARIABLES DE ENTORNO
// =================================================================================
// Las variables de entorno son proporcionadas por el entorno de App Hosting.
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
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

    