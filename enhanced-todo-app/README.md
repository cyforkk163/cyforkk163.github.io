# 增强版待办事项应用

一个功能强大的待办事项管理应用，支持时间限制、长期目标追踪等高级功能。

## 🚀 主要功能

### ✅ 任务管理
- 创建、编辑、删除任务
- 设置截止时间和倒计时
- 任务状态管理（待完成、已完成、已过期、已失败）
- 任务筛选和分类

### 🎯 目标管理
- 创建长期目标
- 目标进度自动计算
- 任务与目标关联
- 目标状态管理

### ⏰ 时间管理
- 实时倒计时显示
- 过期任务自动标记
- 紧急任务高亮提醒

### 📊 统计报告
- 每日完成统计
- 每周进度追踪
- 目标达成率

## 🛠️ 技术栈

- **前端**: 原生 HTML5 + CSS3 + JavaScript (ES6+)
- **存储**: localStorage（支持数据导出/导入）
- **架构**: 模块化设计，易于扩展

## 📱 界面特性

- 响应式设计，支持桌面和移动设备
- 现代化 UI 设计
- 流畅的动画效果
- 键盘快捷键支持

## 🎮 快捷键

- `Ctrl/Cmd + 1`: 切换到任务页面
- `Ctrl/Cmd + 2`: 切换到目标页面  
- `Ctrl/Cmd + 3`: 切换到统计页面
- `Ctrl/Cmd + N`: 创建新任务
- `Ctrl/Cmd + Shift + N`: 创建新目标
- `ESC`: 关闭模态框

## 🚀 快速开始

1. **启动开发服务器**
   ```bash
   npm start
   ```

2. **或者直接打开 index.html**
   ```bash
   # 在浏览器中打开
   open index.html
   ```

## 📁 项目结构

```
enhanced-todo-app/
├── index.html              # 主页面
├── css/
│   ├── style.css          # 主要样式
│   └── animations.css     # 动画效果
├── js/
│   ├── storage.js         # 数据存储管理
│   ├── task.js           # 任务管理系统
│   ├── goal.js           # 目标管理系统
│   └── app.js            # 主应用控制器
└── package.json          # 项目配置
```

## 💾 数据管理

### 本地存储
- 所有数据保存在浏览器的 localStorage 中
- 支持数据导出为 JSON 文件
- 支持从 JSON 文件导入数据

### 数据结构
```javascript
// 任务结构
{
  id: string,
  title: string,
  description: string,
  deadline: string | null,
  goalId: string | null,
  status: 'pending' | 'completed' | 'expired' | 'failed',
  createdAt: string,
  updatedAt: string,
  completedAt: string | null
}

// 目标结构
{
  id: string,
  title: string,
  description: string,
  targetDate: string | null,
  status: 'active' | 'completed' | 'paused' | 'archived',
  progress: number, // 0-100
  tasks: string[], // 关联任务ID数组
  createdAt: string,
  updatedAt: string
}
```

## 🔧 开发计划

### 已完成功能 ✅
- [x] 项目基础架构
- [x] 数据存储管理
- [x] 任务 CRUD 操作
- [x] 时间限制和倒计时
- [x] 目标管理系统
- [x] 用户界面设计
- [x] 响应式布局

### 计划中功能 📝
- [ ] MySQL 数据库支持
- [ ] 用户认证系统
- [ ] 数据云端同步
- [ ] 团队协作功能
- [ ] 邮件提醒
- [ ] 移动端 PWA
- [ ] 数据分析图表
- [ ] 任务模板
- [ ] 标签系统
- [ ] 优先级管理

## 🎯 使用建议

1. **创建目标**: 先设定长期目标，如"学习编程"、"健身计划"等
2. **分解任务**: 为每个目标创建具体的任务
3. **设置时间**: 为重要任务设置截止时间
4. **定期回顾**: 查看统计页面了解进度

## 🐛 问题反馈

如果遇到问题或有功能建议，请通过以下方式反馈：
- 创建 Issue
- 发送邮件
- 提交 Pull Request

## 📄 许可证

MIT License

---

💡 **提示**: 这是一个渐进式 Web 应用，支持离线使用。所有数据都存储在本地，确保您的隐私安全。