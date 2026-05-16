import { Router } from 'express';
import { login, register, checkUserCode, searchUser, getConversation, getConversations, getCalls, updateStealthCode, updateProfile, updateSettings } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/check-code/:code', checkUserCode);
router.get('/search/:code', searchUser);
router.get('/conversations', authMiddleware, getConversations);
router.get('/messages/:otherUserId', authMiddleware, getConversation);
router.get('/calls', authMiddleware, getCalls);
router.put('/profile', authMiddleware, updateProfile);
router.put('/stealth-code', authMiddleware, updateStealthCode);
router.put('/settings', authMiddleware, updateSettings);

export default router;
