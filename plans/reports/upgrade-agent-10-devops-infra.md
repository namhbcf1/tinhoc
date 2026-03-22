# DevOps & Infrastructure — Production Readiness Review

**Agent:** DevOps/Infrastructure Architect
**Date:** 2026-03-04
**Codebase:** `thongtin` (VanTrangEdu — Student Registration System)
**Stack:** Cloudflare Workers (Hono) + D1 + R2 + Pages, React 19 frontend

---

## Executive Summary

| Area | Score | Verdict |
|------|-------|---------|
| CI/CD Pipeline | 🟡 6/10 | Exists but no tests in pipeline, duplicate workflows |
| Cloudflare Stack | 🟢 7/10 | Good bindings, dev env separation; missing KV caching |
| Monitoring & Observability | 🔴 2/10 | **Critical gap** — No error tracking, APM, or alerting |
| Backup & Recovery | 🟡 5/10 | Manual JSON backup to R2; no automated schedule, no point-in-time recovery |
| Security | 🟡 6/10 | JWT + CORS + rate limiting OK; SQL injection risk in backup.js, no CSP headers |
| Scalability | 🟡 5/10 | Will hit D1 limits at ~1K concurrent; no caching layer |
| Cost Optimization | 🟢 7/10 | Efficient Cloudflare stack; video presigned URLs good |
| Testing | 🔴 3/10 | Only 7 test files, all online-classes; 0 frontend tests |

**Overall Production Readiness: 🟡 5.1/10 — NOT ready for high-traffic production**

---

## 1. CI/CD Pipeline Analysis

### Current State

Two GitHub Actions workflows exist:

| File | Trigger | Purpose |
|------|---------|---------|
| `auto-deploy.yml` | Push to `main`/`master` (paths: frontend/backend) | Full deploy with summary |
| `deploy.yml` | Push to `main` | Simpler deploy |

### Issues Found

| # | Severity | Issue | Detail |
|---|----------|-------|--------|
| 1 | 🔴 Critical | **No tests before deploy** | Both workflows deploy directly without running `vitest` or any test suite |
| 2 | 🔴 Critical | **Duplicate workflows** | Both trigger on push to main — creates race conditions. `deploy.yml` uses `npm install` (not `npm ci`), non-deterministic |
| 3 | 🟡 Medium | **No staging environment** | Deploys directly to production. `wrangler.toml` has `env.development` but no staging pipeline |
| 4 | 🟡 Medium | **No rollback strategy** | No versioned deployments, no rollback automation. Must manually `wrangler rollback` |
| 5 | 🟡 Medium | **No build caching** | `auto-deploy.yml` caches npm but `deploy.yml` doesn't |
| 6 | 🟢 Low | **No branch protection** | Both trigger on push, not PR merge — easy to push broken code |
| 7 | 🟡 Medium | **Frontend builds without backend test gate** | `auto-deploy.yml` has `needs: deploy-backend` but no health check after backend deploy |

### Recommendations

- **DELETE `deploy.yml`** — keep only `auto-deploy.yml`, consolidate
- **Add test job before deploy:**
  ```yaml
  test-backend:
    runs-on: ubuntu-latest
    steps:
      - run: npm ci && npm test
  deploy-backend:
    needs: test-backend
  ```
- **Add staging environment:** `wrangler deploy --env staging` with separate D1/R2 buckets
- **Add post-deploy health check:** `curl https://vantrangedu-api.bangachieu2.workers.dev/ | jq .status`
- **Enable branch protection** on `main` — require PR reviews + passing checks

---

## 2. Cloudflare Stack Analysis

### 2.1 Workers Configuration

**File:** `backend/wrangler.toml`

| Config | Value | Assessment |
|--------|-------|------------|
| `compatibility_date` | `2025-03-01` | ✅ Recent |
| `compatibility_flags` | `nodejs_compat` | ✅ Needed for bcryptjs |
| `workers_dev` | `true` | ⚠️ **Should be `false` in production** — exposes `.workers.dev` URL |
| `main` | `src/index.js` | ✅ |

**Issues:**
- `workers_dev = true` exposes a public `.workers.dev` URL alongside custom domain — potential attack surface
- No `routes` or custom domain config in wrangler.toml (likely configured in Cloudflare dashboard)
- No `limits` configuration (CPU time, subrequest limits)

### 2.2 D1 Database

| Metric | Value | Limit (Workers Paid) | Risk |
|--------|-------|---------------------|------|
| Database size | Unknown | 10 GB max | 🟡 Monitor |
| Read queries/sec | Unknown | 25 billion reads/mo | 🟢 Low risk |
| Write queries/sec | Unknown | 50 million writes/mo | 🟡 Monitor |
| Max query result size | N/A | 20 MB per query | ⚠️ `exportDatabaseToJSON` does `SELECT *` on all tables — could exceed |
| Row size | N/A | 1 MB max | 🟢 OK for this schema |

