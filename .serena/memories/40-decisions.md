# Technical Decisions — vantrangedu

## Active Decisions

### Teachers Merged into Admins (Migration 0026)
- **Status**: Implemented
- **What**: Teachers now use `admins` table with `teacher_code` field
- **Auth**: `requireTeacher` middleware checks `admin.teacher_code IS NOT NULL`
- **Impact**: Single auth table simplifies session management
- **No separate teacher_password**: Teachers use admin auth flow

### Manual Payment System (No Gateway)
- **Status**: Implemented
- **What**: Admin manually confirms payments — no Stripe/PayPal/VNPay
- **Flow**: Student registers → admin creates payment record → admin confirms
- **DB**: payments table tracks: amount, status (pending/confirmed/rejected), student_id, class_id
- **Risk**: No automatic reconciliation; prone to human error

### Session Touch on Every Request
- **Status**: Active
- **What**: Every authenticated request updates `auth_sessions.last_active`
- **Pro**: Immediate session revocation works (next request checks status)
- **Con**: Extra DB write per request (potential bottleneck at scale)
- **Alternative**: Considered Redis cache (not implemented — D1 only)

### SSO Handoff TTL = 5 Minutes
- **Status**: Active
- **What**: `sso_handoffs` records expire after 5 minutes
- **Reason**: Security — prevent replay/token reuse attacks
- **Risk**: User must complete login quickly; slow networks may timeout

### Oversized Route Files (Tech Debt)
- **Files**:
  - exam-schedules.ts (1487 LOC) — needs refactor into smaller modules
  - export.ts (1296 LOC) — Excel generation logic should extract
- **Status**: Known, not yet prioritized
- **Risk**: Hard to maintain, test, and review

### Rate Limiting Tiered
- **Status**: Implemented
- **Moderate**: Most endpoints (100 req/min default)
- **Strict**: Auth endpoints (login, register, exchange: 10 req/min)
- **Storage**: `rate_limits` table with IP + endpoint tracking
- **Cleanup**: No automated cleanup of old entries (risk: table bloat)

### No Transaction Lock on Payments
- **Risk**: Race condition between payment confirmation and registration cancellation
- **Example**: Admin confirms payment → student cancels → refund logic broken
- **Status**: Known issue, not yet addressed
- **Workaround**: Manual verification before confirmation

### Soft Deletes for Exams & Documents
- **Status**: Active
- **What**: `deleted_at IS NOT NULL` marks soft delete
- **Hard Delete**: Student deletion cascades (foreign key ON DELETE CASCADE)
- **Queries**: Always filter `WHERE deleted_at IS NULL` in SELECT
- **Risk**: Accidental query without soft delete filter → expose deleted data

### Google Meet Auto-Creation
- **Status**: Partially implemented
- **Tables**: Migration 0021 added `meeting_link, google_event_id` to class_schedules
- **Handler**: No endpoint currently processes these columns
- **Risk**: Orphaned DB columns (unused code)

## Decision Log (Recent)

### 2026-03-12 — Merge Teachers into Admins
- **Context**: Teachers needed for online classes; separate auth table redundant
- **Decision**: Merge `teachers` table into `admins` with `teacher_code` field
- **Migration**: 0026_merge_teachers_into_admins.sql
- **Consequences**: Reduced complexity, single session logic, login unified

### 2026-03-10 — Add Program Platform
- **Context**: Need to track multiple programs/levels for student progression
- **Decision**: Add `program_organizers, programs, program_levels` tables
- **Migration**: 0023_program_platform.sql
- **Consequences**: More flexible student tracking, but adds DB joins

### 2026-03-05 — SSO Broker Model
- **Context**: vantrangexam needs to verify student credentials
- **Decision**: vantrangedu issues JWT, vantrangexam validates only
- **Migrations**: 0024_auth_sessions_sso.sql
- **Consequences**: vantrangedu owns auth; vantrangexam depends on token validity

## Technical Debt Priority
1. **Refactor exam-schedules.ts** (1487 LOC) — split into route + service
2. **Refactor export.ts** (1296 LOC) — extract Excel generation to separate module
3. **Implement Google Meet handler** — complete the auto-meeting feature
4. **Rate limit cleanup** — add scheduled job to delete old entries
5. **Add transaction locks** — protect payment confirmation race condition
6. **Email notifications** — RESEND_API_KEY env set but no handler (dead code)

