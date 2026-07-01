# Student Login Identifier Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let students register with shared phone/email and log in using CCCD plus either phone number or email, with `vantrangedu` as the SSO source of truth for both apps.

**Architecture:** Keep the API request shape stable (`cccd` + `sdt`/`phone`) so existing clients and `vantrangexam` forwarding keep working. Move identity disambiguation to `vantrangedu` student auth: first select by unique CCCD, then accept the second credential if it matches that student's phone or email. UI changes only relabel the existing phone field as “Số điện thoại hoặc email”.

**Tech Stack:** TypeScript, Hono, Cloudflare Workers, D1 SQLite, React 19 + Vite, Vitest.

---

## File Structure

- Modify `backend/src/services/student-service.ts`
  - Extend `isAcceptedStudentLoginSecret` to accept stored email in addition to stored phone.
  - Remove duplicate phone/email registration blocking from `registerStudent` while keeping duplicate CCCD rejection.
  - Update `loginStudent` to pass `student.email` into the credential check.
- Modify `backend/src/routes/sso.ts`
  - Keep `/sso/direct-login` request shape stable, but treat `body.phone` as phone-or-email for student login.
  - Select the student by CCCD first, then validate against phone or email.
  - Update the missing-field message to mention phone/email.
- Modify `backend/src/routes/students.ts`
  - Relax the student login schema so `sdt` accepts either phone format, email format, or synthetic test password.
- Modify `frontend/src/pages/public/UnifiedLogin.tsx`
  - Relabel the student second credential as phone/email.
  - Keep the state and API call as `sdt` to avoid a larger API client refactor.
- Modify `../vantrangexam/pages/Login.tsx`
  - Relabel the existing `phone` input to phone/email while preserving the forwarded `phone` field expected by the SSO broker.
- Optional cleanup: do not edit generated `.js` files under `backend/src`; TypeScript is the source.

---

### Task 1: Backend Auth Helper and Registration Rule

**Files:**
- Modify: `backend/src/services/student-service.ts:74-85`
- Modify: `backend/src/services/student-service.ts:237-245`
- Modify: `backend/src/services/student-service.ts:271-283`

- [ ] **Step 1: Write or update focused tests for credential matching**

If there is an existing student service test file, add these tests there. If not, create `backend/src/services/student-service.test.ts` with this content:

```ts
import { describe, expect, it } from 'vitest';
import { isAcceptedStudentLoginSecret } from './student-service';

describe('isAcceptedStudentLoginSecret', () => {
  it('accepts the stored phone for a real student', () => {
    expect(isAcceptedStudentLoginSecret('001305032556', '0984 505 735', '0984505735', 'student@example.com')).toBe(true);
  });

  it('accepts the stored email case-insensitively for a real student', () => {
    expect(isAcceptedStudentLoginSecret('001305032556', '0984505735', 'Student@Example.com', ' student@example.COM ')).toBe(true);
  });

  it('rejects another student phone or email when CCCD is for a different student', () => {
    expect(isAcceptedStudentLoginSecret('001305032556', '0984505735', 'other@example.com', 'student@example.com')).toBe(false);
  });

  it('keeps synthetic test student password behavior', () => {
    expect(isAcceptedStudentLoginSecret('001', '0984505735', 'test123', 'student@example.com')).toBe(true);
    expect(isAcceptedStudentLoginSecret('001', '0984505735', 'student@example.com', 'student@example.com')).toBe(false);
  });
});
```

- [ ] **Step 2: Run the helper tests and verify failure**

Run from `C:/Users/ADMIN/Desktop/vantrang/vantrangedu/backend`:

```bash
npx vitest run src/services/student-service.test.ts
```

Expected before implementation: at least the email acceptance test fails because `isAcceptedStudentLoginSecret` currently only checks phone.

- [ ] **Step 3: Implement phone-or-email matching**

Replace `isAcceptedStudentLoginSecret` in `backend/src/services/student-service.ts` with:

