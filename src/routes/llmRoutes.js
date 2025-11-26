const express = require('express');
const router = express.Router();
const llmController = require('../controllers/llmController');
const { validateCreateConversation, validateContinueConversation } = require('../middleware/validation');

// LLM对话相关路由
// 创建新对话
router.post('/conversations', validateCreateConversation, llmController.createConversation);

// 继续现有对话
router.post('/conversations/:conversationId/messages', validateContinueConversation, llmController.continueConversation);

// 获取特定对话历史
router.get('/conversations/:conversationId', llmController.getConversationHistory);

// 获取用户所有对话列表
router.get('/conversations', llmController.getUserConversations);

module.exports = router;