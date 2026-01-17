// js/loader.js
// 負責把資料 (content.js) 搬到畫面上

console.log("【Loader 啟動】正在準備載入卡片...");

document.addEventListener("DOMContentLoaded", () => {
    console.log("【Loader】網頁架構讀取完畢，開始尋找容器...");

    // 1. 抓取容器
    const grid = document.querySelector('.grid-container');
    
    // 2. 檢查是否有抓到
    if (!grid) {
        console.error("【嚴重錯誤】找不到 .grid-container！請檢查 index.html");
        return;
    }

    // 3. 檢查資料是否存在
    if (typeof siteContent === 'undefined') {
        console.error("【嚴重錯誤】找不到 siteContent！請確認 content.js 有正確載入");
        grid.innerHTML = '<p style="color:white;">系統資料讀取失敗</p>';
        return;
    }

    // 4. 清空容器並開始產生
    grid.innerHTML = '';
    let count = 0;

    Object.keys(siteContent).forEach(key => {
        if (key === 'common') return; // 跳過設定檔

        const item = siteContent[key];
        
        // 建立卡片
        const card = document.createElement('a');
        card.className = 'card';
        card.href = item.url || '#';
        card.setAttribute('data-aos', 'fade-up'); // 加入動畫屬性

        // 特殊樣式
        if (item.type === 'youtube') {
            card.classList.add('youtube-card');
            card.target = "_blank";
        }

        // 卡片內容
        card.innerHTML = `
            <div class="icon-box">
                <i class="${item.icon || 'fa-solid fa-gamepad'}"></i>
            </div>
            <h3>${item.title}</h3>
            <p>${item.desc}</p>
        `;

        grid.appendChild(card);
        count++;
    });

    console.log(`【Loader 成功】已產生 ${count} 張卡片！`);
});
