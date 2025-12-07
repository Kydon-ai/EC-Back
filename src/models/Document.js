import mongoose from 'mongoose';

const DocumentSchema = new mongoose.Schema({
  uuid: {
    type: String,
    required: true,
    unique: true
  },
  title: {
    type: String,
    required: true
  },
  content: {
    type: String,
    default: ''
  },
  metadata: {
    type: Object,
    default: {}
  },
  embedding: {
    type: [Number],
    default: []
  },
  tags: {
    type: [String],
    default: []
  },
  knowledgeBaseId: {
    type: String,
    ref: 'KnowledgeBase'
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

export default mongoose.model('Document', DocumentSchema);