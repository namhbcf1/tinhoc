# Comprehensive Codebase Fixes Plan

**Created:** 2026-03-04
**Status:** ✅ Complete
**Actual Effort:** 1 day (all phases completed)

## Summary

Address all critical security vulnerabilities, enforce architecture standards (3-layer, <200 LOC, kebab-case), remove dead code/duplicates, and fix remaining bugs in the VanTrangEdu codebase.

## Current State

- **Security:** JWT expiration comparison bug, `/auth/create-admin` was fixed (adminCount check exists), rate limiting was restored
- **Backend:** 25+ files exceed 200 LOC; only `online-classes` and `classes` have 3-layer pattern; `students.js` and `documents.js` already refactored to <200 lines; 6 files violate kebab-case naming
- **Frontend:** `services/api.js` = 1,819 lines with duplicate methods; 15+ page files >500 LOC; duplicate components (BackToTop/ScrollToTopButton, DateInput/DateInputDDMMYYYY); LiveChat disabled; analytics placeholder IDs
- **Existing 3-layer example:** `lib/services/online-classes.js` (541 LOC), `lib/repositories/online-classes.js` (398 LOC), `lib/services/classes.js` (272 LOC) — all ALSO exceed 200 LOC and need splitting

## Phases

| # | Phase | Priority | Status | Actual Days |
|---|-------|----------|--------|------------|
| 1 | [Critical Security Fixes](./phase-01-critical-security-fixes.md) | 🔴 Critical | ✅ Complete | 1 day |
| 2 | [Backend Architecture Refactor](./phase-02-backend-architecture-refactor.md) | 🟠 High | ✅ Complete | 1 day |
| 3 | [Frontend Architecture Refactor](./phase-03-frontend-architecture-refactor.md) | 🟡 Medium | ✅ Complete | < 1 day |
| 4 | [Bug Fixes & Cleanup](./phase-04-bug-fixes-and-cleanup.md) | 🟢 Low | ✅ Complete | < 1 day |

## Dependencies

- Phase 1 MUST complete before any other phase (production security)
- Phase 2 and Phase 3 can run in parallel (backend vs frontend)
- Phase 4 depends on Phase 3 (duplicate removal after frontend restructure)

## Key Constraints

- **PRODUCTION SYSTEM** — zero downtime, no breaking changes
- All files must be <200 lines after refactoring
- Kebab-case for all filenames
- Vietnamese for UI/error messages, English for code
- Follow YAGNI/KISS/DRY
- Existing API contracts must not change (backward compatible)

## Risk Summary

| Risk | Mitigation |
|------|------------|
| Breaking API during refactor | Keep route paths/handlers identical; only move internal logic |
| Regression in auth flow | Test login/verify/change-password before deploying Phase 1 |
| Import path breakage after file renames | Update all imports in same commit; grep for old paths |
| Frontend api.js split breaks callers | Keep single barrel export `api.default` object unchanged |
