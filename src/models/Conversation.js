import mongoose from 'mongoose';

const ConversationSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  dialog_id: {
    type: String,
    required: true
  },
  user_id: {
    type: String,
    required: true
  },
  create_time: {
    type: Number,
    required: true
  },
  update_time: {
    type: Number,
    required: true
  },
  create_date: {
    type: String,
    required: true
  },
  update_date: {
    type: String,
    required: true
  },
  // 完整消息内容和引用将存储在Message模型中
  message_count: {
    type: Number,
    default: 0
  },
  reference_count: {
    type: Number,
    default: 0
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

export default mongoose.model('Conversation', ConversationSchema);