import User from '../models/User.js';

export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { name, bio, avatar, location } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name, bio, avatar, location },
      { new: true, runValidators: true }
    );
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const addSkill = async (req, res) => {
  try {
    const { name, category, level } = req.body;
    const user = await User.findById(req.user._id);

    const exists = user.skills.find(s => s.name.toLowerCase() === name.toLowerCase());
    if (exists) return res.status(400).json({ error: 'Skill already added' });

    user.skills.push({ name, category, level });
    await user.save();
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const removeSkill = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.skills = user.skills.filter(s => s._id.toString() !== req.params.skillId);
    await user.save();
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const searchUsers = async (req, res) => {
  try {
    const { q, skill, level, page = 1, limit = 12 } = req.query;
    const query = {};

    if (q) {
      query.$text = { $search: q };
    }
    if (skill) {
      query['skills.name'] = { $regex: skill, $options: 'i' };
    }
    if (level) {
      query['skills.level'] = level;
    }

    // Exclude current user
    if (req.user) {
      query._id = { $ne: req.user._id };
    }

    const users = await User.find(query)
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .sort({ rating: -1 });

    const total = await User.countDocuments(query);

    res.json({
      users,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 12 } = req.query;
    const query = req.user ? { _id: { $ne: req.user._id } } : {};

    const users = await User.find(query)
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .sort({ rating: -1 });

    const total = await User.countDocuments(query);

    res.json({
      users,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
