// 仓库管理模块
import config from '../config/config.js';
import { showToast, showLoading, hideLoading } from '../utils/common.js';
import { saveCloudConfig, createEmptyFile } from './cloudManager.js';
import { getCategories, getCurrentCategory } from './categoryManager.js';
import { loadMessages } from './messageManager.js';

let repositories = [];
let currentRepo = null;

// 获取仓库数据
export function getRepositories() {
    return repositories;
}

// 设置仓库数据
export function setRepositories(data) {
    repositories = data;
}

// 获取当前仓库
export function getCurrentRepo() {
    return currentRepo;
}

// 设置当前仓库
export function setCurrentRepo(repo) {
    currentRepo = repo;
}

// 修复仓库与分类的关联关系
export function fixRepositoryCategoryLinks() {
    // 获取所有有效的分类ID
    const categories = getCategories();
    const validCategoryIds = categories.map(c => c.id);
    
    // 修复仓库的分类ID
    repositories.forEach(repo => {
        // 如果仓库的分类ID不存在于当前分类列表中，将其设置为第一个非"全部"的分类
        if (repo.categoryId !== 'all' && !validCategoryIds.includes(repo.categoryId)) {
            const defaultCategory = categories.find(c => c.id !== 'all') || categories[0];
            repo.categoryId = defaultCategory.id;
            console.log(`Fixed repository ${repo.name} category to ${defaultCategory.name}`);
        }
        
        // 确保仓库有members和createdBy字段
        if (!repo.members) {
            repo.members = repo.createdBy ? [repo.createdBy] : [];
        }
        
        if (!repo.createdBy && window.currentUser) {
            repo.createdBy = window.currentUser.username;
        }
    });
}

// 加载仓库
export function loadRepositories() {
    // 仓库已在loadCloudConfig中加载
    renderRepositoriesByCategory();
}

// 按分类渲染仓库
export function renderRepositoriesByCategory() {
    const currentCategory = getCurrentCategory();
    if (!currentCategory) return;
    
    const repoList = document.getElementById('repoList');
    if (!repoList) return;
    
    repoList.innerHTML = '';
    
    // 记录筛选前后的仓库数量，用于调试
    const allReposCount = repositories.length;
    
    // 筛选仓库
    const filteredRepositories = currentCategory.id === 'all' ? 
        repositories : 
        repositories.filter(repo => repo.categoryId === currentCategory.id);
    
    console.log(`Rendering repositories: All=${allReposCount}, Filtered=${filteredRepositories.length}, Category=${currentCategory.name}(${currentCategory.id})`);
        
    if (filteredRepositories.length === 0) {
        const noRepos = document.createElement('div');
        noRepos.className = 'no-repos';
        noRepos.innerHTML = `
            <p>当前分类下暂无仓库</p>
            <button class="add-repo-btn-small" id="addRepoInCategory">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                创建仓库
            </button>
        `;
        repoList.appendChild(noRepos);
        
        // 为分类为空时的"添加仓库"按钮添加事件监听器
        document.getElementById('addRepoInCategory')?.addEventListener('click', function() {
            if (window.checkAuth()) {
                showNewRepoModal();
            }
        });
        
        return;
    }
    
    // 渲染仓库列表
    filteredRepositories.forEach(repo => {
        const li = document.createElement('li');
        li.className = 'repo-item';
        li.dataset.id = repo.id;
        
        // 创建仓库信息容器
        const repoInfo = document.createElement('div');
        repoInfo.className = 'repo-info';
        
        // 显示仓库成员数量
        const memberCount = repo.members ? repo.members.length : 0;
        
        // 添加仓库图标和名称
        repoInfo.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
            </svg>
            <span class="repo-name">${repo.name}</span>
            <span class="repo-member-count" title="${memberCount}个成员">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
                ${memberCount}
            </span>
        `;
        
        li.appendChild(repoInfo);
        
        // 如果是管理员或仓库创建者，添加操作按钮
        if (window.isAdmin || (repo.createdBy && window.currentUser && window.currentUser.username === repo.createdBy)) {
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'repo-actions';
            
            // 添加成员管理按钮
            const membersBtn = document.createElement('button');
            membersBtn.className = 'action-btn members-btn';
            membersBtn.title = '管理成员';
            membersBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
            `;
            
            // 添加编辑按钮
            const editBtn = document.createElement('button');
            editBtn.className = 'action-btn edit-btn';
            editBtn.title = '编辑仓库';
            editBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
            `;
            
            // 添加删除按钮
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'action-btn delete-btn';
            deleteBtn.title = '删除仓库';
            deleteBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
            `;
            
            // 添加按钮到操作区域
            actionsDiv.appendChild(membersBtn);
            actionsDiv.appendChild(editBtn);
            actionsDiv.appendChild(deleteBtn);
            li.appendChild(actionsDiv);
            
            // 添加按钮点击事件
            membersBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                window.dispatchEvent(new CustomEvent('showMembersModal', { detail: repo }));
            });
            
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                showRepoEditModal(repo);
            });
            
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm(`确定要删除仓库"${repo.name}"吗？`)) {
                    deleteRepository(repo.id);
                }
            });
        }
        
        // 添加仓库项点击事件
        li.addEventListener('click', () => {
            selectRepository(repo);
        });
        
        repoList.appendChild(li);
    });
    
    // 如果当前选中的仓库在筛选列表中，保持其高亮状态
    if (currentRepo && filteredRepositories.some(r => r.id === currentRepo.id)) {
        const activeItem = document.querySelector(`.repo-item[data-id="${currentRepo.id}"]`);
        if (activeItem) {
            activeItem.classList.add('active');
        }
    }
}

