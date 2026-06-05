import { Router } from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { authMiddleware } from '../middleware/auth.middleware';
import prisma from '../config/prisma';
import { Readable } from 'stream';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';

const router = Router();

// Configure Cloudinary for Media (Images/Video/Audio)
cloudinary.config({ cloudinary_url: process.env.CLOUDINARY_URL });

// Configure AWS S3 for Documents (PDF/Doc/PPT)
// If you use Cloudflare R2, the endpoint would look like https://<ACCOUNT_ID>.r2.cloudflarestorage.com
const s3 = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
  endpoint: process.env.AWS_ENDPOINT_URL || undefined, // Required for R2 and Supabase
  forcePathStyle: true, // Crucial for Supabase and S3-compatible alternatives
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'chatrix-docs';

// Use memory storage
const upload = multer({ storage: multer.memoryStorage() });

// --- CLOUDINARY UPLOAD HELPER ---
const uploadToCloudinary = (buffer: Buffer, mimetype: string, originalName?: string): Promise<{ url: string; publicId: string }> => {
  return new Promise((resolve, reject) => {
    const resourceType = mimetype.startsWith('video') ? 'video' : mimetype.startsWith('audio') ? 'video' : mimetype.startsWith('image') ? 'image' : 'raw';
    
    const options: any = {
      resource_type: resourceType,
      folder: 'chatrix',
      access_mode: 'public',
    };

    if (resourceType === 'raw' && originalName) {
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

// --- S3 UPLOAD HELPER ---
const uploadToS3 = async (buffer: Buffer, mimetype: string, originalName: string): Promise<{ key: string }> => {
  const fileExtension = originalName.split('.').pop();
  // Generate a unique safe filename
  const safeName = crypto.randomBytes(16).toString('hex');
  const key = `documents/${safeName}.${fileExtension}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: mimetype,
    ContentDisposition: `attachment; filename="${originalName}"`
  });

  await s3.send(command);
  return { key };
};

// Profile Picture Upload (Cloudinary)
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

// Chat Media Upload
router.post('/chat', authMiddleware, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

  try {
    const type = req.file.mimetype.startsWith('image')
      ? 'IMAGE'
      : req.file.mimetype.startsWith('audio')
      ? 'AUDIO'
      : req.file.mimetype.startsWith('video')
      ? 'VIDEO'
      : 'DOCUMENT';

    let deliveryUrl = '';

    if (type === 'DOCUMENT') {
      // 1. Upload to S3/R2 for raw files
      const { key } = await uploadToS3(req.file.buffer, req.file.mimetype, req.file.originalname);
      // We store a custom URL format for S3 files: s3://key
      deliveryUrl = `s3://${key}`;
    } else {
      // 2. Upload to Cloudinary for media
      const { url: fileUrl } = await uploadToCloudinary(req.file.buffer, req.file.mimetype, req.file.originalname);
      deliveryUrl = fileUrl;
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

// Download endpoint: generates signed URLs for S3 or Cloudinary
router.get('/download', async (req, res) => {
  const { url } = req.query;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ message: 'Missing url parameter' });
  }

  try {
    // Check if it's an S3 object (our new format)
    if (url.startsWith('s3://')) {
      const key = url.replace('s3://', '');
      const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      });
      // Generate a presigned URL that expires in 15 minutes (900 seconds)
      const signedUrl = await getSignedUrl(s3, command, { expiresIn: 900 });
      return res.redirect(signedUrl);
    }

    // Fallback for legacy Cloudinary raw files
    const signedUrl = generateSignedRawUrl(url);
    res.redirect(signedUrl);
  } catch (error) {
    console.error('[Download Error]:', error);
    res.status(500).json({ message: 'Error generating download link' });
  }
});

/**
 * Fallback for legacy Cloudinary raw URLs
 */
function generateSignedRawUrl(rawUrl: string): string {
  try {
    const match = rawUrl.match(/\/raw\/upload\/v\d+\/(.+)$/);
    if (!match) return rawUrl;

    const publicId = match[1];
    return cloudinary.url(publicId, {
      resource_type: 'raw',
      sign_url: true,
      type: 'authenticated',
      secure: true,
    });
  } catch {
    return rawUrl;
  }
}

export default router;
