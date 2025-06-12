
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA3a8UytRbwFKWT9ISF10lYaizC37b3rZQ",
  authDomain: "rca-assistant-jk3ja.firebaseapp.com",
  projectId: "rca-assistant-jk3ja",
  storageBucket: "rca-assistant-jk3ja.firebasestorage.app",
  messagingSenderId: "1044963774198",
  appId: "1:1044963774198:web:4ae00d1ee674f1864ea6d7"
};

// Initialize Firebase
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
