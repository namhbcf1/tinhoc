# Phase 02 — Backend Architecture Refactor

## Context Links

- [Standards Audit Report](../reports/standards-audit-report.md)
- [Final Audit Report](../reports/final-audit-report.md)
- Architecture standard: `docs/system-architecture.md` (3-layer: Route → Service → Repository)
- Existing 3-layer example: `backend/src/lib/services/online-classes.js`, `backend/src/lib/repositories/online-classes.js`
- Already refactored: `students.js` (105 lines), `documents.js` (141 lines), `classes.js` route (108 lines)

## Overview

- **Priority:** 🟠 High
- **Status:** Pending
- **Description:** Split all backend files exceeding 200 LOC. Apply 3-layer architecture (Route → Service → Repository). Rename camelCase files to kebab-case. Split existing oversized lib/ files.

## Key Insights

1. **Already done:** `students.js` (105), `documents.js` (141), `classes.js` (108) are already under 200 LOC
2. **Existing 3-layer files ALSO too large:** `lib/services/online-classes.js` (541), `lib/repositories/online-classes.js` (398), `lib/services/classes.js` (272) — need splitting too
3. **`db/` folder pattern:** Most DB queries live in `db/*.js` flat files. These serve as de facto repositories but lack the `lib/repositories/` organization
4. **Routes contain business logic:** Most routes do validation + DB calls + response formatting in one function. Need extracting service layer.
5. **19 files still >200 LOC** after excluding already-fixed ones

## Requirements

### Functional
- All backend files under 200 lines of code
- 3-layer architecture: `routes/` → `lib/services/` → `lib/repositories/`
- Routes only handle HTTP (parse request, call service, return response)
- Services contain business logic (validation, transformation, orchestration)
- Repositories contain SQL queries only
- All files use kebab-case naming

### Non-Functional
- No API contract changes (same endpoints, same request/response shapes)
- No database schema changes
- Backward-compatible import paths (update all callers)

## Architecture

```
backend/src/
├── routes/           # HTTP handlers only (<200 LOC each)
│   ├── auth.js
│   ├── exam-schedules.js      # Split into sub-route files if needed
│   └── ...
├── lib/
│   ├── services/     # Business logic (<200 LOC each)
│   │   ├── exam-schedule-service.js
│   │   ├── exam-schedule-google-calendar-service.js
│   │   ├── teacher-service.js
│   │   └── ...
│   └── repositories/ # SQL queries (<200 LOC each)
│       ├── exam-repository.js         # (already exists, 99 lines)
│       ├── exam-query-repository.js
│       ├── exam-attempt-repository.js
│       └── ...
├── utils/            # Renamed to kebab-case
│   ├── notification-helper.js   (was notificationHelper.js)
│   ├── file-utils.js            (was fileUtils.js)
│   ├── rate-limiter.js          (was rateLimiter.js)
│   ├── email-service.js         (was emailService.js)
│   ├── session-manager.js       (was sessionManager.js)
│   ├── pdf-generator.js         (was pdfGenerator.js)
│   └── cloudflare-images.js     (285 LOC → split)
└── db/               # DEPRECATED - migrate to lib/repositories/
```

## Related Code Files

### Batch 1: File Renames (kebab-case) — DO FIRST
| Current Path | New Path | Lines |
|---|---|---|
| `utils/notificationHelper.js` | `utils/notification-helper.js` | ~OK |
| `utils/fileUtils.js` | `utils/file-utils.js` | ~OK |
| `utils/rateLimiter.js` | `utils/rate-limiter.js` | 124 |
| `utils/emailService.js` | `utils/email-service.js` | ~OK |
| `utils/sessionManager.js` | `utils/session-manager.js` | ~OK |
| `utils/pdfGenerator.js` | `utils/pdf-generator.js` | 272 → split |

