/**
 * 数据存储管理模块
 * 负责localStorage的封装和数据管理
 */

class StorageManager {
    constructor() {
        this.STORAGE_KEYS = {
            TASKS: 'enhanced_todo_tasks',
            GOALS: 'enhanced_todo_goals',
            SETTINGS: 'enhanced_todo_settings',
            STATISTICS: 'enhanced_todo_statistics'
        };
        
        // 初始化存储
        this.initializeStorage();
    }

    /**
     * 初始化存储结构
     */
    initializeStorage() {
        const defaultData = {
            [this.STORAGE_KEYS.TASKS]: [],
            [this.STORAGE_KEYS.GOALS]: [],
            [this.STORAGE_KEYS.SETTINGS]: {
                theme: 'light',
                notifications: true,
                autoCleanup: true,
                defaultDeadlineHours: 24
            },
            [this.STORAGE_KEYS.STATISTICS]: {
                totalTasksCreated: 0,
                totalTasksCompleted: 0,
                totalGoalsCreated: 0,
                totalGoalsCompleted: 0,
                streakDays: 0,
                lastActiveDate: null
            }
        };

        Object.entries(defaultData).forEach(([key, value]) => {
            if (!localStorage.getItem(key)) {
                this.setItem(key, value);
            }
        });
    }

    /**
     * 设置数据到localStorage
     * @param {string} key 存储键
     * @param {*} value 存储值
     * @returns {boolean} 是否成功
     */
    setItem(key, value) {
        try {
            const serializedValue = JSON.stringify(value);
            localStorage.setItem(key, serializedValue);
            return true;
        } catch (error) {
            console.error('存储数据失败:', error);
            return false;
        }
    }

