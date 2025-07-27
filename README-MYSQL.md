# Enhanced Todo App - MySQL版本使用指南

## 📋 项目结构
```
enhanced-todo-app/
├── 📁 backend/              # Node.js后端API服务
│   ├── package.json
│   ├── server.js
│   ├── .env
│   └── .env.example
├── 📁 database/             # MySQL数据库
│   └── init.sql            # 数据库初始化脚本
├── 📁 scripts/              # 部署脚本
│   ├── init-database.sh    # Linux/Mac数据库初始化
│   └── init-database.bat   # Windows数据库初始化
├── 📁 js/                   # 前端JavaScript
│   ├── api-client.js       # API客户端（新增）
│   ├── storage.js          # 存储管理（支持MySQL）
│   ├── task.js
│   ├── goal.js
│   └── app.js
├── 📁 css/
├── index.html              # 前端页面（已更新）
└── README-MYSQL.md         # 本文档
```

## 🚀 快速开始

### 1. 数据库准备
确保你的MySQL服务器正在运行，用户名为`root`，密码为`123456`。

#### Windows用户：
```cmd
# 进入项目目录
cd enhanced-todo-app

# 运行数据库初始化脚本
scripts\init-database.bat
```

#### Linux/Mac用户：
```bash
# 进入项目目录
cd enhanced-todo-app

# 给脚本执行权限
chmod +x scripts/init-database.sh

# 运行数据库初始化脚本
./scripts/init-database.sh
```

#### 手动初始化（如果脚本不可用）：
```bash
mysql -u root -p123456 < database/init.sql
```

### 2. 启动后端服务
```bash
# 进入后端目录
cd backend

# 安装依赖
npm install

# 启动开发服务器
npm start
```

后端将在 `http://localhost:3001` 运行。

### 3. 启动前端
```bash
# 回到项目根目录
cd ..

# 启动前端（使用原有方式）
npm start
```

前端将在 `http://localhost:3000` 运行。

## 🔧 配置说明

### 数据库配置
数据库连接配置在 `backend/.env` 文件中：
```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=enhanced_todo_app
DB_USER=root
DB_PASSWORD=123456
```

### API端点
后端提供以下API端点：

#### 任务相关
- `GET /api/tasks` - 获取所有任务
- `GET /api/tasks/:id` - 获取单个任务
- `POST /api/tasks` - 创建任务
- `PUT /api/tasks/:id` - 更新任务
- `DELETE /api/tasks/:id` - 删除任务

#### 目标相关
- `GET /api/goals` - 获取所有目标
- `GET /api/goals/:id` - 获取单个目标
- `POST /api/goals` - 创建目标
- `PUT /api/goals/:id` - 更新目标
- `DELETE /api/goals/:id` - 删除目标

#### 其他
- `GET /api/settings` - 获取设置
- `PUT /api/settings` - 更新设置
- `GET /api/statistics` - 获取统计数据
- `GET /api/export` - 导出数据
- `POST /api/import` - 导入数据

## 🔄 数据迁移

### 从localStorage迁移到MySQL
1. 启动MySQL后端服务
2. 打开前端页面
3. 如果检测到localStorage中有数据，系统会自动询问是否迁移到数据库
4. 确认迁移后，数据将自动转移到MySQL

### 导出/导入数据
- **导出**: 访问 `http://localhost:3001/api/export` 或使用前端导出功能
- **导入**: 使用前端导入功能或POST到 `http://localhost:3001/api/import`

## 📊 数据库表结构

### 主要表
- `users` - 用户表（预留多用户扩展）
- `tasks` - 任务表
- `goals` - 目标表
- `user_settings` - 用户设置
- `user_statistics` - 用户统计

### 视图
- `task_details` - 任务详情视图（包含目标信息）
- `goal_progress` - 目标进度视图（自动计算完成度）

### 触发器
- 自动更新目标进度
- 自动更新统计数据

## 🛠️ 开发说明

### 双重存储模式
前端代码支持localStorage和MySQL双重存储：
- 当后端可用时，优先使用MySQL
- 当后端不可用时，自动回退到localStorage
- 提供无缝的离线/在线切换体验

### API客户端
新增的 `api-client.js` 提供了与后端API通信的封装：
- 自动错误处理
- 连接状态检测
- 统一的请求格式

### 字段映射
前端和后端使用不同的字段命名约定：
- 前端: camelCase（如 `goalId`）
- 后端: snake_case（如 `goal_id`）
- 自动进行格式转换

## 🐛 故障排除

### 常见问题

#### 1. 数据库连接失败
```
❌ 数据库连接失败: Access denied for user 'root'@'localhost'
```
**解决方案**: 检查MySQL服务是否运行，用户名密码是否正确。

#### 2. 端口被占用
```
Error: listen EADDRINUSE: address already in use :::3001
```
**解决方案**: 
- 更改 `backend/.env` 中的 `PORT` 配置
- 或停止占用端口的进程

#### 3. 前端无法连接后端
**解决方案**: 
- 确认后端服务正在运行
- 检查CORS配置
- 验证API端点URL

#### 4. 数据没有显示
**解决方案**: 
- 打开浏览器开发者工具查看控制台错误
- 检查网络请求是否成功
- 验证数据库中是否有数据

### 日志查看
- **后端日志**: 查看终端输出
- **前端日志**: 打开浏览器开发者工具 Console 面板

## 🔒 安全注意事项

- 生产环境请更改默认数据库密码
- 配置适当的CORS策略
- 考虑添加身份验证和授权
- 定期备份数据库

## 📈 性能优化

- 使用数据库索引提升查询性能
- 实现数据分页（大量数据时）
- 考虑添加缓存层
- 监控数据库查询性能

## 🚀 部署到生产环境

1. **数据库配置**
   - 创建生产数据库
   - 配置环境变量
   - 设置适当的用户权限

2. **后端部署**
   - 安装依赖: `npm install --production`
   - 设置环境变量
   - 使用进程管理器（如PM2）

3. **前端部署**
   - 更新API基础URL
   - 构建生产版本
   - 部署到Web服务器

---

如有问题，请查看项目的GitHub Issues或联系开发团队。