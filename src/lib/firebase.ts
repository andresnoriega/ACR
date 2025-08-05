
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// =================================================================================
// CONFIGURACIÓN CENTRALIZADA USANDO VARIABLES DE ENTORNO
// =================================================================================
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
