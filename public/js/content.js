// 網站文案與素材資料庫
// ⚠️ 請務必將此檔案存為 UTF-8 編碼，否則中文會變亂碼

const siteContent = {
    // --- 1. 全域設定 ---
    common: {
        siteTitle: "玉露寶庫",
        siteSubtitle: "AIXIMERADA.COM",
        backHome: '<i class="fa-solid fa-arrow-left"></i> 回首頁',
        footer: "&copy; 2026 玉露寶庫 Toolkit. All rights reserved."
    },

    // --- 2. 首頁卡片設定 ---
    home: {
        cards: {
            // [保留] 數據逃亡
            runner: { title: "數據逃亡", desc: "突破防火牆的極速跑酷遊戲", icon: "fa-solid fa-person-running", link: "run.html" },
            
            // [保留] 戰術打字
            typing: { title: "戰術打字終端", desc: "訓練您的輸入速度與精準度", icon: "fa-solid fa-keyboard", link: "typing.html" },
            
            // 其他項目
            memory: { title: "量子記憶矩陣", desc: "測試您的短期記憶極限", icon: "fa-solid fa-brain", link: "memory.html" },
            firewall: { title: "防火牆強制突破", desc: "觸發多重球分裂，物理演算式打磚塊", icon: "fa-solid fa-shield-virus", link: "firewall.html" },
            reflex: { title: "神經反射同步率", desc: "測試您的極限反應速度", icon: "fa-solid fa-bolt-lightning", link: "reflex.html" },
            glitch: { title: "故障藝術生成器", desc: "創造賽博龐克風格的崩壞影像", icon: "fa-solid fa-bug", link: "glitch.html" },
            morse: { title: "摩斯電碼收發機", desc: "加密通訊與訊號解碼終端", icon: "fa-solid fa-teletype", link: "morse.html" },
            compress: { title: "極限圖片壓縮", desc: "大量圖片極致瘦身與打包", icon: "fa-solid fa-compress", link: "compress.html" },
            system: { title: "系統偵測儀", desc: "掃描您的裝置硬體與網路資訊", icon: "fa-solid fa-laptop-code", link: "system.html" },
            moto: { title: "重機停車地圖", desc: "尋找附近的重機友善停車點", icon: "fa-solid fa-motorcycle", link: "moto.html" },
            qrcode: { title: "QR Code 工廠", desc: "批量生成二維碼並下載", icon: "fa-solid fa-qrcode", link: "qrcode.html" },
            lottery: { title: "抽獎機", desc: "華麗煙火特效的抽獎工具", icon: "fa-solid fa-wand-magic-sparkles", link: "lottery.html" },
            youtube: { title: "Wrong World", desc: "前往觀看 Girls Band Cry 影片", icon: "fa-brands fa-youtube", link: "https://www.youtube.com/watch?v=YDLafQ-Rg-k" }
        }
    },

    // --- 3. 各頁面詳細設定 ---
    
    // 數據逃亡 (Runner)
    runner: {
        pageTitle: "CYBER RUNNER",
        desc: "越過紅色防火牆，不要停止傳輸。",
        btnStart: "開始逃亡",
        scorePrefix: "DISTANCE: ",
        highScorePrefix: "HI-SCORE: ",
        msgOver: "CONNECTION LOST",
        msgTips: "點擊螢幕 或 按空白鍵跳躍"
    },

    // 戰術打字 (Typing)
    typing: {
        pageTitle: "戰術打字終端",
        desc: "選擇語言模式，以最高速度完成指令輸入。",
        btnEn: "英文模式 (EN)",
        btnCh: "中文模式 (CH)",
        statTime: "耗時",
        statCount: "字數",
        statAcc: "準確率",
        statWpm: "速度 (WPM)",
        placeholder: "點擊此處開始輸入...",
        resultTitle: "任務完成",
        btnRetry: "再次訓練",
        samples: {
            en: [
                "The quick brown fox jumps over the lazy dog.",
                "Cyberpunk is a subgenre of science fiction in a dystopian futuristic setting.",
                "Wake up, Neo. The Matrix has you.",
                "High tech, low life.",
                "Information is power.",
                "It works on my machine.",
                "Hello World.",
                "System.out.println('Hello');"
            ],
            ch: [
                "錯的不是我，是這個世界。",
                "人類的本質就是複讀機。",
                "萬物皆虛，萬事皆允。",
                "科技始終來自於人性。",
                "解決問題的第一步，是承認問題的存在。",
                "天青色等煙雨，而我在等妳。"
            ]
        }
    },

    // 量子記憶 (Memory)
    memory: {
        pageTitle: "QUANTUM MEMORY",
        desc: "跟隨光訊號的順序，解鎖神經迴路。",
        btnStart: "開始記憶同步",
        levelPrefix: "LEVEL: ",
        msgFail: "同步失敗！",
        msgWatch: "觀察訊號...",
        msgRepeat: "請重複序列",
        bestScore: "最高同步層級："
    },

    // 防火牆 (Firewall)
    firewall: {
        pageTitle: "FIREWALL BREAKER",
        desc: "控制攔截板，觸發多重球分裂 (Multiball) 以擊碎防火牆。",
        btnStart: "啟動駭入程序",
        msgOver: "入侵失敗 - CONNECTION LOST",
        msgWin: "系統權限已取得 - ACCESS GRANTED"
    },

    // 神經反射 (Reflex)
    reflex: {
        pageTitle: "神經反射同步率測試",
        desc: "當信號變綠時，點擊螢幕或按下空白鍵 (Space)！",
        btnStart: "啟動神經連結",
        stateWait: "等待訊號... (紅色勿動)",
        stateGo: "點擊！點擊！點擊！",
        stateTooSoon: "太早了！同步失敗。",
        resultPrefix: "您的同步延遲：",
        ranks: { s: "S級：人工智慧", a: "A級：強化人類", b: "B級：普通人類", c: "C級：需要咖啡" }
    },

    // 壓縮 (Compress)
    compress: {
        pageTitle: "極限圖片壓縮",
        desc: "支援批次壓縮，手機端可直接預覽並長按儲存",
        dropText: "<strong>點擊選擇</strong> 或將圖片拖曳至此",
        btnCompressing: "正在壓縮...",
        btnDownloadZip: "下載 ZIP (電腦推薦)",
        btnDownloadAll: "逐張下載 (手機嘗試)",
        galleryTitle: "壓縮結果預覽",
        saveTip: "手機用戶請長按圖片儲存，或點擊單張下載"
    },

    // 故障藝術 (Glitch)
    glitch: {
        pageTitle: "故障藝術生成器",
        desc: "上傳圖片，應用數字崩壞特效。",
        uploadText: "點擊或拖曳圖片至此",
        btnGenerate: "生成故障特效",
        btnDownload: "下載影像",
        controls: { intensity: "崩壞強度", colorShift: "色彩偏移" }
    },

    // 摩斯 (Morse)
    morse: {
        pageTitle: "摩斯電碼收發機",
        desc: "在文字與點劃訊號間進行轉換。",
        labelInput: "輸入訊息 (文字或電碼)",
        labelOutput: "轉換結果",
        btnEncode: "加密 (文字→電碼)",
        btnDecode: "解碼 (電碼→文字)",
        btnPlay: "播放訊號音",
        placeholder: "例如: SOS 或 ... --- ..."
    },

    // 系統 (System)
    system: {
        pageTitle: "系統診斷中心 V3.0",
        statusScanning: "正在掃描系統核心...",
        statusReady: "監控系統已連線",
        labels: { os: "作業系統", browser: "瀏覽器核心", resolution: "螢幕解析度", language: "系統語言", cores: "邏輯處理器", memory: "記憶體估算", online: "網路狀態", connection: "連線類型" }
    },

    // 重機 (Moto)
    moto: {
        pageTitle: "重機停車地圖",
        searchPlaceholder: "搜尋台灣地址或關鍵字...",
        modalTitle: '<i class="fa-solid fa-square-parking"></i> 新增停車點',
        fields: { name: "停車場名稱", address: "停車場地址", friendly: "重機友善程度", plate: "車牌辨識方式", rate: "停車費率" },
        btnSubmit: "提交資料"
    },

    // 抽獎 (Lottery)
    lottery: {
        pageTitle: "抽獎機",
        labelNames: "輸入名單 (一行一個名字)",
        helperText: "目前共有 <span id='count'>5</span> 位參與者",
        btnStart: "開始抽獎",
        btnDrawing: "抽獎中...",
        btnAgain: "再次抽獎",
        defaultList: "範例一\n範例二\n範例三\n範例四\n範例五"
    },

    // QR Code
    qrcode: {
        pageTitle: "QR Code 批量工廠",
        desc: "輸入網址 (一行一個)，自動生成並打包下載",
        placeholder: "https://google.com\nhttps://facebook.com\n...",
        btnPreview: "生成預覽",
        btnDownload: "下載 ZIP"
    },
    
    // 商店 (隱藏)
    shop: {
        pageTitle: "SUPPLY DEPOT",
        desc: "手工皂與特製物資補給中心"
    }
};
