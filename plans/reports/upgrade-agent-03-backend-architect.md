# Agent 3: Backend API Architect — Báo cáo nâng cấp

## Tổng điểm: 4.5/10

**Stack:** Cloudflare Workers + Hono framework + D1 SQLite + R2 Storage + Workers AI
**Quy mô:** ~30 route files, ~15 db query files, ~10 utility/service files, 19+ migrations

---

## 1. API Design Issues

### 1.1. CRITICAL — Auth middleware bị lặp lại 6+ lần (Code Duplication)

**Mức độ: 🔴 Critical**

Auth middleware được copy-paste vào TỪ MỌI route file thay vì dùng shared middleware:

| File | Middleware riêng |
|------|-----------------|
| `src/routes/exam-management.js` | `authMiddleware` + `adminOnly` (dòng 12-28) |
| `src/routes/exam-taking.js` | `authMiddleware` (dòng 12-19) |
| `src/routes/grading.js` | `authMiddleware` + `gradingAccess` (dòng 12-29) |
| `src/routes/online-classes.js` | `authMiddleware` + `adminOnly` + `studentAuth` (dòng 39-98) |
| `src/routes/documents.js` | `authMiddleware` (dòng 10-17) |
| `src/routes/teachers.js` | `teacherAuthMiddleware` + `adminAuthMiddleware` (dòng 21-42, 270-291) |

Trong khi đã có `src/middleware/auth-middleware.js` export `authMiddleware`, `requireAdmin`, `requireAdminOrTeacher`, `requireAuth`.

**Vấn đề:** Mỗi bản copy có logic check `exp` khác nhau:
- `online-classes.js` dòng 44: `payload.exp < Date.now()` — **SAI** vì exp là seconds, Date.now() là milliseconds
- `teachers.js` dòng 32: `payload.exp && payload.exp < Date.now()` — **CŨNG SAI** tương tự
- `documents.js` dòng 14: `payload.exp < Date.now() / 1000` — Chia cho 1000 nhưng helper đã xử lý rồi
- Shared middleware (`auth-middleware.js`): delegate cho `verifyJWT()` — **ĐÚNG**, vì `verifyJWT` trong helpers.js đã xử lý cả 2 format

### 1.2. CRITICAL — Thiếu auth trên nhiều route quan trọng

**Mức độ: 🔴 Critical**

| Route | Vấn đề |
|-------|--------|
| `PUT /registrations/:id/status` | **Không có auth** — ai cũng đổi được status registration |
| `PUT /registrations/:id/so-phach` | **Không có auth** — ai cũng gán số phách |
| `DELETE /registrations/:id` | **Không có auth** — ai cũng xóa đăng ký |
| `GET /registrations/class/:class_id` | **Không có auth** — lộ danh sách sinh viên |
| `GET /documents/cccd/:cccd` | **Không có auth** — truy cập tài liệu theo CCCD |
| `POST /notifications` | **Không có auth** — ai cũng tạo notification |
| `PUT /notifications/:id/read` | **Không có auth** — ai cũng đánh dấu đã đọc |
| `DELETE /notifications/:id` | **Không có auth** — ai cũng xóa thông báo |
| `GET /certificates/class/:id/eligible` | **Không có auth** — lộ thông tin đủ điều kiện |
| `POST /certificates/bulk` | **Không có auth** tại route level — chỉ dựa vào `c.get('user')` nullable |
| `PUT /certificates/:id/revoke` | **Không có auth** — ai cũng thu hồi chứng chỉ |
| `GET /classes` (POST/PUT/DELETE) | **Không có auth** cho POST/PUT/DELETE — ai cũng tạo/sửa/xóa lớp |

### 1.3. HIGH — Response format không nhất quán

**Mức độ: 🟠 High**

Hệ thống có **3 kiểu response format khác nhau**:

```js
// Format 1: helpers.js — jsonResponse / errorResponse
{ success: true, data: [...], count: 5 }           // Lúc có count, lúc có total
{ error: "message" }                                 // Lúc chỉ có error

// Format 2: response.js — ok / error / unauthorized / notFound
{ success: true, message: "Success", data: null }   // Có message + data
{ success: false, error: "message" }                 // Có success: false

// Format 3: exam routes — custom
{ success: true, exams: [...], total: 0, page: 1, pageSize: 20 }  // Key khác nhau
{ success: true, exam: {...} }                       // Số ít
{ success: true, attempts: [...] }                   // Tên khác
```

