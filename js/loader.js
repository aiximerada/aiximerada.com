// js/loader.js
// 3.0 智慧分流版：自動識別頁面並載入對應內容

document.addEventListener("DOMContentLoaded", () => {
    // 嘗試抓取頁面上的容器 ID
    const entGrid = document.getElementById('entertainment-grid');
    const toolsGrid = document.getElementById('tools-grid');

    // 檢查資料庫是否存在
    if (typeof siteContent === 'undefined') {
        console.error("錯誤：找不到 siteContent 資料庫");
        return;
    }

    // --- 情況 A：如果在【娛樂頁】 (偵測到 entertainment-grid) ---
    if (entGrid && siteContent.entertainment) {
        console.log("正在載入娛樂功能...");
        entGrid.innerHTML = ''; // 清空預設內容
        siteContent.entertainment.forEach(item => {
            createCard(entGrid, item);
        });
    }

    // --- 情況 B：如果在【工具頁】 (偵測到 tools-grid) ---
    if (toolsGrid && siteContent.tools) {
        console.log("正在載入工具功能...");
        toolsGrid.innerHTML = ''; // 清空預設內容
        siteContent.tools.forEach(item => {
            createCard(toolsGrid, item);
        });
    }

    // --- 通用函數：製造卡片 HTML ---
    function createCard(container, item) {
        const link = document.createElement('a');
        link.className = 'card';
        link.href = item.url || '#';
        
        // 加入 AOS 動畫效果
        link.setAttribute('data-aos', 'fade-up');

        link.innerHTML = `
            <div class="icon-box">
                <i class="${item.icon}"></i>
            </div>
            <h3>${item.title}</h3>
            <p>${item.desc}</p>
        `;
        container.appendChild(link);
    }
});
