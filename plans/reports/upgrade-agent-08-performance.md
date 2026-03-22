# Performance Audit Report — VanTrangEdu Frontend

**Agent:** Performance Engineer (Core Web Vitals Expert)
**Date:** 2026-03-04
**Scope:** Bundle size, Core Web Vitals, React performance, network, animations
**Codebase:** `frontend/` — React 19 + Vite 6 + TailwindCSS 4 SPA deployed on Cloudflare Pages

---

## Executive Summary

The frontend has **critical bundle size issues** that directly impact all Core Web Vitals. The main `index.js` chunk is **2.7 MB** (762 KB gzipped) and the `AdminDashboard.js` chunk is **1.3 MB** (418 KB gzipped). Total JS shipped: **~5.5 MB raw / ~1.6 MB gzipped**. This alone will fail Google's Core Web Vitals assessment for most users on 4G connections.

### Severity Matrix

| Area | Severity | Impact |
|------|----------|--------|
| Bundle Size (index.js = 2.7 MB) | **CRITICAL** | LCP, FID, TBP |
| Eager imports of 25+ pages in App.jsx | **CRITICAL** | Initial load |
| GSAP loaded on every page (34 files) | **HIGH** | Bundle bloat |
| No image optimization (180 KB logo.jpg) | **HIGH** | LCP |
| No virtualization for student tables | **HIGH** | INP |
| Dual caching (localStorage + React Query) | **MEDIUM** | Complexity, staleness |
| No Service Worker / offline strategy | **MEDIUM** | Repeat visits |
| framer-motion unused but in dependencies | **LOW** | 6.6 MB node_modules waste |

---

## 1. BUNDLE SIZE ANALYSIS

### Current Build Output

| Chunk | Raw Size | Gzipped | Assessment |
|-------|----------|---------|------------|
| `index.js` (main) | **2,704 KB** | 762 KB | **CRITICAL — 27x over budget** |
| `AdminDashboard.js` | **1,311 KB** | 418 KB | **CRITICAL — 13x over budget** |
| `pdf-vendor.js` | 562 KB | 167 KB | HIGH — loaded eagerly |
| `chart-vendor.js` | 393 KB | 108 KB | Chunked ✓ but no lazy gate |
| `index.es.js` (xlsx) | 159 KB | 53 KB | Medium |
| `StudentDashboard.js` | 120 KB | 26 KB | Lazy ✓ acceptable |
| `TeacherDashboard.js` | 115 KB | 24 KB | Lazy ✓ acceptable |
| `react-vendor.js` | 36 KB | 13 KB | Good — well separated |
| `VStepExamHall.js` | 33 KB | 10 KB | Lazy ✓ acceptable |
| `qrcode-vendor.js` | 0 KB | 0 KB | Empty chunk — remove |
| **TOTAL JS** | **~5,500 KB** | **~1,600 KB** | |

### Target: Initial JS < 200 KB gzipped (industry standard for LCP < 2.5s on 4G)

### 1.1 Root Cause: Massive `index.js` Chunk

The **2.7 MB main chunk** contains:

1. **25+ eagerly imported public pages** — `App.jsx` lines 4-21 import every public page synchronously:
   - `HomePage`, `StudentRegistration`, `UnifiedLogin`, `AboutPage`, `TrainingPage`, `AdmissionsPage`, `ResearchPage`, `ConnectionsPage`, `Hub4Page`, `LifePage`, `UnitsPage`, `StudentPortalPage`, `FacultyPortalPage`, `CertificateLookup`, `ServicesPage`, `NewsPage`, `PostDetailPage`, `ContactPage`, `SemanticLanding` — all eager
   - `AdminLogin`, `PasswordResetPage` — also eager (admin auth)
   - `VStepManager`, `VStepEditor`, `ExcelImportStats` — also eager (VSTEP admin)
   - `VStepExamList`, `VStepExamResult`, `VStepExamHistory` — also eager (student VSTEP)
   - Only 4 pages lazy: `AdminDashboard`, `VStepExamHall`, `StudentDashboard`, `TeacherDashboard`

