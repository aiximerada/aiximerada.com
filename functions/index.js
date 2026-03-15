const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");
const axios = require("axios");

admin.initializeApp();
const db = admin.firestore();

// 🔴 您的 LINE Channel Access Token
const LINE_TOKEN = "p6ugh27GDssmbdkmySR4Z/6QykwBCwpxyQzRvpjJqJAR8zGbTUH0MbhlsMYKAZFrcEWozoAXRflXW+z5P0+EWNPPgVXfjkeYAcFrRleCM3Spwdjsy43Af2S3yNwEoY+G8Us2LtzKXcMpjVQ8DnOovAdB04t89/1O/w1cDnyilFU=";

const DEFAULT_CATEGORIES = ["🥞 早餐", "🍱 午餐", "🍜 晚餐", "🚌 交通", "🧻 日常用品"];

async function replyLineMessage(replyToken, messages) {
    try {
        await axios.post('https://api.line.me/v2/bot/message/reply', {
            replyToken: replyToken,
            messages: messages
        }, { headers: { 'Authorization': `Bearer ${LINE_TOKEN}` } });
    } catch (error) {
        console.error("LINE 回覆失敗:", error.response ? error.response.data : error.message);
    }
}

async function getUserProfile(userId) {
    try {
        const res = await axios.get(`https://api.line.me/v2/bot/profile/${userId}`, {
            headers: { 'Authorization': `Bearer ${LINE_TOKEN}` }
        });
        return res.data.displayName || "神祕用戶";
    } catch (e) { return "記帳員"; }
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
            let userData = userDoc.exists ? userDoc.data() : { state: "IDLE", customCategories: [] };
            let state = userData.state || "IDLE";

            // 全域取消指令
            if (text === "取消") {
                await userRef.update({ state: "IDLE", tempRecord: admin.firestore.FieldValue.delete() });
                await replyLineMessage(replyToken, [{ type: "text", text: "👌 已取消目前的動作。" }]);
                continue;
            }

            // ==========================================
            // 階段 0：閒置狀態 (處理指令、啟動記帳)
            // ==========================================
            if (state === "IDLE") {
                // 創建群組 (支援自訂名稱：創建群組 日本旅遊)
                if (text.startsWith("創建群組")) {
                    const groupName = text.replace("創建群組", "").trim() || "未命名群組";
                    const inviteCode = Math.floor(100000 + Math.random() * 900000).toString();
                    await db.collection("groups").doc(inviteCode).set({
                        name: groupName,
                        owner: userId,
                        members: [userId],
                        createdAt: admin.firestore.FieldValue.serverTimestamp()
                    });
                    await userRef.set({ groupId: inviteCode }, { merge: true });
                    await replyLineMessage(replyToken, [{
                        type: "text",
                        text: `✅ 群組【${groupName}】創建成功！\n\n您的專屬邀請碼：${inviteCode}\n請邀請夥伴輸入「加入群組 ${inviteCode}」來同步帳本。`
                    }]);
                    continue;
                }

                // 加入群組
                if (text.startsWith("加入群組")) {
                    const code = text.replace("加入群組", "").trim();
                    const groupRef = db.collection("groups").doc(code);
                    const groupDoc = await groupRef.get();
                    if (groupDoc.exists()) {
                        const groupName = groupDoc.data().name;
                        await groupRef.update({ members: admin.firestore.FieldValue.arrayUnion(userId) });
                        await userRef.set({ groupId: code }, { merge: true });
                        await replyLineMessage(replyToken, [{ type: "text", text: `🎉 成功加入群組【${groupName}】！現在您可以共同記帳了。` }]);
                    } else {
                        await replyLineMessage(replyToken, [{ type: "text", text: "❌ 找不到該邀請碼，請確認代碼是否正確。" }]);
                    }
                    continue;
                }

                // 觸發記帳
                const triggerWords = ["記", "帳", "賬", "報", "錢", "買", "支"];
                if (triggerWords.some(w => text.includes(w))) {
                    await replyLineMessage(replyToken, [{
                        type: "text",
                        text: "請問這筆消費要記在哪裡呢？👇",
                        quickReply: {
                            items: [
                                { type: "action", action: { type: "message", label: "🙋‍♂️ 個人", text: "個人記帳" } },
                                { type: "action", action: { type: "message", label: "👥 群組", text: "群組記帳" } }
                            ]
                        }
                    }]);
                    continue;
                }

                // 選擇個人或群組 -> 進入「選擇分類」
                if (text === "個人記帳" || text === "群組記帳") {
                    const isGroup = text === "群組記帳";
                    if (isGroup && !userData.groupId) {
                        await replyLineMessage(replyToken, [{ type: "text", text: "⚠️ 您尚未加入群組，請先輸入「創建群組 (名稱)」。" }]);
                        continue;
                    }

                    // 準備分類按鈕 (預設 + 用戶自訂)
                    const customCats = userData.customCategories || [];
                    let allCats = [...DEFAULT_CATEGORIES, ...customCats];
                    allCats = allCats.slice(0, 12); // LINE 限制最多 13 個按鈕
                    
                    const quickReplyItems = allCats.map(c => ({
                        type: "action", action: { type: "message", label: c, text: c }
                    }));
                    quickReplyItems.push({ type: "action", action: { type: "message", label: "➕ 其他", text: "其他" } });

                    await userRef.update({ 
                        state: "WAITING_CATEGORY",
                        tempRecord: { type: isGroup ? "group" : "personal" }
                    });

                    await replyLineMessage(replyToken, [{
                        type: "text",
                        text: `您選擇了【${isGroup ? '群組' : '個人'}】\n請選擇消費分類：\n(輸入「取消」可中斷)`,
                        quickReply: { items: quickReplyItems }
                    }]);
                    continue;
                }
            }

            // ==========================================
            // 階段 1：等待選擇分類
            // ==========================================
            if (state === "WAITING_CATEGORY") {
                if (text === "其他") {
                    await userRef.update({ state: "WAITING_CUSTOM_CATEGORY" });
                    await replyLineMessage(replyToken, [{ type: "text", text: "請輸入您的「自訂分類名稱」：\n(下次記帳時會自動出現這顆按鈕喔！)" }]);
                    continue;
                }

                let tempRecord = userData.tempRecord || {};
                tempRecord.category = text;
                await userRef.update({ state: "WAITING_AMOUNT", tempRecord: tempRecord });
                await replyLineMessage(replyToken, [{ type: "text", text: `分類：${text}\n請輸入「消費金額」：` }]);
                continue;
            }

            // ==========================================
            // 階段 1.5：等待自訂分類名稱
            // ==========================================
            if (state === "WAITING_CUSTOM_CATEGORY") {
                const newCategory = text;
                let tempRecord = userData.tempRecord || {};
                tempRecord.category = newCategory;

                await userRef.update({ 
                    state: "WAITING_AMOUNT", 
                    tempRecord: tempRecord,
                    customCategories: admin.firestore.FieldValue.arrayUnion(newCategory) // 自動加入未來的選單中
                });
                await replyLineMessage(replyToken, [{ type: "text", text: `已新增分類：${newCategory}\n請輸入「消費金額」：` }]);
                continue;
            }

            // ==========================================
            // 階段 2：等待輸入金額
            // ==========================================
            if (state === "WAITING_AMOUNT") {
                const amount = parseInt(text);
                if (isNaN(amount)) {
                    await replyLineMessage(replyToken, [{ type: "text", text: "⚠️ 金額只能輸入數字喔！請重新輸入：" }]);
                    continue;
                }

                let tempRecord = userData.tempRecord || {};
                tempRecord.amount = amount;
                await userRef.update({ state: "WAITING_NOTE", tempRecord: tempRecord });
                
                await replyLineMessage(replyToken, [{
                    type: "text",
                    text: `金額：${amount} 元\n最後一步，請輸入「備註」：`,
                    quickReply: {
                        items: [{ type: "action", action: { type: "message", label: "⏭️ 無備註，直接送出", text: "無備註" } }]
                    }
                }]);
                continue;
            }

            // ==========================================
            // 階段 3：等待備註與最終儲存
            // ==========================================
            if (state === "WAITING_NOTE") {
                const note = text === "無備註" ? "" : text;
                const record = userData.tempRecord;
                const isGroup = record.type === "group";
                const collectionName = isGroup ? "records_group" : "records_personal";
                const userName = await getUserProfile(userId);

                const finalData = {
                    userId: userId,
                    userName: userName,
                    category: record.category,
                    amount: record.amount,
                    note: note,
                    timestamp: admin.firestore.FieldValue.serverTimestamp()
                };

                if (isGroup) finalData.groupId = userData.groupId;

                // 存入資料庫並清除暫存狀態
                await db.collection(collectionName).add(finalData);
                await userRef.update({ state: "IDLE", tempRecord: admin.firestore.FieldValue.delete() });

                // 組合成功訊息
                let successMsg = `✅ 記帳成功！\n────────────────\n`;
                successMsg += `📒 帳本：${isGroup ? '群組共用' : '個人專屬'}\n`;
                if (isGroup) successMsg += `👤 付款人：${userName}\n`;
                successMsg += `🏷️ 分類：${record.category}\n`;
                successMsg += `💵 金額：${record.amount} 元\n`;
                if (note) successMsg += `📝 備註：${note}\n`;

                await replyLineMessage(replyToken, [{ type: "text", text: successMsg }]);
                continue;
            }

        }
    }
    res.status(200).send("OK");
});