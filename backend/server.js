const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

// 中间件配置
app.use(helmet());
app.use(compression());
app.use(cors({
    origin: [
        'http://localhost:3000', 
        'file://', 
        'null',
        'https://cyforkk163.github.io/', // 👈 替换为你的GitHub Pages地址
        'https://0981688c9428.ngrok-free.app'   // 👈 你的ngrok地址
    ],
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 数据库连接池
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '123456',
    database: process.env.DB_NAME || 'enhanced_todo_app',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    acquireTimeout: 60000,
    timeout: 60000
});

// 数据库连接测试
async function testDatabaseConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('✅ 数据库连接成功');
        connection.release();
    } catch (error) {
        console.error('❌ 数据库连接失败:', error.message);
        process.exit(1);
    }
}

// ================== 认证中间件 ==================

// JWT认证中间件
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ success: false, error: '需要认证令牌' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ success: false, error: '无效的认证令牌' });
        }
        req.user = user;
        next();
    });
};

// 可选认证中间件（用于兼容老版本）
const optionalAuth = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
        jwt.verify(token, JWT_SECRET, (err, user) => {
            if (!err) {
                req.user = user;
            }
        });
    }
    
    // 如果没有用户信息，使用默认用户ID 1
    if (!req.user) {
        req.user = { id: 1 };
    }
    
    next();
};

// ================== 认证相关 API ==================

// 用户注册
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // 验证输入
        if (!username || !email || !password) {
            return res.status(400).json({ 
                success: false, 
                error: '用户名、邮箱和密码都是必需的' 
            });
        }

        if (password.length < 6) {
            return res.status(400).json({ 
                success: false, 
                error: '密码至少需要6个字符' 
            });
        }

        // 检查用户是否已存在
        const [existingUsers] = await pool.execute(
            'SELECT id FROM users WHERE email = ? OR username = ?',
            [email, username]
        );

        if (existingUsers.length > 0) {
            return res.status(400).json({ 
                success: false, 
                error: '用户名或邮箱已被注册' 
            });
        }

        // 加密密码
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // 创建用户
        const [result] = await pool.execute(
            'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
            [username, email, hashedPassword]
        );

        // 创建用户的默认统计记录
        await pool.execute(
            'INSERT INTO user_statistics (user_id) VALUES (?)',
            [result.insertId]
        );

        res.status(201).json({ 
            success: true, 
            message: '注册成功' 
        });

    } catch (error) {
        console.error('注册失败:', error);
        res.status(500).json({ 
            success: false, 
            error: '注册失败，请稍后重试' 
        });
    }
});

// 用户登录
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // 验证输入
        if (!email || !password) {
            return res.status(400).json({ 
                success: false, 
                error: '邮箱和密码都是必需的' 
            });
        }

        // 查找用户
        const [users] = await pool.execute(
            'SELECT id, username, email, password_hash FROM users WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            return res.status(401).json({ 
                success: false, 
                error: '邮箱或密码错误' 
            });
        }

        const user = users[0];

        // 验证密码
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({ 
                success: false, 
                error: '邮箱或密码错误' 
            });
        }

        // 生成JWT令牌
        const token = jwt.sign(
            { 
                id: user.id, 
                username: user.username, 
                email: user.email 
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email
            }
        });

    } catch (error) {
        console.error('登录失败:', error);
        res.status(500).json({ 
            success: false, 
            error: '登录失败，请稍后重试' 
        });
    }
});

// 验证令牌
app.get('/api/auth/verify', authenticateToken, (req, res) => {
    res.json({
        success: true,
        user: {
            id: req.user.id,
            username: req.user.username,
            email: req.user.email
        }
    });
});

// 用户注销（客户端删除令牌即可）
app.post('/api/auth/logout', (req, res) => {
    res.json({ 
        success: true, 
        message: '退出登录成功' 
    });
});

// ================== 任务相关 API ==================

