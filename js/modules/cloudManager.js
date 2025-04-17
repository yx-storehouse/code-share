// Cloud Manager Module - 云端管理模块
import config from '../config/config.js';
import { utf8_to_b64, b64_to_utf8, showLoading, hideLoading, showToast } from '../utils/common.js';
import { setCategories, loadCategories, selectCategory, getCategories } from './categoryManager.js';
import { setRepositories, loadRepositories, fixRepositoryCategoryLinks, getRepositories } from './repositoryManager.js';

let configSha = null; // 配置文件的SHA值，用于更新时提供给API

/**
 * 检查是否为管理员用户
 * @returns {boolean} 是否为管理员用户
 */
function isAdminUser() {
    return window.currentUser && window.currentUser.username === config.ADMIN_USERNAME;
}

/**
 * 验证JSON字符串是否有效并完整
 * @param {string} str - 要验证的字符串
 * @returns {boolean} 是否为有效的JSON字符串
 */
function isValidJson(str) {
    if (!str || typeof str !== 'string') return false;
    
    // 检查基本的JSON格式要求
    str = str.trim();
    if (str === '') return false;
    
    try {
        // 计算括号是否匹配
        let braceCount = 0;
        let squareBraceCount = 0;
        
        for (let i = 0; i < str.length; i++) {
            if (str[i] === '{') braceCount++;
            else if (str[i] === '}') braceCount--;
            else if (str[i] === '[') squareBraceCount++;
            else if (str[i] === ']') squareBraceCount--;
        }
        
        // 如果括号不匹配，直接返回false
        if (braceCount !== 0 || squareBraceCount !== 0) {
            console.error('括号不匹配，缺少闭合括号');
            return false;
        }
        
        // 使用JSON.parse全面验证
        JSON.parse(str);
        return true;
    } catch (e) {
        console.error('JSON验证失败:', e);
        return false;
    }
}

/**
 * 尝试修复不完整的JSON
 * @param {string} str - 不完整的JSON字符串
 * @returns {string|null} 修复后的JSON字符串，如果无法修复则返回null
 */
function tryFixJson(str) {
    if (!str || typeof str !== 'string') return null;
    
    str = str.trim();
    if (str === '') return null;
    
    try {
        // 如果能通过验证，直接返回原始字符串
        if (isValidJson(str)) return str;
        
        // 尝试修复常见问题：缺少右括号
        let braceCount = 0;
        let squareBraceCount = 0;
        
        for (let i = 0; i < str.length; i++) {
            if (str[i] === '{') braceCount++;
            else if (str[i] === '}') braceCount--;
            else if (str[i] === '[') squareBraceCount++;
            else if (str[i] === ']') squareBraceCount--;
        }
        
        // 如果缺少右括号，添加缺少的括号
        let fixedStr = str;
        
        while (braceCount > 0) {
            fixedStr += '}';
            braceCount--;
        }
        
        while (squareBraceCount > 0) {
            fixedStr += ']';
            squareBraceCount--;
        }
        
        // 验证修复后的JSON
        JSON.parse(fixedStr);
        console.log('成功修复JSON:', fixedStr);
        return fixedStr;
    } catch (e) {
        console.error('JSON修复失败:', e);
        return null;
    }
}

/**
 * 加载云端配置（分类和仓库）
 * 从Gitee仓库加载配置文件，包含分类和仓库信息
 */
