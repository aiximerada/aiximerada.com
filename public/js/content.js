// js/content.js
// 玉露寶庫 3.2 (娛樂區僅保留抽獎)

var siteContent = {
    common: {
        siteTitle: "玉露寶庫",
        siteSubtitle: "AIXIMERADA.COM",
        footerText: "© 2026 玉露寶庫 System"
    },

    // ========== 🕹️ 娛樂區 (Games) ==========
    entertainment: [
        {
            title: "幸運大抽獎",
            desc: "命運輪盤，解決選擇困難症。",
            url: "lottery.html",
            icon: "fa-solid fa-ticket"
        }
        // [已封存] 防火牆 (firewall.html)
        // [已封存] 打字機 (typing.html)
        // [已封存] 反應測試 (reflex.html)
        // [已封存] 記憶翻牌 (memory.html)
        // [已封存] 極速逃亡 (run.html)
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