### Batch 2: Largest Files (>500 LOC) — HIGH PRIORITY
| File | Lines | Action |
|---|---|---|
| `db/exam-queries.js` | 1,384 | Split into 7 repository files |
| `routes/exam-schedules.js` | 816 | Extract service + repository |
| `db/queries.js` | 786 | Split into domain-specific repositories |
| `services/google-calendar.js` | 790 | Split by concern |
| `routes/export.js` | 744 | Extract service layer |
| `routes/online-classes.js` | 559 | Extract remaining logic to service |
| `routes/assignments.js` | 559 | Extract service + repository |
| `lib/services/online-classes.js` | 541 | Split into sub-services |

### Batch 3: Medium Files (200-500 LOC) — MEDIUM PRIORITY
| File | Lines | Action |
|---|---|---|
| `routes/teachers.js` | 446 | Extract service + repository |
| `db/attendance-queries.js` | 420 | Move to repository |
| `routes/videos.js` | 411 | Extract service |
| `lib/repositories/online-classes.js` | 398 | Split into sub-repositories |
| `routes/certificates.js` | 376 | Extract service |
| `routes/auth.js` | 346 | Extract auth-service.js |
| `routes/cccd-upload.js` | 346 | Extract service |
| `db/teacher-queries.js` | 319 | Move to repository |
| `routes/class-schedules.js` | 303 | Extract service |
| `routes/payments.js` | 293 | Extract service |
| `utils/cloudflare-images.js` | 285 | Split by function group |
| `utils/pdfGenerator.js` | 272 | Rename + split |
| `routes/admins.js` | 259 | Extract service |
| `routes/reports.js` | 249 | Extract service |
| `db/document-queries.js` | 233 | Move to repository |
| `db/post-queries.js` | 229 | Move to repository |
| `routes/registrations.js` | 224 | Extract service |
| `routes/attendance.js` | 222 | Extract service |
| `index.js` | 239 | Split route registration |
| `routes/document-folders.js` | 209 | Extract service |
| `routes/messaging.js` | 201 | Extract service |
| `lib/services/classes.js` | 272 | Split into sub-services |

## Implementation Steps

### Sub-Phase 2A: File Renames (Day 1)

#### Step 1: Rename all camelCase util files to kebab-case

For each file rename, update ALL import statements across the codebase:

```bash
# 1. Rename files
git mv backend/src/utils/notificationHelper.js backend/src/utils/notification-helper.js
git mv backend/src/utils/fileUtils.js backend/src/utils/file-utils.js
git mv backend/src/utils/rateLimiter.js backend/src/utils/rate-limiter.js
git mv backend/src/utils/emailService.js backend/src/utils/email-service.js
git mv backend/src/utils/sessionManager.js backend/src/utils/session-manager.js
git mv backend/src/utils/pdfGenerator.js backend/src/utils/pdf-generator.js

# 2. Find and update all imports (grep for old names)
grep -r "notificationHelper" backend/src/ --include="*.js" -l
grep -r "fileUtils" backend/src/ --include="*.js" -l
grep -r "rateLimiter" backend/src/ --include="*.js" -l
grep -r "emailService" backend/src/ --include="*.js" -l
grep -r "sessionManager" backend/src/ --include="*.js" -l
grep -r "pdfGenerator" backend/src/ --include="*.js" -l
```

Update each import from `'../utils/camelCase.js'` to `'../utils/kebab-case.js'`.

### Sub-Phase 2B: Split db/exam-queries.js (Day 1-2)

Split 1,384 lines into domain-specific repository files:

