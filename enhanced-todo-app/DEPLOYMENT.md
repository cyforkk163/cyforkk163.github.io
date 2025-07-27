# 智能待办事项应用部署文档

## 📋 目录
- [部署架构](#部署架构)
- [前置要求](#前置要求)
- [本地开发环境搭建](#本地开发环境搭建)
- [生产环境部署](#生产环境部署)
- [内网穿透配置](#内网穿透配置)
- [GitHub Pages 部署](#github-pages-部署)
- [域名配置](#域名配置)
- [安全配置](#安全配置)
- [故障排除](#故障排除)
- [维护指南](#维护指南)

## 🏗️ 部署架构

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   GitHub Pages  │    │   内网穿透服务   │    │   你的电脑       │
│   (前端静态页面) │────│   (frp/ngrok)   │────│   (后端+数据库)  │
│   HTTPS访问     │    │   公网域名       │    │   MySQL + Node  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 架构说明
- **前端**：部署在GitHub Pages，全球CDN加速
- **后端**：运行在你的个人电脑上
- **数据库**：MySQL运行在你的电脑上
- **网络**：通过内网穿透服务连接前后端

## 📋 前置要求

### 硬件要求
- **个人电脑**：Windows/macOS/Linux
- **内存**：至少4GB RAM
- **存储**：至少1GB可用空间
- **网络**：稳定的宽带连接

### 软件要求
- **Node.js**：版本 ≥ 16.0
- **MySQL**：版本 ≥ 8.0
- **Git**：用于代码管理
- **现代浏览器**：Chrome/Firefox/Safari/Edge

### 服务要求
- **GitHub账户**：用于代码托管和Pages服务
- **内网穿透服务**：frp或ngrok（可选择免费版）

## 🛠️ 本地开发环境搭建

### 1. 安装依赖

#### 安装Node.js
```bash
# 下载并安装Node.js
# 访问 https://nodejs.org 下载LTS版本
node --version  # 验证安装
npm --version   # 验证npm
```

#### 安装MySQL
```bash
# Windows: 下载MySQL Installer
# 访问 https://dev.mysql.com/downloads/installer/

# 配置信息
用户名: root
密码: 123456 (或自定义)
端口: 3306
```

### 2. 克隆项目
```bash
git clone https://github.com/your-username/enhanced-todo-app.git
cd enhanced-todo-app
```

### 3. 初始化数据库
```bash
# Windows
scripts\init-database.bat

# Linux/macOS
chmod +x scripts/init-database.sh
./scripts/init-database.sh
```

### 4. 安装后端依赖
```bash
cd backend
npm install
```

### 5. 启动本地服务
```bash
# 启动后端
cd backend
npm start

# 前端直接用浏览器打开
# file:///path/to/enhanced-todo-app/index.html
```

## 🚀 生产环境部署

### 阶段一：准备代码

#### 1. 修改前端配置
编辑 `js/api-client.js`：
```javascript
class ApiClient {
    constructor() {
        // 生产环境使用内网穿透地址
        this.baseURL = this.getBackendUrl();
        this.isOnline = true;
    }
    
    getBackendUrl() {
        // 检测环境
        if (location.protocol === 'file:') {
            // 本地开发
            return 'http://localhost:3001/api';
        } else {
            // 生产环境
            return 'https://your-tunnel-domain.com/api';
        }
    }
}
```

#### 2. 修改后端配置
编辑 `backend/server.js`：
```javascript
// CORS配置
app.use(cors({
    origin: [
        'http://localhost:3000',
        'file://',
        'null',
        'https://your-username.github.io'  // 你的GitHub Pages域名
    ],
    credentials: true
}));
```

#### 3. 环境变量配置
创建 `backend/.env`：
```env
NODE_ENV=production
PORT=3001
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=123456
DB_NAME=enhanced_todo_app
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

### 阶段二：设置内网穿透

#### 选项1：使用 frp（推荐）

1. **下载frp**
```bash
# 访问 https://github.com/fatedier/frp/releases
# 下载适合你系统的版本
```

2. **配置客户端** (`frpc.ini`)
```ini
[common]
server_addr = frp服务器地址
server_port = 7000
token = 你的认证token

[web]
type = http
local_ip = 127.0.0.1
local_port = 3001
custom_domains = your-domain.frp.server.com
```

3. **启动frp客户端**
```bash
./frpc -c frpc.ini
```

#### 选项2：使用 ngrok

1. **安装ngrok**
```bash
# 访问 https://ngrok.com 注册并下载
npm install -g ngrok
```

2. **启动隧道**
```bash
ngrok http 3001
```

3. **获取公网地址**
```
Session Status: online
Forwarding: https://abc123.ngrok.io -> http://localhost:3001
```

### 阶段三：GitHub Pages 部署

#### 1. 创建GitHub仓库
```bash
# 在GitHub上创建新仓库 enhanced-todo-app
git remote add origin https://github.com/your-username/enhanced-todo-app.git
```

#### 2. 准备部署文件
```bash
# 复制前端文件到根目录（如果不在的话）
cp index.html ./
cp -r css js ./
```

#### 3. 推送代码
```bash
git add .
git commit -m "feat: 部署智能待办事项应用"
git push -u origin main
```

#### 4. 启用GitHub Pages
1. 进入仓库设置 → Pages
2. Source: Deploy from a branch
3. Branch: main / (root)
4. 点击Save

#### 5. 获取访问地址
```
https://your-username.github.io/enhanced-todo-app
```

## 🌐 域名配置

### 配置自定义域名（可选）

#### 1. 添加CNAME文件
```bash
echo "your-domain.com" > CNAME
git add CNAME
git commit -m "add custom domain"
git push
```

#### 2. 配置DNS解析
在你的域名提供商处添加CNAME记录：
```
类型: CNAME
名称: @
值: your-username.github.io
```

#### 3. 启用HTTPS
GitHub Pages会自动为自定义域名提供SSL证书。

## 🔒 安全配置

### 1. 数据库安全
```sql
-- 创建专用数据库用户
CREATE USER 'todoapp'@'localhost' IDENTIFIED BY 'strong_password_here';
GRANT SELECT, INSERT, UPDATE, DELETE ON enhanced_todo_app.* TO 'todoapp'@'localhost';
FLUSH PRIVILEGES;
```

### 2. 服务器安全
```javascript
// JWT密钥
JWT_SECRET=生成一个强密码，至少32位随机字符

// 限制请求频率
const rateLimit = require('express-rate-limit');
app.use(rateLimit({
    windowMs: 15 * 60 * 1000, // 15分钟
    max: 100 // 最多100个请求
}));
```

### 3. 防火墙配置
```bash
# Windows防火墙
# 只允许本地和内网穿透访问MySQL和Node.js端口

# 不要直接暴露3306端口到公网
```

## 🔧 故障排除

### 常见问题

#### 1. 前端无法连接后端
**症状**：登录注册失败，网络错误
**解决**：
- 检查后端是否运行：`curl http://localhost:3001/api/statistics`
- 检查内网穿透是否正常
- 检查CORS配置
- 检查前端API地址配置

#### 2. 数据库连接失败
**症状**：后端启动报错，数据库连接超时
**解决**：
```bash
# 检查MySQL服务状态
mysql -u root -p -e "SHOW DATABASES;"

# 检查数据库配置
cat backend/.env

# 重新初始化数据库
scripts\init-database.bat
```

#### 3. GitHub Pages部署失败
**症状**：页面404，构建失败
**解决**：
- 检查仓库设置中的Pages配置
- 确保index.html在根目录
- 检查GitHub Actions构建日志
- 等待最多10分钟生效

#### 4. 内网穿透连接不稳定
**症状**：间歇性连接失败
**解决**：
- 使用付费内网穿透服务
- 配置自动重连脚本
- 考虑使用云服务器

### 日志查看

#### 前端日志
```javascript
// 在浏览器控制台查看
F12 → Console
```

#### 后端日志
```bash
cd backend
npm start 2>&1 | tee server.log
```

#### 数据库日志
```sql
-- 查看MySQL错误日志
SHOW VARIABLES LIKE 'log_error';
```

## 🔄 维护指南

### 日常维护

#### 1. 定期备份数据库
```bash
# 每周备份
mysqldump -u root -p enhanced_todo_app > backup_$(date +%Y%m%d).sql

# 恢复备份
mysql -u root -p enhanced_todo_app < backup_20240101.sql
```

#### 2. 监控服务状态
```bash
# 检查服务运行状态
ps aux | grep node
systemctl status mysql

# 检查磁盘空间
df -h

# 检查内存使用
free -h
```

#### 3. 更新代码
```bash
# 拉取最新代码
git pull origin main

# 安装新依赖
cd backend && npm install

# 重启服务
npm restart
```

### 性能优化

#### 1. 数据库优化
```sql
-- 添加索引
CREATE INDEX idx_user_tasks ON tasks(user_id, status);
CREATE INDEX idx_created_at ON tasks(created_at);

-- 清理过期数据
DELETE FROM tasks WHERE status = 'expired' AND updated_at < DATE_SUB(NOW(), INTERVAL 90 DAY);
```

#### 2. 应用优化
```javascript
// 启用gzip压缩
app.use(compression());

// 设置缓存头
app.use(express.static('public', {
    maxAge: '1d'
}));
```

### 扩展功能

#### 1. 添加HTTPS
```bash
# 使用Let's Encrypt免费证书
# 如果有公网IP和域名
```

#### 2. 添加监控
```javascript
// 简单健康检查接口
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});
```

## 📞 技术支持

### 获取帮助
- **GitHub Issues**：在仓库中创建issue
- **文档更新**：欢迎提交PR改进文档
- **社区讨论**：在Discussions中交流经验

### 更新日志
- **v1.0.0**：基础功能实现
- **v1.1.0**：添加用户认证
- **v1.2.0**：部署配置优化

---

## 🎉 部署完成检查清单

- [ ] 本地开发环境正常运行
- [ ] 数据库初始化完成
- [ ] 后端服务启动成功
- [ ] 内网穿透配置完成
- [ ] GitHub仓库创建并推送
- [ ] GitHub Pages启用并访问正常
- [ ] 前后端连接测试通过
- [ ] 用户注册登录功能正常
- [ ] 任务增删改查功能正常
- [ ] 数据持久化验证通过
- [ ] 安全配置检查完成
- [ ] 备份策略制定完成

恭喜！你的智能待办事项应用已经成功部署！🚀