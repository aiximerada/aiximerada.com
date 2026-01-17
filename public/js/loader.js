// js/loader.js
// 負責讀取 siteContent 並產生卡片

document.addEventListener("DOMContentLoaded", () => {
    // 1. 嘗試抓取容器 (相容 class 和 id)
    const grid = document.querySelector('.grid-container') || document.getElementById('grid');
    
    // 2. 檢查資料是否存在
    if (!grid) {
        console.error("錯誤：找不到 .grid-container 容器，無法產生卡片");
        return;
    }
    if (typeof siteContent === 'undefined') {
        console.error("錯誤：找不到 siteContent 資料，請檢查 content.js");
        return;
    }

    // 3. 清空容器 (避免重複)
    grid.innerHTML = '';

    // 4. 產生卡片
    // 遍歷 siteContent 裡面的每一個類別 (例如 binary, soap...)
    Object.keys(siteContent).forEach(key => {
        // 略過 common 設定檔
        if (key === 'common') return;

        const item = siteContent[key];
        
        // 建立卡片連結
        const card = document.createElement('a');
        card.className = 'card';
        card.href = item.url || '#';
        
        // 如果有 AOS 動畫庫，加入動畫屬性
        card.setAttribute('data-aos', 'fade-up');

        // 特殊卡片樣式 (例如 YouTube)
        if (item.type === 'youtube') {
            card.classList.add('youtube-card');
            card.target = "_blank"; // 在新分頁開啟
        }

        // 卡片內部 HTML
        card.innerHTML = `
            <div class="icon-box">
                <i class="${item.icon || 'fa-solid fa-gamepad'}"></i>
            </div>
            <h3>${item.title}</h3>
            <p>${item.desc}</p>
        `;

        // 放入容器
        grid.appendChild(card);
    });

    console.log("卡片載入完成！");
});
