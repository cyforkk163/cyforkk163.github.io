/**
 * 主应用控制器
 * 协调各个模块并处理用户界面交互
 */

class App {
    constructor() {
        this.currentTab = 'tasks';
        this.isInitialized = false;
        
        // 初始化应用
        this.init();
    }

    /**
     * 初始化应用
     */
    async init() {
        try {
            // 等待DOM加载完成
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.initializeApp());
            } else {
                this.initializeApp();
            }
        } catch (error) {
            console.error('应用初始化失败:', error);
            this.showErrorMessage('应用初始化失败，请刷新页面重试');
        }
    }

    /**
     * 初始化应用组件
     */
    initializeApp() {
        // 设置事件监听器
        this.setupEventListeners();
        
        // 初始化标签页
        this.initializeTabs();
        
        // 加载初始数据
        this.loadInitialData();
        
        // 设置定期更新
        this.setupPeriodicUpdates();
        
        // 标记为已初始化
        this.isInitialized = true;
        
        console.log('应用初始化完成');
        this.showWelcomeMessage();
    }

    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // 标签页切换
        this.setupTabNavigation();
        
        // 键盘快捷键
        this.setupKeyboardShortcuts();
        
        // 窗口事件
        this.setupWindowEvents();
        
        // 表单验证
        this.setupFormValidation();
    }

    /**
     * 设置标签页导航
     */
    setupTabNavigation() {
        const navButtons = document.querySelectorAll('.nav-btn');
        
        navButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const targetTab = e.target.dataset.tab;
                this.switchTab(targetTab);
            });
        });
    }

    /**
     * 切换标签页
     * @param {string} tabName 标签页名称
     */
    switchTab(tabName) {
        if (this.currentTab === tabName) return;

        // 更新导航按钮状态
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        // 更新内容区域
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}-section`);
        });

        // 更新当前标签页
        this.currentTab = tabName;

        // 触发标签页特定的更新
        this.onTabSwitch(tabName);
    }

    /**
     * 标签页切换时的处理
     * @param {string} tabName 标签页名称
     */
    onTabSwitch(tabName) {
        switch (tabName) {
            case 'tasks':
                if (window.taskManager) {
                    taskManager.loadTasks();
                    taskManager.updateGoalSelect();
                }
                break;
            case 'goals':
                if (window.goalManager) {
                    goalManager.loadGoals();
                }
                break;
            case 'statistics':
                this.updateStatistics();
                break;
        }
    }

    /**
     * 初始化标签页
     */
    initializeTabs() {
        // 默认显示任务页面
        this.switchTab('tasks');
    }

    /**
     * 加载初始数据
     */
    loadInitialData() {
        // 加载任务
        if (window.taskManager) {
            taskManager.loadTasks();
        }

        // 加载目标
        if (window.goalManager) {
            goalManager.loadGoals();
            goalManager.updateGoalSelect();
        }

        // 更新统计
        this.updateStatistics();
    }

    /**
     * 设置键盘快捷键
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + 数字键切换标签页
            if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
                switch (e.key) {
                    case '1':
                        e.preventDefault();
                        this.switchTab('tasks');
                        break;
                    case '2':
                        e.preventDefault();
                        this.switchTab('goals');
                        break;
                    case '3':
                        e.preventDefault();
                        this.switchTab('statistics');
                        break;
                }
            }

            // Ctrl/Cmd + N 创建新任务
            if ((e.ctrlKey || e.metaKey) && e.key === 'n' && !e.shiftKey) {
                e.preventDefault();
                this.focusTaskInput();
            }

            // Ctrl/Cmd + Shift + N 创建新目标
            if ((e.ctrlKey || e.metaKey) && e.key === 'N' && e.shiftKey) {
                e.preventDefault();
                this.focusGoalInput();
            }

            // ESC 关闭模态框
            if (e.key === 'Escape') {
                this.closeModals();
            }
        });
    }

    /**
     * 聚焦任务输入框
     */
    focusTaskInput() {
        this.switchTab('tasks');
        setTimeout(() => {
            const taskInput = document.getElementById('task-title');
            if (taskInput) {
                taskInput.focus();
            }
        }, 100);
    }

    /**
     * 聚焦目标输入框
     */
    focusGoalInput() {
        this.switchTab('goals');
        setTimeout(() => {
            const goalInput = document.getElementById('goal-title');
            if (goalInput) {
                goalInput.focus();
            }
        }, 100);
    }

    /**
     * 关闭所有模态框
     */
    closeModals() {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            modal.style.display = 'none';
        });
    }

    /**
     * 设置窗口事件
     */
    setupWindowEvents() {
        // 页面关闭前保存数据
        window.addEventListener('beforeunload', () => {
            this.saveApplicationState();
        });

        // 窗口获得焦点时更新数据
        window.addEventListener('focus', () => {
            if (this.isInitialized) {
                this.refreshData();
            }
        });

        // 在线/离线状态检测
        window.addEventListener('online', () => {
            this.showNotification('网络连接已恢复', 'success');
        });

        window.addEventListener('offline', () => {
            this.showNotification('网络连接已断开，应用将在离线模式下运行', 'warning');
        });
    }

    /**
     * 设置表单验证
     */
    setupFormValidation() {
        // 任务表单验证
        const taskForm = document.getElementById('task-form');
        if (taskForm) {
            this.setupFormFieldValidation(taskForm);
        }

        // 目标表单验证
        const goalForm = document.getElementById('goal-form');
        if (goalForm) {
            this.setupFormFieldValidation(goalForm);
        }
    }

    /**
     * 设置表单字段验证
     * @param {HTMLFormElement} form 表单元素
     */
    setupFormFieldValidation(form) {
        const inputs = form.querySelectorAll('input[required], textarea[required]');
        
        inputs.forEach(input => {
            input.addEventListener('blur', () => {
                this.validateField(input);
            });

            input.addEventListener('input', () => {
                // 清除错误状态
                input.classList.remove('form-error');
            });
        });
    }

    /**
     * 验证字段
     * @param {HTMLInputElement} field 输入字段
     */
    validateField(field) {
        const value = field.value.trim();
        
        if (field.hasAttribute('required') && !value) {
            field.classList.add('form-error');
            this.showFieldError(field, '此字段为必填项');
            return false;
        }

        // 清除错误状态
        field.classList.remove('form-error');
        this.clearFieldError(field);
        return true;
    }

    /**
     * 显示字段错误
     * @param {HTMLInputElement} field 输入字段
     * @param {string} message 错误消息
     */
    showFieldError(field, message) {
        // 移除现有错误消息
        this.clearFieldError(field);

        // 创建错误消息元素
        const errorElement = document.createElement('div');
        errorElement.className = 'field-error';
        errorElement.textContent = message;
        
        // 插入错误消息
        field.parentNode.insertBefore(errorElement, field.nextSibling);
    }

    /**
     * 清除字段错误
     * @param {HTMLInputElement} field 输入字段
     */
    clearFieldError(field) {
        const errorElement = field.parentNode.querySelector('.field-error');
        if (errorElement) {
            errorElement.remove();
        }
    }

    /**
     * 设置定期更新
     */
    setupPeriodicUpdates() {
        // 每5分钟更新一次统计数据
        setInterval(() => {
            this.updateStatistics();
        }, 5 * 60 * 1000);

        // 每小时检查一次过期任务
        setInterval(() => {
            if (window.taskManager) {
                taskManager.checkExpiredTasks();
            }
        }, 60 * 60 * 1000);
    }

    /**
     * 更新统计数据
     */
    updateStatistics() {
        if (!this.isInitialized) return;

        try {
            // 更新任务统计
            if (window.taskManager) {
                taskManager.updateStatistics();
                taskManager.updateTaskCount();
            }

            // 更新目标统计
            if (window.goalManager) {
                goalManager.updateStatistics();
                goalManager.updateGoalCount();
            }

            // 更新周统计
            this.updateWeeklyStatistics();
        } catch (error) {
            console.error('更新统计数据失败:', error);
        }
    }

    /**
     * 更新周统计
     */
    updateWeeklyStatistics() {
        const weekElement = document.getElementById('week-completed');
        if (!weekElement) return;

        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        const tasks = storage.getTasks();
        const weekCompleted = tasks.filter(task => 
            task.status === 'completed' &&
            task.completedAt &&
            new Date(task.completedAt) >= oneWeekAgo
        ).length;

        weekElement.textContent = weekCompleted;
    }

    /**
     * 刷新数据
     */
    refreshData() {
        this.loadInitialData();
        this.showNotification('数据已刷新', 'info');
    }

    /**
     * 保存应用状态
     */
    saveApplicationState() {
        const state = {
            currentTab: this.currentTab,
            lastSaved: new Date().toISOString()
        };

        storage.updateSettings({ appState: state });
    }

    /**
     * 恢复应用状态
     */
    restoreApplicationState() {
        const settings = storage.getSettings();
        const appState = settings.appState;

        if (appState && appState.currentTab) {
            this.switchTab(appState.currentTab);
        }
    }

    /**
     * 显示欢迎消息
     */
    showWelcomeMessage() {
        const stats = storage.getStatistics();
        const isFirstTime = stats.totalTasksCreated === 0 && stats.totalGoalsCreated === 0;

        if (isFirstTime) {
            setTimeout(() => {
                this.showNotification('欢迎使用智能待办事项！开始创建你的第一个任务或目标吧。', 'info');
            }, 1000);
        } else {
            // 显示今日摘要
            const todayTasks = storage.getTodayTasks();
            const pendingCount = todayTasks.filter(task => task.status === 'pending').length;
            
            if (pendingCount > 0) {
                setTimeout(() => {
                    this.showNotification(`你今天有 ${pendingCount} 个待完成任务`, 'info');
                }, 500);
            }
        }
    }

    /**
     * 显示错误消息
     * @param {string} message 错误消息
     */
    showErrorMessage(message) {
        this.showNotification(message, 'error');
    }

    /**
     * 显示通知
     * @param {string} message 消息
     * @param {string} type 类型
     */
    showNotification(message, type = 'info') {
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
     * 导出数据
     */
    exportData() {
        try {
            const data = storage.exportData();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = `todo-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            URL.revokeObjectURL(url);
            this.showNotification('数据导出成功', 'success');
        } catch (error) {
            console.error('导出数据失败:', error);
            this.showNotification('导出数据失败', 'error');
        }
    }

    /**
     * 导入数据
     * @param {File} file 导入文件
     */
    async importData(file) {
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            
            if (storage.importData(data)) {
                this.loadInitialData();
                this.showNotification('数据导入成功', 'success');
            } else {
                this.showNotification('数据导入失败', 'error');
            }
        } catch (error) {
            console.error('导入数据失败:', error);
            this.showNotification('数据格式错误，导入失败', 'error');
        }
    }

    /**
     * 清除所有数据
     */
    clearAllData() {
        if (confirm('确定要清除所有数据吗？此操作不可撤销！')) {
            if (storage.clearAll()) {
                this.loadInitialData();
                this.showNotification('所有数据已清除', 'success');
            } else {
                this.showNotification('清除数据失败', 'error');
            }
        }
    }

    /**
     * 获取应用信息
     */
    getAppInfo() {
        const storageInfo = storage.getStorageInfo();
        const stats = storage.getStatistics();
        
        return {
            version: '1.0.0',
            storage: storageInfo,
            statistics: stats,
            uptime: Date.now() - (this.startTime || Date.now())
        };
    }
}

// 页面加载完成后初始化应用
const app = new App();

// 暴露到全局作用域以便调试
window.app = app;

// 添加一些全局工具函数
window.exportData = () => app.exportData();
window.clearAllData = () => app.clearAllData();

// 文件导入处理
window.handleFileImport = (event) => {
    const file = event.target.files[0];
    if (file) {
        app.importData(file);
    }
};