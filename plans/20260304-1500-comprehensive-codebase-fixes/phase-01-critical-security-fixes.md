# Phase 01 — Critical Security Fixes

## Context Links

- [Security Audit Report](../reports/security-auth-report.md)
- Auth route: `backend/src/routes/auth.js` (346 lines)
- JWT helpers: `backend/src/utils/helpers.js` (191 lines)
- Rate limiter: `backend/src/utils/rateLimiter.js` (124 lines)
- App entry: `backend/src/index.js` (239 lines)

## Overview

- **Priority:** 🔴 Critical — must deploy FIRST
- **Status:** Pending
- **Description:** Fix JWT expiration comparison bug, verify admin registration protection, confirm rate limiting is active

## Key Insights

1. **JWT exp comparison is WRONG:** `payload.exp < Date.now()` compares milliseconds with milliseconds, BUT `auth.js` line 79 sets `exp: Date.now() + 24*60*60*1000` (milliseconds). Standard JWT uses seconds. This means the system is internally consistent BUT deviates from JWT standard. If any external system reads the JWT, it will misinterpret `exp`.
2. **Admin registration already partially fixed:** `getAdminCount()` check exists (line 134-137 of auth.js). The original vulnerability was patched.
3. **Rate limiting is active:** `rateLimiter.js` exports real `loginRateLimiter` (5 attempts/15 min), `moderateRateLimiter` (200/min global), `strictRateLimiter` (10/min). `index.js` line 58 applies `moderateRateLimiter` globally. Login route (auth.js line 22) uses `loginRateLimiter`.
4. **Dynamic import redundancy:** `auth.js` line 299 does `await import('../utils/helpers.js')` for `verifyJWT` which is already imported at line 2.

## Requirements

### Functional
- JWT tokens must expire after 24 hours for admin, 7 days for student/teacher
- JWT `exp` must follow standard (seconds since epoch, not milliseconds)
- All exp validation must use `payload.exp * 1000 < Date.now()` pattern
- Admin creation must require existing admin JWT when adminCount > 0

### Non-Functional
- Zero downtime during deployment
- Existing valid sessions should not break immediately (handle both ms and sec format during transition)

## Architecture

No architectural changes. In-place fixes to existing files.

## Related Code Files

### Files to Modify
- `backend/src/utils/helpers.js` — Fix `generateJWT()` and `verifyJWT()`
- `backend/src/routes/auth.js` — Fix exp checks, remove redundant dynamic import
- `backend/src/index.js` — Fix exp check in `authMiddleware`

### Files to Create
- None

### Files to Delete
- None

## Implementation Steps

### Step 1: Fix JWT `exp` to use seconds (standard JWT format)

**File:** `backend/src/utils/helpers.js`

In `verifyJWT()` function (line 112):
```
// BEFORE (line 112):
if (payload.exp && payload.exp < Date.now()) {

// AFTER:
if (payload.exp && payload.exp * 1000 < Date.now()) {
```

### Step 2: Fix JWT generation in auth.js login to use seconds

**File:** `backend/src/routes/auth.js`

In POST `/login` handler (lines 73-82):
```js
// BEFORE (line 79):
exp: Date.now() + 24 * 60 * 60 * 1000 // 24 hours expiration

// AFTER:
exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60 // 24 hours in seconds (JWT standard)
```

### Step 3: Fix exp validation in auth.js `/verify` endpoint

**File:** `backend/src/routes/auth.js`

In POST `/verify` handler (line 112):
```js
// BEFORE:
if (!payload || payload.exp < Date.now()) {

// AFTER:
if (!payload || (payload.exp && payload.exp * 1000 < Date.now())) {
```

Note: `verifyJWT` already returns `null` for expired tokens after Step 1 fix, but this is a defense-in-depth check.

### Step 4: Fix exp validation in auth.js `/change-password` endpoint

**File:** `backend/src/routes/auth.js`

In POST `/change-password` handler (line 302):
```js
// BEFORE:
if (!payload || payload.exp < Date.now()) {

// AFTER:
if (!payload || (payload.exp && payload.exp * 1000 < Date.now())) {
```

### Step 5: Remove redundant dynamic import in change-password