| New File | Functions | Est. Lines |
|---|---|---|
| `lib/repositories/exam-type-repository.js` | `getExamTypes`, `getExamTypeByCode`, `createExamType` | ~40 |
| `lib/repositories/exam-test-repository.js` | `getExamTests`, `getExamTestById`, `createExamTest`, `updateExamTest`, `deleteExamTest` | ~120 |
| `lib/repositories/exam-test-detail-repository.js` | `getExamTestWithDetails` | ~130 |
| `lib/repositories/exam-attempt-repository.js` | `createExamAttempt`, `getCurrentAttempt`, `getExamAttempt`, `updateExamAttempt`, `submitExamAttempt`, `getMyAttempts` | ~150 |
| `lib/repositories/exam-answer-repository.js` | `saveAnswer`, `calculateScore`, `getAttemptResult` | ~150 |
| `lib/repositories/exam-section-repository.js` | `createSection`, `updateSection`, `deleteSection`, `completeSection` | ~80 |
| `lib/repositories/exam-question-repository.js` | `createQuestion`, `updateQuestion`, `deleteQuestion` | ~100 |
| `lib/repositories/exam-access-repository.js` | `updateHeartbeat`, `validateAttemptAccess`, `checkAttemptExpiry`, `rateLimitAttempts`, `checkTestAccess` | ~120 |
| `lib/repositories/exam-registration-repository.js` | `registerForExamTest`, `checkRegistrationStatus`, `approveExamTestRegistration`, `rejectExamTestRegistration`, `getExamTestRegistrations` | ~100 |
| `lib/repositories/exam-review-repository.js` | `submitTestForReview`, `approveTest`, `rejectTest`, `getPendingTests`, `getTestReviews` | ~130 |
| `lib/repositories/exam-activity-repository.js` | `logExamActivity`, `getActivityLogs` | ~60 |
| `lib/repositories/exam-import-repository.js` | `importTestFromJSON` | ~70 |

After split, create barrel export `lib/repositories/exam-queries-index.js` re-exporting all for backward compat:
```js
export * from './exam-type-repository.js';
export * from './exam-test-repository.js';
// ...etc
```

Update `db/exam-queries.js` to re-export from new files (temporary backward compat):
```js
// Backward compatibility - redirect to new locations
export * from '../lib/repositories/exam-type-repository.js';
export * from '../lib/repositories/exam-test-repository.js';
// ...
```

### Sub-Phase 2C: Split db/queries.js (Day 2)

Split 786 lines into domain repositories:

| New File | Functions | Est. Lines |
|---|---|---|
| `lib/repositories/student-repository.js` | `findStudentByCCCD`, `findStudentByEmailOrPhone`, `createStudent`, `updateStudent`, `deleteStudent`, `getAllStudents`, `searchStudents` | ~180 |
| `lib/repositories/class-repository.js` | `getAllClasses`, `getOpenClasses`, `getClassById`, `createClass`, `updateClass`, `deleteClass`, `syncClassStudentCount` | ~170 |
| `lib/repositories/registration-repository.js` | `findRegistration`, `createRegistration`, `updateRegistrationStatus`, `getRegistrationsByClass`, `getStudentRegistrations`, `updateSoPhach`, `deleteRegistration` | ~160 |
| `lib/repositories/admin-repository.js` | `findAdminByUsername`, `updateAdminLastLogin`, `createAdmin`, `updateAdminPassword`, `findAdminById`, `createPasswordResetToken`, `findPasswordResetToken`, `markPasswordResetTokenAsUsed`, `invalidateAllPasswordResetTokens` | ~100 |
| `lib/repositories/audit-repository.js` | `createAuditLog`, `logStudentEditHistory`, `getStudentEditHistory` | ~60 |

Add backward compat re-export in `db/queries.js`.

### Sub-Phase 2D: Split services/google-calendar.js (Day 2)

Split 790 lines by concern:

| New File | Est. Lines |
|---|---|
| `services/google-calendar-auth.js` — OAuth token management | ~150 |
| `services/google-calendar-events.js` — Create/update/delete events | ~180 |
| `services/google-calendar-sync.js` — Sync class schedules to calendar | ~180 |
| `services/google-calendar-helpers.js` — Date formatting, timezone utils | ~80 |

Keep `services/google-calendar.js` as barrel export re-exporting all.

### Sub-Phase 2E: Extract Route Service Layers (Day 3-4)

For each large route file, create a corresponding service file:

**Pattern for each route refactor:**
1. Create `lib/services/{domain}-service.js` with business logic
2. Move validation, data transformation, orchestration to service
3. Route keeps only: parse request → call service → format response
4. Service calls repository functions (from `lib/repositories/` or `db/`)

**Priority order (largest first):**

