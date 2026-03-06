import { Hono } from 'hono';
import { requireAdmin, requireAuth } from '../middleware/auth-middleware.js';
import {
    uploadToCloudflareImages,
    validateImageFile,
    calculateExpiryDatetime,
    generateSignedImageURL
} from '../utils/cloudflare-images.js';

const app = new Hono();

/**
 * POST /api/cccd-upload
 * Upload CCCD or 3x4 photo to Cloudflare Images
 * Public endpoint — sinh viên chưa có tài khoản vẫn cần upload ảnh khi đăng ký lần đầu.
 * Rate-limited tại middleware level.
 *
 * Body (multipart/form-data):
 * - image: File (JPEG/PNG/HEIC, max 10MB)
 * - type: 'cccd_front' | 'cccd_back' | 'photo_3x4'
 * - studentId: Integer (optional, for linking to student)
 *
 * Response:
 * - success: boolean
 * - imageId: string (Cloudflare Images ID or R2 key)
 * - processingLogId: integer (for tracking AI processing)
 */
app.post('/', async (c) => {
    try {
        // Parse form data
        const formData = await c.req.formData();
        const file = formData.get('image');
        const type = formData.get('type');
        const studentId = formData.get('studentId');

        // Check configuration - fallback to R2 if Cloudflare Images not configured
        const useCloudflareImages = c.env.CLOUDFLARE_IMAGES_API_TOKEN && c.env.CLOUDFLARE_ACCOUNT_ID;
        const useR2Fallback = !useCloudflareImages && c.env.R2;
        
        if (!useCloudflareImages && !useR2Fallback) {
            console.error('Missing Cloudflare Images configuration and R2 fallback');
            return c.json({
                success: false,
                error: 'Server configuration error: Missing Cloudflare Images credentials. Please contact administrator.'
            }, 500);
        }

        // Validate type
        const validTypes = ['cccd_front', 'cccd_back', 'photo_3x4'];
        if (!validTypes.includes(type)) {
            return c.json({
                success: false,
                error: 'Invalid image type. Must be: cccd_front, cccd_back, or photo_3x4'
            }, 400);
        }

        // Validate file
        const validation = validateImageFile(file, 10);
        if (!validation.valid) {
            return c.json({
                success: false,
                error: 'File validation failed',
                details: validation.errors
            }, 400);
        }

        // Prepare metadata
        const metadata = {
            type,
            uploadedAt: new Date().toISOString(),
            studentId: studentId || null,
            originalFilename: file.name
        };

        let uploadResult;
        
        if (useCloudflareImages) {
            // Upload to Cloudflare Images
            uploadResult = await uploadToCloudflareImages(
                c.env,
                file,
                metadata,
                true // requireSignedURLs = true (private images)
            );

            if (!uploadResult.success) {
                throw new Error('Upload to Cloudflare Images failed');
            }
        } else {
            // Fallback: Upload to R2
            const fileBuffer = await file.arrayBuffer();
            const timestamp = Date.now();
            const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
            const r2Key = `cccd-uploads/${type}/${timestamp}-${sanitizedFileName}`;
            
            await c.env.R2.put(r2Key, fileBuffer, {
                httpMetadata: {
                    contentType: file.type || 'image/jpeg',
                },
                customMetadata: metadata
            });
            
            // Generate URL using the API endpoint (we'll create a GET endpoint to serve images)
            const urlObj = new URL(c.req.url);
            const baseUrl = urlObj.origin;
            const r2Url = `${baseUrl}/cccd-upload/image/${encodeURIComponent(r2Key)}`;
            
            uploadResult = {
                success: true,
                imageId: r2Key, // Use R2 key as imageId
                url: r2Url
            };
        }

        // Create processing log entry (optional - don't fail if table doesn't exist)
        let processingLogId = null;
        try {
            const processingLog = await c.env.DB.prepare(`
                INSERT INTO image_processing_logs 
                (student_id, image_type, original_image_id, processing_status, processing_started_at)
                VALUES (?, ?, ?, 'pending', CURRENT_TIMESTAMP)
            `).bind(
                studentId || null,
                type,
                uploadResult.imageId
            ).run();

            processingLogId = processingLog.meta.last_row_id;
        } catch (logError) {
            console.warn('Failed to create processing log (table may not exist):', logError);
            // Continue without logging - not critical
        }

        // If it's a CCCD image, we'll trigger AI processing (optional - don't fail if errors)
        if (processingLogId && (type === 'cccd_front' || type === 'cccd_back')) {
            try {
                // Phase 2: AI Detection (optional)
                let signedUrl;
                if (useCloudflareImages) {
                    signedUrl = await generateSignedImageURL(c.env, uploadResult.imageId, 5);
                } else {
                    signedUrl = uploadResult.url;
                }

                // 2. Call AI Detector (optional - don't fail if not available)
                try {
                    const { detectAndCropCCCD } = await import('../workers-ai/cccd-detector.js');
                    const aiResult = await detectAndCropCCCD(c.env, signedUrl);

                    console.log(`AI Detection Result for ${type}:`, aiResult);

                    const status = aiResult.success ? 'success' : 'needs_review';
                    const errorMessage = aiResult.success ? null : (aiResult.reason || aiResult.error);

                    await c.env.DB.prepare(`
                        UPDATE image_processing_logs 
                        SET processing_status = ?,
                            processed_image_id = ?, 
                            ai_confidence_score = ?,
                            error_message = ?,
                            processing_completed_at = CURRENT_TIMESTAMP
                        WHERE id = ?
                    `).bind(
                        status,
                        uploadResult.imageId,
                        aiResult.score || 0,
                        errorMessage,
                        processingLogId
                    ).run();
                } catch (aiError) {
                    console.warn('AI Detection not available (non-critical):', aiError);
                    // Continue without AI - not critical for upload success
                }

            } catch (aiError) {
                console.warn('AI Processing Error (non-critical):', aiError);
                // Don't fail the upload if AI processing fails
            }
        } else if (processingLogId) {
            // Photo 3x4 doesn't need AI processing
            try {
                await c.env.DB.prepare(`
                    UPDATE image_processing_logs 
                    SET processing_status = 'success',
                        processed_image_id = ?,
                        processing_completed_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                `).bind(uploadResult.imageId, processingLogId).run();
            } catch (updateError) {
                console.warn('Failed to update processing log (non-critical):', updateError);
                // Continue - not critical
            }
        }

        // Return success with image ID
        return c.json({
            success: true,
            imageId: uploadResult.imageId,
            processingLogId,
            message: 'Image uploaded successfully'
        });

    } catch (error) {
        console.error('CCCD upload error:', error);
        return c.json({
            success: false,
            error: error.message || 'Upload failed'
        }, 500);
    }
});