2. **GSAP (ScrollTrigger + Flip + TextPlugin)** — imported in 34 files, bundled into main chunk since it's used by eager pages (HomePage, AboutPage, etc.)

3. **Full API service barrel** (`services/api.js`) — imports all 16 domain method files into one ApiClient singleton, pulled into main bundle

4. **AIAssistant** component rendered on EVERY route (App.jsx line 261), includes GSAP dependency

5. **prop-types** still imported in 7 components — dead weight in production build

### 1.2 Heavy Dependencies Audit

| Package | node_modules | Bundle Impact | Used In | Recommendation |
|---------|-------------|---------------|---------|----------------|
| `gsap` + `@gsap/react` | 6.4 MB | ~80 KB gzipped in main | 34 files (mostly public pages) | Lazy load per-page |
| `framer-motion` | 6.6 MB | **0 KB** (not imported!) | **UNUSED** | **REMOVE from package.json** |
| `recharts` | 5.2 MB | 393 KB raw (chunked) | Admin reports only | Good chunk, needs lazy gate |
| `jspdf` + `html2canvas` | 19 MB | 562 KB raw (chunked) | PDF export only | Good chunk, needs lazy gate |
| `xlsx` + `xlsx-js-style` | 7.2 MB | 159 KB raw | 3 files (admin Excel) | Lazy import ✓ |
| `lucide-react` | 43 MB | Tree-shaken well | Everywhere | OK — Vite tree-shakes |
| `react-quill` | 432 KB | **0 KB** (not imported!) | **UNUSED** | **REMOVE from package.json** |
| `@dnd-kit/*` | 1.9 MB | **0 KB** (not imported!) | **UNUSED** | **REMOVE from package.json** |
| `react-hotkeys-hook` | N/A | **0 KB** (not imported!) | **UNUSED** | **REMOVE from package.json** |
| `papaparse` | N/A | **0 KB** (not imported!) | **UNUSED** | **REMOVE from package.json** |
| `qrcode` | N/A | 0 KB (empty chunk) | 2 files | Fix manualChunks or remove |
| `prop-types` | N/A | Small but dead | 7 files | Remove in production |

**5 unused dependencies** in package.json: `framer-motion`, `react-quill`, `@dnd-kit/*`, `react-hotkeys-hook`, `papaparse`

### 1.3 Vite Config Issues

```js
// Current vite.config.ts
manualChunks: {
    'react-vendor': ['react', 'react-dom', 'react-router-dom'],
    'chart-vendor': ['recharts'],
    'pdf-vendor': ['jspdf', 'html2canvas'],
    'qrcode-vendor': ['qrcode'],  // ← Generates EMPTY chunk
},
chunkSizeWarningLimit: 1000, // ← Raised to hide warnings instead of fixing
```

**Problems:**
- `qrcode-vendor` generates empty chunk (qrcode is only imported dynamically in 2 files)
- No chunk for `gsap` (80+ KB bundled into main)
- No chunk for `xlsx` / `xlsx-js-style`
- `chunkSizeWarningLimit: 1000` masks the real 2.7 MB problem

---

## 2. CORE WEB VITALS ANALYSIS

### 2.1 LCP (Largest Contentful Paint) — Target: < 2.5s

**Current Estimate: 4-6s on 4G** (FAILING)

**Issues:**
- **2.7 MB main JS** must download + parse + execute before React hydrates
- Hero images from `images.unsplash.com` — external CDN, no size optimization, no `srcset`/`sizes`, no WebP/AVIF
- Homepage hero image: `?q=80&w=800` — decent but could be `&w=400` for mobile
- `logo.jpg` = 180 KB (should be < 30 KB as WebP, 512x512 is overkill for display)
- `background.jpg` = 106 KB — not referenced in code; dead asset?
- Font loading via `preload as="style"` hack — good pattern but Inter loads 6 weights (400-900), only 2-3 needed initially
- No `<link rel="preload">` for hero images
- No `fetchpriority="high"` on LCP image element

