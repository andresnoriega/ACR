
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// =================================================================================
// CONFIGURACIÓN CENTRALIZADA USANDO VARIABLES DE ENTORNO
// =================================================================================
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

const appHasAllConfig =
  firebaseConfig.apiKey &&
  firebaseConfig.authDomain &&
  firebaseConfig.projectId &&
  firebaseConfig.storageBucket &&
  firebaseConfig.messagingSenderId &&
  firebaseConfig.appId;

let app: FirebaseApp;

if (appHasAllConfig) {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }
} else {
  console.error(
    'Faltan variables de configuración de Firebase en el archivo .env. ' +
    'La aplicación no se puede inicializar correctamente. ' +
    'Por favor, copie la configuración desde la consola de Firebase a su archivo .env.'
  );
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
