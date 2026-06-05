import { Router } from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { authMiddleware } from '../middleware/auth.middleware';
import prisma from '../config/prisma';
import { Readable } from 'stream';

const router = Router();

// Configure Cloudinary
cloudinary.config({ cloudinary_url: process.env.CLOUDINARY_URL });

// Use memory storage (no disk - works on Railway)
const upload = multer({ storage: multer.memoryStorage() });

// Helper to upload buffer to Cloudinary
const uploadToCloudinary = (buffer: Buffer, mimetype: string, originalName?: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const resourceType = mimetype.startsWith('video') ? 'video' : mimetype.startsWith('audio') ? 'video' : mimetype.startsWith('image') ? 'image' : 'raw';
    
    const options: any = {
      resource_type: resourceType,
      folder: 'chatrix',
    };

    // For raw/document uploads, preserve the original filename so the
    // download URL keeps the correct extension (.pdf, .docx, etc.)
    if (resourceType === 'raw' && originalName) {
      options.use_filename = true;
      options.unique_filename = true;
      options.public_id = originalName; // Cloudinary will append unique suffix
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      options,
      (error, result) => {
        if (error) reject(error);
        else resolve(result!.secure_url);
      }
    );
    const readable = new Readable();
    readable.push(buffer);
    readable.push(null);
    readable.pipe(uploadStream);
  });
};

// Profile Picture Upload
router.post('/profile', authMiddleware, upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
  const userId = (req as any).userId;

  try {
    const fileUrl = await uploadToCloudinary(req.file.buffer, req.file.mimetype);
    const user = await prisma.user.update({
      where: { id: userId },
      data: { profilePic: fileUrl }
    });
    res.status(200).json({ url: fileUrl, user });
  } catch (error) {
    console.error('[Upload Profile Error]:', error);
    res.status(500).json({ message: 'Error uploading profile picture' });
  }
});

// Chat Media Upload (images, audio/voice notes, videos, documents)
router.post('/chat', authMiddleware, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

  try {
    const fileUrl = await uploadToCloudinary(req.file.buffer, req.file.mimetype, req.file.originalname);
    const type = req.file.mimetype.startsWith('image')
      ? 'IMAGE'
      : req.file.mimetype.startsWith('audio')
      ? 'AUDIO'
      : req.file.mimetype.startsWith('video')
      ? 'VIDEO'
      : 'DOCUMENT';

    res.status(200).json({
      url: fileUrl,
      type,
      fileName: req.file.originalname,
      fileSize: req.file.size
    });
  } catch (error) {
    console.error('[Upload Chat Media Error]:', error);
    res.status(500).json({ message: 'Error uploading file' });
  }
});

export default router;
