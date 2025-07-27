#!/bin/bash

echo "🚀 Enhanced Todo App MySQL 初始化脚本"
echo "======================================"

# 检查是否安装了MySQL
if ! command -v mysql &> /dev/null; then
    echo "❌ 错误: 未找到MySQL命令，请确保MySQL已安装"
    exit 1
fi

# 数据库配置
DB_HOST="localhost"
DB_PORT="3306"
DB_NAME="enhanced_todo_app"
DB_USER="root"
DB_PASSWORD="123456"

echo "📋 配置信息:"
echo "   数据库: $DB_NAME"
echo "   主机: $DB_HOST:$DB_PORT"
echo "   用户: $DB_USER"
echo ""

# 询问是否继续
read -p "🤔 是否继续初始化数据库? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ 取消初始化"
    exit 1
fi

# 执行SQL脚本
echo "📝 执行数据库初始化脚本..."
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" < database/init.sql

if [ $? -eq 0 ]; then
    echo "✅ 数据库初始化成功!"
    echo ""
    echo "📊 创建的表:"
    mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" -e "USE $DB_NAME; SHOW TABLES;"
    
    echo ""
    echo "🎯 下一步:"
    echo "   1. cd backend"
    echo "   2. npm install"
    echo "   3. npm start"
    echo ""
else
    echo "❌ 数据库初始化失败!"
    echo "   请检查MySQL连接配置和权限"
    exit 1
fi