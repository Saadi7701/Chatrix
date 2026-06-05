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
const uploadToCloudinary = (buffer: Buffer, mimetype: string, originalName?: string): Promise<{ url: string; publicId: string }> => {
  return new Promise((resolve, reject) => {
    const resourceType = mimetype.startsWith('video') ? 'video' : mimetype.startsWith('audio') ? 'video' : mimetype.startsWith('image') ? 'image' : 'raw';
    
    const options: any = {
      resource_type: resourceType,
      folder: 'chatrix',
      access_mode: 'public', // Prevent 401 errors on raw files
    };

    // For raw/document uploads, preserve the original filename so the
    // download URL keeps the correct extension (.pdf, .docx, etc.)
    if (resourceType === 'raw' && originalName) {
      // Strip extension from public_id to avoid double-extension issues
      const nameWithoutExt = originalName.replace(/\.[^.]+$/, '');
      options.use_filename = true;
      options.unique_filename = true;
      options.public_id = nameWithoutExt;
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      options,
      (error, result) => {
        if (error) reject(error);
        else resolve({
          url: result!.secure_url,
          publicId: result!.public_id,
        });
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
    const { url: fileUrl } = await uploadToCloudinary(req.file.buffer, req.file.mimetype);
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
    const { url: fileUrl } = await uploadToCloudinary(req.file.buffer, req.file.mimetype, req.file.originalname);
    const type = req.file.mimetype.startsWith('image')
      ? 'IMAGE'
      : req.file.mimetype.startsWith('audio')
      ? 'AUDIO'
      : req.file.mimetype.startsWith('video')
      ? 'VIDEO'
      : 'DOCUMENT';

    // For documents (raw files), generate a signed URL so it doesn't 401
    let deliveryUrl = fileUrl;
    if (type === 'DOCUMENT') {
      deliveryUrl = generateSignedRawUrl(fileUrl);
    }

    res.status(200).json({
      url: deliveryUrl,
      type,
      fileName: req.file.originalname,
      fileSize: req.file.size
    });
  } catch (error) {
    console.error('[Upload Chat Media Error]:', error);
    res.status(500).json({ message: 'Error uploading file' });
  }
});

// Download endpoint: generates a signed URL for any Cloudinary raw file
// This handles existing files that were uploaded before the fix
router.get('/download', authMiddleware, async (req, res) => {
  const { url } = req.query;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ message: 'Missing url parameter' });
  }

  try {
    const signedUrl = generateSignedRawUrl(url);
    res.redirect(signedUrl);
  } catch (error) {
    console.error('[Download Error]:', error);
    res.status(500).json({ message: 'Error generating download link' });
  }
});

/**
 * Takes a Cloudinary raw URL and returns a signed version that bypasses 401.
 * Example input:  https://res.cloudinary.com/xxx/raw/upload/v123/chatrix/file.pdf
 * Example output: https://res.cloudinary.com/xxx/raw/upload/s--SIGNATURE--/fl_attachment/v123/chatrix/file.pdf
 */
function generateSignedRawUrl(rawUrl: string): string {
  try {
    // Extract public_id from the Cloudinary URL
    // Pattern: .../raw/upload/v<number>/<public_id>
    const match = rawUrl.match(/\/raw\/upload\/v\d+\/(.+)$/);
    if (!match) return rawUrl;

    const publicId = match[1]; // e.g. "chatrix/thermodynamics__laws.pdf"

    const signedUrl = cloudinary.url(publicId, {
      resource_type: 'raw',
      sign_url: true,
      type: 'authenticated',
      secure: true,
    });

    return signedUrl;
  } catch {
    return rawUrl;
  }
}

export default router;