| Route | Lines | Service to Create | Repository to Create/Use |
|---|---|---|---|
| `routes/exam-schedules.js` (816) | → `lib/services/exam-schedule-service.js` | Use existing `db/` queries, later migrate |
| `routes/export.js` (744) | → `lib/services/export-service.js` | Calls existing query functions |
| `routes/online-classes.js` (559) | → extend `lib/services/online-classes.js` | Uses existing repository |
| `routes/assignments.js` (559) | → `lib/services/assignment-service.js` | → `lib/repositories/assignment-repository.js` |
| `routes/teachers.js` (446) | → `lib/services/teacher-service.js` | Use `db/teacher-queries.js` → later migrate |
| `routes/videos.js` (411) | → `lib/services/video-service.js` | Extract queries |
| `routes/certificates.js` (376) | → `lib/services/certificate-service.js` | Extract queries |
| `routes/auth.js` (346) | → `lib/services/auth-service.js` | Use admin-repository |
| `routes/cccd-upload.js` (346) | → `lib/services/cccd-upload-service.js` | Extract queries |
| `routes/class-schedules.js` (303) | → `lib/services/class-schedule-service.js` | Extract queries |
| `routes/payments.js` (293) | → `lib/services/payment-service.js` | Extract queries |
| `routes/admins.js` (259) | → `lib/services/admin-service.js` | Use admin-repository |
| `routes/reports.js` (249) | → `lib/services/report-service.js` | Extract queries |
| `routes/registrations.js` (224) | → `lib/services/registration-service.js` | Use registration-repository |
| `routes/attendance.js` (222) | → `lib/services/attendance-service.js` | Use `db/attendance-queries.js` |
| `routes/document-folders.js` (209) | → `lib/services/document-folder-service.js` | Extract queries |
| `routes/messaging.js` (201) | → `lib/services/messaging-service.js` | Extract queries |

### Sub-Phase 2F: Split Oversized Existing Lib Files (Day 4)

| File | Lines | Split Into |
|---|---|---|
| `lib/services/online-classes.js` (541) | `online-classes-enrollment-service.js` (~180), `online-classes-management-service.js` (~180), `online-classes-video-service.js` (~180) |
| `lib/repositories/online-classes.js` (398) | `online-classes-enrollment-repository.js` (~130), `online-classes-management-repository.js` (~130), `online-classes-query-repository.js` (~130) |
| `lib/services/classes.js` (272) | `classes-management-service.js` (~140), `classes-query-service.js` (~130) |

### Sub-Phase 2G: Split Oversized Utils (Day 4-5)

**`utils/cloudflare-images.js` (285 lines):**
- `utils/cloudflare-images-upload.js` — Upload functions
- `utils/cloudflare-images-transform.js` — Image transform/resize
- `utils/cloudflare-images.js` — Barrel export

**`utils/pdf-generator.js` (272 lines → rename to `pdf-generator.js`):**
- `utils/pdf-generator-templates.js` — HTML templates
- `utils/pdf-generator-core.js` — PDF generation logic

### Sub-Phase 2H: Migrate Remaining db/ Files (Day 5)

Move `db/` files to `lib/repositories/`:

| From | To | Lines |
|---|---|---|
| `db/attendance-queries.js` (420) | `lib/repositories/attendance-repository.js` + `lib/repositories/attendance-report-repository.js` | ~200 + ~200 |
| `db/teacher-queries.js` (319) | `lib/repositories/teacher-repository.js` + `lib/repositories/teacher-schedule-repository.js` | ~160 + ~160 |
| `db/document-queries.js` (233) | `lib/repositories/document-repository.js` + `lib/repositories/document-share-repository.js` | ~120 + ~120 |
| `db/post-queries.js` (229) | `lib/repositories/post-repository.js` + `lib/repositories/post-category-repository.js` | ~120 + ~110 |
| `db/admin-queries.js` | `lib/repositories/admin-activity-repository.js` (if >200 LOC) | Check size |

Keep `db/` files as re-export shims for backward compat. Remove shims in a later cleanup cycle.

### Sub-Phase 2I: Clean Up index.js (Day 5)

**`index.js` (239 lines):**

Split route registration into `routes/register-routes.js`:
- Move lines 93-219 (all `app.route()` and `app.use()` calls) to a `registerRoutes(app)` function
- `index.js` becomes: imports + middleware + `registerRoutes(app)` + error handlers

## Todo List