**LCP Element (HomePage):** Likely the hero `<img>` from Unsplash (line 125 in HomePage.jsx) — loads with no priority hints

### 2.2 FID / INP (Interaction to Next Paint) — Target: < 200ms

**Current Estimate: 200-500ms** (AT RISK)

**Issues:**
- Main bundle blocks interactivity until fully parsed (2.7 MB JS)
- `StudentsManagement` fetches 200 students on mount (`api.getStudents(200, 0)`) — entire dataset
- No virtualization for student table (renders all 200 rows to DOM)
- GSAP `ScrollTrigger` attaches event listeners on every scroll — all registered on page load
- `3D Tilt Effect` in HomePage.jsx (lines 53-68) — attaches `mousemove` listener to multiple elements with `gsap.to()` per frame
- Debounced search (300ms) is correct pattern ✓

### 2.3 CLS (Cumulative Layout Shift) — Target: < 0.1

**Current Estimate: 0.05-0.15** (AT RISK)

**Issues:**
- Hero images have **no width/height** attributes in HomePage.jsx (lines 125, 139) — browser can't reserve space
- `LazyImage` component accepts `width`/`height` but they're **optional** and rarely passed
- Only 3 files use `loading="lazy"` out of 14 files with `<img>` tags (20 total `<img>` elements)
- Font swap: `Inter` loaded async with `display=swap` — will cause FOIT/FOUT shift
- `index.html` body uses system font stack as fallback — good, but Inter's metrics differ significantly from system fonts
- Skeleton loaders exist but not used on most routes — only framework exists, no integration

### 2.4 TTFB (Time to First Byte) — Target: < 800ms

**Current Estimate: 50-200ms** (GOOD ✓)

- Deployed on **Cloudflare Pages** — edge-cached static files
- `_redirects` file for SPA fallback ✓
- API on Cloudflare Workers (edge compute) ✓

---

## 3. REACT PERFORMANCE

### 3.1 Code Splitting Effectiveness

**Only 4 out of ~30 route pages are lazy-loaded.** The "SEO" comment in App.jsx (line 3) claims eager imports help SEO, but:
- This is an SPA — search engines won't benefit from eager JS imports
- For true SSR/SEO, you'd need Next.js or Vite SSR — not eager imports in a client-rendered app
- The correct approach: lazy-load all non-critical routes, use `<Suspense>` per route group

### 3.2 React.memo / useMemo / useCallback Usage

Found across 19 files (68 occurrences total) — mostly in `AdminDashboardDesktop.jsx`:
- `AdminDashboardDesktop` uses `useMemo` for rendered content and `useCallback` for handlers ✓
- `StudentsManagement` — **zero memoization**, re-renders entire table on any state change
- Public pages — **zero memoization** (acceptable for static content)

### 3.3 React Query Configuration

```js
// query-client.js — GOOD defaults
staleTime: 5 * 60 * 1000,        // 5 min ✓
gcTime: 10 * 60 * 1000,          // 10 min ✓
refetchOnWindowFocus: false,       // ✓ prevents unnecessary refetches
retry: 1,                          // ✓ reasonable
```

**But:** `StudentsManagement` doesn't use React Query hooks! It uses raw `api.getStudents()` with `useState`/`useEffect`. The `useStudents` hook in `hooks/queries/use-students.js` exists but is **not used** by the actual admin page. This means:
- No automatic cache invalidation
- No background refetching
- No optimistic updates
- Manual loading state management
- Same pattern in all admin management pages

### 3.4 Dual Caching Problem

Two independent caching layers that don't coordinate:

1. **React Query** (`staleTime: 5min`, `gcTime: 10min`) — in-memory, per query key
2. **localStorage cache** (`cache.js`, `CACHE_DURATION: 5min`) — persisted, per endpoint string

