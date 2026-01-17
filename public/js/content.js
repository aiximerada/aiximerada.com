// js/content.js
// 網站的資料庫 (定義所有遊戲卡片)

var siteContent = {
    // 1. 通用設定
    common: {
        siteTitle: "玉露寶庫",
        siteSubtitle: "AIXIMERADA.COM",
        footerText: "© 2026 玉露寶庫 System"
    },

    // 2. 二進位防禦戰
    binary: {
        title: "BINARY DEFENSE",
        desc: "駭客入侵！攔截紅色病毒，放行綠色代碼。考驗您的反應速度。",
        url: "binary.html",
        icon: "fa-solid fa-shield-virus",
        type: "game"
    },

    // 3. 手工皂專區 (範例)
    soap: {
        title: "大吉大利手工皂",
        desc: "純天然成分，綿密泡沫。新春特惠禮盒組熱賣中。",
        url: "#", // 之後可改為商城連結
        icon: "fa-solid fa-pump-soap",
        type: "product"
    },
    
    // 4. YouTube 頻道
    youtube: {
        title: "玉露頻道",
        desc: "訂閱我的頻道，觀看最新的開發日誌與遊戲實況！",
        url: "https://www.youtube.com/@JadeTreasure", // 替換成您的頻道連結
        icon: "fa-brands fa-youtube",
        type: "youtube"
    }
};
