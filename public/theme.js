// public/theme.js
(function applyGlobalTheme() {
    // ⭐ 設定您的圖示網址 (以後只要改這裡，全站都會變)
    const FAVICON_URL = "https://cdn-icons-png.flaticon.com/512/1828/1828884.png";

    // 自動注入或更新 Favicon
    let link = document.querySelector("link[rel*='icon']");
    if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
    }
    link.type = 'image/png';
    link.href = FAVICON_URL;

    // (選用) 您也可以在這裡統一設定網頁標題後綴，例如 " - 玉露寶庫"
    // if (document.title && !document.title.includes("玉露寶庫")) {
    //     document.title += " - 玉露寶庫";
    // }
})();