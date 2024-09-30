const repoOwner = 'yxnbkls';
const repoName = 'storge';
const accessToken = '9f43664de2ca43df41b8c78b1ea88019';
const filePath = 'messages.json';

// 存储的 SHA 值和数据
let lastSha = '';
let lastContent = '';

// UTF-8 转 Base64
function utf8_to_b64(str) {
    return window.btoa(unescape(encodeURIComponent(str)));
}

// Base64 转 UTF-8
function b64_to_utf8(str) {
    return decodeURIComponent(escape(window.atob(str)));
}
document.getElementById('submit').addEventListener('click', submitMessage);
// 显示加载动画
function showLoading() {
    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
        loadingElement.style.display = 'block'; // 显示加载动画
        console.log('dasfs');

    } else {
        console.log("Loading element not found!");
    }
}

// 隐藏加载动画
function hideLoading() {
    const loadingElement = document.getElementById('loading');
        if (loadingElement) {
        loadingElement.style.display = 'none'; // 隐藏加载动画
    } else {
        console.log("Loading element not found!");
    }
}

// 显示 Toast 提示
function showToast(message) {
    const toast = document.getElementById('toast');
    if (toast) {
        toast.querySelector('p').textContent = message; // 设置提示信息
        toast.classList.add('show'); // 添加显示类
        setTimeout(() => {
            toast.classList.remove('show');
        }, 2000); // 2秒后自动隐藏 Toast
    } else {
        console.log("Toast element not found!");
    }
}

// 提交留言
function submitMessage() {
    const messageInput = document.getElementById('message');
    const message = messageInput.value;
    console.log('NB');

    if (!message) {
        showToast('留言不能为空');
        return;
    }

    const currentTime = new Date().toLocaleString();

    // 显示加载动画
    showLoading();

    fetch(`https://gitee.com/api/v5/repos/${repoOwner}/${repoName}/contents/${filePath}`, {
        method: 'GET',
        headers: {
            'Authorization': `token ${accessToken}`
        }
    })
        .then(response => response.json())
        .then(data => {
            const content = data.content ? JSON.parse(b64_to_utf8(data.content)) : [];
            content.push({ id: content.length + 1, message, time: currentTime });

            return fetch(`https://gitee.com/api/v5/repos/${repoOwner}/${repoName}/contents/${filePath}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: '添加留言',
                    content: utf8_to_b64(JSON.stringify(content)),
                    sha: data.sha,
                    branch: 'master'
                })
            });
        })
        .then(() => {
            messageInput.value = ''; // 清空输入框
            loadMessages(); // 刷新留言记录

            // 隐藏加载动画并显示提交成功提示
            hideLoading();
            setTimeout(() => {
                showToast('提交成功');
            }, 500);

        })
        .catch(error => {
            console.error('Error:', error);

            // 提交失败时隐藏加载动画并显示错误提示
            hideLoading();
            setTimeout(() => {
                showToast('提交失败，请重试');
            }, 500);

        });
}

// 加载留言记录
function loadMessages() {
    fetch(`https://gitee.com/api/v5/repos/${repoOwner}/${repoName}/contents/${filePath}`, {
        method: 'GET',
        headers: {
            'Authorization': `token ${accessToken}`
        }
    })
        .then(response => response.json())
        .then(data => {
            const content = b64_to_utf8(data.content);
            const sha = data.sha;
            // 只有当内容或 SHA 发生变化时，才更新页面
            if (sha !== lastSha || content !== lastContent) {
                lastSha = sha;
                lastContent = content;

                const messages = JSON.parse(content);
                const messagesList = document.getElementById('messages');
                messagesList.innerHTML = '';  // 清空现有的留言

                messages.forEach(item => {
                    const listItem = document.createElement('li');

                    const messageBox = document.createElement('div');
                    messageBox.classList.add('message-box');

                    const timeDisplay = document.createElement('span');
                    timeDisplay.classList.add('time-display');
                    timeDisplay.textContent = `上传时间: ${item.time}`;

                    const copyBtn = document.createElement('button');
                    copyBtn.classList.add('copy-btn');
                    copyBtn.textContent = '复制';
                    copyBtn.onclick = () => {
                        navigator.clipboard.writeText(item.message);
                        showToast('复制成功');
                    };

                    const codeBlock = document.createElement('pre');
                    codeBlock.classList.add('code-block');
                    const codeContent = document.createElement('code');
                    codeContent.classList.add('language-html');
                    codeContent.textContent = item.message;
                    codeBlock.appendChild(codeContent);

                    const toggleBtn = document.createElement('button');
                    toggleBtn.classList.add('toggle-btn');
                    toggleBtn.textContent = '展开代码';

                    createToggle(toggleBtn, codeBlock);

                    messageBox.appendChild(timeDisplay);
                    messageBox.appendChild(copyBtn);
                    messageBox.appendChild(codeBlock);
                    messageBox.appendChild(toggleBtn);
                    listItem.appendChild(messageBox);
                    messagesList.appendChild(listItem);

                    Prism.highlightAllUnder(listItem);
                });

                // 将滚动条设置为顶部
                let message_height = messagesList.scrollHeight;
                messagesList.scrollTop = -message_height;
            }
        })
        .catch(error => console.error('Error:', error));
}

// 创建折叠展开功能
function createToggle(button, codeBlock) {
    button.addEventListener('click', () => {
        codeBlock.classList.toggle('expanded');
        button.textContent = codeBlock.classList.contains('expanded') ? '折叠代码' : '展开代码';
    });
}

// 页面加载时加载留言记录
loadMessages();

// 定时器，每隔 10 秒检查留言是否更新
setInterval(loadMessages, 10000); // 10 秒