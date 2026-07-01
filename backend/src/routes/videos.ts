import { Hono } from 'hono';
import type { Env, JWTPayload } from '../types/env.js';
import { jsonResponse, errorResponse, verifyJWT } from '../utils/helpers.js';
import { getStudentRegistrations } from '../db/queries.js';
import { getClassTeachers } from '../db/class-teacher-queries.js';

const videos = new Hono<{ Bindings: Env; Variables: { user: JWTPayload } }>();

// ========================================
// R2 Presigned URL Helper (S3-compatible)
// ========================================

/**
 * Create a presigned URL for R2 object access
 * Uses HMAC-SHA256 signing compatible with S3 Signature Version 4
 */
async function createR2PresignedUrl({
  accountId,
  bucketName,
  objectKey,
  accessKeyId,
  secretAccessKey,
  expiresIn = 900, // 15 minutes default
}: {
  accountId: string;
  bucketName: string;
  objectKey: string;
  accessKeyId: string;
  secretAccessKey: string;
  expiresIn?: number;
}): Promise<string> {
  // Ensure object key doesn't start with /
  const key = objectKey.replace(/^\/+/, '');

  const region = 'auto';
  const service = 's3';
  const host = `${accountId}.r2.cloudflarestorage.com`;
  const method = 'GET';

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '').slice(0, 15) + 'Z';
  const dateStamp = amzDate.slice(0, 8);

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const credential = `${accessKeyId}/${credentialScope}`;

  // Query parameters for presigned URL
  const queryParams = new URLSearchParams({
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': credential,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': String(expiresIn),
    'X-Amz-SignedHeaders': 'host',
  });

  // Sort query parameters alphabetically
  const sortedParams = new URLSearchParams([...queryParams.entries()].sort());
  const canonicalQueryString = sortedParams.toString();

  // Create canonical request
  const canonicalUri = '/' + encodeURIComponent(bucketName) + '/' + key.split('/').map(encodeURIComponent).join('/');
  const canonicalHeaders = `host:${host}\n`;
  const signedHeadersList = 'host';

  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeadersList,
    'UNSIGNED-PAYLOAD',
  ].join('\n');

  // Create string to sign
  const canonicalRequestHash = await sha256Hex(canonicalRequest);
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    canonicalRequestHash,
  ].join('\n');

  // Calculate signature
  const signingKey = await getSignatureKey(secretAccessKey, dateStamp, region, service);
  const signature = await hmacHex(signingKey, stringToSign);

  // Build final URL
  const presignedUrl = `https://${host}${canonicalUri}?${canonicalQueryString}&X-Amz-Signature=${signature}`;

  return presignedUrl;
}

/**
 * Calculate SHA256 hash and return hex string
 */
async function sha256Hex(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return arrayBufferToHex(hashBuffer);
}

/**
 * Calculate HMAC-SHA256 and return hex string
 */
async function hmacHex(key: ArrayBuffer, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(message));
  return arrayBufferToHex(signature);
}

/**
 * Calculate HMAC-SHA256 and return ArrayBuffer
 */
async function hmacRaw(key: string | ArrayBuffer, message: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const keyData = typeof key === 'string' ? encoder.encode(key) : key;
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(message));
}

/**
 * Derive the signing key for AWS Signature Version 4
 */
async function getSignatureKey(secretKey: string, dateStamp: string, region: string, service: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const kDate = await hmacRaw('AWS4' + secretKey, dateStamp);
  const kRegion = await hmacRaw(kDate, region);
  const kService = await hmacRaw(kRegion, service);
  const kSigning = await hmacRaw(kService, 'aws4_request');
  return kSigning;
}

/**
 * Convert ArrayBuffer to hex string
 */
function arrayBufferToHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)]
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// ========================================
// Helper: Auth + membership check
// ========================================

async function getUserFromRequest(c: any) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader) {
    return { error: errorResponse('Thiếu token xác thực', 401) };
  }

  const token = authHeader.replace('Bearer ', '');
  const payload = await verifyJWT(token, c.env.JWT_SECRET);

  if (!payload) {
    return { error: errorResponse('Token không hợp lệ hoặc đã hết hạn', 401) };
  }

  return { user: payload };
}

async function ensureCanAccessClass(c: any, classId: string, user: any) {
  // Admin / super_admin: cho qua
  if (user.role === 'admin' || user.role === 'super_admin') {
    return { allowed: true };
  }

  // Học viên: kiểm tra có đăng ký lớp không
  if (user.type === 'student' && user.id) {
    const registrations = await getStudentRegistrations(c.env.DB, user.id);
    const hasClass = registrations.some(
      (r: any) =>
        String(r.class_id) === String(classId) ||
        String(r.id) === String(classId)
    );

    if (!hasClass) {
      return { error: errorResponse('Bạn không thuộc lớp này', 403) };
    }
    return { allowed: true };
  }

  // Giáo viên: kiểm tra được phân công lớp
  if (user.role === 'teacher' && user.id) {
    const parsedClassId = parseInt(classId);
    if (isNaN(parsedClassId)) return { error: errorResponse('classId không hợp lệ', 400) };
    const teacherClasses = await getClassTeachers(c.env.DB, parsedClassId);
    const assigned = (teacherClasses.results || []).some(
      (row: any) => String(row.teacher_id) === String(user.id)
    );
    if (!assigned) {
      return { error: errorResponse('Giáo viên không phụ trách lớp này', 403) };
    }
    return { allowed: true };
  }

  return { error: errorResponse('Không có quyền truy cập lớp này', 403) };
}

// ========================================
// GET /classes/:class_id/videos
// Trả danh sách video của lớp (KHÔNG có URL thật)
// ========================================