**Các biến thể:**
- `data` vs `exams` vs `attempts` vs `sections` vs `questions` vs `groups` — key tên khác nhau cho mỗi entity
- `count` vs `total` vs `unreadCount` — counting field không thống nhất
- Pagination: chỉ `exam-management.js` và `grading.js` có `page + pageSize`; phần còn lại dùng `limit + offset` thô

### 1.4. HIGH — RESTful Convention vi phạm

**Mức độ: 🟠 High**

| Vấn đề | Chi tiết |
|--------|----------|
| PUT dùng query param thay path param | `PUT /api/exams?id=` thay vì `PUT /api/exams/:id` |
| DELETE dùng query param | `DELETE /api/exams?id=` thay vì `DELETE /api/exams/:id` |
| Sub-resource dùng query param | `PUT /api/exams/:id/sections?sectionId=` thay vì `PUT /api/exams/:id/sections/:sectionId` |
| POST thay vì PATCH | Hầu hết partial update dùng PUT thay vì PATCH |
| Thiếu versioning | `/auth/login` vs `/api/exams` — lẫn lộn có/không prefix `/api` |
| Route naming lẫn lộn | `/registrations/:id/so-phach` (kebab-case Việt) vs `/registrations/:id/status` |

### 1.5. MEDIUM — Request validation rất yếu

**Mức độ: 🟡 Medium**

- `students.js` sử dụng Zod schema + `createPostEndpoint` — **TỐT**
- `classes.js` sử dụng Zod cho params nhưng `z.any()` cho body — **YẾU**
- `teachers.js` không dùng Zod — validation thủ công
- `auth.js` — validation thủ công cơ bản
- `registrations.js` — validation thủ công cơ bản
- `payments.js` — thiếu validation amount (có thể < 0)
- `exam-management.js` — không validate input type/content
- `certificates.js` — không validate body schema
- `notifications.js` — không validate type enum
- **~70% routes không có schema validation**

### 1.6. MEDIUM — Thiếu API versioning

Không có `/v1/` prefix. Routes lẫn lộn:
- Legacy: `/students`, `/classes`, `/registrations`
- Newer: `/api/exams`, `/api/grading`
- Không có strategy để version API khi breaking changes

---

## 2. Database Issues

### 2.1. CRITICAL — N+1 Query Problems

**Mức độ: 🔴 Critical**

**File `src/routes/certificates.js` dòng 211-256 — `/certificates/class/:id/eligible`:**
```js
for (const reg of registrations) {
    // Query 1: getPaymentsByRegistration cho MỖI student
    const payments = await getPaymentsByRegistration(c.env.DB, reg.registration_id);
    // Query 2: Check existing certificate cho MỖI student
    const existingCert = await c.env.DB.prepare(...)
}
```
→ Với 100 students → **200+ queries** thay vì 2-3 queries.

**File `src/routes/certificates.js` dòng 261-336 — `POST /certificates/bulk`:**
```js
for (const studentId of student_ids) {
    const existing = await c.env.DB.prepare(...) // Query 1 per student
    const certCount = await c.env.DB.prepare(...) // Query 2 per student
    await createCertificate(...)                   // Query 3 per student
    await notifyCertificateIssued(...)              // Query 4 per student
}
```
→ Với 50 students → **200+ queries** không dùng batch.

**File `src/routes/online-classes.js` dòng 285-312 — enrollments:**
```js
const enriched = await Promise.all((results || []).map(async (row) => {
    return { ...(await enrichStudentWithImages(c, studentData)) };
}));
```
→ `enrichStudentWithImages` có thể gọi thêm queries cho mỗi student.

**File `src/db/queries.js` dòng 213-232 — searchStudents phone search:**
```js
const allStudents = await db.prepare(`
    SELECT * FROM students WHERE sdt IS NOT NULL AND sdt != ''
`).all();
```
→ **Load TẤT CẢ students vào memory** rồi filter bằng JavaScript — **tàn phá D1**.

