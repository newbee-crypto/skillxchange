import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import Message from '../models/Message.js';
import User from '../models/User.js';

const router = Router();

router.get('/conversations', auth, async (req, res) => {
  try {
    const userId = req.user._id.toString();

    const recentMessages = await Message.find({
      $or: [{ sender: req.user._id }, { receiver: req.user._id }],
    })
      .populate('sender', 'name avatar isOnline skills')
      .populate('receiver', 'name avatar isOnline skills')
      .sort({ createdAt: -1 })
      .limit(200);

    const conversationMap = new Map();

    recentMessages.forEach((message) => {
      const senderId = message.sender?._id?.toString() || message.sender?.toString();
      const receiverId = message.receiver?._id?.toString() || message.receiver?.toString();
      const partner = senderId === userId ? message.receiver : message.sender;
      const partnerId = partner?._id?.toString() || partner?.toString();

      if (!partnerId || conversationMap.has(partnerId)) return;

      conversationMap.set(partnerId, {
        user: partner,
        roomId: message.roomId,
        lastMessage: message.content,
        lastMessageAt: message.createdAt,
      });
    });

    const usersWithoutMessages = await User.find({ _id: { $ne: req.user._id } })
      .sort({ isOnline: -1, name: 1 })
      .limit(50);

    usersWithoutMessages.forEach((user) => {
      const partnerId = user._id.toString();
      if (!conversationMap.has(partnerId)) {
        conversationMap.set(partnerId, {
          user,
          roomId: [userId, partnerId].sort().join('_'),
          lastMessage: '',
          lastMessageAt: null,
        });
      }
    });

    const conversations = Array.from(conversationMap.values()).sort((a, b) => {
      if (a.lastMessageAt && b.lastMessageAt) {
        return new Date(b.lastMessageAt) - new Date(a.lastMessageAt);
      }
      if (a.lastMessageAt) return -1;
      if (b.lastMessageAt) return 1;
      return (a.user?.name || '').localeCompare(b.user?.name || '');
    });

    res.json({ conversations });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get chat history between two users
router.get('/:roomId', auth, async (req, res) => {
  try {
    const { roomId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const messages = await Message.find({ roomId })
      .populate('sender', 'name avatar')
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit);

    const total = await Message.countDocuments({ roomId });

    res.json({
      messages,
      pagination: {
        page,
        pages: Math.ceil(total / limit),
        total,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
