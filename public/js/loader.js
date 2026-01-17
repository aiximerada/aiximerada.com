document.addEventListener("DOMContentLoaded", () => {
    
    // 1. 處理文字 (HTML/Text)
    document.querySelectorAll("[data-i18n]").forEach(el => {
        const key = el.getAttribute("data-i18n");
        const val = getNestedValue(siteContent, key);
        if (val) el.innerHTML = val;
    });

    // 2. 處理連結 (href) - 關鍵！修復按鈕點擊問題
    document.querySelectorAll("[data-i18n-href]").forEach(el => {
        const key = el.getAttribute("data-i18n-href");
        const val = getNestedValue(siteContent, key);
        if (val) el.href = val;
    });

    // 3. 處理圖片來源 (src)
    document.querySelectorAll("[data-i18n-src]").forEach(el => {
        const key = el.getAttribute("data-i18n-src");
        const val = getNestedValue(siteContent, key);
        if (val) el.src = val;
    });

    // 4. 處理圖標樣式 (class)
    document.querySelectorAll("[data-i18n-icon]").forEach(el => {
        const key = el.getAttribute("data-i18n-icon");
        const val = getNestedValue(siteContent, key);
        if (val) el.className = val;
    });

    // 5. 處理 Placeholder
    document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
        const key = el.getAttribute("data-i18n-placeholder");
        const val = getNestedValue(siteContent, key);
        if (val) el.placeholder = val;
    });

    // 6. 處理 Value
    document.querySelectorAll("[data-i18n-value]").forEach(el => {
        const key = el.getAttribute("data-i18n-value");
        const val = getNestedValue(siteContent, key);
        if (val) el.value = val;
    });
});

// 輔助函式
function getNestedValue(obj, path) {
    if (!path) return null;
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
}
