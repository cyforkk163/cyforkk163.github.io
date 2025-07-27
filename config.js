/**
 * 应用配置文件
 * 部署时需要修改API_URL为你的内网穿透地址
 */
window.TODO_APP_CONFIG = {
    // 后端API地址配置
    // 本地开发时会自动使用 localhost:3001
    // 生产环境请将下面的地址替换为你的ngrok地址
    // 例如: 'https://abc123-def456.ngrok.io'
    API_URL: 'https://0981688c9428.ngrok-free.app', // 👈 替换为你的实际ngrok地址
    
    // 其他配置
    APP_NAME: '智能待办事项',
    VERSION: '1.2.0',
    
    // 开发模式检测
    isDevelopment: function() {
        const hostname = window.location.hostname;
        const protocol = window.location.protocol;
        return protocol === 'file:' || 
               hostname === 'localhost' || 
               hostname === '127.0.0.1' ||
               hostname === '0.0.0.0';
    }
};