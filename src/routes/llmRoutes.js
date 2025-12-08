import express from 'express';
const router = express.Router();
import * as llmController from '../controllers/llmController.js';
import { validateCreateConversation, validateContinueConversation } from '../middleware/validation.js';

// LLM对话相关路由
// 创建新对话
router.post('/conversations', validateCreateConversation, llmController.createConversation);

// 继续现有对话
router.post('/conversations/:conversationId/messages', validateContinueConversation, llmController.continueConversation);

// 获取特定对话历史
router.get('/conversations/:conversationId', llmController.getConversationHistory);

// 获取用户所有对话列表
router.get('/conversations', llmController.getUserConversations);

// 申请一次对话
router.post('/conversation/set', llmController.setConversation);

export default router;