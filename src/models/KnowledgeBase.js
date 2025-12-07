import mongoose from 'mongoose';

const KnowledgeBaseSchema = new mongoose.Schema({
  dataset_id: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  documentCount: {
    type: Number,
    default: 0
  },
  // 默认是对象字符串
  metadata: {
    type: String,
    default: "{}"
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('KnowledgeBase', KnowledgeBaseSchema);
