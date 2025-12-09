import Document from '../models/Document.js';
import KnowledgeBase from '../models/KnowledgeBase.js';
import {
	generateEmbedding,
	searchSimilarDocuments,
} from '../services/ragService.js';
import { generateLLMResponse } from '../services/llmService.js';
import {
	getRagflowSSEResponse,
	getConversationFromRagflow,
} from '../services/ragflow/ragflowService.js';
import Conversation from '../models/Conversation.js';
import QuestionCount from '../models/QuestionCount.js';

// 添加文档
const addDocument = async (req, res) => {
	try {
		const { title, content, metadata, tags, knowledgeBaseId } = req.body;

		if (!title || !content) {
			return res.status(400).json({
				status: 'error',
				message: 'Title and content are required',
			});
		}

		// 验证知识库是否存在（如果提供了knowledgeBaseId）
		if (knowledgeBaseId) {
			const knowledgeBase = await KnowledgeBase.findOne({
				dataset_id: knowledgeBaseId,
			});
			if (!knowledgeBase) {
				return res.status(404).json({
					status: 'error',
					message: 'Knowledge base not found',
				});
			}
		}

		// 生成文档嵌入（模拟）
		const embedding = await generateEmbedding(content);

		const document = await Document.create({
			title,
			content,
			metadata: metadata || {},
			tags: tags || [],
			embedding,
			knowledgeBaseId,
		});

		// 更新知识库文档计数（如果提供了knowledgeBaseId）
		if (knowledgeBaseId) {
			await KnowledgeBase.findOneAndUpdate(
				{ dataset_id: knowledgeBaseId },
				{ $inc: { documentCount: 1 }, updatedAt: Date.now() }
			);
		}

		res.status(201).json({
			status: 'success',
			document: {
				id: document._id,
				title: document.title,
				createdAt: document.createdAt,
			},
		});
	} catch (error) {
		res.status(500).json({
			status: 'error',
			message: error.message,
		});
	}
};

// 搜索文档
const searchDocuments = async (req, res) => {
	try {
		const { query, limit = 5, tags } = req.body;

		if (!query) {
			return res.status(400).json({
				status: 'error',
				message: 'Search query is required',
			});
		}

		// 搜索相似文档
		const documents = await searchSimilarDocuments(query, limit, tags);

		res.status(200).json({
			status: 'success',
			documents: documents.map(doc => ({
				id: doc._id,
				title: doc.title,
				content: doc.content.substring(0, 200) + '...',
				score: doc.score,
				createdAt: doc.createdAt,
			})),
		});
	} catch (error) {
		res.status(500).json({
			status: 'error',
			message: error.message,
		});
	}
};

// 基于检索增强生成
const generateRAGResponse = async (req, res) => {
	try {
		const { query, limit = 3 } = req.body;

		if (!query) {
			return res.status(400).json({
				status: 'error',
				message: 'Query is required',
			});
		}

		// 搜索相关文档
		const relevantDocs = await searchSimilarDocuments(query, limit);

		if (relevantDocs.length === 0) {
			// 如果没有找到相关文档，直接返回LLM回答
			const llmResponse = await generateLLMResponse([
				{
					role: 'user',
					content: query,
				},
			]);

			return res.status(200).json({
				status: 'success',
				response: llmResponse,
				sources: [],
			});
		}

		// 构建提示，包含检索到的文档
		const context = relevantDocs
			.map(doc => `Document: ${doc.title}\nContent: ${doc.content}`)
			.join('\n\n');
		const prompt = `Based on the following documents, please answer the question:\n\n${context}\n\nQuestion: ${query}\nAnswer:`;

		// 生成LLM回复
		const llmResponse = await generateLLMResponse([
			{
				role: 'user',
				content: prompt,
			},
		]);

		res.status(200).json({
			status: 'success',
			response: llmResponse,
			sources: relevantDocs.map(doc => ({
				id: doc._id,
				title: doc.title,
			})),
		});
	} catch (error) {
		res.status(500).json({
			status: 'error',
			message: error.message,
		});
	}
};

