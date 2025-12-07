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
 * 其他RAGFlow相关操作可以在这里继续添加
 */
