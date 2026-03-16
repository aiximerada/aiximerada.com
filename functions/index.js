const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");
const axios = require("axios");

admin.initializeApp();
const db = admin.firestore();

// 🔴 您的 LINE Channel Access Token
const LINE_TOKEN = "p6ugh27GDssmbdkmySR4Z/6QykwBCwpxyQzRvpjJqJAR8zGbTUH0MbhlsMYKAZFrcEWozoAXRflXW+z5P0+EWNPPgVXfjkeYAcFrRleCM3Spwdjsy43Af2S3yNwEoY+G8Us2LtzKXcMpjVQ8DnOovAdB04t89/1O/w1cDnyilFU=";

// 🔴 您的中央氣象署 API 授權碼
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
        return res.data.displayName || "神祕旅行者";
    } catch (e) { return "玉露會員"; }
}

// =====================================================================
// 📍 輔助函數：計算兩個經緯度之間的距離 (Haversine 公式，單位：公里)
// =====================================================================
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; 
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    return R * c; 
}

// =====================================================================
// 🗺️ 輔助函數：產生車位推薦的 LINE Flex Message (滑動卡片)
// =====================================================================
function generateParkingFlexMessage(spots, altText) {
    const bubbles = spots.map(spot => {
        const distanceText = spot.distance ? `${spot.distance.toFixed(1)} km` : spot.city;
        // 若沒附照片，給一張預設的重機/停車場意象圖
        const fallbackImage = "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?q=80&w=800&auto=format&fit=crop";

        return {
            "type": "bubble",
            "hero": {
                "type": "image",
                "url": spot.image_url || fallbackImage,
                "size": "full",
                "aspectRatio": "20:13",
                "aspectMode": "cover"
            },
            "body": {
                "type": "box",
                "layout": "vertical",
                "contents": [
                    { "type": "text", "text": spot.name || "未命名車位", "weight": "bold", "size": "xl", "wrap": true },
                    { "type": "text", "text": `📍 ${spot.address}`, "size": "sm", "color": "#888888", "wrap": true, "margin": "md" },
                    { "type": "text", "text": `💰 ${spot.price || '未提供'}`, "size": "sm", "color": "#06C755", "weight": "bold", "margin": "sm" },
                    { "type": "text", "text": `🛵 距離/區域：${distanceText}`, "size": "xs", "color": "#f59e0b", "margin": "sm" },
                    { "type": "text", "text": `📝 ${spot.note || '無備註'}`, "size": "xs", "color": "#aaaaaa", "wrap": true, "margin": "sm" }
                ]
            },
            "footer": {
                "type": "box",
                "layout": "vertical",
                "contents": [
                    {
                        "type": "button",
                        "style": "primary",
                        "color": "#0f172a",
                        "action": {
                            "type": "uri",
                            "label": "📍 導航前往",
                            "uri": spot.gmap || `https://www.google.com/maps/search/?api=1&query=${spot.lat},${spot.lng}`
                        }
                    }
                ]
            }
        };
    });

    return {
        "type": "flex",
        "altText": altText,
        "contents": {
            "type": "carousel",
            "contents": bubbles
        }
    };
}

// =====================================================================
// 🚫 輔助函數：產生「找不到車位」並附帶回報按鈕的 Flex Message
// =====================================================================
function generateNotFoundFlexMessage(title, description) {
    return {
        "type": "flex",
        "altText": title,
        "contents": {
            "type": "bubble",
            "body": {
                "type": "box",
                "layout": "vertical",
                "contents": [
                    { "type": "text", "text": title, "weight": "bold", "size": "xl", "color": "#ff4757", "wrap": true },
                    { "type": "text", "text": description, "wrap": true, "margin": "md", "color": "#888888" }
                ]
            },
            "footer": {
                "type": "box",
                "layout": "vertical",
                "contents": [
                    {
                        "type": "button",
                        "style": "primary",
                        "color": "#bc13fe",
                        "action": {
                            "type": "uri",
                            "label": "📍 立即回報車位",
                            "uri": encodeURI("https://yulubox.web.app/車位回報.html")
                        }
                    }
                ]
            }
        }
    };
}