// 基于RAG的SSE回答（转发RAGFlow的SSE响应）
const generateRAGSSEResponse = async (req, res) => {
	try {
		const { conversation_id, messages } = req.body;

		if (!conversation_id || !messages || !Array.isArray(messages)) {
			return res.status(400).json({
				status: 'error',
				message: 'conversation_id和messages（数组）是必需的',
			});
		}

		// 记录用户的最新消息
		const userMessage = messages[messages.length - 1];
		if (userMessage.role === 'user') {
			await Conversation.updateOne(
				{ id: conversation_id },
				{
					$push: {
						messages: {
							role: userMessage.role,
							content: userMessage.content,
						},
					},
					$inc: { message_count: 1 },
					$set: { updatedAt: Date.now() },
				},
				{ upsert: false }
			);

			// 更新问题计数
			await QuestionCount.updateOne(
				{ question: userMessage.content },
				{
					$inc: { count: 1 },
					$set: { lastAskedAt: Date.now(), updatedAt: Date.now() },
				},
				{ upsert: true }
			);
		}

		// 设置响应头为SSE格式
		res.setHeader('Content-Type', 'text/event-stream');
		res.setHeader('Cache-Control', 'no-cache');
		res.setHeader('Connection', 'keep-alive');
		res.flushHeaders();

		// 调用RAGFlow的SSE接口
		const stream = await getRagflowSSEResponse({
			conversation_id,
			messages,
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
		stream.on('data', chunk => {
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
							else if (
								typeof data === 'object' &&
								data !== null &&
								'answer' in data
							) {
								aiResponseContent += data.answer;
							}
						}
					} catch (jsonError) {
						console.error(
							'解析JSON失败:',
							jsonError,
							'行内容:',
							line
						);
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
							if (
								data !== true &&
								typeof data === 'object' &&
								data !== null &&
								'answer' in data
							) {
								aiResponseContent += data.answer;
							}
							// 检查是否接收到结束标志
							else if (data === true) {
								// 标记传输结束
								isTransferComplete = true;
							}
						}
					} catch (jsonError) {
						console.error(
							'解析剩余JSON数据失败:',
							jsonError,
							'内容:',
							line
						);
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

		// 流结束时的处理逻辑已在上边的on('end')事件中实现

		// 流错误时
		stream.on('error', async error => {
			console.error('RAGFlow SSE流错误:', error);
			try {
				await Conversation.updateOne(
					{ id: conversation_id },
					{
						$push: {
							messages: {
								role: 'assistant',
								content: '抱歉，服务暂时不可用，请稍后再试。',
								metadata: { error: error.message },
							},
						},
						$inc: { message_count: 1 },
						$set: { updatedAt: Date.now() },
					},
					{ upsert: false }
				);
			} catch (logError) {
				console.error('记录错误消息失败:', logError);
			}
			res.status(500).write(
				`data: ${JSON.stringify({ code: -1, message: 'SSE流错误' })}\n\n`
			);
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
				if (
					completeMessageObject &&
					completeMessageObject.code === 0 &&
					completeMessageObject.data
				) {
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
					updatedAt: Date.now(),
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
								reference: referenceData,
							},
						},
						$inc: {
							message_count: 1,
							reference_count: referenceData.length,
						},
					},
					{ upsert: false }
				);

				// 检查是否为零命中回答
				if (aiResponseContent.includes('未找到')) {
					await QuestionCount.updateOne(
						{ question: userMessage.content },
						{
							$inc: { zeroHitCount: 1 },
							$set: { updatedAt: Date.now() },
						},
						{ upsert: true }
					);
				}
			}
		}
	} catch (error) {
		console.error('SSE请求处理失败:', error);
		res.status(500).json({
			status: 'error',
			message: error.message,
		});
	}
};

// 获取文档详情
const getDocument = async (req, res) => {
	try {
		const { id } = req.params;

		const document = await Document.findById(id);

		if (!document) {
			return res.status(404).json({
				status: 'error',
				message: 'Document not found',
			});
		}

		res.status(200).json({
			status: 'success',
			document,
		});
	} catch (error) {
		res.status(500).json({
			status: 'error',
			message: error.message,
		});
	}
};

// 删除文档
const deleteDocument = async (req, res) => {
	try {
		const { id } = req.params;

		const document = await Document.findByIdAndDelete(id);

		if (!document) {
			return res.status(404).json({
				status: 'error',
				message: 'Document not found',
			});
		}

		res.status(200).json({
			status: 'success',
			message: 'Document deleted successfully',
		});
	} catch (error) {
		res.status(500).json({
			status: 'error',
			message: error.message,
		});
	}
};

export {
	addDocument,
	searchDocuments,
	generateRAGResponse,
	generateRAGSSEResponse,
	getDocument,
	deleteDocument,
};