### 2.2. HIGH — Thiếu transactions cho multi-step operations

**Mức độ: 🟠 High**

D1 hỗ trợ `db.batch()` để atomic operations, nhưng chỉ dùng 1 lần duy nhất (`queries.js:580`).

| Operation | File | Vấn đề |
|-----------|------|--------|
| `createRegistration` | `queries.js:418` | INSERT registration + UPDATE class count — KHÔNG atomic |
| `deleteRegistration` | `queries.js:608` | DELETE registration + recalculate count — KHÔNG atomic |
| `deleteClass` | `queries.js:380` | 6 queries liên tiếp (unlink, delete deps, delete class) — KHÔNG atomic |
| `POST /certificates/bulk` | `certificates.js:261` | Loop INSERT cho mỗi student — KHÔNG atomic |
| `POST /api/exams/:id/submit` | `exam-taking.js:195` | Grade + update attempt — KHÔNG atomic |
| `POST /api/exams/:id/duplicate` | `exam-management.js:219` | Copy exam + sections + groups + questions — KHÔNG atomic |

### 2.3. HIGH — SELECT * everywhere

**Mức độ: 🟠 High**

Gần **30+ queries** dùng `SELECT *` thay vì chọn column cần thiết:
- `findStudentByCCCD` trả về TẤT CẢ columns (bao gồm images)
- `getAllClasses` trả SELECT * rồi alias thêm columns — bandwidth waste
- `findAdminByUsername` trả cả `password_hash` — rủi ro bảo mật nếu serialize sai

### 2.4. HIGH — Schema drift + Migration không nhất quán

**Mức độ: 🟠 High**

- `schema.sql` (root) KHÁC `migrations/0000_initial_database_schema.sql`:
  - `schema.sql` có `r2_key`, `doc_type`, `valid_from` — migration không có
  - `schema.sql` thiếu nhiều bảng mới (posts, notifications, class_schedules)
  - `0000` migration có `file_url` column — `schema.sql` có `r2_key` thay thế
- 19 migration files nhưng đánh số lẫn lộn: `0000`, `0005`, `0006`, `0010-0019`, plus named migrations không đánh số
- Không có DOWN migration — không rollback được
- Không có migration runner / version tracking table

### 2.5. MEDIUM — Missing indexes

| Bảng | Thiếu index cho |
|------|----------------|
| `students` | `ho_ten_normalized` (dùng cho search rất nhiều nhưng không index) |
| `classes` | `ma_lop` (dùng unique nhưng không index) |
| `payments` | `confirmed_at` (filter theo date range) |
| `audit_logs` | `action_type`, `entity_type` (filter log) |
| `registrations` | `status` (filter by status rất phổ biến) |

### 2.6. MEDIUM — Data integrity thiếu

- `current_students` trên `classes` là **denormalized counter** nhưng không được sync reliable (race condition khi concurrent registrations)
- `certificates.status` trong migration check `('active', 'revoked')` nhưng code dùng `'issued'` (certificates.js dòng 41)
- Không có `noi_cap_cccd` column trong schema nhưng code insert nó (`queries.js` dòng 30)

---

## 3. Architecture Issues

### 3.1. CRITICAL — Separation of concerns hỏng

**Mức độ: 🔴 Critical**

**Pattern hiện tại (không nhất quán):**

| Module | Pattern | Consistency |
|--------|---------|-------------|
| `online-classes` | Route → Service → Repository → DB | ✅ Tốt |
| `students` | Route → Service (student-service.js) → DB queries | ✅ Khá |
| `documents` | Route → Service + Repository trực tiếp | ⚠️ Lẫn |
| `classes` | Route → Service (classes.js) | ⚠️ Khá |
| `teachers` | Route → DB queries trực tiếp | ❌ Thiếu service layer |
| `registrations` | Route → DB queries trực tiếp | ❌ Thiếu service layer |
| `payments` | Route → DB queries + inline SQL | ❌ Thiếu service, có inline SQL |
| `certificates` | Route → DB queries + **inline SQL** | ❌ Rất tệ — logic + SQL trong route |
| `auth` | Route → DB queries trực tiếp | ❌ Thiếu service layer |
| `exam-management` | Route → **inline SQL trực tiếp** | ❌ Tệ nhất — TẤT CẢ SQL trong route |
| `exam-taking` | Route → **inline SQL trực tiếp** | ❌ Tệ nhất |
| `grading` | Route → **inline SQL trực tiếp** | ❌ Tệ nhất |
| `posts` | Route → DB queries | ⚠️ Thiếu service |
| `notifications` | Route → DB queries | ⚠️ Thiếu service |

