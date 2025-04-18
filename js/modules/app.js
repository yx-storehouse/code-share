// Main Application Module - 主应用模块
import { loadCloudConfig } from './cloudManager.js';      // 导入云端配置管理函数
import { loadCategories } from './categoryManager.js';    // 导入分类管理函数
import { loadRepositories } from './repositoryManager.js'; // 导入仓库管理函数
import { checkAuth, updateUserOnlineStatus, setupAuthHandlers, showMembersModal, updateMembersUI, checkOnlineUsers } from './userManager.js'; // 导入用户管理相关函数
import { submitMessage, hideUploadModal, showUploadModal, setupSearch } from './messageManager.js'; // 导入消息管理相关函数
import { showToast } from '../utils/common.js'; // 导入通用工具函数

// Initialize the application - 初始化应用程序
export function init() {
    // Setup global functions - 设置全局函数
    window.checkAuth = checkAuth; // 将身份验证函数绑定到全局对象，以便在其他地方直接调用
    window.getRepositories = () => import('./repositoryManager.js').then(m => m.getRepositories()); // 动态导入仓库管理模块并返回获取仓库的函数
    
    // Set up event listeners - 设置事件监听器
    setupEventListeners();
    
    // Check if user is logged in - 检查用户是否已登录
    if (checkAuth()) {
        // Load cloud configuration - 加载云端配置
        loadCloudConfig();
        // 上线用户 - 将用户标记为在线状态
        updateUserOnlineStatus(true);
        
        // Setup timers - 设置定时器
        setupTimers();
    }
}

