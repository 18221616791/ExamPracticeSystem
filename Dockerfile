# 多阶段构建
# 第一阶段：构建前端
FROM node:18-alpine AS frontend-builder

WORKDIR /app/client

# 复制前端package文件
COPY client/package*.json ./

# 安装前端依赖
RUN npm ci --only=production

# 复制前端源码
COPY client/ ./

# 构建前端
RUN npm run build

# 第二阶段：构建后端运行环境
FROM node:18-alpine AS production

# 安装必要的系统依赖
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    && ln -sf python3 /usr/bin/python

WORKDIR /app

# 复制后端package文件
COPY package*.json ./

# 安装后端依赖
RUN npm ci --only=production

# 复制后端源码
COPY server/ ./server/
COPY 题库/ ./题库/

# 从前端构建阶段复制构建结果
COPY --from=frontend-builder /app/client/dist ./client/dist

# 创建日志目录
RUN mkdir -p server/logs

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3000

# 暴露端口
EXPOSE 3000

# 创建非root用户
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# 更改文件所有权
RUN chown -R nodejs:nodejs /app
USER nodejs

# 启动应用
CMD ["npm", "start"]