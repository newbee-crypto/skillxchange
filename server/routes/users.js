import { Router } from 'express';
import { getProfile, updateProfile, addSkill, removeSkill, searchUsers, getAllUsers } from '../controllers/userController.js';
import { auth } from '../middleware/auth.js';

const router = Router();

router.get('/search', auth, searchUsers);
router.get('/', auth, getAllUsers);
router.get('/:id', auth, getProfile);
router.put('/profile', auth, updateProfile);
router.post('/skills', auth, addSkill);
router.delete('/skills/:skillId', auth, removeSkill);

export default router;
