const functions = require("firebase-functions/v1");

const admin = require("firebase-admin");

const axios = require("axios");



admin.initializeApp();

const db = admin.firestore();



// 🔴 您的 LINE Channel Access Token

const LINE_TOKEN = "p6ugh27GDssmbdkmySR4Z/6QykwBCwpxyQzRvpjJqJAR8zGbTUH0MbhlsMYKAZFrcEWozoAXRflXW+z5P0+EWNPPgVXfjkeYAcFrRleCM3Spwdjsy43Af2S3yNwEoY+G8Us2LtzKXcMpjVQ8DnOovAdB04t89/1O/w1cDnyilFU=";



// 🔴 您的中央氣象署 API 授權碼 (請替換為您申請到的 Key)

const CWA_API_KEY = "CWA-ED31E7C6-7D1D-4E8D-A814-F8DF3E7BC3EF"; 



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



// =====================================================================

// 🌤️ 輔助函數：抓取氣象署即時天氣資訊與降雨機率判斷

// =====================================================================

async function getWeather(city) {

    try {

        // 處理「台」與「臺」的差異，讓搜尋更聰明

        const searchCity = city.replace(/台/g, '臺');

        

        // 呼叫氣象署 F-C0032-001 (一般天氣預報-今明 36 小時天氣預報)

        const url = `https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-C0032-001?Authorization=${CWA_API_KEY}`;

        const res = await axios.get(url);

        

        const locations = res.data.records.location;

        

        // 模糊比對縣市名稱 (輸入「台北」能對應到「臺北市」)

        const targetLocation = locations.find(loc => loc.locationName.includes(searchCity));



        if (!targetLocation) {

            return `❌ 找不到「${city}」的氣象資料。\n請輸入正確的台灣縣市名稱（例如：台北市、高雄天氣）。`;

        }



        const elements = targetLocation.weatherElement;

        

        // 抓取最近 12 小時的預報資料

        const wx = elements.find(e => e.elementName === 'Wx').time[0].parameter.parameterName; // 天氣現象

        const pop = parseInt(elements.find(e => e.elementName === 'PoP').time[0].parameter.parameterName); // 降雨機率

        const minT = elements.find(e => e.elementName === 'MinT').time[0].parameter.parameterName; // 最低溫

        const maxT = elements.find(e => e.elementName === 'MaxT').time[0].parameter.parameterName; // 最高溫

        const ci = elements.find(e => e.elementName === 'CI').time[0].parameter.parameterName; // 舒適度



        let msg = `📍 【${targetLocation.locationName}】近12小時天氣預報\n────────────────\n`;

        msg += `🌡️ 氣溫：${minT}°C ~ ${maxT}°C\n`;

        msg += `📝 狀況：${wx} (${ci})\n`;

        msg += `💧 降雨機率：${pop}%\n`;



        // 🌟 核心功能：降雨機率大於 30% 提醒帶雨具

        if (pop > 30) {

            msg += `\n☂️ 溫馨提醒：降雨機率偏高，出門記得攜帶雨具喔！`;

        } else {

            msg += `\n🌞 溫馨提醒：天氣不錯，祝您有美好的一天！`;

        }



        return msg;

    } catch (error) {

        console.error("氣象局 API 查詢失敗:", error.message);

        if (error.response && error.response.status === 401) {

            return "❌ 氣象署 API 授權失敗，請工程師檢查 API Key 設定。";

        }

        return `❌ 查詢天氣時發生錯誤，請稍後再試。`;

    }

}



// 輔助函數：撈出紀錄並讓使用者選擇刪除

async function fetchAndDeleteList(userId, scope, replyToken, userRef, groupId) {

    const colName = scope === "group" ? "records_group" : "records_personal";

    let query = db.collection(colName);

    if (scope === "group") query = query.where("groupId", "==", groupId);

    else query = query.where("userId", "==", userId);

    

    const snapshot = await query.orderBy("timestamp", "desc").limit(5).get();

    

    if (snapshot.empty) {

        await userRef.set({ state: "IDLE", tempRecord: admin.firestore.FieldValue.delete() }, { merge: true });

        await replyLineMessage(replyToken, [{ type: "text", text: "📭 您目前沒有任何紀錄可以刪除喔！" }]);

        return;

    }



    let msg = "請選擇要刪除的紀錄編號：\n────────────────\n";

    let candidates = [];

    let quickReplies = [];



    snapshot.forEach((doc, index) => {

        const data = doc.data();

        const typeStr = data.transactionType === "income" ? "📈 收入" : "📉 支出";

        msg += `${index + 1}. [${data.category}] ${data.amount}元 (${typeStr})\n`;

        candidates.push({ id: doc.id });

        quickReplies.push({ type: "action", action: { type: "message", label: `${index + 1}`, text: `${index + 1}` } });

    });

    quickReplies.push({ type: "action", action: { type: "message", label: "取消", text: "取消" } });



    await userRef.set({ 

        state: "WAITING_DELETE_TARGET", 

        tempRecord: { deleteCandidates: candidates, deleteScope: scope, deleteGroupId: groupId } 

    }, { merge: true });



    await replyLineMessage(replyToken, [{ type: "text", text: msg.trim(), quickReply: { items: quickReplies } }]);

}



