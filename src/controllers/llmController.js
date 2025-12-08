import Message from '../models/Message.js';
import { generateLLMResponse } from '../services/llmService.js';
import { setConversationToRagflow, removeConversationsFromRagflow } from '../services/ragflow/ragflowService.js';
import { v4 as uuidv4 } from 'uuid';

// 创建对话
const createConversation = async (req, res) => {
  try {
    const conversationId = uuidv4();
    const initialMessage = req.body.message;

    if (!initialMessage) {
      return res.status(400).json({
        status: 'error',
        message: 'Initial message is required'
      });
    }

    // 保存用户消息
    await Message.create({
      conversationId,
      role: 'user',
      content: initialMessage
    });

    // 生成LLM回复
    const llmResponse = await generateLLMResponse([{
      role: 'user',
      content: initialMessage
    }]);

    // 保存助手回复
    await Message.create({
      conversationId,
      role: 'assistant',
      content: llmResponse
    });

    res.status(200).json({
      status: 'success',
      conversationId,
      response: llmResponse
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// 继续对话
const continueConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { message } = req.body;

    if (!conversationId || !message) {
      return res.status(400).json({
        status: 'error',
        message: 'Conversation ID and message are required'
      });
    }

    // 获取历史消息
    const historyMessages = await Message.find(
      { conversationId },
      { role: 1, content: 1, _id: 0 }
    ).sort({ createdAt: 1 });

    if (historyMessages.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Conversation not found'
      });
    }

    // 保存用户消息
    await Message.create({
      conversationId,
      role: 'user',
      content: message
    });

    // 生成LLM回复
    const updatedHistory = [...historyMessages, { role: 'user', content: message }];
    const llmResponse = await generateLLMResponse(updatedHistory);

    // 保存助手回复
    await Message.create({
      conversationId,
      role: 'assistant',
      content: llmResponse
    });

    res.status(200).json({
      status: 'success',
      conversationId,
      response: llmResponse
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// 获取对话历史
const getConversationHistory = async (req, res) => {
  try {
    const { conversationId } = req.params;

    if (!conversationId) {
      return res.status(400).json({
        status: 'error',
        message: 'Conversation ID is required'
      });
    }

    const messages = await Message.find(
      { conversationId },
      { conversationId: 1, role: 1, content: 1, createdAt: 1 }
    ).sort({ createdAt: 1 });

    if (messages.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Conversation not found'
      });
    }

    res.status(200).json({
      status: 'success',
      conversationId,
      messages
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// 获取用户的所有对话
const getUserConversations = async (req, res) => {
  try {
    // 这里应该根据用户ID获取对话列表
    // 暂时返回所有对话
    const conversations = await Message.aggregate([
      { $group: { _id: '$conversationId', createdAt: { $min: '$createdAt' } } },
      { $sort: { createdAt: -1 } },
      { $project: { conversationId: '$_id', createdAt: 1, _id: 0 } }
    ]);

    res.status(200).json({
      status: 'success',
      conversations
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// 设置对话
const setConversation = async (req, res) => {
  try {
    const { dialog_id, conversation_id, name, user_id } = req.body;

    // 验证必要参数
    if (!dialog_id || !conversation_id || !name) {
      return res.status(400).json({
        status: 'error',
        message: 'dialog_id、conversation_id、name和content是必需的'
      });
    }

    // 调用RAGFlow的设置对话接口
    const response = await setConversationToRagflow({
      dialog_id,
      conversation_id,
      name,
      user_id
    });

    res.status(200).json({
      status: 'success',
      data: response
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// 批量删除对话
const removeConversations = async (req, res) => {
  try {
    const { conversation_ids, dialog_id } = req.body;

    // 验证必要参数
    if (!conversation_ids || !Array.isArray(conversation_ids) || conversation_ids.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'conversation_ids必须是一个非空数组'
      });
    }

    // 调用RAGFlow的批量删除对话接口
    const response = await removeConversationsFromRagflow({
      conversation_ids,
      dialog_id: dialog_id ? dialog_id : '' // 如果没有提供dialog_id，使用空字符串
    });

    res.status(200).json({
      status: 'success',
      data: response
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

export {
  createConversation,
  continueConversation,
  getConversationHistory,
  getUserConversations,
  setConversation,
  removeConversations
};