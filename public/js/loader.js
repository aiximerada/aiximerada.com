// js/loader.js
// 3.0 分流版搬運工：根據所在頁面載入不同內容

document.addEventListener("DOMContentLoaded", () => {
    // 取得頁面上的容器 (如果有的話)
    const entGrid = document.getElementById('entertainment-grid');
    const toolsGrid = document.getElementById('tools-grid');

    if (!siteContent) return;

    // --- 情況 A: 如果現在是【娛樂頁】 ---
    if (entGrid && siteContent.entertainment) {
        siteContent.entertainment.forEach(item => {
            createCard(entGrid, item);
        });
    }

    // --- 情況 B: 如果現在是【工具頁】 ---
    if (toolsGrid && siteContent.tools) {
        siteContent.tools.forEach(item => {
            createCard(toolsGrid, item);
        });
    }

    // 通用函數：產生小卡片
    function createCard(container, item) {
        const link = document.createElement('a');
        link.className = 'card';
        link.href = item.url;
        link.innerHTML = `
            <i class="${item.icon}"></i>
            <h3>${item.title}</h3>
            <p>${item.desc}</p>
        `;
        container.appendChild(link);
    }
});
