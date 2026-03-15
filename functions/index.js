const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");

// 初始化 Firebase 後端權限
admin.initializeApp();
const db = admin.firestore();

// 🔴 這裡已經換成您的 LINE 官方帳號 Channel Access Token
const LINE_TOKEN = "p6ugh27GDssmbdkmySR4Z/6QykwBCwpxyQzRvpjJqJAR8zGbTUH0MbhlsMYKAZFrcEWozoAXRflXW+z5P0+EWNPPgVXfjkeYAcFrRleCM3Spwdjsy43Af2S3yNwEoY+G8Us2LtzKXcMpjVQ8DnOovAdB04t89/1O/w1cDnyilFU=";

// =====================================================================
// 1. 接收 LINE Webhook：當有人加入好友或傳訊息時，自動把他的 User ID 存進資料庫
// =====================================================================
exports.lineWebhook = functions.https.onRequest(async (req, res) => {
    const events = req.body.events;
    
    if (events && events.length > 0) {
        for (const event of events) {
            // 如果是「傳送訊息」或「加入好友」的事件
            if (event.type === "message" || event.type === "follow") {
                const userId = event.source.userId;
                
                // 將這個使用者的 ID 存到 Firestore 的 "line_users" 資料夾中
                await db.collection("line_users").doc(userId).set({
                    userId: userId,
                    lastUpdated: admin.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
            }
        }
    }
    // 回傳 OK 給 LINE 伺服器，表示我們收到了
    res.status(200).send("OK");
});

// =====================================================================
// 2. 主動發送訊息：當您的資料庫「messages_to_send」有新增資料時，自動推播到 LINE
// =====================================================================
exports.sendLineMessage = functions.firestore
    .document('messages_to_send/{docId}')
    .onCreate(async (snap, context) => {
        const newMsgData = snap.data();
        const userId = newMsgData.userId;    // 要傳給誰
        const messageText = newMsgData.text; // 要傳什麼訊息

        if (!userId || !messageText) return;

        try {
            // 呼叫 LINE 推播 API
            await axios.post('https://api.line.me/v2/bot/message/push', {
                to: userId,
                messages: [{ type: 'text', text: messageText }]
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${LINE_TOKEN}`
                }
            });
            console.log(`成功發送訊息給：${userId}`);
        } catch (error) {
            console.error("訊息發送失敗：", error.response ? error.response.data : error.message);
        }
    });