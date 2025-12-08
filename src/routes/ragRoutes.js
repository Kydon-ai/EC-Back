import express from 'express';
const router = express.Router();
import * as ragController from '../controllers/ragController.js';
import { validateAddDocument, validateSearchRequest } from '../middleware/validation.js';

// RAG服务相关路由
// 添加文档
// router.post('/documents', validateAddDocument, ragController.addDocument);

// // 搜索文档
// router.post('/documents/search', validateSearchRequest, ragController.searchDocuments);

// // 基于检索增强生成
// router.post('/rag/generate', validateSearchRequest, ragController.generateRAGResponse);

// // 获取文档详情
// router.get('/documents/:id', ragController.getDocument);

// // 删除文档
// router.delete('/documents/:id', ragController.deleteDocument);

// 基于RAG的SSE回答
router.post('/conversation/completion', ragController.generateRAGSSEResponse);

export default router;