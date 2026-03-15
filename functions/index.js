const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");
const axios = require("axios");

admin.initializeApp();
const db = admin.firestore();

const LINE_TOKEN = "p6ugh27GDssmbdkmySR4Z/6QykwBCwpxyQzRvpjJqJAR8zGbTUH0MbhlsMYKAZFrcEWozoAXRflXW+z5P0+EWNPPgVXfjkeYAcFrRleCM3Spwdjsy43Af2S3yNwEoY+G8Us2LtzKXcMpjVQ8DnOovAdB04t89/1O/w1cDnyilFU=";

async function replyLineMessage(replyToken, messages) {
    await axios.post('https://api.line.me/v2/bot/message/reply', {
        replyToken: replyToken,
        messages: messages
    }, { headers: { 'Authorization': `Bearer ${LINE_TOKEN}` } });
}

// 獲取用戶 LINE 暱稱的輔助函數
async function getUserProfile(userId) {
    try {
        const res = await axios.get(`https://api.line.me/v2/bot/profile/${userId}`, {
            headers: { 'Authorization': `Bearer ${LINE_TOKEN}` }
        });
        return res.data.displayName;
    } catch (e) { return "神祕用戶"; }
}

exports.lineWebhook = functions.https.onRequest(async (req, res) => {
    const events = req.body.events;
    if (!events || events.length === 0) return res.status(200).send("OK");

    for (const event of events) {
        if (event.type === "message" && event.message.type === "text") {
            const userId = event.source.userId;
            const text = event.message.text.trim();
            const replyToken = event.replyToken;
            const userRef = db.collection("users").doc(userId);
            const userDoc = await userRef.get();
            const userData = userDoc.data() || {};

            // 1. 處理「創建群組」
            if (text === "創建群組") {
                const inviteCode = Math.floor(100000 + Math.random() * 900000).toString();
                await db.collection("groups").doc(inviteCode).set({
                    owner: userId,
                    members: [userId],
                    createdAt: admin.firestore.FieldValue.serverTimestamp()
                });
                await userRef.set({ groupId: inviteCode, state: "IDLE" }, { merge: true });
                await replyLineMessage(replyToken, [{ type: "text", text: `✅ 群組創建成功！\n您的群組邀請碼為：${inviteCode}\n請另一位用戶輸入「加入群組 ${inviteCode}」即可完成連動。` }]);
                continue;
            }

            // 2. 處理「加入群組 XXX」
            if (text.startsWith("加入群組")) {
                const code = text.replace("加入群組", "").trim();
                const groupRef = db.collection("groups").doc(code);
                const groupDoc = await groupRef.get();

                if (groupDoc.exists()) {
                    await groupRef.update({ members: admin.firestore.FieldValue.arrayUnion(userId) });
                    await userRef.set({ groupId: code, state: "IDLE" }, { merge: true });
                    await replyLineMessage(replyToken, [{ type: "text", text: `🎉 成功加入群組 ${code}！現在你們可以共同記帳了。` }]);
                } else {
                    await replyLineMessage(replyToken, [{ type: "text", text: "❌ 找不到這個邀請碼，請確認後再試一次。" }]);
                }
                continue;
            }

            // 3. 懶人選單觸發 (包含錯字容錯)
            const triggerWords = ["記", "帳", "賬", "報", "錢", "買"];
            if (triggerWords.some(w => text.includes(w)) && userData.state !== "WAITING_PERSONAL" && userData.state !== "WAITING_GROUP") {
                await replyLineMessage(replyToken, [{
                    type: "text",
                    text: "要記帳嗎？請選擇本筆金額存放位置：",
                    quickReply: {
                        items: [
                            { type: "action", action: { type: "message", label: "🙋‍♂️ 個人帳本", text: "🙋‍♂️ 個人記帳" } },
                            { type: "action", action: { type: "message", label: "👥 群組共用", text: "👥 群組記帳" } }
                        ]
                    }
                }]);
                continue;
            }

            // 4. 處理選擇後的狀態
            if (text === "🙋‍♂️ 個人記帳" || text === "👥 群組記帳") {
                const isGroup = text.includes("群組");
                if (isGroup && !userData.groupId) {
                    await replyLineMessage(replyToken, [{ type: "text", text: "⚠️ 您尚未加入任何群組喔！請先輸入「創建群組」來開始。" }]);
                    continue;
                }
                await userRef.update({ state: isGroup ? "WAITING_GROUP" : "WAITING_PERSONAL" });
                await replyLineMessage(replyToken, [{ type: "text", text: `已進入【${isGroup ? '群組' : '個人'}】模式\n請輸入「金額 項目」(例如: 100 晚餐)` }]);
                continue;
            }

            // 5. 執行儲存
            if (userData.state === "WAITING_PERSONAL" || userData.state === "WAITING_GROUP") {
                if (text === "取消") {
                    await userRef.update({ state: "IDLE" });
                    await replyLineMessage(replyToken, [{ type: "text", text: "已取消。" }]);
                    continue;
                }

                const parts = text.split(/\s+/);
                const amount = parseInt(parts[0]);
                const item = parts.slice(1).join(" ");

                if (isNaN(amount) || !item) {
                    await replyLineMessage(replyToken, [{ type: "text", text: "格式錯誤，請輸入「金額 項目」或打「取消」。" }]);
                    continue;
                }

                const userName = await getUserProfile(userId);
                const isGroup = userData.state === "WAITING_GROUP";
                const collectionName = isGroup ? "records_group" : "records_personal";
                
                const record = {
                    userId: userId,
                    userName: userName, // 紀錄誰付錢
                    amount: amount,
                    item: item,
                    timestamp: admin.firestore.FieldValue.serverTimestamp()
                };

                if (isGroup) record.groupId = userData.groupId;

                await db.collection(collectionName).add(record);
                await userRef.update({ state: "IDLE" });

                await replyLineMessage(replyToken, [{
                    type: "text",
                    text: `✅ 紀錄成功！\n💰 類型：${isGroup ? '群組共用' : '個人'}\n👤 付款人：${userName}\n📍 項目：${item}\n💵 金額：${amount}`
                }]);
                continue;
            }
        }
    }
    res.status(200).send("OK");
});