// Configuration Module - 配置模块
const config = {
    // API Configuration - API配置
    accessToken: '9f43664de2ca43df41b8c78b1ea88019', // Gitee API访问令牌
    repoOwner: 'yxnbkls',                           // Gitee仓库所有者用户名
    cloudRepoName: 'storge',                        // 云端仓库名称，用于存储应用配置
    configFilePath: 'code_god_config.json',         // 云端配置文件路径，存储分类和仓库信息
    onlineUsersFilePath: 'online_users.json',       // 在线用户文件路径，存储当前在线用户信息
    
    // Admin Configuration - 管理员配置
    ADMIN_USERNAME: 'admin',                        // 管理员用户名
    ADMIN_PASSWORD: 'admin123'                      // 管理员密码（实际使用时应该使用更安全的密码）
};

export default config; 