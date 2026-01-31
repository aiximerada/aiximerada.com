// js/firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, query, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAAo6on0f2QUbPaRfxpIEb2uvhKxDvPUvs",
  authDomain: "yulubox.firebaseapp.com",
  projectId: "yulubox",
  storageBucket: "yulubox.firebasestorage.app",
  messagingSenderId: "256466567852",
  appId: "1:256466567852:web:233b74668908ffcb9b9509",
  measurementId: "G-YPCY41EKWX"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { 
    db, auth, 
    collection, addDoc, query, orderBy, limit, getDocs,
    signInWithEmailAndPassword, signOut, onAuthStateChanged 
};
