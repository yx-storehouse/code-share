// 用户管理模块
import config from '../config/config.js';
import { utf8_to_b64, b64_to_utf8, showLoading, hideLoading, showToast } from '../utils/common.js';
import { loadCloudConfig } from './cloudManager.js';
import { loadCategories } from './categoryManager.js';
import { loadRepositories } from './repositoryManager.js';

let currentUser = null;
let isAdmin = false;
let onlineUsers = [];
let onlineUsersSha = null;

// 检查用户认证
export function checkAuth() {
    const user = localStorage.getItem('codeGodUser');
    if (user) {
        const userData = JSON.parse(user);
        currentUser = { 
            username: userData.username,
            isGuest: userData.isGuest || false // 恢复游客状态
        };
        isAdmin = userData.isAdmin || false; // 恢复管理员状态
        
        // 使当前用户和管理员状态全局可用
        window.currentUser = currentUser;
        window.isAdmin = isAdmin;
        
        showUserProfile();
        return true;
    } else {
        showAuthModal();
        return false;
    }
}

// 游客登录
export function guestLogin() {
    // 生成随机游客ID
    const guestId = 'guest_' + Math.floor(Math.random() * 10000) + '_' + Date.now().toString().slice(-4);
    
    // 创建游客用户
    currentUser = { username: guestId, isGuest: true };
    isAdmin = false; // 游客不是管理员
    
    // 更新全局变量
    window.currentUser = currentUser;
    window.isAdmin = isAdmin;
    
    // 保存到本地存储
    localStorage.setItem('codeGodUser', JSON.stringify({ 
        username: guestId, 
        isAdmin: false, 
        isGuest: true 
    }));
    
    hideAuthModal();
    showUserProfile();
    showToast('已以游客身份登录', 'success');
    
    // 更新UI
    loadCloudConfig();
    loadCategories();
    loadRepositories();
    updateUserOnlineStatus(true);
    
    return true;
}

// 显示用户资料
export function showUserProfile() {
    const userProfile = document.getElementById('userProfile');
    const userAvatar = document.getElementById('userAvatar');
    const userName = document.getElementById('userName');
    
    if (currentUser) {
        userAvatar.textContent = currentUser.username.charAt(0).toUpperCase();
        // 显示游客标识
        if (currentUser.isGuest) {
            userName.textContent = '游客';
            userAvatar.classList.add('guest-avatar');
        } else {
            userName.textContent = currentUser.username + (isAdmin ? ' (管理员)' : '');
            userAvatar.classList.remove('guest-avatar');
        }
        userProfile.style.display = 'flex';
    }
}

// 显示认证模态框
export function showAuthModal() {
    const authModal = document.getElementById('authModal');
    authModal.classList.add('show');
}

// 隐藏认证模态框
export function hideAuthModal() {
    const authModal = document.getElementById('authModal');
    authModal.classList.remove('show');
}

