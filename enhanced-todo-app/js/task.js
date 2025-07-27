/**
 * 任务管理系统
 * 负责任务的创建、读取、更新、删除等操作
 */

class TaskManager {
    constructor() {
        this.tasks = [];
        this.currentFilter = 'all';
        this.timers = new Map(); // 存储倒计时定时器
        
        // 任务状态枚举
        this.STATUS = {
            PENDING: 'pending',
            COMPLETED: 'completed',
            EXPIRED: 'expired',
            FAILED: 'failed'
        };

        // 初始化
        this.init();
    }

    /**
     * 异步初始化
     */
    async init() {
        await this.loadTasks();
        this.setupEventListeners();
        this.startPeriodicCheck();
    }

    /**
     * 生成唯一ID
     * @returns {string} 唯一标识符
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    /**
     * 计算下次到期日期
     * @param {string} baseDate 基准日期
     * @param {string} repeatType 重复类型
     * @param {number} interval 间隔
     * @returns {string|null} 下次到期日期
     */
    calculateNextDueDate(baseDate, repeatType, interval = 1) {
        if (!baseDate || repeatType === 'none') return null;

        const date = new Date(baseDate);
        
        switch (repeatType) {
            case 'daily':
                date.setDate(date.getDate() + interval);
                break;
            case 'weekly':
                date.setDate(date.getDate() + (7 * interval));
                break;
            case 'monthly':
                date.setMonth(date.getMonth() + interval);
                break;
            case 'custom':
                date.setDate(date.getDate() + interval);
                break;
            default:
                return null;
        }

        return date.toISOString();
    }



    /**
     * 创建新任务
     * @param {Object} taskData 任务数据
     * @returns {Object} 创建的任务对象
     */
    async createTask(taskData) {
        const now = new Date().toISOString();
        
        const task = {
            id: this.generateId(),
            title: taskData.title.trim(),
            description: taskData.description ? taskData.description.trim() : '',
            deadline: taskData.deadline || null,
            goalId: taskData.goalId || null,
            status: this.STATUS.PENDING,
            createdAt: now,
            updatedAt: now,
            completedAt: null,
            priority: taskData.priority || 'medium',
            // 重复任务相关字段
            repeatType: taskData.repeatType || 'none',
            repeatInterval: taskData.repeatInterval || 1,
            repeatEndDate: taskData.repeatEndDate || null,
            isRepeatTemplate: (taskData.repeatType && taskData.repeatType !== 'none'),
            parentTemplateId: taskData.parentTemplateId || null,
            nextDueDate: (taskData.repeatType && taskData.repeatType !== 'none') ? 
                this.calculateNextDueDate(taskData.deadline, taskData.repeatType, taskData.repeatInterval) : null
        };

        // 验证任务数据
        if (!this.validateTaskData(task)) {
            throw new Error('任务数据无效');
        }

        // 保存到存储
        if (await storage.saveTask(task)) {
            await this.loadTasks(); // 重新加载任务列表
            this.showNotification('任务创建成功', 'success');
            this.updateStatistics();
            return task;
        } else {
            throw new Error('保存任务失败');
        }
    }

    /**
     * 加载所有任务
     */
    async loadTasks() {
        this.tasks = await storage.getTasks();
        this.checkExpiredTasks(); // 检查过期任务
        // 移除不存在的方法调用
        this.renderTasks();
        this.updateTaskCount();
        this.updateTaskSelects(); // 更新选择器选项
    }

    /**
     * 更新任务选择器选项
     */
    updateTaskSelects() {
        // 依赖关系功能已移除
    }

    /**
     * 根据ID获取任务
     * @param {string} taskId 任务ID
     * @returns {Object|null} 任务对象
     */
    getTask(taskId) {
        return this.tasks.find(task => task.id === taskId) || null;
    }

