# 代码风格规范文档

## 1. 项目结构

项目采用模块化结构，按功能划分为以下主要目录：

- `src/controllers/` - 控制器层，处理HTTP请求和响应
- `src/models/` - 数据模型层，定义数据库模式
- `src/services/` - 服务层，实现业务逻辑
- `src/routes/` - 路由层，定义API端点
- `src/config/` - 配置文件
- `src/utils/` - 工具函数
- `src/middleware/` - 中间件

## 2. 命名规范

### 2.1 文件命名
- 使用小驼峰命名法
- 文件名应反映其功能或导出内容
- 示例：`llmController.js`、`ragService.js`

### 2.2 变量命名
- 使用小驼峰命名法
- 变量名应具有描述性，避免使用单字母变量（循环计数器除外）
- 示例：`conversationId`、`initialMessage`

### 2.3 常量命名
- 使用全大写字母+下划线分隔
- 示例：`EMBEDDING_LENGTH`,`GOODS_NAME`

### 2.4 函数命名
- 使用小驼峰命名法
- 函数名应反映其功能，使用动词开头
- 示例：`createConversation`、`generateEmbedding`

### 2.5 类命名
- 使用大驼峰命名法
- 示例：`Document`（Mongoose模型类）

## 3. 代码格式

### 3.1 缩进
- 使用1个Tab字符进行缩进

### 3.2 大括号风格
- 使用同一行风格
- 示例：
  ```javascript
  function example() {
    // 代码内容
  }
  ```
  ```typescript
  const example = () => {
    // 代码内容
  }
  ```

### 3.3 分号
- 始终使用分号作为语句结束符

### 3.4 引号
- 字符串字面量和JSON对象中的键和字符串值使用双引号
- 示例：
  ```javascript
  const name = "example";
  const data = { "key": "value" };
  ```


## 4. 注释规范
### 4.1 单行注释
- 使用`//`进行单行注释
- 注释应位于被注释代码的上方或右侧
- 示例：
  ```javascript
  // 生成文本嵌入
  const generateEmbedding = async (text) => {
    // 代码实现
  };
  ```

### 4.2 函数注释
- 关键函数应有简短的功能说明
- 描述函数的作用、参数和返回值

### 4.3 路由注释
- 每个路由应添加注释说明其功能
- 示例：
  ```javascript
  // 创建新对话
  router.post('/conversations', validateCreateConversation, llmController.createConversation);
  ```

## 5. 错误处理

### 5.1 Try/Catch 使用
- 异步操作必须使用try/catch捕获异常
- 示例：
  ```javascript
  try {
    // 异步操作
  } catch (error) {
    // 错误处理
  }
  ```

### 5.2 错误响应
- HTTP错误响应应包含`status`和`message`字段
- 适当的HTTP状态码
- 示例：
  ```javascript
  res.status(400).json({
    status: 'error',
    message: 'Initial message is required'
  });
  ```

## 6. 导入导出

### 6.1 模块导入
- 使用CommonJS的`require`进行模块导入
- 按功能分组导入语句（第三方库、内部模块）
- 示例：
  ```javascript
  const express = require('express');
  const router = express.Router();
  const llmController = require('../controllers/llmController');
  ```

### 6.2 模块导出
- 使用`module.exports`导出模块
- 优先使用对象解构导出多个函数
- 示例：
  ```javascript
  module.exports = {
    generateEmbedding,
    searchSimilarDocuments,
    batchProcessDocuments
  };
  ```

## 7. 代码组织

### 7.1 函数长度
- 函数应保持简短，单一职责
- 长函数应拆分为多个小函数

### 7.2 路由组织
- RESTful API设计模式
- 路由与控制器分离
- 路由路径使用小写和连字符

### 7.3 中间件使用
- 分离关注点（验证、日志、错误处理）
- 使用适当的中间件顺序

## 8. 特殊情况处理

### 8.1 动态导入
- 对于需要避免模块兼容性问题的情况，使用动态导入
- 示例：
  ```javascript
  let uuidv4;
  (async () => {
    const { v4 } = await import('uuid');
    uuidv4 = v4;
  })();
  ```

### 8.2 环境变量
- 使用`.env`文件管理环境变量
- 提供`.env.example`作为模板
- 使用默认值避免环境变量缺失

## 9. 安全最佳实践

### 9.1 输入验证
- 所有用户输入必须经过验证
- 使用中间件进行请求验证

### 9.2 错误信息
- 生产环境不暴露详细的错误堆栈
- 记录详细错误日志用于调试

### 9.3 速率限制
- 实现API请求速率限制防止滥用

## 10. 日志记录

### 10.1 日志级别
- 使用适当的日志级别（info、error、warn）
- 关键操作应有日志记录

### 10.2 日志内容
- 记录有用的上下文信息
- 错误日志包含错误消息和堆栈

---

本规范基于项目现有代码风格制定，旨在保持代码一致性和可维护性。团队成员应遵循这些规范进行开发。