// 设置认证事件处理程序
export function setupAuthHandlers() {
    // 认证标签切换
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));
            const tabName = this.getAttribute('data-tab');
            document.getElementById(`${tabName}Form`).classList.add('active');
            
            document.getElementById('loginError').textContent = '';
            document.getElementById('loginError').classList.remove('show');
            document.getElementById('registerError').textContent = '';
            document.getElementById('registerError').classList.remove('show');
        });
    });

    // 游客登录按钮
    document.getElementById('guestLoginBtn')?.addEventListener('click', function() {
        guestLogin();
    });

    // 登录按钮
    document.getElementById('loginBtn').addEventListener('click', function() {
        const username = document.getElementById('loginUsername').value.trim();
        const password = document.getElementById('loginPassword').value.trim();
        const loginError = document.getElementById('loginError');
        
        if (!username || !password) {
            loginError.textContent = '用户名和密码不能为空';
            loginError.classList.add('show');
            return;
        }
        
        // 检查是否是管理员登录
        if (username === config.ADMIN_USERNAME && password === config.ADMIN_PASSWORD) {
            currentUser = { username: config.ADMIN_USERNAME };
            isAdmin = true;
            
            // 更新全局变量
            window.currentUser = currentUser;
            window.isAdmin = isAdmin;
            
            localStorage.setItem('codeGodUser', JSON.stringify({ username: config.ADMIN_USERNAME, isAdmin: true }));
            hideAuthModal();
            showUserProfile();
            showToast('管理员登录成功', 'success');
            
            // 更新UI以显示管理员功能
            loadCloudConfig();
            loadCategories();
            loadRepositories();
            updateUserOnlineStatus(true);
            return;
        }
        
        const users = JSON.parse(localStorage.getItem('codeGodUsers') || '[]');
        const user = users.find(u => u.username === username && u.password === password);
        
        if (user) {
            currentUser = { username: user.username };
            isAdmin = false;
            
            // 更新全局变量
            window.currentUser = currentUser;
            window.isAdmin = isAdmin;
            
            localStorage.setItem('codeGodUser', JSON.stringify({ username: user.username, isAdmin: false }));
            hideAuthModal();
            showUserProfile();
            showToast('登录成功', 'success');
            
            // 更新UI
            loadCloudConfig();
            loadCategories();
            loadRepositories();
            updateUserOnlineStatus(true);
        } else {
            loginError.textContent = '用户名或密码错误';
            loginError.classList.add('show');
        }
    });

    // 注册按钮
    document.getElementById('registerBtn').addEventListener('click', function() {
        const username = document.getElementById('registerUsername').value.trim();
        const password = document.getElementById('registerPassword').value.trim();
        const confirmPassword = document.getElementById('confirmPassword').value.trim();
        const registerError = document.getElementById('registerError');
        
        if (!username || !password || !confirmPassword) {
            registerError.textContent = '所有字段都不能为空';
            registerError.classList.add('show');
            return;
        }
        
        if (password !== confirmPassword) {
            registerError.textContent = '两次输入的密码不一致';
            registerError.classList.add('show');
            return;
        }
        
        const users = JSON.parse(localStorage.getItem('codeGodUsers') || '[]');
        
        if (users.some(u => u.username === username)) {
            registerError.textContent = '用户名已存在';
            registerError.classList.add('show');
            return;
        }
        
        users.push({ username, password });
        localStorage.setItem('codeGodUsers', JSON.stringify(users));
        
        currentUser = { username };
        isAdmin = false; // 注册用户默认不是管理员
        
        // 更新全局变量
        window.currentUser = currentUser;
        window.isAdmin = isAdmin;
        
        localStorage.setItem('codeGodUser', JSON.stringify({ username, isAdmin: false }));
        hideAuthModal();
        showUserProfile();
        showToast('注册成功', 'success');
        
        // 更新UI
        loadCloudConfig();
        loadCategories();
        loadRepositories();
        updateUserOnlineStatus(true);
    });

    // 注销按钮
    document.getElementById('logoutBtn').addEventListener('click', function() {
        // 先将用户设置为离线
        if (currentUser) {
            updateUserOnlineStatus(false);
        }
        
        // 清除用户信息和管理员状态
        localStorage.removeItem('codeGodUser');
        currentUser = null;
        isAdmin = false;
        
        // 更新全局变量
        window.currentUser = null;
        window.isAdmin = false;
        
        // 更新UI
        document.getElementById('userProfile').style.display = 'none';
        showAuthModal();
        showToast('已退出登录', 'success');
        
        // 重新渲染分类和仓库列表，移除管理员功能
        loadCategories();
        loadRepositories();
    });
}

