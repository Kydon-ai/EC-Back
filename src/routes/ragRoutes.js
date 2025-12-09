import express from 'express';
const router = express.Router();
import * as ragController from '../controllers/ragController.js';

// RAG服务相关路由

// 基于RAG的SSE回答
router.post('/conversation/completion', ragController.generateRAGSSEResponse);

export default router;
