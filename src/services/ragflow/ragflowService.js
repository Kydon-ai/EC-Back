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
        // cite:https://www.cnblogs.com/ljbguanli/p/19097607
        formData.append('file', file.buffer, {
            filename: Buffer.from(file.originalname, "latin1").toString("utf8"),
            contentType: file.mimetype
        });

        // 添加知识库ID
        formData.append('kb_id', knowledgeBaseId);

        // 发送请求到RAGFlow，确保使用UTF-8编码
        const headers = formData.getHeaders();
        // 修改Content-Type头，添加charset=utf-8
        if (headers['Content-Type']) {
            headers['Content-Type'] = headers['Content-Type'] + '; charset=utf-8';
        }

        const response = await axios.post(
            `${RAGFLOW_CONFIG.BASE_URL}/v1/document/upload`,
            formData,
            {
                headers: {
                    'Authorization': RAGFLOW_CONFIG.API_KEY,
                    ...headers
                }
            }
        );
        console.log("查看响应：", response)
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

/**
 * 设置RAGFlow中的对话
 * @param {Object} params - 设置对话的参数
 * @param {string} params.dialog_id - 对话ID
 * @param {string} params.conversation_id - 会话ID
 * @param {string} params.name - 对话名称
 * @param {string} params.user_id - 用户ID
 * @param {Array} params.message - 消息数组
 * @returns {Promise<Object>} - RAGFlow API响应
 */
export const setConversationToRagflow = async (params) => {
    try {
        // name 充当content
        const { dialog_id, conversation_id, name, user_id } = params;

        // 构建请求体，根据curl示例设置参数
        const requestBody = {
            dialog_id,
            name,
            is_new: true, // 根据curl示例固定为true
            conversation_id,
            message: [{
                role: 'assistant',
                content: name,
                conversationId: conversation_id
            }],
            reference: [],
            user_id
        };

        const response = await axios.post(
            `${RAGFLOW_CONFIG.BASE_URL}/v1/conversation/set`,
            requestBody,
            {
                headers: {
                    'Authorization': RAGFLOW_CONFIG.API_KEY,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json, text/plain, */*'
                }
            }
        );

        return response.data;
    } catch (error) {
        console.error('RAGFlow设置对话失败:', error.response?.data || error.message);
        throw error;
    }
}

/**
 * 批量删除RAGFlow中的对话
 * @param {Object} params - 删除对话的参数
 * @param {string[]} params.conversation_ids - 要删除的会话ID数组
 * @param {string} params.dialog_id - 对话ID
 * @returns {Promise<Object>} - RAGFlow API响应
 */
export const removeConversationsFromRagflow = async (params) => {
    try {
        const { conversation_ids, dialog_id } = params;

        // 构建请求体，根据curl示例设置参数
        const requestBody = {
            conversation_ids,
            dialog_id
        };

        const response = await axios.post(
            `${RAGFLOW_CONFIG.BASE_URL}/v1/conversation/rm`,
            requestBody,
            {
                headers: {
                    'Authorization': RAGFLOW_CONFIG.API_KEY,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json, text/plain, */*'
                }
            }
        );

        return response.data;
    } catch (error) {
        console.error('RAGFlow批量删除对话失败:', error.response?.data || error.message);
        throw error;
    }
}

/**
 * 获取RAGFlow中的对话列表
 * @param {string} dialog_id - 对话ID
 * @returns {Promise<Object>} - RAGFlow API响应
 */
export const getConversationsFromRagflow = async (dialog_id) => {
    try {
        const response = await axios.get(
            `${RAGFLOW_CONFIG.BASE_URL}/v1/conversation/list`,
            {
                headers: {
                    'Authorization': RAGFLOW_CONFIG.API_KEY,
                    'Accept': 'application/json, text/plain, */*'
                },
                params: {
                    dialog_id
                }
            }
        );

        return response.data;
    } catch (error) {
        console.error('RAGFlow获取对话列表失败:', error.response?.data || error.message);
        throw error;
    }
}

/**
 * 获取RAGFlow中的对话详情
 * @param {string} conversation_id - 对话ID
 * @returns {Promise<Object>} - RAGFlow API响应
 */
export const getConversationFromRagflow = async (conversation_id) => {
    try {
        const response = await axios.get(
            `${RAGFLOW_CONFIG.BASE_URL}/v1/conversation/get`,
            {
                headers: {
                    'Authorization': RAGFLOW_CONFIG.API_KEY,
                    'Accept': 'application/json, text/plain, */*'
                },
                params: {
                    conversation_id
                }
            }
        );

        return response.data;
    } catch (error) {
        console.error('RAGFlow获取对话详情失败:', error.response?.data || error.message);
        throw error;
    }
}
