// 模拟LLM服务
// 在实际应用中，这里会调用真实的LLM API，如OpenAI的GPT模型

// 生成LLM回复
const generateLLMResponse = async messages => {
	try {
		// 这里是模拟实现
		// 实际应用中，需要替换为真实的LLM API调用

		// 简单的模拟回复逻辑
		let response = '';
		const lastUserMessage =
			messages[messages.length - 1].content.toLowerCase();

		if (
			lastUserMessage.includes('你好') ||
			lastUserMessage.includes('hi') ||
			lastUserMessage.includes('hello')
		) {
			response = '您好！我是电商助手，请问有什么可以帮助您的？';
		} else if (
			lastUserMessage.includes('产品') ||
			lastUserMessage.includes('商品')
		) {
			response =
				'我们有多种优质产品可供选择。您可以告诉我您感兴趣的产品类型，我可以为您推荐。';
		} else if (
			lastUserMessage.includes('价格') ||
			lastUserMessage.includes('多少钱')
		) {
			response =
				'我们的产品价格合理，并且经常有促销活动。您具体想了解哪种产品的价格呢？';
		} else if (
			lastUserMessage.includes('订单') ||
			lastUserMessage.includes('购买')
		) {
			response =
				'您可以在我们的网站上下订单。如果您已经下单，我可以帮您查询订单状态。';
		} else {
			response =
				'感谢您的咨询。作为电商助手，我可以为您提供产品信息、价格咨询、订单查询等服务。请告诉我您的具体需求。';
		}

		// 模拟延迟，让它看起来更像真实的API调用
		await new Promise(resolve => setTimeout(resolve, 100));

		return response;
	} catch (error) {
		console.error('LLM service error:', error);
		throw new Error('Failed to generate LLM response');
	}
};

// 批量生成回复
const batchGenerateResponses = async messageBatches => {
	try {
		const responses = await Promise.all(
			messageBatches.map(messages => generateLLMResponse(messages))
		);

		return responses;
	} catch (error) {
		console.error('Batch LLM generation error:', error);
		throw new Error('Failed to generate batch responses');
	}
};

export { generateLLMResponse, batchGenerateResponses };
