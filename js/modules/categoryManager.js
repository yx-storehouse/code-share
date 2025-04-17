// 分类管理模块
import config from '../config/config.js';
import { showToast, showLoading, hideLoading } from '../utils/common.js';
import { saveCloudConfig } from './cloudManager.js';

let categories = [];
let currentCategory = null;

// 加载分类
export function loadCategories() {
    // 分类数据已在 loadCloudConfig 中加载
    renderCategories();
}

// 获取分类数据
export function getCategories() {
    return categories;
}

// 设置分类数据
export function setCategories(data) {
    categories = data;
}

// 获取当前选中的分类
export function getCurrentCategory() {
    return currentCategory;
}

// 设置当前选中的分类
export function setCurrentCategory(category) {
    currentCategory = category;
}

// 在侧边栏渲染分类
export function renderCategories() {
    const categoryContainer = document.getElementById('categoryContainer');
    if (!categoryContainer) return;
    
    categoryContainer.innerHTML = '';
    
    // 添加"添加分类"按钮（仅管理员可见）
    if (window.isAdmin) {
        const addCategoryBtn = document.createElement('button');
        addCategoryBtn.className = 'add-category-btn';
        addCategoryBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            添加分类
        `;
        addCategoryBtn.addEventListener('click', () => {
            if (window.checkAuth()) {
                showCategoryModal();
            }
        });
        categoryContainer.appendChild(addCategoryBtn);
    }
    
    if (categories.length === 0) {
        const noCategories = document.createElement('div');
        noCategories.className = 'no-categories';
        noCategories.textContent = '暂无分类';
        categoryContainer.appendChild(noCategories);
        return;
    }
    
    categories.forEach(category => {
        const div = document.createElement('div');
        div.className = 'category-item';
        div.dataset.id = category.id;
        
        // 创建内容容器
        const contentDiv = document.createElement('div');
        contentDiv.className = 'category-content';
        
        // 添加分类名称
        const nameSpan = document.createElement('span');
        nameSpan.className = 'category-name';
        nameSpan.textContent = category.name;
        contentDiv.appendChild(nameSpan);
        
        // 如果是管理员，并且不是"全部"分类，添加操作按钮
        if (window.isAdmin && category.id !== 'all') {
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'category-actions';
            
            // 添加编辑按钮
            const editBtn = document.createElement('button');
            editBtn.className = 'action-btn edit-btn';
            editBtn.title = '编辑分类';
            editBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
            `;
            
            // 添加删除按钮
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'action-btn delete-btn';
            deleteBtn.title = '删除分类';
            deleteBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
            `;
            
            // 添加按钮到操作区域
            actionsDiv.appendChild(editBtn);
            actionsDiv.appendChild(deleteBtn);
            contentDiv.appendChild(actionsDiv);
            
            // 为按钮添加点击事件
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                showCategoryEditModal(category);
            });
            
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm(`确定要删除分类"${category.name}"吗？`)) {
                    deleteCategory(category.id);
                }
            });
        }
        
        div.appendChild(contentDiv);
        
        // 为分类项添加点击事件
        div.addEventListener('click', () => {
            selectCategory(category);
        });
        
        // 如果是当前选中的分类，添加激活状态
        if (currentCategory && currentCategory.id === category.id) {
            div.classList.add('active');
        }
        
        categoryContainer.appendChild(div);
    });
}

// 选择分类
export function selectCategory(category) {
    if (!category) return;
    
    console.log('Selecting category:', category);
    currentCategory = category;
    
    // 更新激活的分类
    document.querySelectorAll('.category-item').forEach(item => {
        if (item.dataset.id === category.id) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
    
    // 强制重新渲染仓库列表，确保UI更新
    // 这将由仓库模块处理
    window.dispatchEvent(new CustomEvent('categorySelected', { detail: category }));
}

// 创建新分类
export function createCategory(name) {
    // 检查管理员权限
    if (!checkAdminPermission()) {
        showToast('需要管理员权限才能创建分类', 'error');
        return null;
    }
    
    const id = 'category_' + Date.now();
    
    const newCategory = {
        id,
        name
    };
    
    categories.push(newCategory);
    
    // 保存到云端
    saveCloudConfig();
    
    // 更新UI
    renderCategories();
    
    return newCategory;
}

// 显示分类模态框
export function showCategoryModal() {
    const categoryModal = document.getElementById('categoryModal');
    categoryModal.classList.add('show');
}

// 隐藏分类模态框
export function hideCategoryModal() {
    const categoryModal = document.getElementById('categoryModal');
    categoryModal.classList.remove('show');
}

// 删除分类
export function deleteCategory(categoryId) {
    if (!checkAdminPermission()) return;
    
    if (categoryId === 'all') {
        showToast('不能删除"全部"分类', 'error');
        return;
    }
    
    // 检查是否有仓库使用此分类
    const repositories = window.getRepositories();
    const hasRepos = repositories.some(repo => repo.categoryId === categoryId);
    if (hasRepos) {
        showToast('请先删除或移动该分类下的仓库', 'error');
        return;
    }
    
    categories = categories.filter(c => c.id !== categoryId);
    saveCloudConfig();
    renderCategories();
    showToast('分类删除成功', 'success');
}

// 显示分类编辑模态框
export function showCategoryEditModal(category) {
    const modal = document.getElementById('categoryEditModal');
    if (!modal) return;
    
    // 填充表单
    document.getElementById('editCategoryName').value = category.name;
    document.getElementById('editCategoryId').value = category.id;
    
    // 显示模态框
    modal.classList.add('show');
}

// 隐藏分类编辑模态框
export function hideCategoryEditModal() {
    const modal = document.getElementById('categoryEditModal');
    if (modal) {
        modal.classList.remove('show');
    }
}

// 更新分类
export function updateCategory() {
    if (!checkAdminPermission()) return;
    
    const id = document.getElementById('editCategoryId').value;
    const name = document.getElementById('editCategoryName').value.trim();
    
    if (!name) {
        showToast('分类名称不能为空', 'error');
        return;
    }
    
    const category = categories.find(c => c.id === id);
    if (category) {
        category.name = name;
        saveCloudConfig();
        renderCategories();
        hideCategoryEditModal();
        showToast('分类更新成功', 'success');
    }
}

// 检查管理员权限
function checkAdminPermission() {
    if (!window.isAdmin) {
        showToast('需要管理员权限', 'error');
        return false;
    }
    return true;
}