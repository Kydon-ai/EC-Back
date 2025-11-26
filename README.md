# EC-Back

电商项目后端API服务，提供LLM对话和RAG服务支持。

## 项目概述

本项目是一个基于Node.js的后端服务，主要提供以下功能：
- LLM对话服务：支持创建对话、继续对话、获取对话历史等功能
- RAG服务：支持文档管理、文档搜索、基于检索增强生成等功能
- 数据存储：使用MongoDB存储对话记录和文档内容
- 安全防护：集成请求验证、速率限制等安全机制
- 日志记录：完善的错误处理和日志记录系统

## 技术栈

- **Node.js**：JavaScript运行环境
- **Express**：Web应用框架
- **MongoDB**：NoSQL数据库
- **Mongoose**：MongoDB对象建模工具
- **Winston**：日志管理库
- **Express-rate-limit**：请求速率限制
- **CORS**：跨域资源共享
- **Helmet**：安全头部设置
- **Morgan**：HTTP请求日志
- **Dotenv**：环境变量管理

## 安装和运行

### 环境要求

- Node.js 16.x 或更高版本
- pnpm 包管理器
- MongoDB 数据库服务

### 安装步骤

1. 克隆项目仓库

```bash
git clone https://github.com/Kydon-ai/EC-Back.git
cd EC-Back
```

2. 安装依赖

```bash
pnpm install
```

3. 配置环境变量

复制 `.env.example` 文件并命名为 `.env`，根据需要修改配置：

```bash
cp .env.example .env
```

### 启动项目

#### 开发环境

```bash
pnpm dev
```

开发模式下使用nodemon，代码修改后会自动重启服务器。

#### 生产环境

```bash
pnpm start
```


## 项目结构

```
EC-Back/
├── src/
│   ├── config/         # 配置文件
│   │   └── db.js       # 数据库配置
│   ├── controllers/    # 控制器
│   │   ├── llmController.js  # LLM服务控制器
│   │   └── ragController.js  # RAG服务控制器
│   ├── middleware/     # 中间件
│   │   ├── errorHandler.js   # 错误处理
│   │   └── validation.js     # 请求验证
│   ├── models/         # 数据模型
│   │   ├── Message.js  # 消息模型
│   │   └── Document.js # 文档模型
│   ├── routes/         # 路由定义
│   │   ├── llmRoutes.js      # LLM服务路由
│   │   └── ragRoutes.js      # RAG服务路由
│   ├── services/       # 业务逻辑
│   │   ├── llmService.js     # LLM服务
│   │   └── ragService.js     # RAG服务
│   └── utils/          # 工具函数
│       └── logger.js   # 日志工具
├── index.js            # 应用入口
├── start.js            # 启动脚本
├── package.json        # 项目配置
├── .env                # 环境变量
└── README.md           # 项目文档
```

## 日志系统

项目使用Winston进行日志管理，日志文件位于项目根目录下的 `logs/` 文件夹中：

- `app.log`: 应用程序日志
- `error.log`: 错误日志
- `api.log`: API请求日志
- `db.log`: 数据库操作日志
- `exceptions.log`: 未捕获异常日志

可以通过环境变量 `LOG_LEVEL` 设置日志级别（默认：info）。

## 安全措施

- 请求速率限制，防止DDoS攻击
- 输入验证，防止恶意数据
- 安全HTTP头部设置（通过Helmet）
- CORS配置，控制跨域访问
- 错误处理中不暴露敏感信息

## 注意事项

1. 确保MongoDB服务已启动并可访问
2. 在生产环境中，务必修改`.env`文件中的`JWT_SECRET`和其他敏感配置
3. 对于大规模部署，建议配置专业的日志管理系统
4. 当使用实际LLM和Embedding API时，需要在环境变量中配置对应的API密钥

## 许可证

MIT
