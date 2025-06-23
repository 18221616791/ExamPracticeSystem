# 题库系统 Docker 部署指南

本指南将帮助您在阿里云服务器上使用 Docker 容器部署题库系统。

## 系统要求

- **操作系统**: Ubuntu 18.04+ / CentOS 7+ / Debian 9+
- **内存**: 最低 2GB，推荐 4GB+
- **存储**: 最低 10GB 可用空间
- **网络**: 需要开放端口 80, 443, 3000, 3306

## 预备工作

### 1. 服务器准备

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y  # Ubuntu/Debian
# 或
sudo yum update -y  # CentOS

# 安装必要工具
sudo apt install -y curl wget git unzip  # Ubuntu/Debian
# 或
sudo yum install -y curl wget git unzip  # CentOS
```

### 2. 安装 Docker

```bash
# 安装 Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 启动 Docker 服务
sudo systemctl start docker
sudo systemctl enable docker

# 将当前用户添加到 docker 组
sudo usermod -aG docker $USER

# 重新登录或执行
newgrp docker
```

### 3. 安装 Docker Compose

```bash
# 下载 Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# 添加执行权限
sudo chmod +x /usr/local/bin/docker-compose

# 验证安装
docker-compose --version
```

## 部署步骤

### 方法一：自动部署（推荐）

1. **上传项目文件**
   ```bash
   # 将整个项目目录上传到服务器
   # 可以使用 scp, rsync, 或 git clone
   
   # 示例：使用 git clone
   git clone <your-repository-url>
   cd question-bank-system
   ```

2. **运行部署脚本**
   ```bash
   # 添加执行权限
   chmod +x deploy.sh
   
   # 执行部署
   ./deploy.sh
   ```

3. **等待部署完成**
   - 脚本会自动检查环境
   - 创建必要的目录和配置文件
   - 构建和启动所有服务
   - 显示访问信息

### 方法二：手动部署

1. **准备环境配置**
   ```bash
   # 复制环境配置模板
   cp .env.example .env
   
   # 编辑配置文件
   nano .env
   ```

2. **创建必要目录**
   ```bash
   mkdir -p uploads server/logs mysql-init ssl
   ```

3. **构建和启动服务**
   ```bash
   # 构建镜像
   docker-compose build
   
   # 启动服务
   docker-compose up -d
   ```

4. **检查服务状态**
   ```bash
   # 查看容器状态
   docker-compose ps
   
   # 查看日志
   docker-compose logs -f
   ```

## 配置说明

### 环境变量配置 (.env)

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

# MySQL Root密码
MYSQL_ROOT_PASSWORD=your_mysql_root_password
```

### 端口配置

- **80**: Nginx HTTP 端口
- **443**: Nginx HTTPS 端口（需要SSL证书）
- **3000**: 应用直接访问端口
- **3306**: MySQL 数据库端口

### 阿里云安全组配置

在阿里云控制台配置安全组规则，开放以下端口：

| 端口 | 协议 | 授权对象 | 描述 |
|------|------|----------|------|
| 80 | TCP | 0.0.0.0/0 | HTTP 访问 |
| 443 | TCP | 0.0.0.0/0 | HTTPS 访问 |
| 22 | TCP | 你的IP | SSH 访问 |
| 3000 | TCP | 0.0.0.0/0 | 应用直接访问（可选）|

## SSL 证书配置（可选）

### 1. 获取 SSL 证书

```bash
# 使用 Let's Encrypt 免费证书
sudo apt install certbot
sudo certbot certonly --standalone -d your-domain.com

# 证书文件位置
# /etc/letsencrypt/live/your-domain.com/fullchain.pem
# /etc/letsencrypt/live/your-domain.com/privkey.pem
```

### 2. 配置证书

```bash
# 复制证书到项目目录
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem ./ssl/cert.pem
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem ./ssl/key.pem
sudo chown $USER:$USER ./ssl/*.pem
```

### 3. 启用 HTTPS

编辑 `nginx.conf` 文件，取消注释 HTTPS 服务器配置部分。

## 管理命令

### 服务管理

```bash
# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f
docker-compose logs -f app  # 只查看应用日志
docker-compose logs -f mysql  # 只查看数据库日志

# 重启服务
docker-compose restart
docker-compose restart app  # 只重启应用

# 停止服务
docker-compose down

# 停止并删除数据
docker-compose down -v
```

### 数据备份

```bash
# 备份数据库
docker-compose exec mysql mysqldump -u root -p question_bank > backup_$(date +%Y%m%d_%H%M%S).sql

# 备份上传文件
tar -czf uploads_backup_$(date +%Y%m%d_%H%M%S).tar.gz uploads/
```

### 数据恢复

```bash
# 恢复数据库
docker-compose exec -T mysql mysql -u root -p question_bank < backup_file.sql

# 恢复上传文件
tar -xzf uploads_backup_file.tar.gz
```

## 监控和维护

### 1. 系统监控

```bash
# 查看系统资源使用
docker stats

# 查看磁盘使用
df -h
du -sh uploads/
du -sh server/logs/
```

### 2. 日志管理

```bash
# 清理应用日志
find server/logs/ -name "*.log" -mtime +30 -delete

# 清理 Docker 日志
docker system prune -f
```

### 3. 更新应用

```bash
# 拉取最新代码
git pull origin main

# 重新构建和部署
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## 故障排除

### 常见问题

1. **容器启动失败**
   ```bash
   # 查看详细日志
   docker-compose logs app
   
   # 检查配置文件
   docker-compose config
   ```

2. **数据库连接失败**
   ```bash
   # 检查数据库容器状态
   docker-compose logs mysql
   
   # 测试数据库连接
   docker-compose exec mysql mysql -u app_user -p question_bank
   ```

3. **端口被占用**
   ```bash
   # 查看端口占用
   netstat -tuln | grep :80
   
   # 修改 docker-compose.yml 中的端口映射
   ```

4. **内存不足**
   ```bash
   # 查看内存使用
   free -h
   
   # 增加交换空间
   sudo fallocate -l 2G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   ```

### 性能优化

1. **数据库优化**
   - 定期清理旧的练习记录
   - 添加适当的索引
   - 配置 MySQL 参数

2. **应用优化**
   - 启用 Gzip 压缩
   - 配置静态文件缓存
   - 使用 CDN 加速

3. **服务器优化**
   - 配置防火墙
   - 设置自动更新
   - 监控系统资源

## 安全建议

1. **定期更新**
   - 定期更新系统和 Docker
   - 更新应用依赖

2. **密码安全**
   - 使用强密码
   - 定期更换密码
   - 不要在代码中硬编码密码

3. **网络安全**
   - 配置防火墙
   - 使用 HTTPS
   - 限制数据库访问

4. **备份策略**
   - 定期备份数据
   - 测试恢复流程
   - 异地备份

## 联系支持

如果在部署过程中遇到问题，请：

1. 检查本文档的故障排除部分
2. 查看应用日志获取详细错误信息
3. 提供详细的错误信息和环境配置

---

**注意**: 请在生产环境中使用强密码，并定期更新系统和应用。