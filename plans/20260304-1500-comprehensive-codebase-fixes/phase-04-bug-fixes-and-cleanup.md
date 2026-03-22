# Phase 04 — Bug Fixes & Cleanup

## Context Links

- [Frontend UI/UX Report](../reports/frontend-ui-ux-report.md)
- [Standards Audit Report](../reports/standards-audit-report.md)
- LiveChat component: `frontend/src/components/ui/LiveChat.jsx` (51 lines — all commented out)
- Analytics config: `frontend/src/utils/analytics.js` (262 lines — placeholder IDs)
- HomePage: `frontend/src/pages/public/HomePage.jsx` (imports LiveChat)
- Duplicate methods in api.js: handled in Phase 3

## Overview

- **Priority:** 🟢 Low
- **Status:** Pending (blocked by Phase 3 for duplicate removal verification)
- **Description:** Remove disabled LiveChat, fix analytics placeholder IDs, clean up dead code, address password policy, remove redundant imports

## Key Insights

1. **LiveChat.jsx** — Entire Tawk.to script commented out (lines 12-46). Component renders `null`. Still imported in `HomePage.jsx` line 12 and rendered at line 267.
2. **Analytics IDs** — `GA4_MEASUREMENT_ID: 'G-XXXXXXXXXX'`, `CLARITY_PROJECT_ID: 'XXXXXXXXXX'` — placeholders. `initClarity()` already has a guard (line 190: checks for `'XXXXXXXXXX'` pattern), so Clarity won't load. But `initGA4()` will load `gtag` library with fake ID (line 17: only checks `!CONFIG.GA4_MEASUREMENT_ID`, which is truthy).
3. **api.js duplicates** — `uploadClassDocument` (lines 768 & 844) and `getPosts` (lines 1012 & 1625) — handled in Phase 3 Step 1. Verify here.
4. **Password policy** — `auth.js` enforces 6 char minimum (lines 254, 312). Security report recommends 8.
5. **analytics.js exceeds 200 LOC** — 262 lines. Needs splitting or the placeholder analytics should be removed entirely until real IDs are configured.

## Requirements

### Functional
- Remove dead LiveChat component and all references
- Fix analytics to not load with placeholder IDs OR move to env vars
- Verify duplicate API methods removed (Phase 3 dependency)
- Strengthen password policy to 8 characters minimum

### Non-Functional
- No user-visible behavior changes (LiveChat was already disabled)
- Analytics should gracefully skip when no IDs configured

## Architecture

No architectural changes. In-place fixes only.

## Related Code Files

### Files to Modify
- `frontend/src/pages/public/HomePage.jsx` — Remove LiveChat import and usage
- `frontend/src/utils/analytics.js` — Fix GA4 placeholder guard, move IDs to env vars
- `backend/src/routes/auth.js` — Increase password minimum to 8 characters

### Files to Delete
- `frontend/src/components/ui/LiveChat.jsx` — Dead component

### Files Verified (Phase 3 handles)
- `frontend/src/services/api.js` — Duplicate methods removed in Phase 3

## Implementation Steps

### Step 1: Remove LiveChat component

**File:** `frontend/src/components/ui/LiveChat.jsx`
- Delete the file entirely

**File:** `frontend/src/pages/public/HomePage.jsx`
- Remove import: `import LiveChat from '../../components/ui/LiveChat';` (line 12)
- Remove usage: `<LiveChat />` (line 267)

**Verification:** Search entire codebase for "LiveChat" — should return zero results after cleanup.

### Step 2: Fix analytics placeholder detection

**File:** `frontend/src/utils/analytics.js`

**Option A (Recommended — move to env vars):**

Replace hardcoded CONFIG (lines 7-11):
```js
// BEFORE:
const CONFIG = {
    GA4_MEASUREMENT_ID: 'G-XXXXXXXXXX',
    CLARITY_PROJECT_ID: 'XXXXXXXXXX',
    FB_PIXEL_ID: null,
};

// AFTER:
const CONFIG = {
    GA4_MEASUREMENT_ID: import.meta.env.VITE_GA4_MEASUREMENT_ID || null,
    CLARITY_PROJECT_ID: import.meta.env.VITE_CLARITY_PROJECT_ID || null,
    FB_PIXEL_ID: import.meta.env.VITE_FB_PIXEL_ID || null,
};
```

This way:
- No IDs in code (security best practice)
- Analytics only loads when env vars are set
- No need for placeholder detection guards

**Also fix `initGA4()` guard (line 17):**
```js
// BEFORE:
if (!CONFIG.GA4_MEASUREMENT_ID || typeof window === 'undefined') return;

// AFTER (add placeholder detection like initClarity already has):
if (!CONFIG.GA4_MEASUREMENT_ID ||
    CONFIG.GA4_MEASUREMENT_ID.includes('XXXX') ||
    typeof window === 'undefined') return;
```

With env var approach, this guard is redundant (env var would be null/undefined), but keep as defense-in-depth.

