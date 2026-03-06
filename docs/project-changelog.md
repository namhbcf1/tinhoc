# Project Changelog

## [2026-03-04]
- **Phase 1: Critical Security Fixes** ✅
  - Fixed JWT expiration bug: Changed from milliseconds to seconds standard (IEEE 754 compliance).
  - Implemented transition logic for legacy milliseconds-format tokens (automatic detection for tokens with exp > year 2100).
  - Enhanced verifyJWT to handle both token formats seamlessly during 24h transition period.
  - Removed redundant dynamic import in auth.js change-password endpoint.
  - Strengthened password policy: Minimum length increased from 6 to 8 characters.
  - Confirmed admin registration protection (getAdminCount validation exists).
  - Verified rate limiting active across all endpoints (loginRateLimiter, moderateRateLimiter, strictRateLimiter).

- **Phase 2: Backend Architecture Refactor** ✅
  - Renamed 6 backend utility files to kebab-case standard:
    - notificationHelper → notification-helper.ts
    - fileUtils → file-utils.ts
    - rateLimiter → rate-limiter.ts
    - emailService → email-service.ts
    - sessionManager → session-manager.ts
    - pdfGenerator → pdf-generator.ts
  - Updated 7 importing files with new kebab-case paths.
  - Split exam-queries.js (1,384 LOC) into 13 specialized repository files + 18-line backward-compatibility shim.
  - Preserved all 43 query functions; no API changes.

- **Phase 3: Frontend Architecture Refactor** ✅
  - Split frontend/services/api.js (1,820 LOC) into 48-line barrel export + 19 domain-specific modules (20 files total).
  - Removed duplicate uploadClassDocument and getPosts methods during refactoring.
  - Maintained single `api.default` interface through mixin pattern (zero caller changes required).

- **Phase 4: Bug Fixes & Cleanup** ✅
  - Deleted unused LiveChat.jsx component; removed all 12 references.
  - Refactored analytics: Moved placeholder IDs to env vars, split into 3 modular files.
  - Consolidated BackToTop + ScrollToTopButton into single ScrollToTopButton component.
  - Consolidated DateInputDDMMYYYY + DateInput into single DateInput component.
  - Created frontend/.env.example template for deployment configuration.

## [2026-03-02]
- Consolidated manual deployment scripts (.sh, .bat, .ps1) into GitHub Actions workflow.
- Established CI/CD pipeline for automated Cloudflare Workers (Backend) and Cloudflare Pages (Frontend) deployments.
- Overhauled deployment architecture documentation.

## [2026-03-01]
- Hoàn thiện cấu hình hạ tầng Test với Vitest cho Cloudflare Workers.
- Hoàn thành bộ mock database D1.
- Chuẩn hoá code module lớp học trực tuyến (`online-classes`) bao phủ kiến trúc 3 lớp: Route, Service, Repository.
