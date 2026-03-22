---
title: "Backend JavaScript to TypeScript Migration"
description: "Incremental parallel migration of 89 .js files to .ts in backend/src with minimal type annotations"
status: pending
priority: P1
effort: 12h
branch: main
tags: [typescript, migration, backend, hono, cloudflare-workers]
created: 2026-03-07
---

# Backend JS-to-TS Migration Plan

## Overview

Rename 89 `.js` files to `.ts` in `backend/src/`, add basic type annotations, fix compile errors. The existing `resolveJsToTs()` Vite plugin + Wrangler's bundler handle `.js` import extensions pointing to `.ts` files, so files can be migrated incrementally without changing import paths.

**Scope:** 89 JS files (~18,500 LOC), 10 TS files already migrated.
**Non-scope:** File splitting (>200 LOC files noted but not split), deep domain types, refactoring.

## Progress Tracker

| Phase | Description | Files | Status |
|-------|-------------|-------|--------|
| 1 | Foundation (types + entry) | 2 | pending |
| 2A | utils/ | 11 | pending |
| 2B | middleware/ | 2 | pending |
| 3A | db/ | 19 | pending |
| 3B | lib/repositories/ | 14 | pending |
| 4A | services/ | 4 | pending |
| 4B | lib/services/ | 2 | pending |
| 5A | Routes Group 1 (simple) | 12 | pending |
| 5B | Routes Group 2 (exam+db) | 11 | pending |
| 5C | Routes Group 3 (large) | 11 | pending |
| 6 | Tests | 8 | pending |
| 7 | workers-ai + repositories | 2 | pending |
| 8 | Cleanup + validation | - | pending |

---

## Pre-Migration Setup

### Verify toolchain works with mixed .js/.ts

```bash
cd backend
npx tsc --noEmit        # should compile existing .ts files
npx wrangler deploy --dry-run  # verify bundler handles .ts entry
npx vitest --run        # verify resolveJsToTs() plugin works
```

### Env type definition (created in Phase 1)

The `wrangler.toml` reveals these bindings that must go into the `Env` type:
- `DB: D1Database` (d1_databases binding)
- `R2: R2Bucket` (r2_buckets binding - files)
- `VIDEO_BUCKET: R2Bucket` (r2_buckets binding - videos)
- `AI: Ai` (ai binding)
- `ENVIRONMENT: string`
- `JWT_SECRET: string`
- `CLOUDFLARE_ACCOUNT_ID: string`
- `CLOUDFLARE_IMAGES_API_TOKEN: string`
- `R2_ACCESS_KEY_ID: string`
- `R2_SECRET_ACCESS_KEY: string`
- `GOOGLE_CLIENT_EMAIL: string`
- `GOOGLE_ADMIN_EMAIL: string`
- `GOOGLE_PRIVATE_KEY: string`

---

## Phase 1 -- Foundation (Sequential, must go first)

**Why first:** Every other file depends on the Env type and the entry point validates the whole app compiles.

### 1a. `src/types/env.js` -> `src/types/env.ts`

**Current:** JSDoc typedef, empty export. 11 LOC.

**Target:** Proper TypeScript interface.

```typescript
export interface Env {
  // D1 Database
  DB: D1Database;
  // R2 Buckets
  R2: R2Bucket;
  VIDEO_BUCKET: R2Bucket;
  // Workers AI
  AI: Ai;
  // Environment variables (wrangler.toml [vars])
  ENVIRONMENT: string;
  JWT_SECRET: string;
  CLOUDFLARE_ACCOUNT_ID: string;
  // Secrets (wrangler secret put)
  CLOUDFLARE_IMAGES_API_TOKEN: string;
  R2_ACCESS_KEY_ID: string;
  R2_SECRET_ACCESS_KEY: string;
  GOOGLE_CLIENT_EMAIL: string;
  GOOGLE_ADMIN_EMAIL: string;
  GOOGLE_PRIVATE_KEY: string;
}
```

Also create a `JWTPayload` type here since it's used across middleware and routes:

```typescript
export interface JWTPayload {
  id: number;
  role?: 'admin' | 'super_admin' | 'teacher';
  type?: 'student' | 'admin' | 'teacher';
  cccd?: string;
  ho_ten?: string;
  username?: string;
  exp?: number;
}
```

### 1b. `src/index.js` -> `src/index.ts`

