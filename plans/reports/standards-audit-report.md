# Standards Audit Report

**Date:** 2026-03-02
**Project:** Trường Phát Computer (Thongtin Workspace)

## Executive Summary
This report evaluates the current codebase against the established architectural and coding standards set in `./docs/code-standards.md` and `./docs/system-architecture.md`. The audit reveals significant discrepancies between the written standards and the actual implementation of the `backend` codebase.

## 1. Modularity Limit (Files under 200 lines)

**Standard:** Mọi file code bắt buộc phải dưới 200 dòng (Rule 1.1).

**Finding:** 🔴 **CRITICAL VIOLATION**
Numerous files drastically exceed the 200-line limit. The backend has become monolithic rather than modular.

**Violating Files:**
- `backend/src/db/exam-queries.js` (1384 lines)
- `backend/src/routes/students.js` (840 lines)
- `backend/src/routes/documents.js` (817 lines)
- `backend/src/routes/exam-schedules.js` (816 lines)
- `backend/src/services/google-calendar.js` (790 lines)
- `backend/src/db/queries.js` (786 lines)
- `backend/src/routes/export.js` (744 lines)
- `backend/src/routes/online-classes.js` (559 lines)
- `backend/src/routes/assignments.js` (559 lines)
- `backend/src/lib/services/online-classes.js` (541 lines)
- `backend/src/routes/classes.js` (455 lines)
- `backend/src/routes/teachers.js` (446 lines)
- `backend/src/test/repositories/online-classes-enrollments.test.js` (421 lines)
- `backend/src/db/attendance-queries.js` (420 lines)
- `backend/src/test/repositories/online-classes-queries.test.js` (419 lines)
- `backend/src/routes/videos.js` (411 lines)
- `backend/src/lib/repositories/online-classes.js` (398 lines)
- `backend/src/routes/certificates.js` (376 lines)
- `backend/src/test/routes/online-classes-endpoints.test.js` (356 lines)
- `backend/src/routes/auth.js` (343 lines)
- `backend/src/routes/cccd-upload.js` (339 lines)
- `backend/src/db/teacher-queries.js` (319 lines)
- `backend/src/routes/class-schedules.js` (303 lines)
- `backend/src/routes/payments.js` (293 lines)
- `backend/src/utils/cloudflare-images.js` (285 lines)
- `backend/src/utils/pdfGenerator.js` (272 lines)
- `backend/src/routes/admins.js` (259 lines)
- `backend/src/routes/reports.js` (249 lines)
- `backend/src/test/services/online-classes-capacity.test.js` (244 lines)
- `backend/src/db/document-queries.js` (233 lines)
- `backend/src/db/post-queries.js` (229 lines)
- `backend/src/routes/registrations.js` (224 lines)
- `backend/src/routes/attendance.js` (222 lines)
- `backend/src/index.js` (220 lines)
- `backend/src/routes/document-folders.js` (209 lines)
- `backend/src/routes/messaging.js` (201 lines)

## 2. Kebab-case Naming Convention

**Standard:** Sử dụng kebab-case cho tên file (ví dụ: user-service.ts, product-list.tsx) (Rule 1.1).

**Finding:** 🟡 **PARTIAL VIOLATION**
There are files not following the `kebab-case` standard.

**Violating Files:**
- `backend/src/utils/notificationHelper.js` (camelCase)
- `backend/src/utils/fileUtils.js` (camelCase)
- `backend/src/utils/rateLimiter.js` (camelCase)
- `backend/src/utils/emailService.js` (camelCase)
- `backend/src/utils/sessionManager.js` (camelCase)
- `backend/src/utils/pdfGenerator.js` (camelCase)

## 3. Strict 3-Layer Architecture

**Standard:** Kiến trúc 3 lớp: API Routes → Services (lib/services/) → Repositories (lib/repositories/) → D1 (System Architecture).

**Finding:** 🔴 **CRITICAL VIOLATION**
The codebase strongly deviates from the defined 3-layer architecture.

**Observations:**
1. **Misplaced Responsibilities:** There is a heavy reliance on a generic `backend/src/db/` folder (e.g., `exam-queries.js`, `queries.js`) instead of using the specified `lib/repositories/` structure.
2. **Direct Route Access:** The routing files (`backend/src/routes/`) seem excessively large, heavily implying that business logic (Services) and potentially data access (Repositories) are being handled directly inside the routing layer rather than being delegated to `lib/services/`.
3. **Incomplete Layers:** While there is a `backend/src/lib/services/online-classes.js` and `backend/src/lib/repositories/online-classes.js`, this pattern is entirely missing for the vast majority of the application (e.g., exams, students, documents, payments). The architecture is not uniformly applied.

## Conclusion and Recommendations

The current implementation is in a state of high architectural debt. The rules established in the documentation are largely ignored in the current backend structure.

**Immediate Actions Required:**
1. **Enforce File Size Limits:** Begin a refactoring campaign to split the massive `routes/` and `db/` files into smaller, manageable chunks.
2. **Implement the 3-Layer Architecture:** Migrate logic out of the `routes/` directory into a newly established `lib/services/` layer, and move data access from the haphazard `db/` folder into structured `lib/repositories/`.
3. **Rename Files:** Standardize all file names to `kebab-case` immediately.
4. **Halt Feature Development:** Consider pausing new feature development on the backend until this technical debt is addressed, as the current state guarantees high maintenance costs and bug potential.