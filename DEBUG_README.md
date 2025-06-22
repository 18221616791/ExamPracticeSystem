# 调试和日志配置说明

## 调试配置

### VS Code 调试配置

项目已配置完整的 VS Code 调试环境，包含以下配置：

#### 1. 启动后端服务器
- **配置名称**: "启动后端服务器"
- **功能**: 启动 Node.js 后端服务，支持断点调试
- **端口**: 默认 3000
- **调试端口**: 9229

#### 2. 启动前端应用
- **配置名称**: "启动前端应用"
- **功能**: 启动 Chrome 浏览器并连接到前端应用
- **端口**: 默认 8080
- **支持**: 源码映射、断点调试

#### 3. 附加到后端进程
- **配置名称**: "附加到后端进程"
- **功能**: 附加到已运行的后端进程进行调试

#### 4. 启动全栈应用
- **配置名称**: "启动全栈应用"
- **功能**: 同时启动前端和后端应用

### 使用方法

1. 打开 VS Code
2. 按 `F5` 或点击调试面板的运行按钮
3. 选择相应的调试配置
4. 在代码中设置断点
5. 开始调试

## 日志系统

### 后端日志

#### 特性
- **多级别日志**: ERROR, WARN, INFO, DEBUG
- **文件输出**: 自动保存到 `server/logs/` 目录
- **彩色控制台**: 不同级别使用不同颜色
- **结构化日志**: 支持元数据记录
- **自动轮转**: 按日期分割日志文件

#### 使用示例
```javascript
const { Logger, logger } = require('./utils/logger');

// 使用默认日志器
logger.info('这是一条信息日志');
logger.error('这是一条错误日志', { error: err.message });

// 创建模块专用日志器
const dbLogger = new Logger('DATABASE');
dbLogger.debug('数据库连接成功');
```

#### 专用日志方法
- `logRequest()`: HTTP请求日志
- `logDatabase()`: 数据库操作日志
- `logFile()`: 文件操作日志
- `logUser()`: 用户操作日志

### 前端日志

#### 特性
- **浏览器控制台**: 彩色输出，易于区分
- **远程日志**: 错误自动发送到服务器
- **性能监控**: 支持性能指标记录
- **全局错误捕获**: 自动捕获未处理的错误

#### 使用示例
```javascript
import { logger } from '@/utils/logger';

// 基础日志
logger.info('用户登录成功');
logger.error('API请求失败', { url, status });

// 专用方法
logger.logUserAction('点击按钮', { buttonId: 'submit' });
logger.logApiRequest('POST', '/api/login', { username });
logger.logPerformance('页面加载时间', loadTime);
```

#### 在组件中使用
```javascript
export default {
  mounted() {
     this.$logger.logComponentLifecycle('Home', 'mounted');
  },
  methods: {
    handleClick() {
       this.$logger.logUserAction('按钮点击', { action: 'submit' });
    }
  }
}
```

### 环境配置

#### 开发环境 (.env.development)
```
VUE_APP_LOG_LEVEL=DEBUG
VUE_APP_ENABLE_VCONSOLE=true
```

#### 生产环境 (.env.production)
```
VUE_APP_LOG_LEVEL=WARN
VUE_APP_ENABLE_VCONSOLE=false
```

### 日志级别说明

- **ERROR**: 错误信息，需要立即关注
- **WARN**: 警告信息，可能存在问题
- **INFO**: 一般信息，记录重要操作
- **DEBUG**: 调试信息，详细的执行过程

### 日志文件位置

- **后端日志**: `server/logs/YYYY-MM-DD.log`
- **错误日志**: `server/logs/error-YYYY-MM-DD.log`

### 最佳实践

1. **合理使用日志级别**
   - 生产环境使用 WARN 或 ERROR
   - 开发环境可以使用 DEBUG

2. **记录关键信息**
   - 用户操作
   - API 请求/响应
   - 错误和异常
   - 性能指标

3. **避免敏感信息**
   - 不要记录密码
   - 不要记录完整的用户数据
   - 注意数据隐私

4. **结构化日志**
   - 使用元数据对象
   - 保持日志格式一致
   - 便于后续分析

## 故障排查

### 常见问题

1. **调试器无法连接**
   - 检查端口是否被占用
   - 确认 Node.js 版本支持 --inspect
   - 重启 VS Code

2. **前端断点不生效**
   - 确认源码映射已启用
   - 检查 webRoot 配置
   - 清除浏览器缓存

3. **日志文件未生成**
   - 检查目录权限
   - 确认日志级别配置
   - 查看控制台错误信息

### 性能优化

1. **日志性能**
   - 生产环境减少日志输出
   - 使用异步日志写入
   - 定期清理旧日志文件

2. **调试性能**
   - 仅在需要时启用调试
   - 避免在循环中设置断点
   - 使用条件断点

## 扩展功能

### 日志分析
- 可以集成 ELK Stack 进行日志分析
- 支持日志聚合和可视化
- 实时监控和告警

### 远程调试
- 支持远程服务器调试
- 可以配置 SSH 隧道
- 支持容器化环境调试