**D1-Specific Concerns:**
- **SQL injection in `backup.js`:** Lines 32 and 52 use `SELECT * FROM ${table}` and `SELECT * FROM ${tableName}` with string interpolation — though table names come from a hardcoded list, the `exportTableToCSV` receives `tableName` from URL param (`c.req.param()`). This is a **SQL injection vector**.
- **No query optimization:** 33 route files, many doing full table scans. No query EXPLAIN analysis.
- **Schema missing newer tables:** `backup.js` hardcodes 11 tables but schema shows `class_videos`, `online_classes`, `teachers`, `assignments` etc. are missing from backup list — **data loss risk on restore**.
- **No read replicas configured** — D1 supports location hints but none specified.

### 2.3 R2 Storage

| Bucket | Binding | Purpose |
|--------|---------|---------|
| `vantrangedu-files` | `R2` | Documents, Excel files, backups |
| `class-videos` | `VIDEO_BUCKET` | Video recordings |

**Issues:**
- No lifecycle policies (auto-delete old backups, temp files)
- No CORS policy on R2 buckets documented
- Video deletion in `videos.js` line 394 is **commented out** — DB metadata deleted but R2 object remains = **orphaned storage cost**
- No CDN caching headers on R2 objects

### 2.4 Workers KV

**Not used.** This is a significant gap:
- Rate limiter uses **in-memory Map** (line 6, `rate-limiter.js`) — resets on every Worker restart/cold start. Effectively non-functional in production since Workers are stateless.
- Session/token blacklisting not possible without KV
- Cache layer for frequently accessed data (classes list, homepage settings) would reduce D1 load

### 2.5 Cloudflare Pages (Frontend)

| Aspect | Status |
|--------|--------|
| Deploy command | `wrangler pages deploy dist` | ✅ |
| Custom domain | `vantrangedu.com` | ✅ Configured |
| SPA routing | `_redirects: /* /index.html 200` | ✅ |
| `_headers` file | ❌ **Missing** — no security headers |
| Build output optimization | Manual chunks configured in vite.config.ts | ✅ |

### 2.6 Cloudflare AI Binding

- `[ai] binding = "AI"` configured — used in `routes/ai.js`
- Adds to Worker bundle cost; should have usage limits/admin-only guard

---

## 3. Monitoring & Observability — 🔴 CRITICAL GAP

### Current State: Essentially ZERO monitoring

| Component | Status | Impact |
|-----------|--------|--------|
| Error tracking (Sentry, etc.) | ❌ None | Errors silently logged to `console.error`, lost after request |
| APM / Performance monitoring | ❌ None | No visibility into slow queries, Worker CPU time |
| Uptime monitoring | ❌ None | No alerting when service goes down |
| Structured logging | ❌ None | 150 `console.log/error/warn` statements — unstructured, ephemeral |
| Request tracing | ❌ None | Cannot trace a request across Worker → D1 → R2 |
| Frontend error tracking | ❌ None | User errors invisible |
| Analytics | 🟡 Optional | `.env.example` shows GA4, Clarity, FB Pixel placeholders but not confirmed active |

### Impact

- **You will NOT know when the system is broken** until users complain
- Cannot debug production issues — logs vanish after request completes
- Cannot measure performance degradation
- Cannot track D1 quota usage approaching limits

### Recommendations (Priority Order)

1. **Immediate:** Add Cloudflare Workers Analytics Engine (free) or Logpush
2. **Week 1:** Integrate Sentry for Workers (`@sentry/cloudflare`) — catches unhandled errors
3. **Week 1:** Add UptimeRobot or Better Stack for uptime monitoring (free tier)
4. **Week 2:** Add structured logging middleware:
   ```js
   // Log request + response time + status
   app.use('*', async (c, next) => {
     const start = Date.now();
     await next();
     const duration = Date.now() - start;
     // Send to Analytics Engine or external service
   });
   ```
5. **Week 3:** Add Cloudflare Workers Trace (`cf-trace` header) for request tracing
6. **Frontend:** Add Sentry React SDK for frontend error catching

---

## 4. Backup & Recovery

### Current Strategy

