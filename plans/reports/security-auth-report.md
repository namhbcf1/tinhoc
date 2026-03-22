## Code Review Summary

### Scope
- Files: backend/src/routes/auth.js
- LOC: ~250
- Focus: Security, authentication, JWT+bcrypt, auth guards, OTP
- Scout findings: 
  - `adminGuard.ts`, `customerGuard.ts` missing from the entire codebase.
  - Customer OTP phone implementation missing.

### Overall Assessment
The current authentication implementation has critical security flaws. The app does not follow the requested 3-layer architecture, missing several components (OTP, Guards, standard API response templates). The JWT implementation lacks expiration and the login endpoint explicitly bypasses rate limiting.

### Critical Issues
1. **Open Admin Registration**: `POST /auth/create-admin` allows anyone to create a new admin account if they use a username that doesn't exist yet. It does not enforce a "one-time setup" correctly (needs to check if `COUNT(admins) == 0`).
2. **Permanent JWT**: `generateJWT` explicitly omits the expiration (`exp`), resulting in tokens valid forever. Stolen tokens cannot be invalidated without rotating `JWT_SECRET`.
3. **Disabled Rate Limiting**: `loginRateLimiter` is replaced with dummy `noRateLimit` middleware, leaving the application highly vulnerable to brute force and credential stuffing attacks.

### High Priority
1. **Missing Auth Guards**: `adminGuard.ts` and `customerGuard.ts` are completely missing.
2. **Missing OTP Module**: No Customer module `OTP phone` implementation was found in the codebase.
3. **Missing API Templates & Architecture**: Not using `createPostEndpoint`/`createGetEndpoint` from `lib/api-templates.ts` as required. Code is directly in `routes/auth.js` instead of the specified 3-layer architecture (`API Routes -> Services -> Repositories -> D1`).

### Medium Priority
1. **Password Policy**: `POST /auth/change-password` enforces only 6 characters minimal. Recommend 8 characters standard.
2. **JWT Expiration Validation Bug**: The check `payload.exp < Date.now()` in `POST /auth/verify` compares seconds (standard JWT `exp`) with milliseconds (`Date.now()`). If `exp` is ever added, this check will always evaluate to true and reject all valid tokens. It should be `payload.exp * 1000 < Date.now()`.

### Low Priority
1. **Dynamic Import Overhead**: `change-password` uses a dynamic import `await import('../utils/helpers.js')` to fetch `verifyJWT`, which is redundant and inefficient as `verifyJWT` is already imported at the top of the file.
2. **Bcrypt Rounds**: Hardcoded to `10`. Consider raising to `12` or using environmental configuration.

### Positive Observations
- Required Vietnamese UI/lỗi/validation messages are rigorously applied correctly in `auth.js` (e.g., 'Thiếu token', 'Tài khoản không tồn tại').
- Bcrypt hashing is correctly async.
- Proper fallback logic for forgot-password in dev vs production.

### Recommended Actions
1. **Fix Admin Setup**: Protect `/create-admin` by executing `SELECT COUNT(*) FROM admins`. If > 0, require JWT admin auth to create new admins.
2. **Implement Proper JWT**: Pass `exp` into JWT payload (e.g., `Math.floor(Date.now() / 1000) + 60 * 60 * 24` for 1 day) and fix the verify validation multiplier.
3. **Enable Rate Limits**: Remove `noRateLimit` and restore `loginRateLimiter` on `/login`.
4. **Implement Missing Components**: Create `adminGuard.ts`, `customerGuard.ts`, and the Customer OTP feature using Next.js Server Components architecture.
5. **Refactor Architecture**: Separate logic into `services/` and D1 SQL bindings into `repositories/`. Avoid direct `c.env.DB` queries in routing files.

### Metrics
- Type Coverage: 0% (Current codebase uses JS instead of required TypeScript 5)
- Test Coverage: Unknown (but `online-classes-auth.test.js` exists)
- Linting Issues: N/A

### Unresolved Questions
1. Why is the frontend built as React/Vite (presence of `frontend/dist/assets/index.es-[hash].js`) instead of the requested Next.js 15 App Router?
2. Where exactly should `adminGuard.ts` and `customerGuard.ts` be placed in the current non-standard project structure?
3. Where should the OTP implementation be located?
