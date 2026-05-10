import { Router } from 'express';
import { createStory, getStories, likeStory } from '../controllers/story.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authMiddleware, getStories);
router.post('/', authMiddleware, createStory);
router.post('/like/:storyId', authMiddleware, likeStory);

export default router;
