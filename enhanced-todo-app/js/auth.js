/**
 * 用户认证管理
 * 处理登录、注册、会话管理等功能
 */

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.token = null;
        
        // 初始化
        this.init();
    }

    /**
     * 初始化认证管理器
     */
    init() {
        this.setupEventListeners();
        this.checkExistingSession();
    }

    /**
     * 检查现有会话
     */
    checkExistingSession() {
        const savedToken = localStorage.getItem('auth_token');
        const savedUser = localStorage.getItem('current_user');
        
        if (savedToken && savedUser) {
            try {
                this.token = savedToken;
                this.currentUser = JSON.parse(savedUser);
                this.showMainApp();
            } catch (error) {
                console.error('恢复会话失败:', error);
                this.clearSession();
            }
        } else {
            this.showAuthContainer();
        }
    }

    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // 登录表单
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', this.handleLogin.bind(this));
        }

        // 注册表单
        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', this.handleRegister.bind(this));
        }

        // 切换表单
        const showRegisterBtn = document.getElementById('show-register');
        if (showRegisterBtn) {
            showRegisterBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showRegisterForm();
            });
        }

        const showLoginBtn = document.getElementById('show-login');
        if (showLoginBtn) {
            showLoginBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showLoginForm();
            });
        }

        // 退出登录
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', this.handleLogout.bind(this));
        }
    }

    /**
     * 处理登录
     */
    async handleLogin(event) {
        event.preventDefault();
        
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;
        
        // 验证输入
        if (!this.validateEmail(email)) {
            this.showError('请输入有效的邮箱地址');
            return;
        }
        
        if (password.length < 6) {
            this.showError('密码至少需要6位');
            return;
        }
        
        const submitBtn = event.target.querySelector('.auth-btn');
        this.setButtonLoading(submitBtn, true);
        
        try {
            // 调用登录API
            const response = await this.loginAPI(email, password);
            
            if (response.success) {
                this.currentUser = response.user;
                this.token = response.token;
                
                // 保存会话
                localStorage.setItem('auth_token', this.token);
                localStorage.setItem('current_user', JSON.stringify(this.currentUser));
                
                this.showSuccess('登录成功！');
                setTimeout(() => {
                    this.showMainApp();
                }, 1000);
            } else {
                this.showError(response.error || '登录失败');
            }
        } catch (error) {
            console.error('登录错误:', error);
            this.showError('登录失败，请稍后重试');
        } finally {
            this.setButtonLoading(submitBtn, false);
        }
    }

    /**
     * 处理注册
     */
    async handleRegister(event) {
        event.preventDefault();
        
        const username = document.getElementById('register-username').value.trim();
        const email = document.getElementById('register-email').value.trim();
        const password = document.getElementById('register-password').value;
        const confirmPassword = document.getElementById('register-confirm-password').value;
        
        // 验证输入
        if (username.length < 2) {
            this.showError('用户名至少需要2个字符');
            return;
        }
        
        if (!this.validateEmail(email)) {
            this.showError('请输入有效的邮箱地址');
            return;
        }
        
        if (password.length < 6) {
            this.showError('密码至少需要6位');
            return;
        }
        
        if (password !== confirmPassword) {
            this.showError('两次密码输入不一致');
            return;
        }
        
        const submitBtn = event.target.querySelector('.auth-btn');
        this.setButtonLoading(submitBtn, true);
        
        try {
            // 调用注册API
            const response = await this.registerAPI(username, email, password);
            
            if (response.success) {
                this.showSuccess('注册成功！请登录');
                setTimeout(() => {
                    this.showLoginForm();
                    // 清空注册表单
                    event.target.reset();
                }, 1500);
            } else {
                this.showError(response.error || '注册失败');
            }
        } catch (error) {
            console.error('注册错误:', error);
            this.showError('注册失败，请稍后重试');
        } finally {
            this.setButtonLoading(submitBtn, false);
        }
    }

    /**
     * 处理退出登录
     */
    handleLogout() {
        if (confirm('确定要退出登录吗？')) {
            this.clearSession();
            this.showAuthContainer();
            this.showNotification('已退出登录', 'info');
        }
    }

    /**
     * 登录API调用
     */
    async loginAPI(email, password) {
        try {
            if (window.apiClient) {
                // 使用后端API
                const response = await fetch(`${window.apiClient.baseURL}/auth/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email, password })
                });
                return await response.json();
            } else {
                // 临时使用localStorage模拟
                return this.mockLogin(email, password);
            }
        } catch (error) {
            console.error('登录API调用失败:', error);
            // 回退到模拟登录
            return this.mockLogin(email, password);
        }
    }

    /**
     * 注册API调用
     */
    async registerAPI(username, email, password) {
        try {
            if (window.apiClient) {
                // 使用后端API
                const response = await fetch(`${window.apiClient.baseURL}/auth/register`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ username, email, password })
                });
                return await response.json();
            } else {
                // 临时使用localStorage模拟
                return this.mockRegister(username, email, password);
            }
        } catch (error) {
            console.error('注册API调用失败:', error);
            // 回退到模拟注册
            return this.mockRegister(username, email, password);
        }
    }

    /**
     * 模拟登录（用于开发阶段）
     */
    mockLogin(email, password) {
        const users = JSON.parse(localStorage.getItem('mock_users') || '[]');
        const user = users.find(u => u.email === email && u.password === password);
        
        if (user) {
            return {
                success: true,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email
                },
                token: 'mock_token_' + Date.now()
            };
        } else {
            return {
                success: false,
                error: '邮箱或密码错误'
            };
        }
    }

    /**
     * 模拟注册（用于开发阶段）
     */
    mockRegister(username, email, password) {
        const users = JSON.parse(localStorage.getItem('mock_users') || '[]');
        
        // 检查邮箱是否已存在
        if (users.find(u => u.email === email)) {
            return {
                success: false,
                error: '该邮箱已被注册'
            };
        }
        
        // 创建新用户
        const newUser = {
            id: Date.now().toString(),
            username,
            email,
            password,
            createdAt: new Date().toISOString()
        };
        
        users.push(newUser);
        localStorage.setItem('mock_users', JSON.stringify(users));
        
        return {
            success: true,
            message: '注册成功'
        };
    }

    /**
     * 邮箱验证
     */
    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * 显示登录表单
     */
    showLoginForm() {
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');
        
        if (loginForm && registerForm) {
            loginForm.classList.add('active');
            registerForm.classList.remove('active');
        }
    }

    /**
     * 显示注册表单
     */
    showRegisterForm() {
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');
        
        if (loginForm && registerForm) {
            loginForm.classList.remove('active');
            registerForm.classList.add('active');
        }
    }

    /**
     * 显示认证容器
     */
    showAuthContainer() {
        const authContainer = document.getElementById('auth-container');
        const appContainer = document.getElementById('app-container');
        
        if (authContainer && appContainer) {
            authContainer.style.display = 'flex';
            appContainer.style.display = 'none';
        }
    }

    /**
     * 显示主应用
     */
    showMainApp() {
        const authContainer = document.getElementById('auth-container');
        const appContainer = document.getElementById('app-container');
        const currentUserSpan = document.getElementById('current-user');
        
        if (authContainer && appContainer) {
            authContainer.style.display = 'none';
            appContainer.style.display = 'block';
        }
        
        if (currentUserSpan && this.currentUser) {
            currentUserSpan.textContent = this.currentUser.username || this.currentUser.email;
        }
        
        // 初始化主应用
        if (window.taskManager) {
            window.taskManager.loadTasks();
        }
    }

    /**
     * 清除会话
     */
    clearSession() {
        this.currentUser = null;
        this.token = null;
        localStorage.removeItem('auth_token');
        localStorage.removeItem('current_user');
    }

    /**
     * 设置按钮加载状态
     */
    setButtonLoading(button, loading) {
        if (loading) {
            button.classList.add('loading');
            button.disabled = true;
        } else {
            button.classList.remove('loading');
            button.disabled = false;
        }
    }

    /**
     * 显示错误信息
     */
    showError(message) {
        this.showNotification(message, 'error');
    }

    /**
     * 显示成功信息
     */
    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    /**
     * 显示通知
     */
    showNotification(message, type = 'info') {
        // 如果taskManager存在，使用它的通知系统
        if (window.taskManager && window.taskManager.showNotification) {
            window.taskManager.showNotification(message, type);
            return;
        }
        
        // 否则创建简单的通知
        const container = document.getElementById('notification-container');
        if (!container) return;

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <span>${message}</span>
            <button onclick="this.parentElement.remove()" style="background:none;border:none;color:inherit;cursor:pointer;padding:0 8px;">×</button>
        `;

        container.appendChild(notification);

        // 3秒后自动移除
        setTimeout(() => {
            if (notification.parentElement) {
                notification.classList.add('removing');
                setTimeout(() => notification.remove(), 300);
            }
        }, 3000);
    }

    /**
     * 获取当前用户
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * 获取当前用户ID
     */
    getCurrentUserId() {
        return this.currentUser ? this.currentUser.id : null;
    }

    /**
     * 检查是否已登录
     */
    isLoggedIn() {
        return !!(this.currentUser && this.token);
    }

    /**
     * 获取认证令牌
     */
    getToken() {
        return this.token;
    }
}

// 创建全局认证管理实例
const authManager = new AuthManager();

// 暴露到全局作用域
window.authManager = authManager;