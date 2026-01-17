// js/firebase-config.js
// Firebase 核心連線設定 (含資料庫與驗證系統)

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
// 新增引入 Auth 相關功能
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } 
    from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, query, orderBy, limit, getDocs } 
    from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    // ⚠️ 請確保這裡依然是您自己的設定 (不要動到這裡)
    apiKey: "您的_API_KEY",
    authDomain: "您的專案ID.firebaseapp.com",
    projectId: "您的專案ID",
    storageBucket: "您的專案ID.appspot.com",
    messagingSenderId: "您的ID",
    appId: "您的APP_ID"
};

// 初始化
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app); // 初始化驗證系統

// 匯出功能給其他檔案使用
export { 
    db, auth, 
    collection, addDoc, query, orderBy, limit, getDocs,
    signInWithEmailAndPassword, signOut, onAuthStateChanged 
};