// 渲染仓库在侧边栏
export function renderRepositories() {
    renderRepositoriesByCategory();
}

// 选择仓库
export function selectRepository(repo) {
    currentRepo = repo;
    
    // 准备仓库信息
    const createdByInfo = repo.createdBy ? `创建者: ${repo.createdBy}` : '';
    const createdAtInfo = repo.createdAt ? `创建时间: ${repo.createdAt}` : '';
    const membersCount = repo.members ? repo.members.length : 1;
    
    // 更新UI
    document.getElementById('currentRepoName').innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
        </svg>
        ${repo.name}
        <div class="repo-details">
            <span class="repo-detail-item">${createdByInfo}</span>
            <span class="repo-detail-item">${createdAtInfo}</span>
            <span class="repo-member-count">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
                ${membersCount}个成员
            </span>
        </div>
    `;
    
    // 显示成员管理按钮（如果当前用户是创建者）
    const repoHeader = document.querySelector('.repo-header');
    const manageMembersBtn = document.querySelector('#manageMembersBtn');
    
    if (window.isAdmin || (repo.createdBy && window.currentUser && window.currentUser.username === repo.createdBy)) {
        if (!manageMembersBtn) {
            const manageMembersButton = document.createElement('button');
            manageMembersButton.id = 'manageMembersBtn';
            manageMembersButton.className = 'manage-members-btn';
            manageMembersButton.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
                管理成员
            `;
            manageMembersButton.addEventListener('click', () => window.dispatchEvent(new CustomEvent('showMembersModal', { detail: repo })));
            repoHeader.appendChild(manageMembersButton);
        }
    } else if (manageMembersBtn) {
        manageMembersBtn.remove();
    }
    
    // 更新侧边栏中激活的仓库
    document.querySelectorAll('.repo-item').forEach(item => {
        if (item.dataset.id === repo.id) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
    
    // 加载此仓库的消息
    loadMessages();
    
    // 更新仓库成员列表
    window.dispatchEvent(new CustomEvent('updateMembersUI', { detail: repo }));
}

// 创建新仓库
export function createRepository(name, description, categoryId) {
    // 确保有有效的分类ID
    let validCategoryId = categoryId;
    const categories = getCategories();
    const currentCategory = getCurrentCategory();
    
    // 验证分类ID是否有效
    if (!validCategoryId || !categories.some(c => c.id === validCategoryId)) {
        // 如果当前分类不是"全部"且有效，则使用它
        if (currentCategory && currentCategory.id !== 'all' && 
            categories.some(c => c.id === currentCategory.id)) {
            validCategoryId = currentCategory.id;
        } else {
            // 否则找到第一个非"全部"的分类
            const firstNonAllCategory = categories.find(c => c.id !== 'all');
            validCategoryId = firstNonAllCategory ? firstNonAllCategory.id : 'other';
        }
    }
    
    // 显示所选分类，方便调试
    console.log(`创建仓库 ${name} 到分类 ${validCategoryId}`);
    
    const id = 'repo_' + Date.now();
    const filePath = `${id}.json`;
    
    const newRepo = {
        id,
        name,
        description,
        filePath,
        owner: config.repoOwner,
        repoName: config.cloudRepoName,
        categoryId: validCategoryId,
        members: [window.currentUser.username], // 添加创建者作为成员
        createdBy: window.currentUser.username,
        createdAt: new Date().toLocaleString()
    };
    
    repositories.push(newRepo);
    
    // 保存到云端
    saveCloudConfig();
    
    // 在Gitee上创建空文件
    createEmptyFile(newRepo);
    
    // 更新UI
    renderRepositoriesByCategory();
    selectRepository(newRepo);
    
    return newRepo;
}

// 显示新仓库模态框
export function showNewRepoModal() {
    const newRepoModal = document.getElementById('newRepoModal');
    const categories = getCategories();
    const currentCategory = getCurrentCategory();
    
    // 填充分类下拉框
    const categorySelect = document.getElementById('repoCategorySelect');
    if (categorySelect) {
        categorySelect.innerHTML = '';
        categories.filter(c => c.id !== 'all').forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            
            // 如果当前分类不是"全部"，则选择它
            if (currentCategory && currentCategory.id !== 'all' && currentCategory.id === category.id) {
                option.selected = true;
            }
            
            categorySelect.appendChild(option);
        });
    }
    
    newRepoModal.classList.add('show');
}