// 更新用户在线状态
export function updateUserOnlineStatus(isOnline) {
    if (!currentUser) return;
    
    // 先获取当前在线用户列表
    fetch(`https://gitee.com/api/v5/repos/${config.repoOwner}/${config.cloudRepoName}/contents/${config.onlineUsersFilePath}`, {
        method: 'GET',
        headers: {
            'Authorization': `token ${config.accessToken}`
        }
    })
    .then(response => {
        if (!response.ok && response.status === 404) {
            // 文件不存在，创建新文件
            return { content: null };
        }
        return response.json();
    })
    .then(data => {
        let users = [];
        if (data.content) {
            users = JSON.parse(b64_to_utf8(data.content));
            onlineUsersSha = data.sha;
        }
        
        const timestamp = Date.now();
        const expirationTime = timestamp + (10 * 60 * 1000); // 10分钟后过期
        
        // 移除过期用户
        users = users.filter(user => user.expirationTime > timestamp);
        
        if (isOnline) {
            // 添加或更新当前用户
            const existingUserIndex = users.findIndex(user => user.username === currentUser.username);
            if (existingUserIndex >= 0) {
                users[existingUserIndex].expirationTime = expirationTime;
            } else {
                users.push({
                    username: currentUser.username,
                    avatar: currentUser.username.charAt(0).toUpperCase(),
                    lastActive: new Date().toLocaleString(),
                    expirationTime: expirationTime
                });
            }
        } else {
            // 移除当前用户
            users = users.filter(user => user.username !== currentUser.username);
        }
        
        onlineUsers = users;
        window.onlineUsers = users; // 使在线用户全局可用
        updateOnlineUsersUI();
        
        // 保存到云端
        const method = onlineUsersSha ? 'PUT' : 'POST';
        const body = {
            message: '更新在线用户状态',
            content: utf8_to_b64(JSON.stringify(users)),
            branch: 'master'
        };
        
        if (onlineUsersSha) {
            body.sha = onlineUsersSha;
        }
        
        return fetch(`https://gitee.com/api/v5/repos/${config.repoOwner}/${config.cloudRepoName}/contents/${config.onlineUsersFilePath}`, {
            method: method,
            headers: {
                'Authorization': `token ${config.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });
    })
    .then(response => response.json())
    .then(data => {
        if (data.content && data.content.sha) {
            onlineUsersSha = data.content.sha;
        }
    })
    .catch(error => {
        console.error('Error updating online status:', error);
    });
}

// 更新在线用户UI
export function updateOnlineUsersUI() {
    const container = document.getElementById('onlineUsersContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (onlineUsers.length === 0) {
        container.innerHTML = '<p class="no-users">暂无在线用户</p>';
        return;
    }
    
    onlineUsers.forEach(user => {
        const userDiv = document.createElement('div');
        userDiv.className = 'online-user';
        
        // 创建头像和用户名
        userDiv.innerHTML = `
            <div class="user-avatar online">
                ${user.username.charAt(0).toUpperCase()}
            </div>
            <div class="user-info">
                <span class="user-name">${user.username}</span>
                <span class="user-status">在线</span>
            </div>
        `;
        
        container.appendChild(userDiv);
    });
}

// 定期检查在线用户
export function checkOnlineUsers() {
    fetch(`https://gitee.com/api/v5/repos/${config.repoOwner}/${config.cloudRepoName}/contents/${config.onlineUsersFilePath}`, {
        method: 'GET',
        headers: {
            'Authorization': `token ${config.accessToken}`
        }
    })
    .then(response => {
        if (!response.ok) {
            return { content: null };
        }
        return response.json();
    })
    .then(data => {
        if (data.content) {
            const users = JSON.parse(b64_to_utf8(data.content));
            const timestamp = Date.now();
            
            // 过滤掉过期用户
            const activeUsers = users.filter(user => user.expirationTime > timestamp);
            
            onlineUsers = activeUsers;
            window.onlineUsers = activeUsers; // 更新全局变量
            updateOnlineUsersUI();
            
            // 如果有用户过期，更新在线用户文件
            if (activeUsers.length !== users.length) {
                const body = {
                    message: '自动清理离线用户',
                    content: utf8_to_b64(JSON.stringify(activeUsers)),
                    branch: 'master',
                    sha: data.sha
                };
                
                fetch(`https://gitee.com/api/v5/repos/${config.repoOwner}/${config.cloudRepoName}/contents/${config.onlineUsersFilePath}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `token ${config.accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(body)
                });
            }
        }
    })
    .catch(error => {
        console.error('Error checking online users:', error);
    });
}

// 显示成员管理模态框
export function showMembersModal(repo) {
    const modal = document.getElementById('membersModal');
    if (!modal) return;
    
    // 填充当前成员列表
    const membersList = document.getElementById('membersList');
    membersList.innerHTML = '';
    
    if (repo.members && repo.members.length > 0) {
        repo.members.forEach(username => {
            // 检查用户是否在线
            const isOnline = onlineUsers.some(user => user.username === username);
            
            const li = document.createElement('li');
            li.className = 'member-item';
            li.innerHTML = `
                <div class="member-avatar ${isOnline ? 'online' : ''}">${username.charAt(0).toUpperCase()}</div>
                <div class="member-info">
                    <span class="member-name">${username}</span>
                    ${username === repo.createdBy ? '<span class="member-role">创建者</span>' : ''}
                    <span class="member-status">${isOnline ? '在线' : '离线'}</span>
                </div>
                ${username !== repo.createdBy ? `
                    <button class="remove-member-btn" data-username="${username}">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="15" y1="9" x2="9" y2="15"></line>
                            <line x1="9" y1="9" x2="15" y2="15"></line>
                        </svg>
                    </button>
                ` : ''}
            `;
            membersList.appendChild(li);
        });
        
        // 添加移除成员的点击事件
        membersList.querySelectorAll('.remove-member-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const username = this.dataset.username;
                removeMember(repo, username);
            });
        });
    } else {
        membersList.innerHTML = '<p class="no-members">暂无成员</p>';
    }
    
    // 显示模态框
    modal.classList.add('show');
}

