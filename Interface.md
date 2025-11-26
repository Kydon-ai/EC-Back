# API接口文档

## LLM对话服务接口

### 创建新对话

```
POST /api/llm/conversations
```

**请求体**：
```json
{
  "message": "你的问题或消息"
}
```

**响应**：
```json
{
  "status": "success",
  "data": {
    "conversationId": "uuid-string",
    "messages": [
      {
        "role": "user",
        "content": "你的问题或消息"
      },
      {
        "role": "assistant",
        "content": "助手回复"
      }
    ],
    "createdAt": "2023-11-14T12:34:56Z"
  }
}
```

### 继续现有对话

```
POST /api/llm/conversations/:conversationId/messages
```

**请求体**：
```json
{
  "message": "继续对话的消息"
}
```

**响应**：
```json
{
  "status": "success",
  "data": {
    "conversationId": "uuid-string",
    "messages": [
      // 完整的对话历史
    ],
    "updatedAt": "2023-11-14T12:36:42Z"
  }
}
```

### 获取对话历史

```
GET /api/llm/conversations/:conversationId
```

**响应**：
```json
{
  "status": "success",
  "data": {
    "conversationId": "uuid-string",
    "messages": [
      // 对话历史记录
    ],
    "createdAt": "2023-11-14T12:34:56Z",
    "updatedAt": "2023-11-14T12:36:42Z"
  }
}
```

### 获取所有对话

```
GET /api/llm/conversations
```

**响应**：
```json
{
  "status": "success",
  "data": [
    {
      "conversationId": "uuid-string",
      "lastMessage": "最新消息内容",
      "createdAt": "2023-11-14T12:34:56Z",
      "updatedAt": "2023-11-14T12:36:42Z"
    },
    // 更多对话列表
  ],
  "total": 10
}
```

## RAG服务接口

### 添加文档

```
POST /api/rag/documents
```

**请求体**：
```json
{
  "title": "文档标题",
  "content": "文档内容",
  "metadata": { /* 可选的元数据 */ },
  "tags": ["标签1", "标签2"]
}
```

**响应**：
```json
{
  "status": "success",
  "data": {
    "id": "document-id",
    "title": "文档标题",
    "content": "文档内容摘要...",
    "metadata": { /* 元数据 */ },
    "tags": ["标签1", "标签2"],
    "createdAt": "2023-11-14T12:40:00Z"
  }
}
```

### 搜索文档

```
POST /api/rag/documents/search
```

**请求体**：
```json
{
  "query": "搜索关键词",
  "limit": 5
}
```

**响应**：
```json
{
  "status": "success",
  "data": [
    {
      "id": "document-id",
      "title": "文档标题",
      "content": "文档内容摘要...",
      "score": 0.85,
      "metadata": { /* 元数据 */ }
    },
    // 更多匹配文档
  ],
  "total": 3
}
```

### 基于检索增强生成

```
POST /api/rag/generate
```

**请求体**：
```json
{
  "query": "你的问题",
  "contextLimit": 5
}
```

**响应**：
```json
{
  "status": "success",
  "data": {
    "response": "基于检索内容生成的回答",
    "contexts": [
      {
        "id": "document-id",
        "title": "相关文档标题",
        "content": "相关文档内容摘要..."
      }
    ],
    "generatedAt": "2023-11-14T12:45:00Z"
  }
}
```
