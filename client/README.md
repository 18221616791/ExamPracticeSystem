# 题库导入系统 - 前端

一个基于 Vue 3 的题库导入与刷题练习系统前端应用。

## 功能特性

### 🔐 用户认证
- 用户注册与登录
- 微信登录支持
- 访客模式
- 角色权限管理（管理员/普通用户）

### 📚 题库管理
- Word 文档批量导入题目
- 题目在线编辑与管理
- 题目搜索与筛选
- 导入记录查看

### 🎯 刷题练习
- 多种练习模式（随机/顺序/错题）
- 实时答题反馈
- 练习进度跟踪
- 详细统计分析

### 📊 数据统计
- 练习记录统计
- 错题分析
- 学习建议
- 可视化图表

## 技术栈

- **框架**: Vue 3 + Composition API
- **状态管理**: Vuex 4
- **路由**: Vue Router 4
- **UI 组件**: Vant 3
- **HTTP 客户端**: Axios
- **构建工具**: Vue CLI 5
- **样式**: SCSS

## 项目结构

```
client/
├── public/                 # 静态资源
│   └── index.html         # HTML 模板
├── src/
│   ├── components/        # 公共组件
│   ├── views/            # 页面组件
│   │   ├── Login.vue     # 登录页面
│   │   ├── Home.vue      # 首页
│   │   ├── Upload.vue    # 上传页面
│   │   ├── Questions.vue # 题目管理
│   │   ├── Records.vue   # 导入记录
│   │   ├── Practice.vue  # 刷题练习
│   │   └── PracticeStats.vue # 练习统计
│   ├── router/           # 路由配置
│   │   └── index.js
│   ├── store/            # 状态管理
│   │   └── index.js
│   ├── utils/            # 工具函数
│   │   └── logger.js     # 日志工具
│   ├── App.vue           # 根组件
│   └── main.js           # 入口文件
├── package.json          # 依赖配置
├── vue.config.js         # Vue CLI 配置
└── README.md            # 项目文档
```

## 开发环境搭建

### 环境要求

- Node.js >= 14.0.0
- npm >= 6.0.0 或 yarn >= 1.0.0

### 安装依赖

```bash
# 使用 npm
npm install

# 或使用 yarn
yarn install
```

### 开发服务器

```bash
# 启动开发服务器
npm run serve

# 或
yarn serve
```

开发服务器将在 `http://localhost:8080` 启动。

### 构建生产版本

```bash
# 构建生产版本
npm run build

# 或
yarn build
```

构建文件将输出到 `dist/` 目录。

### 代码检查

```bash
# 运行 ESLint
npm run lint

# 或
yarn lint
```

## 配置说明

### 环境变量

创建 `.env.local` 文件配置本地环境变量：

```env
# API 基础地址
VUE_APP_API_BASE_URL=http://localhost:3000

# 应用标题
VUE_APP_TITLE=题库导入系统

# 微信登录配置
VUE_APP_WECHAT_APP_ID=your_wechat_app_id
```

### 代理配置

开发环境下，API 请求会自动代理到后端服务器（默认 `http://localhost:3000`）。

可以在 `vue.config.js` 中修改代理配置：

```javascript
devServer: {
  proxy: {
    '/api': {
      target: 'http://localhost:3000',
      changeOrigin: true
    }
  }
}
```

## 页面说明

### 登录页面 (`/login`)
- 支持账号密码登录
- 用户注册功能
- 微信扫码登录
- 访客模式入口

### 首页 (`/`)
- 系统概览
- 快捷操作入口
- 统计数据展示

### 上传页面 (`/upload`)
- Word 文档上传
- 上传进度显示
- 文件格式验证

### 题目管理 (`/questions`)
- 题目列表展示
- 题目搜索功能
- 在线编辑题目
- 题目删除功能

### 导入记录 (`/records`)
- 文件导入历史
- 处理状态查看
- 错误信息展示

### 刷题练习 (`/practice`)
- 多种练习模式
- 实时答题体验
- 答案解析展示

### 练习统计 (`/practice-stats`)
- 练习数据统计
- 错题分析
- 学习建议

## 状态管理

使用 Vuex 管理应用状态，主要模块包括：

- **用户模块**: 用户信息、认证状态
- **题目模块**: 题目数据、搜索结果
- **练习模块**: 练习状态、统计数据
- **上传模块**: 上传进度、导入记录

## 路由守卫

实现了基于用户角色的路由权限控制：

- 未登录用户只能访问登录页面
- 普通用户可以访问练习相关页面
- 管理员可以访问所有页面

## 移动端适配

- 使用 Vant 组件库确保移动端体验
- 响应式设计适配不同屏幕尺寸
- 触摸友好的交互设计

## 性能优化

- 路由懒加载
- 组件按需引入
- 图片压缩优化
- 代码分割
- 缓存策略

## 浏览器支持

- Chrome >= 60
- Firefox >= 60
- Safari >= 12
- Edge >= 79

## 开发规范

### 代码风格
- 使用 ESLint + Prettier 统一代码风格
- 遵循 Vue 3 Composition API 最佳实践
- 组件命名使用 PascalCase
- 文件命名使用 kebab-case

### 提交规范
使用 Conventional Commits 规范：

```
feat: 新功能
fix: 修复bug
docs: 文档更新
style: 代码格式调整
refactor: 代码重构
test: 测试相关
chore: 构建过程或辅助工具的变动
```

## 部署说明

### 生产环境部署

1. 构建生产版本：
```bash
npm run build
```

2. 将 `dist/` 目录部署到 Web 服务器

3. 配置服务器支持 History 模式路由

### Nginx 配置示例

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /path/to/dist;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location /api {
        proxy_pass http://backend-server:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 常见问题

### Q: 开发服务器启动失败
A: 检查 Node.js 版本是否符合要求，清除 node_modules 重新安装依赖。

### Q: API 请求失败
A: 确认后端服务器是否正常运行，检查代理配置是否正确。

### Q: 构建失败
A: 检查代码语法错误，确认所有依赖都已正确安装。

## 贡献指南

1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 推送到分支
5. 创建 Pull Request

## 许可证

MIT License

## 联系方式

如有问题或建议，请通过以下方式联系：

- 邮箱: your-email@example.com
- 项目地址: https://github.com/your-username/question-bank-system