import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  projectId: "sargam-app-2026",
  appId: "1:908681622745:web:45f78946c3f9c0b7057ac8",
  storageBucket: "sargam-app-2026.firebasestorage.app",
  apiKey: "AIzaSyBp6JVpQgqwCbU2lHZ5crteo8zySGcCFjs",
  authDomain: "sargam-app-2026.firebaseapp.com",
  messagingSenderId: "908681622745",
  projectNumber: "908681622745",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
