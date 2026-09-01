# vantrangedu — Education Platform (SSO Broker)

> **MANDATORY — YOUR FIRST ACTION MUST BE READING THE 4 FILES BELOW**

## ⛔ FORBIDDEN — DO NOT READ THESE FOR CONTEXT

- ❌ `README.md` — stale, wastes tokens
- ❌ `docs/` — stale, wastes tokens
- ❌ `package.json` — not needed for context
- ❌ Any source files for "understanding the project"
- ❌ `ls`, `find`, `Search`, `Glob` to explore project structure

## ✅ AUTO-START — Read these 4 files FIRST (before any response)

Your VERY FIRST action must be reading these 4 files using your Read tool. No other action before this:

1. Read `.serena/memories/00-overview.md`
2. Read `.serena/memories/10-architecture.md`
3. Read `.serena/memories/20-cross-repo-contracts.md`
4. Read `.serena/memories/30-active-work.md`

These contain EVERYTHING about the project: scope, architecture, cross-repo rules, current work.
After reading all 4, you have full context. Respond to the user.

## ✅ AUTO-FINISH — Before saying "done"/"completed"/"finished"

Write updated content to these files:
1. Write `.serena/memories/30-active-work.md` — task summary + changed files + timestamp
2. If you made technical decisions: append to `.serena/memories/40-decisions.md`
3. If you ran tests: append to `.serena/memories/50-verification.md`

If Serena MCP tools are available (mcp__serena__write_memory etc.), prefer them.
Otherwise, write files directly with your Write tool.

## ✅ WHILE WORKING — Keep memories updated

- After modifying 3+ files: update `30-active-work.md` with changed file list
- After technical decisions: append to `40-decisions.md`
- After running tests: append to `50-verification.md`

## Cross-Repo Safety (CRITICAL)

- Shared D1 database with vantrangexam — NEVER mix data
- ALL SELECT on shared tables: `WHERE source_site IN ('edu', 'system')`
- ALL INSERT/UPDATE on shared tables: hardcode `source_site = 'edu'`
- Shared tables: `program_organizers`, `programs`, `program_levels`, `field_definitions`, `field_options`, `field_values`
- NEVER modify tables owned by vantrangexam (vstep_exams, attempts, grading)

## 🔗 Cross-Repo Awareness

When working on features that touch shared infrastructure (SSO, shared tables, R2):
- **Sister repo memories**: `/home/namhbcf/Desktop/vantrangexam/.serena/memories/`
- Read vantrangexam's `20-cross-repo-contracts.md` if you need the consumer-side perspective
- Read vantrangexam's `30-active-work.md` to check for concurrent work that might conflict
- **NEVER edit** vantrangexam files from this repo — only read for context

## Memory Protection

| Memory | Access | Note |
|--------|--------|------|
| `00-overview.md` | READ-ONLY | Manual updates only (human/deep audit) |
| `10-architecture.md` | READ-ONLY | Manual updates only (human/deep audit) |
| `20-cross-repo-contracts.md` | READ-ONLY | Manual updates only (coordinate both repos) |
| `30-active-work.md` | READ-WRITE | Update every session |
| `40-decisions.md` | APPEND-ONLY | Never delete existing entries |
| `50-verification.md` | APPEND-ONLY | Never delete existing entries |

## Code Roots

- `frontend/` — React 19 + TypeScript + Vite
- `backend/` — Hono on Cloudflare Workers

## Quick Reference

| Item | Value |
|------|-------|
| Stack | React 19 + TS, Hono, CF Workers + D1 + R2 |
| SSO role | Broker (issues JWT consumed by vantrangexam) |
| Frontend dev | `cd frontend && npm run dev` |
| Backend dev | `cd backend && npm run dev` |
| Deploy frontend | `cd frontend && npm run deploy` ← dùng cái này, KHÔNG dùng deploy:quick |
| Deploy backend | `cd backend && npm run deploy` |
| Tests | `cd backend && npx vitest run` |
| Sister repo | `/home/namhbcf/Desktop/vantrangexam/` |

---

## 🚨 DEPLOY RULES — BẮT BUỘC ĐỌC TRƯỚC KHI DEPLOY FRONTEND

### Rule 1 — LUÔN xóa `dist/` trước khi build
```bash
# ✅ ĐÚNG — script đã tích hợp sẵn rm dist
cd frontend && npm run build:prod

# ❌ SAI — KHÔNG BAO GIỜ chạy thẳng vite build
vite build
npx vite build
```
**Lý do:** Vite KHÔNG tự xóa `dist/` cũ. Files cũ (hash khác) vẫn còn trong `dist/`.
Khi deploy, Cloudflare upload cả files cũ + mới → `index.html` mới tham chiếu chunk v4 nhưng
Cloudflare CDN đã cache HTML response cho URL chunk v4 đó từ lần deploy trước (khi nó chưa tồn tại).

