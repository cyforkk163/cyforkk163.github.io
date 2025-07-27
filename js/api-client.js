/**
 * API客户端 - 与后端API通信的封装类
 */
class ApiClient {
    constructor() {
        this.baseURL = this.getApiBaseUrl();
        this.isOnline = true; // 用于判断是否连接到后端
    }

    /**
     * 动态获取API基础URL
     * @returns {string} API基础URL
     */
    getApiBaseUrl() {
        // 开发环境检测
        if (window.TODO_APP_CONFIG?.isDevelopment()) {
            return 'http://localhost:3001/api';
        }
        
        // 生产环境
        const backendUrl = window.TODO_APP_CONFIG?.API_URL;
        
        // 如果没有配置或还是默认值，回退到localStorage模式
        if (!backendUrl || backendUrl === 'YOUR_TUNNEL_URL_HERE') {
            console.warn('⚠️ 后端API地址未配置，将使用localStorage模式');
            return null; // 返回null表示使用localStorage
        }
        
        return backendUrl.endsWith('/api') ? backendUrl : `${backendUrl}/api`;
    }

    /**
     * 发送HTTP请求
     * @param {string} endpoint API端点
     * @param {Object} options 请求选项
     * @returns {Promise} 请求结果
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true', // 跳过ngrok浏览器警告
                ...options.headers
            },
            ...options
        };

        // 添加认证token
        if (window.authManager && window.authManager.getToken()) {
            config.headers['Authorization'] = `Bearer ${window.authManager.getToken()}`;
        }

        if (config.body && typeof config.body === 'object') {
            config.body = JSON.stringify(config.body);
        }

        try {
            const response = await fetch(url, config);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || `HTTP ${response.status}`);
            }
            
            this.isOnline = true;
            return data;
        } catch (error) {
            console.error(`API请求失败 ${endpoint}:`, error);
            this.isOnline = false;
            throw error;
        }
    }

    // ========== 任务相关 API ==========

    /**
     * 获取所有任务
     * @param {Object} filters 筛选条件
     * @returns {Promise<Array>} 任务列表
     */
    async getTasks(filters = {}) {
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                params.append(key, value);
            }
        });
        
        const endpoint = `/tasks${params.toString() ? '?' + params.toString() : ''}`;
        const result = await this.request(endpoint);
        return result.data;
    }

    /**
     * 根据ID获取任务
     * @param {string} taskId 任务ID
     * @returns {Promise<Object>} 任务对象
     */
    async getTask(taskId) {
        const result = await this.request(`/tasks/${taskId}`);
        return result.data;
    }

    /**
     * 创建任务
     * @param {Object} taskData 任务数据
     * @returns {Promise<Object>} 创建的任务
     */
    async createTask(taskData) {
        const result = await this.request('/tasks', {
            method: 'POST',
            body: taskData
        });
        return result.data;
    }

    /**
     * 更新任务
     * @param {string} taskId 任务ID
     * @param {Object} updateData 更新数据
     * @returns {Promise<Object>} 更新后的任务
     */
    async updateTask(taskId, updateData) {
        const result = await this.request(`/tasks/${taskId}`, {
            method: 'PUT',
            body: updateData
        });
        return result.data;
    }

    /**
     * 删除任务
     * @param {string} taskId 任务ID
     * @returns {Promise<boolean>} 是否成功
     */
    async deleteTask(taskId) {
        await this.request(`/tasks/${taskId}`, {
            method: 'DELETE'
        });
        return true;
    }

    // ========== 目标相关 API ==========

    /**
     * 获取所有目标
     * @param {Object} filters 筛选条件
     * @returns {Promise<Array>} 目标列表
     */
    async getGoals(filters = {}) {
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                params.append(key, value);
            }
        });
        
        const endpoint = `/goals${params.toString() ? '?' + params.toString() : ''}`;
        const result = await this.request(endpoint);
        return result.data;
    }

    /**
     * 根据ID获取目标
     * @param {string} goalId 目标ID
     * @returns {Promise<Object>} 目标对象
     */
    async getGoal(goalId) {
        const result = await this.request(`/goals/${goalId}`);
        return result.data;
    }

    /**
     * 创建目标
     * @param {Object} goalData 目标数据
     * @returns {Promise<Object>} 创建的目标
     */
    async createGoal(goalData) {
        const result = await this.request('/goals', {
            method: 'POST',
            body: goalData
        });
        return result.data;
    }

    /**
     * 更新目标
     * @param {string} goalId 目标ID
     * @param {Object} updateData 更新数据
     * @returns {Promise<Object>} 更新后的目标
     */
    async updateGoal(goalId, updateData) {
        const result = await this.request(`/goals/${goalId}`, {
            method: 'PUT',
            body: updateData
        });
        return result.data;
    }

    /**
     * 删除目标
     * @param {string} goalId 目标ID
     * @returns {Promise<boolean>} 是否成功
     */
    async deleteGoal(goalId) {
        await this.request(`/goals/${goalId}`, {
            method: 'DELETE'
        });
        return true;
    }

    // ========== 设置相关 API ==========

    /**
     * 获取设置
     * @returns {Promise<Object>} 设置对象
     */
    async getSettings() {
        const result = await this.request('/settings');
        return result.data;
    }

    /**
     * 更新设置
     * @param {string} key 设置键
     * @param {*} value 设置值
     * @returns {Promise<boolean>} 是否成功
     */
    async updateSetting(key, value) {
        await this.request('/settings', {
            method: 'PUT',
            body: { setting_key: key, setting_value: value }
        });
        return true;
    }

    // ========== 统计相关 API ==========

    /**
     * 获取统计数据
     * @returns {Promise<Object>} 统计对象
     */
    async getStatistics() {
        const result = await this.request('/statistics');
        return result.data;
    }

    // ========== 数据导入导出 API ==========

    /**
     * 导出所有数据
     * @returns {Promise<Object>} 导出的数据
     */
    async exportData() {
        const result = await this.request('/export');
        return result.data;
    }

    /**
     * 导入数据
     * @param {Object} data 导入的数据
     * @returns {Promise<boolean>} 是否成功
     */
    async importData(data) {
        await this.request('/import', {
            method: 'POST',
            body: data
        });
        return true;
    }

    /**
     * 检查后端连接状态
     * @returns {Promise<boolean>} 是否在线
     */
    async checkConnection() {
        try {
            await this.request('/statistics');
            this.isOnline = true;
            return true;
        } catch (error) {
            this.isOnline = false;
            return false;
        }
    }
}

// 创建全局API客户端实例
const apiClient = new ApiClient();

// 暴露到全局作用域
window.apiClient = apiClient;