// 获取所有任务
app.get('/api/tasks', optionalAuth, async (req, res) => {
    try {
        const { status, priority, goal_id, is_template } = req.query;
        let sql = 'SELECT * FROM tasks WHERE user_id = ?';
        const params = [req.user.id];

        if (status) {
            sql += ' AND status = ?';
            params.push(status);
        }
        if (priority) {
            sql += ' AND priority = ?';
            params.push(priority);
        }
        if (goal_id) {
            sql += ' AND goal_id = ?';
            params.push(goal_id);
        }
        if (is_template !== undefined) {
            sql += ' AND is_repeat_template = ?';
            params.push(is_template === 'true');
        }

        sql += ' ORDER BY FIELD(priority, "high", "medium", "low"), created_at DESC';

        const [rows] = await pool.execute(sql, params);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('获取任务失败:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 根据ID获取任务
app.get('/api/tasks/:id', optionalAuth, async (req, res) => {
    try {
        const [rows] = await pool.execute(
            'SELECT * FROM tasks WHERE id = ? AND user_id = ?',
            [req.params.id, req.user.id]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({ success: false, error: '任务不存在' });
        }
        
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('获取任务失败:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 创建任务
app.post('/api/tasks', optionalAuth, async (req, res) => {
    try {
        const { 
            id, title, description, deadline, goal_id, priority,
            is_repeat_template, parent_task_id, repeat_type, 
            repeat_interval, repeat_end_date 
        } = req.body;

        if (!id || !title) {
            return res.status(400).json({ success: false, error: '任务ID和标题是必需的' });
        }

        const sql = `
            INSERT INTO tasks (
                id, user_id, goal_id, title, description, deadline, 
                priority, is_repeat_template, parent_task_id, 
                repeat_type, repeat_interval, repeat_end_date
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        await pool.execute(sql, [
            id, req.user.id, goal_id || null, title, description || '', 
            deadline || null, priority || 'medium',
            is_repeat_template || false, parent_task_id || null,
            repeat_type || 'none', repeat_interval || 1,
            repeat_end_date || null
        ]);

        // 获取创建的任务
        const [rows] = await pool.execute(
            'SELECT * FROM tasks WHERE id = ?', [id]
        );

        res.status(201).json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('创建任务失败:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 更新任务
app.put('/api/tasks/:id', optionalAuth, async (req, res) => {
    try {
        const taskId = req.params.id;
        const updates = req.body;
        
        // 构建动态更新SQL
        const allowedFields = [
            'title', 'description', 'deadline', 'status', 'priority',
            'goal_id', 'is_repeat_template', 'repeat_type', 
            'repeat_interval', 'repeat_end_date', 'completed_at'
        ];
        
        const updateFields = [];
        const values = [];
        
        Object.keys(updates).forEach(key => {
            if (allowedFields.includes(key)) {
                updateFields.push(`${key} = ?`);
                values.push(updates[key]);
            }
        });
        
        if (updateFields.length === 0) {
            return res.status(400).json({ success: false, error: '没有有效的更新字段' });
        }
        
        updateFields.push('updated_at = CURRENT_TIMESTAMP');
        values.push(taskId, req.user.id);
        
        const sql = `UPDATE tasks SET ${updateFields.join(', ')} WHERE id = ? AND user_id = ?`;
        const [result] = await pool.execute(sql, values);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: '任务不存在' });
        }
        
        // 获取更新后的任务
        const [rows] = await pool.execute(
            'SELECT * FROM tasks WHERE id = ?', [taskId]
        );
        
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('更新任务失败:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 删除任务
app.delete('/api/tasks/:id', optionalAuth, async (req, res) => {
    try {
        const [result] = await pool.execute(
            'DELETE FROM tasks WHERE id = ? AND user_id = ?',
            [req.params.id, req.user.id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: '任务不存在' });
        }
        
        res.json({ success: true, message: '任务删除成功' });
    } catch (error) {
        console.error('删除任务失败:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ================== 目标相关 API ==================

// 获取所有目标
app.get('/api/goals', async (req, res) => {
    try {
        const { status } = req.query;
        let sql = 'SELECT * FROM goal_progress WHERE user_id = 1';
        const params = [];

        if (status) {
            sql += ' AND status = ?';
            params.push(status);
        }

        sql += ' ORDER BY created_at DESC';

        const [rows] = await pool.execute(sql, params);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('获取目标失败:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 根据ID获取目标
app.get('/api/goals/:id', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            'SELECT * FROM goal_progress WHERE id = ? AND user_id = 1',
            [req.params.id]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({ success: false, error: '目标不存在' });
        }
        
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('获取目标失败:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 创建目标
app.post('/api/goals', async (req, res) => {
    try {
        const { id, title, description, target_date, category } = req.body;

        if (!id || !title) {
            return res.status(400).json({ success: false, error: '目标ID和标题是必需的' });
        }

        const sql = `
            INSERT INTO goals (id, user_id, title, description, target_date, category)
            VALUES (?, 1, ?, ?, ?, ?)
        `;

        await pool.execute(sql, [
            id, title, description || '', 
            target_date || null, category || 'personal'
        ]);

        // 获取创建的目标
        const [rows] = await pool.execute(
            'SELECT * FROM goal_progress WHERE id = ?', [id]
        );

        res.status(201).json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('创建目标失败:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 更新目标
app.put('/api/goals/:id', async (req, res) => {
    try {
        const goalId = req.params.id;
        const updates = req.body;
        
        const allowedFields = [
            'title', 'description', 'target_date', 'status', 
            'category', 'completed_at'
        ];
        
        const updateFields = [];
        const values = [];
        
        Object.keys(updates).forEach(key => {
            if (allowedFields.includes(key)) {
                updateFields.push(`${key} = ?`);
                values.push(updates[key]);
            }
        });
        
        if (updateFields.length === 0) {
            return res.status(400).json({ success: false, error: '没有有效的更新字段' });
        }
        
        updateFields.push('updated_at = CURRENT_TIMESTAMP');
        values.push(goalId);
        
        const sql = `UPDATE goals SET ${updateFields.join(', ')} WHERE id = ? AND user_id = 1`;
        const [result] = await pool.execute(sql, values);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: '目标不存在' });
        }
        
        // 获取更新后的目标
        const [rows] = await pool.execute(
            'SELECT * FROM goal_progress WHERE id = ?', [goalId]
        );
        
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('更新目标失败:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 删除目标
app.delete('/api/goals/:id', async (req, res) => {
    try {
        const [result] = await pool.execute(
            'DELETE FROM goals WHERE id = ? AND user_id = 1',
            [req.params.id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: '目标不存在' });
        }
        
        res.json({ success: true, message: '目标删除成功' });
    } catch (error) {
        console.error('删除目标失败:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ================== 设置和统计 API ==================

// 获取用户设置
app.get('/api/settings', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            'SELECT setting_key, setting_value FROM user_settings WHERE user_id = 1'
        );
        
        const settings = {};
        rows.forEach(row => {
            settings[row.setting_key] = row.setting_value;
        });
        
        res.json({ success: true, data: settings });
    } catch (error) {
        console.error('获取设置失败:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 更新用户设置
app.put('/api/settings', async (req, res) => {
    try {
        const { setting_key, setting_value } = req.body;
        
        if (!setting_key) {
            return res.status(400).json({ success: false, error: '设置键是必需的' });
        }
        
        const sql = `
            INSERT INTO user_settings (user_id, setting_key, setting_value)
            VALUES (1, ?, ?)
            ON DUPLICATE KEY UPDATE 
            setting_value = VALUES(setting_value),
            updated_at = CURRENT_TIMESTAMP
        `;
        
        await pool.execute(sql, [setting_key, JSON.stringify(setting_value)]);
        
        res.json({ success: true, message: '设置更新成功' });
    } catch (error) {
        console.error('更新设置失败:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 获取统计数据
app.get('/api/statistics', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            'SELECT * FROM user_statistics WHERE user_id = 1'
        );
        
        if (rows.length === 0) {
            return res.json({ 
                success: true, 
                data: {
                    total_tasks_created: 0,
                    total_tasks_completed: 0,
                    total_goals_created: 0,
                    total_goals_completed: 0,
                    streak_days: 0,
                    last_active_date: null
                }
            });
        }
        
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('获取统计失败:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ================== 数据导入导出 API ==================

// 导出所有数据
app.get('/api/export', async (req, res) => {
    try {
        const [tasks] = await pool.execute('SELECT * FROM tasks WHERE user_id = 1');
        const [goals] = await pool.execute('SELECT * FROM goals WHERE user_id = 1');
        const [settings] = await pool.execute('SELECT * FROM user_settings WHERE user_id = 1');
        const [statistics] = await pool.execute('SELECT * FROM user_statistics WHERE user_id = 1');
        
        const exportData = {
            tasks,
            goals,
            settings: settings.reduce((acc, row) => {
                acc[row.setting_key] = row.setting_value;
                return acc;
            }, {}),
            statistics: statistics[0] || {},
            exportDate: new Date().toISOString(),
            version: '1.0.0'
        };
        
        res.json({ success: true, data: exportData });
    } catch (error) {
        console.error('导出数据失败:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 导入数据
app.post('/api/import', async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const { tasks, goals, settings, statistics } = req.body;
        
        // 清空现有数据
        await connection.execute('DELETE FROM tasks WHERE user_id = 1');
        await connection.execute('DELETE FROM goals WHERE user_id = 1');
        await connection.execute('DELETE FROM user_settings WHERE user_id = 1');
        
        // 导入任务
        if (tasks && tasks.length > 0) {
            const taskSql = `
                INSERT INTO tasks (
                    id, user_id, goal_id, title, description, deadline, status, priority,
                    is_repeat_template, parent_task_id, repeat_type, repeat_interval,
                    repeat_end_date, created_at, updated_at, completed_at
                ) VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            
            for (const task of tasks) {
                await connection.execute(taskSql, [
                    task.id, task.goal_id || null, task.title, task.description || '',
                    task.deadline || null, task.status || 'pending', task.priority || 'medium',
                    task.is_repeat_template || false, task.parent_task_id || null,
                    task.repeat_type || 'none', task.repeat_interval || 1,
                    task.repeat_end_date || null, task.created_at || new Date(),
                    task.updated_at || new Date(), task.completed_at || null
                ]);
            }
        }
        
        // 导入目标
        if (goals && goals.length > 0) {
            const goalSql = `
                INSERT INTO goals (
                    id, user_id, title, description, target_date, status, progress,
                    category, created_at, updated_at, completed_at
                ) VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            
            for (const goal of goals) {
                await connection.execute(goalSql, [
                    goal.id, goal.title, goal.description || '', goal.target_date || null,
                    goal.status || 'active', goal.progress || 0, goal.category || 'personal',
                    goal.created_at || new Date(), goal.updated_at || new Date(),
                    goal.completed_at || null
                ]);
            }
        }
        
        // 导入设置
        if (settings) {
            const settingSql = `
                INSERT INTO user_settings (user_id, setting_key, setting_value)
                VALUES (1, ?, ?)
            `;
            
            for (const [key, value] of Object.entries(settings)) {
                await connection.execute(settingSql, [key, JSON.stringify(value)]);
            }
        }
        
        // 更新统计数据
        if (statistics) {
            const statsSql = `
                INSERT INTO user_statistics (
                    user_id, total_tasks_created, total_tasks_completed,
                    total_goals_created, total_goals_completed, streak_days, last_active_date
                ) VALUES (1, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                total_tasks_created = VALUES(total_tasks_created),
                total_tasks_completed = VALUES(total_tasks_completed),
                total_goals_created = VALUES(total_goals_created),
                total_goals_completed = VALUES(total_goals_completed),
                streak_days = VALUES(streak_days),
                last_active_date = VALUES(last_active_date)
            `;
            
            await connection.execute(statsSql, [
                statistics.total_tasks_created || 0,
                statistics.total_tasks_completed || 0,
                statistics.total_goals_created || 0,
                statistics.total_goals_completed || 0,
                statistics.streak_days || 0,
                statistics.last_active_date || null
            ]);
        }
        
        await connection.commit();
        res.json({ success: true, message: '数据导入成功' });
    } catch (error) {
        await connection.rollback();
        console.error('导入数据失败:', error);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        connection.release();
    }
});

// 错误处理中间件
app.use((err, req, res, next) => {
    console.error('服务器错误:', err);
    res.status(500).json({ success: false, error: '服务器内部错误' });
});

// 404处理
app.use((req, res) => {
    res.status(404).json({ success: false, error: '接口不存在' });
});

// 启动服务器
async function startServer() {
    await testDatabaseConnection();
    
    app.listen(PORT, () => {
        console.log(`🚀 服务器运行在 http://localhost:${PORT}`);
        console.log(`📊 API文档: http://localhost:${PORT}/api`);
    });
}

startServer().catch(console.error);