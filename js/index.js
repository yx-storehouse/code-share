// Main Index File - 主入口文件
import { init } from './modules/app.js'; // 导入app.js模块中的init初始化函数

// Initialize the application when DOM is ready - 当DOM加载完成时初始化应用
document.addEventListener('DOMContentLoaded', function() {
    init(); // 调用初始化函数启动应用
});