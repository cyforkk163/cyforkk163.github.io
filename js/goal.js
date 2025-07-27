/**
 * 目标管理系统
 * 负责长期目标的创建、管理和进度追踪
 */

class GoalManager {
    constructor() {
        this.goals = [];
        
        // 目标状态枚举
        this.STATUS = {
            ACTIVE: 'active',
            COMPLETED: 'completed',
            PAUSED: 'paused',
            ARCHIVED: 'archived'
        };

        // 初始化
        this.loadGoals();
        this.setupEventListeners();
    }

    /**
     * 生成唯一ID
     * @returns {string} 唯一标识符
     */
    generateId() {
        return 'goal_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    /**
     * 创建新目标
     * @param {Object} goalData 目标数据
     * @returns {Object} 创建的目标对象
     */
    createGoal(goalData) {
        const now = new Date().toISOString();
        
        const goal = {
            id: this.generateId(),
            title: goalData.title.trim(),
            description: goalData.description ? goalData.description.trim() : '',
            targetDate: goalData.targetDate || null,
            status: this.STATUS.ACTIVE,
            progress: 0,
            tasks: [], // 关联的任务ID数组
            createdAt: now,
            updatedAt: now,
            completedAt: null,
            category: goalData.category || 'personal',
            priority: goalData.priority || 'medium'
        };

        // 验证目标数据
        if (!this.validateGoalData(goal)) {
            throw new Error('目标数据无效');
        }

        // 保存到存储
        if (storage.saveGoal(goal)) {
            this.loadGoals(); // 重新加载目标列表
            this.updateGoalSelect(); // 更新任务表单中的目标选择器
            this.showNotification('目标创建成功', 'success');
            this.updateStatistics();
            return goal;
        } else {
            throw new Error('保存目标失败');
        }
    }

    /**
     * 加载所有目标
     */
    loadGoals() {
        this.goals = storage.getGoals();
        this.updateGoalProgress(); // 更新所有目标进度
        this.renderGoals();
        this.updateGoalCount();
    }

    /**
     * 根据ID获取目标
     * @param {string} goalId 目标ID
     * @returns {Object|null} 目标对象
     */
    getGoal(goalId) {
        return this.goals.find(goal => goal.id === goalId) || null;
    }

    /**
     * 更新目标
     * @param {string} goalId 目标ID
     * @param {Object} updates 更新数据
     * @returns {boolean} 是否成功
     */
    updateGoal(goalId, updates) {
        const goal = this.getGoal(goalId);
        if (!goal) {
            this.showNotification('目标不存在', 'error');
            return false;
        }

        // 更新目标数据
        const updatedGoal = {
            ...goal,
            ...updates,
            updatedAt: new Date().toISOString()
        };

        // 如果状态变为完成，记录完成时间
        if (updates.status === this.STATUS.COMPLETED && goal.status !== this.STATUS.COMPLETED) {
            updatedGoal.completedAt = new Date().toISOString();
            storage.incrementStatistic('totalGoalsCompleted');
        }

        // 保存更新
        if (storage.saveGoal(updatedGoal)) {
            this.loadGoals();
            this.showNotification('目标更新成功', 'success');
            return true;
        } else {
            this.showNotification('更新目标失败', 'error');
            return false;
        }
    }

    /**
     * 删除目标
     * @param {string} goalId 目标ID
     * @returns {boolean} 是否成功
     */
    deleteGoal(goalId) {
        // 确认删除
        if (!confirm('删除目标将同时移除所有关联任务的目标关联，确定要删除吗？')) {
            return false;
        }

        if (storage.deleteGoal(goalId)) {
            this.loadGoals();
            this.updateGoalSelect(); // 更新任务表单中的目标选择器
            this.showNotification('目标删除成功', 'success');
            return true;
        } else {
            this.showNotification('删除目标失败', 'error');
            return false;
        }
    }

    /**
     * 更新所有目标的进度
     */
    updateGoalProgress() {
        this.goals.forEach(goal => {
            const progress = this.calculateGoalProgress(goal.id);
            if (goal.progress !== progress) {
                goal.progress = progress;
                
                // 如果进度达到100%，自动标记为完成
                if (progress === 100 && goal.status === this.STATUS.ACTIVE) {
                    goal.status = this.STATUS.COMPLETED;
                    goal.completedAt = new Date().toISOString();
                    storage.incrementStatistic('totalGoalsCompleted');
                }
                
                storage.saveGoal(goal);
            }
        });
    }

    /**
     * 计算目标进度
     * @param {string} goalId 目标ID
     * @returns {number} 进度百分比 (0-100)
     */
    calculateGoalProgress(goalId) {
        const tasks = storage.getTasksByGoal(goalId);
        
        if (tasks.length === 0) {
            return 0;
        }

        const completedTasks = tasks.filter(task => task.status === 'completed');
        return Math.round((completedTasks.length / tasks.length) * 100);
    }

    /**
     * 为目标添加任务
     * @param {string} goalId 目标ID
     * @param {string} taskId 任务ID
     */
    addTaskToGoal(goalId, taskId) {
        const goal = this.getGoal(goalId);
        if (goal && !goal.tasks.includes(taskId)) {
            goal.tasks.push(taskId);
            this.updateGoal(goalId, { tasks: goal.tasks });
        }
    }

    /**
     * 从目标移除任务
     * @param {string} goalId 目标ID
     * @param {string} taskId 任务ID
     */
    removeTaskFromGoal(goalId, taskId) {
        const goal = this.getGoal(goalId);
        if (goal) {
            goal.tasks = goal.tasks.filter(id => id !== taskId);
            this.updateGoal(goalId, { tasks: goal.tasks });
        }
    }

    /**
     * 渲染目标列表
     */
    renderGoals() {
        const goalList = document.getElementById('goal-list');
        
        if (this.goals.length === 0) {
            goalList.innerHTML = `
                <div class="empty-state">
                    <p>暂无目标</p>
                    <small>设定你的第一个长期目标吧！</small>
                </div>
            `;
            return;
        }

        // 按创建时间倒序排列
        const sortedGoals = this.goals.sort((a, b) => 
            new Date(b.createdAt) - new Date(a.createdAt)
        );

        goalList.innerHTML = sortedGoals.map(goal => this.renderGoalItem(goal)).join('');
    }

    /**
     * 渲染单个目标项
     * @param {Object} goal 目标对象
     * @returns {string} HTML字符串
     */
    renderGoalItem(goal) {
        const tasks = storage.getTasksByGoal(goal.id);
        const completedTasks = tasks.filter(task => task.status === 'completed');
        const pendingTasks = tasks.filter(task => task.status === 'pending');
        
        const daysLeft = goal.targetDate ? this.calculateDaysLeft(goal.targetDate) : null;

        return `
            <div class="goal-item ${goal.status}" data-goal-id="${goal.id}">
                <div class="goal-header">
                    <div class="goal-title-section">
                        <h3 class="goal-title">${this.escapeHtml(goal.title)}</h3>
                        <span class="goal-status ${goal.status}">${this.getStatusText(goal.status)}</span>
                    </div>
                    <div class="goal-progress-section">
                        <span class="goal-progress-text">${goal.progress}%</span>
                        ${daysLeft ? `<span class="goal-days-left">${daysLeft}</span>` : ''}
                    </div>
                </div>

                ${goal.description ? `<p class="goal-description">${this.escapeHtml(goal.description)}</p>` : ''}

                <div class="goal-progress">
                    <div class="goal-progress-bar" style="width: ${goal.progress}%"></div>
                </div>

                <div class="goal-tasks">
                    <div class="goal-task-count">
                        📋 ${tasks.length} 个任务 
                        (✅ ${completedTasks.length} 已完成, 
                        ⏳ ${pendingTasks.length} 进行中)
                    </div>
                    
                    ${tasks.length > 0 ? `
                        <div class="goal-task-list">
                            ${tasks.slice(0, 3).map(task => `
                                <div class="goal-task-item ${task.status}">
                                    <span class="task-status-icon">${this.getTaskStatusIcon(task.status)}</span>
                                    <span class="task-title">${this.escapeHtml(task.title)}</span>
                                </div>
                            `).join('')}
                            ${tasks.length > 3 ? `<div class="goal-task-more">还有 ${tasks.length - 3} 个任务...</div>` : ''}
                        </div>
                    ` : ''}
                </div>

                <div class="goal-meta">
                    <div class="goal-info">
                        ${goal.targetDate ? `<span class="goal-target-date">📅 目标日期: ${this.formatDate(goal.targetDate)}</span>` : ''}
                        <span class="goal-created">创建于: ${this.formatDate(goal.createdAt)}</span>
                    </div>
                    
                    <div class="goal-actions">
                        ${goal.status === this.STATUS.ACTIVE ? `
                            <button class="btn btn-success" onclick="goalManager.completeGoal('${goal.id}')">
                                ✓ 完成
                            </button>
                            <button class="btn btn-secondary" onclick="goalManager.pauseGoal('${goal.id}')">
                                ⏸️ 暂停
                            </button>
                        ` : ''}
                        
                        ${goal.status === this.STATUS.PAUSED ? `
                            <button class="btn btn-primary" onclick="goalManager.resumeGoal('${goal.id}')">
                                ▶️ 恢复
                            </button>
                        ` : ''}
                        
                        ${goal.status === this.STATUS.COMPLETED ? `
                            <button class="btn btn-secondary" onclick="goalManager.archiveGoal('${goal.id}')">
                                📦 归档
                            </button>
                        ` : ''}
                        
                        <button class="btn btn-secondary" onclick="goalManager.editGoal('${goal.id}')">
                            ✏️ 编辑
                        </button>
                        <button class="btn btn-secondary" onclick="goalManager.viewGoalTasks('${goal.id}')">
                            📋 查看任务
                        </button>
                        <button class="btn btn-danger" onclick="goalManager.deleteGoal('${goal.id}')">
                            🗑️ 删除
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * 计算剩余天数
     * @param {string} targetDate 目标日期
     * @returns {string} 剩余天数描述
     */
    calculateDaysLeft(targetDate) {
        const now = new Date();
        const target = new Date(targetDate);
        const diffTime = target - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
            return `已过期 ${Math.abs(diffDays)} 天`;
        } else if (diffDays === 0) {
            return '今天到期';
        } else if (diffDays === 1) {
            return '明天到期';
        } else {
            return `还有 ${diffDays} 天`;
        }
    }

    /**
     * 获取任务状态图标
     * @param {string} status 任务状态
     * @returns {string} 状态图标
     */
    getTaskStatusIcon(status) {
        const iconMap = {
            'pending': '⏳',
            'completed': '✅',
            'expired': '⏰',
            'failed': '❌'
        };
        return iconMap[status] || '📝';
    }

    /**
     * 完成目标
     * @param {string} goalId 目标ID
     */
    completeGoal(goalId) {
        this.updateGoal(goalId, { 
            status: this.STATUS.COMPLETED,
            progress: 100 
        });
    }

    /**
     * 暂停目标
     * @param {string} goalId 目标ID
     */
    pauseGoal(goalId) {
        this.updateGoal(goalId, { status: this.STATUS.PAUSED });
    }

    /**
     * 恢复目标
     * @param {string} goalId 目标ID
     */
    resumeGoal(goalId) {
        this.updateGoal(goalId, { status: this.STATUS.ACTIVE });
    }

    /**
     * 归档目标
     * @param {string} goalId 目标ID
     */
    archiveGoal(goalId) {
        this.updateGoal(goalId, { status: this.STATUS.ARCHIVED });
    }

    /**
     * 编辑目标
     * @param {string} goalId 目标ID
     */
    editGoal(goalId) {
        const goal = this.getGoal(goalId);
        if (!goal) return;

        this.showEditModal(goal);
    }

    /**
     * 查看目标相关任务
     * @param {string} goalId 目标ID
     */
    viewGoalTasks(goalId) {
        const goal = this.getGoal(goalId);
        if (!goal) return;

        // 切换到任务页面并筛选该目标的任务
        this.switchToTasksTab();
        // 这里可以添加按目标筛选任务的功能
        this.showNotification(`正在查看目标"${goal.title}"的相关任务`, 'info');
    }

    /**
     * 切换到任务标签页
     */
    switchToTasksTab() {
        const tasksTab = document.querySelector('[data-tab="tasks"]');
        const tasksSection = document.getElementById('tasks-section');
        
        if (tasksTab && tasksSection) {
            // 更新导航
            document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(section => section.classList.remove('active'));
            
            tasksTab.classList.add('active');
            tasksSection.classList.add('active');
        }
    }

    /**
     * 显示编辑模态框
     * @param {Object} goal 目标对象
     */
    showEditModal(goal) {
        const modal = document.getElementById('edit-modal');
        const modalTitle = document.getElementById('modal-title');
        const modalBody = document.getElementById('modal-body');

        modalTitle.textContent = '编辑目标';
        modalBody.innerHTML = `
            <form id="edit-goal-form">
                <input type="hidden" id="edit-goal-id" value="${goal.id}">
                
                <div class="form-group">
                    <label for="edit-goal-title">目标标题：</label>
                    <input type="text" id="edit-goal-title" value="${this.escapeHtml(goal.title)}" required>
                </div>
                
                <div class="form-group">
                    <label for="edit-goal-description">目标描述：</label>
                    <textarea id="edit-goal-description" rows="4">${this.escapeHtml(goal.description || '')}</textarea>
                </div>
                
                <div class="form-group">
                    <label for="edit-goal-target-date">目标完成日期：</label>
                    <input type="date" id="edit-goal-target-date" 
                           value="${goal.targetDate ? goal.targetDate.split('T')[0] : ''}">
                </div>
                
                <div class="form-group">
                    <label for="edit-goal-status">状态：</label>
                    <select id="edit-goal-status">
                        <option value="active" ${goal.status === 'active' ? 'selected' : ''}>活跃</option>
                        <option value="paused" ${goal.status === 'paused' ? 'selected' : ''}>暂停</option>
                        <option value="completed" ${goal.status === 'completed' ? 'selected' : ''}>已完成</option>
                        <option value="archived" ${goal.status === 'archived' ? 'selected' : ''}>已归档</option>
                    </select>
                </div>
                
                <div class="form-actions">
                    <button type="submit" class="btn btn-primary">保存更改</button>
                    <button type="button" class="btn btn-secondary" onclick="goalManager.closeModal()">取消</button>
                </div>
            </form>
        `;

        modal.style.display = 'block';
        document.getElementById('edit-goal-form').addEventListener('submit', this.handleEditSubmit.bind(this));
    }

    /**
     * 处理编辑表单提交
     * @param {Event} event 提交事件
     */
    handleEditSubmit(event) {
        event.preventDefault();
        
        const goalId = document.getElementById('edit-goal-id').value;
        const title = document.getElementById('edit-goal-title').value.trim();
        const description = document.getElementById('edit-goal-description').value.trim();
        const targetDate = document.getElementById('edit-goal-target-date').value || null;
        const status = document.getElementById('edit-goal-status').value;

        if (!title) {
            this.showNotification('请输入目标标题', 'error');
            return;
        }

        const updates = {
            title,
            description,
            targetDate,
            status
        };

        if (this.updateGoal(goalId, updates)) {
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
     * 更新任务表单中的目标选择器
     */
    updateGoalSelect() {
        const goalSelect = document.getElementById('task-goal');
        if (!goalSelect) return;

        const currentValue = goalSelect.value;
        const activeGoals = this.goals.filter(goal => goal.status === this.STATUS.ACTIVE);

        goalSelect.innerHTML = '<option value="">无关联目标</option>' +
            activeGoals.map(goal => 
                `<option value="${goal.id}" ${goal.id === currentValue ? 'selected' : ''}>
                    ${this.escapeHtml(goal.title)}
                </option>`
            ).join('');
    }

    /**
     * 获取状态文本
     * @param {string} status 状态
     * @returns {string} 状态文本
     */
    getStatusText(status) {
        const statusMap = {
            [this.STATUS.ACTIVE]: '活跃',
            [this.STATUS.COMPLETED]: '已完成',
            [this.STATUS.PAUSED]: '暂停',
            [this.STATUS.ARCHIVED]: '已归档'
        };
        return statusMap[status] || status;
    }

    /**
     * 格式化日期
     * @param {string} dateString 日期字符串
     * @returns {string} 格式化的日期
     */
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('zh-CN');
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
     * 验证目标数据
     * @param {Object} goal 目标对象
     * @returns {boolean} 是否有效
     */
    validateGoalData(goal) {
        return goal.title && goal.title.trim().length > 0;
    }

    /**
     * 更新目标统计
     */
    updateGoalCount() {
        const goalCount = document.getElementById('goal-count');
        if (goalCount) {
            goalCount.textContent = `${this.goals.length} 个目标`;
        }
    }

    /**
     * 更新统计信息
     */
    updateStatistics() {
        // 更新目标进度统计
        const activeGoals = this.goals.filter(goal => goal.status === this.STATUS.ACTIVE);
        const avgProgress = activeGoals.length > 0 ? 
            Math.round(activeGoals.reduce((sum, goal) => sum + goal.progress, 0) / activeGoals.length) : 0;

        const progressElement = document.getElementById('goals-progress');
        if (progressElement) {
            progressElement.textContent = `${avgProgress}%`;
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
        // 目标表单提交
        const goalForm = document.getElementById('goal-form');
        if (goalForm) {
            goalForm.addEventListener('submit', this.handleGoalSubmit.bind(this));
        }
    }

    /**
     * 处理目标表单提交
     * @param {Event} event 提交事件
     */
    handleGoalSubmit(event) {
        event.preventDefault();
        
        const title = document.getElementById('goal-title').value.trim();
        const description = document.getElementById('goal-description').value.trim();
        const targetDate = document.getElementById('goal-target-date').value || null;

        if (!title) {
            this.showNotification('请输入目标标题', 'error');
            return;
        }

        try {
            this.createGoal({
                title,
                description,
                targetDate
            });

            // 重置表单
            event.target.reset();
        } catch (error) {
            this.showNotification(error.message, 'error');
        }
    }
}

// 创建全局目标管理实例
const goalManager = new GoalManager();

// 暴露到全局作用域
window.goalManager = goalManager;