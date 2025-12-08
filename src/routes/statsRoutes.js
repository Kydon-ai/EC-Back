import express from 'express';
import {
  getConversationStats,
  getKnowledgeBaseStats,
  getUserInteractionStats,
  getAllStats
} from '../controllers/statsController.js';

const router = express.Router();

// 对话统计接口
router.get('/conversations', getConversationStats);

// 知识库统计接口
router.get('/knowledge-bases', getKnowledgeBaseStats);

// 用户交互统计接口
router.get('/user-interactions', getUserInteractionStats);

// 综合统计接口
router.get('/all', getAllStats);

export default router;