export function loadCloudConfig() {
    showLoading(); // 显示加载动画
    
    // 从Gitee API获取云端配置文件
    fetch(`https://gitee.com/api/v5/repos/${config.repoOwner}/${config.cloudRepoName}/contents/${config.configFilePath}`, {
        method: 'GET',
        headers: {
            'Authorization': `token ${config.accessToken}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        if (data && data.content) {
            try {
                // 解码Base64内容为字符串
                const decodedContent = b64_to_utf8(data.content);
                
                // 验证解码后的内容是否为有效的JSON
                let validContent = decodedContent;
                if (!isValidJson(decodedContent)) {
                    console.error('配置文件格式无效:', decodedContent);
                    
                    // 尝试修复JSON
                    const fixedContent = tryFixJson(decodedContent);
                    if (fixedContent) {
                        console.log('使用修复后的配置:', fixedContent);
                        validContent = fixedContent;
                    } else {
                        handleConfigError('配置文件格式无效（JSON解析错误）');
                        return;
                    }
                }
                
                // 解析配置文件 - 从Base64解码并解析JSON
                const cloudConfig = JSON.parse(validContent);
                
                // 确保配置结构正确
                if (cloudConfig && typeof cloudConfig === 'object') {
                    const categoriesData = Array.isArray(cloudConfig.categories) ? cloudConfig.categories : [];
                    const repositoriesData = Array.isArray(cloudConfig.repositories) ? cloudConfig.repositories : [];
                    configSha = data.sha; // 保存sha用于后续更新
                    
                    console.log('Loaded config:', { categories: categoriesData, repositories: repositoriesData });
                    
                    // 设置分类和仓库数据到内存中
                    setCategories(categoriesData);
                    setRepositories(repositoriesData);
                    
                    // 确保至少有"全部"分类
                    const categories = getCategories();
                    if (!categories.some(c => c.id === 'all')) {
                        categories.unshift({ id: 'all', name: '全部' });
                    }
                    
                    // 检查并修复仓库分类关联 - 确保所有仓库的分类ID有效
                    fixRepositoryCategoryLinks();
                    
                    // 保存修复后的配置
                    saveCloudConfig();
                } else {
                    // 配置格式无效，处理错误
                    console.error('Invalid config format:', cloudConfig);
                    handleConfigError('配置内容结构无效（不包含分类或仓库）');
                }
            } catch (error) {
                // 解析JSON出错，处理错误
                console.error('Error parsing config:', error);
                handleConfigError('配置解析失败：' + error.message);
            }
        } else if (data && data.size === 0) {
            // 文件存在但内容为空
            console.log('Config file exists but is empty');
            handleConfigError('配置文件存在但内容为空');
        } else {
            // 配置文件不存在，处理错误
            console.log('Config file not found');
            handleConfigError('配置文件不存在');
        }
        
        // 渲染UI
        loadCategories(); // 加载分类到UI
        
        // 设置默认分类 - 优先选择"全部"分类
        const categories = getCategories();
        if (categories.length > 0) {
            selectCategory(categories.find(c => c.id === 'all') || categories[0]);
        }
        
        hideLoading(); // 隐藏加载动画
    })
    .catch(error => {
        console.error('Error loading cloud config:', error);
        
        // 处理加载失败错误
        handleConfigError('配置加载失败: ' + error.message);
        hideLoading();
    });
}

/**
 * 处理配置错误
 * 根据用户角色显示不同的提示，只允许管理员用户创建默认配置
 * @param {string} errorMessage - 错误信息
 */
function handleConfigError(errorMessage) {
    if (isAdminUser()) {
        // 管理员用户：显示自定义确认模态框
        showConfigErrorModal(errorMessage);
    } else {
        // 普通用户：仅显示错误提示
        showToast(`配置错误：${errorMessage}，请联系管理员`, 'error');
        // 创建空的分类和仓库数据，以避免应用崩溃
        setCategories([]);
        setRepositories([]);
    }
}

/**
 * 显示配置错误确认模态框
 * 为管理员显示带有自定义样式的确认对话框
 * @param {string} errorMessage - 错误信息
 */
function showConfigErrorModal(errorMessage) {
    const modal = document.getElementById('configErrorModal');
    const errorText = document.getElementById('configErrorText');
    const confirmBtn = document.getElementById('confirmCreateConfig');
    const cancelBtn = document.getElementById('cancelCreateConfig');
    const closeBtn = document.getElementById('closeConfigErrorModal');
    
    // 设置错误信息
    errorText.textContent = `${errorMessage}，是否创建默认配置？`;
    
    // 显示模态框
    modal.classList.add('show');
    
    // 绑定一次性事件处理程序
    const closeModal = () => {
        modal.classList.remove('show');
        // 清理事件监听器
        confirmBtn.removeEventListener('click', handleConfirm);
        cancelBtn.removeEventListener('click', handleCancel);
        closeBtn.removeEventListener('click', handleCancel);
        modal.removeEventListener('click', handleOutsideClick);
    };
    
    // 确认按钮点击 - 创建默认配置
    const handleConfirm = () => {
        closeModal();
        createDefaultConfig();
    };
    
    // 取消按钮点击 - 不创建配置，但设置空数组避免崩溃
    const handleCancel = () => {
        closeModal();
        showToast('配置错误，未创建默认配置', 'error');
        // 创建空的分类和仓库数据，以避免应用崩溃
        setCategories([]);
        setRepositories([]);
    };
    
    // 点击模态框外部关闭模态框
    const handleOutsideClick = (event) => {
        if (event.target === modal) {
            handleCancel();
        }
    };
    
    // 添加事件监听器
    confirmBtn.addEventListener('click', handleConfirm);
    cancelBtn.addEventListener('click', handleCancel);
    closeBtn.addEventListener('click', handleCancel);
    modal.addEventListener('click', handleOutsideClick);
}

/**
 * 创建默认配置
 * 当配置不存在或无效时，创建包含基础分类和仓库的默认配置
 * 只有管理员用户才能执行此操作
 */
export function createDefaultConfig() {
    // 检查是否为管理员用户
    if (!isAdminUser()) {
        showToast('只有管理员才能创建默认配置', 'error');
        return;
    }
    
    console.log('Creating default configuration');
    
    // 创建默认分类 - "全部"和"综合"两个基础分类
    const defaultCategories = [
        { id: 'all', name: '全部' },
        { id: 'category_' + Date.now(), name: '综合' }
    ];
    
    // 创建默认仓库 - 如果用户已登录，则创建一个默认仓库
    let defaultRepositories = [];
    if (window.currentUser) {
        const defaultRepoId = 'repo_' + Date.now();
        defaultRepositories = [{
            id: defaultRepoId,
            name: '默认仓库',
            description: '默认代码仓库',
            filePath: `${defaultRepoId}.json`,
            owner: config.repoOwner,
            repoName: config.cloudRepoName,
            categoryId: defaultCategories[1].id, // 使用"综合"分类
            members: [window.currentUser.username],
            createdBy: window.currentUser.username,
            createdAt: new Date().toLocaleString()
        }];
        
        // 创建默认仓库文件 - 在云端创建空文件
        createEmptyFile(defaultRepositories[0]);
    }
    
    // 设置分类和仓库数据
    setCategories(defaultCategories);
    setRepositories(defaultRepositories);
    
    // 保存云端配置 - 延迟执行确保HTML已渲染
    setTimeout(() => {
        saveCloudConfig();
    }, 500);
    
    // 渲染UI
    loadCategories();
    loadRepositories();
    
    // 选择默认分类
    selectCategory(defaultCategories[0]);
    
    // 显示成功提示
    showToast('已创建默认配置', 'success');
}

/**
 * 保存云端配置
 * 将当前的分类和仓库配置保存到Gitee仓库
 */
export function saveCloudConfig() {
    // 检查保存权限
    if (!window.currentUser) {
        showToast('需要登录才能保存配置', 'error');
        return;
    }
    
    const categories = getCategories();
    const repositories = getRepositories();
    
    // 确保配置数据是有效的数组
    if (!Array.isArray(categories)) {
        console.error('Invalid categories data:', categories);
        showToast('分类数据无效，无法保存', 'error');
        return;
    }
    
    if (!Array.isArray(repositories)) {
        console.error('Invalid repositories data:', repositories);
        showToast('仓库数据无效，无法保存', 'error');
        return;
    }
    
    // 确保至少有"全部"分类
    if (!categories.some(c => c.id === 'all')) {
        categories.unshift({ id: 'all', name: '全部' });
    }
    
    // 清理分类和仓库数据 - 确保仓库和分类的关联正确
    fixRepositoryCategoryLinks();
    
    // 构建云端配置对象
    const cloudConfig = {
        categories: categories,
        repositories: repositories
    };
    
    try {
        // 格式化JSON确保正确缩进和格式
        const jsonString = JSON.stringify(cloudConfig, null, 2);
        
        // 转换为Base64编码
        const content = utf8_to_b64(jsonString);
        
        // 检查内容长度 - Gitee API可能有长度限制
        if (content.length > 1000000) { // 1MB限制
            showToast('配置文件过大，无法保存', 'error');
            return;
        }
        
        // 首先尝试获取文件信息以获取SHA
        fetch(`https://gitee.com/api/v5/repos/${config.repoOwner}/${config.cloudRepoName}/contents/${config.configFilePath}`, {
            method: 'GET',
            headers: {
                'Authorization': `token ${config.accessToken}`
            }
        })
        .then(response => {
            if (response.status === 404) {
                // 文件不存在，创建新文件
                return null;
            }
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(fileInfo => {
            const method = fileInfo ? 'PUT' : 'POST';
            const body = {
                message: '更新Code God配置',
                content: content,
                branch: 'master'
            };
            
            // 如果是更新操作，需要提供SHA
            if (fileInfo && fileInfo.sha) {
                body.sha = fileInfo.sha;
            }
            
            // 发送请求到Gitee API
            return fetch(`https://gitee.com/api/v5/repos/${config.repoOwner}/${config.cloudRepoName}/contents/${config.configFilePath}`, {
                method: method,
                headers: {
                    'Authorization': `token ${config.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });
        })
        .then(response => {
            if (!response.ok) {
                return response.text().then(text => {
                    console.error('API错误响应:', text);
                    throw new Error(`HTTP error! Status: ${response.status}, Body: ${text.substring(0, 100)}...`);
                });
            }
            return response.json();
        })
        .then(data => {
            if (data.content && data.content.sha) {
                configSha = data.content.sha; // 更新SHA值以便下次更新
                console.log('Cloud config saved successfully');
                showToast('配置保存成功', 'success');
            } else {
                console.warn('Unexpected response when saving config:', data);
                showToast('配置保存成功', 'success');
            }
        })
        .catch(error => {
            console.error('Error saving cloud config:', error);
            
            // 如果是超时或网络问题，尝试再次保存
            if (error.message.includes('timeout') || error.message.includes('network')) {
                setTimeout(() => {
                    console.log('网络错误，尝试重新保存...');
                    saveCloudConfig();
                }, 2000);
                return;
            }
            
            showToast('配置保存失败: ' + error.message, 'error');
        });
    } catch (error) {
        console.error('Error preparing cloud config data:', error);
        showToast('配置准备失败: ' + error.message, 'error');
    }
}

/**
 * 在Gitee仓库中创建空文件
 * 用于初始化新仓库的消息文件
 * @param {Object} repo - 仓库对象，包含创建文件所需的信息
 */
export function createEmptyFile(repo) {
    showLoading(); // 显示加载动画
    
    // 显示正在创建的提示
    showToast('正在创建仓库文件...', 'success');
    
    // 确保仓库对象有效
    if (!repo || !repo.owner || !repo.repoName || !repo.filePath) {
        console.error('仓库对象无效:', repo);
        hideLoading();
        showToast('仓库信息无效，无法创建文件', 'error');
        return;
    }
    
    // 使用延迟确保不同步请求
    setTimeout(() => {
        // 首先检查文件是否存在
        fetch(`https://gitee.com/api/v5/repos/${repo.owner}/${repo.repoName}/contents/${repo.filePath}`, {
            method: 'GET',
            headers: {
                'Authorization': `token ${config.accessToken}`
            }
        })
        .then(response => {
            if (response.status === 404) {
                // 文件不存在，直接创建新文件
                return fetch(`https://gitee.com/api/v5/repos/${repo.owner}/${repo.repoName}/contents/${repo.filePath}`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `token ${config.accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        message: '创建仓库',
                        content: utf8_to_b64(JSON.stringify([])), // 创建空数组的JSON文件
                        branch: 'master'
                    })
                });
            }
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json().then(fileInfo => {
                // 文件已存在，更新文件
                return fetch(`https://gitee.com/api/v5/repos/${repo.owner}/${repo.repoName}/contents/${repo.filePath}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `token ${config.accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        message: '更新仓库',
                        content: utf8_to_b64(JSON.stringify([])),
                        branch: 'master',
                        sha: fileInfo.sha
                    })
                });
            });
        })
        .then(response => {
            if (!response.ok) {
                return response.text().then(text => {
                    console.error('API错误响应:', text);
                    throw new Error(`HTTP error! Status: ${response.status}, Body: ${text.substring(0, 100)}...`);
                });
            }
            return response.json();
        })
        .then(() => {
            hideLoading(); // 隐藏加载动画
            showToast('仓库创建成功', 'success');
        })
        .catch(error => {
            console.error('Error creating repository file:', error);
            hideLoading();
            
            // 处理特定错误
            if (error.message.includes('400')) {
                showToast('仓库文件创建失败: 请求参数无效', 'error');
            } else if (error.message.includes('401')) {
                showToast('仓库文件创建失败: 授权令牌无效', 'error');
            } else if (error.message.includes('403')) {
                showToast('仓库文件创建失败: 无权限访问仓库', 'error');
            } else if (error.message.includes('404')) {
                showToast('仓库文件创建失败: 仓库不存在', 'error');
            } else {
                showToast('仓库创建失败: ' + error.message, 'error');
            }
        });
    }, 1000);
} 