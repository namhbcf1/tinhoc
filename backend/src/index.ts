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
import vstep from './routes/vstep.js'; // VSTEP NEW SYSTEM
import examCategories from './routes/exam-categories.js';
import ai from './routes/ai.js';
import examManagement from './routes/exam-management.js';
import examTaking from './routes/exam-taking.js';
import gradingRoute from './routes/grading.js';
// import migrate from './routes/migrate.js';
import { errorResponse } from './utils/helpers.js';
import { moderateRateLimiter, strictRateLimiter } from './utils/rate-limiter.js';
import { authMiddleware, requireAdmin, requireAdminOrTeacher, requireAuth } from './middleware/auth-middleware.js';
import { globalErrorHandler } from './middleware/error-handler.js';

// ========================================
// MAIN APP
// ========================================

const app = new Hono<{ Bindings: Env }>();

// ========================================
// MIDDLEWARE
// ========================================

// CORS - Whitelist allowed origins
const ALLOWED_ORIGINS = [
  'https://vantrangedu.com',
  'https://www.vantrangedu.com',
  'https://vantrangedu.pages.dev',
  'http://localhost:5173',
  'http://localhost:3000'
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
app.use('*', moderateRateLimiter);

// Request logging
app.use('*', async (c, next) => {
  console.log(`[${new Date().toISOString()}] ${c.req.method} ${c.req.url}`);
  await next();
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

// Students: register + login + search are public; list/update/delete require auth
// Auth is enforced per-route inside students.js via the shared authMiddleware
app.route('/students', students);

// Classes: GET public, write ops (POST/PUT/DELETE) require admin
app.use('/classes/*', async (c, next) => {
  if (c.req.method === 'GET') return next();
  return requireAdmin(c, next);
});
app.use('/classes', async (c, next) => {
  if (c.req.method === 'GET') return next();
  return requireAdmin(c, next);
});
app.route('/classes', classes);

// Registrations: POST (student self-register) + GET public; write ops require admin
app.use('/registrations/*', async (c, next) => {
  if (c.req.method === 'GET' || c.req.method === 'POST') return next();
  return requireAdmin(c, next);
});
app.use('/registrations', async (c, next) => {
  if (c.req.method === 'GET' || c.req.method === 'POST') return next();
  return requireAdmin(c, next);
});
app.route('/registrations', registrations);

// Documents (tra cứu public, upload admin)
app.route('/documents', documents);
app.route('/document-folders', documentFolders);

// Payments (admin routes with auth + strict rate limiting)
app.use('/payments/*', strictRateLimiter);
app.use('/payments/*', authMiddleware);
app.route('/payments', payments);

// Certificates: GET/lookup public; write ops (POST/PUT) require admin
app.use('/certificates/*', async (c, next) => {
  if (c.req.method === 'GET') return next();
  return requireAdmin(c, next);
});
app.use('/certificates', async (c, next) => {
  if (c.req.method === 'GET') return next();
  return requireAdmin(c, next);
});
app.route('/certificates', certificates);

// Export route (admin only — contains full PII: CCCD, SĐT, ngày sinh)
app.use('/export/*', requireAdmin);
app.route('/export', exportRoute);

// Posts management (GET public, POST/PUT/DELETE requires admin auth)
const postsAuthMiddleware = async (c, next) => {
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

// Homepage settings (admin routes with auth + strict rate limiting)
app.use('/homepage/*', strictRateLimiter);
app.use('/homepage/*', authMiddleware);
app.route('/homepage', homepage);

// Notifications: GET public (broadcasts to all), write ops require auth
const notificationsWriteMiddleware = async (c, next) => {
  if (c.req.method === 'GET') return next();
  return requireAuth(c, next);
};
app.use('/notifications', notificationsWriteMiddleware);
app.use('/notifications/*', notificationsWriteMiddleware);
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

// Teachers routes (public login, protected profile/classes)
app.route('/teachers', teachers);

// Class schedules: GET public, write ops require admin or teacher
app.use('/class-schedules/*', async (c, next) => {
  if (c.req.method === 'GET') return next();
  return requireAdminOrTeacher(c, next);
});
app.use('/class-schedules', async (c, next) => {
  if (c.req.method === 'GET') return next();
  return requireAdminOrTeacher(c, next);
});
app.route('/class-schedules', classSchedules);

// Class teachers: GET public, write ops require admin
app.use('/class-teachers/*', async (c, next) => {
  if (c.req.method === 'GET') return next();
  return requireAdmin(c, next);
});
app.use('/class-teachers', async (c, next) => {
  if (c.req.method === 'GET') return next();
  return requireAdmin(c, next);
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

// Class videos (student/teacher/admin with membership)
app.route('/', videos);

// VSTEP API
app.route('/vstep', vstep);

// Exam Categories — đồng bộ từ vantrangexam (DB chung), public GET
app.route('/exam-categories', examCategories);

// AI API
app.use('/ai/*', authMiddleware);
app.route('/ai', ai);

// Exam Management API (CRUD: exams, sections, groups, questions)
// Routes handle their own auth internally
app.route('/api/exams', examManagement);

// Exam Taking API (start, data, answers, submit, result, history)
// my-history is a sub-route of /api/exams, registered on same router
app.route('/api/exams', examTaking);

// Grading API (pending, detail, submit grade)
app.route('/api/grading', gradingRoute);

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

export default app;