videos.get('/classes/:class_id/videos', async (c) => {
  try {
    const classId = c.req.param('class_id');

    const { user, error } = await getUserFromRequest(c);
    if (error) return error;

    const membership = await ensureCanAccessClass(c, classId, user);
    if (membership.error) return membership.error;

    const stmt = c.env.DB.prepare(
      `SELECT id, title, duration, created_at
       FROM class_videos
       WHERE class_id = ?
       ORDER BY created_at DESC`
    ).bind(classId);

    const result = await stmt.all();

    return jsonResponse({
      success: true,
      data: result.results || [],
    });
  } catch (err) {
    console.error('Error fetching class videos:', err);
    return errorResponse('Lỗi khi lấy danh sách video', 500);
  }
});

// ========================================
// POST /videos/:video_id/play
// Trả signed URL tạm thời để xem video
// ========================================

videos.post('/videos/:video_id/play', async (c) => {
  try {
    const videoId = c.req.param('video_id');

    const { user, error } = await getUserFromRequest(c);
    if (error) return error;

    // Lấy metadata video
    const video = await c.env.DB.prepare(
      `SELECT id, class_id, r2_key
       FROM class_videos
       WHERE id = ?`
    ).bind(videoId).first();

    if (!video) {
      return errorResponse('Không tìm thấy video', 404);
    }

    // Kiểm tra quyền truy cập lớp
    const membership = await ensureCanAccessClass(c, (video as any).class_id, user);
    if (membership.error) return membership.error;

    // ========================================
    // TẠO PRESIGNED URL THẬT SỰ (S3-compatible)
    // ========================================

    const TTL_SECONDS = 900; // 15 phút

    // Kiểm tra cấu hình R2 credentials
    const accountId = c.env.CLOUDFLARE_ACCOUNT_ID;
    const accessKeyId = c.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = c.env.R2_SECRET_ACCESS_KEY;
    const bucketName = 'class-videos';

    if (!accountId || !accessKeyId || !secretAccessKey) {
      console.error('R2 credentials not configured:', {
        accountId: !!accountId,
        accessKeyId: !!accessKeyId,
        secretAccessKey: !!secretAccessKey
      });
      return errorResponse('Video service chưa được cấu hình đầy đủ. Vui lòng liên hệ admin.', 500);
    }

    try {
      const playUrl = await createR2PresignedUrl({
        accountId,
        bucketName,
        objectKey: (video as any).r2_key,
        accessKeyId,
        secretAccessKey,
        expiresIn: TTL_SECONDS,
      });

      console.log(`Generated presigned URL for video ${videoId}, user ${(user as any).id || (user as any).cccd}, expires in ${TTL_SECONDS}s`);

      return jsonResponse({
        success: true,
        data: {
          play_url: playUrl,
          expires_in: TTL_SECONDS,
        },
      });
    } catch (signError) {
      console.error('Error creating presigned URL:', signError);
      return errorResponse('Không thể tạo link xem video. Vui lòng thử lại sau.', 500);
    }
  } catch (err) {
    console.error('Error generating play URL:', err);
    return errorResponse('Lỗi khi tạo link xem video', 500);
  }
});

// ========================================
// ADMIN: Insert video metadata (for upload workflow)
// ========================================

videos.post('/admin/videos', async (c) => {
  try {
    const { user, error } = await getUserFromRequest(c);
    if (error) return error;

    // Only admin/super_admin can add videos
    if ((user as any).role !== 'admin' && (user as any).role !== 'super_admin') {
      return errorResponse('Chỉ admin mới có quyền thêm video', 403);
    }

    const body = await c.req.json();
    const { class_id, title, r2_key, duration } = body;

    if (!class_id || !r2_key) {
      return errorResponse('Thiếu thông tin bắt buộc: class_id, r2_key', 400);
    }

    // Generate UUID for video id
    const id = crypto.randomUUID();

    await c.env.DB.prepare(
      `INSERT INTO class_videos (id, class_id, title, r2_key, duration, created_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`
    ).bind(id, class_id, title || null, r2_key, duration || null).run();

    return jsonResponse({
      success: true,
      message: 'Video đã được thêm thành công',
      data: { id, class_id, title, r2_key, duration },
    });
  } catch (err) {
    console.error('Error adding video:', err);
    return errorResponse('Lỗi khi thêm video', 500);
  }
});

// ========================================
// ADMIN: Delete video metadata
// ========================================

videos.delete('/admin/videos/:video_id', async (c) => {
  try {
    const { user, error } = await getUserFromRequest(c);
    if (error) return error;

    // Only admin/super_admin can delete videos
    if ((user as any).role !== 'admin' && (user as any).role !== 'super_admin') {
      return errorResponse('Chỉ admin mới có quyền xóa video', 403);
    }

    const videoId = c.req.param('video_id');

    // Get video info first (for optional R2 cleanup)
    const video = await c.env.DB.prepare(
      `SELECT id, r2_key FROM class_videos WHERE id = ?`
    ).bind(videoId).first();

    if (!video) {
      return errorResponse('Không tìm thấy video', 404);
    }

    // Delete from D1
    await c.env.DB.prepare(
      `DELETE FROM class_videos WHERE id = ?`
    ).bind(videoId).run();

    // Optionally delete from R2 (uncomment if needed)
    // try {
    //   await c.env.VIDEO_BUCKET.delete(video.r2_key);
    // } catch (r2Err) {
    //   console.warn('Could not delete from R2:', r2Err);
    // }

    return jsonResponse({
      success: true,
      message: 'Video đã được xóa thành công',
    });
  } catch (err) {
    console.error('Error deleting video:', err);
    return errorResponse('Lỗi khi xóa video', 500);
  }
});

export default videos;
