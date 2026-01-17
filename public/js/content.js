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
        title: "二進位防禦戰",
        desc: "駭客入侵！攔截紅色病毒，放行綠色代碼。考驗您的反應速度。",
        url: "binary.html", 
        icon: "fa-solid fa-shield-virus",
        type: "game"
    },

    // 3. 中英打練習器 (⚠️請確認您的檔案是不是叫 run.html)
    typing: {
        title: "中英打練習器",
        desc: "提升您的打字速度，支援中文與英文模式，即時計算 WPM。",
        url: "run.html", 
        icon: "fa-solid fa-keyboard",
        type: "tool"
    },

    // 4. 相片編輯器 (⚠️請確認您的檔案是不是叫 editor.html)
    editor: {
        title: "線上相片編輯",
        desc: "快速裁切、濾鏡調整、圖片處理工具。",
        url: "editor.html", 
        icon: "fa-solid fa-wand-magic-sparkles",
        type: "tool"
    },
    
    // 5. 手工皂專區
    soap: {
        title: "大吉大利手工皂",
        desc: "純天然成分，綿密泡沫。新春特惠禮盒組熱賣中。",
        url: "#", 
        icon: "fa-solid fa-pump-soap",
        type: "product"
    },

    // 6. YouTube 頻道
    youtube: {
        title: "玉露頻道",
        desc: "訂閱我的頻道，觀看最新的開發日誌與遊戲實況！",
        url: "https://www.youtube.com/@JadeTreasure",
        icon: "fa-brands fa-youtube",
        type: "youtube"
    }
};
