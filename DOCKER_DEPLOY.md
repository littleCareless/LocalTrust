# LocalTrust Docker 部署指南

## 📦 架构说明

本配置将前后端打包到一个 Docker 容器中：
- **Nginx**：提供前端静态文件（端口 80）
- **Fastify 后端**：提供 API 服务（端口 3001）
- **数据持久化**：通过 volume 挂载 `./data` 目录

## 🚀 快速开始

### 1. 构建并启动容器

```bash
# 构建并启动
docker-compose up -d --build

# 查看日志
docker-compose logs -f
```

### 2. 配置 Hosts 文件

为了更好的本地访问体验，建议配置 hosts 文件：

**macOS/Linux:**
```bash
sudo nano /etc/hosts
```

**Windows:**
```
C:\Windows\System32\drivers\etc\hosts
```

添加以下内容：
```
127.0.0.1 localtrust.local
```

### 3. 访问应用

- **Web 界面**: http://localhost 或 http://localtrust.local
- **API 端点**: http://localhost:3001/api
- **健康检查**: http://localhost/health

## 🔧 常用命令

```bash
# 启动服务
docker-compose up -d

# 停止服务
docker-compose down

# 重启服务
docker-compose restart

# 查看日志
docker-compose logs -f

# 进入容器
docker-compose exec localtrust sh

# 重新构建
docker-compose up -d --build

# 清理并重新构建
docker-compose down -v
docker-compose up -d --build
```

## 📁 数据持久化

数据存储在 `./data` 目录中：
```
./data/
├── ca/          # CA 证书
├── certs/       # 生成的证书
└── db/          # SQLite 数据库
```

**重要提示**：
- 首次启动时会自动创建 CA 证书
- 删除 `./data` 目录会清空所有数据
- 建议定期备份 `./data` 目录

## 🔒 安全建议

1. **生产环境部署**：
   - 修改 `docker-compose.yml` 中的 `CORS_ORIGIN`
   - 使用反向代理（如 Nginx/Traefik）并配置 HTTPS
   - 限制端口暴露范围

2. **网络隔离**：
   - 容器已配置独立网络 `localtrust-network`
   - 可根据需要调整网络配置

## 🐛 故障排查

### 容器无法启动
```bash
# 查看详细日志
docker-compose logs

# 检查端口占用
lsof -i :80
lsof -i :3001
```

### 前端无法访问后端
- 检查 nginx 配置是否正确
- 确认后端服务已启动：`docker-compose exec localtrust ps aux`

### 数据丢失
- 确认 `./data` 目录挂载正确
- 检查目录权限：`ls -la ./data`

## 🔄 更新部署

```bash
# 拉取最新代码
git pull

# 重新构建并启动
docker-compose down
docker-compose up -d --build
```

## 📝 环境变量

可在 `docker-compose.yml` 中修改以下环境变量：

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `NODE_ENV` | `production` | 运行环境 |
| `PORT` | `3001` | 后端端口 |
| `HOST` | `0.0.0.0` | 后端监听地址 |
| `CORS_ORIGIN` | `http://localhost` | CORS 允许的源 |

## 🎯 高级配置

### 自定义域名

1. 修改 `nginx.conf` 中的 `server_name`
2. 配置 hosts 文件或 DNS
3. 重启容器：`docker-compose restart`

### 使用 HTTPS

建议使用 Traefik 或 Nginx Proxy Manager 作为反向代理，自动管理 SSL 证书。

### 性能优化

- 调整 Nginx worker 进程数
- 配置缓存策略
- 使用 CDN 加速静态资源

## 📞 支持

如遇问题，请查看：
- 项目 README.md
- GitHub Issues
- 容器日志：`docker-compose logs -f`
