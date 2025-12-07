import axios from 'axios';
import FormData from 'form-data';

// RAGFlow配置
const RAGFLOW_CONFIG = {
    BASE_URL: process.env.RAGFLOW_BASE_URL,
    API_KEY: process.env.RAGFLOW_API_KEY
};

/**
 * 上传文档到RAGFlow
 * @param {Object} file - 文件对象
 * @param {string} knowledgeBaseId - 知识库ID
 * @returns {Promise<Object>} RAGFlow响应
 */
export const uploadDocumentToRagflow = async (file, knowledgeBaseId) => {
    try {
        const formData = new FormData();

        // 添加文件到表单
        formData.append('file', file.buffer, {
            filename: file.originalname,
            contentType: file.mimetype
        });

        // 添加知识库ID
        formData.append('kb_id', knowledgeBaseId);

        // 发送请求到RAGFlow
        const response = await axios.post(
            `${RAGFLOW_CONFIG.BASE_URL}/v1/document/upload`,
            formData,
            {
                headers: {
                    'Authorization': RAGFLOW_CONFIG.API_KEY,
                    ...formData.getHeaders()
                }
            }
        );

        return response.data;
    } catch (error) {
        console.error('RAGFlow上传文档失败:', error.response?.data || error.message);
        throw new Error(`RAGFlow上传失败: ${error.response?.data?.message || error.message}`);
    }
};

/**
 * 从RAGFlow删除文档
 * @param {string[]} docIds - 要删除的文档ID数组
 * @returns {Promise<Object>} RAGFlow响应
 */
export const removeDocumentFromRagflow = async (docIds) => {
    try {
        // 发送请求到RAGFlow
        const response = await axios.post(
            `${RAGFLOW_CONFIG.BASE_URL}/v1/document/rm`,
            { doc_id: docIds },
            {
                headers: {
                    'Authorization': RAGFLOW_CONFIG.API_KEY,
                    'Content-Type': 'application/json;charset=UTF-8'
                }
            }
        );

        return response.data;
    } catch (error) {
        console.error('RAGFlow删除文档失败:', error.response?.data || error.message);
        throw new Error(`RAGFlow删除失败: ${error.response?.data?.message || error.message}`);
    }
};

/**
 * 创建知识库到RAGFlow
 * @param {string} name - 知识库名称
 * @returns {Promise<Object>} RAGFlow响应
 */
export const createKnowledgeBaseToRagflow = async (name) => {
    try {
        // 发送请求到RAGFlow
        const response = await axios.post(
            `${RAGFLOW_CONFIG.BASE_URL}/v1/kb/create`,
            {
                name,
                parse_type: 1,
                embd_id: "quentinz/bge-large-zh-v1.5:latest@Ollama",
                parser_id: "naive",
                pipeline_id: ""
            },
            {
                headers: {
                    'Authorization': RAGFLOW_CONFIG.API_KEY,
                    'Content-Type': 'application/json;charset=UTF-8'
                }
            }
        );

        return response.data;
    } catch (error) {
        console.error('RAGFlow创建知识库失败:', error.response?.data || error.message);
        throw new Error(`RAGFlow创建知识库失败: ${error.response?.data?.message || error.message}`);
    }
};

/**
 * 其他RAGFlow相关操作可以在这里继续添加
 */

/**
 * 删除RAGFlow中的知识库
 * @param {string} kbId - 知识库ID
 * @returns {Promise<Object>} - RAGFlow API响应
 */
export const removeKnowledgeBaseFromRagflow = async (kbId) => {
    try {
        const response = await axios.post(
            `${RAGFLOW_CONFIG.BASE_URL}/v1/kb/rm`,
            { kb_id: [kbId] }, // RAGFlow要求将kb_id作为数组发送
            {
                headers: {
                    'Content-Type': 'application/json;charset=UTF-8',
                    'Authorization': RAGFLOW_CONFIG.API_KEY
                }
            }
        );
        return response.data;
    } catch (error) {
        console.error('Error removing knowledge base from RAGFlow:', error.response?.data || error.message);
        throw error;
    }
}

/**
 * 调用RAGFlow的SSE接口获取基于RAG的回答
 * @param {Object} params - 查询参数
 * @returns {Promise<ReadableStream>} - 可读流
 */
export const getRagflowSSEResponse = async (params) => {
    try {
        const response = await axios.post(
            `${RAGFLOW_CONFIG.BASE_URL}/v1/conversation/completion`,
            params,
            {
                headers: {
                    'Authorization': RAGFLOW_CONFIG.API_KEY,
                    'Content-Type': 'application/json',
                    'Accept': '*/*'
                },
                responseType: 'stream'
            }
        );
        return response.data;
    } catch (error) {
        console.error('RAGFlow SSE请求失败:', error.response?.data || error.message);
        throw error;
    }
}