/**
 * GET /api/cccd-upload/status/:logId
 * Check processing status of an uploaded image
 */
app.get('/status/:logId', async (c) => {
    try {
        const logId = c.req.param('logId');

        const log = await c.env.DB.prepare(`
      SELECT 
        id,
        image_type,
        processing_status,
        ai_confidence_score,
        quality_score,
        error_message,
        processing_started_at,
        processing_completed_at
      FROM image_processing_logs
      WHERE id = ?
    `).bind(logId).first();

        if (!log) {
            return c.json({
                success: false,
                error: 'Processing log not found'
            }, 404);
        }

        return c.json({
            success: true,
            status: log.processing_status,
            imageType: log.image_type,
            aiConfidence: log.ai_confidence_score,
            qualityScore: log.quality_score,
            errorMessage: log.error_message,
            startedAt: log.processing_started_at,
            completedAt: log.processing_completed_at
        });

    } catch (error) {
        console.error('Status check error:', error);
        return c.json({
            success: false,
            error: error.message
        }, 500);
    }
});

/**
 * GET /api/cccd-upload/image/:key
 * Serve image from R2 (fallback when Cloudflare Images not configured)
 * Requires admin auth — CCCD images are sensitive PII
 */
app.get('/image/:key', requireAdmin, async (c) => {
    try {
        const key = decodeURIComponent(c.req.param('key'));
        
        // Get object from R2
        const object = await c.env.R2.get(key);
        
        if (!object) {
            return c.json({
                success: false,
                error: 'Image not found'
            }, 404);
        }
        
        // Get content type from metadata
        const contentType = object.httpMetadata?.contentType || 'image/jpeg';
        
        // Return image with proper headers
        return new Response(object.body, {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=31536000',
            }
        });
        
    } catch (error) {
        console.error('Image serve error:', error);
        return c.json({
            success: false,
            error: error.message
        }, 500);
    }
});

/**
 * DELETE /api/cccd-upload/:imageId
 * Delete an uploaded image (admin only)
 */
app.delete('/:imageId', requireAdmin, async (c) => {
    try {
        const imageId = c.req.param('imageId');

        // Delete from Cloudflare Images
        const { deleteCloudflareImage } = await import('../utils/cloudflare-images.js');
        const deleted = await deleteCloudflareImage(c.env, imageId);

        if (!deleted) {
            throw new Error('Failed to delete image from Cloudflare');
        }

        // Update processing log
        await c.env.DB.prepare(`
      UPDATE image_processing_logs 
      SET processing_status = 'deleted'
      WHERE original_image_id = ? OR processed_image_id = ?
    `).bind(imageId, imageId).run();

        return c.json({
            success: true,
            message: 'Image deleted successfully'
        });

    } catch (error) {
        console.error('Image deletion error:', error);
        return c.json({
            success: false,
            error: error.message
        }, 500);
    }
});

export default app;