→ ~60% routes viết SQL trực tiếp trong route handler — vi phạm SoC nghiêm trọng.

### 3.2. HIGH — File `queries.js` là GOD FILE

**Mức độ: 🟠 High**

`src/db/queries.js` có **787 dòng** chứa queries cho:
- Students (CRUD + search)
- Classes (CRUD)
- Registrations (CRUD + status updates)
- Admins (CRUD)
- Password reset tokens
- Audit logs
- Student edit history

→ Nên tách thành `student-queries.js`, `class-queries.js`, `registration-queries.js` riêng biệt.

### 3.3. HIGH — Error handling không nhất quán

- Routes dùng `try/catch` → `errorResponse('Lỗi server: ' + error.message, 500)` — **LEAK error internals ra client** trong production
- Không có error classification (ValidationError, NotFoundError, AuthError, DatabaseError)
- Không có error logging centralized — mỗi route tự `console.error`
- Global `onError` handler cũng leak: `'Lỗi server: ' + err.message`

### 3.4. MEDIUM — Logging thiếu structured

- Chỉ có `console.log` và `console.error`
- Không có request ID / correlation ID
- Không có log levels (debug/info/warn/error)
- Không tracking latency, response status codes
- Request logging tại `index.js:76` chỉ log method + URL, không log status code / duration

### 3.5. MEDIUM — Security headers thiếu

CORS được set tại 2 nơi khác nhau:
1. `index.js:59-69` — Hono CORS middleware (whitelist origins)
2. `helpers.js:178` — `jsonResponse()` hardcode `Access-Control-Allow-Origin: *`

→ **CONFLICT**: CORS middleware restrict origin, nhưng `jsonResponse()` override thành `*` — **CORS bypass**.

