import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { authMiddleware } from '../middleware/auth.middleware';
import prisma from '../config/prisma';

const router = Router();

// Configure Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

// Profile Picture Upload
router.post('/profile', authMiddleware, upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
  
  const userId = (req as any).userId;
  const fileUrl = `http://localhost:5000/uploads/${req.file.filename}`;

  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { profilePic: fileUrl }
    });
    res.status(200).json({ url: fileUrl, user });
  } catch (error) {
    res.status(500).json({ message: 'Error updating profile picture' });
  }
});

// Chat Media Upload
router.post('/chat', authMiddleware, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
  
  const fileUrl = `http://localhost:5000/uploads/${req.file.filename}`;
  res.status(200).json({ 
    url: fileUrl, 
    type: req.file.mimetype.startsWith('image') ? 'IMAGE' : req.file.mimetype.startsWith('video') ? 'VIDEO' : 'DOCUMENT' 
  });
});

export default router;
