import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

// =================================================================================
// CONFIGURACIÓN CENTRALIZADA USANDO VARIABLES DE ENTORNO
// =================================================================================
// Las variables de entorno son proporcionadas por el entorno de App Hosting en producción
// y por un archivo .env.local (no incluido en git) durante el desarrollo local.
export const firebaseConfig = {
  apiKey: "AIzaSyBpRAXR8mTcBTXwuXV5VaXdqCP6yx85MUE",
  authDomain: "almacenador-cloud.firebaseapp.com",
  projectId: "almacenador-cloud",
  storageBucket: "almacenador-cloud.firebasestorage.app",
  messagingSenderId: "790911154631",
  appId: "1:790911154631:web:91e2d71d8ccfbf058301e2",
  measurementId: "G-R2NQTYM2GX"
};

// Esta variable de verificación ahora es crucial.
export const appHasAllConfig =
  !!firebaseConfig.apiKey &&
  !!firebaseConfig.authDomain &&
  !!firebaseConfig.projectId &&
  !!firebaseConfig.storageBucket &&
  !!firebaseConfig.messagingSenderId &&
  !!firebaseConfig.appId;

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;


// Inicialización robusta que se ejecuta solo si la configuración es completa.
// Este patrón es seguro para usarse en cliente y servidor en Next.js.
if (appHasAllConfig) {
  app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
} else {
  // En el lado del cliente, esto advertirá al desarrollador si falta configuración.
  if (typeof window !== 'undefined') {
    console.warn(
      'ADVERTENCIA: Faltan variables de configuración de Firebase en el entorno. ' +
      'La aplicación no se puede inicializar correctamente. ' +
      'Asegúrese de que la aplicación esté conectada a un backend de Firebase App Hosting y las variables de entorno estén configuradas.'
    );
  }
  // En el servidor, los servicios simplemente no estarán disponibles, previniendo crashes.
}

// @ts-ignore: Se exportan las variables aunque puedan no estar inicializadas si falta config.
// El resto de la app debe usar `appHasAllConfig` para verificar su disponibilidad.
export { app, auth, db, storage };