### 2A: Renames
- [ ] Rename `notificationHelper.js` → `notification-helper.js` + update imports
- [ ] Rename `fileUtils.js` → `file-utils.js` + update imports
- [ ] Rename `rateLimiter.js` → `rate-limiter.js` + update imports
- [ ] Rename `emailService.js` → `email-service.js` + update imports
- [ ] Rename `sessionManager.js` → `session-manager.js` + update imports
- [ ] Rename `pdfGenerator.js` → `pdf-generator.js` + update imports
- [ ] Verify no broken imports after renames

### 2B: Split exam-queries.js
- [ ] Create 12 exam repository files in `lib/repositories/`
- [ ] Create barrel export file
- [ ] Update `db/exam-queries.js` as re-export shim
- [ ] Update all import statements across routes
- [ ] Verify all exam functions still work

### 2C: Split queries.js
- [ ] Create 5 domain repository files
- [ ] Update `db/queries.js` as re-export shim
- [ ] Update all import statements
- [ ] Test student/class/registration/admin flows

### 2D: Split google-calendar.js
- [ ] Create 4 sub-service files
- [ ] Update barrel export
- [ ] Test calendar sync functionality

### 2E: Extract service layers for 17 routes
- [ ] `exam-schedules` → service
- [ ] `export` → service
- [ ] `online-classes` → extend service
- [ ] `assignments` → service + repository
- [ ] `teachers` → service
- [ ] `videos` → service
- [ ] `certificates` → service
- [ ] `auth` → service
- [ ] `cccd-upload` → service
- [ ] `class-schedules` → service
- [ ] `payments` → service
- [ ] `admins` → service
- [ ] `reports` → service
- [ ] `registrations` → service
- [ ] `attendance` → service
- [ ] `document-folders` → service
- [ ] `messaging` → service

### 2F: Split oversized lib files
- [ ] Split `lib/services/online-classes.js` into 3 files
- [ ] Split `lib/repositories/online-classes.js` into 3 files
- [ ] Split `lib/services/classes.js` into 2 files

### 2G: Split oversized utils
- [ ] Split `cloudflare-images.js` into 2 files
- [ ] Split `pdf-generator.js` into 2 files

### 2H: Migrate db/ to repositories
- [ ] Migrate `attendance-queries.js`
- [ ] Migrate `teacher-queries.js`
- [ ] Migrate `document-queries.js`
- [ ] Migrate `post-queries.js`
- [ ] Check and migrate `admin-queries.js` if needed

### 2I: Clean up index.js
- [ ] Extract route registration to `routes/register-routes.js`
- [ ] Verify index.js < 200 lines

### Final Verification
- [ ] Run `wc -l` on ALL backend `.js` files — none exceeds 200
- [ ] Run `find` for camelCase filenames — zero results
- [ ] Run existing tests — all pass
- [ ] Manual smoke test of all major API endpoints

## Success Criteria

1. **Zero files >200 LOC** in `backend/src/`
2. **Zero camelCase filenames** in `backend/src/`
3. **All routes** follow thin-handler pattern (parse → service → respond)
4. **All DB queries** reside in `lib/repositories/`
5. **All business logic** resides in `lib/services/`
6. **All existing tests pass** unchanged
7. **All API endpoints return same responses** as before refactor

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Breaking imports during rename | High | Medium | Use `grep -r` to find all callers before rename; commit each rename atomically |
| Missing function during split | High | Medium | Export count check: count exports before and after split — must match |
| Circular dependencies after restructure | Medium | Low | Services depend on repositories, never vice versa; routes depend on services only |
| Performance regression from extra function calls | Low | Very Low | JS function call overhead is negligible |
| Test breakage from moved files | Medium | Medium | Update test imports in same commit; run tests after each batch |

## Security Considerations

- No security-related logic changes in this phase (already handled in Phase 1)
- File renames don't affect runtime behavior
- All SQL queries preserved exactly as-is during migration

## Next Steps

- After Phase 2, Phase 3 (frontend) can proceed independently
- Old `db/` re-export shims can be removed in a future cleanup cycle after all callers are updated
- Consider adding TypeScript types as a Phase 5 future enhancement
