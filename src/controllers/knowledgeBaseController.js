import mongoose from 'mongoose';
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
    const { dataset_id, name, description, metadata } = req.body;

    if (!dataset_id || !name) {
      return res.status(400).json({
        status: 'error',
        message: 'Dataset ID and name are required'
      });
    }

    // 检查dataset_id是否已存在
    const existingKB = await KnowledgeBase.findOne({ dataset_id });
    if (existingKB) {
      return res.status(400).json({
        status: 'error',
        message: 'Knowledge base with this dataset_id already exists'
      });
    }

    const knowledgeBase = await KnowledgeBase.create({
      dataset_id,
      name,
      description,
      metadata
    });

    res.status(201).json({
      status: 'success',
      knowledgeBase
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// 获取所有知识库
const getAllKnowledgeBases = async (req, res) => {
  try {
    const knowledgeBases = await KnowledgeBase.find().sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      knowledgeBases
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
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
        message: 'Knowledge base not found'
      });
    }

    res.status(200).json({
      status: 'success',
      knowledgeBase
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
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
        message: 'Knowledge base not found'
      });
    }

    res.status(200).json({
      status: 'success',
      knowledgeBase
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
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
        message: 'Knowledge base not found'
      });
    }

    res.status(200).json({
      status: 'success',
      knowledgeBase
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// 删除知识库
const deleteKnowledgeBase = async (req, res) => {
  try {
    const { id } = req.params;
    // 使用dataset_id查询知识库
    const query = { dataset_id: id };

    // 删除知识库
    const knowledgeBase = await KnowledgeBase.findOneAndDelete(query);
    if (!knowledgeBase) {
      return res.status(404).json({
        status: 'error',
        message: 'Knowledge base not found'
      });
    }

    // 更新所有关联文档，移除knowledgeBaseId
    await Document.updateMany(
      { knowledgeBaseId: knowledgeBase._id },
      { knowledgeBaseId: null }
    );

    res.status(200).json({
      status: 'success',
      message: 'Knowledge base deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
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
    const knowledgeBase = await KnowledgeBase.findOne({ dataset_id: knowledgeBaseId });

    if (!knowledgeBase) {
      return res.status(404).json({
        status: 'error',
        message: 'Knowledge base not found'
      });
    }

    // 如果有上传的文件，处理文件信息
    if (req.file) {
      // 如果没有提供标题，使用文件名作为标题
      if (!title) {
        title = req.file.originalname.replace(/\.[^/.]+$/, ""); // 移除文件扩展名
      }
    }

    if (!title) {
      return res.status(400).json({
        status: 'error',
        message: 'Title is required'
      });
    }

    // 创建文档（不包含内容和嵌入，由RAGFlow后续解析）
    const document = await Document.create({
      title,
      metadata: metadata || "{}",
      tags: tags || [],
      knowledgeBaseId: knowledgeBase._id
    });

    // TODO: 将文件转发到RAGFlow接口进行解析
    // 这里需要根据RAGFlow的API文档配置具体的接口调用
    // 示例：
    // const ragflowResponse = await axios.post('http://ragflow-url/api/documents', {
    //   file: req.file.buffer,
    //   filename: req.file.originalname,
    //   knowledgeBaseId: knowledgeBase._id.toString(),
    //   documentId: document._id.toString()
    // }, {
    //   headers: {
    //     'Content-Type': 'multipart/form-data'
    //   }
    // });

    // 注意：实际实现时需要安装axios依赖：pnpm add axios
    // 并根据RAGFlow接口要求调整请求参数和格式

    // 更新知识库文档计数
    await KnowledgeBase.findByIdAndUpdate(
      knowledgeBase._id,
      { $inc: { documentCount: 1 }, updatedAt: Date.now() }
    );

    res.status(201).json({
      status: 'success',
      document: {
        id: document._id,
        title: document.title,
        createdAt: document.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// 获取知识库中的文档
const getDocumentsInKnowledgeBase = async (req, res) => {
  try {
    const { knowledgeBaseId } = req.params;
    const { page = 1, limit = 10, tags } = req.query;

    // 验证知识库是否存在
    const knowledgeBase = await KnowledgeBase.findOne({ dataset_id: knowledgeBaseId });
    if (!knowledgeBase) {
      return res.status(404).json({
        status: 'error',
        message: 'Knowledge base not found'
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
        title: doc.title,
        content: doc.content.substring(0, 200) + '...',
        tags: doc.tags,
        createdAt: doc.createdAt
      }))
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// 从知识库中移除文档
const removeDocumentFromKnowledgeBase = async (req, res) => {
  try {
    const { knowledgeBaseId, documentId } = req.params;

    // 验证知识库是否存在
    const knowledgeBase = await KnowledgeBase.findOne({ dataset_id: knowledgeBaseId });
    if (!knowledgeBase) {
      return res.status(404).json({
        status: 'error',
        message: 'Knowledge base not found'
      });
    }

    // 验证文档是否存在且属于该知识库
    const document = await Document.findOne({
      _id: documentId,
      knowledgeBaseId
    });

    if (!document) {
      return res.status(404).json({
        status: 'error',
        message: 'Document not found in this knowledge base'
      });
    }

    // 移除文档的知识库关联
    await Document.findByIdAndUpdate(
      documentId,
      { knowledgeBaseId: null }
    );

    // 更新知识库文档计数
    await KnowledgeBase.findOneAndUpdate(
      { dataset_id: knowledgeBaseId },
      { $inc: { documentCount: -1 }, updatedAt: Date.now() }
    );

    res.status(200).json({
      status: 'success',
      message: 'Document removed from knowledge base successfully'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// 批量上传文件到知识库
const batchUploadToKnowledgeBase = async (req, res) => {
  try {
    const { knowledgeBaseId } = req.params;
    const files = req.files;

    // 验证知识库是否存在
    const knowledgeBase = await KnowledgeBase.findOne({ dataset_id: knowledgeBaseId });

    if (!knowledgeBase) {
      return res.status(404).json({
        status: 'error',
        message: 'Knowledge base not found'
      });
    }

    if (!files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Files array is required and must not be empty'
      });
    }

    const uploadedDocuments = [];
    const errors = [];

    for (const file of files) {
      try {
        // 使用文件名作为标题
        const title = file.originalname.replace(/\.[^/.]+$/, ""); // 移除文件扩展名

        // 保存文件信息到元数据
        const metadata = {
          filename: file.originalname,
          mimetype: file.mimetype,
          fileSize: file.size
        };

        // 创建文档（不包含内容和嵌入，由RAGFlow后续解析）
        const document = await Document.create({
          title,
          metadata,
          knowledgeBaseId: knowledgeBase._id
        });

        // TODO: 将文件转发到RAGFlow接口进行解析
        // 这里需要根据RAGFlow的API文档配置具体的接口调用

        uploadedDocuments.push({
          id: document._id,
          title: document.title,
          createdAt: document.createdAt
        });
      } catch (error) {
        errors.push({
          file: file.originalname || 'unknown',
          error: error.message
        });
      }
    }

    // 更新知识库文档计数
    if (uploadedDocuments.length > 0) {
      await KnowledgeBase.findByIdAndUpdate(
        knowledgeBase._id,
        { $inc: { documentCount: uploadedDocuments.length }, updatedAt: Date.now() }
      );
    }

    res.status(201).json({
      status: 'success',
      uploaded: uploadedDocuments.length,
      failed: errors.length,
      documents: uploadedDocuments,
      errors: errors
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
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
  batchUploadToKnowledgeBase
};
