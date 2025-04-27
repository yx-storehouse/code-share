// Message Manager Module - 消息管理模块
import config from '../config/config.js';
import { utf8_to_b64, b64_to_utf8, showLoading, hideLoading, showToast, getLanguageIcon } from '../utils/common.js';
import { getCurrentRepo } from './repositoryManager.js';
import { ConfirmDialog } from "../utils/confirm-dialog.js"
// 存储当前仓库的所有消息
let allMessages = [];
// 上次获取到的文件SHA值，用于判断文件是否有变化
let lastSha = null;
// 上次获取到的文件内容，用于判断文件是否有变化
let lastContent = null;
// 是否为首次加载标志
let isFirstLoad = true;

// 创建确认对话框实例
const confirmDialog = new ConfirmDialog({
    theme: "dark",
    notificationText: "操作已完成",
})

/**
 * 加载消息（代码片段）
 * 从当前仓库对应的文件中加载所有代码片段
 */
export function loadMessages() {
    const currentRepo = getCurrentRepo();
    if (!currentRepo) return; // 如果没有选择仓库，直接返回

    // 首次加载时显示加载指示器
    if (isFirstLoad) {
        showLoading();
    }

    // 从Gitee API获取仓库文件内容
    fetch(`https://gitee.com/api/v5/repos/${currentRepo.owner}/${currentRepo.repoName}/contents/${currentRepo.filePath}`, {
        method: 'GET',
        headers: {
            'Authorization': `token ${config.accessToken}`
        }
    })
        .then(response => {
            if (!response.ok) {
                // 如果文件不存在，显示空消息列表
                if (response.status === 404) {
                    renderMessages([]);
                    if (isFirstLoad) {
                        hideLoading();
                        showToast('仓库为空，请添加代码', 'success');
                        isFirstLoad = false;
                    }
                    throw new Error('File not found');
                }
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            // 处理API返回的数据
            if (!data || !data.content) {
                console.error('Invalid response data:', data);
                renderMessages([]);
                if (isFirstLoad) {
                    hideLoading();
                    isFirstLoad = false;
                }
                return;
            }

            const sha = data.sha;

            try {
                // 解码文件内容（Base64到UTF-8）
                const content = b64_to_utf8(data.content);

                // 只有当文件有变化时才更新UI
                if (sha !== lastSha || content !== lastContent) {
                    lastSha = sha;
                    lastContent = content;

                    // 解析消息数组
                    let messages = [];
                    try {
                        messages = JSON.parse(content);
                        // 确保解析结果是数组
                        if (!Array.isArray(messages)) {
                            console.error('Content is not an array:', content);
                            messages = [];
                        }
                    } catch (parseError) {
                        console.error('Error parsing messages:', parseError);
                        messages = [];
                    }

                    // 保存所有消息用于搜索功能
                    allMessages = messages;
                    // 渲染消息列表
                    renderMessages(messages);
                }
            } catch (error) {
                console.error('Error processing file content:', error);
                renderMessages([]);
            }

            // 首次加载时，处理完成后隐藏加载指示器并显示成功消息
            if (isFirstLoad) {
                hideLoading();
                showToast('代码加载成功', 'success');
                isFirstLoad = false;
            }
        })
        .catch(error => {
            // 忽略"文件不存在"的错误，因为已经在上面处理过了
            if (error.message !== 'File not found') {
                console.error('Error loading messages:', error);
                renderMessages([]);
                if (isFirstLoad) {
                    hideLoading();
                    showToast('加载失败，请重试', 'error');
                    isFirstLoad = false;
                }
            }
        });
}

/**
 * 提交代码
 * 上传用户输入的代码到当前仓库
 */
export function submitMessage() {
    // 检查用户是否已登录
    if (!window.checkAuth()) {
        return;
    }

    // 获取表单数据
    const messageInput = document.getElementById('message');
    const languageSelect = document.getElementById('languageSelect');
    const language = languageSelect.value;
    const message = messageInput.value;
    const currentRepo = getCurrentRepo();

    // 验证输入数据
    if (!message) {
        showToast('代码不能为空', 'error');
        messageInput.focus();
        return;
    }

    if (!currentRepo) {
        showToast('请先选择仓库', 'error');
        return;
    }

    // 获取当前时间作为上传时间
    const currentTime = new Date().toLocaleString();

    // 显示加载指示器
    showLoading();

    // 先获取现有文件内容，如果不存在则创建新文件
    fetch(`https://gitee.com/api/v5/repos/${currentRepo.owner}/${currentRepo.repoName}/contents/${currentRepo.filePath}`, {
        method: 'GET',
        headers: {
            'Authorization': `token ${config.accessToken}`
        }
    })
        .then(response => {
            if (!response.ok) {
                // 如果文件不存在，创建新文件
                if (response.status === 404) {
                    return { content: null, sha: null };
                }
                throw new Error('Failed to fetch file');
            }
            return response.json();
        })
        .then(data => {
            // 准备文件内容
            let content = [];
            let sha = null;

            // 如果文件已存在，解析其内容
            if (data.content) {
                content = JSON.parse(b64_to_utf8(data.content));
                sha = data.sha;
            }

            // 添加新消息到内容数组
            content.push({
                id: Date.now(), // 使用时间戳作为唯一ID
                message, // 代码内容
                time: currentTime, // 上传时间
                language, // 编程语言
                author: window.currentUser.username, // 作者
                repoId: currentRepo.id // 仓库ID
            });

            // 准备请求体
            const body = {
                message: `${window.currentUser.username}添加代码到${currentRepo.name}`,
                content: utf8_to_b64(JSON.stringify(content)), // 编码为Base64
                branch: 'master'
            };

            // 如果是更新文件，需要提供SHA
            if (sha) {
                body.sha = sha;
            }

            // 创建或更新文件
            return fetch(`https://gitee.com/api/v5/repos/${currentRepo.owner}/${currentRepo.repoName}/contents/${currentRepo.filePath}`, {
                method: sha ? 'PUT' : 'POST', // 根据是否有SHA选择PUT或POST
                headers: {
                    'Authorization': `token ${config.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to save code');
            }
            return response.json();
        })
        .then(() => {
            messageInput.value = ''; // 清空输入框
            loadMessages(); // 刷新代码列表
            hideUploadModal(); // 隐藏上传模态框

            // 隐藏加载指示器并显示成功消息
            hideLoading();
            showToast('代码提交成功');
        })
        .catch(error => {
            console.error('Error:', error);
            hideLoading();
            showToast('提交失败，请重试', 'error');
        });
}

/**
 * 渲染消息列表
 * 将消息（代码片段）渲染为HTML元素显示在页面上
 * @param {Array} messages - 消息数组
 */
export function renderMessages(messages) {
    const messagesList = document.getElementById('messages');
    if (!messagesList) return;

    messagesList.innerHTML = '';

    // 如果没有消息，显示"暂无代码记录"
    if (messages.length === 0) {
        const noResults = document.createElement('div');
        noResults.className = 'no-results';
        noResults.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="8" y1="12" x2="16" y2="12"></line>
            </svg>
            <p>暂无代码记录</p>
        `;
        messagesList.appendChild(noResults);
        return;
    }

    // 渲染每条消息
    messages.forEach((item, index) => {
        const listItem = document.createElement('li');
        listItem.className = 'fade-in';
        listItem.style.animationDelay = `${index * 0.1}s`; // 依次渐入显示

        const messageBox = document.createElement('div');
        messageBox.classList.add('message-box');

        // 创建消息头部（时间、作者、操作按钮等）
        const messageHeader = document.createElement('div');
        messageHeader.className = 'message-header';

        // 时间显示
        const timeDisplay = document.createElement('div');
        timeDisplay.classList.add('time-display');

        // 检查作者是否在线
        const isAuthorOnline = item.author && window.onlineUsers && window.onlineUsers.some(user => user.username === item.author);

        // 设置时间显示的HTML内容
        timeDisplay.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            上传时间: ${item.time}
            <span class="language-badge">
                ${getLanguageIcon(item.language)}
                ${item.language.toUpperCase()}
            </span>
        `;

        // 添加作者信息（如果有）
        if (item.author) {
            const authorInfo = document.createElement('div');
            authorInfo.className = 'author-info';
            authorInfo.innerHTML = `
                <div class="author-avatar ${isAuthorOnline ? 'online' : ''}">${item.author.charAt(0).toUpperCase()}</div>
                <span class="author-name">${item.author}</span>
                <span class="author-status">${isAuthorOnline ? '在线' : '离线'}</span>
            `;
            timeDisplay.appendChild(authorInfo);
        }

        // 操作按钮容器
        const messageActions = document.createElement('div');
        messageActions.className = 'message-actions';

        // 复制代码按钮
        const copyBtn = document.createElement('button');
        copyBtn.classList.add('action-btn');
        copyBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            复制代码
        `;
        // 点击复制按钮时的事件处理
        copyBtn.onclick = (e) => {
            e.stopPropagation();
            navigator.clipboard.writeText(item.message);
            showToast('代码复制成功');

            // 添加动画效果
            copyBtn.classList.add('animate__animated', 'animate__pulse');
            setTimeout(() => {
                copyBtn.classList.remove('animate__animated', 'animate__pulse');
            }, 1000);
        };

        messageActions.appendChild(copyBtn);

        // 添加管理员或仓库创建者的删除按钮
        const currentRepo = getCurrentRepo();
        if ((window.isAdmin || (currentRepo && currentRepo.createdBy && window.currentUser && window.currentUser.username === currentRepo.createdBy) || (window.currentUser && window.currentUser.username === item.author))) {
            const deleteBtn = document.createElement('button');
            deleteBtn.classList.add('action-btn', 'delete-btn');
            deleteBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
                删除
            `;
            // 点击删除按钮时的事件处理
            deleteBtn.onclick = (e) => {
                e.stopPropagation();


                confirmDialog.show({
                    title: "确认删除",
                    content: `确定要删除这段代码吗？`,
                    confirmText: "删除",
                    cancelText: "取消",
                    onConfirm: () => {
                        deleteCode(item.id);
                    },
                })
            };
            messageActions.appendChild(deleteBtn);
        }

        messageHeader.appendChild(timeDisplay);
        messageHeader.appendChild(messageActions);

        // 代码块
        const codeBlock = document.createElement('div');
        codeBlock.classList.add('code-block');

        const pre = document.createElement('pre');
        pre.className = 'line-numbers';

        const code = document.createElement('code');
        code.className = `language-${item.language}`;
        code.textContent = item.message;

        pre.appendChild(code);
        codeBlock.appendChild(pre);

        // 添加点击事件用于展开/折叠代码块
        codeBlock.addEventListener('click', function (e) {
            if (e.target === codeBlock || e.target === pre || e.target.tagName !== 'CODE') {
                this.classList.toggle('expanded');
            }
        });

        // 阻止代码选择时触发展开/折叠
        code.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        // 组装消息框
        messageBox.appendChild(messageHeader);
        messageBox.appendChild(codeBlock);
        listItem.appendChild(messageBox);
        messagesList.appendChild(listItem);
    });

    // 使用Prism.js高亮代码
    Prism.highlightAllUnder(messagesList);
}

/**
 * 删除代码
 * 从仓库文件中删除指定ID的代码片段
 * @param {number} messageId - 要删除的消息ID
 */
export function deleteCode(messageId) {
    const currentRepo = getCurrentRepo();
    if (!currentRepo) return;

    // 先获取文件内容
    fetch(`https://gitee.com/api/v5/repos/${currentRepo.owner}/${currentRepo.repoName}/contents/${currentRepo.filePath}`, {
        method: 'GET',
        headers: {
            'Authorization': `token ${config.accessToken}`
        }
    })
        .then(response => response.json())
        .then(data => {
            // 解析内容并找到要删除的消息
            const content = JSON.parse(b64_to_utf8(data.content));
            const messageToDelete = content.find(item => item.id === messageId);

            // 检查权限
            const isAdmin = window.isAdmin;
            const isRepoCreator = currentRepo.createdBy && window.currentUser && window.currentUser.username === currentRepo.createdBy;
            const isCodeAuthor = messageToDelete && window.currentUser && window.currentUser.username === messageToDelete.author;

            if (!isAdmin && !isRepoCreator && !isCodeAuthor) {
                showToast('没有权限删除此代码', 'error');
                return Promise.reject('No permission to delete this code');
            }

            // 过滤掉要删除的消息
            const filteredContent = content.filter(item => item.id !== messageId);

            // 更新文件
            return fetch(`https://gitee.com/api/v5/repos/${currentRepo.owner}/${currentRepo.repoName}/contents/${currentRepo.filePath}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${config.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: `删除代码 ${messageId}`,
                    content: utf8_to_b64(JSON.stringify(filteredContent)),
                    sha: data.sha,
                    branch: 'master'
                })
            });
        })
        .then(() => {
            // 删除成功后刷新消息列表
            loadMessages();
            showToast('代码删除成功', 'success');
        })
        .catch(error => {
            console.error('Error:', error);
            if (error !== 'No permission to delete this code') {
                showToast('代码删除失败', 'error');
            }
        });
}

/**
 * 显示上传模态框
 */
export function showUploadModal() {
    const uploadModal = document.getElementById('uploadModal');
    uploadModal.classList.add('show');
}

/**
 * 隐藏上传模态框
 */
export function hideUploadModal() {
    const uploadModal = document.getElementById('uploadModal');
    uploadModal.classList.remove('show');
}

/**
 * 设置搜索功能
 * 为搜索输入框添加事件监听器，实现实时搜索
 */
export function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function () {
            const searchTerm = this.value.toLowerCase();
            if (!allMessages) return;

            // 根据搜索词过滤消息
            const filteredMessages = searchTerm
                ? allMessages.filter(item =>
                    item.message.toLowerCase().includes(searchTerm) ||
                    item.language.toLowerCase().includes(searchTerm) ||
                    (item.author && item.author.toLowerCase().includes(searchTerm)))
                : allMessages;

            // 渲染过滤后的消息
            renderMessages(filteredMessages);
        });
    }
}

/**
 * 检查管理员权限
 * @returns {boolean} 是否有管理员权限
 */
function checkAdminPermission() {
    if (!window.isAdmin) {
        showToast('需要管理员权限', 'error');
        return false;
    }
    return true;
} 