### 2026-03-23 01:32 — vantrangedu Zoom Policy: Max 2 Links
- **Decision**: Keep only 2 effective Zoom links for exam schedules.
- **Enforcement**:
  - Backend normalizes incoming `zoom_link`, `zoom_link_backup`, `zoom_link_backup_2`, `zoom_link_backup_3` into max two unique links.
  - Persisted columns `zoom_link_backup_2` and `zoom_link_backup_3` are always cleared (`NULL`) after normalization.
  - Admin UI shows only `Link tham gia` and `Link dự phòng`.
  - Student UI shows only primary + one backup button.
- **Reason**: simplify operations and align exam portal behavior with requested flow.

### 2026-03-24 +07 — Deploy Isolation: 2 project độc lập hoàn toàn khi deploy

- **vantrangedu** và **vantrangexam** là 2 sản phẩm KHÁC NHAU, deploy RIÊNG BIỆT
- Share DB + R2 là intentional nhưng deploy artifact KHÔNG share nhau

**Mapping Cloudflare resources:**
| Resource | vantrangedu | vantrangexam |
|---|---|---|
| Pages project | `vantrangedu` | `vantrangexam` |
| Worker | `vantrangedu-api` | *(Pages Functions — không có Worker riêng)* |
| D1 database | `vantrangedu_db` (shared) | `vantrangedu_db` (shared) |
| R2 files | `vantrangedu-files` (shared) | `vantrangedu-files` (shared) |

**Quy trình deploy đúng:**
| Muốn deploy | Lệnh | Thư mục |
|---|---|---|
| vantrangedu frontend | `npm run deploy` | `vantrangedu/frontend/` |
| vantrangedu backend | `npm run deploy` | `vantrangedu/backend/` |
| vantrangexam | `npm run deploy` | `vantrangexam/` |

**Bugs đã fix trong vantrangexam (2026-03-24) để tránh overwrite vantrangedu-api:**
- `scripts/deploy.sh`: `--project-name=vantrangedu-api` → `--project-name=vantrangexam`
- `package.json`: `"name": "vantrangedu-api"` → `"name": "vantrangexam"`
- `wrangler.toml` [env.preview]: name trùng production → đổi thành `vantrangexam-preview`

### 2026-03-23 01:33 — Session Summary
- **Context**: Auto-generated by finalize-context.sh
- **Recent commits**:
- chore: update wrangler to 4.76.0 (9debb2873)
- feat: add backup zoom link, overhaul exam schedules & online class sync (1647fa0db)
- feat: overhaul exam schedules - online class sync, form validation, UI rebuild (cd2f5d002)
- build: rebuild dist with updated asset hashes (32388b807)
- fix: remove tsconfig project references to fix tsc --noEmit (e2dd8d7ea)

### 2026-03-23 01:44 — Zoom Backup Credential Model for 2-Link Flow
- Decision: Keep only 2 effective Zoom links (`zoom_link`, `zoom_link_backup`) but store credentials for both main and backup links.
- Implementation:
  - Added DB columns: `zoom_meeting_id_backup`, `zoom_passcode_backup`.
  - Admin form now includes backup Meeting ID/Passcode fields.
  - Normalization still collapses any provided links to max 2 unique links.
- Rationale: preserve simplified 2-link UX while allowing full fallback meeting metadata.

### 2026-03-23 01:44 — Session Summary
- **Recent commits** (since last finalize):
- chore: update wrangler to 4.76.0 (9debb2873)
- feat: add backup zoom link, overhaul exam schedules & online class sync (1647fa0db)
- feat: overhaul exam schedules - online class sync, form validation, UI rebuild (cd2f5d002)
- build: rebuild dist with updated asset hashes (32388b807)

### source_site Isolation for documents, assignments, notifications (Migration 0031)
- **Date**: 2026-03-24
- **What**: Added `source_site TEXT NOT NULL DEFAULT 'edu'` to `documents`, `assignments`, `notifications` tables
- **Migration**: `backend/migrations/0031_source_site_documents_assignments_notifications.sql`
- **Deploy order**: vantrangedu 0031 FIRST (sets existing rows to 'edu'), then vantrangexam 018
- **Code changes**:
  - `document-queries.ts`: All SELECTs add `source_site IN ('edu', 'system')`, INSERT hardcodes `'edu'`
  - `document-repository.ts`: Same pattern across all query functions
  - `notification-queries.ts`: SELECT/COUNT filter + INSERT hardcodes `'edu'`
  - `routes/assignments.ts`: SELECT filter + INSERT hardcodes `'edu'`
  - `exam-schedule-class-sync.ts`: DELETE scoped to `source_site = 'edu'`
- **Reason**: Shared D1 database with vantrangexam — data isolation previously absent for these 3 tables
- **Rule**: ALL future INSERTs to documents/assignments/notifications MUST include `source_site = 'edu'`
