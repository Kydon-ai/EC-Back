import Message from '../models/Message.js';
import Conversation from '../models/Conversation.js';
import { generateLLMResponse } from '../services/llmService.js';
import { setConversationToRagflow, removeConversationsFromRagflow, getConversationsFromRagflow, getConversationFromRagflow } from '../services/ragflow/ragflowService.js';
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

// 获取对话列表
const getConversations = async (req, res) => {
  try {
    let dialog_id = process.env.RAGFLOW_DAILOGE_ID
    // 调用RAGFlow的获取对话列表接口
    const response = await getConversationsFromRagflow(dialog_id);

    // 如果RAGFlow返回成功
    if (response.code === 0 && response.data) {
      // 将对话信息存储到本地数据库
      const conversations = response.data;

      // 批量处理对话数据
      for (const conv of conversations) {
        try {
          // 检查对话是否已存在
          const existingConversation = await Conversation.findOne({ id: conv.id });

          // 准备要存储的数据
          const conversationData = {
            id: conv.id,
            name: conv.name,
            dialog_id: conv.dialog_id,
            user_id: conv.user_id,
            create_time: conv.create_time,
            update_time: conv.update_time,
            create_date: conv.create_date,
            update_date: conv.update_date,
            message_count: conv.message?.length || 0,
            reference_count: conv.reference?.length || 0
          };

          if (existingConversation) {
            // 更新现有对话
            await Conversation.updateOne({ id: conv.id }, conversationData);
          } else {
            // 创建新对话
            await Conversation.create(conversationData);
          }

          // 如果有消息，也存储到Message模型
          if (conv.message && conv.message.length > 0) {
            for (const msg of conv.message) {
              // 检查消息是否已存在（基于conversationId、role和content）
              const existingMessage = await Message.findOne({
                conversationId: conv.id,
                role: msg.role,
                content: msg.content
              });

              if (!existingMessage) {
                await Message.create({
                  conversationId: conv.id,
                  role: msg.role,
                  content: msg.content,
                  metadata: { reference: msg.reference || [] }
                });
              }
            }
          }
        } catch (dbError) {
          console.error(`处理对话 ${conv.id} 时出错:`, dbError);
          // 继续处理下一个对话，不中断整个流程
        }
      }

      // 从本地数据库获取精简的对话列表
      const simplifiedConversations = await Conversation.find(
        { dialog_id },
        { create_time: 1, update_time: 1, name: 1, id: 1, _id: 0 }
      ).sort({ update_time: -1 });

      // 返回精简的数据给前端
      res.status(200).json({
        code: 0,
        data: simplifiedConversations,
        message: 'success'
      });
    } else {
      // 如果RAGFlow返回错误，直接返回给前端
      res.status(200).json(response);
    }
  } catch (error) {
    console.error('获取对话列表失败:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// 获取对话详情
const getConversation = async (req, res) => {
  try {
    const { conversation_id } = req.query;

    // 验证必要参数
    if (!conversation_id) {
      return res.status(400).json({
        status: 'error',
        message: 'conversation_id是必需的参数'
      });
    }

    // 调用RAGFlow的获取对话详情接口
    const response = await getConversationFromRagflow(conversation_id);

    // 将结果原封不动地返回给前端
    res.status(200).json(response);
  } catch (error) {
    console.error('获取对话详情失败:', error);
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
  removeConversations,
  getConversations,
  getConversation
};