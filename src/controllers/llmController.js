const Message = require('../models/Message');
const { generateLLMResponse } = require('../services/llmService');
const { v4: uuidv4 } = require('uuid');

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
    // 这里可以根据用户ID过滤，目前返回所有对话的ID
    const conversations = await Message.aggregate([
      { $group: { _id: '$conversationId' } },
      { $project: { conversationId: '$_id', _id: 0 } }
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

module.exports = {
  createConversation,
  continueConversation,
  getConversationHistory,
  getUserConversations
};