The `api-request-engine.js` writes to localStorage on every GET (line 121-122), AND React Query caches the same response. This means:
- Double memory usage for cached data
- Potential staleness conflicts
- `cachedRequest()` in `api-client-core.js` checks localStorage first, potentially returning stale data even when React Query would refetch

### 3.5 Context Splitting

Only 1 context: `LanguageContext` — simple and lightweight ✓. No context splitting issues.

### 3.6 Suspense Boundaries

Single `<Suspense>` wrapping ALL routes (App.jsx line 57). When any lazy component loads, the entire route tree shows the fallback. Should have **per-route-group boundaries**.

---

## 4. NETWORK ANALYSIS

### 4.1 API Waterfall

`StudentsManagement` triggers `loadStudents()` on mount, then potentially `handleSearch()` on `debouncedKeyword` change — sequential, not parallel. No prefetching strategy.

### 4.2 Request Deduplication

React Query deduplicates when used, but admin pages use raw `api.*()` calls — no deduplication protection.

### 4.3 Image Optimization

| Issue | Count | Impact |
|-------|-------|--------|
| `<img>` without `loading="lazy"` | 17/20 | Bandwidth waste |
| `<img>` without `width`/`height` | Most | CLS |
| No WebP/AVIF format | All | 30-50% larger files |
| No `srcset`/`sizes` | All | No responsive images |
| No `fetchpriority="high"` on hero | 1 | LCP delay |
| External images (Unsplash) without preconnect | ✓ preconnect set | OK |
| `LazyImage` component used in only 2 pages | 2/14 img pages | Underutilized |

### 4.4 Font Loading

```html
<!-- Good: async preload pattern -->
<link rel="preload" as="style" href="...Inter:wght@400;500;600;700;800;900&display=swap" .../>
```

**Issues:**
- Loading **6 font weights** (400, 500, 600, 700, 800, 900) — realistically need 400, 600, 700 initially
- No `font-display: optional` consideration for CLS-free loading
- No subset for Vietnamese characters (Inter supports Vietnamese but full charset is larger)
- `body` fallback: `-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto'` — good practice ✓

### 4.5 Service Worker / Caching

**No Service Worker, no PWA manifest, no offline support.** On repeat visits, users re-download the full 5.5 MB bundle. Cloudflare Pages provides CDN caching with proper `Cache-Control` headers for hashed assets, but browser cache alone is not optimal.

---

## 5. ANIMATION PERFORMANCE

### 5.1 Dual Animation Libraries

| Library | node_modules | Bundle | Import Count |
|---------|-------------|--------|--------------|
| **GSAP** + ScrollTrigger + Flip + TextPlugin | 6.4 MB | ~80 KB gzipped | **34 files** |
| **framer-motion** | 6.6 MB | **0 KB** | **0 files (UNUSED!)** |

**Recommendation:** Remove `framer-motion` immediately — zero imports found.

### 5.2 GSAP Usage Patterns

- `HomePage.jsx`: Complex timeline + ScrollTrigger + 3D tilt mousemove handler — **most animation-heavy**
- `AIAssistant.jsx`: `gsap.fromTo()` for chat window open animation — could be CSS
- `AboutPage`, `TrainingPage`, `SemanticLanding`, etc.: `useGSAP()` for scroll animations
- `ScrollTrigger` registered globally in `lib/gsap.js` — all plugins loaded even if page doesn't scroll-animate

### 5.3 CSS vs JS Animation Analysis

Many GSAP animations are simple fades and slides that could be achieved with:
- CSS `@keyframes` + `animation` (already used for some elements)
- `IntersectionObserver` + CSS classes (for scroll-triggered reveals)
- Only keep GSAP for complex timelines and 3D tilt effects

### 5.4 GPU Acceleration

- `will-change` used in **6 files** (mostly CSS files for sidebars/modals) ✓
- No `transform: translateZ(0)` or `will-change: transform` on animated elements
- GSAP 3D tilt uses `rotateX`/`rotateY` — triggers GPU compositing implicitly ✓
- `blur-[120px]` and `blur-3xl` used on decorative elements — GPU-intensive on mobile

