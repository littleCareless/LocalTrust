#!/bin/sh
set -e

echo "🚀 启动 LocalTrust..."

# 启动 nginx
echo "📦 启动 Nginx..."
nginx

# 启动后端服务
echo "🔧 启动后端服务..."
cd /app/server
exec node dist/index.js
