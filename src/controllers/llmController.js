import Message from '../models/Message.js';
import Conversation from '../models/Conversation.js';
import { generateLLMResponse } from '../services/llmService.js';
import { getRagflowSSEResponse, setConversationToRagflow, removeConversationsFromRagflow, getConversationsFromRagflow, getConversationFromRagflow } from '../services/ragflow/ragflowService.js';
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
    const { conversation_id, name, user_id } = req.body;

    // 验证必要参数
    if (!conversation_id || !name) {
      return res.status(400).json({
        status: 'error',
        message: 'conversation_id、name是必需的'
      });
    }

    // 调用RAGFlow的设置对话接口
    await setConversationToRagflow({
      dialog_id: process.env.RAGFLOW_DAILOGE_ID,
      conversation_id,
      name,
      user_id
    });

    // 记录用户的最新消息（name作为第一条消息内容）
    const userMessage = {
      role: 'user',
      content: name
    };

    await Conversation.updateOne(
      { id: conversation_id },
      {
        $push: {
          messages: userMessage
        },
        $inc: { message_count: 1 },
        $set: { updatedAt: Date.now() }
      },
      { upsert: false }
    );

    // 设置响应头为SSE格式
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // 调用RAGFlow的SSE接口，name作为对话的第一句message
    const stream = await getRagflowSSEResponse({
      conversation_id,
      messages: [userMessage]
    });

    // 收集AI的回答内容
    let aiResponseContent = '';
    // 缓冲区，用于存储不完整的JSON数据
    let jsonBuffer = '';
    // 存储完整的消息对象
    let completeMessageObject = null;
    // 传输结束标志
    let isTransferComplete = false;

    // 处理流数据
    stream.on('data', (chunk) => {
      try {
        // 将Buffer转换为字符串
        const chunkStr = chunk.toString('utf-8');
        // 将当前数据块添加到缓冲区
        jsonBuffer += chunkStr;
        // 按行分割数据
        const lines = jsonBuffer.split('\n');

        // 处理每一行，但保留最后一行（可能是不完整的）
        for (let i = 0; i < lines.length - 1; i++) {
          let line = lines[i];

          // 跳过空行
          if (!line.trim()) continue;

          // 移除前缀（如果有）
          if (line.startsWith('data:')) {
            line = line.slice(5);
          }

          try {
            // 解析JSON
            const responseData = JSON.parse(line);

            // 保存完整的消息对象
            completeMessageObject = responseData;

            // 将数据转发给前端
            res.write(`data: ${JSON.stringify(responseData)}\n\n`);

            // 检查code是否为0表示成功
            if (responseData.code === 0) {
              const data = responseData.data;

              // 如果data是true，说明是传输结束标志
              if (data === true) {
                // 标记传输结束
                isTransferComplete = true;
                // 立即处理数据库更新并结束响应
                return processDatabaseUpdateAndEndResponse();
              }
              // 如果data不是true且是对象，收集AI的回答
              else if (typeof data === 'object' && data !== null && 'answer' in data) {
                aiResponseContent += data.answer;
              }
            }
          } catch (jsonError) {
            console.error('解析JSON失败:', jsonError, '行内容:', line);
            // 将原始数据转发给前端
            res.write(`data: ${line}\n\n`);
          }
        }

        // 保留最后一行到缓冲区（可能是不完整的JSON）
        jsonBuffer = lines[lines.length - 1];
      } catch (error) {
        console.error('处理流数据失败:', error);
      }
    });

    // 流结束时处理剩余的缓冲区数据
    stream.on('end', async () => {
      try {
        // 如果缓冲区还有数据，尝试处理
        if (jsonBuffer.trim()) {
          let line = jsonBuffer;

          // 移除前缀（如果有）
          if (line.startsWith('data:')) {
            line = line.slice(5);
          }

          try {
            // 解析JSON
            const responseData = JSON.parse(line);

            // 将数据转发给前端
            res.write(`data: ${JSON.stringify(responseData)}\n\n`);

            // 保存完整的消息对象
            completeMessageObject = responseData;

            // 检查code是否为0表示成功
            if (responseData.code === 0) {
              const data = responseData.data;

              // 如果data不是true且是对象，收集AI的回答
              if (data !== true && typeof data === 'object' && data !== null && 'answer' in data) {
                aiResponseContent += data.answer;
              }
              // 检查是否接收到结束标志
              else if (data === true) {
                // 标记传输结束
                isTransferComplete = true;
              }
            }
          } catch (jsonError) {
            console.error('解析剩余JSON数据失败:', jsonError, '内容:', line);
            // 将原始数据转发给前端
            res.write(`data: ${line}\n\n`);
          }
        }

        // 如果没有标记传输结束（前端中断请求），将最后一条合法解析对象发送给前端
        if (!isTransferComplete && completeMessageObject) {
          console.log('前端主动中断请求，发送最后一条合法消息');
        }

        // 无论是否标记传输结束，都需要处理数据库更新（如果有AI回答内容）
        if (aiResponseContent && !isTransferComplete) {
          await processDatabaseUpdate();
        }

        // 结束响应
        res.end();
      } catch (error) {
        console.error('流结束处理失败:', error);
        res.end();
      }
    });

    // 流错误时
    stream.on('error', async (error) => {
      console.error('RAGFlow SSE流错误:', error);
      try {
        await Conversation.updateOne(
          { id: conversation_id },
          {
            $push: {
              messages: {
                role: 'assistant',
                content: '抱歉，服务暂时不可用，请稍后再试。',
                metadata: { error: error.message }
              }
            },
            $inc: { message_count: 1 },
            $set: { updatedAt: Date.now() }
          },
          { upsert: false }
        );
      } catch (logError) {
        console.error('记录错误消息失败:', logError);
      }
      res.status(500).write(`data: ${JSON.stringify({ code: -1, message: 'SSE流错误' })}\n\n`);
      res.end();
    });

    // 客户端断开连接时
    req.on('close', () => {
      console.log('客户端断开连接');
      stream.destroy();
      res.end();
    });

    // 处理数据库更新和结束响应的函数
    async function processDatabaseUpdateAndEndResponse() {
      try {
        await processDatabaseUpdate();
        res.end();
      } catch (error) {
        console.error('处理数据库更新和结束响应失败:', error);
        res.end();
      }
    }

    // 处理数据库更新的函数
    async function processDatabaseUpdate() {
      if (aiResponseContent) {
        // 使用流中解析到的完整消息对象来更新数据库
        let referenceData = [];
        let updateTime = Date.now();
        let updateDate = new Date().toISOString().split('T')[0];

        // 如果有完整消息对象，提取reference和时间信息
        if (completeMessageObject && completeMessageObject.code === 0 && completeMessageObject.data) {
          const data = completeMessageObject.data;
          if (data.reference && Array.isArray(data.reference)) {
            referenceData = data.reference;
          }
          if (data.update_time) {
            updateTime = data.update_time;
          }
          if (data.update_date) {
            updateDate = data.update_date;
          }
        }

        // 准备更新数据
        const updateData = {
          update_time: updateTime,
          update_date: updateDate,
          updatedAt: Date.now()
        };

        // 更新对话信息
        await Conversation.updateOne(
          { id: conversation_id },
          {
            $set: updateData,
            $push: {
              messages: {
                role: 'assistant',
                content: aiResponseContent,
                reference: referenceData
              }
            },
            $inc: { message_count: 1, reference_count: referenceData.length }
          },
          { upsert: false }
        );
      }
    }
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

    // 删除本地的对话记录和相关消息
    await Promise.all([
      // 删除本地对话记录
      Conversation.deleteMany({ id: { $in: conversation_ids } }),
      // 删除与这些对话相关的所有消息
      Message.deleteMany({ conversationId: { $in: conversation_ids } })
    ]);

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