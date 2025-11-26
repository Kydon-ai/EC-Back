const Document = require('../models/Document');
const { generateEmbedding, searchSimilarDocuments } = require('../services/ragService');
const { generateLLMResponse } = require('../services/llmService');

// 添加文档
const addDocument = async (req, res) => {
  try {
    const { title, content, metadata, tags } = req.body;
    
    if (!title || !content) {
      return res.status(400).json({
        status: 'error',
        message: 'Title and content are required'
      });
    }
    
    // 生成文档嵌入（模拟）
    const embedding = await generateEmbedding(content);
    
    const document = await Document.create({
      title,
      content,
      metadata: metadata || {},
      tags: tags || [],
      embedding
    });
    
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

// 搜索文档
const searchDocuments = async (req, res) => {
  try {
    const { query, limit = 5, tags } = req.body;
    
    if (!query) {
      return res.status(400).json({
        status: 'error',
        message: 'Search query is required'
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

// 基于检索增强生成
const generateRAGResponse = async (req, res) => {
  try {
    const { query, limit = 3 } = req.body;
    
    if (!query) {
      return res.status(400).json({
        status: 'error',
        message: 'Query is required'
      });
    }
    
    // 搜索相关文档
    const relevantDocs = await searchSimilarDocuments(query, limit);
    
    if (relevantDocs.length === 0) {
      // 如果没有找到相关文档，直接返回LLM回答
      const llmResponse = await generateLLMResponse([{
        role: 'user',
        content: query
      }]);
      
      return res.status(200).json({
        status: 'success',
        response: llmResponse,
        sources: []
      });
    }
    
    // 构建提示，包含检索到的文档
    const context = relevantDocs.map(doc => `Document: ${doc.title}\nContent: ${doc.content}`).join('\n\n');
    const prompt = `Based on the following documents, please answer the question:\n\n${context}\n\nQuestion: ${query}\nAnswer:`;
    
    // 生成LLM回复
    const llmResponse = await generateLLMResponse([{
      role: 'user',
      content: prompt
    }]);
    
    res.status(200).json({
      status: 'success',
      response: llmResponse,
      sources: relevantDocs.map(doc => ({
        id: doc._id,
        title: doc.title
      }))
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
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
        message: 'Document not found'
      });
    }
    
    res.status(200).json({
      status: 'success',
      document
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
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
        message: 'Document not found'
      });
    }
    
    res.status(200).json({
      status: 'success',
      message: 'Document deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

module.exports = {
  addDocument,
  searchDocuments,
  generateRAGResponse,
  getDocument,
  deleteDocument
};