```ts
export function isAcceptedStudentLoginSecret(
  cccd: any,
  storedPhone: any,
  providedSecret: any,
  storedEmail?: any,
): boolean {
  const submitted = normalizeWhitespace(providedSecret);
  if (!submitted) {
    return false;
  }

  if (isSyntheticTestStudentCccd(cccd)) {
    return submitted === SYNTHETIC_TEST_STUDENT_PASSWORD;
  }

  const normalizePhone = (value: string) => value.replace(/[\s\-\.]/g, '').trim();
  const submittedPhone = normalizePhone(submitted);
  const storedPhoneValue = normalizePhone(String(storedPhone || ''));
  if (storedPhoneValue && storedPhoneValue === submittedPhone) {
    return true;
  }

  const normalizeEmail = (value: string) => normalizeWhitespace(value).toLowerCase();
  const submittedEmail = normalizeEmail(submitted);
  const storedEmailValue = normalizeEmail(String(storedEmail || ''));
  return Boolean(storedEmailValue && storedEmailValue === submittedEmail);
}
```

- [ ] **Step 4: Wire student login to pass stored email**

Change this line in `backend/src/services/student-service.ts`:

```ts
if (!isAcceptedStudentLoginSecret(student.cccd, student.sdt, sdt)) {
```

to:

```ts
if (!isAcceptedStudentLoginSecret(student.cccd, student.sdt, sdt, student.email)) {
```

- [ ] **Step 5: Remove duplicate contact blocking during registration**

Delete this block from `backend/src/services/student-service.ts`:

```ts
const normalizedProbeEmail = sanitizeStudentTextField('email', data.email);
const normalizedProbePhone = sanitizeStudentTextField('sdt', data.sdt);
```

and delete this block:

```ts
const existingByContact = await StudentRepo.findStudentByEmailOrPhone(c.env.DB, normalizedProbeEmail, normalizedProbePhone);
if (existingByContact.length > 0) {
  if (existingByContact[0].sdt === normalizedProbePhone) throw new Error('Số điện thoại đã được đăng ký.');
  if (existingByContact[0].email === normalizedProbeEmail) throw new Error('Email đã được đăng ký.');
}
```

After the edit, the start of `registerStudent` should read:

```ts
export async function registerStudent(c: any, data: any) {
  const normalizedProbeCCCD = sanitizeStudentTextField('cccd', data.cccd);

  const existingByCCCD = await StudentRepo.findStudentByCCCD(c.env.DB, normalizedProbeCCCD);
  if (existingByCCCD) throw new Error('Số CCCD/CMT đã được đăng ký. Vui lòng kiểm tra lại!');

  const normalizedInput = {
```

- [ ] **Step 6: Run backend tests for the helper**

Run:

```bash
npx vitest run src/services/student-service.test.ts
```

Expected: all tests in `student-service.test.ts` pass.

- [ ] **Step 7: Commit backend service change**

Run from `C:/Users/ADMIN/Desktop/vantrang/vantrangedu` if this repo has git metadata available:

```bash
git add backend/src/services/student-service.ts backend/src/services/student-service.test.ts
git commit -m "fix: allow student login by phone or email"
```

If the working directory is not a git repo in this environment, skip the commit and record the changed files in the final summary.

---

### Task 2: SSO Direct Login and Student Login Schema

**Files:**
- Modify: `backend/src/routes/sso.ts:107-124`
- Modify: `backend/src/routes/students.ts:43-48`

- [ ] **Step 1: Update student login schema to accept email in the existing `sdt` field**

In `backend/src/routes/students.ts`, add a local schema near the top after the `students` constant:

```ts
const STUDENT_LOGIN_IDENTIFIER_REGEX = /^(?:test123|[0-9\s\-.]{7,20}|[^\s@]+@[^\s@]+\.[^\s@]+)$/;
```

Then replace the login body schema:

```ts
body: z.object({ cccd: z.string(), sdt: z.string() }),
```

with:

```ts
body: z.object({
  cccd: z.string(),
  sdt: z.string().regex(STUDENT_LOGIN_IDENTIFIER_REGEX, 'Thông tin đăng nhập không hợp lệ'),
}),
```

- [ ] **Step 2: Update direct-login validation message and credential check**

