import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema({
  conversationId: {
    type: String,
    required: true,
    index: true
  },
  role: {
    type: String,
    required: true,
    enum: ['user', 'assistant', 'system']
  },
  content: {
    type: String,
    required: true
  },
  metadata: {
    type: Object,
    default: {}
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('Message', MessageSchema);