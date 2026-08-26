// 代購共用設定
export const LIFF_ID = "2009464550-UWeV9K8C";

// 管理員的 LINE userId（培根本人）。待填入實際 ID。
export const ADMIN_IDS = [
  "U438eb7cb22b7077937c59815811eee40", // 培根本人
];

// 訂單狀態流程（依序）
export const ORDER_STATUS = ["下單", "準備代購", "已代購", "已取貨"];

export function isAdminUser(lineUserId, userDoc) {
  return ADMIN_IDS.includes(lineUserId) || !!(userDoc && userDoc.isAdmin);
}
