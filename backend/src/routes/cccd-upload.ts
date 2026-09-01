import { Hono } from 'hono';
import type { Env, JWTPayload } from '../types/env.js';
import { requireAdmin } from '../middleware/auth-middleware.js';
import {
  uploadToCloudflareImages,
  validateImageFile,
  generateSignedImageURL,
  deleteCloudflareImage,
} from '../utils/cloudflare-images.js';
import { extractRegistrationPrefillFromImage } from '../services/cccd-ocr-service.js';
import type { CCCDExtractionResult } from '../services/cccd-ocr-parser.js';

const VALID_TYPES = ['cccd_front', 'cccd_back', 'photo_3x4'] as const;
const PIPELINE_VERSION = 'v3-manual-upload';

const app = new Hono<{ Bindings: Env; Variables: { user: JWTPayload; teacher: JWTPayload } }>();

function hasCloudflareImages(env: Env) {
  return Boolean(env.CLOUDFLARE_IMAGES_API_TOKEN && env.CLOUDFLARE_ACCOUNT_ID);
}

function buildR2PreviewUrl(imageKey: string) {
  return `/api/students/image/${encodeURIComponent(imageKey)}`;
}

async function buildPreviewUrl(c: { env: Env }, imageId: string, fallbackUrl?: string | null) {
  if (!imageId) return fallbackUrl || null;
  if (imageId.includes('/')) return fallbackUrl || null;
  if (hasCloudflareImages(c.env)) {
    try {
      return await generateSignedImageURL(c.env, imageId, 60);
    } catch (error) {
      console.warn('[cccd-upload] signed url generation failed:', error);
    }
  }
  return fallbackUrl || null;
}

app.post('/', async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get('image') as File | null;
    const type = formData.get('type') as (typeof VALID_TYPES)[number] | null;
    const studentId = formData.get('studentId') as string | null;

    if (!type || !VALID_TYPES.includes(type)) {
      return c.json({
        success: false,
        error: 'Invalid image type. Must be cccd_front, cccd_back, or photo_3x4.',
      }, 400);
    }

    const shouldUseCloudflareImages = type !== 'photo_3x4' && hasCloudflareImages(c.env);
    const useR2Fallback = Boolean(c.env.R2) && (type === 'photo_3x4' || !shouldUseCloudflareImages);

    if (!shouldUseCloudflareImages && !useR2Fallback) {
      return c.json({
        success: false,
        error: 'Missing image storage configuration.',
      }, 500);
    }

    const validation = validateImageFile(file, 10);
    if (!validation.valid) {
      return c.json({
        success: false,
        error: 'File validation failed.',
        details: validation.errors,
      }, 400);
    }

    const metadata = {
      type,
      uploadedAt: new Date().toISOString(),
      studentId: studentId || '',
      originalFilename: file?.name || '',
    };

    let uploadResult: { success: boolean; imageId: string; url?: string | null };
    if (shouldUseCloudflareImages) {
      const uploaded = await uploadToCloudflareImages(c.env, file as File, metadata, true);
      uploadResult = {
        success: true,
        imageId: uploaded.imageId,
      };
    } else {
      const fileBuffer = await (file as File).arrayBuffer();
      const timestamp = Date.now();
      const sanitizedFileName = (file as File).name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const r2Key = `cccd-uploads/${type}/${timestamp}-${sanitizedFileName}`;

      await (c.env.R2 as R2Bucket).put(r2Key, fileBuffer, {
        httpMetadata: { contentType: (file as File).type || 'image/jpeg' },
        customMetadata: metadata,
      });

      uploadResult = {
        success: true,
        imageId: r2Key,
        url: buildR2PreviewUrl(r2Key),
      };
    }

    const previewUrl = await buildPreviewUrl(c, uploadResult.imageId, uploadResult.url || null);

    let processingLogId: number | null = null;
    try {
      const inserted = await c.env.DB.prepare(`
        INSERT INTO image_processing_logs (
          student_id,
          image_type,
          original_image_id,
          source_image_id,
          processing_status,
          selection_status,
          pipeline_stage,
          progress_percent,
          pipeline_version,
          processing_started_at
        )
        VALUES (?, ?, ?, ?, 'completed', NULL, 'completed', 100, ?, CURRENT_TIMESTAMP)
      `).bind(
        studentId || null,
        type,
        uploadResult.imageId,
        uploadResult.imageId,
        PIPELINE_VERSION,
      ).run();

      processingLogId = Number(inserted.meta.last_row_id || 0) || null;
    } catch (logError) {
      console.warn('[cccd-upload] failed to create processing log:', logError);
    }

    let ocrPrefill: CCCDExtractionResult | null = null;
    if (type === 'cccd_front' || type === 'cccd_back') {
      try {
        const ocr = await extractRegistrationPrefillFromImage(c.env, uploadResult.imageId, type);
        ocrPrefill = ocr.prefill;
      } catch (ocrError) {
        console.warn('[cccd-upload] OCR failed, continuing without prefill:', ocrError);
      }
    }

    return c.json({
      success: true,
      imageId: uploadResult.imageId,
      processingLogId,
      previewUrl,
      ocrPrefill,
      warnings: [],
      status: 'completed',
      processingQueued: false,
      message: 'Image uploaded successfully.',
    });
  } catch (error: any) {
    console.error('[cccd-upload] upload error:', error);
    return c.json({
      success: false,
      error: error?.message || 'Upload failed.',
    }, 500);
  }
});

app.get('/image/:key', async (c) => {
  try {
    const key = decodeURIComponent(c.req.param('key'));
    const object = await c.env.R2.get(key);

    if (!object) {
      return c.json({
        success: false,
        error: 'Image not found.',
      }, 404);
    }

    return new Response(object.body, {
      headers: {
        'Content-Type': object.httpMetadata?.contentType || 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000',
      },
    });
  } catch (error: any) {
    console.error('[cccd-upload] image serve error:', error);
    return c.json({
      success: false,
      error: error?.message || 'Image serve failed.',
    }, 500);
  }
});

app.delete('/:imageId', requireAdmin, async (c) => {
  try {
    const imageId = c.req.param('imageId');
    let deleted = false;

    if (imageId.includes('/')) {
      await c.env.R2.delete(imageId);
      deleted = true;
    } else if (hasCloudflareImages(c.env)) {
      deleted = await deleteCloudflareImage(c.env, imageId);
    }

    if (!deleted) {
      throw new Error('Failed to delete image from storage.');
    }

    await c.env.DB.prepare(`
      UPDATE image_processing_logs
      SET processing_status = 'deleted',
          pipeline_stage = 'failed'
      WHERE original_image_id = ?
         OR processed_image_id = ?
         OR source_image_id = ?
         OR candidate_image_id = ?
         OR final_image_id = ?
    `).bind(imageId, imageId, imageId, imageId, imageId).run();

    return c.json({
      success: true,
      message: 'Image deleted successfully.',
    });
  } catch (error: any) {
    console.error('[cccd-upload] delete error:', error);
    return c.json({
      success: false,
      error: error?.message || 'Image deletion failed.',
    }, 500);
  }
});

export default app;
