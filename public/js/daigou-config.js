// 代購共用設定
export const LIFF_ID = "2009464550-UWeV9K8C";

// 管理員的 LINE userId（培根本人）。待填入實際 ID。
export const ADMIN_IDS = [
  // "Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
];

// 訂單狀態流程（依序）
export const ORDER_STATUS = ["下單", "已付款", "已代購", "運送中", "到貨", "已取貨"];

export function isAdminUser(lineUserId, userDoc) {
  return ADMIN_IDS.includes(lineUserId) || !!(userDoc && userDoc.isAdmin);
}
