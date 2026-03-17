const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");
const axios = require("axios");

admin.initializeApp();
const db = admin.firestore();

// 🔴 您的 LINE Channel Access Token 與 氣象署 API Key
const LINE_TOKEN = "p6ugh27GDssmbdkmySR4Z/6QykwBCwpxyQzRvpjJqJAR8zGbTUH0MbhlsMYKAZFrcEWozoAXRflXW+z5P0+EWNPPgVXfjkeYAcFrRleCM3Spwdjsy43Af2S3yNwEoY+G8Us2LtzKXcMpjVQ8DnOovAdB04t89/1O/w1cDnyilFU=";
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
        return res.data.displayName || "神秘旅行者";
    } catch (e) { return "會員"; }
}

// =====================================================================
// 🌟 核心引擎：通用高質感卡片生成器 (Flex Message)
// =====================================================================
function createCardMessage(title, text, color = "#00f3ff", quickReplies = null, button = null) {
    const contents = [
        { "type": "text", "text": "✨ " + title, "weight": "bold", "size": "md", "color": color, "wrap": true },
        { "type": "separator", "margin": "md", "color": "#ffffff33" },
        { "type": "text", "text": text, "color": "#e2e8f0", "wrap": true, "margin": "md", "size": "sm" }
    ];

    let bubble = {
        "type": "bubble",
        "styles": { "body": { "backgroundColor": "#0f172a" }, "footer": { "backgroundColor": "#0f172a" } },
        "body": { "type": "box", "layout": "vertical", "contents": contents }
    };

    if (button) {
        bubble.footer = {
            "type": "box", "layout": "vertical",
            "contents": [{ "type": "button", "style": "primary", "color": color, "action": { "type": "uri", "label": button.label, "uri": button.uri } }]
        };
    }

    const msg = { "type": "flex", "altText": title, "contents": bubble };
    if (quickReplies && quickReplies.length > 0) msg.quickReply = { items: quickReplies };
    return msg;
}

// =====================================================================
// 📊 輔助函數：產生「圖表」專用的 Flex Message
// =====================================================================
function generateChartFlexMessage(title, totalAmount, chartUrl) {
    return {
        "type": "flex",
        "altText": title,
        "contents": {
            "type": "bubble",
            "styles": { "body": { "backgroundColor": "#0f172a" }, "hero": { "backgroundColor": "#0f172a" } },
            "hero": {
                "type": "image",
                "url": chartUrl,
                "size": "full",
                "aspectRatio": "1.618:1",
                "aspectMode": "fit",
                "backgroundColor": "#0f172a"
            },
            "body": {
                "type": "box",
                "layout": "vertical",
                "contents": [
                    { "type": "text", "text": title, "weight": "bold", "size": "lg", "color": "#FFD700" },
                    { "type": "text", "text": `總計：$ ${totalAmount.toLocaleString()} 元`, "weight": "bold", "size": "xl", "color": "#00ff9d", "margin": "sm" }
                ]
            }
        }
    };
}

function getQuickChartUrl(dataMap) {
    const labels = Object.keys(dataMap);
    const data = Object.values(dataMap);
    const chartConfig = {
        type: 'doughnut',
        data: { labels: labels, datasets: [{ data: data, backgroundColor: ['#00f3ff', '#bc13fe', '#FFD700', '#ff4757', '#00ff9d', '#ff9f43', '#1e90ff'] }] },
        options: { plugins: { legend: { labels: { fontColor: '#ffffff', fontSize: 14 } }, datalabels: { color: '#ffffff', font: { weight: 'bold', size: 14 } } } }
    };
    return `https://quickchart.io/chart?w=500&h=300&bkg=0f172a&c=${encodeURIComponent(JSON.stringify(chartConfig))}`;
}

// =====================================================================
// 📍 車位與天氣輔助函數
// =====================================================================
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; 
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    return R * c; 
}

function generateParkingFlexMessage(spots, altText) {
    const bubbles = spots.map(spot => {
        const distanceText = spot.distance ? `${spot.distance.toFixed(1)} km` : spot.city;
        const fallbackImage = "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?q=80&w=800&auto=format&fit=crop";

        return {
            "type": "bubble",
            "styles": { "body": { "backgroundColor": "#0f172a" }, "footer": { "backgroundColor": "#0f172a" } },
            "hero": { "type": "image", "url": spot.image_url || fallbackImage, "size": "full", "aspectRatio": "20:13", "aspectMode": "cover" },
            "body": {
                "type": "box", "layout": "vertical",
                "contents": [
                    { "type": "text", "text": spot.name || "未命名車位", "weight": "bold", "size": "xl", "color": "#00f3ff", "wrap": true },
                    { "type": "text", "text": `📍 ${spot.address}`, "size": "sm", "color": "#cbd5e1", "wrap": true, "margin": "md" },
                    { "type": "text", "text": `💰 ${spot.price || '未提供'}`, "size": "sm", "color": "#00ff9d", "weight": "bold", "margin": "sm" },
                    { "type": "text", "text": `🛵 距離/區域：${distanceText}`, "size": "xs", "color": "#FFD700", "margin": "sm" },
                    { "type": "text", "text": `📝 ${spot.note || '無備註'}`, "size": "xs", "color": "#94a3b8", "wrap": true, "margin": "sm" }
                ]
            },
            "footer": {
                "type": "box", "layout": "vertical",
                "contents": [{ "type": "button", "style": "primary", "color": "#bc13fe", "action": { "type": "uri", "label": "📍 導航前往", "uri": spot.gmap || `https://www.google.com/maps/search/?api=1&query=${spot.lat},${spot.lng}` } }]
            }
        };
    });

    return { "type": "flex", "altText": altText, "contents": { "type": "carousel", "contents": bubbles } };
}