---

## 6. SPECIFIC RECOMMENDATIONS (Prioritized)

### P0 — CRITICAL (Week 1) — Expected Impact: LCP -60%, Bundle -70%

#### R1: Lazy-load ALL route pages
```jsx
// App.jsx — Replace ALL eager imports with lazy()
const HomePage = lazy(() => import('./pages/public/HomePage'));
const AboutPage = lazy(() => import('./pages/public/AboutPage'));
const TrainingPage = lazy(() => import('./pages/public/TrainingPage'));
// ... all 25+ pages
```
**Impact:** Main chunk drops from ~2.7 MB to ~200-300 KB

#### R2: Remove 5 unused dependencies
```bash
npm uninstall framer-motion react-quill @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities react-hotkeys-hook papaparse
```
**Impact:** 16+ MB less in node_modules, cleaner dependency tree

#### R3: Split AdminDashboard sub-modules with lazy()
```jsx
// AdminDashboardDesktop.jsx — lazy load each tab
const StudentsManagement = lazy(() => import('./StudentsManagement'));
const PaymentsManagement = lazy(() => import('./PaymentsManagement'));
// ... etc
```
**Impact:** AdminDashboard chunk drops from 1.3 MB to ~50 KB shell + on-demand modules

#### R4: Add GSAP to manualChunks and lazy-load
```js
// vite.config.ts
manualChunks: {
    'react-vendor': ['react', 'react-dom', 'react-router-dom'],
    'gsap-vendor': ['gsap', 'gsap/ScrollTrigger', 'gsap/Flip', 'gsap/TextPlugin'],
    'chart-vendor': ['recharts'],
    'pdf-vendor': ['jspdf', 'html2canvas'],
    // Remove empty qrcode-vendor
},
chunkSizeWarningLimit: 500, // Restore to sane limit
```

### P1 — HIGH (Week 2) — Expected Impact: CLS -80%, INP -40%

#### R5: Add width/height to all images
```jsx
// HomePage.jsx hero images — add explicit dimensions
<img src="..." alt="..." width={800} height={533} className="..." />
```

#### R6: Use LazyImage universally
Replace all `<img>` tags (20 total across 14 files) with `<LazyImage>` component — already built, just not used.

#### R7: Optimize public images
- Convert `logo.jpg` (180 KB) → WebP (target < 30 KB)
- Convert `background.jpg` (106 KB) → WebP (target < 20 KB)
- Add responsive `srcset` for hero images
- Add `fetchpriority="high"` to LCP hero image

#### R8: Virtualize student table
```jsx
// StudentsManagement.jsx — use @tanstack/react-virtual
import { useVirtualizer } from '@tanstack/react-virtual';
// Render only visible rows of 200+ student table
```

#### R9: Migrate admin pages to React Query hooks
`StudentsManagement`, `PaymentsManagement`, etc. all use raw `useState`/`useEffect` + `api.*()`. The React Query hooks (`use-students.js`, `use-classes.js`, `use-registrations.js`) already exist but are unused. Migrate to them for:
- Automatic caching & deduplication
- Background refetching
- Optimistic updates
- Loading/error states for free

### P2 — MEDIUM (Week 3) — Expected Impact: Repeat load -50%

#### R10: Remove dual caching
Choose ONE caching strategy:
- **Option A (Recommended):** Keep React Query only, remove localStorage cache from `api-request-engine.js`
- **Option B:** Keep localStorage cache only for offline-first scenarios

Current code caches every GET response in BOTH React Query AND localStorage — wasteful and confusing.

#### R11: Reduce font weights
```html
<!-- Load only needed weights initially -->
<link rel="preload" as="style"
  href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" ... />
```
Drop weights 500, 800, 900 from initial load (add via lazy CSS if needed for admin).

