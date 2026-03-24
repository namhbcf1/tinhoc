# vantrangedu — Education Platform (SSO Broker)

## Scope
Education management platform: student registration, class scheduling, payment tracking, exam management, online classes, documents, SSO broker for vantrang ecosystem.

## Ownership & Data Flows
| System | Tables Owned | Purpose |
|--------|-------------|---------|
| THIS REPO (vantrangedu) | admins, students, classes, registrations, payments, exam_schedules, exam_registrations, exam_attempts, exam_questions, exam_answers, online_classes, online_class_enrollments, class_sessions, class_videos, documents, document_folders, document_permissions, assignments, assignment_submissions, certificates, audit_logs, auth_sessions, sso_handoffs, posts, notifications, homepage_settings | Core education operations + SSO |
| vantrangexam | vstep_exams, vstep_sections, vstep_questions, vstep_answers, exam_security_logs, teacher_conversations, teacher_messages, analytics_events, user_sessions | Standardized test management |

## Tech Stack
| Layer | Tech | Detail |
|-------|------|--------|
| Frontend | React 19 + TypeScript + Vite | 37 pages (admin + student + public) |
| Backend | Hono on CF Workers | 37 route files, ~10k LOC total |
| Database | CF D1 (SQLite) | Database ID: `ae59b4c6-0c72-4e7c-856c-d2106da89004` |
| Storage | CF R2 | `vantrangedu-files` (media), `class-videos` (recordings) |
| Auth | JWT issuer (HS256, 24h TTL) | SSO broker — issues tokens for ecosystem |

## Key Facts
- **20+ database tables** (admins, students, classes, payments, exams, documents, programs, etc.)
- **28 migrations** (sequential, running order critical)
- **37 backend routes** (`/src/routes/*.ts`)
- **37+ frontend pages** (distributed: admin/, student/, public/)
- **Payment**: Manual admin confirmation (no Stripe/PayPal)
- **Tech debt**: `exam-schedules.ts` (1487 LOC), `export.ts` (1296 LOC) — both need refactoring
- **Teachers merged into admins** with `teacher_code` field

## Build Commands
| Command | Purpose |
|---------|---------|
| `cd backend && npm run dev` | Backend worker dev server (localhost) |
| `cd frontend && npm run dev` | Frontend Vite dev server |
| `cd backend && npm run build` | Backend production build |
| `cd frontend && npm run build` | Frontend production build (→ dist/) |

## Bindings (CF Workers)
| Binding | Type | Value |
|---------|------|-------|
| DB | D1 | vantrangedu_db |
| R2 | R2 Bucket | vantrangedu-files |
| VIDEO_BUCKET | R2 Bucket | class-videos |
| AI | Workers AI | (optional, placeholder) |

## Environment Secrets (wrangler secret)
- `JWT_SECRET` — Token signing (MUST match vantrangexam)
- `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` — S3 presigned URLs
- `CLOUDFLARE_IMAGES_API_TOKEN` — CCCD/photo uploads
- `GOOGLE_CLIENT_EMAIL`, `GOOGLE_PRIVATE_KEY` — Google Meet automation