    /**
     * 更新任务
     * @param {string} taskId 任务ID
     * @param {Object} updates 更新数据
     * @returns {boolean} 是否成功
     */
    async updateTask(taskId, updates) {
        const task = this.getTask(taskId);
        if (!task) {
            this.showNotification('任务不存在', 'error');
            return false;
        }

        // 更新任务数据
        const updatedTask = {
            ...task,
            ...updates,
            updatedAt: new Date().toISOString()
        };

        // 如果状态变为完成，记录完成时间
        if (updates.status === this.STATUS.COMPLETED && task.status !== this.STATUS.COMPLETED) {
            updatedTask.completedAt = new Date().toISOString();
            storage.incrementStatistic('totalTasksCompleted');
        }

        // 保存更新
        if (await storage.saveTask(updatedTask)) {
            await this.loadTasks();
            this.showNotification('任务更新成功', 'success');
            return true;
        } else {
            this.showNotification('更新任务失败', 'error');
            return false;
        }
    }

    /**
     * 删除任务
     * @param {string} taskId 任务ID
     * @returns {boolean} 是否成功
     */
    deleteTask(taskId) {
        const task = this.getTask(taskId);
        if (!task) {
            this.showNotification('任务不存在', 'error');
            return false;
        }

        // 如果是重复任务模板，询问用户是否删除所有相关实例
        if (task.isRepeatTemplate) {
            const relatedTasks = this.tasks.filter(t => t.parentTemplateId === taskId);
            if (relatedTasks.length > 0) {
                const deleteAll = confirm(`这是一个重复任务模板，还有 ${relatedTasks.length} 个相关任务实例。是否删除所有相关任务？`);
                if (deleteAll) {
                    // 删除所有相关实例
                    relatedTasks.forEach(relatedTask => {
                        storage.deleteTask(relatedTask.id);
                    });
                }
            }
        }

        if (storage.deleteTask(taskId)) {
            // 清除相关定时器
            if (this.timers.has(taskId)) {
                clearInterval(this.timers.get(taskId));
                this.timers.delete(taskId);
            }
            
            this.loadTasks();
            this.showNotification('任务删除成功', 'success');
            return true;
        } else {
            this.showNotification('删除任务失败', 'error');
            return false;
        }
    }

    /**
     * 标记任务完成
     * @param {string} taskId 任务ID
     */
    completeTask(taskId) {
        this.updateTask(taskId, { status: this.STATUS.COMPLETED });
    }

    /**
     * 标记任务失败
     * @param {string} taskId 任务ID
     */
    failTask(taskId) {
        this.updateTask(taskId, { status: this.STATUS.FAILED });
    }

    /**
     * 重新激活任务
     * @param {string} taskId 任务ID
     */
    reactivateTask(taskId) {
        this.updateTask(taskId, { status: this.STATUS.PENDING });
    }

    /**
     * 筛选任务
     * @param {string} filter 筛选条件
     */
    filterTasks(filter) {
        this.currentFilter = filter;
        this.renderTasks();
    }

    /**
     * 获取筛选后的任务列表
     * @returns {Array} 筛选后的任务
     */
    getFilteredTasks() {
        switch (this.currentFilter) {
            case 'pending':
                return this.tasks.filter(task => task.status === this.STATUS.PENDING);
            case 'completed':
                return this.tasks.filter(task => task.status === this.STATUS.COMPLETED);
            case 'expired':
                return this.tasks.filter(task => task.status === this.STATUS.EXPIRED);
            case 'failed':
                return this.tasks.filter(task => task.status === this.STATUS.FAILED);
            case 'high':
                return this.tasks.filter(task => task.priority === 'high');
            case 'medium':
                return this.tasks.filter(task => task.priority === 'medium');
            case 'low':
                return this.tasks.filter(task => task.priority === 'low');
            case 'repeating':
                return this.tasks.filter(task => task.repeatType !== 'none');
            case 'single':
                return this.tasks.filter(task => task.repeatType === 'none');
            default:
                return this.tasks;
        }
    }

