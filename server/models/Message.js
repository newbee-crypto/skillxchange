import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  roomId: {
    type: String,
    required: true,
    index: true,
  },
  content: {
    type: String,
    required: [true, 'Message content is required'],
    maxlength: 2000,
  },
  type: {
    type: String,
    enum: ['text', 'system', 'ai-summary'],
    default: 'text',
  },
  read: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

// Index for fetching conversation history
messageSchema.index({ roomId: 1, createdAt: -1 });
messageSchema.index({ sender: 1, receiver: 1 });

export default mongoose.model('Message', messageSchema);
