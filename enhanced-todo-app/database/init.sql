-- Enhanced Todo App MySQL Database Schema
-- 创建数据库
CREATE DATABASE IF NOT EXISTS enhanced_todo_app 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE enhanced_todo_app;

-- 用户表（为未来扩展预留）
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 目标表
CREATE TABLE goals (
    id VARCHAR(50) PRIMARY KEY,
    user_id INT NOT NULL DEFAULT 1,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    target_date DATE,
    status ENUM('active', 'completed', 'paused', 'archived') DEFAULT 'active',
    progress INT DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    category VARCHAR(100) DEFAULT 'personal',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    INDEX idx_user_status (user_id, status),
    INDEX idx_target_date (target_date),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 任务表
CREATE TABLE tasks (
    id VARCHAR(50) PRIMARY KEY,
    user_id INT NOT NULL DEFAULT 1,
    goal_id VARCHAR(50) NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    deadline TIMESTAMP NULL,
    status ENUM('pending', 'completed', 'expired', 'failed') DEFAULT 'pending',
    priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
    
    -- 重复任务相关字段
    is_repeat_template BOOLEAN DEFAULT FALSE,
    parent_task_id VARCHAR(50) NULL, -- 引用重复任务模板
    repeat_type ENUM('none', 'daily', 'weekly', 'monthly', 'custom') DEFAULT 'none',
    repeat_interval INT DEFAULT 1,
    repeat_end_date DATE NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    
    INDEX idx_user_status (user_id, status),
    INDEX idx_goal_id (goal_id),
    INDEX idx_deadline (deadline),
    INDEX idx_priority (priority),
    INDEX idx_repeat_template (is_repeat_template),
    INDEX idx_parent_task (parent_task_id),
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE SET NULL,
    FOREIGN KEY (parent_task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

-- 用户设置表
CREATE TABLE user_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    setting_key VARCHAR(100) NOT NULL,
    setting_value JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_user_setting (user_id, setting_key),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 用户统计表
CREATE TABLE user_statistics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    total_tasks_created INT DEFAULT 0,
    total_tasks_completed INT DEFAULT 0,
    total_goals_created INT DEFAULT 0,
    total_goals_completed INT DEFAULT 0,
    streak_days INT DEFAULT 0,
    last_active_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_user_stats (user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 插入默认用户（单用户模式）
INSERT INTO users (id, username, email, password_hash) 
VALUES (1, 'default_user', 'user@example.com', 'placeholder_hash')
ON DUPLICATE KEY UPDATE username = username;

-- 插入默认设置
INSERT INTO user_settings (user_id, setting_key, setting_value) VALUES
(1, 'app_settings', JSON_OBJECT(
    'theme', 'light',
    'notifications', true,
    'autoCleanup', true,
    'defaultDeadlineHours', 24
))
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value);

-- 插入默认统计数据
INSERT INTO user_statistics (user_id) VALUES (1)
ON DUPLICATE KEY UPDATE user_id = user_id;

-- 创建视图：任务详情视图（包含目标信息）
CREATE OR REPLACE VIEW task_details AS
SELECT 
    t.*,
    g.title as goal_title,
    g.category as goal_category
FROM tasks t
LEFT JOIN goals g ON t.goal_id = g.id;

-- 创建视图：目标进度视图
CREATE OR REPLACE VIEW goal_progress AS
SELECT 
    g.*,
    COUNT(t.id) as total_tasks,
    COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completed_tasks,
    CASE 
        WHEN COUNT(t.id) = 0 THEN 0
        ELSE ROUND((COUNT(CASE WHEN t.status = 'completed' THEN 1 END) * 100.0) / COUNT(t.id), 2)
    END as calculated_progress
FROM goals g
LEFT JOIN tasks t ON g.id = t.goal_id AND t.is_repeat_template = FALSE
GROUP BY g.id;

-- 创建触发器：更新目标进度
DELIMITER //

CREATE TRIGGER update_goal_progress_after_task_update
AFTER UPDATE ON tasks
FOR EACH ROW
BEGIN
    IF NEW.goal_id IS NOT NULL AND (OLD.status != NEW.status) THEN
        UPDATE goals 
        SET progress = (
            SELECT CASE 
                WHEN COUNT(*) = 0 THEN 0
                ELSE ROUND((COUNT(CASE WHEN status = 'completed' THEN 1 END) * 100.0) / COUNT(*), 0)
            END
            FROM tasks 
            WHERE goal_id = NEW.goal_id AND is_repeat_template = FALSE
        ),
        updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.goal_id;
    END IF;
END//

CREATE TRIGGER update_goal_progress_after_task_insert
AFTER INSERT ON tasks
FOR EACH ROW
BEGIN
    IF NEW.goal_id IS NOT NULL THEN
        UPDATE goals 
        SET progress = (
            SELECT CASE 
                WHEN COUNT(*) = 0 THEN 0
                ELSE ROUND((COUNT(CASE WHEN status = 'completed' THEN 1 END) * 100.0) / COUNT(*), 0)
            END
            FROM tasks 
            WHERE goal_id = NEW.goal_id AND is_repeat_template = FALSE
        ),
        updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.goal_id;
    END IF;
END//

CREATE TRIGGER update_goal_progress_after_task_delete
AFTER DELETE ON tasks
FOR EACH ROW
BEGIN
    IF OLD.goal_id IS NOT NULL THEN
        UPDATE goals 
        SET progress = (
            SELECT CASE 
                WHEN COUNT(*) = 0 THEN 0
                ELSE ROUND((COUNT(CASE WHEN status = 'completed' THEN 1 END) * 100.0) / COUNT(*), 0)
            END
            FROM tasks 
            WHERE goal_id = OLD.goal_id AND is_repeat_template = FALSE
        ),
        updated_at = CURRENT_TIMESTAMP
        WHERE id = OLD.goal_id;
    END IF;
END//

-- 更新统计数据的触发器
CREATE TRIGGER update_statistics_after_task_insert
AFTER INSERT ON tasks
FOR EACH ROW
BEGIN
    UPDATE user_statistics 
    SET total_tasks_created = total_tasks_created + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE user_id = NEW.user_id;
END//

CREATE TRIGGER update_statistics_after_task_complete
AFTER UPDATE ON tasks
FOR EACH ROW
BEGIN
    IF OLD.status != 'completed' AND NEW.status = 'completed' THEN
        UPDATE user_statistics 
        SET total_tasks_completed = total_tasks_completed + 1,
            last_active_date = CURRENT_DATE,
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = NEW.user_id;
    ELSEIF OLD.status = 'completed' AND NEW.status != 'completed' THEN
        UPDATE user_statistics 
        SET total_tasks_completed = total_tasks_completed - 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = NEW.user_id;
    END IF;
END//

CREATE TRIGGER update_statistics_after_goal_insert
AFTER INSERT ON goals
FOR EACH ROW
BEGIN
    UPDATE user_statistics 
    SET total_goals_created = total_goals_created + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE user_id = NEW.user_id;
END//

CREATE TRIGGER update_statistics_after_goal_complete
AFTER UPDATE ON goals
FOR EACH ROW
BEGIN
    IF OLD.status != 'completed' AND NEW.status = 'completed' THEN
        UPDATE user_statistics 
        SET total_goals_completed = total_goals_completed + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = NEW.user_id;
    ELSEIF OLD.status = 'completed' AND NEW.status != 'completed' THEN
        UPDATE user_statistics 
        SET total_goals_completed = total_goals_completed - 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = NEW.user_id;
    END IF;
END//

DELIMITER ;