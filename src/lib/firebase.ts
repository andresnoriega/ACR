
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

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

const appHasAllConfig =
  firebaseConfig.apiKey &&
  firebaseConfig.authDomain &&
  firebaseConfig.projectId &&
  firebaseConfig.storageBucket &&
  firebaseConfig.messagingSenderId &&
  firebaseConfig.appId;

let app: FirebaseApp;

// Only log the warning on the client-side, where process.env.NODE_ENV is available.
if (typeof window !== 'undefined' && !appHasAllConfig) {
  console.warn(
    'ADVERTENCIA: Faltan variables de configuración de Firebase en el entorno. ' +
    'La aplicación no se puede inicializar correctamente. ' +
    'Asegúrese de que la aplicación esté conectada a un backend de Firebase App Hosting y las variables de entorno estén configuradas.'
  );
}

if (appHasAllConfig) {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }
} else {
  // We don't initialize app if config is missing.
  // Services will fail, but the app might still build.
  // @ts-ignore
  app = {}; // Assign a dummy object to prevent further crashes on server-side rendering
}


// Se exportan las instancias de los servicios para ser usadas en la aplicación.
// Si 'app' no se inicializó, estas funciones lanzarán un error, lo cual es esperado.
const auth = appHasAllConfig ? getAuth(app) : {};
const db = appHasAllConfig ? getFirestore(app) : {};
const storage = appHasAllConfig ? getStorage(app) : {};

// @ts-ignore
export { app, auth, db, storage };
