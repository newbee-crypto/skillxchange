import { Router } from 'express';
import { signup, login, getMe } from '../controllers/authController.js';
import { auth } from '../middleware/auth.js';

const router = Router();

router.post('/signup', signup);
router.post('/login', login);
router.get('/me', auth, getMe);

export default router;
