import express from 'express';
const router = express.Router();
import * as llmController from '../controllers/llmController.js';

// LLM对话相关路由

// 申请一次对话
router.post('/conversation/set', llmController.setConversation);

// 批量删除对话
router.post('/conversation/rm', llmController.removeConversations);

// 获取对话列表
router.get('/conversation/list', llmController.getConversations);

// 获取对话详情
router.get('/conversation/get', llmController.getConversation);

export default router;
