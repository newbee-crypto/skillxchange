import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import Message from '../models/Message.js';

const router = Router();

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