Thiếu security headers:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Strict-Transport-Security`
- `Content-Security-Policy`

---

## 4. Performance Issues

### 4.1. CRITICAL — Unbounded queries + Full table scan

| File | Query | Vấn đề |
|------|-------|--------|
| `queries.js:216` | `SELECT * FROM students WHERE sdt IS NOT NULL` | **FULL TABLE SCAN** — load tất cả students |
| `queries.js:267` | `SELECT *, class_type as loai...` | `getAllClasses` không có LIMIT — load tất cả classes |
| `queries.js:279` | `getOpenClasses` | Không LIMIT — nếu có nhiều lớp mở |
| `exam-management.js:108` | Published exams listing | Không LIMIT — load tất cả published exams |
| `teacher-queries.js:75` | `searchTeachers` | Không LIMIT — load tất cả teachers matching |
| `certificates.js:163-206` | `GET /certificates` | Dynamic query không validate params, nhưng có LIMIT — OK |

### 4.2. HIGH — Rate limiter dùng in-memory Map

**Mức độ: 🟠 High**

`rate-limiter.js` dùng `const rateLimitStore = new Map()`:
- Cloudflare Workers là **stateless** — mỗi request có thể hit isolate khác nhau
- In-memory Map **reset khi worker restart** hoặc across isolates
- Rate limiting thực tế **KHÔNG HOẠT ĐỘNG** trong production

Nên dùng: Cloudflare D1, KV, hoặc Durable Objects cho rate limiting.

### 4.3. HIGH — bcryptjs trong Workers runtime

`helpers.js:1` import `bcryptjs` — bcrypt computation-intensive, có thể:
- Vượt CPU time limit của Workers (10-50ms free, 30s paid)
- Salt rounds = 10 nghĩa là ~100ms per hash — rất gần limit

Nên dùng: Web Crypto API `PBKDF2` hoặc `Argon2` qua WASM.

### 4.4. MEDIUM — Custom JWT implementation

`helpers.js:60-123` tự implement JWT thay vì dùng thư viện:
- Chỉ support HS256
- Base64 encoding dùng `btoa/atob` — có edge cases với unicode
- Expiration check phức tạp (support cả ms và seconds format) — code smell
- Thiếu `iss`, `aud`, `iat` claims
- Hono có built-in JWT middleware (`hono/jwt`) — nên dùng thay thế

### 4.5. MEDIUM — Cloudflare Images + R2 dual strategy

`students.js:11-31` upload qua R2 trực tiếp, trong khi `cloudflare-images.js` dùng Cloudflare Images API. 2 hệ thống song song, không rõ strategy.

---

## 5. Đề xuất nâng cấp (chi tiết file + code)

### P0 — KHẨN CẤP (Bảo mật)

#### 5.1. Thêm auth cho tất cả protected routes

**Files cần sửa:** `src/index.js`

```
Thêm authMiddleware cho:
- /registrations/* (PUT, DELETE)
- /certificates/* (POST, PUT)
- /notifications/* (POST, PUT, DELETE)
- /classes/* (POST, PUT, DELETE)
```

#### 5.2. Fix CORS conflict

**File:** `src/utils/helpers.js` dòng 175-185

Xóa hardcoded CORS headers trong `jsonResponse()` — để Hono CORS middleware xử lý.

#### 5.3. Xóa duplicate auth middleware

**Files cần sửa:** `exam-management.js`, `exam-taking.js`, `grading.js`, `online-classes.js`, `documents.js`, `teachers.js`

Import từ `src/middleware/auth-middleware.js` thay vì copy-paste.

### P1 — CAO (Architecture)

#### 5.4. Tách `queries.js` thành modules

```
src/db/queries.js (787 lines) →
  src/db/student-queries.js   (findStudentByCCCD, createStudent, updateStudent, deleteStudent, getAllStudents, searchStudents)
  src/db/class-queries.js     (getAllClasses, getOpenClasses, getClassById, createClass, updateClass, deleteClass)
  src/db/registration-queries.js (findRegistration, createRegistration, updateRegistrationStatus, etc.)
  src/db/admin-auth-queries.js   (findAdminByUsername, createAdmin, updateAdminPassword, etc.)
  src/db/audit-queries.js        (createAuditLog, logStudentEditHistory, etc.)
```

#### 5.5. Thêm service layer cho modules thiếu

```
Tạo mới:
  src/services/registration-service.js
  src/services/payment-service.js
  src/services/certificate-service.js
  src/services/exam-service.js         (gộp logic từ exam-management + exam-taking + grading)
  src/services/notification-service.js
  src/services/auth-service.js
```

#### 5.6. Chuẩn hóa response format

Tạo `src/utils/api-response.js`:
```
Chuẩn format:
{
  success: boolean,
  data: any | null,
  error: { code: string, message: string } | null,
  meta: { total: number, page: number, pageSize: number } | null
}
```

#### 5.7. Fix N+1 queries

**File `certificates.js`:** Dùng JOIN + subquery thay vì loop:
```sql
SELECT r.*,
  (SELECT COUNT(*) FROM payments p WHERE p.registration_id = r.id AND p.status = 'confirmed') > 0 as has_paid,
  (SELECT COUNT(*) FROM certificates c WHERE c.student_id = r.student_id AND c.class_id = ?) > 0 as has_certificate
FROM registrations r JOIN students s ON r.student_id = s.id
WHERE r.class_id = ?
```

**File `queries.js` searchStudents phone:** Dùng SQL REPLACE thay vì load tất cả:
```sql
WHERE REPLACE(REPLACE(REPLACE(sdt, '-', ''), ' ', ''), '.', '') LIKE ?
```

### P2 — TRUNG BÌNH (Performance + Quality)

#### 5.8. Dùng D1 `batch()` cho transactions

```js
// Thay vì sequential queries, dùng:
await db.batch([
  db.prepare('INSERT INTO registrations...').bind(...),
  db.prepare('UPDATE classes SET current_students = current_students + 1...').bind(...)
]);
```

#### 5.9. Thay bcryptjs bằng Web Crypto PBKDF2

```js
async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const hash = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, key, 256);
  return `${btoa(String.fromCharCode(...salt))}:${btoa(String.fromCharCode(...new Uint8Array(hash)))}`;
}
```

#### 5.10. Dùng Hono built-in JWT

```js
import { jwt } from 'hono/jwt';
app.use('/api/*', jwt({ secret: env.JWT_SECRET }));
```

#### 5.11. Fix rate limiting cho Workers

Dùng Cloudflare KV hoặc Durable Objects:
```js
// KV-based rate limiter
const key = `ratelimit:${ip}:${Math.floor(Date.now() / 60000)}`;
const count = parseInt(await c.env.KV.get(key) || '0');
if (count >= maxRequests) return errorResponse('Rate limit exceeded', 429);
await c.env.KV.put(key, String(count + 1), { expirationTtl: 60 });
```

#### 5.12. Thêm missing indexes

```sql
CREATE INDEX IF NOT EXISTS idx_students_normalized ON students(ho_ten_normalized);
CREATE INDEX IF NOT EXISTS idx_registrations_status ON registrations(status);
CREATE INDEX IF NOT EXISTS idx_classes_ma_lop ON classes(ma_lop);
```

#### 5.13. API versioning

Prefix tất cả routes với `/v1/`:
```js
const v1 = new Hono();
v1.route('/auth', auth);
v1.route('/students', students);
// ...
app.route('/v1', v1);
```

#### 5.14. Error classification + centralized logging

```js
// src/errors/app-errors.js
class AppError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}
class NotFoundError extends AppError { constructor(msg) { super(msg, 404, 'NOT_FOUND'); } }
class ValidationError extends AppError { constructor(msg) { super(msg, 400, 'VALIDATION'); } }
class AuthError extends AppError { constructor(msg) { super(msg, 401, 'UNAUTHORIZED'); } }
```

---

## 6. Tổng kết điểm theo danh mục

| Danh mục | Điểm | Ghi chú |
|----------|-------|---------|
| RESTful conventions | 3/10 | Query params cho CRUD, naming lẫn lộn, thiếu versioning |
| Error handling | 3/10 | Leak internals, không classify, không centralized |
| Auth & Security | 2/10 | Nhiều route thiếu auth, CORS conflict, duplicate middleware |
| Request validation | 3/10 | ~30% routes có Zod, 70% validation thủ công hoặc không có |
| Response format | 4/10 | 3 format khác nhau, key naming inconsistent |
| Database design | 5/10 | Schema OK nhưng drift, thiếu indexes, denormalized counters |
| Query quality | 3/10 | N+1, full table scan, SELECT *, thiếu transactions |
| Architecture (SoC) | 4/10 | online-classes tốt, phần còn lại SQL trong routes |
| Performance | 4/10 | Rate limiter fake, bcryptjs nặng, unbounded queries |
| Code DRY | 3/10 | Auth middleware copy 6 lần, response helpers 3 files |
| **Tổng trung bình** | **3.4/10** | **Có nền tảng nhưng cần refactor nghiêm trọng** |

> **Tổng điểm cuối: 4.5/10** (cộng thêm cho effort trong online-classes module có pattern tốt + Zod validation ở students)

---

## 7. Roadmap nâng cấp đề xuất

| Tuần | Hạng mục | Ưu tiên |
|------|----------|---------|
| 1 | Fix auth trên tất cả routes + CORS conflict + error leak | P0 |
| 2 | Hợp nhất auth middleware, tách queries.js, chuẩn hóa response | P1 |
| 3 | Thêm service layer cho registration, payment, certificate, exam | P1 |
| 4 | Fix N+1 queries, thêm db.batch(), thêm indexes | P1 |
| 5 | Thay bcryptjs, thay JWT implementation, fix rate limiter | P2 |
| 6 | API versioning, structured logging, security headers | P2 |

## Unresolved Questions

1. `schema.sql` ở root có vai trò gì? Reference manual hay schema hiện tại? Nó drift so với migrations
2. `lib/api-templates.js` — file này export `createGetEndpoint` etc. nhưng không phải tất cả routes dùng — có plan migrate toàn bộ?
3. Student login dùng CCCD+SĐT (không password) — intentional design hay MVP shortcut?
4. `wrangler.toml` không đọc được — không rõ D1 binding config, KV có enable không?
5. File `services/student-service.js` tồn tại nhưng không được đọc — cần verify service layer coverage