| Aspect | Status | Detail |
|--------|--------|--------|
| Backup method | JSON export to R2 | `exportDatabaseToJSON()` → full table dump |
| Trigger | Manual only | Admin clicks button in UI |
| Schedule | ❌ None | No automated/cron backup |
| Incremental backup | ❌ None | Full dump every time |
| Tables backed up | 11 of 20+ | Missing: `class_videos`, `online_classes`, `teachers`, `class_schedules`, `class_teachers`, `assignments`, `exam_*`, `attendance`, `document_folders`, `document_permissions`, `document_downloads` |
| R2 file backup | ❌ None | If R2 bucket is lost, all documents/videos gone |
| Restore tested | ⚠️ Untested | `restoreFromBackup` has `DELETE FROM` **commented out** — restore does `INSERT OR REPLACE` which may cause conflicts |
| Retention policy | Planned but not implemented | Comment says "Keep only last 30 backups" but code doesn't do it |
| RTO target | Undefined | |
| RPO target | Undefined | |

### Critical Issues

1. **Incomplete backup coverage** — 50%+ of tables not backed up. Data in exam system, teachers, attendance, assignments would be LOST
2. **No automated schedule** — relies on admin remembering to backup
3. **D1 has no native point-in-time recovery** — unlike traditional databases
4. **R2 objects not backed up** — documents, videos, CCCD images have no redundancy
5. **Restore is untested and risky** — `INSERT OR REPLACE` on a live database without transaction wrapping

### Recommendations

1. **Immediate:** Update backup table list to include ALL tables
2. **Week 1:** Use Cloudflare Cron Triggers for daily automated backup:
   ```toml
   [triggers]
   crons = ["0 2 * * *"]  # Daily at 2 AM UTC
   ```
3. **Week 2:** Enable D1 Time Travel (built-in, 30-day history) if available on your plan
4. **Week 2:** Add cross-region R2 replication or external backup for critical files
5. **Week 3:** Write and test a full disaster recovery runbook

---

## 5. Security Analysis

### Strengths ✅

| Feature | Implementation |
|---------|---------------|
| JWT authentication | HMAC-SHA256, custom implementation in `helpers.js` |
| CORS whitelist | 5 specific origins, rejects unlisted |
| Rate limiting | Moderate (200 req/min global), strict (10 req/min payments), login (5/15min) |
| Password hashing | bcryptjs with salt rounds 10 |
| Secrets management | Sensitive keys via `wrangler secret put` (not in code) |
| Role-based access | `admin`, `super_admin`, `staff`, `teacher`, `student` |
| Parameterized queries | Used in most routes |

### Vulnerabilities 🔴

| # | Severity | Issue | Location |
|---|----------|-------|----------|
| 1 | 🔴 Critical | **SQL injection in backup** | `backup.js` line 52: `exportTableToCSV(db, tableName)` where `tableName` comes from URL param |
| 2 | 🔴 Critical | **Rate limiter is non-functional** | `rate-limiter.js` uses in-memory Map — Workers are stateless, Map resets on each isolate. No real rate limiting in production |
| 3 | 🟡 High | **CORS wildcard in helpers.js** | `jsonResponse()` always adds `Access-Control-Allow-Origin: *` — bypasses the CORS middleware whitelist in `index.js` |
| 4 | 🟡 High | **No CSP/security headers** on frontend | Missing `_headers` file — no Content-Security-Policy, X-Frame-Options, HSTS |
| 5 | 🟡 High | **CLOUDFLARE_ACCOUNT_ID exposed** | In `wrangler.toml` line 31 and 100 — committed to git. Not a secret but helps targeted attacks |
| 6 | 🟡 Medium | **JWT has no issuer/audience validation** | Custom JWT doesn't validate `iss` or `aud` claims |
| 7 | 🟡 Medium | **Token expiration detection heuristic** | `helpers.js` line 113: `exp > 4102444800` — fragile dual-format detection |
| 8 | 🟡 Medium | **`.env` committed to git** | `frontend/.env` contains production API URL — minor but bad practice |
| 9 | 🟢 Low | **`.gitignore` only excludes `.dev.secrets`** | Should also exclude `.env`, `.dev.vars`, `node_modules`, `dist` |

### Recommendations

1. **CRITICAL:** Fix SQL injection in `exportTableToCSV` — whitelist allowed table names
2. **CRITICAL:** Replace in-memory rate limiter with Cloudflare KV or Rate Limiting API
3. **HIGH:** Remove `Access-Control-Allow-Origin: *` from `jsonResponse()` — let Hono CORS middleware handle it
4. **HIGH:** Add `frontend/public/_headers`:
   ```
   /*
     X-Frame-Options: DENY
     X-Content-Type-Options: nosniff
     Referrer-Policy: strict-origin-when-cross-origin
     Permissions-Policy: camera=(), microphone=(), geolocation=()
     Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' https: data:; connect-src 'self' https://vantrangedu-api.bangachieu2.workers.dev
   ```