function generateNotFoundFlexMessage(title, description) {
    return {
        "type": "flex", "altText": title,
        "contents": {
            "type": "bubble",
            "styles": { "body": { "backgroundColor": "#0f172a" }, "footer": { "backgroundColor": "#0f172a" } },
            "body": {
                "type": "box", "layout": "vertical",
                "contents": [
                    { "type": "text", "text": "⚠️ " + title, "weight": "bold", "size": "xl", "color": "#ff4757", "wrap": true },
                    { "type": "separator", "margin": "md", "color": "#ffffff33" },
                    { "type": "text", "text": description, "wrap": true, "margin": "md", "color": "#e2e8f0", "size": "sm" }
                ]
            },
            "footer": {
                "type": "box", "layout": "vertical",
                "contents": [{ "type": "button", "style": "primary", "color": "#bc13fe", "action": { "type": "uri", "label": "📍 前往車位回報", "uri": encodeURI("https://yulubox.web.app/車位回報.html") } }]
            }
        }
    };
}

async function getWeather(city) {
    try {
        const searchCity = city.replace(/台/g, '臺');
        const url = `https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-C0032-001?Authorization=${CWA_API_KEY}`;
        const res = await axios.get(url);
        const targetLocation = res.data.records.location.find(loc => loc.locationName.includes(searchCity));

        if (!targetLocation) return { error: true, text: `觀測系統找不到「${city}」的資料。請輸入正確名稱。` };

        const elements = targetLocation.weatherElement;
        const wx = elements.find(e => e.elementName === 'Wx').time[0].parameter.parameterName; 
        const pop = parseInt(elements.find(e => e.elementName === 'PoP').time[0].parameter.parameterName); 
        const minT = elements.find(e => e.elementName === 'MinT').time[0].parameter.parameterName; 
        const maxT = elements.find(e => e.elementName === 'MaxT').time[0].parameter.parameterName; 
        const ci = elements.find(e => e.elementName === 'CI').time[0].parameter.parameterName; 

        let msg = `📍 觀測區域：${targetLocation.locationName}\n🌡️ 氣溫：${minT}°C ~ ${maxT}°C\n🌤️ 狀況：${wx} (${ci})\n💧 降雨機率：${pop}%\n`;
        msg += pop > 30 ? `\n☂️ 系統提醒：降雨機率偏高，外出探索請攜帶雨具！` : `\n✨ 系統提醒：天氣狀況良好，祝旅途愉快！`;
        return { error: false, text: msg };
    } catch (error) { return { error: true, text: `氣象觀測連線中斷，請稍後再試。` }; }
}

async function fetchAndDeleteList(userId, scope, replyToken, userRef, groupId) {
    const colName = scope === "group" ? "records_group" : "records_personal";
    let query = db.collection(colName);
    if (scope === "group") query = query.where("groupId", "==", groupId);
    else query = query.where("userId", "==", userId);
    
    const snapshot = await query.orderBy("timestamp", "desc").limit(5).get();
    
    if (snapshot.empty) {
        await userRef.set({ state: "IDLE", tempRecord: admin.firestore.FieldValue.delete() }, { merge: true });
        await replyLineMessage(replyToken, [createCardMessage("系統提示", "📭 目前資料庫中沒有可刪除的近期紀錄喔！", "#ff4757")]);
        return;
    }

    let msg = "請選擇您要抹除的紀錄編號：\n\n";
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

    await userRef.set({ state: "WAITING_DELETE_TARGET", tempRecord: { deleteCandidates: candidates, deleteScope: scope, deleteGroupId: groupId } }, { merge: true });
    await replyLineMessage(replyToken, [createCardMessage("刪除程序啟動", msg.trim(), "#ff4757", quickReplies)]);
}

