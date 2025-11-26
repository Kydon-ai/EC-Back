const express = require('express');
const router = express.Router();
const ragController = require('../controllers/ragController');
const { validateAddDocument, validateSearchRequest } = require('../middleware/validation');

// RAG服务相关路由
// 添加文档
router.post('/documents', validateAddDocument, ragController.addDocument);

// 搜索文档
router.post('/documents/search', validateSearchRequest, ragController.searchDocuments);

// 基于检索增强生成
router.post('/rag/generate', validateSearchRequest, ragController.generateRAGResponse);

// 获取文档详情
router.get('/documents/:id', ragController.getDocument);

// 删除文档
router.delete('/documents/:id', ragController.deleteDocument);

module.exports = router;