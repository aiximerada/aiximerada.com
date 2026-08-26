// 代購共用登入快取:記住登入,切頁面不用每次重跑登入載入
import { db } from "./firebase-config.js";
import { LIFF_ID } from "./daigou-config.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const KEY = "daigou_me_v1";

export function readCachedMe() {
  try { const s = localStorage.getItem(KEY); return s ? JSON.parse(s) : null; }
  catch (e) { return null; }
}
export function cacheMe(me) {
  try { localStorage.setItem(KEY, JSON.stringify(me)); } catch (e) {}
}
export function clearCachedMe() {
  try { localStorage.removeItem(KEY); } catch (e) {}
}

// 驗證登入並回傳最新 me,同時更新快取。
// 未登入 → 自動 liff.login()(回傳的 Promise 不會 resolve,因為即將跳轉)。
export async function ensureFreshMe() {
  await liff.init({ liffId: LIFF_ID });
  if (!liff.isLoggedIn()) { clearCachedMe(); liff.login(); return await new Promise(() => {}); }
  const p = await liff.getProfile();
  const cached = readCachedMe();
  // realName 優先用同一使用者的快取,省去每頁都讀 Firestore
  let realName = (cached && cached.lineUserId === p.userId && cached.realName) || null;
  if (!realName) {
    try {
      const snap = await getDoc(doc(db, "users", p.userId));
      realName = (snap.exists() && snap.data().realName) || null;
    } catch (e) {}
  }
  const me = {
    lineUserId: p.userId, displayName: p.displayName, avatar: p.pictureUrl || "",
    realName: realName || p.displayName, hasRealName: !!realName,
  };
  cacheMe(me);
  return me;
}