// 移除成员
export function removeMember(repo, username) {
    if (!repo.members) return;
    
    repo.members = repo.members.filter(member => member !== username);
    
    // 更新云端配置
    window.dispatchEvent(new CustomEvent('configChanged'));
    
    // 刷新成员列表UI
    showMembersModal(repo);
    
    // 更新仓库UI
    window.dispatchEvent(new CustomEvent('repositoryChanged', { detail: repo }));
    
    showToast(`成员 ${username} 已移除`, 'success');
}

// 添加成员
export function addMember(repo, username) {
    if (!repo.members) {
        repo.members = [repo.createdBy || currentUser.username];
    }
    
    // 检查用户是否已存在
    if (repo.members.includes(username)) {
        showToast(`用户 ${username} 已经是成员`, 'error');
        return;
    }
    
    repo.members.push(username);
    
    // 更新云端配置
    window.dispatchEvent(new CustomEvent('configChanged'));
    
    // 刷新成员列表UI
    showMembersModal(repo);
    
    // 更新仓库UI
    window.dispatchEvent(new CustomEvent('repositoryChanged', { detail: repo }));
    
    showToast(`成员 ${username} 已添加`, 'success');
}

// 更新仓库成员列表UI
export function updateMembersUI(repo) {
    const membersContainer = document.getElementById('membersContainer');
    if (!membersContainer) return;
    
    membersContainer.innerHTML = '';
    
    if (!repo || !repo.members || repo.members.length === 0) {
        membersContainer.innerHTML = '<p class="no-members">暂无成员</p>';
        return;
    }
    
    // 显示成员列表
    repo.members.forEach(username => {
        const isOnline = onlineUsers.some(user => user.username === username);
        
        const memberDiv = document.createElement('div');
        memberDiv.className = 'member-item';
        memberDiv.innerHTML = `
            <div class="member-avatar ${isOnline ? 'online' : ''}">
                ${username.charAt(0).toUpperCase()}
            </div>
            <div class="member-info">
                <span class="member-name">${username}</span>
                ${username === repo.createdBy ? '<span class="member-role">创建者</span>' : ''}
                <span class="member-status">${isOnline ? '在线' : '离线'}</span>
            </div>
        `;
        membersContainer.appendChild(memberDiv);
    });
}