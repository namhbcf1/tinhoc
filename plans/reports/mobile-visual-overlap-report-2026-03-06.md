# Mobile Visual Overlap Report — 375×812 Viewport
**Date:** 2026-03-06  
**URL:** https://05780415.vantrangedu.pages.dev  
**Viewport:** 375×812 (iPhone SE/14 Pro simulation, deviceScaleFactor: 2)

---

## Executive Summary

Three visual overlap/layout issues found on the public-facing site. One is a **critical overlap** (floating CTA button covers readable hero text), two are **moderate UX issues** (excessive whitespace on interior pages). The student mobile dashboard layout itself has no structural overlap issues.

---

## Issue 1 — CRITICAL: FloatingCTA Button Overlaps Hero Paragraph Text

**Page:** `/` (HomePage)  
**Component:** `src/components/ui/FloatingCTA.jsx`

### What Happens
The "Tư vấn ngay" floating green button is positioned `fixed bottom-24 right-6 z-40`. On a 375×812 viewport, this places it at:
- Button rect: `top: 658, bottom: 716, left: 182, right: 351`

The hero paragraph ("Hệ thống giáo dục VanTrangEdu kết hợp...") occupies:
- Paragraph rect: `top: 595, bottom: 712, left: 16, right: 359`

**Overlap confirmed:** The button sits directly over the last 2 lines of the hero paragraph. The paragraph text is unreadable behind the button on initial page load (button appears after 500ms timeout, before user scrolls).

### Root Cause
- `FloatingCTA` uses `bottom-24` (96px from bottom), which is designed for desktop where content is scrolled. On mobile, the hero section is tall and the paragraph still sits at viewport y=595–712 at scroll position 0.
- No scroll-threshold logic: button always appears after 500ms regardless of scroll position. Desktop convention assumed user has already scrolled past the hero.

### Screenshot Evidence
Red outline = button, red background = covered paragraph text (confirmed via Playwright `elementsFromPoint` showing both `BUTTON.Tư vấn ngay` and `P.mb-10.text-lg` at the same viewport coordinates).

### Fix
In `FloatingCTA.jsx`, only show the button after the user has scrolled past the hero (e.g., `window.scrollY > 400`). Change:
```js
// Current: shows after 500ms timeout regardless of scroll
const timer = setTimeout(() => setIsVisible(true), showAfter);

// Fix: show only after user scrolls past hero
const handleScroll = () => setIsVisible(window.scrollY > 400);
window.addEventListener('scroll', handleScroll);
```

---

## Issue 2 — MODERATE: Excessive Top Whitespace on Interior Pages (About, Training)

**Pages:** `/about`, `/training`  
**Cause:** Large `pt-32` / `pt-28` padding on first content blocks, combined with 118px sticky header

### About Page (`/about`)
- Header height: 118px
- First content div: `relative pt-32 pb-20` → computed `paddingTop: 128px`
- Total blank space from top of viewport to first text: **118 + 128 = 246px** (~30% of the 812px viewport wasted)
- Visible whitespace between header and "Về VanTrangEdu" heading: ~350px blank area

### Training Page (`/training`)
- Header height: 118px  
- First div: `container mx-auto px-4 pt-28` → `paddingTop: 112px`
- Then second div: `relative pt-32 pb-20` → `paddingTop: 128px`
- Breadcrumb ("Trang chủ / Đào tạo") at y=390, hero heading ("Hệ Sinh Thái Đào Tạo") at y=763
- Total blank area from header to hero: ~645px — **nearly a full viewport of whitespace**

### Root Cause
`pt-32` (128px) is designed for desktop where the header is NOT sticky/fixed or is shorter. On mobile, the sticky header already offsets content. The first sections are double-padded: once by the layout and once by the section's own `pt-32`.

### Fix
Add responsive padding overrides: reduce `pt-32` to `pt-8 md:pt-32` on mobile for these hero sections, or use `sm:pt-32` breakpoint.

---

## Issue 3 — MODERATE: News Page Fails to Load Articles

**Page:** `/news`  
**Component:** `src/pages/public/NewsPage.jsx`

### What Happens
The news list renders an error state: "Không thể tải tin tức" with a "Khởi Tạo Kết Nối Lại" button. No articles are shown.

### Root Cause
`NewsPage.jsx` calls `api.request('/posts?status=published')` against `VITE_API_URL=https://vantrangedu-api.bangachieu2.workers.dev`. The Cloudflare Worker API appears to be returning an error or unreachable from the deployed Cloudflare Pages deployment at time of testing.

This is not a visual overlap issue per se, but results in a page that shows only a large blank hero section + error card — visually poor on mobile.

### Note
This may be a transient API connectivity issue between Cloudflare Pages and the Workers backend, or a CORS/routing issue. Needs backend investigation.

---

## Issues NOT Found (No Overlap)

| Component | Status |
|---|---|
| Header vs content overlap | None — header top: 0, content top: 118 (matches) |
| Bottom nav covering content | None — `StudentMobileLayout` uses correct `padding-bottom: calc(--mb-bottom-nav-height + --mb-lg)` |
| Student mobile drawer z-index | Correct — drawer z-10000 > header z-9999 |
| Student mobile header vs content | Correct — content uses `padding-top: calc(--mb-header-height + --mb-md)` |
| Login page layout | Clean, no overlaps |
| Footer elements | No overlap issues |
| ScrollToTopButton | `opacity-0 pointer-events-none` by default, only visible on scroll — no overlap |

---

## Summary Table

| # | Page | Issue | Severity | Fix Effort |
|---|---|---|---|---|
| 1 | `/` (Home) | FloatingCTA overlaps hero paragraph text | Critical | Low (add scroll threshold in FloatingCTA.jsx) |
| 2 | `/about`, `/training` | Excessive top whitespace (~246–645px) | Moderate | Low (reduce pt-32 → pt-8 md:pt-32 on first sections) |
| 3 | `/news` | Articles fail to load (API error) | Moderate | Needs backend investigation |

---

## File Locations

- Floating CTA: `frontend/src/components/ui/FloatingCTA.jsx` line 33 — `fixed bottom-24 right-6`
- About page hero: `frontend/src/pages/public/AboutPage.jsx` line 100 — `relative pt-32 pb-20`
- Training page hero: `frontend/src/pages/public/TrainingPage.jsx` line 232–237 — `pt-28` + `pt-32`
- News page API call: `frontend/src/pages/public/NewsPage.jsx` line 64 — `api.request('/posts?status=published')`
