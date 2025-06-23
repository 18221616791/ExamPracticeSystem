# 安全配置指南

## 🔒 敏感信息保护

本项目已实施以下安全措施来保护敏感信息：

### 1. 环境变量配置

#### 生产环境配置
- 复制 `.env.example` 为 `.env.production`
- 修改 `.env.production` 中的所有敏感信息
- **重要：** `.env.production` 文件已添加到 `.gitignore`，不会被提交到Git仓库

#### 必须修改的配置项
```bash
# 数据库密码 - 使用强密码
DB_PASSWORD=your_secure_password_here
MYSQL_ROOT_PASSWORD=your_secure_root_password_here

# JWT密钥 - 至少32字符的随机字符串
JWT_SECRET=your_super_secure_jwt_secret_key_at_least_32_characters_long
```

### 2. GitHub Secrets 配置

在GitHub仓库中配置以下Secrets：

#### 部署相关
- `SERVER_HOST`: 服务器IP地址
- `SERVER_USER`: 服务器用户名
- `SERVER_SSH_KEY`: SSH私钥内容
- `SERVER_PORT`: SSH端口（默认22）

#### 测试环境
- `TEST_DB_PASSWORD`: 测试数据库密码
- `TEST_JWT_SECRET`: 测试环境JWT密钥

#### 生产环境（可选，用于自动部署）
- `PROD_DB_PASSWORD`: 生产数据库密码
- `PROD_JWT_SECRET`: 生产环境JWT密钥
- `PROD_MYSQL_ROOT_PASSWORD`: 生产环境MySQL root密码

### 3. 配置GitHub Secrets步骤

1. 进入GitHub仓库页面
2. 点击 `Settings` → `Secrets and variables` → `Actions`
3. 点击 `New repository secret`
4. 添加上述所需的secrets

### 4. 部署前检查清单

- [ ] 已创建 `.env.production` 文件
- [ ] 已修改所有默认密码
- [ ] JWT_SECRET 使用强随机字符串
- [ ] 已配置所有必需的GitHub Secrets
- [ ] 已验证 `.gitignore` 包含敏感文件
- [ ] 服务器SSH密钥已正确配置

### 5. 安全最佳实践

#### 密码要求
- 数据库密码：至少12字符，包含大小写字母、数字和特殊字符
- JWT密钥：至少32字符的随机字符串
- 避免使用常见密码或个人信息

#### 文件权限
```bash
# 生产环境中设置正确的文件权限
chmod 600 .env.production
chown app_user:app_group .env.production
```

#### 定期更新
- 定期更换数据库密码
- 定期更换JWT密钥
- 监控访问日志

### 6. 应急响应

如果敏感信息意外泄露：

1. **立即行动**
   - 更改所有相关密码
   - 撤销泄露的API密钥
   - 检查访问日志

2. **Git历史清理**
   ```bash
   # 如果敏感信息曾被提交到Git
   git filter-branch --force --index-filter \
   'git rm --cached --ignore-unmatch path/to/sensitive/file' \
   --prune-empty --tag-name-filter cat -- --all
   ```

3. **通知相关人员**
   - 通知团队成员
   - 更新部署文档

### 7. 监控和审计

- 启用数据库访问日志
- 监控异常登录活动
- 定期审查访问权限
- 使用安全扫描工具

---

**⚠️ 重要提醒：**
- 永远不要在代码中硬编码敏感信息
- 定期检查和更新安全配置
- 遵循最小权限原则
- 保持依赖包的及时更新