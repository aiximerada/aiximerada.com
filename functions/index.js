const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");
const axios = require("axios");

admin.initializeApp();
const db = admin.firestore();

// 🔴 您的 LINE 官方帳號 Channel Access Token
const LINE_TOKEN = "p6ugh27GDssmbdkmySR4Z/6QykwBCwpxyQzRvpjJqJAR8zGbTUH0MbhlsMYKAZFrcEWozoAXRflXW+z5P0+EWNPPgVXfjkeYAcFrRleCM3Spwdjsy43Af2S3yNwEoY+G8Us2LtzKXcMpjVQ8DnOovAdB04t89/1O/w1cDnyilFU=";

// 輔助函數：免費且快速的 LINE 回覆 API
async function replyLineMessage(replyToken, messages) {
    try {
        await axios.post('https://api.line.me/v2/bot/message/reply', {
            replyToken: replyToken,
            messages: messages
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${LINE_TOKEN}`
            }
        });
    } catch (error) {
        console.error("回覆失敗:", error.response ? error.response.data : error.message);
    }
}

// =====================================================================
// 核心對話大腦：處理所有 LINE 傳來的訊息
// =====================================================================
exports.lineWebhook = functions.https.onRequest(async (req, res) => {
    const events = req.body.events;
    if (!events || events.length === 0) return res.status(200).send("OK");

    for (const event of events) {
        if (event.type === "message" && event.message.type === "text") {
            const userId = event.source.userId;
            const text = event.message.text.trim();
            const replyToken = event.replyToken;

            // 1. 去資料庫讀取這個用戶「現在正在做什麼 (狀態)」
            const userRef = db.collection("users").doc(userId);
            const userDoc = await userRef.get();
            let userState = "IDLE"; // 預設是閒置狀態
            
            if (userDoc.exists && userDoc.data().state) {
                userState = userDoc.data().state;
            } else {
                await userRef.set({ userId: userId, state: "IDLE" }, { merge: true });
            }

            // ================= 邏輯判斷區 =================

            // 狀況 A：使用者點擊了快速選單
            if (text === "🙋‍♂️ 個人記帳" || text === "👥 群組記帳") {
                const isGroup = (text === "👥 群組記帳");
                // 更新使用者狀態為「等待輸入金額中」
                await userRef.set({ state: isGroup ? "WAITING_GROUP" : "WAITING_PERSONAL" }, { merge: true });
                
                await replyLineMessage(replyToken, [{
                    type: "text",
                    text: `您選擇了【${isGroup ? '群組' : '個人'}記帳】📝\n\n請輸入「金額 項目」\n例如：150 午餐\n\n(輸入「取消」可中斷記帳)`
                }]);
                continue;
            }

            // 狀況 B：使用者中途想取消
            if (text === "取消") {
                await userRef.set({ state: "IDLE" }, { merge: true });
                await replyLineMessage(replyToken, [{ type: "text", text: "👌 已取消本次記帳動作。" }]);
                continue;
            }

            // 狀況 C：使用者正在輸入記帳的詳細內容（狀態不是 IDLE）
            if (userState === "WAITING_PERSONAL" || userState === "WAITING_GROUP") {
                // 用空白把文字切開 (例如把 "150 午餐" 切成 "150" 和 "午餐")
                const parts = text.split(/\s+/); 
                const amount = parseInt(parts[0]);
                const item = parts.slice(1).join(" "); // 剩下的全當作項目名稱

                // 檢查格式對不對
                if (isNaN(amount) || !item) {
                    await replyLineMessage(replyToken, [{
                        type: "text",
                        text: "⚠️ 格式好像不太對喔！\n請用「數字 + 空白 + 項目名稱」\n例如：150 午餐\n\n(輸入「取消」可中斷記帳)"
                    }]);
                    continue;
                }

                // 存入對應的資料庫 (個人或群組)
                const collectionName = userState === "WAITING_PERSONAL" ? "records_personal" : "records_group";
                await db.collection(collectionName).add({
                    userId: userId,
                    amount: amount,
                    item: item,
                    timestamp: admin.firestore.FieldValue.serverTimestamp()
                });

                // 記帳完成，把大腦狀態洗掉變回閒置
                await userRef.set({ state: "IDLE" }, { merge: true });

                await replyLineMessage(replyToken, [{
                    type: "text",
                    text: `✅ 記錄成功！\n\n💰 帳本：${userState === "WAITING_PERSONAL" ? '個人' : '群組'}\n📍 項目：${item}\n💵 金額：${amount} 元`
                }]);
                continue;
            }

            // 狀況 D：使用者在閒置狀態，我們用「模糊判斷」觸發懶人選單
            // 只要文字裡面包含「記、帳、賬、報、花、錢」，或者一開頭就是打數字，就跳出選單
            const triggerWords = ["記", "帳", "賬", "報", "花", "錢", "買"];
            const isTrigger = triggerWords.some(word => text.includes(word)) || !isNaN(parseInt(text[0]));
            
            if (isTrigger) { 
                await replyLineMessage(replyToken, [{
                    type: "text",
                    text: "要記帳嗎？請問這筆花費要記在哪裡呢？👇",
                    quickReply: { // 這就是 LINE 超好用的懶人泡泡按鈕
                        items: [
                            {
                                type: "action",
                                action: { type: "message", label: "🙋‍♂️ 個人記帳", text: "🙋‍♂️ 個人記帳" }
                            },
                            {
                                type: "action",
                                action: { type: "message", label: "👥 群組記帳", text: "👥 群組記帳" }
                            }
                        ]
                    }
                }]);
                continue;
            }

            // 如果打的話完全無關，可以隨意聊一句
            await replyLineMessage(replyToken, [{
                type: "text",
                text: "收到！如果您想記帳，隨便輸入包含「記帳」的字或是「花費金額」就可以囉！"
            }]);
        }
    }
    res.status(200).send("OK");
});