    /**
     * 检查过期任务
     */
    checkExpiredTasks() {
        const now = new Date();
        let hasExpired = false;

        this.tasks.forEach(task => {
            if (task.deadline && 
                task.status === this.STATUS.PENDING && 
                new Date(task.deadline) < now) {
                
                task.status = this.STATUS.EXPIRED;
                storage.saveTask(task);
                hasExpired = true;
            }
        });

        // 检查并生成重复任务
        this.generateRepeatTasks();

        if (hasExpired) {
            this.showNotification('有任务已过期', 'warning');
        }
    }

    /**
     * 生成重复任务
     */
    generateRepeatTasks() {
        const now = new Date();
        const templates = this.tasks.filter(task => 
            task.isRepeatTemplate && 
            task.repeatType !== 'none' &&
            task.nextDueDate &&
            new Date(task.nextDueDate) <= now
        );

        templates.forEach(template => {
            this.createRepeatTaskInstance(template);
        });
    }

    /**
     * 创建重复任务实例
     * @param {Object} template 重复任务模板
     */
    createRepeatTaskInstance(template) {
        const now = new Date();
        
        // 检查是否已经超过结束日期
        if (template.repeatEndDate && new Date(template.repeatEndDate) < now) {
            // 停止重复任务
            template.isRepeatTemplate = false;
            template.nextDueDate = null;
            storage.updateTask(template);
            return;
        }

        // 创建新的任务实例
        const newTask = {
            ...template,
            id: this.generateId(),
            status: this.STATUS.PENDING,
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
            completedAt: null,
            deadline: template.nextDueDate,
            isRepeatTemplate: false,
            parentTemplateId: template.id,
            nextDueDate: null
        };

        // 保存新任务实例
        storage.saveTask(newTask);

        // 更新模板的下次到期日期
        template.nextDueDate = this.calculateNextDueDate(
            template.nextDueDate, 
            template.repeatType, 
            template.repeatInterval
        );
        template.updatedAt = now.toISOString();
        storage.updateTask(template);

        this.showNotification(`已生成重复任务：${template.title}`, 'info');
    }

    /**
     * 定期检查任务状态
     */
    startPeriodicCheck() {
        // 每分钟检查一次过期任务
        setInterval(() => {
            this.checkExpiredTasks();
            this.updateCountdowns();
        }, 60000);
    }

    /**
     * 更新所有倒计时显示
     */
    updateCountdowns() {
        this.tasks.forEach(task => {
            if (task.deadline && task.status === this.STATUS.PENDING) {
                this.updateTaskCountdown(task.id);
            }
        });
    }

    /**
     * 更新单个任务的倒计时
     * @param {string} taskId 任务ID
     */
    updateTaskCountdown(taskId) {
        const task = this.getTask(taskId);
        if (!task || !task.deadline) return;

        const countdownElement = document.querySelector(`[data-task-id="${taskId}"] .task-countdown`);
        if (!countdownElement) return;

        const now = new Date();
        const deadline = new Date(task.deadline);
        const timeLeft = deadline - now;

        if (timeLeft <= 0) {
            countdownElement.textContent = '已过期';
            countdownElement.className = 'task-countdown urgent';
            this.updateTask(taskId, { status: this.STATUS.EXPIRED });
            return;
        }

        const countdown = this.formatCountdown(timeLeft);
        countdownElement.textContent = countdown.text;
        countdownElement.className = `task-countdown ${countdown.urgency}`;
    }

    /**
     * 格式化倒计时
     * @param {number} timeLeft 剩余时间（毫秒）
     * @returns {Object} 格式化结果
     */
    formatCountdown(timeLeft) {
        const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

        let text = '';
        let urgency = 'normal';

        if (days > 0) {
            text = `${days}天 ${hours}时`;
        } else if (hours > 0) {
            text = `${hours}时 ${minutes}分`;
            if (hours < 24) urgency = 'warning';
            if (hours < 2) urgency = 'urgent';
        } else {
            text = `${minutes}分钟`;
            urgency = 'urgent';
        }

        return { text, urgency };
    }

