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
    let knowledgeBase;

    // 检查是否是有效的ObjectId
    if (mongoose.Types.ObjectId.isValid(id)) {
      // 如果是有效的ObjectId，先尝试用_id查询
      knowledgeBase = await KnowledgeBase.findById(id);
    }

    // 如果没有找到，再尝试用dataset_id查询
    if (!knowledgeBase) {
      knowledgeBase = await KnowledgeBase.findOne({ dataset_id: id });
    }

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
    let query;

    // 检查是否是有效的ObjectId
    if (mongoose.Types.ObjectId.isValid(id)) {
      // 如果是有效的ObjectId，使用_id查询
      query = { _id: id };
    } else {
      // 否则使用dataset_id查询
      query = { dataset_id: id };
    }

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
    let query;
    let knowledgeBaseId;

    // 检查是否是有效的ObjectId
    if (mongoose.Types.ObjectId.isValid(id)) {
      // 如果是有效的ObjectId，使用_id查询
      query = { _id: id };
      knowledgeBaseId = id;
    } else {
      // 否则使用dataset_id查询
      query = { dataset_id: id };
    }

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
    const { title, content, metadata, tags } = req.body;

    // 验证知识库是否存在
    const knowledgeBase = await KnowledgeBase.findById(knowledgeBaseId);
    if (!knowledgeBase) {
      return res.status(404).json({
        status: 'error',
        message: 'Knowledge base not found'
      });
    }

    if (!title || !content) {
      return res.status(400).json({
        status: 'error',
        message: 'Title and content are required'
      });
    }

    // 生成文档嵌入
    const embedding = await generateEmbedding(content);

    // 创建文档
    const document = await Document.create({
      title,
      content,
      metadata: metadata || {},
      tags: tags || [],
      embedding,
      knowledgeBaseId
    });

    // 更新知识库文档计数
    await KnowledgeBase.findByIdAndUpdate(
      knowledgeBaseId,
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
    const knowledgeBase = await KnowledgeBase.findById(knowledgeBaseId);
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
    const knowledgeBase = await KnowledgeBase.findById(knowledgeBaseId);
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
    await KnowledgeBase.findByIdAndUpdate(
      knowledgeBaseId,
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
    const { files } = req.body;

    // 验证知识库是否存在
    const knowledgeBase = await KnowledgeBase.findById(knowledgeBaseId);
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
        const { title, content, metadata, tags } = file;

        if (!title || !content) {
          errors.push({
            file: title || 'unknown',
            error: 'Title and content are required'
          });
          continue;
        }

        // 生成文档嵌入
        const embedding = await generateEmbedding(content);

        // 创建文档
        const document = await Document.create({
          title,
          content,
          metadata: metadata || {},
          tags: tags || [],
          embedding,
          knowledgeBaseId
        });

        uploadedDocuments.push({
          id: document._id,
          title: document.title,
          createdAt: document.createdAt
        });
      } catch (error) {
        errors.push({
          file: file.title || 'unknown',
          error: error.message
        });
      }
    }

    // 更新知识库文档计数
    if (uploadedDocuments.length > 0) {
      await KnowledgeBase.findByIdAndUpdate(
        knowledgeBaseId,
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