// =====================================================================
// 🤖 核心：LINE 機器人 Webhook 接收與處理
// =====================================================================
exports.lineWebhook = functions.https.onRequest(async (req, res) => {
    const events = req.body.events;
    if (!events || events.length === 0) return res.status(200).send("OK");

    for (const event of events) {
        // 📍 車位定位搜尋 (接收 GPS 座標)
        if (event.type === "message" && event.message.type === "location") {
            const { latitude: userLat, longitude: userLng } = event.message;
            const replyToken = event.replyToken;

            try {
                const snapshot = await db.collection('parking_locations').where('status', '==', 'approved').get();
                let nearbySpots = [];
                snapshot.forEach(doc => {
                    const spot = doc.data();
                    if (spot.lat && spot.lng) {
                        const distance = calculateDistance(userLat, userLng, spot.lat, spot.lng);
                        if (distance <= 15) nearbySpots.push({ ...spot, distance: distance });
                    }
                });

                if (nearbySpots.length === 0) {
                    await replyLineMessage(replyToken, [generateNotFoundFlexMessage("附近查無車位", "方圓 15 公里內，目前尚未有熱心車友回報的重機車位情報。\n\n點擊下方按鈕，前往『車位回報』成為第一位貢獻者吧！")]);
                    continue;
                }
                nearbySpots.sort((a, b) => a.distance - b.distance);
                await replyLineMessage(replyToken, [generateParkingFlexMessage(nearbySpots.slice(0, 5), "為您找到附近的重機車位")]);
            } catch (err) { await replyLineMessage(replyToken, [createCardMessage("系統異常", "資料庫讀取失敗，請稍後再試。", "#ff4757")]); }
            continue;
        }

        // 💬 文字訊息處理
        if (event.type === "message" && event.message.type === "text") {
            const userId = event.source.userId;
            const text = event.message.text.trim();
            const replyToken = event.replyToken;

            const userRef = db.collection("users").doc(userId);
            const userDoc = await userRef.get();
            let userData = userDoc.exists ? userDoc.data() : { state: "IDLE" };
            let state = userData.state || "IDLE";

            // 全局取消指令
            if (text === "取消") {
                await userRef.set({ state: "IDLE", tempRecord: admin.firestore.FieldValue.delete() }, { merge: true });
                await replyLineMessage(replyToken, [createCardMessage("系統提示", "👌 系統已終止目前的操作程序。", "#00ff9d")]);
                continue;
            }

            // ==========================================
            // 🗺️ 智慧選單導航 1：記事本選單
            // ==========================================
            const notepadMenuKeywords = ["記事本", "記事", "筆記", "任務"];
            if (notepadMenuKeywords.includes(text)) {
                const todosSnap = await db.collection("todos").where("userId", "==", userId).where("status", "==", "pending").get();
                await replyLineMessage(replyToken, [createCardMessage(
                    "📝 記事本中樞",
                    `您目前共有 ${todosSnap.size} 個待辦事項。\n請選擇您要進行的操作：👇`,
                    "#3b82f6",
                    [
                        { type: "action", action: { type: "message", label: "📋 顯示近期待辦", text: "我的待辦" } },
                        { type: "action", action: { type: "message", label: "➕ 新增待辦", text: "新增待辦" } },
                        { type: "action", action: { type: "uri", label: "🌐 開啟網頁版", uri: "https://yulubox.web.app/notepad.html" } }
                    ]
                )]);
                continue;
            }

            // ==========================================
            // 🗺️ 智慧選單導航 2：車位選單
            // ==========================================
            const parkingMenuKeywords = ["車位", "停車位", "找車位", "停車", "重機車位", "重機停車"];
            if (parkingMenuKeywords.includes(text)) {
                await replyLineMessage(replyToken, [createCardMessage(
                    "🏍️ 車位搜尋系統",
                    "請選擇您要尋找車位的方式：\n\n📍 自動定位：點擊下方「傳送定位」按鈕，為您尋找半徑 15 公里內的車位。\n\n🔍 縣市搜尋：請直接輸入「縣市+車位」(例如：台北市車位)。",
                    "#f59e0b",
                    [
                        { type: "action", action: { type: "location", label: "📍 傳送定位" } },
                        { type: "action", action: { type: "message", label: "台北市車位", text: "台北市車位" } },
                        { type: "action", action: { type: "uri", label: "🌐 車位回報系統", uri: "https://yulubox.web.app/車位回報.html" } }
                    ]
                )]);
                continue;
            }

            // ==========================================
            // 🗺️ 智慧選單導航 3：記帳選單
            // ==========================================
            const accountingMenuKeywords = ["記帳", "帳本", "理財", "財務", "花費"];
            if (accountingMenuKeywords.includes(text)) {
                await replyLineMessage(replyToken, [createCardMessage(
                    "💰 帳務中樞",
                    "偵測到帳務管理需求！請選擇要將資金寫入哪一個帳本，或調閱分析圖表：👇",
                    "#FFD700",
                    [
                        { type: "action", action: { type: "message", label: "🙋‍♂️ 個人記帳", text: "個人記帳" } },
                        { type: "action", action: { type: "message", label: "👥 群組記帳", text: "群組記帳" } },
                        { type: "action", action: { type: "message", label: "📊 日支出圖表", text: "日支出" } },
                        { type: "action", action: { type: "uri", label: "🌐 開啟完整報表", uri: "https://yulubox.web.app/帳務.html" } }
                    ]
                )]);
                continue;
            }

            // ==========================================
            // 📝 記事本功能：查看近期代辦清單
            // ==========================================
            const showTodosKeywords = ["我的待辦", "待辦事項", "代辦事項", "代辦", "待辦", "近期待辦"];
            if (showTodosKeywords.includes(text)) {
                const todosSnap = await db.collection("todos")
                    .where("userId", "==", userId)
                    .where("status", "==", "pending")
                    .get();

                if (todosSnap.empty) {
                    await replyLineMessage(replyToken, [createCardMessage("記事本", "您目前沒有任何待辦事項！太棒了 ✨", "#00ff9d", [{ type: "action", action: { type: "message", label: "➕ 新增待辦", text: "新增待辦" } }])]);
                    continue;
                }

                let tasks = [];
                todosSnap.forEach(doc => tasks.push({ id: doc.id, ...doc.data() }));
                // 依截止日近到遠排序 (無截止日的放最後)
                tasks.sort((a, b) => {
                    if (!a.deadline) return 1; if (!b.deadline) return -1;
                    return new Date(a.deadline) - new Date(b.deadline);
                });

                const topTasks = tasks.slice(0, 3);
                let bubbles = topTasks.map((t, idx) => {
                    let color = "#3b82f6";
                    if (t.priority === 'high') color = "#ff4757";
                    else if (t.priority === 'medium') color = "#FFD700";

                    return {
                        "type": "bubble",
                        "size": "micro",
                        "styles": { "body": { "backgroundColor": "#0f172a" }, "footer": { "backgroundColor": "#0f172a" } },
                        "body": {
                            "type": "box", "layout": "vertical",
                            "contents": [
                                { "type": "text", "text": `📌 ${t.title}`, "weight": "bold", "size": "md", "color": color, "wrap": true },
                                { "type": "text", "text": t.deadline ? `📅 截止: ${t.deadline}` : "📅 無期限", "size": "xs", "color": "#94a3b8", "margin": "sm" },
                                { "type": "text", "text": t.note || "無備註", "size": "xs", "color": "#e2e8f0", "wrap": true, "margin": "sm" }
                            ]
                        },
                        "footer": {
                            "type": "box", "layout": "vertical",
                            "contents": [{
                                "type": "button", "style": "primary", "color": "#00ff9d", "height": "sm",
                                "action": { "type": "message", "label": "✅ 標記完成", "text": `${t.title} 完成` }
                            }]
                        }
                    };
                });

                const msg = { "type": "flex", "altText": "您的待辦事項", "contents": { "type": "carousel", "contents": bubbles } };
                msg.quickReply = { items: [
                    { type: "action", action: { type: "message", label: "➕ 新增待辦", text: "新增待辦" } },
                    { type: "action", action: { type: "uri", label: "🌐 查看全部", uri: "https://yulubox.web.app/notepad.html" } }
                ]};
                
                await replyLineMessage(replyToken, [msg]);
                continue;
            }

            // ==========================================
            // 📝 記事本功能：標記完成 (例如輸入「買牛奶 完成」)
            // ==========================================
            if (text.endsWith("完成") && text.length > 2) {
                const targetTitle = text.replace("完成", "").trim();
                if (targetTitle) {
                    const todosSnap = await db.collection("todos")
                        .where("userId", "==", userId)
                        .where("status", "==", "pending")
                        .where("title", "==", targetTitle)
                        .get();
                    
                    if (!todosSnap.empty) {
                        const taskDoc = todosSnap.docs[0];
                        await db.collection("todos").doc(taskDoc.id).update({
                            status: "completed",
                            completedAt: admin.firestore.FieldValue.serverTimestamp()
                        });
                        await replyLineMessage(replyToken, [createCardMessage("任務達成", `✅ 太棒了！您已完成任務：【${targetTitle}】`, "#00ff9d")]);
                        continue;
                    }
                }
            }

            // ==========================================
            // 📝 記事本功能：新增待辦流程
            // ==========================================
            if (text === "新增記事" || text === "新增待辦") {
                await userRef.set({ state: "WAITING_TODO_TITLE", tempRecord: {} }, { merge: true });
                await replyLineMessage(replyToken, [createCardMessage("新增待辦", "📝 請輸入您的「事項名稱」：\n(例如：機車換機油)", "#3b82f6")]);
                continue;
            }

            if (state === "WAITING_TODO_TITLE") {
                await userRef.set({ state: "WAITING_TODO_DEADLINE", tempRecord: { title: text } }, { merge: true });
                await replyLineMessage(replyToken, [createCardMessage("設定日期", `📌 事項：${text}\n\n請輸入「截止日期」 (格式：YYYY-MM-DD，例如 2026-03-20)。\n點擊下方按鈕可直接選擇今日或跳過。`, "#3b82f6", [
                    { type: "action", action: { type: "message", label: "📅 今天", text: new Date().toISOString().split('T')[0] } },
                    { type: "action", action: { type: "message", label: "⏭️ 無期限 (跳過)", text: "跳過" } }
                ])]);
                continue;
            }

            if (state === "WAITING_TODO_DEADLINE") {
                let deadline = text === "跳過" ? "" : text;
                if (deadline && !deadline.match(/^\d{4}-\d{2}-\d{2}$/)) {
                    await replyLineMessage(replyToken, [createCardMessage("格式錯誤", "⚠️ 日期格式錯誤，請輸入例如：2026-03-20，或輸入「跳過」。", "#ff4757")]);
                    continue;
                }
                let tempRecord = userData.tempRecord || {};
                tempRecord.deadline = deadline;
                await userRef.set({ state: "WAITING_TODO_NOTE", tempRecord: tempRecord }, { merge: true });
                await replyLineMessage(replyToken, [createCardMessage("輸入備註", "最後，請輸入「備註細節」：\n(若無備註請點擊跳過)", "#3b82f6", [
                    { type: "action", action: { type: "message", label: "⏭️ 跳過備註", text: "無" } }
                ])]);
                continue;
            }

            if (state === "WAITING_TODO_NOTE") {
                let note = text === "無" ? "" : text;
                const record = userData.tempRecord;
                
                await db.collection("todos").add({
                    userId: userId,
                    title: record.title,
                    deadline: record.deadline || "",
                    note: note,
                    priority: "medium",
                    remind: true, // 由 LINE 建立的自動開啟提醒
                    status: "pending",
                    createdAt: admin.firestore.FieldValue.serverTimestamp()
                });
                
                await userRef.set({ state: "IDLE", tempRecord: admin.firestore.FieldValue.delete() }, { merge: true });
                await replyLineMessage(replyToken, [createCardMessage("新增成功", `✅ 已將【${record.title}】加入記事本中！\n系統將在截止日前為您發送提醒。`, "#00ff9d")]);
                continue;
            }

            // ==========================================
            // 📊 記帳功能：查詢日支出 / 月支出 (生成圖表)
            // ==========================================
            if (text === "日支出" || text === "月支出") {
                const isDaily = text === "日支出";
                const tzStr = new Date().toLocaleString("en-US", {timeZone: "Asia/Taipei"});
                const nowTw = new Date(tzStr);
                
                try {
                    const recordsSnap = await db.collection("records_personal")
                        .where("userId", "==", userId)
                        .where("transactionType", "==", "expense")
                        .get();
                    
                    let total = 0;
                    let categoryData = {};
                    
                    recordsSnap.forEach(doc => {
                        const data = doc.data();
                        if (!data.timestamp) return;
                        const recordDate = new Date(data.timestamp.toDate().toLocaleString("en-US", {timeZone: "Asia/Taipei"}));
                        
                        let isMatch = false;
                        if (isDaily) {
                            if (recordDate.getFullYear() === nowTw.getFullYear() && 
                                recordDate.getMonth() === nowTw.getMonth() && 
                                recordDate.getDate() === nowTw.getDate()) {
                                isMatch = true;
                            }
                        } else {
                            if (recordDate.getFullYear() === nowTw.getFullYear() && 
                                recordDate.getMonth() === nowTw.getMonth()) {
                                isMatch = true;
                            }
                        }

                        if (isMatch) {
                            total += data.amount;
                            categoryData[data.category] = (categoryData[data.category] || 0) + data.amount;
                        }
                    });

                    if (total === 0) {
                        const title = isDaily ? "今日無支出" : "本月無支出";
                        const desc = isDaily ? "太棒了！您今天目前為止沒有任何支出紀錄喔！繼續保持 ✨" : "您本月目前還沒有紀錄任何支出喔！";
                        await replyLineMessage(replyToken, [createCardMessage(title, desc, "#00ff9d")]);
                        continue;
                    }

                    const chartUrl = getQuickChartUrl(categoryData);
                    const flexTitle = isDaily ? `${nowTw.getMonth()+1}/${nowTw.getDate()} 支出分佈` : `${nowTw.getFullYear()}年${nowTw.getMonth()+1}月 支出分佈`;
                    await replyLineMessage(replyToken, [generateChartFlexMessage(flexTitle, total, chartUrl)]);
                    
                } catch (error) {
                    console.error("產生圖表失敗:", error);
                    await replyLineMessage(replyToken, [createCardMessage("系統異常", "生成圖表時發生錯誤，請稍後再試。", "#ff4757")]);
                }
                continue;
            }

            // ==========================================
            // 🏍️ 車位查詢 (文字縣市搜尋，排除總選單指令)
            // ==========================================
            if (text.endsWith("車位") && !parkingMenuKeywords.includes(text)) {
                let city = text.replace("車位", "").trim();
                if (city === "") {
                    await replyLineMessage(replyToken, [createCardMessage("指令錯誤", "🏍️ 尋找車位指令錯誤！\n\n1️⃣ 搜尋特定縣市：請輸入「縣市+車位」（例如：台北市車位）\n\n2️⃣ 搜尋附近車位：請直接點擊左下角「+」，傳送您的「位置資訊」給我！", "#ff4757")]);
                } else {
                    try {
                        const searchCity = (city.includes("市") || city.includes("縣")) ? city : city + "市";
                        const snapshot = await db.collection('parking_locations').where('status', '==', 'approved').where('city', '>=', searchCity).where('city', '<=', searchCity + '\uf8ff').limit(5).get();
                        if (snapshot.empty) await replyLineMessage(replyToken, [generateNotFoundFlexMessage(`查無【${searchCity}】車位`, `目前資料庫中尚未有【${searchCity}】的重機車位情報。\n\n點擊下方按鈕，前往『車位回報』貢獻您的私房車位！`)]);
                        else {
                            let spots = []; snapshot.forEach(doc => spots.push(doc.data()));
                            await replyLineMessage(replyToken, [generateParkingFlexMessage(spots, `為您找到【${searchCity}】的推薦車位`)]);
                        }
                    } catch (err) { console.error("縣市搜尋車位失敗:", err); }
                }
                continue;
            }

            // ==========================================
            // 🌤️ 天氣觀測
            // ==========================================
            if (text.endsWith("天氣")) {
                const city = text.replace("天氣", "").trim();
                if (city === "") await replyLineMessage(replyToken, [createCardMessage("指令錯誤", "🌤️ 請輸入「縣市+天氣」來啟動觀測！\n例如：台北天氣、宜蘭天氣", "#ff4757")]);
                else {
                    const weatherInfo = await getWeather(city);
                    await replyLineMessage(replyToken, [createCardMessage("氣象觀測站", weatherInfo.text, weatherInfo.error ? "#ff4757" : "#00f3ff")]);
                }
                continue;
            }

            // ==========================================
            // 🌐 導覽指令
            // ==========================================
            if (text === "官網" || text === "首頁" || text.toLowerCase() === "website") {
                await replyLineMessage(replyToken, [createCardMessage("啟動傳送門", "歡迎登入寶庫會員中心！\n\n您可以在此管理您的專屬設定、體驗完整帳務與社群功能。✨", "#bc13fe", null, { label: "🚀 前往會員中心", uri: "https://yulubox.web.app" })]);
                continue;
            }

            if (text === "看報表" || text === "報表") {
                await replyLineMessage(replyToken, [createCardMessage("個人帳務中樞", "為您調閱最新的財務分析圖表與收支紀錄。點擊下方按鈕立即查看：", "#00ff9d", null, { label: "📊 查看最新報表", uri: "https://yulubox.web.app/帳務.html" })]);
                continue;
            }

            // ==========================================
            // 🗑️ 刪除紀錄邏輯
            // ==========================================
            if (text === "刪除" || text === "刪除紀錄") {
                const groupsSnap = await db.collection("groups").where("members", "array-contains", userId).get();
                if (!groupsSnap.empty) {
                    await userRef.set({ state: "WAITING_DELETE_SCOPE" }, { merge: true });
                    const quickReplies = [{ type: "action", action: { type: "message", label: "🙋‍♂️ 個人帳本", text: "刪除個人紀錄" } }, { type: "action", action: { type: "message", label: "👥 群組帳本", text: "刪除群組紀錄" } }];
                    await replyLineMessage(replyToken, [createCardMessage("刪除紀錄", "🗑️ 請問您要調閱哪一個帳本來進行刪除？👇", "#ff4757", quickReplies)]);
                } else {
                    await fetchAndDeleteList(userId, "personal", replyToken, userRef, null);
                }
                continue;
            }

            if (state === "WAITING_DELETE_SCOPE") {
                if (text === "刪除個人紀錄") await fetchAndDeleteList(userId, "personal", replyToken, userRef, null);
                else if (text === "刪除群組紀錄") {
                    const groupsSnap = await db.collection("groups").where("members", "array-contains", userId).get();
                    if(!groupsSnap.empty) await fetchAndDeleteList(userId, "group", replyToken, userRef, groupsSnap.docs[0].id);
                } else await replyLineMessage(replyToken, [createCardMessage("系統提示", "⚠️ 系統無法辨識。請點擊下方按鈕選擇，或輸入「取消」終止程序。", "#ff4757")]);
                continue;
            }

            if (state === "WAITING_DELETE_TARGET") {
                const idx = parseInt(text) - 1;
                const candidates = userData.tempRecord?.deleteCandidates || [];
                const scope = userData.tempRecord?.deleteScope;
                if (isNaN(idx) || idx < 0 || idx >= candidates.length) {
                    await replyLineMessage(replyToken, [createCardMessage("系統提示", "⚠️ 找不到該編號的紀錄，請輸入正確的數字 (例如: 1) 或輸入「取消」。", "#ff4757")]);
                    continue;
                }
                await db.collection(scope === "group" ? "records_group" : "records_personal").doc(candidates[idx].id).delete();
                await userRef.set({ state: "IDLE", tempRecord: admin.firestore.FieldValue.delete() }, { merge: true });
                await replyLineMessage(replyToken, [createCardMessage("刪除成功", "✅ 抹除完成！該筆紀錄已徹底移除。", "#00ff9d")]);
                continue;
            }

            // ==========================================
            // ✍️ 新增記帳邏輯
            // ==========================================
            if (text === "個人記帳" || text === "群組記帳") {
                const isGroup = text === "群組記帳";
                let groupId = null;
                if (isGroup) {
                    const groupsSnap = await db.collection("groups").where("members", "array-contains", userId).get();
                    if (groupsSnap.empty) {
                        await replyLineMessage(replyToken, [createCardMessage("系統提示", "⚠️ 您目前尚未連結任何群組喔！請先至網頁中新增群組。", "#ff4757")]);
                        continue;
                    }
                    groupId = groupsSnap.docs[0].id; 
                }
                await userRef.set({ state: "WAITING_TRANSACTION_TYPE", tempRecord: { account: isGroup ? "group" : "personal", targetGroupId: groupId } }, { merge: true });
                const quickReplies = [{ type: "action", action: { type: "message", label: "📉 支出", text: "支出" } }, { type: "action", action: { type: "message", label: "📈 收入", text: "收入" } }, { type: "action", action: { type: "message", label: "🚫 取消", text: "取消" } }];
                await replyLineMessage(replyToken, [createCardMessage("鎖定帳本", `💳 已鎖定【${isGroup ? '群組公積金' : '個人帳本'}】\n\n請指示這筆資金的流向：`, "#FFD700", quickReplies)]);
                continue;
            }

            if (state === "WAITING_TRANSACTION_TYPE") {
                if (text !== "支出" && text !== "收入") {
                    await replyLineMessage(replyToken, [createCardMessage("系統提示", "⚠️ 請點擊下方按鈕選擇「支出」或「收入」", "#ff4757")]);
                    continue;
                }
                const isIncome = text === "收入";
                let tempRecord = userData.tempRecord || {}; tempRecord.type = isIncome ? "income" : "expense";
                const defaultCats = isIncome ? DEFAULT_INCOME_CATEGORIES : DEFAULT_EXPENSE_CATEGORIES;
                const customCats = isIncome ? (userData.customIncomeCategories || []) : (userData.customExpenseCategories || []);
                let allCats = [...defaultCats, ...customCats].slice(0, 11); 
                const quickReplyItems = allCats.map(c => ({ type: "action", action: { type: "message", label: c, text: c } }));
                quickReplyItems.push({ type: "action", action: { type: "message", label: "➕ 新增自訂分類", text: "其他" } });

                await userRef.set({ state: "WAITING_CATEGORY", tempRecord: tempRecord }, { merge: true });
                await replyLineMessage(replyToken, [createCardMessage("選擇分類", `流向：【${text}】\n請選擇這筆資金的「分類屬性」：👇`, "#00f3ff", quickReplyItems)]);
                continue;
            }

            if (state === "WAITING_CATEGORY") {
                if (text === "其他") {
                    await userRef.set({ state: "WAITING_CUSTOM_CATEGORY" }, { merge: true });
                    await replyLineMessage(replyToken, [createCardMessage("自訂分類", "✏️ 請直接輸入您的「自訂分類名稱」：", "#bc13fe")]);
                    continue;
                }
                let tempRecord = userData.tempRecord || {}; tempRecord.category = text;
                await userRef.set({ state: "WAITING_AMOUNT", tempRecord: tempRecord }, { merge: true });
                await replyLineMessage(replyToken, [createCardMessage("輸入金額", `🏷️ 分類設定為：【${text}】\n\n請輸入「金額數字」：`, "#00f3ff")]);
                continue;
            }

            if (state === "WAITING_CUSTOM_CATEGORY") {
                let tempRecord = userData.tempRecord || {}; tempRecord.category = text;
                const updateField = tempRecord.type === "income" ? "customIncomeCategories" : "customExpenseCategories";
                await userRef.set({ state: "WAITING_AMOUNT", tempRecord: tempRecord, [updateField]: admin.firestore.FieldValue.arrayUnion(text) }, { merge: true });
                await replyLineMessage(replyToken, [createCardMessage("輸入金額", `🏷️ 已將【${text}】加入分類。\n\n請輸入「金額數字」：`, "#00f3ff")]);
                continue;
            }

            if (state === "WAITING_AMOUNT") {
                const amount = parseInt(text);
                if (isNaN(amount) || amount <= 0) {
                    await replyLineMessage(replyToken, [createCardMessage("輸入錯誤", "⚠️ 金額只能輸入大於 0 的有效數字喔！請重新輸入：", "#ff4757")]);
                    continue;
                }
                let tempRecord = userData.tempRecord || {}; tempRecord.amount = amount;
                await userRef.set({ state: "WAITING_NOTE", tempRecord: tempRecord }, { merge: true });
                await replyLineMessage(replyToken, [createCardMessage("輸入備註", `💰 金額：${amount} 元\n\n最後一步，請為這筆紀錄輸入「備註」：\n(若無備註需求，請點擊下方按鈕跳過)`, "#00ff9d", [{ type: "action", action: { type: "message", label: "⏭️ 略過備註", text: "無備註" } }])]);
                continue;
            }

            if (state === "WAITING_NOTE") {
                const record = userData.tempRecord;
                const isGroup = record.account === "group";
                const isIncome = record.type === "income";
                const userName = await getUserProfile(userId);
                const finalData = {
                    userId: userId, userName: userName, transactionType: record.type, category: record.category,
                    amount: record.amount, note: text === "無備註" ? "" : text, timestamp: admin.firestore.FieldValue.serverTimestamp()
                };
                if (isGroup) finalData.groupId = record.targetGroupId;

                await db.collection(isGroup ? "records_group" : "records_personal").add(finalData);
                await userRef.set({ state: "IDLE", tempRecord: admin.firestore.FieldValue.delete() }, { merge: true });

                let successMsg = `📒 帳本：${isGroup ? '👥 群組共用' : '🙋‍♂️ 個人專屬'}\n`;
                if (isGroup) successMsg += `👤 成員：${userName}\n`;
                successMsg += `🏷️ 分類：${record.category} (${isIncome ? '📈 收入' : '📉 支出'})\n💰 金額：$ ${record.amount}\n`;
                if (text !== "無備註") successMsg += `📝 備註：${text}`;

                await replyLineMessage(replyToken, [createCardMessage("紀錄同步成功", successMsg, "#00ff9d")]);
                continue;
            }

            // ==========================================
            // 🤷‍♂️ 預設防呆回覆 (更溫和、準確的推薦)
            // ==========================================
            if (state === "IDLE") {
                const triggerWords = ["買", "支", "收", "資"];
                if (triggerWords.some(w => text.includes(w)) || !isNaN(parseInt(text[0]))) {
                    await replyLineMessage(replyToken, [createCardMessage("系統提示", "✨ 偵測到疑似帳務紀錄需求！\n若要開始記帳，請點擊下方按鈕：👇", "#FFD700", [
                        { type: "action", action: { type: "message", label: "✍️ 開始記帳", text: "記帳" } }
                    ])]);
                    continue; 
                }

                await replyLineMessage(replyToken, [createCardMessage("系統導航", "🤖 系統無法辨識您的指令喔！\n\n您可以點擊下方快捷按鈕，開啟各項功能選單：👇", "#00f3ff", [
                    { type: "action", action: { type: "message", label: "💰 記帳系統", text: "記帳" } },
                    { type: "action", action: { type: "message", label: "📝 記事本", text: "記事本" } },
                    { type: "action", action: { type: "message", label: "🏍️ 找車位", text: "車位" } }
                ])]);
            }
        }
    }
    res.status(200).send("OK");
});

