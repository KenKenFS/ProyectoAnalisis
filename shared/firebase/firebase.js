import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';

// Configuración de Firebase para CevicheDelReyDB
const firebaseConfig = {
  apiKey: "AIzaSyCN5HBuW6Fr1uWIxSBMzTxJSsqN1Wk1HtY",
  authDomain: "cevichedelreydb.firebaseapp.com",
  projectId: "cevichedelreydb",
  storageBucket: "cevichedelreydb.firebasestorage.app",
  messagingSenderId: "598439667547",
  appId: "1:598439667547:web:abc73c6adb522a202d5c7e",
  measurementId: "G-BYMGZKC9QW"
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);

// Exporta las instancias de los servicios
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

export default app;