    /**
     * 从localStorage获取数据
     * @param {string} key 存储键
     * @param {*} defaultValue 默认值
     * @returns {*} 存储的值或默认值
     */
    getItem(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error('获取数据失败:', error);
            return defaultValue;
        }
    }

    /**
     * 删除localStorage中的数据
     * @param {string} key 存储键
     */
    removeItem(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('删除数据失败:', error);
            return false;
        }
    }

    /**
     * 清空所有应用数据
     */
    clearAll() {
        try {
            Object.values(this.STORAGE_KEYS).forEach(key => {
                localStorage.removeItem(key);
            });
            this.initializeStorage();
            return true;
        } catch (error) {
            console.error('清空数据失败:', error);
            return false;
        }
    }

    // ========== 任务相关操作 ==========

    /**
     * 获取所有任务
     * @returns {Array} 任务列表
     */
    getTasks() {
        return this.getItem(this.STORAGE_KEYS.TASKS, []);
    }

    /**
     * 根据ID获取任务
     * @param {string} taskId 任务ID
     * @returns {Object|null} 任务对象
     */
    getTaskById(taskId) {
        const tasks = this.getTasks();
        return tasks.find(task => task.id === taskId) || null;
    }

    /**
     * 保存任务
     * @param {Object} task 任务对象
     * @returns {boolean} 是否成功
     */
    saveTask(task) {
        try {
            const tasks = this.getTasks();
            const existingIndex = tasks.findIndex(t => t.id === task.id);
            
            if (existingIndex !== -1) {
                // 更新现有任务
                tasks[existingIndex] = { ...tasks[existingIndex], ...task };
            } else {
                // 添加新任务
                tasks.push(task);
                this.incrementStatistic('totalTasksCreated');
            }
            
            return this.setItem(this.STORAGE_KEYS.TASKS, tasks);
        } catch (error) {
            console.error('保存任务失败:', error);
            return false;
        }
    }

    /**
     * 删除任务
     * @param {string} taskId 任务ID
     * @returns {boolean} 是否成功
     */
    deleteTask(taskId) {
        try {
            const tasks = this.getTasks();
            const filteredTasks = tasks.filter(task => task.id !== taskId);
            return this.setItem(this.STORAGE_KEYS.TASKS, filteredTasks);
        } catch (error) {
            console.error('删除任务失败:', error);
            return false;
        }
    }

    /**
     * 批量更新任务
     * @param {Array} tasks 任务列表
     * @returns {boolean} 是否成功
     */
    saveTasks(tasks) {
        return this.setItem(this.STORAGE_KEYS.TASKS, tasks);
    }

    // ========== 目标相关操作 ==========

    /**
     * 获取所有目标
     * @returns {Array} 目标列表
     */
    getGoals() {
        return this.getItem(this.STORAGE_KEYS.GOALS, []);
    }

    /**
     * 根据ID获取目标
     * @param {string} goalId 目标ID
     * @returns {Object|null} 目标对象
     */
    getGoalById(goalId) {
        const goals = this.getGoals();
        return goals.find(goal => goal.id === goalId) || null;
    }

    /**
     * 保存目标
     * @param {Object} goal 目标对象
     * @returns {boolean} 是否成功
     */
    saveGoal(goal) {
        try {
            const goals = this.getGoals();
            const existingIndex = goals.findIndex(g => g.id === goal.id);
            
            if (existingIndex !== -1) {
                // 更新现有目标
                goals[existingIndex] = { ...goals[existingIndex], ...goal };
            } else {
                // 添加新目标
                goals.push(goal);
                this.incrementStatistic('totalGoalsCreated');
            }
            
            return this.setItem(this.STORAGE_KEYS.GOALS, goals);
        } catch (error) {
            console.error('保存目标失败:', error);
            return false;
        }
    }

    /**
     * 删除目标
     * @param {string} goalId 目标ID
     * @returns {boolean} 是否成功
     */
    deleteGoal(goalId) {
        try {
            const goals = this.getGoals();
            const filteredGoals = goals.filter(goal => goal.id !== goalId);
            
            // 同时删除关联的任务或更新任务的goalId
            const tasks = this.getTasks();
            const updatedTasks = tasks.map(task => 
                task.goalId === goalId ? { ...task, goalId: null } : task
            );
            this.saveTasks(updatedTasks);
            
            return this.setItem(this.STORAGE_KEYS.GOALS, filteredGoals);
        } catch (error) {
            console.error('删除目标失败:', error);
            return false;
        }
    }

    // ========== 设置相关操作 ==========

    /**
     * 获取设置
     * @returns {Object} 设置对象
     */
    getSettings() {
        return this.getItem(this.STORAGE_KEYS.SETTINGS, {});
    }

    /**
     * 更新设置
     * @param {Object} settings 设置对象
     * @returns {boolean} 是否成功
     */
    updateSettings(settings) {
        const currentSettings = this.getSettings();
        const newSettings = { ...currentSettings, ...settings };
        return this.setItem(this.STORAGE_KEYS.SETTINGS, newSettings);
    }

    // ========== 统计相关操作 ==========

    /**
     * 获取统计数据
     * @returns {Object} 统计对象
     */
    getStatistics() {
        return this.getItem(this.STORAGE_KEYS.STATISTICS, {});
    }

    /**
     * 增加统计计数
     * @param {string} key 统计键
     * @param {number} increment 增加数量
     */
    incrementStatistic(key, increment = 1) {
        const stats = this.getStatistics();
        stats[key] = (stats[key] || 0) + increment;
        this.setItem(this.STORAGE_KEYS.STATISTICS, stats);
    }

    /**
     * 更新统计数据
     * @param {Object} stats 统计对象
     * @returns {boolean} 是否成功
     */
    updateStatistics(stats) {
        const currentStats = this.getStatistics();
        const newStats = { ...currentStats, ...stats };
        return this.setItem(this.STORAGE_KEYS.STATISTICS, newStats);
    }

    // ========== 数据查询和筛选 ==========

    /**
     * 根据状态筛选任务
     * @param {string} status 任务状态
     * @returns {Array} 筛选后的任务列表
     */
    getTasksByStatus(status) {
        const tasks = this.getTasks();
        return tasks.filter(task => task.status === status);
    }

    /**
     * 根据目标ID获取任务
     * @param {string} goalId 目标ID
     * @returns {Array} 关联任务列表
     */
    getTasksByGoal(goalId) {
        const tasks = this.getTasks();
        return tasks.filter(task => task.goalId === goalId);
    }

    /**
     * 获取今日任务
     * @returns {Array} 今日任务列表
     */
    getTodayTasks() {
        const tasks = this.getTasks();
        const today = new Date().toDateString();
        
        return tasks.filter(task => {
            if (!task.deadline) return false;
            const taskDate = new Date(task.deadline).toDateString();
            return taskDate === today;
        });
    }

    /**
     * 获取过期任务
     * @returns {Array} 过期任务列表
     */
    getExpiredTasks() {
        const tasks = this.getTasks();
        const now = new Date();
        
        return tasks.filter(task => {
            if (!task.deadline || task.status === 'completed') return false;
            return new Date(task.deadline) < now;
        });
    }

    // ========== 数据验证 ==========

    /**
     * 验证任务数据格式
     * @param {Object} task 任务对象
     * @returns {boolean} 是否有效
     */
    validateTask(task) {
        const requiredFields = ['id', 'title', 'status', 'createdAt'];
        return requiredFields.every(field => task.hasOwnProperty(field));
    }

    /**
     * 验证目标数据格式
     * @param {Object} goal 目标对象
     * @returns {boolean} 是否有效
     */
    validateGoal(goal) {
        const requiredFields = ['id', 'title', 'createdAt', 'status'];
        return requiredFields.every(field => goal.hasOwnProperty(field));
    }

    // ========== 数据导出导入 ==========

    /**
     * 导出所有数据
     * @returns {Object} 所有应用数据
     */
    exportData() {
        return {
            tasks: this.getTasks(),
            goals: this.getGoals(),
            settings: this.getSettings(),
            statistics: this.getStatistics(),
            exportDate: new Date().toISOString(),
            version: '1.0.0'
        };
    }

    /**
     * 导入数据
     * @param {Object} data 导入的数据
     * @returns {boolean} 是否成功
     */
    importData(data) {
        try {
            if (data.tasks) this.setItem(this.STORAGE_KEYS.TASKS, data.tasks);
            if (data.goals) this.setItem(this.STORAGE_KEYS.GOALS, data.goals);
            if (data.settings) this.setItem(this.STORAGE_KEYS.SETTINGS, data.settings);
            if (data.statistics) this.setItem(this.STORAGE_KEYS.STATISTICS, data.statistics);
            return true;
        } catch (error) {
            console.error('导入数据失败:', error);
            return false;
        }
    }

    /**
     * 获取存储使用情况
     * @returns {Object} 存储信息
     */
    getStorageInfo() {
        const data = this.exportData();
        const dataSize = JSON.stringify(data).length;
        
        return {
            tasksCount: data.tasks.length,
            goalsCount: data.goals.length,
            dataSize: dataSize,
            dataSizeFormatted: this.formatBytes(dataSize)
        };
    }

    /**
     * 格式化字节数
     * @param {number} bytes 字节数
     * @returns {string} 格式化的大小
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// 创建全局存储管理实例
const storage = new StorageManager();

// 暴露到全局作用域
window.storage = storage;