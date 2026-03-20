import {Controller, Middleware, Post} from '@overnightjs/core';
import type {NextFunction, Request, Response} from 'express';
import multer from 'multer';
import signale from 'signale';
import {requireAuth, requireEmailVerified} from '../middleware/auth.js';
import * as AzureBlobService from '../services/AzureBlobService.js';
import {CatchAsync} from '../utils/asyncHandler.js';

const MAGIC_BYTES: Record<string, Buffer[]> = {
  'image/jpeg': [Buffer.from([0xff, 0xd8, 0xff])],
  'image/jpg': [Buffer.from([0xff, 0xd8, 0xff])],
  'image/png': [Buffer.from([0x89, 0x50, 0x4e, 0x47])],
  'image/gif': [Buffer.from('GIF87a'), Buffer.from('GIF89a')],
  'image/webp': [Buffer.from('RIFF')],
};

function validateMagicBytes(buffer: Buffer, mimetype: string): boolean {
  const signatures = MAGIC_BYTES[mimetype];
  if (!signatures) return false;
  return signatures.some(sig => buffer.subarray(0, sig.length).equals(sig));
}

// Configure multer for file uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (JPEG, PNG, GIF, WebP)'));
    }
  },
});

@Controller('uploads')
export class Uploads {
  /**
   * POST /uploads/image
   * Upload an image file to Azure Blob Storage
   */
  @Post('image')
  @Middleware([requireAuth, requireEmailVerified, upload.single('image')])
  @CatchAsync
  public async uploadImage(req: Request, res: Response, _next: NextFunction) {
    const auth = res.locals.auth;

    try {
      if (!AzureBlobService.isStorageEnabled()) {
        return res.status(503).json({
          error: 'File uploads are not enabled. Please configure Azure Blob Storage.',
        });
      }

      if (!req.file) {
        return res.status(400).json({
          error: 'No image file provided',
        });
      }

      if (!validateMagicBytes(req.file.buffer, req.file.mimetype)) {
        return res.status(400).json({
          error: 'File contents do not match the declared image type',
        });
      }

      // Upload file to Azure Blob Storage
      const result = await AzureBlobService.uploadFile({
        file: req.file.buffer,
        filename: req.file.originalname,
        contentType: req.file.mimetype,
        projectId: auth.projectId!,
      });

      return res.status(200).json({
        url: result.url,
        key: result.key,
        filename: req.file.originalname,
        contentType: req.file.mimetype,
        size: req.file.size,
      });
    } catch (error) {
      signale.error('[UPLOADS] Failed to upload image:', error);
      return res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to upload image',
      });
    }
  }
}