// Setup event listeners - 设置事件监听器
function setupEventListeners() {
    // Setup auth handlers - 设置认证相关的处理器
    setupAuthHandlers();
    
    // Setup search functionality - 设置搜索功能
    setupSearch();
    
    // Set up custom event listeners - 设置自定义事件监听器
    window.addEventListener('configChanged', () => {
        // 当配置改变时，保存到云端
        import('./cloudManager.js').then(m => m.saveCloudConfig());
    });
    
    window.addEventListener('repositoryChanged', (e) => {
        // 当仓库改变时，选择新的仓库
        import('./repositoryManager.js').then(m => {
            m.selectRepository(e.detail);
        });
    });
    
    window.addEventListener('categorySelected', (e) => {
        // 当分类选择改变时，重新渲染对应分类的仓库
        import('./repositoryManager.js').then(m => {
            m.renderRepositoriesByCategory();
        });
    });
    
    window.addEventListener('showMembersModal', (e) => {
        // 当需要显示成员管理模态框时
        showMembersModal(e.detail);
    });
    
    window.addEventListener('updateMembersUI', (e) => {
        // 当需要更新成员UI时
        updateMembersUI(e.detail);
    });
    
    // Setup modal button listeners - 设置模态框按钮监听器
    
    // 上传代码按钮点击事件
    document.getElementById('uploadBtn')?.addEventListener('click', function() {
        if (checkAuth()) {
            showUploadModal();
        }
    });
    
    // 关闭上传模态框按钮点击事件
    document.getElementById('closeUploadModal')?.addEventListener('click', function() {
        hideUploadModal();
    });
    
    // 提交代码按钮点击事件
    document.getElementById('submit')?.addEventListener('click', submitMessage);
    
    // 添加仓库按钮点击事件
    document.getElementById('addRepoBtn')?.addEventListener('click', function() {
        if (checkAuth()) {
            import('./repositoryManager.js').then(m => m.showNewRepoModal());
        }
    });
    
    // 关闭新建仓库模态框按钮点击事件
    document.getElementById('closeNewRepoModal')?.addEventListener('click', function() {
        import('./repositoryManager.js').then(m => m.hideNewRepoModal());
    });
    
    // 创建仓库按钮点击事件
    document.getElementById('createRepoBtn')?.addEventListener('click', function() {
        // 获取表单数据
        const repoName = document.getElementById('repoName').value.trim();
        const repoDescription = document.getElementById('repoDescription').value.trim();
        const categorySelect = document.getElementById('repoCategorySelect');
        const categoryId = categorySelect ? categorySelect.value : null;
        
        // 验证仓库名称不能为空
        if (!repoName) {
            showToast('仓库名称不能为空', 'error');
            return;
        }
        
        // 创建仓库并清空表单
        import('./repositoryManager.js').then(m => {
            m.createRepository(repoName, repoDescription, categoryId);
            m.hideNewRepoModal();
            
            // Clear form - 清空表单
            document.getElementById('repoName').value = '';
            document.getElementById('repoDescription').value = '';
        });
    });
    
    // 添加分类按钮点击事件
    document.getElementById('addCategoryBtn')?.addEventListener('click', function() {
        if (checkAuth()) {
            import('./categoryManager.js').then(m => m.showCategoryModal());
        }
    });
    
    // 关闭分类模态框按钮点击事件
    document.getElementById('closeCategoryModal')?.addEventListener('click', function() {
        import('./categoryManager.js').then(m => m.hideCategoryModal());
    });
    
    // 创建分类按钮点击事件
    document.getElementById('createCategoryBtn')?.addEventListener('click', function() {
        const categoryName = document.getElementById('categoryName').value.trim();
        
        // 验证分类名称不能为空
        if (!categoryName) {
            showToast('分类名称不能为空', 'error');
            return;
        }
        
        // 创建分类、关闭模态框并选择新创建的分类
        import('./categoryManager.js').then(m => {
            const newCategory = m.createCategory(categoryName);
            m.hideCategoryModal();
            
            // Clear form and select the new category - 清空表单并选择新创建的分类
            document.getElementById('categoryName').value = '';
            m.selectCategory(newCategory);
        });
    });
    
    // 成员管理模态框关闭按钮点击事件
    document.getElementById('closeMembersModal')?.addEventListener('click', function() {
        document.getElementById('membersModal').classList.remove('show');
    });
    
    // 添加成员按钮点击事件
    document.getElementById('addMemberBtn')?.addEventListener('click', function() {
        const username = document.getElementById('newMemberUsername').value.trim();
        
        // 验证用户名不能为空
        if (!username) {
            showToast('用户名不能为空', 'error');
            return;
        }
        
        // 添加成员并清空输入框
        import('./repositoryManager.js').then(m => {
            import('./userManager.js').then(u => {
                u.addMember(m.getCurrentRepo(), username);
                document.getElementById('newMemberUsername').value = '';
            });
        });
    });
    
    // 窗口关闭事件，更新用户离线状态
    window.addEventListener('beforeunload', function() {
        if (window.currentUser) {
            // 这里不使用promise，因为页面即将关闭
            updateUserOnlineStatus(false);
        }
    });
    
    // 分类编辑模态框事件
    // 关闭按钮点击事件
    document.getElementById('closeCategoryEditModal')?.addEventListener('click', function() {
        import('./categoryManager.js').then(m => m.hideCategoryEditModal());
    });
    
    // 取消按钮点击事件
    document.getElementById('cancelEditCategory')?.addEventListener('click', function() {
        import('./categoryManager.js').then(m => m.hideCategoryEditModal());
    });
    
    // 保存按钮点击事件
    document.getElementById('saveCategory')?.addEventListener('click', function() {
        import('./categoryManager.js').then(m => m.updateCategory());
    });
    
    // 仓库编辑模态框事件
    // 关闭按钮点击事件
    document.getElementById('closeRepoEditModal')?.addEventListener('click', function() {
        import('./repositoryManager.js').then(m => m.hideRepoEditModal());
    });
    
    // 取消按钮点击事件
    document.getElementById('cancelEditRepo')?.addEventListener('click', function() {
        import('./repositoryManager.js').then(m => m.hideRepoEditModal());
    });
    
    // 保存按钮点击事件
    document.getElementById('saveRepo')?.addEventListener('click', function() {
        import('./repositoryManager.js').then(m => m.updateRepository());
    });
    
    // Close modals when clicking outside - 点击模态框外部区域关闭模态框
    window.addEventListener('click', function(event) {
        const uploadModal = document.getElementById('uploadModal');
        const newRepoModal = document.getElementById('newRepoModal');
        const categoryModal = document.getElementById('categoryModal');
        
        // 如果点击的是上传模态框的外部，则关闭模态框
        if (event.target === uploadModal) {
            hideUploadModal();
        }
        
        // 如果点击的是新建仓库模态框的外部，则关闭模态框
        if (event.target === newRepoModal) {
            import('./repositoryManager.js').then(m => m.hideNewRepoModal());
        }
        
        // 如果点击的是分类模态框的外部，则关闭模态框
        if (event.target === categoryModal) {
            import('./categoryManager.js').then(m => m.hideCategoryModal());
        }
    });

    // Keyboard shortcuts - 键盘快捷键
    document.addEventListener('keydown', function(e) {
        // Ctrl+Enter to submit code when upload modal is open - 在上传模态框打开时，按Ctrl+Enter提交代码
        if (e.ctrlKey && e.key === 'Enter' && document.getElementById('uploadModal').classList.contains('show')) {
            document.getElementById('submit').click();
        }
        
        // Escape to close modals - 按Escape键关闭模态框
        if (e.key === 'Escape') {
            hideUploadModal();
            
            import('./repositoryManager.js').then(m => m.hideNewRepoModal());
            import('./categoryManager.js').then(m => m.hideCategoryModal());
        }
    });

    // 移动端侧边栏切换按钮事件
    document.getElementById('mobileSidebarToggle')?.addEventListener('click', function() {
        const sidebar = document.querySelector('.sidebar');
        const toggleBtn = document.getElementById('mobileSidebarToggle');
        
        // 切换侧边栏的展开/收起状态
        sidebar.classList.toggle('expanded');
        toggleBtn.classList.toggle('active');
        
        // 更新按钮文本
        const buttonText = toggleBtn.querySelector('span');
        if (sidebar.classList.contains('expanded')) {
            buttonText.textContent = '收起菜单';
        } else {
            buttonText.textContent = '展开菜单';
        }
    });
    
    // 初始化时检查是否为移动设备，设置默认状态
    function checkMobileView() {
        const sidebar = document.querySelector('.sidebar');
        const toggleBtn = document.getElementById('mobileSidebarToggle');
        
        if (window.innerWidth <= 768) {
            // 移动设备上默认收起侧边栏
            sidebar.classList.remove('expanded');
            
            // 确保没有内联样式影响
            sidebar.removeAttribute('style');
            
            if (toggleBtn) {
                // 在移动设备上确保按钮显示正确状态
                toggleBtn.classList.remove('active');
                const buttonText = toggleBtn.querySelector('span');
                if (buttonText) {
                    buttonText.textContent = '展开菜单';
                }
            }
        } else {
            // 非移动设备上重置为默认样式
            sidebar.classList.remove('expanded');
            
            // 确保没有内联样式影响
            sidebar.removeAttribute('style');
        }
    }
    
    // 初次检查移动视图
    checkMobileView();
    
    // 窗口大小变化时重新检查
    window.addEventListener('resize', checkMobileView);
}

// Setup timers - 设置定时器
function setupTimers() {
    // 定时更新用户在线状态和检查在线用户 - 每分钟更新一次
    setInterval(function() {
        if (window.currentUser) {
            updateUserOnlineStatus(true);
            checkOnlineUsers();
        }
    }, 60000); // 每分钟更新一次

    // 定时刷新消息 - 每5秒刷新一次
    setInterval(function() {
        if (window.currentUser) {
            import('./repositoryManager.js').then(m => {
                if (m.getCurrentRepo()) {
                    import('./messageManager.js').then(msg => msg.loadMessages());
                }
            });
        }
    }, 5000);
} 