// 请求验证中间件

// 验证创建对话请求
const validateCreateConversation = (req, res, next) => {
	const { message } = req.body;

	if (!message || typeof message !== 'string' || message.trim() === '') {
		return res.status(400).json({
			status: 'error',
			message: 'Message must be a non-empty string',
		});
	}

	next();
};

// 验证继续对话请求
const validateContinueConversation = (req, res, next) => {
	const { conversationId } = req.params;
	const { message } = req.body;

	// 简单验证UUID格式
	const uuidRegex =
		/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

	if (!uuidRegex.test(conversationId)) {
		return res.status(400).json({
			status: 'error',
			message: 'Invalid conversation ID format',
		});
	}

	if (!message || typeof message !== 'string' || message.trim() === '') {
		return res.status(400).json({
			status: 'error',
			message: 'Message must be a non-empty string',
		});
	}

	next();
};

// 验证文档添加请求
const validateAddDocument = (req, res, next) => {
	const { title, content } = req.body;

	if (!title || typeof title !== 'string' || title.trim() === '') {
		return res.status(400).json({
			status: 'error',
			message: 'Title must be a non-empty string',
		});
	}

	if (!content || typeof content !== 'string' || content.trim() === '') {
		return res.status(400).json({
			status: 'error',
			message: 'Content must be a non-empty string',
		});
	}

	// 验证标签格式（如果提供）
	if (
		req.body.tags &&
		(!Array.isArray(req.body.tags) ||
			!req.body.tags.every(tag => typeof tag === 'string'))
	) {
		return res.status(400).json({
			status: 'error',
			message: 'Tags must be an array of strings',
		});
	}

	next();
};

// 验证RAG搜索请求
const validateSearchRequest = (req, res, next) => {
	const { query } = req.body;

	if (!query || typeof query !== 'string' || query.trim() === '') {
		return res.status(400).json({
			status: 'error',
			message: 'Search query must be a non-empty string',
		});
	}

	// 验证limit参数
	if (
		req.body.limit &&
		(!Number.isInteger(req.body.limit) || req.body.limit <= 0)
	) {
		return res.status(400).json({
			status: 'error',
			message: 'Limit must be a positive integer',
		});
	}

	next();
};

export {
	validateCreateConversation,
	validateContinueConversation,
	validateAddDocument,
	validateSearchRequest,
};
