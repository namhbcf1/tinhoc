import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './types/env.js';
import auth from './routes/auth.js';
import students from './routes/students.js';
import classes from './routes/classes.js';
import registrations from './routes/registrations.js';
import exportRoute from './routes/export.js';
import documents from './routes/documents.js';
import documentFolders from './routes/document-folders.js';
import payments from './routes/payments.js';
import certificates from './routes/certificates.js';
import shipping from './routes/shipping.js';
import posts from './routes/posts.js';
import homepage from './routes/homepage.js';
import notifications from './routes/notifications.js';
import reports from './routes/reports.js';
import admins from './routes/admins.js';
import activityLogs from './routes/activity-logs.js';
import backup from './routes/backup.js';
import messaging from './routes/messaging.js';
import attendance from './routes/attendance.js';
import examSchedules from './routes/exam-schedules.js';
import teachers from './routes/teachers.js';
import classSchedules from './routes/class-schedules.js';
import classTeachers from './routes/class-teachers.js';
import templates from './routes/templates.js';
import cccdUpload from './routes/cccd-upload.js';
import onlineClasses from './routes/online-classes.js';
import videos from './routes/videos.js';
import assignments from './routes/assignments.js';
import studentReviews from './routes/student-reviews.js';
import studentFeedbacks from './routes/student-feedbacks.js';
import publicStudentFeedbacks from './routes/public-student-feedbacks.js';
import examCategories from './routes/exam-categories.js';
import examTypes from './routes/exam-types.js';
import programOrganizers from './routes/program-organizers.js';
import programs from './routes/programs.js';
import programLevels from './routes/program-levels.js';
import fieldDefinitions from './routes/field-definitions.js';
import fieldOptions from './routes/field-options.js';
import sync from './routes/sync.js';
import sso from './routes/sso.js';
import adminTeaching from './routes/admin-teaching.js';
import ai from './routes/ai.js';
import errors from './routes/errors.js';
// import migrate from './routes/migrate.js';
import { handlePhoto3x4Queue } from './services/photo-3x4-pipeline.js';
import { errorResponse } from './utils/helpers.js';
import { moderateRateLimiter, strictRateLimiter } from './utils/rate-limiter.js';
import { authMiddleware, requireAdmin, requireAuth } from './middleware/auth-middleware.js';
import { globalErrorHandler } from './middleware/error-handler.js';

// ========================================
// MAIN APP
// ========================================

const app = new Hono<{ Bindings: Env }>();
const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const PUBLIC_CACHEABLE_PATHS = [
  '/classes/open',
  '/posts',
  '/homepage/settings',
  '/exam-categories',
  '/exam-types',
  '/certificates/lookup',
  '/public/student-feedbacks',
];

export function resolveDefaultCacheControl(
  request: Pick<Request, 'method' | 'url' | 'headers'>,
  hasExistingCacheControl = false,
): string | null {
  if (request.method !== 'GET' || hasExistingCacheControl) {
    return null;
  }

  const path = new URL(request.url).pathname;
  const hasAuthContext = Boolean(
    request.headers.get('Authorization') || request.headers.get('X-Student-CCCD'),
  );
  const isPublic = PUBLIC_CACHEABLE_PATHS.some((publicPath) => path.includes(publicPath));

  if (isPublic && !hasAuthContext) {
    return 'public, max-age=120, s-maxage=300, stale-while-revalidate=600';
  }

  return 'private, no-store, max-age=0, must-revalidate';
}

function isReadOnlyModeEnabled(value: string | undefined) {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
}

// ========================================
// MIDDLEWARE
// ========================================

// CORS - Whitelist allowed origins
const ALLOWED_ORIGINS = [
  'https://vantrangedu.com',
  'https://www.vantrangedu.com',
  'https://vantrangedu.pages.dev',
  'https://vantrangexam.pages.dev',
  'https://www.vantrangexam.pages.dev',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:4173'
];