    /**
     * 渲染任务列表
     */
    renderTasks() {
        const taskList = document.getElementById('task-list');
        const filteredTasks = this.getFilteredTasks();

        if (filteredTasks.length === 0) {
            taskList.innerHTML = `
                <div class="empty-state">
                    <p>暂无任务</p>
                    <small>添加你的第一个任务吧！</small>
                </div>
            `;
            return;
        }

        // 按优先级和创建时间排序：高优先级在前，同优先级按创建时间倒序
        const sortedTasks = filteredTasks.sort((a, b) => {
            // 优先级权重：high = 3, medium = 2, low = 1
            const priorityWeight = { high: 3, medium: 2, low: 1 };
            const priorityDiff = priorityWeight[b.priority] - priorityWeight[a.priority];
            
            if (priorityDiff !== 0) {
                return priorityDiff; // 按优先级排序
            }
            
            // 同优先级按创建时间倒序
            return new Date(b.createdAt) - new Date(a.createdAt);
        });

        taskList.innerHTML = sortedTasks.map(task => this.renderTaskItem(task)).join('');

        // 启动倒计时更新
        this.startCountdownUpdates();
    }

    /**
     * 渲染单个任务项
     * @param {Object} task 任务对象
     * @returns {string} HTML字符串
     */
    renderTaskItem(task) {
        const goalName = task.goalId ? this.getGoalName(task.goalId) : '';
        const countdown = task.deadline && task.status === this.STATUS.PENDING ? 
            this.formatCountdown(new Date(task.deadline) - new Date()) : null;

        return `
            <div class="task-item ${task.status} priority-${task.priority}" data-task-id="${task.id}">
                <div class="task-header">
                    <h3 class="task-title">
                        ${task.isRepeatTemplate ? '🔄 ' : ''}${task.parentTemplateId ? '🔗 ' : ''}${this.escapeHtml(task.title)}
                    </h3>
                    <div class="task-meta-badges">
                        <span class="task-priority ${task.priority}">${this.getPriorityText(task.priority)}</span>
                        ${task.repeatType !== 'none' ? `<span class="task-repeat ${task.isRepeatTemplate ? 'template' : ''}">${this.getRepeatText(task.repeatType, task.repeatInterval)}</span>` : ''}
                        <span class="task-status ${task.status}">${this.getStatusText(task.status)}</span>
                    </div>
                </div>
                
                ${task.description ? `<p class="task-description">${this.escapeHtml(task.description)}</p>` : ''}
                
                <div class="task-meta">
                    <div class="task-info">
                        ${goalName ? `<span class="task-goal">🎯 ${goalName}</span>` : ''}
                        ${task.deadline ? `
                            <span class="task-deadline">📅 ${this.formatDate(task.deadline)}</span>
                            ${countdown ? `<span class="task-countdown ${countdown.urgency}">${countdown.text}</span>` : ''}
                        ` : ''}
                    </div>
                    
                    <div class="task-actions">
                        ${task.status === this.STATUS.PENDING ? `
                            <button class="btn btn-success" onclick="taskManager.completeTask('${task.id}')">
                                ✓ 完成
                            </button>
                            <button class="btn btn-danger" onclick="taskManager.failTask('${task.id}')">
                                ✗ 失败
                            </button>
                        ` : ''}
                        
                        ${task.status !== this.STATUS.PENDING ? `
                            <button class="btn btn-secondary" onclick="taskManager.reactivateTask('${task.id}')">
                                🔄 重新激活
                            </button>
                        ` : ''}
                        
                        <button class="btn btn-secondary" onclick="taskManager.editTask('${task.id}')">
                            ✏️ 编辑
                        </button>
                        <button class="btn btn-danger" onclick="taskManager.deleteTask('${task.id}')">
                            🗑️ 删除
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * 启动倒计时更新
     */
    startCountdownUpdates() {
        // 清除现有定时器
        this.timers.forEach(timer => clearInterval(timer));
        this.timers.clear();

        // 为每个有倒计时的任务创建定时器
        this.tasks.forEach(task => {
            if (task.deadline && task.status === this.STATUS.PENDING) {
                const timer = setInterval(() => {
                    this.updateTaskCountdown(task.id);
                }, 1000); // 每秒更新
                
                this.timers.set(task.id, timer);
            }
        });
    }

    /**
     * 编辑任务
     * @param {string} taskId 任务ID
     */
    editTask(taskId) {
        const task = this.getTask(taskId);
        if (!task) return;

        // 显示编辑模态框
        this.showEditModal(task);
    }

    /**
     * 显示编辑模态框
     * @param {Object} task 任务对象
     */
    showEditModal(task) {
        const modal = document.getElementById('edit-modal');
        const modalTitle = document.getElementById('modal-title');
        const modalBody = document.getElementById('modal-body');

        modalTitle.textContent = '编辑任务';
        modalBody.innerHTML = `
            <form id="edit-task-form">
                <input type="hidden" id="edit-task-id" value="${task.id}">
                
                <div class="form-group">
                    <label for="edit-task-title">任务标题：</label>
                    <input type="text" id="edit-task-title" value="${this.escapeHtml(task.title)}" required>
                </div>
                
                <div class="form-group">
                    <label for="edit-task-description">任务描述：</label>
                    <textarea id="edit-task-description" rows="3">${this.escapeHtml(task.description || '')}</textarea>
                </div>
                
                <div class="form-group">
                    <label for="edit-task-deadline">截止时间：</label>
                    <input type="datetime-local" id="edit-task-deadline" 
                           value="${task.deadline ? new Date(task.deadline).toISOString().slice(0, 16) : ''}">
                </div>
                
                <div class="form-group">
                    <label for="edit-task-goal">关联目标：</label>
                    <select id="edit-task-goal">
                        <option value="">无关联目标</option>
                        ${this.getGoalOptions(task.goalId)}
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="edit-task-priority">优先级：</label>
                    <select id="edit-task-priority">
                        <option value="low" ${task.priority === 'low' ? 'selected' : ''}>🟢 低优先级</option>
                        <option value="medium" ${task.priority === 'medium' ? 'selected' : ''}>🟡 中优先级</option>
                        <option value="high" ${task.priority === 'high' ? 'selected' : ''}>🔴 高优先级</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="edit-task-repeat">重复周期：</label>
                    <select id="edit-task-repeat">
                        <option value="none" ${task.repeatType === 'none' ? 'selected' : ''}>不重复</option>
                        <option value="daily" ${task.repeatType === 'daily' ? 'selected' : ''}>每日</option>
                        <option value="weekly" ${task.repeatType === 'weekly' ? 'selected' : ''}>每周</option>
                        <option value="monthly" ${task.repeatType === 'monthly' ? 'selected' : ''}>每月</option>
                        <option value="custom" ${task.repeatType === 'custom' ? 'selected' : ''}>自定义</option>
                    </select>
                </div>
                
                ${task.repeatType === 'custom' || task.repeatType !== 'none' ? `
                    <div class="form-group">
                        <label for="edit-task-repeat-interval">间隔天数：</label>
                        <input type="number" id="edit-task-repeat-interval" min="1" max="365" value="${task.repeatInterval || 1}">
                    </div>
                    <div class="form-group">
                        <label for="edit-task-repeat-end">重复结束：</label>
                        <input type="date" id="edit-task-repeat-end" value="${task.repeatEndDate ? task.repeatEndDate.split('T')[0] : ''}">
                    </div>
                ` : ''}
                
                <div class="form-actions">
                    <button type="submit" class="btn btn-primary">保存更改</button>
                    <button type="button" class="btn btn-secondary" onclick="taskManager.closeModal()">取消</button>
                </div>
            </form>
        `;

        modal.style.display = 'block';
        document.getElementById('edit-task-form').addEventListener('submit', this.handleEditSubmit.bind(this));
    }

    /**
     * 处理编辑表单提交
     * @param {Event} event 提交事件
     */
    handleEditSubmit(event) {
        event.preventDefault();
        
        const taskId = document.getElementById('edit-task-id').value;
        const title = document.getElementById('edit-task-title').value.trim();
        const description = document.getElementById('edit-task-description').value.trim();
        const deadline = document.getElementById('edit-task-deadline').value || null;
        const goalId = document.getElementById('edit-task-goal').value || null;
        const priority = document.getElementById('edit-task-priority').value || 'medium';
        
        // 重复任务相关字段
        const repeatType = document.getElementById('edit-task-repeat').value || 'none';
        const repeatInterval = document.getElementById('edit-task-repeat-interval')?.value ? 
            parseInt(document.getElementById('edit-task-repeat-interval').value) || 1 : 1;
        const repeatEndDate = document.getElementById('edit-task-repeat-end')?.value || null;

        if (!title) {
            this.showNotification('请输入任务标题', 'error');
            return;
        }

        const updates = {
            title,
            description,
            deadline,
            goalId,
            priority,
            repeatType,
            repeatInterval,
            repeatEndDate,
            isRepeatTemplate: repeatType !== 'none',
            nextDueDate: this.calculateNextDueDate(deadline, repeatType, repeatInterval)
        };

        if (this.updateTask(taskId, updates)) {
            this.closeModal();
        }
    }

    /**
     * 关闭模态框
     */
    closeModal() {
        const modal = document.getElementById('edit-modal');
        modal.style.display = 'none';
    }

    /**
     * 获取目标选项HTML
     * @param {string} selectedGoalId 选中的目标ID
     * @returns {string} 选项HTML
     */
    getGoalOptions(selectedGoalId) {
        const goals = storage.getGoals();
        return goals.map(goal => 
            `<option value="${goal.id}" ${goal.id === selectedGoalId ? 'selected' : ''}>
                ${this.escapeHtml(goal.title)}
            </option>`
        ).join('');
    }

    /**
     * 获取目标名称
     * @param {string} goalId 目标ID
     * @returns {string} 目标名称
     */
    getGoalName(goalId) {
        const goal = storage.getGoalById(goalId);
        return goal ? goal.title : '';
    }

    /**
     * 获取状态文本
     * @param {string} status 状态
     * @returns {string} 状态文本
     */
    getStatusText(status) {
        const statusMap = {
            [this.STATUS.PENDING]: '待完成',
            [this.STATUS.COMPLETED]: '已完成',
            [this.STATUS.EXPIRED]: '已过期',
            [this.STATUS.FAILED]: '已失败'
        };
        return statusMap[status] || status;
    }

    /**
     * 获取优先级文本
     * @param {string} priority 优先级
     * @returns {string} 优先级文本
     */
    getPriorityText(priority) {
        const priorityMap = {
            'high': '🔴 高优先级',
            'medium': '🟡 中优先级',
            'low': '🟢 低优先级'
        };
        return priorityMap[priority] || '🟡 中优先级';
    }

    /**
     * 获取重复文本
     * @param {string} repeatType 重复类型
     * @param {number} interval 间隔
     * @returns {string} 重复文本
     */
    getRepeatText(repeatType, interval = 1) {
        const repeatMap = {
            'daily': interval === 1 ? '🔄 每日' : `🔄 每${interval}天`,
            'weekly': interval === 1 ? '🔄 每周' : `🔄 每${interval}周`, 
            'monthly': interval === 1 ? '🔄 每月' : `🔄 每${interval}月`,
            'custom': `🔄 每${interval}天`
        };
        return repeatMap[repeatType] || '🔄 重复';
    }

    /**
     * 格式化日期
     * @param {string} dateString 日期字符串
     * @returns {string} 格式化的日期
     */
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleString('zh-CN');
    }

    /**
     * HTML转义
     * @param {string} text 文本
     * @returns {string} 转义后的文本
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * 验证任务数据
     * @param {Object} task 任务对象
     * @returns {boolean} 是否有效
     */
    validateTaskData(task) {
        return task.title && task.title.trim().length > 0;
    }

    /**
     * 更新任务统计
     */
    updateTaskCount() {
        const taskCount = document.getElementById('task-count');
        if (taskCount) {
            taskCount.textContent = `${this.tasks.length} 个任务`;
        }
    }

    /**
     * 更新统计信息
     */
    updateStatistics() {
        // 更新今日完成任务数
        const today = new Date().toDateString();
        const todayCompleted = this.tasks.filter(task => 
            task.status === this.STATUS.COMPLETED &&
            task.completedAt &&
            new Date(task.completedAt).toDateString() === today
        ).length;

        const todayElement = document.getElementById('today-completed');
        if (todayElement) {
            todayElement.textContent = todayCompleted;
        }
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
     * 设置事件监听器
     */
    setupEventListeners() {
        // 任务表单提交
        const taskForm = document.getElementById('task-form');
        if (taskForm) {
            taskForm.addEventListener('submit', this.handleTaskSubmit.bind(this));
        }

        // 筛选按钮
        const filterButtons = document.querySelectorAll('.filter-btn');
        filterButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const filter = btn.dataset.filter;
                this.setActiveFilter(btn, filter);
                this.filterTasks(filter);
            });
        });

        // 重复选项动态控制
        const repeatSelect = document.getElementById('task-repeat');
        if (repeatSelect) {
            repeatSelect.addEventListener('change', this.handleRepeatChange.bind(this));
        }

        // 模态框关闭
        const modal = document.getElementById('edit-modal');
        const closeBtn = modal?.querySelector('.close');
        if (closeBtn) {
            closeBtn.addEventListener('click', this.closeModal.bind(this));
        }

        // 点击模态框外部关闭
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal();
                }
            });
        }
    }

    /**
     * 处理重复选项变化
     * @param {Event} event 变化事件
     */
    handleRepeatChange(event) {
        const repeatType = event.target.value;
        const customRepeat = document.querySelector('.custom-repeat');
        const repeatEnd = document.querySelector('.repeat-end');

        if (repeatType === 'custom') {
            customRepeat.style.display = 'flex';
            repeatEnd.style.display = 'flex';
        } else if (repeatType !== 'none') {
            customRepeat.style.display = 'none';
            repeatEnd.style.display = 'flex';
        } else {
            customRepeat.style.display = 'none';
            repeatEnd.style.display = 'none';
        }
    }

    /**
     * 处理任务表单提交
     * @param {Event} event 提交事件
     */
    handleTaskSubmit(event) {
        event.preventDefault();
        
        const title = document.getElementById('task-title').value.trim();
        const description = document.getElementById('task-description').value.trim();
        const deadline = document.getElementById('task-deadline').value || null;
        const goalId = document.getElementById('task-goal').value || null;
        const priority = document.getElementById('task-priority').value || 'medium';
        
        // 重复任务相关字段
        const repeatType = document.getElementById('task-repeat').value || 'none';
        const repeatInterval = repeatType === 'custom' ? 
            parseInt(document.getElementById('task-repeat-interval').value) || 1 : 1;
        const repeatEndDate = document.getElementById('task-repeat-end').value || null;

        if (!title) {
            this.showNotification('请输入任务标题', 'error');
            return;
        }

        try {
            this.createTask({
                title,
                description,
                deadline,
                goalId,
                priority,
                repeatType,
                repeatInterval,
                repeatEndDate
            });

            // 重置表单
            event.target.reset();
            // 重置优先级为默认值
            document.getElementById('task-priority').value = 'medium';
            // 重置重复选项显示
            this.handleRepeatChange({ target: { value: 'none' } });
            // 重新加载选项列表
            this.updateTaskSelects();
        } catch (error) {
            this.showNotification(error.message, 'error');
        }
    }

    /**
     * 设置活动筛选器
     * @param {Element} activeBtn 活动按钮
     * @param {string} filter 筛选器
     */
    setActiveFilter(activeBtn, filter) {
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        activeBtn.classList.add('active');
    }
}

// 创建全局任务管理实例
const taskManager = new TaskManager();

// 暴露到全局作用域
window.taskManager = taskManager;