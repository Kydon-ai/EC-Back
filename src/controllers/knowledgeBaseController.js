import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import {
	uploadDocumentToRagflow,
	removeDocumentFromRagflow,
	createKnowledgeBaseToRagflow,
	removeKnowledgeBaseFromRagflow,
} from '../services/ragflow/ragflowService.js';
import KnowledgeBase from '../models/KnowledgeBase.js';
import Document from '../models/Document.js';
import { generateEmbedding } from '../services/ragService.js';

/* 
创建知识库
默认嵌入模型：quentinz/bge-large-zh-v1.5:latest
默认实体类型：organization 、person 、geo 、event 、category
默认内置解析方法：General
 */
const createKnowledgeBase = async (req, res) => {
	try {
		const { name, description, metadata } = req.body;

		if (!name) {
			return res.status(400).json({
				status: 'error',
				message: 'Name is required',
			});
		}

		// 调用RAGFlow创建知识库
		const ragflowResponse = await createKnowledgeBaseToRagflow(name);
		console.log('查看ragflowResponse：', ragflowResponse);
		// 获取RAGFlow返回的知识库ID
		const dataset_id = ragflowResponse.data.kb_id;

		// 检查dataset_id是否已存在（理论上不应该存在，因为是RAGFlow新生成的）
		const existingKB = await KnowledgeBase.findOne({ dataset_id });
		if (existingKB) {
			return res.status(400).json({
				status: 'error',
				message: 'Knowledge base with this dataset_id already exists',
			});
		}

		const knowledgeBase = await KnowledgeBase.create({
			dataset_id,
			name,
			description,
			metadata,
			status: 'active', // 显式设置为活跃状态
		});

		res.status(201).json({
			status: 'success',
			knowledgeBase,
		});
	} catch (error) {
		res.status(500).json({
			status: 'error',
			message: error.message,
		});
	}
};

// 获取所有知识库
const getAllKnowledgeBases = async (req, res) => {
	try {
		const { active } = req.query;
		let query = {};

		// 如果提供了active查询参数，根据其值构建查询条件
		if (active !== undefined) {
			query.status = active;
		}

		const knowledgeBases = await KnowledgeBase.find(query).sort({
			createdAt: -1,
		});

		res.status(200).json({
			status: 'success',
			knowledgeBases,
		});
	} catch (error) {
		res.status(500).json({
			status: 'error',
			message: error.message,
		});
	}
};

// 获取单个知识库
const getKnowledgeBase = async (req, res) => {
	try {
		const { id } = req.params;
		// 使用dataset_id查询知识库
		const knowledgeBase = await KnowledgeBase.findOne({ dataset_id: id });

		if (!knowledgeBase) {
			return res.status(404).json({
				status: 'error',
				message: 'Knowledge base not found',
			});
		}

		res.status(200).json({
			status: 'success',
			knowledgeBase,
		});
	} catch (error) {
		res.status(500).json({
			status: 'error',
			message: error.message,
		});
	}
};

// 根据dataset_id获取知识库
const getKnowledgeBaseByDatasetId = async (req, res) => {
	try {
		const { dataset_id } = req.params;

		const knowledgeBase = await KnowledgeBase.findOne({ dataset_id });
		if (!knowledgeBase) {
			return res.status(404).json({
				status: 'error',
				message: 'Knowledge base not found',
			});
		}

		res.status(200).json({
			status: 'success',
			knowledgeBase,
		});
	} catch (error) {
		res.status(500).json({
			status: 'error',
			message: error.message,
		});
	}
};

// 更新知识库
const updateKnowledgeBase = async (req, res) => {
	try {
		const { id } = req.params;
		const { name, description, metadata } = req.body;

		// 使用dataset_id查询知识库
		const query = { dataset_id: id };

		const knowledgeBase = await KnowledgeBase.findOneAndUpdate(
			query,
			{ name, description, metadata, updatedAt: Date.now() },
			{ new: true, runValidators: true }
		);

		if (!knowledgeBase) {
			return res.status(404).json({
				status: 'error',
				message: 'Knowledge base not found',
			});
		}

		res.status(200).json({
			status: 'success',
			knowledgeBase,
		});
	} catch (error) {
		res.status(500).json({
			status: 'error',
			message: error.message,
		});
	}
};

