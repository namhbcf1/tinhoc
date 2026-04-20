import { Hono } from 'hono';
import type { Env, JWTPayload } from '../types/env.js';
import { requireAdmin } from '../middleware/auth-middleware.js';
import {
  uploadToCloudflareImages,
  validateImageFile,
  generateSignedImageURL,
  deleteCloudflareImage,
} from '../utils/cloudflare-images.js';
import {
  extractRegistrationPrefillFromCandidates,
  extractRegistrationPrefillFromImage,
} from '../services/cccd-ocr-service.js';
import {
  enqueuePhoto3x4Pipeline,
  getPhoto3x4ProcessingStatus,
  regeneratePhoto3x4Pipeline,
  runPhoto3x4Pipeline,
  selectPhoto3x4Variant,
} from '../services/photo-3x4-pipeline.js';

function buildEmptyOCRPrefill() {
  return {
    cccd: '',
    fullName: '',
    dateOfBirth: '',
    gender: '',
    ethnicity: '',
    nationality: '',
    placeOfOrigin: '',
    placeOfResidence: '',
    issueDate: '',
  };
}

function getMissingCriticalFields(prefill: ReturnType<typeof buildEmptyOCRPrefill>, type: 'cccd_front' | 'cccd_back') {
  if (type === 'cccd_front') {
    return [
      !prefill.fullName ? 'họ tên' : null,
      !prefill.cccd ? 'số CCCD' : null,
      !prefill.dateOfBirth ? 'ngày sinh' : null,
    ].filter(Boolean) as string[];
  }

  return [!prefill.issueDate ? 'ngày cấp' : null].filter(Boolean) as string[];
}

const VALID_TYPES = ['cccd_front', 'cccd_back', 'photo_3x4'] as const;
const PIPELINE_VERSION = 'v2-generate-first';

const app = new Hono<{ Bindings: Env; Variables: { user: JWTPayload; teacher: JWTPayload } }>();

function hasCloudflareImages(env: Env) {
  return Boolean(env.CLOUDFLARE_IMAGES_API_TOKEN && env.CLOUDFLARE_ACCOUNT_ID);
}

function buildR2PreviewUrl(imageKey: string) {
  return `/api/students/image/${encodeURIComponent(imageKey)}`;
}

function buildPipelineSourceUrl(c: { req: { url: string }; env: Env }, imageKey: string) {
  try {
    const requestUrl = new URL(c.req.url);
    if (requestUrl.hostname && requestUrl.hostname !== 'internal.vantrangedu') {
      return `${requestUrl.origin}/students/image/${encodeURIComponent(imageKey)}`;
    }
  } catch {
    // fall through to stable worker URL
  }

  return `https://vantrangedu-api.bangachieu2.workers.dev/students/image/${encodeURIComponent(imageKey)}`;
}

function readOptionalFormFile(value: FormDataEntryValue | null) {
  if (value instanceof File && value.size > 0) {
    return value;
  }
  return null;
}

async function storeAuxiliaryDocumentVariant(
  c: { env: Env },
  file: File,
  type: 'cccd_front' | 'cccd_back',
  processingLogId: number,
  variantKey: string,
  studentId?: string | null,
) {
  const buffer = await file.arrayBuffer();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_') || `${variantKey}.jpg`;
  const key = `cccd-uploads/${type}/restoration/${processingLogId}/${variantKey}-${safeName}`;

  await c.env.R2.put(key, buffer, {
    httpMetadata: { contentType: file.type || 'image/jpeg' },
    customMetadata: {
      type,
      studentId: studentId || '',
      processingLogId: String(processingLogId),
      variantKey,
      uploadedAt: new Date().toISOString(),
    },
  });

  return key;
}