### Rule 2 — KHÔNG dùng `modulePreload: false` trong vite.config
```ts
// ❌ SAI — gây MIME error khi lazy chunks fetch muộn
build: { modulePreload: false }

// ✅ ĐÚNG — để mặc định (true), Vite tự inject <link rel="modulepreload">
build: { rollupOptions: { ... } }
```
**Lý do:** `modulePreload: false` khiến lazy chunks không được preload. Khi user navigate,
chunk được fetch runtime → có race condition → Cloudflare SPA fallback trả `index.html` thay vì JS
→ Browser nhận MIME `text/html` thay vì `application/javascript` → crash.

### Rule 3 — Khi đổi `manualChunks`, PHẢI đổi tên suffix (v1→v2→v3...)
```ts
// Hiện tại là v4:
manualChunks: {
  'react-vendor-v4': ['react', 'react-dom', 'react-router-dom', 'react-helmet-async'],
  'icon-vendor-v4': ['lucide-react'],
  'form-vendor-v4': ['react-hook-form', '@hookform/resolvers', 'zod'],
  'image-vendor-v4': ['browser-image-compression'],
}
// Nếu thay đổi nội dung chunks → đổi lên v5
```
**Lý do:** Nếu tên chunk giống nhau nhưng nội dung thay đổi → hash thay đổi → URL mới.
Cloudflare CDN có thể đã cache HTML response (404→HTML) cho URL đó với header `immutable`.
Đổi tên prefix buộc CF fetch từ origin, không dùng cache độc.

### Rule 4 — Khi Cloudflare CDN cache sai (trả HTML cho .js file)
```
# Cách kiểm tra:
curl -sI "https://vantrangedu.com/assets/TEN_FILE.js" | grep -E "content-type|cf-cache"

# Nếu thấy: content-type: text/html + cf-cache-status: HIT
# → CDN đang cache HTML cho file JS này

# Cách fix:
# Option A: Đổi tên chunk suffix (v4→v5) + rebuild + redeploy
# Option B: Purge cache qua Cloudflare Dashboard → Caching → Purge Everything
# Option C: Purge via API (cần Zone:Cache Purge permission)
#   ZONE_ID=85b033b38b70709541a3b8cae12aade1 (vantrangedu.com)
#   curl -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/purge_cache" \
#     -H "Authorization: Bearer $CF_API_TOKEN" \
#     -d '{"purge_everything":true}'
```

### Rule 5 — Sau khi deploy, LUÔN verify trước khi báo xong
```bash
# Verify toàn bộ critical assets trả đúng application/javascript
curl -s -o /dev/null -w "%{http_code} %{content_type}\n" "https://vantrangedu.com/assets/react-vendor-v4-DocW46gW.js"
curl -s -o /dev/null -w "%{http_code} %{content_type}\n" "https://vantrangedu.com/assets/index-BDdTvxHn.js"
# Phải thấy: 200 application/javascript

# Verify index.html không bị cache
curl -sI "https://vantrangedu.com/" | grep cache-control
# Phải thấy: no-store, no-cache, must-revalidate
```

### Rule 6 — Thứ tự deploy chuẩn (frontend)
```bash
cd /c/Users/ADMIN/Desktop/vantrang/vantrangedu/frontend

# Bước 1: Build sạch (script tự rm dist)
npm run build:prod

# Bước 2: Verify dist không có files cũ
ls dist/assets/ | grep "vendor" # Chỉ nên thấy v4

# Bước 3: Deploy
npx wrangler pages deploy dist --project-name=vantrangedu --branch=main --commit-dirty=true

# Bước 4: Verify production (chờ 5-8 giây)
sleep 8 && curl -s -o /dev/null -w "%{http_code} %{content_type}\n" "https://vantrangedu.com/assets/react-vendor-v4-DocW46gW.js"
```

---

## 📁 Cấu trúc deploy hiện tại (vantrangedu frontend)

| File | Mục đích | Rule |
|------|----------|------|
| `public/_headers` | Cache headers cho CF Pages | `/index.html` → no-store; `/assets/*` → immutable 1 năm |
| `public/_redirects` | SPA fallback + asset rewrite | `/* /index.html 200` |
| `functions/_middleware.js` | Rewrite `/X/assets/Y.js` → `/assets/Y.js` | Compatibility cho stale HTML cache |
| `vite.config.ts` | Build config | `modulePreload` BẬT (default); chunks suffix v4 |

---

## 🐛 Lỗi đã gặp & cách fix (deployment history)

### [2026-04-01] MIME type "text/html" cho JS chunks
- **Triệu chứng:** `Failed to load module script: Expected JS but got text/html`
- **Nguyên nhân gốc:**
  1. `modulePreload: false` → chunks fetch lazy → SPA fallback trap
  2. `dist/` không được clean → files cũ lẫn vào deploy
  3. Cloudflare CDN cache poisoning → cache HTML response với `immutable` header
- **Fix áp dụng:**
  1. Xóa `modulePreload: false` khỏi vite.config
  2. Build script tự động `rm -rf dist/` trước khi build
  3. Đổi chunk suffix v2→v3→v4 để bypass CDN cache
  4. Thêm `no-store` cho `/index.html` và `/` trong `_headers`
- **Files đã sửa:**
  - `frontend/vite.config.ts`
  - `frontend/package.json` (build scripts)
  - `frontend/public/_headers`
