# 题库导入系统

一个基于Vue.js + Vant UI + Node.js + Express + MySQL的题库文件解析和导入系统。

## 功能特性

- 📄 **多格式支持**：支持Word文档(.doc/.docx)和压缩包(.zip)格式
- 🔍 **智能解析**：自动识别题目类型（单选、多选、判断、填空、简答）
- 📊 **数据管理**：完整的题目增删查改功能
- 📱 **移动端适配**：基于Vant UI的响应式设计
- 📈 **导入统计**：详细的导入记录和成功率统计
- 🎯 **分类筛选**：按考试名称和题目类型筛选

## 技术栈

### 前端
- Vue.js 3
- Vant UI 4
- Vue Router 4
- Vuex 4
- Axios

### 后端
- Node.js
- Express.js
- MySQL 2
- Multer (文件上传)
- Mammoth (Word文档解析)
- Yauzl (ZIP文件解析)

### 数据库
- MySQL 8.0+

## 项目结构

```
题库导入/
├── client/                 # 前端Vue项目
│   ├── src/
│   │   ├── views/         # 页面组件
│   │   ├── router/        # 路由配置
│   │   ├── store/         # Vuex状态管理
│   │   └── App.vue        # 主组件
│   └── package.json
├── server/                # 后端Express项目
│   └── app.js            # 服务器主文件
├── 题库/                  # 示例题库文件
├── package.json          # 项目依赖
└── README.md
```

## 安装和运行

### 环境要求

- Node.js 16+
- MySQL 8.0+
- npm 或 yarn

### 1. 克隆项目

```bash
git clone <repository-url>
cd 题库导入
```

### 2. 安装依赖

```bash
# 安装根目录依赖
npm install

# 安装前端依赖
cd client
npm install
cd ..
```

### 3. 配置数据库

1. 创建MySQL数据库：
```sql
CREATE DATABASE question_bank CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

2. 修改数据库配置（server/app.js）：
```javascript
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'Pass@word', // 修改为您的MySQL密码
  database: 'Problem-solving System',
  charset: 'utf8mb4'
};
```

### 4. 启动项目

```bash
# 开发模式（同时启动前后端）
npm run dev

# 或者分别启动
# 启动后端服务器
npm run server

# 启动前端开发服务器
npm run client
```

### 5. 访问应用

- 前端地址：http://localhost:8080
- 后端API：http://localhost:3000

## 使用说明

### 1. 文件格式要求

#### Word文档格式示例：
```
1. 这是一道单选题的题目内容？
A. 选项A的内容
B. 选项B的内容
C. 选项C的内容
D. 选项D的内容
答案：A
解析：这里是题目的解析内容

2. 这是一道判断题？
答案：对
解析：判断题的解析
```

#### 支持的题目类型：
- **单选题**：包含A、B、C、D等选项
- **多选题**：题目中包含"多选"关键词
- **判断题**：题目中包含"判断"关键词
- **填空题**：题目中包含"填空"关键词
- **简答题**：题目中包含"简答"或"论述"关键词

### 2. 导入流程

1. 点击"导入题库文件"按钮
2. 选择Word文档或ZIP压缩包
3. 等待文件上传和解析
4. 查看导入结果统计
5. 在题目列表中查看导入的题目

### 3. 题目管理

- **查看题目**：在题目列表页面浏览所有题目
- **筛选题目**：按考试名称和题目类型筛选
- **删除题目**：点击删除按钮移除不需要的题目
- **导入记录**：查看历史导入记录和统计信息

## 数据库结构

### questions表（题目表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT | 主键ID |
| exam_name | VARCHAR(255) | 考试名称 |
| question_type | ENUM | 题目类型 |
| question_text | TEXT | 题目内容 |
| option_a | TEXT | 选项A |
| option_b | TEXT | 选项B |
| option_c | TEXT | 选项C |
| option_d | TEXT | 选项D |
| option_e | TEXT | 选项E |
| correct_answer | TEXT | 正确答案 |
| explanation | TEXT | 解析 |
| difficulty | ENUM | 难度等级 |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

### import_records表（导入记录表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT | 主键ID |
| filename | VARCHAR(255) | 文件名 |
| total_questions | INT | 总题目数 |
| success_count | INT | 成功导入数 |
| error_count | INT | 失败数 |
| status | ENUM | 导入状态 |
| error_message | TEXT | 错误信息 |
| created_at | TIMESTAMP | 创建时间 |

## API接口

### 题目相关
- `GET /api/questions` - 获取所有题目
- `DELETE /api/questions/:id` - 删除指定题目

### 文件上传
- `POST /api/upload` - 上传并解析题库文件

### 导入记录
- `GET /api/import-records` - 获取导入记录

## 开发说明

### 添加新的文件格式支持

1. 在`server/app.js`中的文件处理逻辑中添加新格式的解析代码
2. 更新前端的文件类型限制
3. 测试新格式的解析效果

### 自定义题目解析规则

修改`server/app.js`中的`parseQuestions`函数，调整正则表达式和解析逻辑。

### 扩展题目类型

1. 更新数据库表结构中的`question_type`枚举值
2. 修改前端的题目类型选项
3. 更新解析逻辑以识别新的题目类型

## 常见问题

### Q: 文件上传失败
A: 检查文件格式是否支持，文件大小是否超限，服务器是否正常运行。

### Q: 题目解析不准确
A: 检查Word文档格式是否规范，题目编号、选项、答案格式是否正确。

### Q: 数据库连接失败
A: 检查MySQL服务是否启动，数据库配置是否正确，用户权限是否足够。

### Q: 中文文件名乱码
A: 系统已处理中文文件名编码问题，如仍有问题请检查系统编码设置。

## 贡献指南

1. Fork 本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 更新日志

### v1.0.0
- 初始版本发布
- 支持Word文档和ZIP文件解析
- 完整的前后端功能实现
- 移动端适配
- 导入记录统计