// =====================================================================
// 🌤️ 輔助函數：抓取氣象署即時天氣資訊與降雨機率判斷
// =====================================================================
async function getWeather(city) {
    try {
        const searchCity = city.replace(/台/g, '臺');
        const url = `https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-C0032-001?Authorization=${CWA_API_KEY}`;
        const res = await axios.get(url);
        
        const locations = res.data.records.location;
        const targetLocation = locations.find(loc => loc.locationName.includes(searchCity));

        if (!targetLocation) {
            return `❌ 觀測系統找不到「${city}」的氣象資料。\n請輸入正確的台灣縣市名稱（例如：台北市、高雄天氣）。`;
        }

        const elements = targetLocation.weatherElement;
        const wx = elements.find(e => e.elementName === 'Wx').time[0].parameter.parameterName; 
        const pop = parseInt(elements.find(e => e.elementName === 'PoP').time[0].parameter.parameterName); 
        const minT = elements.find(e => e.elementName === 'MinT').time[0].parameter.parameterName; 
        const maxT = elements.find(e => e.elementName === 'MaxT').time[0].parameter.parameterName; 
        const ci = elements.find(e => e.elementName === 'CI').time[0].parameter.parameterName; 

        let msg = `🛰️ 【玉露氣象觀測站：${targetLocation.locationName}】\n📝 未來12小時星區預報\n────────────────\n`;
        msg += `🌡️ 氣溫：${minT}°C ~ ${maxT}°C\n`;
        msg += `🌤️ 狀況：${wx} (${ci})\n`;
        msg += `💧 降雨機率：${pop}%\n`;

        if (pop > 30) {
            msg += `\n☂️ 系統溫馨提醒：降雨機率偏高，外出探索請務必攜帶雨具喔！`;
        } else {
            msg += `\n✨ 系統溫馨提醒：天氣狀況良好，祝您有一趟美好的旅程！`;
        }

        return msg;
    } catch (error) {
        console.error("氣象局 API 查詢失敗:", error.message);
        return `❌ 氣象觀測連線中斷，請稍後再試。`;
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
        await replyLineMessage(replyToken, [{ type: "text", text: "📭 目前資料庫中沒有可刪除的近期紀錄喔！" }]);
        return;
    }

    let msg = "🗑️ 【刪除程序啟動】\n請選擇您要抹除的紀錄編號：\n────────────────\n";
    let candidates = [];
    let quickReplies = [];

    snapshot.forEach((doc, index) => {
        const data = doc.data();
        const typeStr = data.transactionType === "income" ? "📈 收入" : "📉 支出";
        msg += `[ ${index + 1} ] ${data.category}：${data.amount}元 (${typeStr})\n`;
        candidates.push({ id: doc.id });
        quickReplies.push({ type: "action", action: { type: "message", label: `刪除 ${index + 1}`, text: `${index + 1}` } });
    });
    quickReplies.push({ type: "action", action: { type: "message", label: "🚫 取消", text: "取消" } });

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
        // ---------------------------------------------------------
        // 【處理：傳送位置資訊 Location Message】尋找附近車位
        // ---------------------------------------------------------
        if (event.type === "message" && event.message.type === "location") {
            const userLat = event.message.latitude;
            const userLng = event.message.longitude;
            const replyToken = event.replyToken;

            try {
                // 撈出所有已經被管理員「核准(approved)」的車位
                const snapshot = await db.collection('parking_locations').where('status', '==', 'approved').get();
                let nearbySpots = [];

                snapshot.forEach(doc => {
                    const spot = doc.data();
                    if (spot.lat && spot.lng) {
                        const distance = calculateDistance(userLat, userLng, spot.lat, spot.lng);
                        // 🔥 過濾出半徑 5 公里內的車位
                        if (distance <= 5) {
                            nearbySpots.push({ ...spot, distance: distance });
                        }
                    }
                });

                if (nearbySpots.length === 0) {
                    // 🔥 附近找不到車位時，顯示自訂的引導按鈕卡片
                    const notFoundMsg = generateNotFoundFlexMessage(
                        "😭 附近查無車位", 
                        "方圓 5 公里內，目前還沒有熱心車友回報的重機車位情報。\n\n點擊下方按鈕，成為第一位貢獻者吧！"
                    );
                    await replyLineMessage(replyToken, [notFoundMsg]);
                    continue;
                }

                // 依照距離由近到遠排序，並取前 5 名
                nearbySpots.sort((a, b) => a.distance - b.distance);
                const topSpots = nearbySpots.slice(0, 5);

                const flexMessage = generateParkingFlexMessage(topSpots, "為您找到附近的重機車位");
                await replyLineMessage(replyToken, [flexMessage]);

            } catch (err) {
                console.error("位置搜尋車位失敗:", err);
                await replyLineMessage(replyToken, [{ type: "text", text: "系統資料庫讀取失敗，請稍後再試。" }]);
            }
            continue;
        }

        // ---------------------------------------------------------
        // 【處理：一般文字訊息 Text Message】
        // ---------------------------------------------------------
        if (event.type === "message" && event.message.type === "text") {
            const userId = event.source.userId;
            const text = event.message.text.trim();
            const replyToken = event.replyToken;

            const userRef = db.collection("users").doc(userId);
            const userDoc = await userRef.get();
            let userData = userDoc.exists ? userDoc.data() : { state: "IDLE" };
            let state = userData.state || "IDLE";

            // 【最高優先級指令】
            if (text === "取消") {
                await userRef.set({ state: "IDLE", tempRecord: admin.firestore.FieldValue.delete() }, { merge: true });
                await replyLineMessage(replyToken, [{ type: "text", text: "👌 系統已終止目前的操作程序。" }]);
                continue;
            }

            // 🌟 關鍵字：找特定縣市的重機車位
            if (text.endsWith("車位")) {
                let city = text.replace("車位", "").trim();
                
                if (city === "") {
                    await replyLineMessage(replyToken, [{ type: "text", text: "🏍️ 尋找車位指令錯誤！\n\n1️⃣ 搜尋特定縣市：請輸入「縣市+車位」（例如：台北市車位、台中車位）\n\n2️⃣ 搜尋附近車位：請直接點擊左下角「+」，傳送您的「位置資訊」給我！" }]);
                } else {
                    try {
                        // 修正容錯：如果使用者只打「台北」，自動補上「市」去尋找
                        const searchCity = (city.includes("市") || city.includes("縣")) ? city : city + "市";

                        const snapshot = await db.collection('parking_locations')
                            .where('status', '==', 'approved')
                            // 簡易的模糊搜尋 (前綴搜尋)
                            .where('city', '>=', searchCity)
                            .where('city', '<=', searchCity + '\uf8ff')
                            .limit(5)
                            .get();

                        if (snapshot.empty) {
                            // 🔥 該縣市找不到車位時，顯示自訂的引導按鈕卡片
                            const notFoundMsg = generateNotFoundFlexMessage(
                                `😭 查無【${searchCity}】車位`, 
                                `目前系統中尚未有【${searchCity}】的重機車位情報。\n\n點擊下方按鈕，貢獻您的私房車位吧！`
                            );
                            await replyLineMessage(replyToken, [notFoundMsg]);
                        } else {
                            let spots = [];
                            snapshot.forEach(doc => spots.push(doc.data()));
                            const flexMessage = generateParkingFlexMessage(spots, `為您找到【${searchCity}】的推薦車位`);
                            await replyLineMessage(replyToken, [flexMessage]);
                        }
                    } catch (err) {
                        console.error("縣市搜尋車位失敗:", err);
                    }
                }
                continue;
            }

            // 🌟 天氣查詢指令
            if (text.endsWith("天氣")) {
                const city = text.replace("天氣", "").trim();
                if (city === "") {
                    await replyLineMessage(replyToken, [{ type: "text", text: "🌤️ 請輸入「縣市+天氣」來啟動觀測！\n例如：台北天氣、宜蘭天氣" }]);
                } else {
                    const weatherInfo = await getWeather(city);
                    await replyLineMessage(replyToken, [{ type: "text", text: weatherInfo }]);
                }
                continue;
            }

            if (text === "官網" || text === "首頁" || text.toLowerCase() === "website") {
                await replyLineMessage(replyToken, [{
                    type: "text",
                    text: `🚀 【啟動星際傳送門】\n歡迎登入玉露寶庫會員中心！\n\n👉 點擊連結前往：\nhttps://aiximerada.com\n\n您可以在此管理您的專屬設定、體驗完整星際帳務與社群功能。✨`
                }]);
                continue;
            }

            if (text === "看報表" || text === "報表") {
                const reportUrl = `https://yulubox.web.app/帳務.html`;
                await replyLineMessage(replyToken, [{
                    type: "text",
                    text: `📊 【個人星際帳務中樞】\n為您調閱最新的財務分析圖表：\n\n👉 點擊連結立即查看：\n${reportUrl}`
                }]);
                continue;
            }

            if (text === "刪除" || text === "刪除紀錄") {
                const groupsSnap = await db.collection("groups").where("members", "array-contains", userId).get();
                if (!groupsSnap.empty) {
                    await userRef.set({ state: "WAITING_DELETE_SCOPE" }, { merge: true });
                    await replyLineMessage(replyToken, [{
                        type: "text",
                        text: "🗑️ 請問您要調閱哪一個帳本來進行刪除？👇",
                        quickReply: { items: [
                            { type: "action", action: { type: "message", label: "🙋‍♂️ 個人帳本", text: "刪除個人紀錄" } },
                            { type: "action", action: { type: "message", label: "👥 群組帳本", text: "刪除群組紀錄" } }
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
                    await replyLineMessage(replyToken, [{ type: "text", text: "⚠️ 系統無法辨識。請點擊下方按鈕選擇，或輸入「取消」終止程序。" }]);
                }
                continue;
            }

            if (state === "WAITING_DELETE_TARGET") {
                const idx = parseInt(text) - 1;
                const candidates = userData.tempRecord?.deleteCandidates || [];
                const scope = userData.tempRecord?.deleteScope;
                
                if (isNaN(idx) || idx < 0 || idx >= candidates.length) {
                    await replyLineMessage(replyToken, [{ type: "text", text: "⚠️ 找不到該編號的紀錄，請輸入正確的數字 (例如: 1) 或輸入「取消」。" }]);
                    continue;
                }

                const docId = candidates[idx].id;
                const colName = scope === "group" ? "records_group" : "records_personal";
                
                await db.collection(colName).doc(docId).delete();
                await userRef.set({ state: "IDLE", tempRecord: admin.firestore.FieldValue.delete() }, { merge: true });
                await replyLineMessage(replyToken, [{ type: "text", text: `✅ 抹除完成！該筆紀錄已從玉露寶庫中徹底移除。` }]);
                continue;
            }

            // --- 記帳流程 ---
            if (text === "個人記帳" || text === "群組記帳") {
                const isGroup = text === "群組記帳";
                let groupId = null;

                if (isGroup) {
                    const groupsSnap = await db.collection("groups").where("members", "array-contains", userId).get();
                    if (groupsSnap.empty) {
                        await replyLineMessage(replyToken, [{ type: "text", text: "⚠️ 您目前尚未連結任何群組喔！請先至「會員中心/報表」網頁中新增群組。" }]);
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
                    text: `💳 已鎖定【${isGroup ? '群組公積金' : '個人帳本'}】\n\n請指示這筆資金的流向：是「獲得資金(收入)」還是「消耗資金(支出)」？`,
                    quickReply: {
                        items: [
                            { type: "action", action: { type: "message", label: "📉 支出", text: "支出" } },
                            { type: "action", action: { type: "message", label: "📈 收入", text: "收入" } },
                            { type: "action", action: { type: "message", label: "🚫 取消", text: "取消" } }
                        ]
                    }
                }]);
                continue;
            }

            if (state === "WAITING_TRANSACTION_TYPE") {
                if (text !== "支出" && text !== "收入") {
                    await replyLineMessage(replyToken, [{ type: "text", text: "⚠️ 系統需要明確的指示，請點擊下方按鈕選擇「支出」或「收入」：" }]);
                    continue;
                }

                const isIncome = text === "收入";
                let tempRecord = userData.tempRecord || {};
                tempRecord.type = isIncome ? "income" : "expense";

                const defaultCats = isIncome ? DEFAULT_INCOME_CATEGORIES : DEFAULT_EXPENSE_CATEGORIES;
                const customCats = isIncome ? (userData.customIncomeCategories || []) : (userData.customExpenseCategories || []);
                let allCats = [...defaultCats, ...customCats].slice(0, 11); // 預留一個給自訂
                
                const quickReplyItems = allCats.map(c => ({
                    type: "action", action: { type: "message", label: c, text: c }
                }));
                quickReplyItems.push({ type: "action", action: { type: "message", label: "➕ 新增自訂分類", text: "其他" } });

                await userRef.set({ state: "WAITING_CATEGORY", tempRecord: tempRecord }, { merge: true });
                await replyLineMessage(replyToken, [{
                    type: "text",
                    text: `流向：【${text}】\n請選擇這筆資金的「分類屬性」：👇`,
                    quickReply: { items: quickReplyItems }
                }]);
                continue;
            }

            if (state === "WAITING_CATEGORY") {
                if (text === "其他") {
                    await userRef.set({ state: "WAITING_CUSTOM_CATEGORY" }, { merge: true });
                    await replyLineMessage(replyToken, [{ type: "text", text: "✏️ 請直接輸入您的「自訂分類名稱」：\n(系統會自動記憶，下次記帳時就能直接點選喔！)" }]);
                    continue;
                }

                let tempRecord = userData.tempRecord || {};
                tempRecord.category = text;
                await userRef.set({ state: "WAITING_AMOUNT", tempRecord: tempRecord }, { merge: true });
                await replyLineMessage(replyToken, [{ type: "text", text: `🏷️ 分類已設定為：【${text}】\n\n請輸入具體的「金額數字」：\n(僅限輸入大於0的阿拉伯數字)` }]);
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
                await replyLineMessage(replyToken, [{ type: "text", text: `🏷️ 已將【${newCategory}】加入您的專屬分類。\n\n接下來，請輸入「金額數字」：` }]);
                continue;
            }

            if (state === "WAITING_AMOUNT") {
                const amount = parseInt(text);
                if (isNaN(amount) || amount <= 0) {
                    await replyLineMessage(replyToken, [{ type: "text", text: "⚠️ 資金數值異常。金額只能輸入大於 0 的有效數字喔！請重新輸入：" }]);
                    continue;
                }

                let tempRecord = userData.tempRecord || {};
                tempRecord.amount = amount;
                await userRef.set({ state: "WAITING_NOTE", tempRecord: tempRecord }, { merge: true });
                await replyLineMessage(replyToken, [{
                    type: "text",
                    text: `💰 金額：${amount} 元\n\n最後一步，請為這筆紀錄輸入「備註」：\n(若無備註需求，請點擊下方按鈕跳過)`,
                    quickReply: { items: [{ type: "action", action: { type: "message", label: "⏭️ 略過備註", text: "無備註" } }] }
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

                let successMsg = `✅ 紀錄已成功同步至玉露寶庫！\n═ ═ ═ ═ ═ ═ ═ ═ ═ ═\n`;
                successMsg += `📒 帳本：${isGroup ? '👥 群組共用' : '🙋‍♂️ 個人專屬'}\n`;
                if (isGroup) successMsg += `👤 成員：${userName}\n`;
                successMsg += `🏷️ 分類：${record.category} (${isIncome ? '📈 收入' : '📉 支出'})\n`;
                successMsg += `💰 金額：$ ${record.amount}\n`;
                if (note) successMsg += `📝 備註：${note}\n`;
                successMsg += `═ ═ ═ ═ ═ ═ ═ ═ ═ ═`;

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
                        text: "✨ 偵測到帳務紀錄需求！\n請選擇要將這筆資金寫入哪一個帳本？👇",
                        quickReply: {
                            items: [
                                { type: "action", action: { type: "message", label: "🙋‍♂️ 個人帳本", text: "個人記帳" } },
                                { type: "action", action: { type: "message", label: "👥 群組帳本", text: "群組記帳" } }
                            ]
                        }
                    }]);
                    continue; 
                }

                // 當系統完全找不到對應的指令時，發送「防呆導航選單」
                await replyLineMessage(replyToken, [{
                    type: "text",
                    text: "🤖 系統無法辨識您的指令喔！\n\n您可以傳送「📍位置資訊」給我尋找附近車位，或直接點擊下方的快捷按鈕：👇",
                    quickReply: {
                        items: [
                            { type: "action", action: { type: "message", label: "✍️ 開始記帳", text: "個人記帳" } },
                            { type: "action", action: { type: "message", label: "📊 帳務報表", text: "看報表" } },
                            { type: "action", action: { type: "message", label: "🏍️ 找車位 (範例)", text: "台北市車位" } },
                            { type: "action", action: { type: "message", label: "🌤️ 查天氣 (範例)", text: "台北天氣" } },
                            { type: "action", action: { type: "message", label: "🌐 會員專區", text: "官網" } }
                        ]
                    }
                }]);
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
                    text: `📊 【玉露寶庫】個人星際月報出爐\n\n上個月 (${reportYear}年${reportMonth}月) 的帳務結算與星區能量分析已經完成！\n\n👉 點擊連結檢視詳細圖表：\n${reportUrl}`
                });
            }

            if (isJan1st && userData.yearReportNotify) {
                const lastYear = today.getFullYear() - 1;
                messages.push({
                    type: "text",
                    text: `🎉 【玉露寶庫】年度星際總結報告\n\n${lastYear} 年辛苦了！您去年的年度財務軌跡與總結已經編製完成。\n\n👉 點擊連結回顧去年的點點滴滴：\n${reportUrl}`
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
                    text: `📊 【${groupData.name}】群組月報出爐\n\n上個月 (${reportYear}年${reportMonth}月) 的群組公積金結算已完成！趕快來確認團隊的資金流向。\n\n👉 點擊連結檢視：\n${reportUrl}`
                });
            }

            if (isJan1st && groupData.yearReportNotify) {
                const lastYear = today.getFullYear() - 1;
                messages.push({
                    type: "text",
                    text: `🎉 【${groupData.name}】年度團隊總結\n\n${lastYear} 年的群組財務總結出爐囉！\n\n👉 點擊連結查看成果：\n${reportUrl}`
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