In `backend/src/routes/sso.ts`, change:

```ts
const loginSecret = normalizeString(body?.phone);
const cccd = normalizeString(body?.cccd);
if (!loginSecret || !cccd) {
  return errorResponse('Thiếu CCCD hoặc số điện thoại', 400);
}
```

to:

```ts
const loginSecret = normalizeString(body?.phone || body?.sdt || body?.identifier);
const cccd = normalizeString(body?.cccd);
if (!loginSecret || !cccd) {
  return errorResponse('Thiếu CCCD hoặc số điện thoại/email', 400);
}
```

- [ ] **Step 3: Pass email into SSO credential check**

In `backend/src/routes/sso.ts`, change:

```ts
if (!student || !isAcceptedStudentLoginSecret(student.cccd, student.sdt, loginSecret)) {
```

to:

```ts
if (!student || !isAcceptedStudentLoginSecret(student.cccd, student.sdt, loginSecret, student.email)) {
```

- [ ] **Step 4: Run TypeScript check**

Run from `C:/Users/ADMIN/Desktop/vantrang/vantrangedu/backend`:

```bash
npx tsc --noEmit
```

Expected: exits 0 with no TypeScript errors.

- [ ] **Step 5: Run backend tests**

Run:

```bash
npx vitest run
```

Expected: tests pass. If unrelated pre-existing tests fail, capture the failing test names and continue only after confirming they are unrelated to auth.

- [ ] **Step 6: Commit SSO/schema change**

Run from `C:/Users/ADMIN/Desktop/vantrang/vantrangedu` if git is available:

```bash
git add backend/src/routes/sso.ts backend/src/routes/students.ts
git commit -m "fix: accept email in student SSO login"
```

---

### Task 3: Update Login Form Labels

**Files:**
- Modify: `frontend/src/pages/public/UnifiedLogin.tsx:295-305`
- Modify: `frontend/src/pages/public/UnifiedLogin.tsx:395`
- Modify: `../vantrangexam/pages/Login.tsx:155`
- Modify: `../vantrangexam/pages/Login.tsx:224-237`

- [ ] **Step 1: Update `vantrangedu` login label and placeholder**

In `frontend/src/pages/public/UnifiedLogin.tsx`, replace:

```tsx
<Label htmlFor="sdt" className="text-slate-700">Số điện thoại</Label>
```

with:

```tsx
<Label htmlFor="sdt" className="text-slate-700">Số điện thoại hoặc email</Label>
```

Replace:

```tsx
placeholder="Nhập số điện thoại"
```

with:

```tsx
placeholder="Nhập số điện thoại hoặc email"
```

Replace:

```tsx
Tài khoản sinh viên dùng CCCD và số điện thoại đã đăng ký. Nếu bạn quên hoặc cần reset, vui lòng liên hệ:
```

with:

```tsx
Tài khoản sinh viên dùng CCCD và số điện thoại hoặc email đã đăng ký. Nếu bạn quên hoặc cần reset, vui lòng liên hệ:
```

- [ ] **Step 2: Update `vantrangexam` login helper copy**

In `../vantrangexam/pages/Login.tsx`, replace:

```tsx
<p className="mt-3 text-sm text-[#faf7f0]/80">CCCD + số điện thoại đã đăng ký</p>
```

with:

```tsx
<p className="mt-3 text-sm text-[#faf7f0]/80">CCCD + số điện thoại hoặc email đã đăng ký</p>
```

- [ ] **Step 3: Update `vantrangexam` login field label and placeholder**

In `../vantrangexam/pages/Login.tsx`, replace:

```tsx
Số điện thoại
```

inside the student phone input label with:

```tsx
Số điện thoại hoặc email
```

Replace:

```tsx
placeholder="0987 654 321"
```

with:

```tsx
placeholder="0987 654 321 hoặc email@gmail.com"
```

Keep `value={phone}`, `setPhone`, and the submitted `phone` property unchanged.

- [ ] **Step 4: Build `vantrangedu` frontend**

Run from `C:/Users/ADMIN/Desktop/vantrang/vantrangedu/frontend`:

