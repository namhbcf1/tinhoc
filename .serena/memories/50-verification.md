# Verification & Deployment — vantrangedu

## Test Commands
| Command | Purpose | Path |
|---------|---------|------|
| `npm run test` | Run Vitest suite | backend/ or frontend/ |
| `npm run build` | Build for production | both |
| `npm run dev` | Start dev server | both |
| `npm run deploy` | Deploy to production | both |

## Database Migration Checklist
```
Migrations run in order (critical):
✓ 0000_initial_database_schema.sql
✓ 0002_vstep_schema.sql
✓ 0005_add_meeting_link_to_class_schedules.sql
✓ ... (through 0028_add_zoom_link_backup_to_exam_schedules.sql)
```
**Command**: `wrangler d1 execute vantrangedu_db --file=./migrations/NNNN_*.sql`

## Production Deployment Checklist
- [ ] `JWT_SECRET` set via `wrangler secret put JWT_SECRET`
- [ ] D1 binding: DB → vantrangedu_db (ID: ae59b4c6-0c72-4e7c-856c-d2106da89004)
- [ ] R2 binding: R2 → vantrangedu-files
- [ ] R2 binding: VIDEO_BUCKET → class-videos
- [ ] All 28 migrations run in order
- [ ] CORS whitelist includes vantrangexam domains
- [ ] Rate limiting configured in wrangler.toml
- [ ] Google credentials set (GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY)
- [ ] Cloudflare Images token set (CLOUDFLARE_IMAGES_API_TOKEN)
- [ ] R2 credentials set (R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY)

## Known Gotchas & Risks
| Issue | Impact | Mitigation |
|-------|--------|-----------|
| exam-schedules.ts is 1487 LOC | Hard to test, review, maintain | Refactor into smaller modules |
| export.ts is 1296 LOC | Same as above | Extract Excel generation logic |
| No transaction locks on payments | Race condition: confirm → cancel → refund broken | Manual verification before confirm |
| Session touch on every request | DB hit per request (bottleneck at scale) | Consider caching; monitor performance |
| Soft deletes not filtered | Risk: deleted data exposed | Always use WHERE deleted_at IS NULL |
| No audit trail for payments | Can't track who confirmed payment | Add audit logging to payment endpoints |
| R2 files never cleaned up | Storage bloat over time | Implement cleanup job (cron) |
| RESEND_API_KEY env set but unused | Dead code; confusing | Remove or implement email notifications |
| Google Meet automation incomplete | Columns exist but no handler | Complete implementation or remove columns |

## QA Test Flow (Manual)

### 1. Auth & SSO
- [ ] Admin login → token issued → stored in auth_sessions
- [ ] Session touch updates last_active on every request
- [ ] Session revoke → next request returns 401
- [ ] SSO handoff: redirect → create handoff → authenticate → exchange → JWT issued

### 2. Student Flow
- [ ] Register new student (CCCD, phone, email)
- [ ] Login with CCCD + phone
- [ ] Browse available classes
- [ ] Register for class (status: pending)
- [ ] Admin approves registration
- [ ] Student sees class in dashboard

### 3. Payments
- [ ] Admin creates payment record (amount, student, class)
- [ ] Admin confirms payment (status: confirmed)
- [ ] Student can proceed with class (if payment required)

### 4. Exams
- [ ] Create exam schedule (date, time, location)
- [ ] Student registers for exam
- [ ] Admin approves registration
- [ ] Student takes exam (exam_attempts, exam_answers)
- [ ] System grades automatically or flags for review

### 5. Online Classes
- [ ] Create online class (topic, schedule)
- [ ] Student enrolls (status: pending)
- [ ] Admin approves enrollment
- [ ] Student joins class session (Zoom/Meet link)
- [ ] Attendance recorded

### 6. Documents
- [ ] Admin uploads document (PDF, DOCX, etc.)
- [ ] Set permissions (public, students, teachers)
- [ ] Student downloads document
- [ ] Document audit logged

### 7. Export
- [ ] Admin triggers student export
- [ ] Excel file generated with CCCD, phone, email
- [ ] Download via R2 presigned URL

## Monitoring & Health Checks
| Metric | Target | Check |
|--------|--------|-------|
| API response time | < 200ms (p95) | Monitor Wrangler analytics |
| DB connection pool | < 10 pending | Check D1 metrics |
| R2 upload success | 99%+ | Monitor error logs |
| Session validity | 0 revoked before exp | Check auth_sessions table |
| Rate limit enforcement | 0 false positives | Test with load tool |

## Performance Baselines
- **Login**: < 300ms (1x DB query)
- **Student list (admin)**: < 1s (1 DB query)
- **Export (100 students)**: < 5s (Excel generation)
- **Exam attempt submit**: < 500ms (2 DB writes)

## Rollback Procedure
1. Revert code to previous tag: `git checkout <tag>`
2. Revert D1 if needed: Run previous migration or restore backup
3. Re-deploy: `npm run deploy`
4. Verify health: Check auth_sessions, class registrations, payments

## Verification Run — 2026-03-23 01:32 +07 (vantrangedu Zoom Links Max-2)

### Commands
1. `cd backend && npx vitest run src/test/routes/exam-schedules.test.ts`
- Result: **PASSED** (`1 file`, `20 tests passed`).

2. `cd frontend && npm run build`
- Result: **PASSED** (Vite production build succeeded).

3. `cd backend && npm run deploy:quick`
- Result: **PASSED**
- URL: `https://vantrangedu-api.bangachieu2.workers.dev`
- Version: `ee1c4120-14bf-4352-900b-ccd8d4463af6`

4. `cd frontend && npm run deploy:quick`
- Result: **PASSED**
- URL: `https://1c756c0d.vantrangedu.pages.dev`

## Test Run — 2026-03-23 01:33
- **Status**: no package.json found
- **Summary**:  

## Verification Run — 2026-03-23 01:44 +07 (Zoom backup credentials + label sync)

### Commands
1. `cd backend && npx vitest run src/test/routes/exam-schedules.test.ts`
- Result: **PASSED** (`1 file`, `20 tests passed`).

2. `cd frontend && npm run build`
- Result: **PASSED**.

3. `cd backend && npm run db:migrate:0030`
- Result: **PASSED** (remote D1, 2 queries executed).

4. `cd backend && npm run deploy:quick`
- Result: **PASSED**
- URL: `https://vantrangedu-api.bangachieu2.workers.dev`
- Version: `c7a78708-5761-4ee2-82d3-dd0fe4735173`

5. `cd frontend && npm run deploy:quick`
- Result: **PASSED**
- URL: `https://9bef87bb.vantrangedu.pages.dev`

## Test Run — 2026-03-23 01:44
- **Command**: `cd backend && npx vitest run`
- **Status**: failing
- **Summary**: [OCR] OCR.space raw engine=2 lang=eng: {"OCRExitCode":1,"IsErroredOnProcessing":false,"ParsedResults":[{"ParsedText":"CĂN CƯỚC CÔNG DÂN\nSố 079203001234\nHọ và tên: NGUYỄN VĂN A\nNgày sinh: 09/12/2002"}]} stdout | src/test/services/cccd-ocr.test.ts > extractRegistrationPrefillFromImage > retries OCR.space with engine 1 in Vietnamese if engine 2 fails [OCR] OCR.space raw engine=2 lang=eng: {"OCRExitCode":3,"IsErroredOnProcessing":true,"ErrorMessage":["engine 2 failed"]} 