#### R12: Add per-route Suspense boundaries
```jsx
<Routes>
  {/* Public routes with shared fallback */}
  <Suspense fallback={<PublicPageSkeleton />}>
    <Route path="/" element={<HomePage />} />
    ...
  </Suspense>
  {/* Admin routes with admin fallback */}
  <Suspense fallback={<AdminSkeleton />}>
    <Route path="/admin/*" element={<AdminDashboard />} />
  </Suspense>
</Routes>
```

#### R13: Replace simple GSAP animations with CSS
For AIAssistant open/close, stat card reveals, and other simple fade/slide animations — use CSS `@keyframes` + `IntersectionObserver` instead of loading GSAP's 80 KB bundle.

### P3 — LOW (Week 4) — Polish

#### R14: Add Service Worker for repeat visits
Consider `vite-plugin-pwa` for:
- Precaching of critical assets
- Runtime caching of API responses
- Offline fallback page

#### R15: Remove `prop-types` from production
Only 7 files use PropTypes. Consider:
- Replace with TypeScript (already have `@types/react` in devDeps)
- Or add `babel-plugin-transform-react-remove-prop-types` to Vite config

#### R16: Server-side pagination for student data
`StudentsManagement` loads 200 students at once (line 71: `api.getStudents(200, 0)`). Implement cursor-based pagination with the API.

#### R17: Preload/prefetch critical routes
```jsx
// On hover over navigation links, prefetch the route
<Link to="/training" onMouseEnter={() => import('./pages/public/TrainingPage')}>
```

---

## 7. METRIC TARGETS

| Metric | Current (Estimated) | Target | After P0 | After P1 | After P2 |
|--------|-------------------|--------|----------|----------|----------|
| **LCP** | 4-6s (4G) | < 2.5s | ~2.5-3s | ~2.0s | < 1.8s |
| **FID/INP** | 200-500ms | < 200ms | ~200ms | < 150ms | < 100ms |
| **CLS** | 0.05-0.15 | < 0.1 | ~0.1 | < 0.05 | < 0.03 |
| **TTFB** | 50-200ms | < 800ms | ✓ Same | ✓ Same | ✓ Same |
| **Main JS (gzip)** | 762 KB | < 200 KB | ~200 KB | ~180 KB | ~150 KB |
| **Total JS (gzip)** | 1,600 KB | < 500 KB | ~600 KB | ~500 KB | ~400 KB |
| **Lighthouse Score** | ~40-50 | > 90 | ~70 | ~85 | > 90 |

---

## 8. QUICK WINS (< 1 Hour Each)

1. `npm uninstall framer-motion react-quill @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities react-hotkeys-hook papaparse` — save 16+ MB, clean audit
2. Remove `'qrcode-vendor'` from `manualChunks` — eliminate empty chunk warning
3. Lower `chunkSizeWarningLimit` back to `500` — surface real problems
4. Add `width` and `height` attributes to HomePage hero images — fix CLS
5. Add `fetchpriority="high"` to LCP hero image
6. Reduce Inter font weights from 6 to 3 (400, 600, 700)
7. Delete unused `background.jpg` from `public/` if confirmed unused (106 KB saved)

---

## Unresolved Questions

1. **SSR/SSG plans?** Current eager-import "SEO" strategy in App.jsx is ineffective for an SPA. If SEO is a real requirement, need to evaluate Vite SSR or migration to a framework with SSR support (e.g., React Router v7 framework mode, or TanStack Start).
2. **`background.jpg` in public/** — Is this used anywhere? Not found in any source file. Candidate for removal.
3. **`react-quill` / `@dnd-kit` / `papaparse`** — Were these planned for future features? If so, defer installation until actually needed.
4. **API pagination** — Does the backend support cursor-based or offset/limit pagination for `/admin/students`? The TODO in `StudentsManagement.jsx` line 71 suggests it may not.
5. **Image CDN** — Is Cloudflare Image Resizing available on current plan? Would solve responsive images + WebP conversion automatically.