**Current:** 284 LOC. Imports all route modules, applies middleware, exports app.

**Key changes:**
- Add `import type { Env } from './types/env.js'`
- Type the Hono app: `const app = new Hono<{ Bindings: Env; Variables: { user: JWTPayload } }>()`
- All inline middleware functions get `(c: Context, next: Next)` params
- `ALLOWED_ORIGINS` typed as `string[]`
- Also update `wrangler.toml` line: `main = "src/index.ts"`

**Note:** 284 LOC is over 200 but must NOT be split in this migration.

### Validation checkpoint
```bash
npx tsc --noEmit   # must pass
npx wrangler deploy --dry-run
```

---

## Phase 2 -- Parallel Group A (no cross-deps)

Phase 2A and 2B can run simultaneously. Neither depends on the other.

### Phase 2A: `src/utils/` (11 files)

All utility files are self-contained except `notification-helper.js` which imports from `db/notification-queries.js`. Migrate notification-helper last within this phase (or accept the cross-dep since resolveJsToTs handles it).

| # | File | LOC | Imports from | Key type annotations |
|---|------|-----|-------------|---------------------|
| 1 | `helpers.js` -> `.ts` | 193 | `bcryptjs` | `(str: string): string`, `(password: string): Promise<string>`, `(payload: Record<string, any>, secret: string): Promise<string>`, `(token: string, secret: string): Promise<JWTPayload \| null>`, `(date: string \| Date): string \| null` |
| 2 | `response.js` -> `.ts` | 19 | none | `(c: Context, ...): Response` for each function |
| 3 | `response-helpers.js` -> `.ts` | 144 | none | Already has JSDoc with Context types -- convert to TS params: `(c: Context, data: any, meta?: object \| null, status?: number): Response` |
| 4 | `rate-limiter.js` -> `.ts` | 144 | none | `RateLimiterOptions` interface, `(options?: RateLimiterOptions): MiddlewareHandler` |
| 5 | `session-manager.js` -> `.ts` | 146 | none | In-memory map types: `Map<string, SessionData>` |
| 6 | `email-service.js` -> `.ts` | 144 | none | `(env: Env, to: string, subject: string, html: string): Promise<boolean>` |
| 7 | `cloudflare-images.js` -> `.ts` | 285 | none | `(env: Env, imageId: string, ...): Promise<string>`. **>200 LOC -- note but do not split.** |
| 8 | `backup.js` -> `.ts` | 230 | none | `(db: D1Database): Promise<any>`. **>200 LOC -- note.** |
| 9 | `pdf-generator.js` -> `.ts` | 272 | none | HTML template functions returning `string`. **>200 LOC -- note.** |
| 10 | `file-utils.js` -> `.ts` | 109 | none | MIME type map: `Record<string, string>`, pure functions |
| 11 | `notification-helper.js` -> `.ts` | 75 | `db/notification-queries.js` | `(db: D1Database, ...): Promise<void>` |

**Pattern for all utils:** Add parameter types and return types. Use `any` for complex D1 result objects. Import `Env` from types where `env` param is used.

### Phase 2B: `src/middleware/` (2 files)

| # | File | LOC | Key annotations |
|---|------|-----|----------------|
| 1 | `auth-middleware.js` -> `.ts` | 85 | Import Hono types: `Context, Next, MiddlewareHandler`. Type all middleware as `async (c: Context<{ Bindings: Env; Variables: { user: JWTPayload } }>, next: Next): Promise<Response \| void>` |
| 2 | `error-handler.js` -> `.ts` | 194 | `classifyError(err: Error): string`, `sanitizeMessage(err: Error, code: string): string`, `resolveStatus(code: string, err: any): number`, `globalErrorHandler(err: Error, c: Context): Response`. AppError classes: add property declarations `statusCode: number; code: string`. |

### Validation checkpoint
```bash
npx tsc --noEmit
```

---

## Phase 3 -- Parallel Group B (db + lib/repositories)

