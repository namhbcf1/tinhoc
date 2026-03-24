# Cross-Repo Contracts — vantrangedu ↔ vantrangexam

## Shared Infrastructure
| Resource | ID | Purpose |
|----------|----|---------|
| D1 Database | `ae59b4c6-0c72-4e7c-856c-d2106da89004` | Shared by both repos (vantrangedu_db) |
| R2 Media | vantrangedu-files → files.vantrangedu.com | Shared storage |

## SSO Contract (vantrangedu = BROKER)
**vantrangedu issues JWT tokens. vantrangexam validates only.**

### JWT Token (HS256, 7-day expiry)
```json
{
  "id": "user-id",
  "userId": "system-id",
  "sub": "session-id",
  "sid": "session-id",
  "aud": "edu|exam",
  "type": "admin|student",
  "role": "teacher",
  "email": "user@example.com",
  "display_name": "Full Name",
  "phone": "+84...",
  "cccd": "xxx",
  "teacher_code": "GV001",
  "exp": "unix_timestamp + 7 * 24 * 60 * 60"
}
// Source: backend/src/lib/auth/session-broker.ts line 232
// expiresAtSeconds = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60
```

### SSO Handoff Flow
1. vantrangexam redirects user to `https://vantrangedu.com/sso/handoffs?callback=<url>`
2. vantrangedu creates `sso_handoffs` record (5-min TTL, status=pending)
3. User authenticates (login or existing session)
4. vantrangedu redirects back with `?handoff_token=<token>`
5. vantrangexam calls `POST /sso/exchange` with handoff_token
6. vantrangedu returns JWT + `auth_sessions` record created
7. vantrangexam stores JWT, calls vantrangedu endpoints with bearer token

### Session Lifecycle
| Event | Action | DB |
|-------|--------|-----|
| Login | Create auth_sessions row | sid, user_id, admin_id/student_id, status=active, created_at |
| Every Request | Touch session | Update last_active timestamp |
| Logout | Revoke | Set revoked_at, status=revoked |
| Expiry | Auto-revoke | Scheduled job (cron) |

## Table Ownership

### vantrangedu OWNS (safe to modify)
```
admins, students, classes, registrations, payments,
exam_schedules, exam_registrations, exam_attempts, exam_questions, exam_answers,
online_classes, online_class_enrollments, class_sessions, class_videos,
documents, document_folders, document_permissions, document_downloads,
assignments, assignment_submissions, assignments_targets,
certificates, audit_logs, activity_logs, posts, notifications,
program_organizers, programs, program_levels,
field_definitions, field_options, field_values,
auth_sessions, sso_handoffs, password_reset_tokens,
homepage_settings, attendance, class_schedules, class_teachers
```

### vantrangexam OWNS (DO NOT modify from vantrangedu)
```
vstep_exams, vstep_sections, vstep_question_groups, vstep_questions,
vstep_exam_attempts, vstep_answers, vstep_grading_review_logs,
exam_security_logs, practice_exam_assignments, assignment_targets,
teacher_conversations, teacher_messages,
analytics_events, user_sessions
```

## API Integration Points
| vantrangedu Endpoint | Method | vantrangexam Consumer | Purpose |
|---------------------|--------|---------------------|---------|
| POST /sso/exchange | POST | vantrangexam | Exchange handoff token for JWT |
| GET /students | GET + token | vantrangexam | Fetch student data (if needed) |
| POST /export/students | POST + admin token | vantrangexam | Bulk student export |
| Shared D1 queries | Direct SQL | vantrangexam | Query student/exam data via shared DB |

## Important Constraints
- **JWT_SECRET**: Must match between repos — coordination required on rotation
- **Migrations**: 28 in vantrangedu, 16+ in vantrangexam — same DB, run in order
- **Rate Limiting**: vantrangedu enforces rate_limits table — vantrangexam respects
- **CORS Whitelist**: vantrangedu allows vantrangexam.pages.dev + others
- **Soft Deletes**: vantrangedu uses soft deletes for exams/documents (NULL deleted_at = active)
- **Cascading Deletes**: Student deletion cascades to registrations, payments, certificates

## Coordination Rules
1. Before rotating JWT_SECRET: Notify vantrangexam team
2. Before running migrations: Ensure both repos are ready (test on dev D1 first)
3. Student data flows: vantrangedu source of truth (canonical)
4. Exam data flows: vantrangexam source of truth (canonical)
5. Shared user sessions: Track in vantrangedu auth_sessions, validate from vantrangexam

## Environment Variables (Production Must-Set)
```bash
# vantrangedu backend (wrangler secrets)
JWT_SECRET=<shared_with_vantrangexam>
R2_ACCESS_KEY_ID=<r2_creds>
R2_SECRET_ACCESS_KEY=<r2_creds>
CLOUDFLARE_IMAGES_API_TOKEN=<cf_images>
GOOGLE_CLIENT_EMAIL=<service_account>
GOOGLE_PRIVATE_KEY=<service_account>
```

## 🔴 Deployment Isolation Rules (CRITICAL)
Both repos share SAME D1 + R2. These rules prevent data corruption:

### source_site Filter
- ALL `SELECT` queries on shared tables MUST include `WHERE source_site IN ('edu', 'system')`
- Tables requiring filter: `program_organizers`, `programs`, `program_levels`, `field_definitions`, `field_options`, `field_values`
- `'system'` = shared seed data visible to both repos
- INSERT/UPDATE always hardcode `source_site = 'edu'`

### Deploy Coordination
1. Deploy this repo FIRST when both repos need deployment
2. Run migrations manually: `wrangler d1 execute vantrangedu_db --file=migrations/NNNN_*.sql`
3. Wait 5 min before deploying vantrangexam
4. Migration 0023 creates shared tables with `DEFAULT 'edu'` — safe because `IF NOT EXISTS`
5. **NEVER** change DEFAULT values in existing migration files

### R2 Namespace
- Shared bucket `vantrangedu-files` — both repos upload here
- No `edu/` prefix yet — future improvement to prevent key collisions
