# Architecture — vantrangedu

## Directory Structure
```
backend/
  src/
    routes/                 — 37 route files (~10k LOC)
      auth.ts               — Login, SSO handoffs, token exchange
      students.ts           — Student CRUD + image upload
      classes.ts            — Class management
      registrations.ts      — Student registration workflow
      payments.ts           — Payment tracking + confirmation
      exam-schedules.ts     — ⚠️ 1487 LOC (oversized, refactor needed)
      exam-types.ts         — Exam types config
      assignments.ts        — Assignment CRUD (18k LOC)
      attendance.ts         — Attendance tracking
      certificates.ts       — Certificate issuance
      documents.ts          — Document management
      export.ts             — ⚠️ 1296 LOC (oversized, refactor needed)
      admins.ts             — Admin CRUD + teaching assignments
      online-classes.ts     — Online class management
      class-schedules.ts    — Class schedule CRUD
      posts.ts              — Content/news posts
      notifications.ts      — Notification system
      sso.ts                — SSO handoff + token exchange logic
      sync.ts               — Data sync (36 LOC)
      + 19 more routes
    middleware/             — Auth, CORS, rate limiting, error handling
    services/               — Business logic (StudentService, DocumentService, etc.)
    index.ts                — Hono app setup + route mounting

frontend/
  src/
    pages/
      admin/                — Admin dashboard + tabs (7 sub-pages)
        AdminDashboard.tsx
        adminTabs.tsx
        auth/
        desktop/
        mobile/
        shared/
        exams/
      student/              — Student dashboard
        StudentDashboard.tsx
        desktop/
        mobile/
        shared/
      public/               — 20+ public pages (HomePage, About, Training, etc.)
    components/             — Reusable UI components
    hooks/                  — Custom React hooks
    features/               — Feature-specific modules

docs/                       — Project documentation
scripts/                    — Utility scripts
migrations/                 — 28 SQL migrations (*.sql)
```

## Database Schema (20+ Core Tables)
| Category | Tables |
|----------|--------|
| Auth | admins, auth_sessions, sso_handoffs, password_reset_tokens |
| Users | students |
| Classes | classes, class_schedules, class_sessions, class_teachers, class_videos, attendance |
| Exams | exam_schedules, exam_registrations, exam_attempts, exam_questions, exam_answers |
| Payments | payments |
| Online | online_classes, online_class_enrollments |
| Documents | documents, document_folders, document_permissions, document_downloads |
| Teaching | assignments, assignment_submissions, assignments_targets |
| Content | posts, notifications, certificates |
| Admin | audit_logs, homepage_settings, activity_logs |
| Programs | program_organizers, programs, program_levels |
| Forms | field_definitions, field_options, field_values |

## Key Patterns
- **SSO Broker**: Issues JWT (HS256, 24h TTL) with session tracking in `auth_sessions`
- **Session Model**: CREATE → VERIFY → TOUCH → REVOKE lifecycle
- **Rate Limiting**: Per-endpoint, stored in DB (tiered: moderate/strict)
- **Soft Deletes**: Used for exams/documents; hard deletes for student records
- **Auth Middleware**: `requireAdmin`, `requireAuth`, `requireTeacher`
- **CORS Whitelist**: vantrangedu.com, vantrangexam.pages.dev (+ dev domains)

## Frontend Routing (React Router v6)
| Route | Role | Purpose |
|-------|------|---------|
| / | Public | Landing page |
| /register | Public | Student registration form |
| /login | Public | Login form |
| /certificate/lookup | Public | Certificate verification |
| /about, /training, /news, /contact | Public | Info pages (20+ total) |
| /dashboard | Student | Student home (exams, classes, profile) |
| /admin | Admin | Admin panel (tabs for all management) |
| /admin/students, /admin/classes, /admin/payments, /admin/exams | Admin | Management interfaces |

## API Endpoints Summary (37 routes)
- **Auth** (3): login, sso/handoffs, sso/exchange
- **Students** (6): register, login, get/post profile, upload image, list
- **Classes** (8): CRUD, enroll, approve, schedule
- **Payments** (4): create, list, confirm, report
- **Exams** (12): schedule CRUD, register, approve, attempt, question management
- **Documents** (5): upload, list, download, permissions, folders
- **Online Classes** (6): create, enroll, session management
- **Certificates** (3): generate, verify, list
- **Admin** (10): admin CRUD, audit logs, homepage settings, exports
- **Utils** (4): sync, notifications, messaging, reports

## Configuration & Secrets
| Config | Location | Type |
|--------|----------|------|
| Wrangler | backend/wrangler.toml | D1, R2, env vars |
| Vite | frontend/vite.config.ts | Build, dev server |
| JWT_SECRET | Wrangler secret | Critical |
| Google Credentials | Wrangler secret | Meet automation |
| R2 Credentials | Wrangler secret | Presigned URLs |
