import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema({
	role: {
		type: String,
		required: true,
		enum: ['user', 'assistant'],
	},
	content: {
		type: String,
		required: true,
	},
	metadata: {
		type: mongoose.Schema.Types.Mixed,
		default: {},
	},
	reference: {
		type: [mongoose.Schema.Types.Mixed],
		default: [],
	},
	createdAt: {
		type: Date,
		default: Date.now,
	},
});

const ConversationSchema = new mongoose.Schema({
	id: {
		type: String,
		required: true,
		unique: true,
		index: true,
	},
	name: {
		type: String,
		required: true,
	},
	dialog_id: {
		type: String,
		required: true,
	},
	user_id: {
		type: String,
		required: true,
	},
	create_time: {
		type: Number,
		required: true,
	},
	update_time: {
		type: Number,
		required: true,
	},
	create_date: {
		type: String,
		required: true,
	},
	update_date: {
		type: String,
		required: true,
	},
	// 完整消息内容存储在messages字段中
	messages: [MessageSchema],
	message_count: {
		type: Number,
		default: 0,
	},
	reference_count: {
		type: Number,
		default: 0,
	},
	createdAt: {
		type: Date,
		default: Date.now,
	},
	updatedAt: {
		type: Date,
		default: Date.now,
	},
});

export default mongoose.model('Conversation', ConversationSchema);
