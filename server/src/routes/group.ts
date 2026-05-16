import { Router } from 'express';
import { 
  createGroup, getGroups, updateGroup, 
  addMembers, removeMember, getGroupMessages 
} from '../controllers/group.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.post('/', authMiddleware, createGroup);
router.get('/', authMiddleware, getGroups);
router.put('/:groupId', authMiddleware, updateGroup);
router.post('/:groupId/members', authMiddleware, addMembers);
router.delete('/:groupId/members/:memberId', authMiddleware, removeMember);
router.get('/:groupId/messages', authMiddleware, getGroupMessages);

export default router;
