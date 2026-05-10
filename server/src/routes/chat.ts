import { Router } from 'express';
import { getConversations, getConversation, sendMessage } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.post('/send', authMiddleware, sendMessage);
router.get('/conversations', authMiddleware, getConversations);
router.get('/messages/:otherUserId', authMiddleware, getConversation);

export default router;