// =====================================================================

// 🤖 核心：LINE 機器人 Webhook 接收與處理

// =====================================================================

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

            let userData = userDoc.exists ? userDoc.data() : { state: "IDLE" };

            let state = userData.state || "IDLE";



            // ---------------------------------------------------------

            // 【最高優先級指令】

            // ---------------------------------------------------------

            if (text === "取消") {

                await userRef.set({ state: "IDLE", tempRecord: admin.firestore.FieldValue.delete() }, { merge: true });

                await replyLineMessage(replyToken, [{ type: "text", text: "👌 已取消目前的動作。" }]);

                continue;

            }



            // 🌟 天氣查詢指令 (利用氣象署 API)

            if (text.endsWith("天氣")) {

                const city = text.replace("天氣", "").trim();

                

                if (city === "") {

                    await replyLineMessage(replyToken, [{ type: "text", text: "🌤️ 請輸入「縣市+天氣」來查詢喔！\n例如：台北天氣、宜蘭天氣" }]);

                } else {

                    const weatherInfo = await getWeather(city);

                    await replyLineMessage(replyToken, [{ type: "text", text: weatherInfo }]);

                }

                continue;

            }



            if (text === "官網" || text === "首頁" || text.toLowerCase() === "website") {

                await replyLineMessage(replyToken, [{

                    type: "text",

                    text: `🌐 歡迎訪問玉露寶庫官方網站：\nhttps://aiximerada.com\n\n您可以在這裡體驗更完整的星際帳務與社群功能喔！✨`

                }]);

                continue;

            }



            if (text === "看報表" || text === "報表") {

                const reportUrl = `https://yulubox.web.app/帳務.html`;

                await replyLineMessage(replyToken, [{

                    type: "text",

                    text: `📊 這是您的專屬帳務分析圖表：\n\n點擊下方連結立即查看：\n${reportUrl}`

                }]);

                continue;

            }



            if (text === "刪除" || text === "刪除紀錄") {

                const groupsSnap = await db.collection("groups").where("members", "array-contains", userId).get();

                if (!groupsSnap.empty) {

                    await userRef.set({ state: "WAITING_DELETE_SCOPE" }, { merge: true });

                    await replyLineMessage(replyToken, [{

                        type: "text",

                        text: "請問要刪除哪裡的紀錄？👇",

                        quickReply: { items: [

                            { type: "action", action: { type: "message", label: "🙋‍♂️ 個人", text: "刪除個人紀錄" } },

                            { type: "action", action: { type: "message", label: "👥 群組", text: "刪除群組紀錄" } }

                        ]}

                    }]);

                } else {

                    await fetchAndDeleteList(userId, "personal", replyToken, userRef, null);

                }

                continue;

            }



            // ---------------------------------------------------------

            // 【狀態機：接續上一步驟】

            // ---------------------------------------------------------

            if (state === "WAITING_DELETE_SCOPE") {

                if (text === "刪除個人紀錄") {

                    await fetchAndDeleteList(userId, "personal", replyToken, userRef, null);

                } else if (text === "刪除群組紀錄") {

                    const groupsSnap = await db.collection("groups").where("members", "array-contains", userId).get();

                    if(!groupsSnap.empty) {

                        const groupId = groupsSnap.docs[0].id;

                        await fetchAndDeleteList(userId, "group", replyToken, userRef, groupId);

                    }

                } else {

                    await replyLineMessage(replyToken, [{ type: "text", text: "⚠️ 請點擊下方按鈕選擇，或輸入「取消」" }]);

                }

                continue;

            }



            if (state === "WAITING_DELETE_TARGET") {

                const idx = parseInt(text) - 1;

                const candidates = userData.tempRecord?.deleteCandidates || [];

                const scope = userData.tempRecord?.deleteScope;

                

                if (isNaN(idx) || idx < 0 || idx >= candidates.length) {

                    await replyLineMessage(replyToken, [{ type: "text", text: "⚠️ 請輸入正確的編號 (例如: 1) 或點擊「取消」" }]);

                    continue;

                }



                const docId = candidates[idx].id;

                const colName = scope === "group" ? "records_group" : "records_personal";

                

                await db.collection(colName).doc(docId).delete();

                await userRef.set({ state: "IDLE", tempRecord: admin.firestore.FieldValue.delete() }, { merge: true });

                await replyLineMessage(replyToken, [{ type: "text", text: `✅ 垃圾桶運作中！已成功為您刪除該筆紀錄。` }]);

                continue;

            }



            // --- 記帳流程 ---

            if (text === "個人記帳" || text === "群組記帳") {

                const isGroup = text === "群組記帳";

                let groupId = null;



                if (isGroup) {

                    const groupsSnap = await db.collection("groups").where("members", "array-contains", userId).get();

                    if (groupsSnap.empty) {

                        await replyLineMessage(replyToken, [{ type: "text", text: "⚠️ 您目前沒有加入任何群組喔！請至「看報表」網頁中新增群組。" }]);

                        continue;

                    }

                    groupId = groupsSnap.docs[0].id; 

                }



                await userRef.set({ 

                    state: "WAITING_TRANSACTION_TYPE",

                    tempRecord: { account: isGroup ? "group" : "personal", targetGroupId: groupId }

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

                    text: `您選擇了【${text}】\n請選擇資金分類：`,

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



                if (isGroup) finalData.groupId = record.targetGroupId;



                await db.collection(collectionName).add(finalData);

                await userRef.set({ state: "IDLE", tempRecord: admin.firestore.FieldValue.delete() }, { merge: true });



                let successMsg = `✅ 記帳成功！\n────────────────\n`;

                successMsg += `📒 帳本：${isGroup ? '群組共用' : '個人專屬'}\n`;

                if (isGroup) successMsg += `👤 記錄人：${userName}\n`;

                successMsg += `🔄 類型：${isIncome ? '📈 收入' : '📉 支出'}\n`;

                successMsg += `🏷️ 分類：${record.category}\n`;

                successMsg += `💵 金額：${record.amount} 元\n`;

                if (note) successMsg += `📝 備註：${note}\n`;



                await replyLineMessage(replyToken, [{ type: "text", text: successMsg }]);

                continue;

            }



            // ---------------------------------------------------------

            // 【模糊觸發：IDLE 狀態下偵測關鍵字】

            // ---------------------------------------------------------

            if (state === "IDLE") {

                const triggerWords = ["記", "帳", "賬", "錢", "買", "支", "收", "資"];

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



// =====================================================================

// 🤖 定時任務：每月 1 號早上 9 點自動發送 LINE 月報表與年報表

// =====================================================================

exports.autoSendReports = functions.region("asia-east1").pubsub.schedule("0 9 1 * *").timeZone("Asia/Taipei").onRun(async (context) => {

    try {

        const today = new Date();

        const isJan1st = (today.getMonth() === 0); 



        const lastMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);

        const reportYear = lastMonthDate.getFullYear();

        const reportMonth = lastMonthDate.getMonth() + 1;



        const reportUrl = `https://yulubox.web.app/帳務.html`; 



        const usersSnap = await db.collection("users").get();

        for (const userDoc of usersSnap.docs) {

            const userData = userDoc.data();

            const lineUserId = userData.lineUserId;

            if (!lineUserId) continue;



            let messages = [];



            if (userData.monthReportNotify) {

                messages.push({

                    type: "text",

                    text: `📊 【玉露寶庫】月報表通知\n\n上個月 (${reportYear}年${reportMonth}月) 的個人帳務結算已經完成囉！\n\n👉 點擊下方連結查看詳細收支與圖表分析：\n${reportUrl}`

                });

            }



            if (isJan1st && userData.yearReportNotify) {

                const lastYear = today.getFullYear() - 1;

                messages.push({

                    type: "text",

                    text: `🎉 【玉露寶庫】年度總結報表\n\n${lastYear} 年辛苦了！您去年的年度財務總結已經出爐。\n\n👉 點擊下方連結回顧去年的財務點滴：\n${reportUrl}`

                });

            }



            if (messages.length > 0) {

                try {

                    await axios.post('https://api.line.me/v2/bot/message/push', {

                        to: lineUserId,

                        messages: messages

                    }, { headers: { 'Authorization': `Bearer ${LINE_TOKEN}` } });

                } catch (err) { console.error("個人報表發送失敗:", err.message); }

            }

        }



        const groupsSnap = await db.collection("groups").get();

        for (const groupDoc of groupsSnap.docs) {

            const groupData = groupDoc.data();

            const members = groupData.members || [];

            if (members.length === 0) continue;



            let messages = [];



            if (groupData.monthReportNotify) {

                messages.push({

                    type: "text",

                    text: `📊 【${groupData.name}】群組月報表\n\n上個月 (${reportYear}年${reportMonth}月) 的群組公積金結算已完成！\n\n👉 點擊下方連結查看：\n${reportUrl}`

                });

            }



            if (isJan1st && groupData.yearReportNotify) {

                const lastYear = today.getFullYear() - 1;

                messages.push({

                    type: "text",

                    text: `🎉 【${groupData.name}】年度總結\n\n${lastYear} 年的群組財務總結出爐囉！\n\n👉 點擊連結查看：\n${reportUrl}`

                });

            }



            if (messages.length > 0) {

                for (const memberLineId of members) {

                    try {

                        await axios.post('https://api.line.me/v2/bot/message/push', {

                            to: memberLineId,

                            messages: messages

                        }, { headers: { 'Authorization': `Bearer ${LINE_TOKEN}` } });

                    } catch (err) { console.error("群組報表發送失敗:", err.message); }

                }

            }

        }

        

        console.log("✅ 報表自動派發任務執行完畢！");

        return null;

    } catch (error) {

        console.error("執行定時任務發生錯誤:", error);

    }

});