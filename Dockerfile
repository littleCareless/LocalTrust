# 多阶段构建 Dockerfile
# 阶段 1: 构建前端
FROM node:18-alpine AS web-builder

WORKDIR /app

# 复制 package 文件
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/web/package.json ./apps/web/
COPY packages/ui/package.json ./packages/ui/ 2>/dev/null || true
COPY packages/types/package.json ./packages/types/ 2>/dev/null || true

# 安装 pnpm 并安装依赖
RUN npm install -g pnpm@8.15.1
RUN pnpm install --frozen-lockfile

# 复制源代码
COPY . .

# 构建前端
RUN pnpm --filter web build

# 阶段 2: 构建后端
FROM node:18-alpine AS server-builder

WORKDIR /app

# 复制 package 文件
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/server/package.json ./apps/server/
COPY packages/types/package.json ./packages/types/ 2>/dev/null || true

# 安装 pnpm 并安装依赖
RUN npm install -g pnpm@8.15.1
RUN pnpm install --frozen-lockfile

# 复制源代码
COPY apps/server ./apps/server
COPY packages ./packages
COPY tsconfig.base.json ./

# 构建后端
RUN pnpm --filter @localtrust/server build

# 阶段 3: 生产镜像
FROM node:18-alpine

WORKDIR /app

# 安装 nginx 用于提供前端静态文件
RUN apk add --no-cache nginx

# 复制后端构建产物和依赖
COPY --from=server-builder /app/apps/server/dist ./server/dist
COPY --from=server-builder /app/apps/server/package.json ./server/
COPY --from=server-builder /app/node_modules ./node_modules
COPY --from=server-builder /app/apps/server/node_modules ./server/node_modules

# 复制前端构建产物
COPY --from=web-builder /app/apps/web/dist ./web/dist

# 创建 nginx 配置
RUN mkdir -p /etc/nginx/http.d && \
    rm -f /etc/nginx/http.d/default.conf

COPY nginx.conf /etc/nginx/http.d/localtrust.conf

# 创建数据目录
RUN mkdir -p /app/data/ca /app/data/certs /app/data/db

# 创建启动脚本
COPY docker-entrypoint.sh /app/
RUN chmod +x /app/docker-entrypoint.sh

# 暴露端口
EXPOSE 80 3001

# 设置环境变量
ENV NODE_ENV=production \
    PORT=3001 \
    HOST=0.0.0.0 \
    CORS_ORIGIN=http://localhost

# 启动脚本
ENTRYPOINT ["/app/docker-entrypoint.sh"]