app.use('/*', cors({
  origin: (origin) => {
    // Allow null origin for server-to-server / same-origin requests
    if (!origin) return null;
    if (ALLOWED_ORIGINS.includes(origin)) return origin;
    return null; // Reject unlisted origins
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  // CORS headers must include custom headers used by frontend (preflight)
  allowHeaders: ['Content-Type', 'Authorization', 'X-Student-CCCD'],
}));

// Global rate limiting
// Skip public image streaming routes to avoid broken avatars when many images load in parallel.
app.use('*', async (c, next) => {
  const path = new URL(c.req.url).pathname;
  if (
    c.req.method === 'GET' &&
    (path.startsWith('/students/image/') || path.startsWith('/cccd-upload/image/'))
  ) {
    return next();
  }
  return moderateRateLimiter(c, next);
});

// Request logging
app.use('*', async (c, next) => {
  console.log(`[${new Date().toISOString()}] ${c.req.method} ${c.req.url}`);
  await next();
  // Apply only a default Cache-Control policy for GET requests.
  // Do not override route-level caching, and never cache authenticated/sensitive GET responses.
  const cacheControl = resolveDefaultCacheControl(c.req.raw, c.res.headers.has('Cache-Control'));
  if (cacheControl) {
    c.header('Cache-Control', cacheControl);
  }
});

// Read-only safety switch for production DB operations during migration windows.
app.use('*', async (c, next) => {
  if (isReadOnlyModeEnabled(c.env.READ_ONLY_MODE) && MUTATING_METHODS.has(c.req.method)) {
    return c.json({
      success: false,
      error: 'Hệ thống đang ở chế độ read-only để bảo trì dữ liệu. Vui lòng thử lại sau.',
    }, 503);
  }
  return next();
});

// ========================================
// ROUTES
// ========================================

// Health check
app.get('/', (c) => {
  return c.json({
    service: 'Student Registration API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
  });
});

// Public routes
app.route('/auth', auth);
app.route('/sso', sso);

// Students: register + login + search are public; list/update/delete require auth
// Auth is enforced per-route inside students.js via the shared authMiddleware
app.route('/students', students);

// Classes: GET public, write ops (POST/PUT/DELETE) require admin
app.use('/classes/*', async (c, next) => {
  if (c.req.method === 'GET') return next();
  return requireAdmin(c as any, next);
});
app.use('/classes', async (c, next) => {
  if (c.req.method === 'GET') return next();
  return requireAdmin(c as any, next);
});
app.route('/classes', classes);

// Registrations: POST (student self-register) + GET public; write ops require admin
app.use('/registrations/*', async (c, next) => {
  if (c.req.method === 'GET' || c.req.method === 'POST') return next();
  return requireAdmin(c as any, next);
});
app.use('/registrations', async (c, next) => {
  if (c.req.method === 'GET' || c.req.method === 'POST') return next();
  return requireAdmin(c as any, next);
});
app.route('/registrations', registrations);

// Documents (tra cứu public, upload admin)
app.route('/documents', documents);
app.route('/document-folders', documentFolders);

// Payments (admin routes with auth + strict rate limiting)
app.use('/payments/*', strictRateLimiter);
app.use('/payments/*', authMiddleware);
app.route('/payments', payments);

// Certificates: only lookup/download/qr-code stay public; all admin data and shipment endpoints require admin
app.use('/certificates/*', async (c, next) => {
  if (c.req.method === 'GET') {
    const path = new URL(c.req.url).pathname;
    const isPublicGet = path === '/certificates/lookup'
      || /^\/certificates\/[^/]+\/download$/.test(path)
      || /^\/certificates\/[^/]+\/qr-code$/.test(path);
    if (isPublicGet) {
      return next();
    }
  }
  return requireAdmin(c as any, next);
});
app.use('/certificates', async (c, next) => {
  if (c.req.method === 'GET') {
    return requireAdmin(c as any, next);
  }
  return requireAdmin(c as any, next);
});
app.route('/certificates', certificates);

// Viettel Post shipping endpoints (admin only)
app.use('/shipping', requireAdmin);
app.use('/shipping/*', requireAdmin);
app.route('/shipping', shipping);

// Export route (admin only — contains full PII: CCCD, SĐT, ngày sinh)
app.use('/export/*', requireAdmin);
app.route('/export', exportRoute);

// Posts management (GET public, POST/PUT/DELETE requires admin auth)
const postsAuthMiddleware = async (c: any, next: any) => {
  // Allow public GET requests
  if (c.req.method === 'GET') {
    return next();
  }
  // Require auth for all other methods
  return authMiddleware(c, next);
};
app.use('/posts', postsAuthMiddleware);
app.use('/posts/*', postsAuthMiddleware);
app.route('/posts', posts);

// Homepage settings:
// - GET requests rely on the global moderate limiter to avoid over-throttling admin UI
// - write operations keep strict rate limiting
app.use('/homepage/*', authMiddleware);
app.use('/homepage/*', async (c, next) => {
  if (c.req.method === 'GET') {
    return next();
  }
  return strictRateLimiter(c, next);
});
app.route('/homepage', homepage);

// Notifications are personalized for admin/student sessions, so require auth for every method.
app.use('/notifications', requireAuth);
app.use('/notifications/*', requireAuth);
app.route('/notifications', notifications);

// Reports (admin only)
app.use('/reports/*', authMiddleware);
app.route('/reports', reports);

// Admin management (super_admin only)
app.use('/admins/*', authMiddleware);
app.route('/admins', admins);

// Activity logs (admin only)
app.use('/activity-logs/*', authMiddleware);
app.route('/activity-logs', activityLogs);

// Backup (super_admin only)
app.use('/backup/*', authMiddleware);
app.route('/backup', backup);

// Messaging (authenticated users)
app.use('/messaging/*', authMiddleware);
app.route('/messaging', messaging);

// Attendance (admin only)
app.use('/attendance/*', authMiddleware);
app.route('/attendance', attendance);

// Exam schedules (admin only) - apply auth to all routes including root
app.use('/exam-schedules*', authMiddleware);
app.route('/exam-schedules', examSchedules);

// Teachers routes (admin CRUD for teacher accounts, login redirects to /auth/login)
app.route('/teachers', teachers);

// Admin teaching routes (my-classes, my-schedule, my-exams for admin role='teacher')
app.route('/admin-teaching', adminTeaching);

// Class schedules: GET public, write ops require admin (teacher is admin now)
app.use('/class-schedules/*', async (c, next) => {
  if (c.req.method === 'GET') return next();
  return requireAdmin(c as any, next);
});
app.use('/class-schedules', async (c, next) => {
  if (c.req.method === 'GET') return next();
  return requireAdmin(c as any, next);
});
app.route('/class-schedules', classSchedules);

// Class teachers: GET public, write ops require admin
app.use('/class-teachers/*', async (c, next) => {
  if (c.req.method === 'GET') return next();
  return requireAdmin(c as any, next);
});
app.use('/class-teachers', async (c, next) => {
  if (c.req.method === 'GET') return next();
  return requireAdmin(c as any, next);
});
app.route('/class-teachers', classTeachers);

// Excel templates (public get for dropdown)
app.route('/templates', templates);

// CCCD Upload (POST requires student auth, GET image requires admin auth)
app.route('/cccd-upload', cccdUpload);

// Online Classes (public view, admin manage, student enroll)
app.route('/online-classes', onlineClasses);

// Assignments (teacher create, student submit)
app.route('/assignments', assignments);

// Student reviews (admin create/publish, student view own)
app.use('/student-reviews/*', authMiddleware);
app.route('/student-reviews', studentReviews);

// Student feedbacks (student submit/edit, admin review)
app.use('/student-feedbacks/*', authMiddleware);
app.use('/student-feedbacks', authMiddleware);
app.route('/student-feedbacks', studentFeedbacks);

// Public approved student feedbacks
app.route('/public/student-feedbacks', publicStudentFeedbacks);

// Class videos (student/teacher/admin with membership)
app.route('/', videos);


// Exam Categories — đồng bộ từ vantrangexam (DB chung), public GET
app.route('/exam-categories', examCategories);
app.route('/exam-types', examTypes);
app.use('/program-organizers', async (c, next) => {
  if (c.req.method === 'GET') return next();
  return authMiddleware(c as any, next);
});
app.use('/program-organizers/*', async (c, next) => {
  if (c.req.method === 'GET') return next();
  return authMiddleware(c as any, next);
});
app.use('/programs', async (c, next) => {
  if (c.req.method === 'GET') return next();
  return authMiddleware(c as any, next);
});
app.use('/programs/*', async (c, next) => {
  if (c.req.method === 'GET') return next();
  return authMiddleware(c as any, next);
});
app.use('/program-levels', async (c, next) => {
  if (c.req.method === 'GET') return next();
  return authMiddleware(c as any, next);
});
app.use('/program-levels/*', async (c, next) => {
  if (c.req.method === 'GET') return next();
  return authMiddleware(c as any, next);
});
app.use('/field-definitions/*', authMiddleware);
app.use('/field-options/*', authMiddleware);
app.use('/sync/*', authMiddleware);
app.route('/program-organizers', programOrganizers);
app.route('/programs', programs);
app.route('/program-levels', programLevels);
app.route('/field-definitions', fieldDefinitions);
app.route('/field-options', fieldOptions);
app.route('/sync', sync);

// AI API
app.use('/ai/*', authMiddleware);
app.route('/ai', ai);

// Frontend error logging (public write-only ingestion)
app.route('/errors', errors);

// Migration route (tạm thời public để chạy migration)
// Migration route disabled
// app.route('/migrate', migrate);

// ========================================
// ERROR HANDLING
// ========================================

app.onError(globalErrorHandler);

// 404 handler
app.notFound((c) => {
  return c.json({ success: false, error: { message: 'API endpoint không tồn tại', code: 'NOT_FOUND' } }, 404);
});

// ========================================
// EXPORT
// ========================================

const worker: ExportedHandler<Env> = {
  fetch: app.fetch,
  queue(batch, env) {
    return handlePhoto3x4Queue(batch as MessageBatch<any>, env);
  },
};

export default worker;