// 隐藏新仓库模态框
export function hideNewRepoModal() {
    const newRepoModal = document.getElementById('newRepoModal');
    newRepoModal.classList.remove('show');
}

// 删除仓库
export function deleteRepository(repoId) {
    if (!checkAdminPermission()) return;
    
    const repo = repositories.find(r => r.id === repoId);
    if (!repo) return;
    
    // 删除仓库文件
    fetch(`https://gitee.com/api/v5/repos/${repo.owner}/${repo.repoName}/contents/${repo.filePath}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `token ${config.accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            message: `删除仓库 ${repo.name}`,
            sha: repo.sha,
            branch: 'master'
        })
    })
    .then(() => {
        // 从配置中移除仓库
        repositories = repositories.filter(r => r.id !== repoId);
        saveCloudConfig();
        renderRepositoriesByCategory();
        showToast('仓库删除成功', 'success');
    })
    .catch(error => {
        console.error('Error:', error);
        showToast('仓库删除失败', 'error');
    });
}

// 显示仓库编辑模态框
export function showRepoEditModal(repo) {
    const modal = document.getElementById('repoEditModal');
    if (!modal) return;
    
    // 填充表单
    document.getElementById('editRepoName').value = repo.name;
    document.getElementById('editRepoDescription').value = repo.description || '';
    document.getElementById('editRepoId').value = repo.id;
    
    // 填充分类选择
    const categorySelect = document.getElementById('editRepoCategory');
    const categories = getCategories();
    
    if (categorySelect) {
        categorySelect.innerHTML = '';
        categories.filter(c => c.id !== 'all').forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            if (category.id === repo.categoryId) {
                option.selected = true;
            }
            categorySelect.appendChild(option);
        });
    }
    
    // 显示模态框
    modal.classList.add('show');
}

// 隐藏仓库编辑模态框
export function hideRepoEditModal() {
    const modal = document.getElementById('repoEditModal');
    if (modal) {
        modal.classList.remove('show');
    }
}

// 更新仓库
export function updateRepository() {
    if (!checkAdminPermission()) return;
    
    const id = document.getElementById('editRepoId').value;
    const name = document.getElementById('editRepoName').value.trim();
    const description = document.getElementById('editRepoDescription').value.trim();
    const categoryId = document.getElementById('editRepoCategory').value;
    
    if (!name) {
        showToast('仓库名称不能为空', 'error');
        return;
    }
    
    const repo = repositories.find(r => r.id === id);
    if (repo) {
        repo.name = name;
        repo.description = description;
        repo.categoryId = categoryId;
        saveCloudConfig();
        renderRepositoriesByCategory();
        hideRepoEditModal();
        showToast('仓库更新成功', 'success');
    }
}

// 更新仓库UI，不重新加载数据
export function updateRepoUI() {
    if (!currentRepo) return;
    
    // 更新仓库名称
    const repoNameElement = document.getElementById('currentRepoName');
    if (repoNameElement) {
        repoNameElement.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
            </svg>
            ${currentRepo.name}
        `;
    }
    
    // 更新仓库描述
    const repoDescription = document.getElementById('repoDescription');
    if (repoDescription) {
        repoDescription.textContent = currentRepo.description || '无描述';
    }
    
    // 更新仓库分类
    const repoCategory = document.getElementById('repoCategory');
    const categories = getCategories();
    
    if (repoCategory) {
        const category = categories.find(c => c.id === currentRepo.categoryId);
        repoCategory.textContent = category ? category.name : '未分类';
    }
    
    // 更新创建者信息
    const repoCreatedBy = document.getElementById('repoCreatedBy');
    if (repoCreatedBy) {
        repoCreatedBy.textContent = currentRepo.createdBy || '未知';
    }
    
    // 更新成员列表
    window.dispatchEvent(new CustomEvent('updateMembersUI', { detail: currentRepo }));
    
    // 高亮当前仓库
    const repos = document.querySelectorAll('.repo-item');
    repos.forEach(item => {
        if (item.dataset.id === currentRepo.id) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}

// 检查管理员权限
function checkAdminPermission() {
    if (!window.isAdmin) {
        showToast('需要管理员权限', 'error');
        return false;
    }
    return true;
}