5. **MEDIUM:** Add `.env` to `.gitignore`, use `.env.example` only

---

## 6. Scalability Assessment

### Cloudflare Workers Limits (Paid Plan)

| Resource | Limit | Current Usage Risk |
|----------|-------|--------------------|
| CPU time per request | 30 ms (free) / 30 s (paid) | 🟡 `exportDatabaseToJSON` scanning all tables could exceed |
| Worker size | 10 MB | 🟡 33 route files + xlsx dependency could be large |
| Subrequests | 1000/request (paid) | 🟢 Google Calendar makes ~4 subrequests max |
| Concurrent connections | Unlimited | 🟢 |
| D1 max database size | 10 GB | 🟡 Monitor — videos metadata + exam data grows |
| D1 max query result rows | N/A but 20 MB response | ⚠️ `SELECT *` in export/backup |
| R2 max object size | 5 GB (multipart) | 🟢 Video files should be fine |

### Bottlenecks Identified

1. **D1 as sole database** — No caching layer between Workers and D1. Every request hits database.
2. **No pagination on several list endpoints** — `reports.js` and `export.js` (744 lines!) do bulk operations
3. **`export.js` is 744 lines** — likely does heavy Excel generation in Worker CPU time
4. **No connection pooling** — D1 handles this, but batch queries not used
5. **Frontend bundle size** — 30+ dependencies including gsap, recharts, jspdf, xlsx — potential long initial load

### Recommendations

1. Add Workers KV caching for read-heavy endpoints (classes list, homepage, posts)
2. Implement cursor-based pagination on all list endpoints
3. Move heavy Excel export to a Durable Object or Queue (async processing)
4. Analyze frontend bundle with `npx vite-bundle-visualizer` — current chunk splitting is manual
5. Consider D1 read replicas with `location_hint` for global users

---

## 7. Cost Optimization

### Current Cost Profile (Estimated)

| Service | Usage | Est. Monthly Cost |
|---------|-------|------------------|
| Workers | ~50K-100K req/day (education app) | $5/mo (paid plan) |
| D1 | ~500K reads, ~50K writes/day | Included in paid plan |
| R2 | ~10GB storage, ~100K reads/day | ~$0.15 storage + $0.36 reads |
| Pages | Frontend hosting | Free |
| AI | Unknown usage | Variable |
| **Total** | | **~$5-10/mo** |

### Optimization Notes

- ✅ Cloudflare stack is very cost-effective for this scale
- ✅ Video presigned URLs avoid bandwidth through Workers (R2 direct)
- ⚠️ Orphaned R2 objects (commented-out video deletion) accumulate storage cost
- ⚠️ No cache headers — same data fetched repeatedly from D1
- ⚠️ `xlsx` dependency in backend (1.5MB) — consider lighter alternatives
- ✅ Frontend manual chunk splitting reduces initial JS load

---

## 8. Testing Assessment

### Current Test Coverage

| Area | Files | Coverage |
|------|-------|----------|
| Backend unit tests | 7 files (all `online-classes` module) | ~5% of routes |
| Frontend tests | 0 files | 0% |
| Integration tests | 0 | 0% |
| E2E tests | 0 | 0% |
| CI test automation | ❌ Not in pipeline | N/A |

### Test Infrastructure

- Backend: `vitest` + `@cloudflare/vitest-pool-workers` configured with `wrangler.test.toml`
- Frontend: `vitest` + `@testing-library/react` in devDeps but **no test files exist**

### Risk

- **33 route files with 0 test coverage** means any deploy can break existing functionality
- No regression testing = high probability of introducing bugs
- Combined with no monitoring = bugs shipped silently

---

## 9. Production Readiness Checklist

### 🔴 MUST FIX Before Production (P0)

- [ ] Fix SQL injection in `backup.js` `exportTableToCSV` — whitelist table names
- [ ] Replace in-memory rate limiter with KV-based or Cloudflare Rate Limiting
- [ ] Remove duplicate `deploy.yml` workflow
- [ ] Add test step to CI/CD pipeline before deploy
- [ ] Add error tracking (Sentry for Cloudflare Workers)
- [ ] Add uptime monitoring (UptimeRobot/Better Stack)
- [ ] Fix CORS wildcard in `jsonResponse()` — conflicts with CORS middleware
- [ ] Update backup table list to cover ALL database tables

### 🟡 SHOULD FIX Within 2 Weeks (P1)

