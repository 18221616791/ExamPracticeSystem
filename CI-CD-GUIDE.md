# CI/CD 自动化部署指南

本指南将帮助您为题库导入系统配置完整的CI/CD自动化部署流程。

## 📋 目录

- [概述](#概述)
- [部署方案](#部署方案)
- [GitHub Actions 配置](#github-actions-配置)
- [手动脚本部署](#手动脚本部署)
- [服务器准备](#服务器准备)
- [环境变量配置](#环境变量配置)
- [部署流程](#部署流程)
- [监控和维护](#监控和维护)
- [故障排除](#故障排除)

## 🎯 概述

本项目提供了多种CI/CD部署方案：

1. **GitHub Actions** - 自动化CI/CD（推荐）
2. **手动脚本部署** - 适用于没有GitHub的情况
3. **本地Docker部署** - 开发和测试环境

## 🚀 部署方案

### 方案一：GitHub Actions（推荐）

**优势：**
- 完全自动化
- 代码推送即部署
- 内置测试和构建
- 支持回滚

**适用场景：**
- 使用GitHub托管代码
- 团队协作开发
- 需要自动化测试

### 方案二：手动脚本部署

**优势：**
- 不依赖第三方CI/CD平台
- 完全可控
- 支持任何Git仓库

**适用场景：**
- 私有Git仓库
- 简单的部署需求
- 学习和测试

## 🔧 GitHub Actions 配置

### 1. 设置GitHub Secrets

在GitHub仓库的 `Settings > Secrets and variables > Actions` 中添加以下secrets：

| Secret名称 | 描述 | 示例值 |
|-----------|------|--------|
| `SERVER_HOST` | 服务器IP地址 | `123.456.789.0` |
| `SERVER_USER` | SSH用户名 | `root` |
| `SERVER_SSH_KEY` | SSH私钥 | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `SERVER_PORT` | SSH端口（可选） | `22` |
| `DB_PASSWORD` | 数据库密码 | `your_secure_password` |
| `JWT_SECRET` | JWT密钥 | `your_jwt_secret_key` |

### 2. SSH密钥配置

#### 生成SSH密钥对：
```bash
# 在本地生成SSH密钥对
ssh-keygen -t rsa -b 4096 -C "your_email@example.com" -f ~/.ssh/deploy_key

# 查看公钥内容
cat ~/.ssh/deploy_key.pub

# 查看私钥内容（添加到GitHub Secrets）
cat ~/.ssh/deploy_key
```

#### 在服务器上添加公钥：
```bash
# 在服务器上执行
mkdir -p ~/.ssh
echo "your_public_key_content" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
chmod 700 ~/.ssh
```

### 3. 工作流程说明

当代码推送到`main`或`master`分支时，GitHub Actions会自动：

1. **测试阶段**：
   - 安装依赖
   - 构建前端
   - 运行测试（如果有）
   - 生成构建产物

2. **部署阶段**：
   - 下载构建产物
   - 连接到服务器
   - 备份当前版本
   - 上传新版本
   - 启动服务
   - 执行健康检查

## 🛠 手动脚本部署

### Linux/macOS 使用方法

```bash
# 1. 设置执行权限
chmod +x ci-cd-setup.sh

# 2. 初始化配置
./ci-cd-setup.sh setup

# 3. 部署项目
./ci-cd-setup.sh deploy

# 4. 查看日志
./ci-cd-setup.sh logs

# 5. 健康检查
./ci-cd-setup.sh health

# 6. 回滚（如果需要）
./ci-cd-setup.sh rollback
```

### Windows 使用方法

```cmd
REM 1. 初始化配置
ci-cd-setup.bat setup

REM 2. 部署项目
ci-cd-setup.bat deploy

REM 3. 查看日志
ci-cd-setup.bat logs

REM 4. 健康检查
ci-cd-setup.bat health

REM 5. 回滚（如果需要）
ci-cd-setup.bat rollback
```

## 🖥 服务器准备

### 系统要求

- **操作系统**：Ubuntu 18.04+ / CentOS 7+ / Debian 9+
- **内存**：至少 2GB RAM
- **存储**：至少 10GB 可用空间
- **网络**：开放端口 80, 443, 22

### 安装基础软件

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y curl wget git

# CentOS/RHEL
sudo yum update -y
sudo yum install -y curl wget git
```

### 配置防火墙

```bash
# Ubuntu (ufw)
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# CentOS (firewalld)
sudo firewall-cmd --permanent --add-port=22/tcp
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=443/tcp
sudo firewall-cmd --reload
```

### 阿里云安全组配置

在阿里云控制台配置安全组规则：

| 方向 | 协议 | 端口范围 | 授权对象 | 描述 |
|------|------|----------|----------|------|
| 入方向 | TCP | 22 | 0.0.0.0/0 | SSH访问 |
| 入方向 | TCP | 80 | 0.0.0.0/0 | HTTP访问 |
| 入方向 | TCP | 443 | 0.0.0.0/0 | HTTPS访问 |

## ⚙️ 环境变量配置

### 生产环境变量

创建 `.env` 文件：

```bash
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
JWT_SECRET=your_jwt_secret_key_here

# MySQL Root密码（用于初始化）
MYSQL_ROOT_PASSWORD=your_mysql_root_password

# 日志级别
LOG_LEVEL=info

# 文件上传配置
UPLOAD_MAX_SIZE=50MB
UPLOAD_PATH=/app/uploads
```

### 安全建议

1. **强密码**：使用复杂的数据库密码和JWT密钥
2. **定期更换**：定期更换密码和密钥
3. **权限控制**：限制文件访问权限
4. **备份**：定期备份环境变量文件

## 📊 部署流程

### 自动化部署流程

```mermaid
graph TD
    A[代码推送] --> B[触发CI/CD]
    B --> C[安装依赖]
    C --> D[构建前端]
    D --> E[运行测试]
    E --> F[构建Docker镜像]
    F --> G[连接服务器]
    G --> H[备份当前版本]
    H --> I[部署新版本]
    I --> J[启动服务]
    J --> K[健康检查]
    K --> L{检查通过?}
    L -->|是| M[部署成功]
    L -->|否| N[自动回滚]
```

### 手动部署步骤

1. **准备阶段**
   ```bash
   # 检查本地环境
   node --version
   npm --version
   git --version
   ```

2. **构建阶段**
   ```bash
   # 安装依赖
   npm install
   cd client && npm install && cd ..
   
   # 构建前端
   npm run build
   ```

3. **部署阶段**
   ```bash
   # 上传文件到服务器
   scp -r dist/ user@server:/opt/question-bank/
   
   # 启动服务
   ssh user@server "cd /opt/question-bank && docker-compose up -d"
   ```

4. **验证阶段**
   ```bash
   # 健康检查
   curl -f http://your-server/health
   ```

## 📈 监控和维护

### 服务监控

```bash
# 查看服务状态
docker-compose ps

# 查看服务日志
docker-compose logs -f

# 查看资源使用
docker stats

# 查看磁盘使用
df -h
```

### 定期维护

```bash
# 清理Docker资源
docker system prune -f

# 备份数据库
docker-compose exec mysql mysqldump -u root -p question_bank > backup.sql

# 更新系统
sudo apt update && sudo apt upgrade -y
```

### 日志管理

```bash
# 查看应用日志
tail -f server/logs/app.log

# 查看错误日志
tail -f server/logs/error.log

# 清理旧日志
find server/logs -name "*.log" -mtime +30 -delete
```

## 🔧 故障排除

### 常见问题

#### 1. 部署失败

**症状**：部署过程中断或失败

**解决方案**：
```bash
# 检查服务器连接
ssh user@server "echo 'Connection OK'"

# 检查磁盘空间
ssh user@server "df -h"

# 检查Docker状态
ssh user@server "docker --version && docker-compose --version"
```

#### 2. 服务无法启动

**症状**：Docker容器启动失败

**解决方案**：
```bash
# 查看容器日志
docker-compose logs app
docker-compose logs mysql

# 检查端口占用
netstat -tlnp | grep :80
netstat -tlnp | grep :3000

# 重启服务
docker-compose restart
```

#### 3. 数据库连接失败

**症状**：应用无法连接数据库

**解决方案**：
```bash
# 检查MySQL容器
docker-compose exec mysql mysql -u root -p -e "SHOW DATABASES;"

# 检查网络连接
docker-compose exec app ping mysql

# 重置数据库
docker-compose down -v
docker-compose up -d
```

#### 4. 前端资源加载失败

**症状**：网页无法正常显示

**解决方案**：
```bash
# 检查Nginx配置
docker-compose exec nginx nginx -t

# 重新构建前端
npm run build

# 重启Nginx
docker-compose restart nginx
```

### 回滚操作

```bash
# 使用脚本回滚
./ci-cd-setup.sh rollback

# 手动回滚
cd /opt/question-bank
docker-compose down
mv current failed-$(date +%Y%m%d-%H%M%S)
mv backup-latest current
cd current && docker-compose up -d
```

### 紧急恢复

```bash
# 快速重启所有服务
docker-compose down && docker-compose up -d

# 从备份恢复数据库
docker-compose exec mysql mysql -u root -p question_bank < backup.sql

# 重新部署最新版本
git pull origin main
./ci-cd-setup.sh deploy
```

## 📚 相关文档

- [Docker部署指南](./DEPLOYMENT.md)
- [Docker使用说明](./README-DOCKER.md)
- [项目README](./README.md)
- [调试指南](./DEBUG_README.md)

## 🤝 支持

如果您在配置CI/CD过程中遇到问题，请：

1. 查看本文档的故障排除部分
2. 检查服务器日志
3. 确认网络和权限配置
4. 联系技术支持

---

**注意**：请根据您的实际服务器环境和需求调整配置参数。