// js/content.js
// 3.0 資料庫：功能嚴格分類

var siteContent = {
    common: {
        siteTitle: "玉露寶庫",
        siteSubtitle: "AIXIMERADA.COM",
        footerText: "© 2026 玉露寶庫 System"
    },

    // ========== 🕹️ 娛樂區 (Games) ==========
    entertainment: [
        {
            title: "防火牆防禦戰",
            desc: "滑動攔截紅色病毒，放行綠色封包。",
            url: "firewall.html",
            icon: "fa-solid fa-shield-virus"
        },
        {
            title: "中英打練習",
            desc: "WPM 打字速度測試與練習。",
            url: "typing.html",
            icon: "fa-solid fa-keyboard"
        },
        {
            title: "極限反應測試",
            desc: "毫秒級的神經反應速度測試。",
            url: "reflex.html",
            icon: "fa-solid fa-bolt"
        },
        {
            title: "記憶力大翻牌",
            desc: "考驗瞬間記憶力的配對遊戲。",
            url: "memory.html",
            icon: "fa-solid fa-brain"
        },
        {
            title: "幸運大抽獎",
            desc: "命運輪盤，解決選擇困難症。",
            url: "lottery.html",
            icon: "fa-solid fa-ticket"
        },
        {
            title: "極速跑者",
            desc: "點擊跳躍避開障礙物的小遊戲。",
            url: "run.html",
            icon: "fa-solid fa-person-running"
        }
    ],

    // ========== 🛠️ 工具區 (Tools) ==========
    tools: [
        {
            title: "極速圖片壓縮",
            desc: "本地端運算，無需上傳，保障隱私。",
            url: "compress.html",
            icon: "fa-solid fa-compress"
        },
        {
            title: "QR Code 產生器",
            desc: "輸入網址或文字，一秒生成條碼。",
            url: "qrcode.html",
            icon: "fa-solid fa-qrcode"
        },
        {
            title: "摩斯密碼翻譯",
            desc: "文字與摩斯電碼雙向翻譯與播放。",
            url: "morse.html",
            icon: "fa-solid fa-code"
        },
        {
            title: "系統狀態",
            desc: "檢視伺服器連線與版本資訊。",
            url: "system.html",
            icon: "fa-solid fa-server"
        }
    ],

    // ========== 🛒 商城 (Shop) ==========
    shop: {
        title: "商城",
        subtitle: "SHOP & GOODS",
        desc: "大吉大利手工皂與數位商品專區。",
        placeholderIcon: "fa-solid fa-store",
        url: "shop.html"
    }
};