// =====================================================================
// 🤖 每日定時任務 (每天早上 8 點執行)：處理待辦提醒與過期銷毀
// =====================================================================
exports.dailyTodoRoutine = functions.region("asia-east1").pubsub.schedule("0 8 * * *").timeZone("Asia/Taipei").onRun(async (context) => {
    try {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0]; // YYYY-MM-DD

        // 1. 【自動提醒】找出截止日是明天的 pending 任務
        const pendingSnap = await db.collection("todos")
            .where("status", "==", "pending")
            .where("remind", "==", true)
            .where("deadline", "==", tomorrowStr)
            .get();

        const userReminders = {}; // { userId: [task1, task2] }
        pendingSnap.forEach(doc => {
            const task = doc.data();
            if (!userReminders[task.userId]) userReminders[task.userId] = [];
            userReminders[task.userId].push(task);
        });

        for (const [userId, tasks] of Object.entries(userReminders)) {
            let msgText = `🔔 溫馨提醒！您有 ${tasks.length} 個待辦事項將在「明天」到期：\n\n`;
            tasks.forEach(t => msgText += `👉 ${t.title}\n`);
            
            try {
                await axios.post('https://api.line.me/v2/bot/message/push', {
                    to: userId,
                    messages: [createCardMessage("明日待辦提醒", msgText.trim(), "#FFD700")]
                }, { headers: { 'Authorization': `Bearer ${LINE_TOKEN}` } });
            } catch (e) { console.error(`傳送提醒失敗 (${userId}):`, e.message); }
        }

        // 2. 【自動銷毀】找出已完成超過 30 天的任務並刪除
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const completedSnap = await db.collection("todos")
            .where("status", "==", "completed")
            .where("completedAt", "<", admin.firestore.Timestamp.fromDate(thirtyDaysAgo))
            .get();

        const batch = db.batch();
        completedSnap.forEach(doc => batch.delete(doc.ref));
        
        if (!completedSnap.empty) {
            await batch.commit();
            console.log(`✅ 已自動銷毀 ${completedSnap.size} 筆過期的已完成任務。`);
        }

    } catch (error) {
        console.error("每日定時任務執行失敗:", error);
    }
    return null;
});
