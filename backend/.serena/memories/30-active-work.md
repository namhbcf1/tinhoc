# Active Work — 2026-05-07

## Task: Backend routes security audit + fixes

### Status: COMPLETED
`npx tsc --noEmit` passes with zero errors.

### Files Changed
| File | Changes |
|------|---------|
| `src/routes/export.ts` | Added `requireAdmin` to all 6 export routes; added `isNaN()` guards on all `parseInt()` ID params |
| `src/routes/certificates.ts` | Added `requireAdmin` import + middleware to 7 admin routes (GET /, GET /class/:id/eligible, POST /, POST /bulk, GET /:id/shipment, POST /:id/shipment, PUT /:id/revoke); capped `limit` to 500; added `isNaN()`+existence check to `PUT /:id/revoke` |
| `src/routes/exam-schedules.ts` | Added `isNaN()` guards on `parseInt(id)` at PUT /:id, DELETE /:id, POST /:id/restore, DELETE /:id/permanent, POST /:id/register, POST /:id/cancel, GET /:id/students; capped `limit` at /upcoming (100) and GET / (500) |
| `src/routes/assignments.ts` | Fixed null deref: `submissionCount.count` → `submissionCount?.count ?? 0` |
| `src/routes/student-reviews.ts` | Added `isNaN()` + existence check (SELECT id) before all PUT/DELETE by ID handlers |
| `src/routes/auth.ts` | Added max password length check (128) to `/reset-password` and `/change-password` |
| `src/routes/videos.ts` | Added `isNaN()` guard for `parseInt(classId)` in teacher access check |

### Issues Found and Fixed
1. **CRITICAL — PII exposure with zero auth** (`export.ts`): All 6 export endpoints returned full student PII (name, CCCD, phone, email, address) without any authentication. Fixed: `requireAdmin` on all routes.
2. **CRITICAL — Missing auth on admin routes** (`certificates.ts`): 7 admin routes had no auth middleware. Fixed: `requireAdmin` on all.
3. **Missing NaN guards** (`exam-schedules.ts`, `export.ts`): `parseInt(id)` without `isNaN()` check — NaN passed to `.bind()` causes unexpected DB behavior. Fixed across all affected routes.
4. **Limit param no upper bound** (`exam-schedules.ts`, `certificates.ts`): callers could request millions of rows. Fixed: capped at 100/500.
5. **Null deref** (`assignments.ts`): `submissionCount.count` without null guard on `.first()` result. Fixed: optional chaining.
6. **Missing existence checks** (`student-reviews.ts`): PUT/DELETE by ID returned 200 for non-existent IDs. Fixed: SELECT existence check before update/delete.
7. **No max password length** (`auth.ts`): bcrypt DoS vector via huge passwords. Fixed: 128-char cap.
8. **NaN from non-numeric classId** (`videos.ts`): teacher role check passed NaN to DB query. Fixed: isNaN guard.
