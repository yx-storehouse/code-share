// Utility functions - 通用工具函数

// UTF-8 to Base64 - 将UTF-8字符串转换为Base64编码
export function utf8_to_b64(str) {
    return window.btoa(unescape(encodeURIComponent(str))); // 先将UTF-8编码为URI组件，然后解码URI编码，最后转为Base64
}

// Base64 to UTF-8 - 将Base64编码转换回UTF-8字符串
export function b64_to_utf8(str) {
    try {
        // 确保输入是有效的Base64字符串 - 移除可能出现的空格和换行符
        const cleanStr = str.replace(/\s/g, '');
        
        // 检查是否为有效的Base64编码 - 只包含合法Base64字符
        if (!/^[A-Za-z0-9+/=]+$/.test(cleanStr)) {
            console.error('Invalid Base64 string:', cleanStr.substring(0, 50) + '...');
            return '[]'; // 返回空数组字符串作为默认值
        }
        
        // 解码Base64为UTF-8字符串
        return decodeURIComponent(escape(window.atob(cleanStr)));
    } catch (error) {
        console.error('Base64 decode error:', error);
        return '[]'; // 出错时返回空数组字符串
    }
}

// Show loading overlay - 显示加载覆盖层
export function showLoading() {
    document.getElementById('loading').classList.add('show'); // 给加载元素添加show类以显示加载动画
}

// Hide loading overlay - 隐藏加载覆盖层
export function hideLoading() {
    document.getElementById('loading').classList.remove('show'); // 移除加载元素的show类以隐藏加载动画
}

// Show toast notification - 显示提示消息通知
export function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    if (toast) {
        toast.querySelector('p').textContent = message; // 设置提示消息内容
        toast.className = 'toast';                      // 重置toast的类名
        toast.classList.add(type);                      // 添加类型（success或error）
        toast.classList.add('show');                    // 显示toast
        
        // Update icon - 根据类型更新图标
        const icon = toast.querySelector('svg');
        if (type === 'success') {
            // 成功图标 - 对勾图标
            icon.innerHTML = '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>';
        } else {
            // 错误图标 - 感叹号图标
            icon.innerHTML = '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>';
        }
        
        // 3秒后自动隐藏toast
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
}

// Get language icon - 获取编程语言对应的图标SVG
export function getLanguageIcon(language) {
    // 不同编程语言的图标定义
    const icons = {
        html: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>',
        javascript: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 4v16H4V4h16z M12 15v-2 M8 9h2v10 M16 11c0-1.1-.9-2-2-2s-2 .9-2 2v2c0 1.1.9 2 2 2s2-.9 2-2"></path></svg>',
        css: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 2l16 0 M4 22l16 0 M12 2l0 20"></path></svg>',
        python: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9H5a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h3"></path><path d="M12 15h7a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3"></path><path d="M8 9V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-4"></path><path d="M11 6v.01"></path><path d="M13 18v.01"></path></svg>',
        java: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12.5c1-1 2.5-1.5 4-1.5 3 0 4 1.5 6 1.5 1.5 0 3-.5 4-1.5"></path><path d="M2 16.5c1-1 2.5-1.5 4-1.5 3 0 4 1.5 6 1.5 1.5 0 3-.5 4-1.5"></path><path d="M9.5 10a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z"></path><path d="M14.5 4.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z"></path></svg>',
        csharp: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 3v18 M14 7l-4 4-4-4"></path></svg>'
    };
    // 返回对应语言的图标，如果没有找到则返回html图标作为默认值
    return icons[language] || icons.html;
} 