// 删除知识库
const deleteKnowledgeBase = async (req, res) => {
	try {
		const { id } = req.params;
		// 使用dataset_id查询知识库
		const query = { dataset_id: id };

		// 查询知识库
		const knowledgeBase = await KnowledgeBase.findOne(query);
		if (!knowledgeBase) {
			return res.status(404).json({
				status: 'error',
				message: 'Knowledge base not found',
			});
		}

		// 调用RAGFlow API删除知识库
		await removeKnowledgeBaseFromRagflow(id);

		// 将本地知识库标记为失效，而不是直接删除
		knowledgeBase.status = 'inactive';
		await knowledgeBase.save();

		// 更新所有关联文档，移除knowledgeBaseId
		await Document.updateMany(
			{ knowledgeBaseId: knowledgeBase._id },
			{ knowledgeBaseId: null }
		);

		res.status(200).json({
			status: 'success',
			message:
				'Knowledge base marked as inactive and deleted from RAGFlow',
		});
	} catch (error) {
		res.status(500).json({
			status: 'error',
			message: error.message,
		});
	}
};

// 为知识库添加文档

const addDocumentToKnowledgeBase = async (req, res) => {
	try {
		const { knowledgeBaseId } = req.params;
		let { title, metadata, tags } = req.body;
		let content = req.body.content;

		// 验证知识库是否存在
		const knowledgeBase = await KnowledgeBase.findOne({
			dataset_id: knowledgeBaseId,
		});

		if (!knowledgeBase) {
			return res.status(404).json({
				status: 'error',
				message: 'Knowledge base not found',
			});
		}

		// 如果有上传的文件，处理文件信息
		if (req.file) {
			// 如果没有提供标题，使用文件名作为标题
			if (!title) {
				title = req.file.originalname.replace(/\.[^/.]+$/, ''); // 移除文件扩展名
			}
		}

		if (!title) {
			return res.status(400).json({
				status: 'error',
				message: 'Title is required',
			});
		}

		// 先上传到RAGFlow
		if (!req.file) {
			return res.status(400).json({
				status: 'error',
				message: 'File is required for RAGFlow processing',
			});
		}

		// 调用RAGFlow上传文档
		const ragflowResponse = await uploadDocumentToRagflow(
			req.file,
			knowledgeBaseId
		);
		console.log('查看响应数据：', ragflowResponse);
		// 获取RAGFlow返回的文档ID
		const ragflowDocumentId = ragflowResponse.data[0].id;

		// 调用文档解析接口
		try {
			const runResponse = await axios.post(
				'http://172.31.136.239:3055/v1/document/run',
				{
					doc_ids: [ragflowDocumentId],
					run: 1,
					delete: false,
				},
				{
					headers: {
						Authorization: process.env.RAGFLOW_API_KEY,
						'Content-Type': 'application/json;charset=UTF-8',
					},
				}
			);
			console.log('文档解析接口调用成功：', runResponse.data);
		} catch (runError) {
			console.error(
				'文档解析接口调用失败:',
				runError.response?.data || runError.message
			);
			// 解析失败不影响上传结果，继续返回上传成功
		}

		// 创建文档（使用RAGFlow返回的ID作为UUID，不包含内容和嵌入，由RAGFlow后续解析）
		const document = await Document.create({
			uuid: ragflowDocumentId,
			title,
			metadata: metadata || '{}',
			tags: tags || [],
			knowledgeBaseId: knowledgeBaseId,
		});

		// 更新知识库文档计数
		await KnowledgeBase.findOneAndUpdate(
			{ dataset_id: knowledgeBaseId },
			{ $inc: { documentCount: 1 }, updatedAt: Date.now() }
		);

		res.status(201).json({
			status: 'success',
			document: {
				id: document._id,
				uuid: document.uuid,
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

// 获取知识库中的文档
const getDocumentsInKnowledgeBase = async (req, res) => {
	try {
		const { knowledgeBaseId } = req.params;
		const { page = 1, limit = 10, tags } = req.query;

		// 验证知识库是否存在
		const knowledgeBase = await KnowledgeBase.findOne({
			dataset_id: knowledgeBaseId,
		});
		if (!knowledgeBase) {
			return res.status(404).json({
				status: 'error',
				message: 'Knowledge base not found',
			});
		}

		// 构建查询条件
		const query = { knowledgeBaseId };
		if (tags) {
			query.tags = { $in: tags.split(',') };
		}

		// 分页查询
		const skip = (page - 1) * limit;
		const documents = await Document.find(query)
			.skip(skip)
			.limit(parseInt(limit))
			.sort({ createdAt: -1 });

		const totalDocuments = await Document.countDocuments(query);

		res.status(200).json({
			status: 'success',
			total: totalDocuments,
			page: parseInt(page),
			limit: parseInt(limit),
			totalPages: Math.ceil(totalDocuments / limit),
			documents: documents.map(doc => ({
				id: doc._id,
				uuid: doc.uuid,
				title: doc.title,
				content: doc.content.substring(0, 200) + '...',
				tags: doc.tags,
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

// 从知识库中移除文档
const removeDocumentFromKnowledgeBase = async (req, res) => {
	try {
		const { knowledgeBaseId, documentId } = req.params;

		// 验证知识库是否存在
		const knowledgeBase = await KnowledgeBase.findOne({
			dataset_id: knowledgeBaseId,
		});
		if (!knowledgeBase) {
			return res.status(404).json({
				status: 'error',
				message: 'Knowledge base not found',
			});
		}

		// 验证文档是否存在且属于该知识库
		const document = await Document.findOne({
			uuid: documentId,
			knowledgeBaseId,
		});

		if (!document) {
			return res.status(404).json({
				status: 'error',
				message: 'Document not found in this knowledge base',
			});
		}

		// 先从RAGFlow中删除文档
		await removeDocumentFromRagflow([documentId]);

		// 移除文档的知识库关联
		await Document.findOneAndUpdate(
			{ uuid: documentId },
			{ knowledgeBaseId: null }
		);

		// 更新知识库文档计数
		await KnowledgeBase.findOneAndUpdate(
			{ dataset_id: knowledgeBaseId },
			{ $inc: { documentCount: -1 }, updatedAt: Date.now() }
		);

		res.status(200).json({
			status: 'success',
			message: 'Document removed from knowledge base successfully',
		});
	} catch (error) {
		res.status(500).json({
			status: 'error',
			message: error.message,
		});
	}
};

// 批量上传文件到知识库
const batchUploadToKnowledgeBase = async (req, res) => {
	try {
		const { knowledgeBaseId } = req.params;
		const files = req.files;

		// 验证知识库是否存在
		const knowledgeBase = await KnowledgeBase.findOne({
			dataset_id: knowledgeBaseId,
		});

		if (!knowledgeBase) {
			return res.status(404).json({
				status: 'error',
				message: 'Knowledge base not found',
			});
		}

		if (!files || !Array.isArray(files) || files.length === 0) {
			return res.status(400).json({
				status: 'error',
				message: 'Files array is required and must not be empty',
			});
		}

		const uploadedDocuments = [];
		const errors = [];

		for (const file of files) {
			try {
				// 使用文件名作为标题
				const title = file.originalname.replace(/\.[^/.]+$/, ''); // 移除文件扩展名

				// 保存文件信息到元数据
				const metadata = {
					filename: file.originalname,
					mimetype: file.mimetype,
					fileSize: file.size,
				};

				// 先上传到RAGFlow
				const ragflowResponse = await uploadDocumentToRagflow(
					file,
					knowledgeBaseId
				);

				// 获取RAGFlow返回的文档ID
				const ragflowDocumentId = ragflowResponse.data.data[0].id;

				// 调用文档解析接口
				try {
					const runResponse = await axios.post(
						'http://172.31.136.239:3055/v1/document/run',
						{
							doc_ids: [ragflowDocumentId],
							run: 1,
							delete: false,
						},
						{
							headers: {
								Authorization: process.env.RAGFLOW_API_KEY,
								'Content-Type':
									'application/json;charset=UTF-8',
							},
						}
					);
					console.log('文档解析接口调用成功：', runResponse.data);
				} catch (runError) {
					console.error(
						'文档解析接口调用失败:',
						runError.response?.data || runError.message
					);
					// 解析失败不影响上传结果，继续返回上传成功
				}

				// 创建文档（使用RAGFlow返回的ID作为UUID，不包含内容和嵌入，由RAGFlow后续解析）
				const document = await Document.create({
					uuid: ragflowDocumentId,
					title,
					metadata,
					knowledgeBaseId: knowledgeBaseId,
				});

				uploadedDocuments.push({
					id: document._id,
					uuid: document.uuid,
					title: document.title,
					createdAt: document.createdAt,
				});
			} catch (error) {
				errors.push({
					file: file.originalname || 'unknown',
					error: error.message,
				});
			}
		}

		// 更新知识库文档计数
		if (uploadedDocuments.length > 0) {
			await KnowledgeBase.findOneAndUpdate(
				{ dataset_id: knowledgeBaseId },
				{
					$inc: { documentCount: uploadedDocuments.length },
					updatedAt: Date.now(),
				}
			);
		}

		res.status(201).json({
			status: 'success',
			uploaded: uploadedDocuments.length,
			failed: errors.length,
			documents: uploadedDocuments,
			errors: errors,
		});
	} catch (error) {
		res.status(500).json({
			status: 'error',
			message: error.message,
		});
	}
};

export {
	createKnowledgeBase,
	getAllKnowledgeBases,
	getKnowledgeBase,
	getKnowledgeBaseByDatasetId,
	updateKnowledgeBase,
	deleteKnowledgeBase,
	addDocumentToKnowledgeBase,
	getDocumentsInKnowledgeBase,
	removeDocumentFromKnowledgeBase,
	batchUploadToKnowledgeBase,
};