```bash
npm run build
```

Expected: build succeeds.

- [ ] **Step 5: Build `vantrangexam` frontend**

Run from `C:/Users/ADMIN/Desktop/vantrang/vantrangexam`:

```bash
npm run build
```

Expected: build succeeds.

- [ ] **Step 6: Commit UI label changes**

If both folders are in usable git repos, commit each repo separately:

```bash
cd C:/Users/ADMIN/Desktop/vantrang/vantrangedu
git add frontend/src/pages/public/UnifiedLogin.tsx
git commit -m "fix: label student login identifier"

cd C:/Users/ADMIN/Desktop/vantrang/vantrangexam
git add pages/Login.tsx
git commit -m "fix: label student login identifier"
```

If git is unavailable, skip commits and list modified files in the final summary.

---

### Task 4: Manual Verification

**Files:**
- No new files.
- Verify behavior through local backend/frontend or API tests.

- [ ] **Step 1: Verify duplicate registration behavior via backend route or service test**

Use a local D1/test database if available. Verify these expectations:

```txt
Existing student A: cccd=001305032556, sdt=0984505735, email=shared@example.com
New student B:      cccd=001305032557, sdt=0984505735, email=shared@example.com
Expected: B registration succeeds because CCCD differs.
```

If no local D1 is available, document that this was covered by code review and helper tests only.

- [ ] **Step 2: Verify student login by phone**

Call the broker student login route using an existing student:

```bash
curl -s -X POST http://localhost:8787/students/login \
  -H 'Content-Type: application/json' \
  -d '{"cccd":"001305032556","sdt":"0984505735"}'
```

Expected: JSON response includes `token`, `sid`, and `data.cccd`.

- [ ] **Step 3: Verify student login by email**

Call the same route with email in `sdt`:

```bash
curl -s -X POST http://localhost:8787/students/login \
  -H 'Content-Type: application/json' \
  -d '{"cccd":"001305032556","sdt":"shared@example.com"}'
```

Expected: JSON response includes `token`, `sid`, and `data.email`.

- [ ] **Step 4: Verify SSO direct-login by email for `vantrangexam`**

Call the broker direct-login route:

```bash
curl -s -X POST http://localhost:8787/sso/direct-login \
  -H 'Content-Type: application/json' \
  -d '{"type":"student","target_app":"exam","cccd":"001305032556","phone":"shared@example.com"}'
```

Expected: JSON response includes `success:true`, `token`, `target_app:"exam"`, and `user.type:"student"`.

- [ ] **Step 5: Verify wrong CCCD + shared email fails**

Call direct-login with an email from one student and CCCD from another:

```bash
curl -s -X POST http://localhost:8787/sso/direct-login \
  -H 'Content-Type: application/json' \
  -d '{"type":"student","target_app":"exam","cccd":"001305032557","phone":"shared@example.com"}'
```

Expected: HTTP 401 with `Thông tin đăng nhập không chính xác` unless that same CCCD belongs to a student with the same email.

- [ ] **Step 6: Update required work memories**

Before reporting completion, update:

- `vantrangedu/.serena/memories/30-active-work.md` with task summary, changed files, and date `2026-05-09`.
- `vantrangedu/.serena/memories/40-decisions.md` with the decision that CCCD remains the identity key and phone/email are login identifiers only.
- `vantrangedu/.serena/memories/50-verification.md` with tests/builds/manual checks run.
- If `vantrangexam/pages/Login.tsx` changed, update `vantrangexam/.serena/memories/30-active-work.md` with that UI-only change.

---

## Self-Review

- Spec coverage: CCCD uniqueness is kept in Task 1; duplicate phone/email registration is allowed in Task 1; phone/email login is implemented in Tasks 1 and 2; cross-app UI labels are handled in Task 3; verification is covered in Task 4.
- Placeholder scan: no TBD/TODO/fill-in steps remain.
- Type consistency: the existing API fields `sdt` and `phone` are intentionally preserved; `isAcceptedStudentLoginSecret` gains an optional fourth `storedEmail` argument and all changed call sites pass it.