Phase 3A and 3B can run simultaneously. `lib/repositories/` files do NOT import from `db/` (they are the exam system's own repository layer). The `db/` files only have one cross-import: `student-queries.js` imports `normalizeText` from `utils/helpers.js` (already migrated in Phase 2A).

### Phase 3A: `src/db/` (19 files)

All db files follow the same pattern: export async functions that take `db` as first param and run D1 prepared statements.

**Universal typing pattern for all db files:**
```typescript
// First param is always D1Database
export async function getXxx(db: D1Database, id: number): Promise<any> { ... }
export async function listXxx(db: D1Database): Promise<any[]> { ... }
export async function createXxx(db: D1Database, data: any): Promise<any> { ... }
```

Use `any` for D1 row results (proper row types are a separate task).

| # | File | LOC | Special notes |
|---|------|-----|--------------|
| 1 | `queries.js` -> `.ts` | 56 | Barrel re-export file. Just rename, no type changes needed -- re-exports are type-transparent. |
| 2 | `student-queries.js` -> `.ts` | 265 | Imports `normalizeText` from utils. `db: D1Database` on all functions. **>200 LOC -- note.** |
| 3 | `class-queries.js` -> `.ts` | 162 | Pure D1 queries |
| 4 | `enrollment-queries.js` -> `.ts` | 240 | **>200 LOC -- note.** |
| 5 | `admin-auth-queries.js` -> `.ts` | 142 | Password reset tokens, audit logs |
| 6 | `admin-queries.js` -> `.ts` | 131 | Admin CRUD |
| 7 | `attendance-queries.js` -> `.ts` | 425 | **>200 LOC -- note.** Largest db file. |
| 8 | `certificate-queries.js` -> `.ts` | 85 | Cert CRUD |
| 9 | `class-schedule-queries.js` -> `.ts` | 71 | Schedule CRUD |
| 10 | `class-teacher-queries.js` -> `.ts` | 85 | Teacher-class assignments |
| 11 | `document-queries.js` -> `.ts` | 233 | **>200 LOC -- note.** |
| 12 | `exam-queries.js` -> `.ts` | 18 | Tiny, exam schedule related queries |
| 13 | `homepage-queries.js` -> `.ts` | 166 | Homepage settings |
| 14 | `messaging-queries.js` -> `.ts` | 122 | Message CRUD |
| 15 | `notification-queries.js` -> `.ts` | 101 | Notification CRUD |
| 16 | `payment-queries.js` -> `.ts` | 89 | Payment CRUD |
| 17 | `post-queries.js` -> `.ts` | 229 | **>200 LOC -- note.** |
| 18 | `teacher-queries.js` -> `.ts` | 319 | **>200 LOC -- note.** |
| 19 | `vstep-queries.js` -> `.ts` | 191 | VSTEP exam queries |

### Phase 3B: `src/lib/repositories/` (14 files)

Exam system repositories. Most import from sibling files within `lib/repositories/`. No imports from `db/`.

**Dependency graph (within this directory):**
- `exam-type-repository.js` -- no deps (leaf)
- `exam-test-repository.js` -- no deps (leaf)
- `exam-section-repository.js` -- no deps (leaf)
- `exam-question-repository.js` -- no deps (leaf)
- `exam-activity-repository.js` -- no deps (leaf)
- `exam-test-detail-repository.js` -- imports `exam-test-repository`
- `exam-registration-repository.js` -- imports `exam-test-repository`
- `exam-access-repository.js` -- imports `exam-test-repository`, `exam-registration-repository`
- `exam-attempt-repository.js` -- imports `exam-test-repository`, `exam-test-detail-repository`, `exam-answer-repository`
- `exam-answer-scorer.js` -- no deps (leaf)
- `exam-answer-repository.js` -- imports `exam-test-detail-repository`, `exam-answer-scorer`
- `exam-review-repository.js` -- imports `exam-test-repository`
- `exam-import-repository.js` -- imports `exam-type-repository`, `exam-test-repository`, `exam-section-repository`, `exam-question-repository`
- `online-classes.js` -- no deps (leaf), 398 LOC **>200 LOC -- note**

**Migration order within this phase:**
1. Leaf nodes first (7 files, can be parallel)
2. Then dependent files (7 files)

| # | File | LOC | Deps within dir |
|---|------|-----|----------------|
| 1 | `exam-type-repository.js` -> `.ts` | 28 | none |
| 2 | `exam-test-repository.js` -> `.ts` | 96 | none |
| 3 | `exam-section-repository.js` -> `.ts` | 76 | none |
| 4 | `exam-question-repository.js` -> `.ts` | 94 | none |
| 5 | `exam-activity-repository.js` -> `.ts` | 78 | none |
| 6 | `exam-answer-scorer.js` -> `.ts` | 120 | none |
| 7 | `online-classes.js` -> `.ts` | 398 | none. **>200 LOC -- note.** |
| 8 | `exam-test-detail-repository.js` -> `.ts` | 121 | exam-test-repository |
| 9 | `exam-registration-repository.js` -> `.ts` | 104 | exam-test-repository |
| 10 | `exam-review-repository.js` -> `.ts` | 164 | exam-test-repository |
| 11 | `exam-access-repository.js` -> `.ts` | 160 | exam-test-repository, exam-registration-repository |
| 12 | `exam-answer-repository.js` -> `.ts` | 109 | exam-test-detail-repository, exam-answer-scorer |
| 13 | `exam-attempt-repository.js` -> `.ts` | 161 | exam-test-repository, exam-test-detail-repository, exam-answer-repository |
| 14 | `exam-import-repository.js` -> `.ts` | 72 | exam-type-repository, exam-test-repository, exam-section-repository, exam-question-repository |

**Same typing pattern:** `(db: D1Database, ...params) => Promise<any>`.

### Validation checkpoint
```bash
npx tsc --noEmit
```

---

## Phase 4 -- Parallel Group C (services)

Phase 4A and 4B can run simultaneously. These depend on Phase 2 (utils) and Phase 3 (db/repositories).

### Phase 4A: `src/services/` (remaining .js files only)

4 JS files remain (2 already `.ts`: `document-service.ts`, `student-service.ts`).

| # | File | LOC | Imports from | Key annotations |
|---|------|-----|-------------|----------------|
| 1 | `ai-persona.js` -> `.ts` | 164 | none | Just exports a template literal constant: `export const AI_PERSONA_GUIDELINES: string = ...` |
| 2 | `ai-service.js` -> `.ts` | 55 | `repositories/student-repository.js`, `utils/helpers.js`, `ai-persona.js` | `async function queryAI(c: Context, studentCCCD: string, userMessage: string): Promise<any>` |
| 3 | `google-calendar.js` -> `.ts` | 790 | none (self-contained) | Complex Google API integration. Type top-level functions: `(env: Env, ...): Promise<any>`. **>200 LOC -- note.** Use `any` liberally for Google API responses. |
| 4 | `google-calendar/utils.js` -> `.ts` | 91 | none | Date/time helper functions: `(dateStr: string): Date`, etc. |

### Phase 4B: `src/lib/services/` (2 files)

| # | File | LOC | Imports from | Key annotations |
|---|------|-----|-------------|----------------|
| 1 | `classes.js` -> `.ts` | 272 | `db/queries.js`, `db/class-schedule-queries.js`, `services/google-calendar.js`, `utils/helpers.js` | `async function fetchAllClasses(db: D1Database): Promise<any>`. **>200 LOC -- note.** |
| 2 | `online-classes.js` -> `.ts` | 541 | `lib/repositories/online-classes.js`, `services/google-calendar.js` | Business logic layer. `async function createClass(db: D1Database, data: any, env: Env): Promise<any>`. **>200 LOC -- note.** |

### Validation checkpoint
```bash
npx tsc --noEmit
```

---

## Phase 5 -- Routes (34 files, split into 3 parallel groups)

All route files follow the same pattern: `const router = new Hono(); ... export default router;`

**Universal typing pattern for routes:**
```typescript
import { Hono } from 'hono';
import type { Context } from 'hono';
import type { Env, JWTPayload } from '../types/env.js';

type AppEnv = { Bindings: Env; Variables: { user: JWTPayload } };
const router = new Hono<AppEnv>();

// Route handlers get typed context automatically
router.get('/', async (c) => { ... }); // c is Context<AppEnv>
```

**Grouping rationale:** Groups are based on independence (no route file imports another route file). All routes depend on utils, middleware, and db modules already migrated.

### Phase 5A: Simple routes (12 files, no db imports or simple imports)

These routes either have no db imports, use only `utils/helpers.js`, or are small.

| # | File | LOC | Imports from (beyond hono/utils) |
|---|------|-----|--------------------------------|
| 1 | `activity-logs.js` -> `.ts` | 44 | `db/admin-queries` |
| 2 | `ai.js` -> `.ts` | 26 | `lib/api-templates`, `services/ai-service` |
| 3 | `documents.js` -> `.ts` | 133 | `lib/api-templates`, `services/document-service`, `repositories/document-repository` |
| 4 | `exam-categories.js` -> `.ts` | 30 | `middleware/auth-middleware` |
| 5 | `homepage.js` -> `.ts` | 99 | `db/homepage-queries` |
| 6 | `messaging.js` -> `.ts` | 201 | `db/messaging-queries` |
| 7 | `notifications.js` -> `.ts` | 191 | `db/notification-queries` |
| 8 | `posts.js` -> `.ts` | 171 | `db/post-queries` |
| 9 | `reports.js` -> `.ts` | 249 | none (inline queries). **>200 LOC -- note.** |
| 10 | `seed-exam-tests.js` -> `.ts` | 65 | `fs/promises`, `path` (Node APIs) |
| 11 | `templates.js` -> `.ts` | 48 | none |
| 12 | `vstep.js` -> `.ts` | 218 | `db/vstep-queries`. **>200 LOC -- note.** |

### Phase 5B: Routes with multiple db/service imports (11 files)

| # | File | LOC | Imports from (beyond hono/utils) |
|---|------|-----|--------------------------------|
| 1 | `admins.js` -> `.ts` | 259 | `db/admin-queries`. **>200 LOC -- note.** |
| 2 | `attendance.js` -> `.ts` | 222 | `db/attendance-queries`, `db/admin-queries`. **>200 LOC -- note.** |
| 3 | `auth.js` -> `.ts` | 345 | `db/queries`, `db/admin-queries`, `utils/rate-limiter`, `utils/email-service`. **>200 LOC -- note.** |
| 4 | `classes.js` -> `.ts` | 108 | `lib/api-templates`, `lib/services/classes` |
| 5 | `class-schedules.js` -> `.ts` | 289 | `db/class-schedule-queries`, `services/google-calendar`. **>200 LOC -- note.** |
| 6 | `class-teachers.js` -> `.ts` | 130 | `db/class-teacher-queries`, `db/teacher-queries` |
| 7 | `payments.js` -> `.ts` | 293 | `db/payment-queries`, `db/queries`, `utils/notification-helper`. **>200 LOC -- note.** |
| 8 | `registrations.js` -> `.ts` | 224 | `db/queries`, `utils/notification-helper`. **>200 LOC -- note.** |
| 9 | `students.js` -> `.ts` | 152 | `lib/api-templates`, `services/student-service` |
| 10 | `teachers.js` -> `.ts` | 415 | `db/teacher-queries`, `utils/rate-limiter`. **>200 LOC -- note.** |
| 11 | `videos.js` -> `.ts` | 411 | `db/queries`, `db/class-teacher-queries`. **>200 LOC -- note.** |

### Phase 5C: Large route files (11 files, >200 LOC or complex)

| # | File | LOC | Imports from (beyond hono/utils) |
|---|------|-----|--------------------------------|
| 1 | `assignments.js` -> `.ts` | 536 | `utils/rate-limiter`, `middleware/auth-middleware`. Inline DB queries. **>200 LOC -- note.** |
| 2 | `backup.js` -> `.ts` | 276 | `middleware/auth-middleware`. Inline DB queries. **>200 LOC -- note.** |
| 3 | `cccd-upload.js` -> `.ts` | 337 | `middleware/auth-middleware`. Inline R2/Images logic. **>200 LOC -- note.** |
| 4 | `certificates.js` -> `.ts` | 376 | `db/certificate-queries`, `utils/pdf-generator`, `utils/notification-helper`. **>200 LOC -- note.** |
| 5 | `document-folders.js` -> `.ts` | 209 | none (inline DB). **>200 LOC -- note.** |
| 6 | `exam-management.js` -> `.ts` | 485 | none (inline auth + DB). Has duplicate local `authMiddleware`. **>200 LOC -- note.** |
| 7 | `exam-schedules.js` -> `.ts` | 803 | `db/attendance-queries`, `db/exam-queries`, `db/admin-queries`, `db/queries`. **Largest file -- 803 LOC -- note.** |
| 8 | `exam-taking.js` -> `.ts` | 340 | none (inline auth + DB). Has duplicate local `authMiddleware`. **>200 LOC -- note.** |
| 9 | `export.js` -> `.ts` | 744 | `xlsx-js-style`, `db/queries`. **>200 LOC -- note.** |
| 10 | `grading.js` -> `.ts` | 200 | none (inline auth + DB). Has duplicate local `authMiddleware`. |
| 11 | `online-classes.js` -> `.ts` | 563 | `services/student-service`, `lib/services/online-classes`, `services/google-calendar`. **>200 LOC -- note.** |

**Special note for exam-management, exam-taking, grading:** These define local `authMiddleware` copies. During migration, type them identically to the shared one. (Deduplication is a separate task.)

### Validation checkpoint
```bash
npx tsc --noEmit
npx wrangler deploy --dry-run
```

---

## Phase 6 -- Tests (8 files)

Tests run last because they import from all layers. The `resolveJsToTs` vitest plugin handles resolution during test runs.

| # | File | LOC | Imports from |
|---|------|-----|-------------|
| 1 | `test/setup-real-db.js` -> `.ts` | 192 | none (env from cloudflare:test) |
| 2 | `test/routes/online-classes-test-setup.js` -> `.ts` | 98 | `routes/online-classes`, `cloudflare:test` |
| 3 | `test/routes/online-classes-auth.test.js` -> `.ts` | 114 | `utils/helpers`, test-setup |
| 4 | `test/routes/online-classes-endpoints.test.js` -> `.ts` | 356 | `utils/helpers`, test-setup. **>200 LOC -- note.** |
| 5 | `test/repositories/online-classes-queries.test.js` -> `.ts` | 419 | `cloudflare:test`. **>200 LOC -- note.** |
| 6 | `test/repositories/online-classes-enrollments.test.js` -> `.ts` | 421 | `cloudflare:test`. **>200 LOC -- note.** |
| 7 | `test/services/online-classes-capacity.test.js` -> `.ts` | 244 | `lib/services/online-classes`, `setup-real-db`. **>200 LOC -- note.** |
| 8 | `test/services/online-classes-create.test.js` -> `.ts` | 195 | `lib/services/online-classes`, `services/google-calendar`, `setup-real-db` |
| 9 | `test/services/online-classes-calendar-sync.test.js` -> `.ts` | 193 | same as above |

**Key typing for tests:**
- `env` from `cloudflare:test` is already typed by `@cloudflare/vitest-pool-workers`
- `vi.mock()` calls may need `as any` in some places
- Test data objects use `any` or inline types

### Validation checkpoint
```bash
npx vitest --run
```

---

## Phase 7 -- Remaining files (2 files)

| # | File | LOC | Notes |
|---|------|-----|-------|
| 1 | `workers-ai/cccd-detector.js` -> `.ts` | 71 | `async function detectAndCropCCCD(env: Env, imageUrl: string): Promise<any>` |
| 2 | `repositories/exam-repository.js` -> `.ts` | 99 | Same pattern as student-repository.ts: `(db: D1Database, ...): Promise<any>` |

---

## Phase 8 -- Final Cleanup and Validation

### 8a. Update `wrangler.toml`
```toml
main = "src/index.ts"
```

### 8b. Update `package.json`
```json
"main": "src/index.ts"
```

### 8c. Full validation
```bash
npx tsc --noEmit          # Zero errors
npx wrangler deploy --dry-run  # Bundler builds successfully
npx vitest --run           # All tests pass
```

### 8d. Verify no .js files remain in src/
```bash
find backend/src -name "*.js" -not -path "*/node_modules/*"
# Expected: empty output
```

---

## Files >200 LOC (noted for future splitting)

These files exceed the 200-line guideline but must NOT be split during this migration:

| File | LOC | Future split suggestion |
|------|-----|----------------------|
| `db/attendance-queries.ts` | 425 | Split by CRUD operations |
| `db/student-queries.ts` | 265 | Already has student-repository.ts; consider removing duplication |
| `db/enrollment-queries.ts` | 240 | Split registration vs enrollment |
| `db/document-queries.ts` | 233 | Split by folder vs document queries |
| `db/post-queries.ts` | 229 | Split CRUD vs search |
| `db/teacher-queries.ts` | 319 | Split auth vs profile vs CRUD |
| `lib/repositories/online-classes.ts` | 398 | Split class vs enrollment queries |
| `lib/services/online-classes.ts` | 541 | Split by domain (class mgmt vs enrollment) |
| `lib/services/classes.ts` | 272 | Split CRUD vs schedule operations |
| `services/google-calendar.ts` | 790 | Split JWT gen, event CRUD, meet link, helpers |
| `routes/exam-schedules.ts` | 803 | Split by CRUD + registration + attendance |
| `routes/export.ts` | 744 | Split by export type (students, payments, etc.) |
| `routes/online-classes.ts` | 563 | Split admin vs student vs public routes |
| `routes/assignments.ts` | 536 | Split teacher vs student endpoints |
| `routes/exam-management.ts` | 485 | Split by entity (exams, sections, questions) |
| `routes/teachers.ts` | 415 | Split auth vs CRUD vs schedule |
| `routes/videos.ts` | 411 | Split upload vs playback |
| `routes/certificates.ts` | 376 | Split CRUD vs PDF generation |
| `routes/exam-taking.ts` | 340 | Split start/submit vs history |
| `routes/cccd-upload.ts` | 337 | Split upload vs detection |
| `routes/auth.ts` | 345 | Split login vs registration vs password reset |
| `utils/cloudflare-images.ts` | 285 | Split upload vs signed URL generation |
| `utils/pdf-generator.ts` | 272 | Split template vs generator |
| `utils/backup.ts` | 230 | Split export vs import |

---

## Type Annotation Guidelines

### DO use proper types when obvious:
- `db: D1Database` for all database params
- `env: Env` when accessing environment bindings
- `c: Context<AppEnv>` for Hono context (or let inference handle it in route handlers)
- `string`, `number`, `boolean` for simple params
- `Promise<Response>` for route handler returns
- `MiddlewareHandler` for middleware functions

### DO use `any` when:
- D1 query results (row shapes are complex and vary per query)
- Complex nested objects from external APIs (Google Calendar responses)
- Data params with many optional fields (`data: any` in create/update functions)
- `vi.mock()` return types in tests

### DO NOT:
- Add `any` to simple params that have obvious types (numbers, strings)
- Create complex generic types for D1 results (separate task)
- Change any runtime behavior
- Modify import paths (keep `.js` extensions everywhere)

---

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| `tsc` errors from `@cloudflare/workers-types` incompatibilities | Use `skipLibCheck: true` (already set) |
| `xlsx-js-style` has no types | Install `@types/xlsx-js-style` or use `// @ts-ignore` / declare module |
| `bcryptjs` may need types | Install `@types/bcryptjs` (if not already) |
| Breaking wrangler deploy | Test `--dry-run` after Phase 1 and after Phase 5 |
| Test failures from type errors | `npx vitest --run` after Phase 6 |
| Large PR size (89 file renames) | Can split into multiple PRs by phase |

### Pre-migration dependency check
```bash
cd backend
npm ls @types/bcryptjs 2>/dev/null || echo "NEED: npm i -D @types/bcryptjs"
```

---

## Execution Summary

**Total files to migrate:** 89 JS -> TS
**Already TS:** 10 files (no changes needed)
**Parallel execution lanes:** Up to 4 simultaneous workers in Phases 2-5
**Estimated effort:** ~12h total (~2h with 4 parallel agents)

```
Timeline (sequential minimum):
Phase 1: 30min  ████
Phase 2: 1h     ████████ (A) + ████ (B)     -- parallel
Phase 3: 2h     ████████████████ (A) + ████████████ (B)  -- parallel
Phase 4: 1.5h   ████████████ (A) + ████████ (B)  -- parallel
Phase 5: 4h     ████████████████ (A) + ████████████████ (B) + ████████████████ (C)  -- parallel
Phase 6: 1.5h   ████████████
Phase 7: 15min  ██
Phase 8: 30min  ████
```

---

## Unresolved Questions

1. **`xlsx-js-style` types** -- Does this package ship its own `.d.ts`? If not, need `declare module 'xlsx-js-style'` in a `.d.ts` file or install community types.
2. **`bcryptjs` types** -- Need to verify `@types/bcryptjs` is installed or add it.
3. **`better-sqlite3` types** -- Used in test setup? May need `@types/better-sqlite3`.
4. **Duplicate `authMiddleware`** in exam-management, exam-taking, grading routes -- should these be deduplicated as part of migration or left as-is? (Recommendation: leave as-is, separate refactoring task.)
5. **`wrangler.toml` main entry** -- When exactly to flip `main = "src/index.ts"`? Must be after Phase 1 completes and `index.ts` compiles. Wrangler handles `.ts` natively via esbuild.