- [ ] Add `_headers` file with security headers (CSP, X-Frame-Options, HSTS)
- [ ] Set `workers_dev = false` in production wrangler.toml
- [ ] Add automated daily backup via Cron Triggers
- [ ] Add structured logging middleware
- [ ] Add Workers KV for caching (classes list, homepage data, sessions)
- [ ] Add post-deploy health check to CI/CD
- [ ] Enable branch protection on `main`
- [ ] Add `.env` to `.gitignore`
- [ ] Implement R2 lifecycle policy (auto-cleanup old backups)
- [ ] Enable orphaned R2 video cleanup in video delete endpoint

### 🟢 NICE TO HAVE Within 1 Month (P2)

- [ ] Add staging environment (`--env staging`)
- [ ] Write tests for auth, payments, students, registrations routes
- [ ] Add frontend error boundary + error reporting
- [ ] Add frontend test suite (at least critical flows)
- [ ] Implement D1 read replicas with location hints
- [ ] Add request tracing across Worker → D1 → R2
- [ ] Move heavy export operations to Queue/Durable Objects
- [ ] Add deployment rollback automation
- [ ] Create disaster recovery runbook with defined RTO/RPO
- [ ] Analyze and optimize frontend bundle size

---

## 10. Architecture Diagram (Current State)

```
┌─────────────────────────────────────────────────────────────┐
│                     CLOUDFLARE EDGE                         │
│                                                             │
│  ┌──────────────┐    ┌──────────────────────────────────┐  │
│  │   CF Pages   │    │     CF Workers (Hono)             │  │
│  │  (Frontend)  │───▶│  vantrangedu-api                  │  │
│  │  React 19    │    │                                    │  │
│  │  vantrangedu │    │  ┌─────────┐  ┌──────────────┐   │  │
│  │  .com        │    │  │ Auth MW │  │ Rate Limiter │   │  │
│  └──────────────┘    │  │ (JWT)   │  │ (IN-MEMORY!) │   │  │
│                      │  └────┬────┘  └──────────────┘   │  │
│                      │       │                            │  │
│                      │  ┌────▼──────────────────────┐    │  │
│                      │  │   33 Route Files           │    │  │
│                      │  │   (auth, students, classes │    │  │
│                      │  │    payments, exams, etc.)  │    │  │
│                      │  └────┬────────┬────────┬────┘    │  │
│                      └───────┼────────┼────────┼─────────┘  │
│                              │        │        │             │
│  ┌───────────────┐   ┌──────▼──┐  ┌──▼───┐  ┌▼─────────┐  │
│  │  CF AI ⚡      │   │  D1 DB  │  │  R2  │  │ R2 Video │  │
│  │  (AI routes)  │   │ SQLite  │  │ Files│  │ Bucket   │  │
│  └───────────────┘   └─────────┘  └──────┘  └──────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────▼──────────┐
                    │  External Services  │
                    │  • Google Calendar  │
                    │  • Google Meet      │
                    │  • Email (Resend?)  │
                    │  • CF Images        │
                    └────────────────────┘

❌ MISSING:
  • Error Tracking (Sentry)
  • Uptime Monitoring
  • Structured Logging
  • Workers KV Cache
  • Staging Environment
  • Automated Testing in CI
  • Automated Backups
```

---

## 11. Risk Matrix

| Risk | Likelihood | Impact | Mitigation Priority |
|------|-----------|--------|---------------------|
| Data loss (incomplete backup) | High | Critical | P0 |
| SQL injection via backup endpoint | Medium | Critical | P0 |
| Undetected outage (no monitoring) | High | High | P0 |
| Rate limiter bypass (in-memory) | High | Medium | P0 |
| Bad deploy breaks production (no tests) | High | High | P0 |
| D1 size limit reached | Low | Critical | P2 |
| R2 storage cost creep (orphaned files) | Medium | Low | P1 |
| Frontend security headers missing | Medium | Medium | P1 |
| Worker CPU timeout on heavy exports | Medium | Medium | P2 |

---

## Unresolved Questions

1. **What Cloudflare plan is active?** Free vs Paid Workers plan significantly affects D1 limits, CPU time, and available features (Cron Triggers, Queues, Durable Objects).
2. **Is D1 Time Travel enabled?** Would provide 30-day point-in-time recovery built-in.
3. **Is custom domain (vantrangedu.com) configured with Cloudflare DNS?** Affects WAF/DDoS protection scope.
4. **What is the current D1 database size?** Need to assess proximity to 10GB limit.
5. **Is the email service (Resend) actually configured?** Code has fallback to console.log — unclear if emails are actually sent in production.
6. **Are GitHub Actions secrets (`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`) properly scoped?** Should use environment-level secrets.
7. **How many concurrent users expected?** Affects scalability planning urgency.
