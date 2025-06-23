# 题库系统 Docker 部署

本项目已配置完整的 Docker 容器化部署方案，支持开发和生产环境。

## 🚀 快速开始

### 方式一：使用快速启动脚本（推荐）

```bash
# 添加执行权限
chmod +x quick-start.sh

# 运行脚本，选择启动模式
./quick-start.sh
```

### 方式二：使用 npm 脚本

```bash
# 开发环境
npm run docker:dev

# 生产环境
npm run docker:build
npm run docker:up

# 查看日志
npm run docker:logs

# 停止服务
npm run docker:down
```

### 方式三：直接使用 Docker Compose

```bash
# 生产环境
docker-compose up -d

# 开发环境
docker-compose -f docker-compose.dev.yml up -d
```

## 📁 项目结构

```
题库导入/
├── Dockerfile                 # 应用镜像构建文件
├── docker-compose.yml         # 生产环境配置
├── docker-compose.dev.yml     # 开发环境配置
├── nginx.conf                 # Nginx 配置
├── .dockerignore              # Docker 忽略文件
├── .env.example               # 环境变量模板
├── deploy.sh                  # 自动部署脚本
├── quick-start.sh             # 快速启动脚本
├── mysql-init/                # 数据库初始化脚本
│   └── 01-init.sql
├── DEPLOYMENT.md              # 详细部署指南
└── README-DOCKER.md           # 本文件
```

## 🐳 容器服务

### 生产环境 (docker-compose.yml)

| 服务 | 端口 | 描述 |
|------|------|------|
| nginx | 80, 443 | 反向代理和负载均衡 |
| app | 3000 | Node.js 应用服务 |
| mysql | 3306 | MySQL 数据库 |

### 开发环境 (docker-compose.dev.yml)

| 服务 | 端口 | 描述 |
|------|------|------|
| app-dev | 3001 | Node.js 应用服务（开发模式）|
| mysql-dev | 3307 | MySQL 数据库（开发环境）|

## ⚙️ 环境配置

### 1. 复制环境配置文件

```bash
cp .env.example .env
```

### 2. 编辑配置文件

```env
# 数据库配置
DB_HOST=mysql
DB_PORT=3306
DB_NAME=question_bank
DB_USER=app_user
DB_PASSWORD=your_secure_password

# 应用配置
NODE_ENV=production
PORT=3000

# JWT配置
JWT_SECRET=your_jwt_secret_key
```

## 🔧 常用命令

### 服务管理

```bash
# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f
docker-compose logs -f app    # 只看应用日志
docker-compose logs -f mysql  # 只看数据库日志

# 重启服务
docker-compose restart
docker-compose restart app    # 只重启应用

# 停止服务
docker-compose down

# 停止并删除数据
docker-compose down -v
```

### 数据管理

```bash
# 进入数据库容器
docker-compose exec mysql mysql -u root -p

# 备份数据库
docker-compose exec mysql mysqldump -u root -p question_bank > backup.sql

# 恢复数据库
docker-compose exec -T mysql mysql -u root -p question_bank < backup.sql
```

### 应用管理

```bash
# 进入应用容器
docker-compose exec app bash

# 查看应用日志
docker-compose exec app tail -f server/logs/$(date +%Y-%m-%d).log

# 重新构建镜像
docker-compose build --no-cache
```

## 🌐 访问地址

### 生产环境
- **HTTP**: http://localhost:80
- **直接访问**: http://localhost:3000
- **健康检查**: http://localhost:3000/health

### 开发环境
- **应用**: http://localhost:3001
- **健康检查**: http://localhost:3001/health

### 数据库连接
- **生产环境**: localhost:3306
- **开发环境**: localhost:3307
- **用户名**: app_user
- **密码**: 查看 .env 文件
- **数据库**: question_bank

## 🔒 安全配置

### 1. 修改默认密码

```bash
# 生成随机密码
openssl rand -base64 32

# 更新 .env 文件中的密码
```

### 2. SSL 证书配置

```bash
# 将证书文件放入 ssl/ 目录
ssl/
├── cert.pem
└── key.pem

# 编辑 nginx.conf 启用 HTTPS
```

### 3. 防火墙配置

```bash
# Ubuntu/Debian
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 22

# CentOS/RHEL
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=443/tcp
sudo firewall-cmd --reload
```

## 📊 监控和维护

### 1. 系统监控

```bash
# 查看容器资源使用
docker stats

# 查看系统资源
htop
df -h
```

### 2. 日志管理

```bash
# 清理旧日志
find server/logs/ -name "*.log" -mtime +30 -delete

# 清理 Docker 日志
docker system prune -f
```

### 3. 自动备份

```bash
# 创建备份脚本
#!/bin/bash
BACKUP_DIR="/backup/$(date +%Y%m%d)"
mkdir -p $BACKUP_DIR

# 备份数据库
docker-compose exec -T mysql mysqldump -u root -p$MYSQL_ROOT_PASSWORD question_bank > $BACKUP_DIR/database.sql

# 备份文件
tar -czf $BACKUP_DIR/uploads.tar.gz uploads/
```

## 🚨 故障排除

### 常见问题

1. **端口被占用**
   ```bash
   # 查看端口占用
   netstat -tuln | grep :80
   
   # 修改端口映射
   # 编辑 docker-compose.yml
   ```

2. **容器启动失败**
   ```bash
   # 查看详细日志
   docker-compose logs app
   
   # 检查配置
   docker-compose config
   ```

3. **数据库连接失败**
   ```bash
   # 检查数据库状态
   docker-compose logs mysql
   
   # 测试连接
   docker-compose exec mysql mysql -u app_user -p
   ```

4. **内存不足**
   ```bash
   # 查看内存使用
   free -h
   
   # 清理无用镜像
   docker system prune -a
   ```

## 📚 相关文档

- [详细部署指南](./DEPLOYMENT.md)
- [Docker 官方文档](https://docs.docker.com/)
- [Docker Compose 文档](https://docs.docker.com/compose/)
- [Nginx 配置指南](https://nginx.org/en/docs/)

## 🤝 贡献

如果您在使用过程中发现问题或有改进建议，欢迎提交 Issue 或 Pull Request。

## 📄 许可证

本项目采用 MIT 许可证。详情请查看 [LICENSE](./LICENSE) 文件。