function safeJsonParse(value: string | null | undefined) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
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
    const genderHint = String(formData.get('genderHint') || '').trim() || null;
    const processingMetaRaw = formData.get('processingMeta');
    const sourceOriginalFile = readOptionalFormFile(formData.get('sourceOriginal'));
    const normalizedOriginalFile = readOptionalFormFile(formData.get('normalizedOriginal'));
    const ocrRestoreBalancedFile = readOptionalFormFile(formData.get('ocrRestoreBalanced'));
    const ocrRestoreTextPriorityFile = readOptionalFormFile(formData.get('ocrRestoreTextPriority'));
    let processingMeta: Record<string, any> | null = null;

    if (typeof processingMetaRaw === 'string' && processingMetaRaw.trim()) {
      try {
        processingMeta = JSON.parse(processingMetaRaw);
      } catch (metaError) {
        console.warn('[cccd-upload] invalid processingMeta payload:', metaError);
      }
    }

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
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).bind(
        studentId || null,
        type,
        uploadResult.imageId,
        uploadResult.imageId,
        type === 'photo_3x4' ? 'processing' : 'pending',
        type === 'photo_3x4' ? 'processing' : null,
        'uploaded',
        type === 'photo_3x4' ? 5 : 0,
        type === 'photo_3x4'
          ? (c.env.PHOTO_3X4_PIPELINE_VERSION || PIPELINE_VERSION)
          : PIPELINE_VERSION,
      ).run();

      processingLogId = Number(inserted.meta.last_row_id || 0) || null;
    } catch (logError) {
      console.warn('[cccd-upload] failed to create processing log:', logError);
    }

    const auxiliaryImageIds: Record<string, string | null> = {
      sourceOriginal: null,
      normalizedOriginal: null,
      ocrRestoreBalanced: null,
      ocrRestoreTextPriority: null,
    };

    if (
      processingLogId
      && (type === 'cccd_front' || type === 'cccd_back')
      && (sourceOriginalFile || normalizedOriginalFile || ocrRestoreBalancedFile || ocrRestoreTextPriorityFile)
    ) {
      const auxiliaryFiles: Array<[string, File | null]> = [
        ['sourceOriginal', sourceOriginalFile],
        ['normalizedOriginal', normalizedOriginalFile],
        ['ocrRestoreBalanced', ocrRestoreBalancedFile],
        ['ocrRestoreTextPriority', ocrRestoreTextPriorityFile],
      ];

      for (const [variantKey, variantFile] of auxiliaryFiles) {
        if (!variantFile) continue;
        const auxiliaryValidation = validateImageFile(variantFile, 12);
        if (!auxiliaryValidation.valid) {
          console.warn(`[cccd-upload] auxiliary file rejected (${variantKey}):`, auxiliaryValidation.errors);
          continue;
        }

        try {
          auxiliaryImageIds[variantKey] = await storeAuxiliaryDocumentVariant(
            c,
            variantFile,
            type,
            processingLogId,
            variantKey,
            studentId,
          );
        } catch (auxiliaryError) {
          console.warn(`[cccd-upload] failed to store auxiliary ${variantKey}:`, auxiliaryError);
        }
      }
    }

    if (type === 'photo_3x4') {
      if (!processingLogId || !previewUrl) {
        throw new Error('Khong the khoi tao xu ly anh 3x4.');
      }

      const queueMessage = {
        processingLogId,
        originalImageId: uploadResult.imageId,
        sourceUrl: buildPipelineSourceUrl(c, uploadResult.imageId),
        studentId,
        genderHint,
      };
      const queued = await enqueuePhoto3x4Pipeline(c.env, queueMessage);

      if (!queued) {
        await runPhoto3x4Pipeline(c.env, queueMessage);
      }

      const initialStatus = queued
        ? await getPhoto3x4ProcessingStatus(c.env, processingLogId, new URL(c.req.url).origin)
        : await getPhoto3x4ProcessingStatus(c.env, processingLogId, new URL(c.req.url).origin);

      return c.json({
        success: true,
        processingLogId,
        imageId: null,
        previewUrl: previewUrl,
        sourcePreviewUrl: initialStatus?.sourcePreviewUrl || previewUrl,
        candidatePreviewUrl: initialStatus?.candidatePreviewUrl || null,
        finalPreviewUrl: null,
        status: queued ? 'processing' : (initialStatus?.status || 'awaiting_selection'),
        stage: queued ? 'queued' : (initialStatus?.stage || 'awaiting_selection'),
        pipelineStatus: queued ? 'processing' : (initialStatus?.status || 'awaiting_selection'),
        processingQueued: queued,
        selectionRequired: true,
        generationMode: null,
        warnings: initialStatus?.warnings || [],
        variants: initialStatus?.variants || [],
        selectedVariantId: initialStatus?.selectedVariantId || null,
        recommendedVariantId: initialStatus?.recommendedVariantId || null,
        message: queued
          ? 'Anh 3x4 dang duoc AI tao 3 phuong an de hoc vien lua chon.'
          : 'Anh 3x4 da san sang de hoc vien chon phuong an.',
      });
    }

    if (processingLogId && (type === 'cccd_front' || type === 'cccd_back')) {
      try {
        const warnings = Array.isArray(processingMeta?.qualityWarnings)
          ? processingMeta?.qualityWarnings.filter(Boolean)
          : [];
        const blockingReasons = Array.isArray(processingMeta?.blockingReasons)
          ? processingMeta?.blockingReasons.filter(Boolean)
          : [];
        const validationStatus = String(processingMeta?.validationStatus || '').trim();
        const qualityScore = Number.isFinite(Number(processingMeta?.qualityScore))
          ? Number(processingMeta?.qualityScore)
          : null;
        const detectionConfidence = Number.isFinite(Number(processingMeta?.detectionConfidence))
          ? Number(processingMeta?.detectionConfidence)
          : 0;
        const recommendedCandidate = String(processingMeta?.recommendedCandidate || processingMeta?.restorationMode || '').trim();
        const recommendedImageId = recommendedCandidate === 'ocr_restore_balanced'
          ? auxiliaryImageIds.ocrRestoreBalanced
          : recommendedCandidate === 'ocr_restore_text_priority'
            ? auxiliaryImageIds.ocrRestoreTextPriority
            : auxiliaryImageIds.normalizedOriginal;
        const candidateImageId = recommendedCandidate === 'ocr_restore_balanced'
          ? auxiliaryImageIds.ocrRestoreBalanced
          : recommendedCandidate === 'ocr_restore_text_priority'
            ? auxiliaryImageIds.ocrRestoreTextPriority
            : auxiliaryImageIds.normalizedOriginal;
        const finalStatus = validationStatus === 'blocked'
          ? 'needs_review'
          : warnings.length > 0
            ? 'needs_review'
            : 'success';
        const generationMode = processingMeta ? 'normalized_client' : 'manual_crop';
        const errorMessage = blockingReasons[0] || null;
        const detailPayload = {
          processingMeta: processingMeta || null,
          restorationArtifacts: auxiliaryImageIds,
          recommendedCandidate: recommendedCandidate || null,
          finalPreviewImageId: uploadResult.imageId,
          manualCropOnly: !processingMeta,
        };
        const validationPayload = JSON.stringify({
          ...(processingMeta || {}),
          warnings,
          blockingReasons,
          restorationArtifacts: auxiliaryImageIds,
          recommendedCandidate: recommendedCandidate || null,
        });

        await c.env.DB.prepare(`
          UPDATE image_processing_logs
          SET processing_status = ?,
              pipeline_stage = 'completed',
              progress_percent = 100,
              original_image_id = ?,
              processed_image_id = ?,
              candidate_image_id = ?,
              final_image_id = ?,
              ai_confidence_score = ?,
              quality_score = ?,
              error_message = ?,
              generation_mode = ?,
              used_as_primary = 1,
              warnings_json = ?,
              validation_result_json = ?,
              processing_details = ?,
              processing_completed_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).bind(
          finalStatus,
          auxiliaryImageIds.sourceOriginal || uploadResult.imageId,
          recommendedImageId || auxiliaryImageIds.normalizedOriginal || uploadResult.imageId,
          candidateImageId || auxiliaryImageIds.normalizedOriginal || uploadResult.imageId,
          uploadResult.imageId,
          detectionConfidence,
          qualityScore,
          errorMessage,
          generationMode,
          warnings.length > 0 ? JSON.stringify(warnings) : null,
          validationPayload,
          JSON.stringify(detailPayload),
          processingLogId,
        ).run();
      } catch (aiError) {
        console.warn('[cccd-upload] CCCD processing update failed:', aiError);
      }
    } else if (processingLogId) {
      await c.env.DB.prepare(`
        UPDATE image_processing_logs
        SET processing_status = 'success',
            pipeline_stage = 'completed',
            progress_percent = 100,
            processed_image_id = ?,
            candidate_image_id = ?,
            final_image_id = ?,
            generation_mode = 'original',
            used_as_primary = 1,
            processing_completed_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(
        uploadResult.imageId,
        uploadResult.imageId,
        uploadResult.imageId,
        processingLogId,
      ).run();
    }

    return c.json({
      success: true,
      imageId: uploadResult.imageId,
      processingLogId,
      previewUrl,
      warnings: Array.isArray(processingMeta?.qualityWarnings) ? processingMeta?.qualityWarnings : [],
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

app.post('/photo-3x4/:logId/select', async (c) => {
  try {
    const logId = Number(c.req.param('logId'));
    const body = await c.req.json().catch(() => null) as { variantId?: number | string } | null;
    const variantId = Number(body?.variantId);

    if (!Number.isFinite(logId) || logId <= 0 || !Number.isFinite(variantId) || variantId <= 0) {
      return c.json({
        success: false,
        error: 'Missing or invalid logId/variantId.',
      }, 400);
    }

    const result = await selectPhoto3x4Variant(c.env, logId, variantId);
    return c.json(result);
  } catch (error: any) {
    console.error('[cccd-upload] select photo_3x4 variant error:', error);
    return c.json({
      success: false,
      error: error?.message || 'Khong the chon anh 3x4.',
    }, 500);
  }
});

app.post('/photo-3x4/:logId/regenerate', async (c) => {
  try {
    const logId = Number(c.req.param('logId'));
    if (!Number.isFinite(logId) || logId <= 0) {
      return c.json({
        success: false,
        error: 'Invalid processing log id.',
      }, 400);
    }

    await regeneratePhoto3x4Pipeline(c.env, logId, new URL(c.req.url).origin);
    const status = await getPhoto3x4ProcessingStatus(c.env, logId, new URL(c.req.url).origin);

    return c.json({
      success: true,
      processingLogId: logId,
      status: status?.status || 'processing',
      stage: status?.stage || 'queued',
      selectionRequired: true,
      sourcePreviewUrl: status?.sourcePreviewUrl || null,
      candidatePreviewUrl: status?.candidatePreviewUrl || null,
      previewUrl: status?.previewUrl || status?.sourcePreviewUrl || null,
      variants: status?.variants || [],
      selectedVariantId: status?.selectedVariantId || null,
      recommendedVariantId: status?.recommendedVariantId || null,
    });
  } catch (error: any) {
    console.error('[cccd-upload] regenerate photo_3x4 error:', error);
    return c.json({
      success: false,
      error: error?.message || 'Khong the tao lai anh 3x4.',
    }, 500);
  }
});

app.post('/extract', async (c) => {
  try {
    const body = await c.req.json().catch(() => null) as { imageId?: string; type?: string } | null;
    const imageId = body?.imageId?.trim();
    const type = body?.type;

    if (!imageId || !type) {
      return c.json({ success: false, error: 'Missing imageId or type.' }, 400);
    }

    if (type !== 'cccd_front' && type !== 'cccd_back') {
      return c.json({ success: false, error: 'OCR only supports cccd_front and cccd_back.' }, 400);
    }

    const logRow = await c.env.DB.prepare(`
      SELECT *
      FROM image_processing_logs
      WHERE final_image_id = ?
         OR processed_image_id = ?
         OR original_image_id = ?
         OR candidate_image_id = ?
      ORDER BY id DESC
      LIMIT 1
    `).bind(imageId, imageId, imageId, imageId).first<Record<string, string | null>>();

    const processingDetails = safeJsonParse(logRow?.processing_details || null) as Record<string, any> | null;
    const validationDetails = safeJsonParse(logRow?.validation_result_json || null) as Record<string, any> | null;
    const restorationArtifacts = (
      processingDetails?.restorationArtifacts
      || validationDetails?.restorationArtifacts
      || {}
    ) as Record<string, string | null>;
    const recommendedCandidate = String(
      processingDetails?.recommendedCandidate
      || validationDetails?.recommendedCandidate
      || validationDetails?.restorationMode
      || '',
    ).trim();

    const candidateInputs = [
      restorationArtifacts.sourceOriginal
        ? { imageId: restorationArtifacts.sourceOriginal, label: 'source original', mode: 'source_original' }
        : null,
      restorationArtifacts.normalizedOriginal
        ? { imageId: restorationArtifacts.normalizedOriginal, label: 'normalized original', mode: 'normalized_original' }
        : null,
      recommendedCandidate === 'ocr_restore_balanced' && restorationArtifacts.ocrRestoreBalanced
        ? { imageId: restorationArtifacts.ocrRestoreBalanced, label: 'recommended balanced restore', mode: 'ocr_restore_balanced' }
        : null,
      recommendedCandidate === 'ocr_restore_text_priority' && restorationArtifacts.ocrRestoreTextPriority
        ? { imageId: restorationArtifacts.ocrRestoreTextPriority, label: 'recommended text restore', mode: 'ocr_restore_text_priority' }
        : null,
      restorationArtifacts.ocrRestoreBalanced
        ? { imageId: restorationArtifacts.ocrRestoreBalanced, label: 'balanced restore', mode: 'ocr_restore_balanced' }
        : null,
      restorationArtifacts.ocrRestoreTextPriority
        ? { imageId: restorationArtifacts.ocrRestoreTextPriority, label: 'text priority restore', mode: 'ocr_restore_text_priority' }
        : null,
      { imageId, label: 'final uploaded', mode: 'final_uploaded' },
    ].filter(Boolean) as Array<{ imageId: string; label: string; mode: string }>;

    const { prefill, model, debug, arbitration } = candidateInputs.length > 1
      ? await extractRegistrationPrefillFromCandidates(c.env, candidateInputs, type)
      : await extractRegistrationPrefillFromImage(c.env, imageId, type).then((result) => ({
        ...result,
        arbitration: {
          selectedImageId: imageId,
          selectedMode: 'single',
          selectedLabel: 'single',
          conflictFields: [],
          candidates: [{
            imageId,
            label: 'single',
            mode: 'single',
            success: true,
            score: 0,
            prefill: result.prefill,
            debug: result.debug,
          }],
        },
      }));

    const hasUsefulData = Boolean(
      prefill.cccd
      || prefill.fullName
      || prefill.dateOfBirth
      || prefill.gender
      || prefill.ethnicity
      || prefill.issueDate
      || prefill.placeOfOrigin
      || prefill.placeOfResidence,
    );

    if (!hasUsefulData) {
      return c.json({
        success: true,
        warning: `OCR did not extract useful fields. Status: ${debug.ocrSpaceStatus}`,
        data: { prefill, model, type, hasUsefulData: false, debug, arbitration },
      });
    }

    const missingCriticalFields = getMissingCriticalFields(prefill, type);

    if (type === 'cccd_front' && missingCriticalFields.length > 0) {
      return c.json({
        success: true,
        warning: 'OCR front is still missing CCCD, full name, or date of birth after safe restoration.',
        data: { prefill, model, type, hasUsefulData: true, isComplete: false, missingCriticalFields, debug, arbitration },
      });
    }

    if (type === 'cccd_back' && missingCriticalFields.length > 0) {
      return c.json({
        success: true,
        warning: 'OCR back is still missing issue date after safe restoration.',
        data: { prefill, model, type, hasUsefulData: true, isComplete: false, missingCriticalFields, debug, arbitration },
      });
    }

    return c.json({
      success: true,
      data: { prefill, model, type, hasUsefulData, isComplete: true, missingCriticalFields: [], debug, arbitration },
    });
  } catch (error: any) {
    const errorMessage = error?.message || String(error);
    console.error('[cccd-upload] OCR extract error:', errorMessage);
    return c.json({
      success: true,
      warning: `OCR failed: ${errorMessage.slice(0, 120)}`,
      data: {
        prefill: buildEmptyOCRPrefill(),
        model: 'unavailable',
        type: null,
        hasUsefulData: false,
      },
    });
  }
});

app.get('/status/:logId', async (c) => {
  try {
    const logId = c.req.param('logId');
    const status = await getPhoto3x4ProcessingStatus(c.env, logId, new URL(c.req.url).origin);

    if (!status) {
      return c.json({
        success: false,
        error: 'Processing log not found.',
      }, 404);
    }

    return c.json(status);
  } catch (error: any) {
    console.error('[cccd-upload] status error:', error);
    return c.json({
      success: false,
      error: error?.message || 'Status check failed.',
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
