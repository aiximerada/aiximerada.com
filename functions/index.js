const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");
const axios = require("axios");

admin.initializeApp();
const db = admin.firestore();

// 🔴 您的 LINE Channel Access Token
const LINE_TOKEN = "p6ugh27GDssmbdkmySR4Z/6QykwBCwpxyQzRvpjJqJAR8zGbTUH0MbhlsMYKAZFrcEWozoAXRflXW+z5P0+EWNPPgVXfjkeYAcFrRleCM3Spwdjsy43Af2S3yNwEoY+G8Us2LtzKXcMpjVQ8DnOovAdB04t89/1O/w1cDnyilFU=";

const DEFAULT_EXPENSE_CATEGORIES = ["🥞 早餐", "🍱 午餐", "🍜 晚餐", "🚌 交通", "🧻 日用品"];
const DEFAULT_INCOME_CATEGORIES = ["💰 薪資", "📈 投資", "😎 不法所得"];

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

            // 1. 讀取使用者狀態 (加入防呆機制，若無資料則預設為 IDLE)
            const userRef = db.collection("users").doc(userId);
            const userDoc = await userRef.get();
            let userData = userDoc.exists ? userDoc.data() : { state: "IDLE" };
            let state = userData.state || "IDLE";

            // ==========================================
            // 【最高優先級】：全域指令與按鈕精確攔截
            // ==========================================

            if (text === "取消") {
                await userRef.set({ state: "IDLE", tempRecord: admin.firestore.FieldValue.delete() }, { merge: true });
                await replyLineMessage(replyToken, [{ type: "text", text: "👌 已取消目前的動作。" }]);
                continue;
            }

            if (text.startsWith("創建群組")) {
                const groupName = text.replace("創建群組", "").trim() || "未命名群組";
                const inviteCode = Math.floor(100000 + Math.random() * 900000).toString();
                await db.collection("groups").doc(inviteCode).set({
                    name: groupName, owner: userId, members: [userId], createdAt: admin.firestore.FieldValue.serverTimestamp()
                });
                await userRef.set({ groupId: inviteCode }, { merge: true });
                await replyLineMessage(replyToken, [{ type: "text", text: `✅ 群組【${groupName}】創建成功！\n邀請碼：${inviteCode}` }]);
                continue;
            }

            if (text.startsWith("加入群組")) {
                const code = text.replace("加入群組", "").trim();
                const groupRef = db.collection("groups").doc(code);
                const groupDoc = await groupRef.get();
                if (groupDoc.exists()) {
                    await groupRef.update({ members: admin.firestore.FieldValue.arrayUnion(userId) });
                    await userRef.set({ groupId: code }, { merge: true });
                    await replyLineMessage(replyToken, [{ type: "text", text: `🎉 成功加入群組【${groupDoc.data().name}】！` }]);
                } else {
                    await replyLineMessage(replyToken, [{ type: "text", text: "❌ 找不到該邀請碼。" }]);
                }
                continue;
            }

            // 🌟 解決無限迴圈的關鍵：只要按了「個人/群組」按鈕，強制進入收支選擇，不再比對模糊字
            if (text === "個人記帳" || text === "群組記帳") {
                const isGroup = text === "群組記帳";
                if (isGroup && !userData.groupId) {
                    await replyLineMessage(replyToken, [{ type: "text", text: "⚠️ 您尚未加入群組，請先輸入「創建群組 (名稱)」。" }]);
                    continue;
                }

                await userRef.set({ 
                    state: "WAITING_TRANSACTION_TYPE",
                    tempRecord: { account: isGroup ? "group" : "personal" }
                }, { merge: true });

                await replyLineMessage(replyToken, [{
                    type: "text",
                    text: `您選擇了【${isGroup ? '群組' : '個人'}】\n\n請問這是「資金增加(收入)」還是「資金扣除(支出)」？`,
                    quickReply: {
                        items: [
                            { type: "action", action: { type: "message", label: "📉 支出", text: "支出" } },
                            { type: "action", action: { type: "message", label: "📈 收入", text: "收入" } }
                        ]
                    }
                }]);
                continue;
            }

            // ==========================================
            // 【狀態機】：依照上一個步驟的進度繼續
            // ==========================================

            if (state === "WAITING_TRANSACTION_TYPE") {
                if (text !== "支出" && text !== "收入") {
                    await replyLineMessage(replyToken, [{ type: "text", text: "⚠️ 請點擊下方按鈕選擇「支出」或「收入」：" }]);
                    continue;
                }

                const isIncome = text === "收入";
                let tempRecord = userData.tempRecord || {};
                tempRecord.type = isIncome ? "income" : "expense";

                const defaultCats = isIncome ? DEFAULT_INCOME_CATEGORIES : DEFAULT_EXPENSE_CATEGORIES;
                const customCats = isIncome ? (userData.customIncomeCategories || []) : (userData.customExpenseCategories || []);
                let allCats = [...defaultCats, ...customCats].slice(0, 12);
                
                const quickReplyItems = allCats.map(c => ({
                    type: "action", action: { type: "message", label: c, text: c }
                }));
                quickReplyItems.push({ type: "action", action: { type: "message", label: "➕ 其他(自訂)", text: "其他" } });

                await userRef.set({ state: "WAITING_CATEGORY", tempRecord: tempRecord }, { merge: true });
                await replyLineMessage(replyToken, [{
                    type: "text",
                    text: `您選擇了【${text}】\n請選擇資金${isIncome ? '來源' : '去向'}分類：`,
                    quickReply: { items: quickReplyItems }
                }]);
                continue;
            }

            if (state === "WAITING_CATEGORY") {
                if (text === "其他") {
                    await userRef.set({ state: "WAITING_CUSTOM_CATEGORY" }, { merge: true });
                    await replyLineMessage(replyToken, [{ type: "text", text: "請輸入您的「自訂分類名稱」：\n(下次記帳時會自動出現這顆按鈕喔！)" }]);
                    continue;
                }

                let tempRecord = userData.tempRecord || {};
                tempRecord.category = text;
                await userRef.set({ state: "WAITING_AMOUNT", tempRecord: tempRecord }, { merge: true });
                await replyLineMessage(replyToken, [{ type: "text", text: `分類：${text}\n請輸入「金額」：` }]);
                continue;
            }

            if (state === "WAITING_CUSTOM_CATEGORY") {
                const newCategory = text;
                let tempRecord = userData.tempRecord || {};
                tempRecord.category = newCategory;
                
                const updateField = tempRecord.type === "income" ? "customIncomeCategories" : "customExpenseCategories";
                await userRef.set({ 
                    state: "WAITING_AMOUNT", 
                    tempRecord: tempRecord,
                    [updateField]: admin.firestore.FieldValue.arrayUnion(newCategory)
                }, { merge: true });
                await replyLineMessage(replyToken, [{ type: "text", text: `已新增分類：${newCategory}\n請輸入「金額」：` }]);
                continue;
            }

            if (state === "WAITING_AMOUNT") {
                const amount = parseInt(text);
                if (isNaN(amount) || amount <= 0) {
                    await replyLineMessage(replyToken, [{ type: "text", text: "⚠️ 金額只能輸入大於0的數字喔！請重新輸入：" }]);
                    continue;
                }

                let tempRecord = userData.tempRecord || {};
                tempRecord.amount = amount;
                await userRef.set({ state: "WAITING_NOTE", tempRecord: tempRecord }, { merge: true });
                await replyLineMessage(replyToken, [{
                    type: "text",
                    text: `金額：${amount} 元\n最後一步，請輸入「備註」：`,
                    quickReply: { items: [{ type: "action", action: { type: "message", label: "⏭️ 無備註", text: "無備註" } }] }
                }]);
                continue;
            }

            if (state === "WAITING_NOTE") {
                const note = text === "無備註" ? "" : text;
                const record = userData.tempRecord;
                const isGroup = record.account === "group";
                const isIncome = record.type === "income";
                const collectionName = isGroup ? "records_group" : "records_personal";
                const userName = await getUserProfile(userId);

                const finalData = {
                    userId: userId,
                    userName: userName,
                    transactionType: record.type,
                    category: record.category,
                    amount: record.amount,
                    note: note,
                    timestamp: admin.firestore.FieldValue.serverTimestamp()
                };

                if (isGroup) finalData.groupId = userData.groupId;

                await db.collection(collectionName).add(finalData);
                await userRef.set({ state: "IDLE", tempRecord: admin.firestore.FieldValue.delete() }, { merge: true });

                let successMsg = `✅ 記帳成功！\n────────────────\n`;
                successMsg += `📒 帳本：${isGroup ? '群組共用' : '個人專屬'}\n`;
                if (isGroup) successMsg += `👤 記錄人：${userName}\n`;
                successMsg += `🔄 類型：${isIncome ? '📈 新增資金 (收入)' : '📉 扣除資金 (支出)'}\n`;
                successMsg += `🏷️ 分類：${record.category}\n`;
                successMsg += `💵 金額：${record.amount} 元\n`;
                if (note) successMsg += `📝 備註：${note}\n`;

                await replyLineMessage(replyToken, [{ type: "text", text: successMsg }]);
                continue;
            }

            // ==========================================
            // 【最低優先級】：模糊觸發 (只有閒置時才觸發)
            // ==========================================

            if (state === "IDLE") {
                const triggerWords = ["記", "帳", "賬", "報", "錢", "買", "支", "收", "資"];
                const isTypingAmount = !isNaN(parseInt(text[0]));
                
                if (triggerWords.some(w => text.includes(w)) || isTypingAmount) {
                    await replyLineMessage(replyToken, [{
                        type: "text",
                        text: "請問這筆帳要記在哪裡呢？👇",
                        quickReply: {
                            items: [
                                { type: "action", action: { type: "message", label: "🙋‍♂️ 個人", text: "個人記帳" } },
                                { type: "action", action: { type: "message", label: "👥 群組", text: "群組記帳" } }
                            ]
                        }
                    }]);
                }
            }

        }
    }
    res.status(200).send("OK");
});