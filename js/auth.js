// js/auth.js
// 管理登入、登出與介面狀態
import { auth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from './firebase-config.js';

// DOM 元素
const loginBtn = document.getElementById('fab-login');
const loginModal = document.getElementById('login-modal');
const closeModal = document.getElementById('close-modal');
const confirmLogin = document.getElementById('btn-confirm-login');
const emailInput = document.getElementById('login-email');
const pwdInput = document.getElementById('login-pwd');
const userLabel = document.getElementById('user-status-label');

// 1. 監聽登入狀態改變 (最重要！)
onAuthStateChanged(auth, (user) => {
    if (user) {
        // --- 已登入模式 ---
        console.log("管理員已登入:", user.email);
        
        // 改變右下角按鈕外觀
        loginBtn.innerHTML = '<i class="fa-solid fa-user-shield"></i>';
        loginBtn.style.background = '#f2c94c'; // 金色代表管理員
        loginBtn.title = "管理員線上";
        
        // 顯示狀態文字
        userLabel.innerText = `COMMANDER: ${user.email.split('@')[0]}`;
        userLabel.style.display = 'block';

        // 綁定點擊按鈕為「登出」
        loginBtn.onclick = handleLogout;
    } else {
        // --- 未登入模式 ---
        console.log("訪客模式");
        
        // 還原按鈕
        loginBtn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i>';
        loginBtn.style.background = 'var(--suisei-cyan)';
        loginBtn.title = "管理員登入";
        
        // 隱藏狀態文字
        userLabel.style.display = 'none';

        // 綁定點擊按鈕為「開啟登入窗」
        loginBtn.onclick = () => { loginModal.style.display = 'flex'; };
    }
});

// 2. 執行登入
confirmLogin.addEventListener('click', async () => {
    const email = emailInput.value;
    const pwd = pwdInput.value;
    const msg = document.getElementById('login-msg');

    if(!email || !pwd) return;

    msg.innerText = "驗證權限中...";
    
    try {
        await signInWithEmailAndPassword(auth, email, pwd);
        // 成功後，視窗會自動關閉 (因為 onAuthStateChanged 會觸發)
        loginModal.style.display = 'none';
        msg.innerText = "";
        emailInput.value = ""; 
        pwdInput.value = "";
        alert("歡迎回來，指揮官。");
    } catch (error) {
        console.error(error);
        msg.innerText = "權限拒絕：帳號或密碼錯誤";
        msg.style.color = "#ff4444";
    }
});

// 3. 執行登出
async function handleLogout() {
    if(confirm("確定要登出系統嗎？")) {
        await signOut(auth);
        alert("已安全登出。");
    }
}

// 4. 關閉視窗邏輯
closeModal.addEventListener('click', () => { loginModal.style.display = 'none'; });
// 點擊視窗外背景也能關閉
window.addEventListener('click', (e) => {
    if (e.target == loginModal) loginModal.style.display = 'none';
});
