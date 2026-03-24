import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { summarizeChat, suggestSkills } from '../services/aiService.js';
import Message from '../models/Message.js';

const router = Router();

// Summarize chat conversation
router.post('/summarize', auth, async (req, res) => {
  try {
    const { roomId } = req.body;
    if (!roomId) return res.status(400).json({ error: 'roomId is required' });

    const messages = await Message.find({ roomId })
      .populate('sender', 'name')
      .sort({ createdAt: 1 })
      .limit(50);

    const formatted = messages.map(m => ({
      senderName: m.sender.name,
      content: m.content,
    }));

    const result = await summarizeChat(formatted);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Suggest skills for user
router.get('/suggest-skills', auth, async (req, res) => {
  try {
    const userSkills = req.user.skills.map(s => s.name);
    const result = await suggestSkills(userSkills, req.user.bio);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