**File:** `backend/src/routes/auth.js`

In POST `/change-password` handler (line 299):
```js
// BEFORE:
const { verifyJWT } = await import('../utils/helpers.js');
const payload = await verifyJWT(token, c.env.JWT_SECRET);

// AFTER (verifyJWT already imported at top of file):
const payload = await verifyJWT(token, c.env.JWT_SECRET);
```

### Step 6: Fix exp validation in index.js authMiddleware

**File:** `backend/src/index.js`

In `authMiddleware` (line 80):
```js
// BEFORE:
if (!payload || payload.exp < Date.now()) {

// AFTER:
if (!payload || (payload.exp && payload.exp * 1000 < Date.now())) {
```

### Step 7: Verify admin registration protection

**File:** `backend/src/routes/auth.js`

Verify lines 133-137 contain the `getAdminCount` check:
```js
const adminCount = await getAdminCount(c.env.DB);
if (adminCount > 0) {
  return errorResponse('Chỉ được phép tạo admin khi chưa có tài khoản nào trong hệ thống', 403);
}
```
**Status: ALREADY FIXED** — confirmed in current codebase. No action needed.

### Step 8: Verify rate limiting is active

**File:** `backend/src/index.js` and `backend/src/utils/rateLimiter.js`

Verify:
- Line 37: `import { moderateRateLimiter, strictRateLimiter } from './utils/rateLimiter.js';`
- Line 58: `app.use('*', moderateRateLimiter);`
- Line 116: `app.use('/payments/*', strictRateLimiter);`
- `rateLimiter.js` exports real limiter functions (not `noRateLimit` dummy)

**Status: ALREADY FIXED** — confirmed. `loginRateLimiter` is real (5 attempts/15 min). No dummy `noRateLimit` exists.

## Todo List

- [ ] Fix `verifyJWT()` exp comparison in `helpers.js` (seconds * 1000 vs Date.now())
- [ ] Fix `generateJWT()` call in `auth.js` `/login` to use seconds
- [ ] Fix exp validation in `auth.js` `/verify` endpoint
- [ ] Fix exp validation in `auth.js` `/change-password` endpoint
- [ ] Remove redundant dynamic import in `auth.js` `/change-password`
- [ ] Fix exp validation in `index.js` `authMiddleware`
- [ ] Verify admin registration protection (already fixed — confirm only)
- [ ] Verify rate limiting is active (already fixed — confirm only)
- [ ] Test login → verify → change-password flow end-to-end
- [ ] Test token expiration (set short exp, verify rejection after expiry)

## Success Criteria

1. JWT tokens contain `exp` in standard seconds-since-epoch format
2. Tokens expire correctly after 24 hours
3. `verifyJWT()` correctly rejects expired tokens
4. All 3 exp checks (helpers.js, auth.js x2, index.js) use `exp * 1000` comparison
5. Admin creation blocked when admins already exist
6. Rate limiting active on login (5/15min) and globally (200/min)
7. No redundant dynamic imports

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Existing sessions invalidated by exp format change | Medium | High | Transition period: `verifyJWT` should handle BOTH ms and sec formats for 24h after deploy |
| Login broken after JWT changes | Critical | Low | Test login flow before deploying; rollback plan ready |

### Transition Strategy for JWT Format Change

Since existing tokens store `exp` in milliseconds and new tokens will use seconds, add temporary detection in `verifyJWT`:

```js
// Detect if exp is in milliseconds (> year 2100 in seconds = 4102444800)
// If exp > 4102444800, it's in milliseconds format (old tokens)
const expMs = payload.exp > 4102444800 ? payload.exp : payload.exp * 1000;
if (expMs < Date.now()) {
  return null;
}
```

This handles both old (ms) and new (sec) tokens during transition. Remove after 24 hours (all old tokens expired).

## Security Considerations

- JWT secret rotation is NOT needed (tokens are re-signed with same secret)
- No database changes required
- CORS settings remain unchanged
- Password hashing (bcrypt rounds=10) is acceptable for now

## Next Steps

After Phase 1 deployment:
1. Monitor error logs for auth failures
2. Remove transition code after 24-48 hours
3. Proceed to Phase 2 (backend architecture refactor)
