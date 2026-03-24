# Active Work — vantrangedu

## Current Task
_Updated automatically by watch-context.sh at 2026-03-23 00:47_

## Recently Changed Files
_Auto-updated at 2026-03-24 11:29 (15 files)_

- AGENTS.md
- backend/package-lock.json
- backend/src/db/attendance-queries.ts
- backend/src/lib/program-platform/repository.ts
- backend/src/routes/exam-schedules.ts
- backend/src/test/routes/exam-schedules.test.ts
- backend/src/utils/rate-limiter.ts
- CLAUDE.md
- frontend/package.json
- frontend/public/_headers
- frontend/src/features/student/student-hooks.ts
- frontend/src/pages/admin/desktop/ExamSchedulesPage.tsx
- frontend/src/services/api-client-core.ts
- frontend/src/services/api-request-engine.ts
- frontend/vite.config.ts

## Blockers
_None detected._

## Completed Items
_Check git log for recent commits._

## Session Update — 2026-03-23 01:32:52 +07
- Task completed: Reduced Zoom links to 2 across vantrangedu exam schedule flow (admin form + payload normalization + student display), then deployed backend and frontend.
- Files changed:
  - backend/src/routes/exam-schedules.ts
  - backend/src/test/routes/exam-schedules.test.ts
  - frontend/src/pages/admin/desktop/ExamSchedulesPage.tsx
  - frontend/src/features/student/student-hooks.ts
  - frontend/src/features/student/student-types.ts
  - frontend/src/features/student/views/StudentExamsView.tsx
  - .serena/memories/30-active-work.md
  - .serena/memories/40-decisions.md
  - .serena/memories/50-verification.md
- Deployments:
  - Backend Worker: https://vantrangedu-api.bangachieu2.workers.dev (version `ee1c4120-14bf-4352-900b-ccd8d4463af6`)
  - Frontend Pages: https://1c756c0d.vantrangedu.pages.dev

## Session Update — 2026-03-23 01:44 +07
- Task completed: Added backup Zoom Meeting credentials (Meeting ID/Passcode) for the backup link while keeping the max-2-link policy, then migrated DB and redeployed.
- Files changed:
  - backend/src/db/attendance-queries.ts
  - backend/migrations/0030_add_zoom_backup_credentials_to_exam_schedules.sql
  - backend/package.json
  - frontend/src/pages/admin/desktop/ExamSchedulesPage.tsx
- Deployment / migration:
  - D1 migration executed: `0030_add_zoom_backup_credentials_to_exam_schedules.sql`
  - Backend Worker: https://vantrangedu-api.bangachieu2.workers.dev (version `c7a78708-5761-4ee2-82d3-dd0fe4735173`)
  - Frontend Pages: https://9bef87bb.vantrangedu.pages.dev
