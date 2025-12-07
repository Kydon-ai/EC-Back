import express from 'express';
const router = express.Router();
import * as knowledgeBaseController from '../controllers/knowledgeBaseController.js';

// 知识库管理路由

// 创建知识库
router.post('/', knowledgeBaseController.createKnowledgeBase);

// 获取所有知识库
router.get('/', knowledgeBaseController.getAllKnowledgeBases);

// 获取单个知识库
router.get('/:id', knowledgeBaseController.getKnowledgeBase);

// 根据dataset_id获取知识库
router.get('/dataset/:dataset_id', knowledgeBaseController.getKnowledgeBaseByDatasetId);

// 更新知识库
router.put('/:id', knowledgeBaseController.updateKnowledgeBase);

// 删除知识库
router.delete('/:id', knowledgeBaseController.deleteKnowledgeBase);

// 为知识库添加文档
router.post('/:knowledgeBaseId/documents', knowledgeBaseController.addDocumentToKnowledgeBase);

// 获取知识库中的文档
router.get('/:knowledgeBaseId/documents', knowledgeBaseController.getDocumentsInKnowledgeBase);

// 从知识库中移除文档
router.delete('/:knowledgeBaseId/documents/:documentId', knowledgeBaseController.removeDocumentFromKnowledgeBase);

// 批量上传文件到知识库
router.post('/:knowledgeBaseId/batch-upload', knowledgeBaseController.batchUploadToKnowledgeBase);

export default router;
