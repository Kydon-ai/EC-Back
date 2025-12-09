import mongoose from 'mongoose';

const QuestionCountSchema = new mongoose.Schema({
	question: {
		type: String,
		required: true,
		unique: true,
		index: true,
	},
	count: {
		type: Number,
		default: 1,
	},
	zeroHitCount: {
		type: Number,
		default: 0,
	},
	lastAskedAt: {
		type: Date,
		default: Date.now,
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

export default mongoose.model('QuestionCount', QuestionCountSchema);
