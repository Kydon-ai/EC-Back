import express from 'express';
const router = express.Router();
import * as knowledgeBaseController from '../controllers/knowledgeBaseController.js';
import multer from 'multer';

// 配置multer，使用内存存储
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// 知识库管理路由

// 创建知识库
router.post('/', knowledgeBaseController.createKnowledgeBase);

// 获取所有知识库
router.get('/', knowledgeBaseController.getAllKnowledgeBases);

// 获取单个知识库
router.get('/:id', knowledgeBaseController.getKnowledgeBase);

// 根据dataset_id获取知识库
// router.get('/dataset/:dataset_id', knowledgeBaseController.getKnowledgeBaseByDatasetId);

// 更新知识库
router.put('/:id', knowledgeBaseController.updateKnowledgeBase);

// 删除知识库
router.delete('/:id', knowledgeBaseController.deleteKnowledgeBase);

// 为知识库添加文档——单文档
router.post('/:knowledgeBaseId/documents', upload.single('file'), knowledgeBaseController.addDocumentToKnowledgeBase);
// 批量上传文件到知识库——多文档（有BUG）
router.post('/:knowledgeBaseId/batch-upload', upload.array('files'), knowledgeBaseController.batchUploadToKnowledgeBase);

// 获取知识库中的文档
router.get('/:knowledgeBaseId/documents', knowledgeBaseController.getDocumentsInKnowledgeBase);

// 从知识库中移除文档
router.delete('/:knowledgeBaseId/remove-document/:documentId', knowledgeBaseController.removeDocumentFromKnowledgeBase);


export default router;