**File size reduction:** After moving IDs to env vars, `analytics.js` is still ~260 lines. Consider splitting:
- `utils/analytics-init.js` (~80 lines) — initGA4, initClarity, initFacebookPixel, initAnalytics
- `utils/analytics-track.js` (~120 lines) — trackPageView, trackEvent, trackConversion, trackClick, etc.
- `utils/analytics.js` (~40 lines) — barrel re-export + default export object

### Step 3: Strengthen password policy

**File:** `backend/src/routes/auth.js`

In POST `/reset-password` handler (line 254):
```js
// BEFORE:
if (newPassword.length < 6) {
  return errorResponse('Mật khẩu phải có ít nhất 6 ký tự', 400);
}

// AFTER:
if (newPassword.length < 8) {
  return errorResponse('Mật khẩu phải có ít nhất 8 ký tự', 400);
}
```

In POST `/change-password` handler (line 312):
```js
// BEFORE:
if (newPassword.length < 6) {
  return errorResponse('Mật khẩu phải có ít nhất 6 ký tự', 400);
}

// AFTER:
if (newPassword.length < 8) {
  return errorResponse('Mật khẩu phải có ít nhất 8 ký tự', 400);
}
```

**Note:** This does NOT affect existing passwords. Only enforced on password changes/resets going forward.

### Step 4: Verify Phase 3 duplicate removal

After Phase 3 completes, verify:
- `uploadClassDocument` appears exactly ONCE in api.js (or its split module)
- `getPosts` appears exactly ONCE in api.js (or its split module)

```bash
grep -rn "uploadClassDocument" frontend/src/services/api*.js
grep -rn "getPosts" frontend/src/services/api*.js
```

### Step 5: Remove redundant dynamic import

**File:** `backend/src/routes/auth.js` — Already handled in Phase 1 Step 5.
Verify line 299 no longer has: `const { verifyJWT } = await import('../utils/helpers.js');`

### Step 6: Clean up unused imports across codebase

Run a linting pass to identify unused imports:
```bash
# In frontend
cd frontend && npx eslint --rule 'no-unused-vars: warn' src/ --ext .jsx,.js 2>&1 | grep 'is defined but never used'
```

Fix any unused import warnings found.

### Step 7: Add .env.example for analytics

Create `frontend/.env.example` (if not exists) documenting analytics env vars:
```env
# Analytics (optional — leave empty to disable)
VITE_GA4_MEASUREMENT_ID=
VITE_CLARITY_PROJECT_ID=
VITE_FB_PIXEL_ID=

# API
VITE_API_URL=
```

## Todo List

- [ ] Delete `LiveChat.jsx`
- [ ] Remove LiveChat import from `HomePage.jsx`
- [ ] Remove `<LiveChat />` JSX from `HomePage.jsx`
- [ ] Verify no remaining LiveChat references in codebase
- [ ] Move analytics IDs to env vars (`VITE_GA4_MEASUREMENT_ID`, etc.)
- [ ] Add placeholder detection guard to `initGA4()`
- [ ] Split `analytics.js` into 3 files (<200 LOC each)
- [ ] Update password minimum to 8 chars in `reset-password`
- [ ] Update password minimum to 8 chars in `change-password`
- [ ] Update password validation message to reflect 8-char minimum
- [ ] Verify `uploadClassDocument` duplicate removed (Phase 3)
- [ ] Verify `getPosts` duplicate removed (Phase 3)
- [ ] Verify dynamic import removed from auth.js (Phase 1)
- [ ] Create `frontend/.env.example` with analytics vars
- [ ] Run unused import check on frontend
- [ ] Frontend builds without errors
- [ ] Test password change/reset with <8 char password (should reject)

## Success Criteria

1. `LiveChat.jsx` deleted, zero references in codebase
2. Analytics IDs from env vars, not hardcoded placeholders
3. `analytics.js` split into files <200 LOC each
4. GA4 does NOT load with placeholder/missing ID
5. Password minimum = 8 characters on both endpoints
6. Zero duplicate API methods
7. Zero dead/unused imports
8. `.env.example` documents all analytics env vars

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Removing LiveChat breaks HomePage layout | None | None | LiveChat renders `null` — no visual impact |
| Analytics env vars not set in production | Low | Medium | Analytics gracefully degrades — just won't track. Add doc in .env.example |
| 8-char password blocks user with 6-7 char password | Low | Low | Only affects NEW password changes; existing passwords unaffected |
| Splitting analytics.js breaks tracking | Low | Low | Test by setting env vars and verifying gtag loads in browser devtools |

## Security Considerations

- Analytics IDs moved OUT of source code → better security posture
- Password policy strengthened → reduces brute force attack surface
- No sensitive data exposed or new attack vectors introduced
- LiveChat removal reduces third-party JavaScript surface area

## Next Steps

After Phase 4:
- **All 4 phases complete** — codebase meets standards
- **Phase 5 (future):** Split large frontend page components (1000+ LOC JSX files)
- **Phase 5 (future):** Responsive design consolidation for Desktop/Mobile pages
- **Phase 5 (future):** TypeScript migration for backend
- **Phase 5 (future):** Add comprehensive test coverage
- Update `docs/development-roadmap.md` and `docs/project-changelog.md`
