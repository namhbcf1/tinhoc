# UI/UX Design System Review — VanTrangEdu Frontend

**Reviewer:** Senior UI/UX Designer (8 năm kinh nghiệm — VinUni, FPT Education, Coursera Vietnam)
**Date:** 2026-03-04
**Scope:** Toàn bộ design system, component library, layouts, accessibility
**Benchmark:** Coursera, edX, Canvas LMS, Duolingo

---

## I. EXECUTIVE SUMMARY

| Hạng mục | Điểm | Đánh giá |
|---|---|---|
| Visual Design | **8.0/10** | Glassmorphism + Bento Grid hiện đại, brand identity rõ ràng |
| Component Library | **7.0/10** | CVA variant system tốt, nhưng thiếu consistency giữa các component |
| Layout System | **8.5/10** | Desktop/Mobile responsive tốt, sidebar pattern chuẩn Material |
| Accessibility | **5.5/10** | Cần cải thiện đáng kể — thiếu ARIA roles, contrast, keyboard nav |
| Interaction Design | **7.5/10** | GSAP + Framer Motion phong phú, nhưng thiếu prefers-reduced-motion |
| **TỔNG** | **7.3/10** | **Khá tốt, cần focus accessibility + design token unification** |

**Verdict:** Design system có foundation vững chắc (Tailwind 4 + CVA + cn() utility), visual style ấn tượng với neo-glassmorphism 2026. Tuy nhiên, tồn tại 2 vấn đề lớn: (1) **dual styling paradigm** (Tailwind utility vs raw CSS) tạo inconsistency, (2) **accessibility gaps** nghiêm trọng chưa đạt WCAG 2.2 AA.

---

## II. VISUAL DESIGN — 8.0/10

### 2.1 Color Palette ✅ Tốt

**Primary Palette (index.css @theme):**
```
Primary:     #10b981 (Emerald 500) — Brand color chính
Secondary:   #f4f4f5 (Zinc 100)
Destructive: #ef4444 (Red 500)
Background:  #fcfcfd (Near white)
Foreground:  #09090b (Near black)
```

**Strengths:**
- Emerald 500 (#10b981) làm primary → truyền cảm hứng "giáo dục", "tăng trưởng" — phù hợp education platform
- Semantic color tokens qua CSS custom properties (`--color-primary`, `--color-destructive`, etc.)
- Gradient usage tinh tế: `heading-gradient` (emerald → teal), `glass-card` (white gradients)
- Selection color đồng bộ: `::selection { background: rgba(16,185,129,0.2) }`

**Issues:**

| # | Vấn đề | Severity | Chi tiết |
|---|--------|----------|----------|
| C1 | Hard-coded colors tràn lan | 🟡 Medium | Toast.css dùng `#10b981`, `#ef4444` trực tiếp thay vì token. ConfirmDialog.css dùng `#e74c3c`, `#3498db` (palette hoàn toàn khác!) — không reference CSS variables |
| C2 | Green inconsistency | 🟡 Medium | Header dùng `emerald-600`, Footer dùng `green-700`, FloatingCTA dùng `green-600`, TestimonialsSection dùng `green-500/600` — 3 shade families (emerald, green, teal) |
| C3 | Teacher design system dùng palette riêng | 🟡 Medium | `TeacherDesignSystem.css` tự define `--teacher-primary: #10b981` → duplicated tokens, không inherit từ global |
| C4 | Thiếu dark mode | 🟠 Low | Không có dark mode support dù Tailwind 4 hỗ trợ native. Coursera/edX đều có dark mode. |

**Recommendation:**
- Thống nhất tất cả colors về CSS custom properties ở `index.css` @theme
- Replace tất cả hard-coded hex trong CSS files bằng `var(--color-*)` hoặc Tailwind classes
- Quyết định dùng `emerald` hay `green` — hiện đang mix cả hai
- Thêm dark mode theme block cho Tailwind 4

### 2.2 Typography Scale ✅ Tốt

```
Body:     Inter (sans-serif) — readable, professional
Headings: Outfit (sans-serif) — geometric, modern, distinct from body
```

**Strengths:**
- Dual font family strategy chuẩn (body vs heading) — tốt hơn single font
- `letter-spacing: -0.02em` cho headings → tight tracking, premium feel
- Font antialiasing enabled globally
- Google Fonts import at top → đúng thứ tự

**Issues:**

| # | Vấn đề | Severity |
|---|--------|----------|
| T1 | Không có typography scale definition | 🟡 Medium |
| T2 | Heading sizes inconsistent | 🟡 Medium |

- HomePage hero: `text-5xl lg:text-7xl` → jumps quá lớn
- Card component: `text-2xl` cho CardTitle — quá to cho card context
- Dialog: `text-lg` cho DialogTitle — nhỏ hơn CardTitle (không logic)
- TeacherDesignSystem.css tự define typography scale riêng (`--font-size-*`)
- Thiếu global typography scale (h1→h6 sizes) ở index.css

**Recommendation:**
- Tạo typography scale trong @theme: `--font-size-display`, `--font-size-h1`..`--font-size-body-sm`
- Áp dụng consistent heading sizes qua utility classes

### 2.3 Spacing System ✅ Khá tốt

- Tailwind spacing (4px base) → đủ cho hầu hết use cases
- Card padding: `p-6` (24px) consistent
- Card header: `space-y-1.5` (6px gap)
- TeacherDesignSystem.css define riêng: `--spacing-xs: 4px` đến `--spacing-3xl: 48px`

**Issues:**
- Sidebar width: `w-[280px]` hard-coded magic number → nên là CSS variable
- DashboardSidebar.css override Tailwind với `!important` — code smell
- Mobile sidebar widths: 80vw / 320px max — tốt, nhưng dùng `!important` 17 lần

### 2.4 Icon Usage ✅ Tốt

- **Lucide React** dùng nhất quán across toàn bộ codebase — ✅ excellent
- Icon sizes: `size={14-32}` — hợp lý theo context
- strokeWidth varies (1.5-2.5) → tạo visual hierarchy cho active states
- Decorative icons có `aria-hidden="true"` ở một số nơi (ArrowUpRight in HomePage)

**Issues:**
- StatusBadge.jsx + NotificationBell.jsx + Toast.jsx dùng **emoji** thay lucide icons (✅❌⚠️ℹ️📚🔔) → inconsistent với phần còn lại dùng lucide
- Emoji rendering khác nhau trên mỗi OS → không kiểm soát được visual
- **Recommendation:** Replace tất cả emoji trong StatusBadge, Toast, NotificationBell bằng lucide-react icons

### 2.5 Animation/Motion Design ✅ Rất tốt

**Stack:**
- **GSAP 3.14** + ScrollTrigger → hero animations, 3D tilt effect, parallax
- **Framer Motion 12** → declared in package.json (chưa thấy import nhiều)
- **CSS animations:** `animate-blob`, `shimmer`, `fadeInUp`, `modalSlideUp`, `gradientFlow`
- **Tailwind animate utilities:** `animate-in`, `fade-in`, `slide-in-from-bottom`

**Strengths:**
- HomePage GSAP timeline: sequential stagger hero → stats → services → elegant
- 3D tilt effect trên hero images: advanced interaction
- Glass card hover: `translateY(-8px) scale(1.01)` → Apple-style depth
- Toast slide-in animation: `translateX(100%) → 0` — smooth
- Modal zoom: `zoom-in-95 slide-in-from-bottom-2` — polished

**Issues:**

| # | Vấn đề | Severity |
|---|--------|----------|
| A1 | Thiếu `prefers-reduced-motion` | 🔴 High |
| A2 | GSAP + Framer Motion cùng tồn tại | 🟡 Medium |
| A3 | `animate-pulse` lạm dụng | 🟡 Medium |

- **A1**: Không có media query `@media (prefers-reduced-motion: reduce)` — WCAG 2.3.3 violation
- **A2**: Package có cả gsap + framer-motion → 2 animation libraries = bundle bloat. Nên pick 1.
- **A3**: `animate-pulse` dùng trên online indicators (sidebar, bottom nav, AI button) — 5+ pulse animations đồng thời gây visual noise

### 2.6 Brand Identity ✅ Mạnh

- Logo fallback chain: PNG → JPG → SVG → inline SVG — robust
- Brand name "VanTrang**Edu**" — green highlight trên "Edu" consistent qua sidebar, header, mobile
- Gradient heading treatment (`heading-gradient`) — distinctive
- Glass/Bento visual language → modern, distinguishable
- Footer có company registration info → credible Vietnamese edu brand

---

## III. COMPONENT LIBRARY — 7.0/10

### 3.1 Component API Consistency

**CVA-based components (GOOD pattern):**
- `Button` — `variant` + `size` props via CVA ✅
- `Badge` — `variant` prop via CVA ✅
- `Label` — CVA (though only 1 variant) ✅

**Non-CVA components (INCONSISTENT):**
- `LoadingSpinner` — `size` prop uses string map (`small/medium/large`) → CSS class based
- `EmptyState` — `icon` prop uses emoji string
- `StatusBadge` — `status` + `type` props → plain CSS classes
- `ConfirmDialog` — `type` prop → plain CSS
- `Toast` — `type` prop → plain CSS (`toast-${type}`)
- `DateTimeInput` — inline styles mixed with classes
- `Select` — SVG embedded in Tailwind URL → monolithic className

**Pattern Inconsistencies:**

| Pattern | Components Using | Components NOT Using |
|---------|-----------------|---------------------|
| `forwardRef` | Button, Card, Input, Badge, Label, Select, Textarea, Progress | Toast, Dialog, Tabs, all others |
| `displayName` | Button, Card, Input, Badge, Label, Select, Textarea, Progress | All others |
| `CVA variants` | Button, Badge, Label | All others |
| `PropTypes` | SkeletonLoader, LazyImage, FloatingCTA, CategoryFilter, CCCDUploader | Button, Card, Dialog, Toast, etc. |
| `cn()` utility | Button, Card, Input, Dialog, ScrollToTop, DashboardSidebar | Toast, ConfirmDialog, Breadcrumb, LoadingSpinner |
| Named export | Button, Card, Badge, Label, Input, Tabs | Toast (default), LoadingSpinner (default), EmptyState (default) |

**Export pattern inconsistency:** Mix giữa `export { Component }` (named) và `export default Component` → confusing imports.

### 3.2 Variant System

**Button variants (6):** default, destructive, outline, secondary, ghost, link ✅ Complete
**Button sizes (4):** default, sm, lg, icon ✅ Good
**Badge variants (4):** default, secondary, destructive, outline ✅ Standard

**Missing variants cần thêm:**
- Button: `warning`, `success` → đang phải dùng className override
- Badge: `success`, `warning`, `info` → StatusBadge tự implement riêng
- Card: Không có variant system → mọi styling qua className
- Input: Không có `error`/`success` state variant
- Dialog: Không có size variant (`sm`, `md`, `lg`, `xl`)

### 3.3 Component States

| Component | Loading | Empty | Error | Disabled | Skeleton |
|-----------|---------|-------|-------|----------|----------|
| Button | ❌ | N/A | ❌ | ✅ | ❌ |
| Input | ❌ | N/A | ❌ | ✅ | ❌ |
| Card | ❌ | ❌ | ❌ | ❌ | ✅ (SkeletonCard) |
| Dialog | ❌ | ❌ | ❌ | N/A | ❌ |
| Select | ❌ | ❌ | ❌ | ✅ | ❌ |
| Toast | N/A | N/A | ✅ | N/A | N/A |
| Tabs | ❌ | ❌ | ❌ | ✅ | ❌ |
| NotificationBell | ✅ | ✅ | ❌ | N/A | ❌ |

**Critical gap:** Button không có loading state (spinner) → nhiều forms dùng `disabled={uploading}` nhưng không có visual loading feedback.

### 3.4 Compound Components

**Good compound patterns:**
- `Card` → `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter` ✅
- `Dialog` → `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter`, `DialogClose` ✅
- `Tabs` → `TabsList`, `TabsTrigger`, `TabsContent` ✅

**Missing compound patterns:**
- Form → FormField, FormLabel, FormMessage, FormDescription (react-hook-form integration)
- Toast → ToastTitle, ToastDescription, ToastAction
- Select → SelectTrigger, SelectContent, SelectItem (current Select is basic `<select>`)

---

## IV. LAYOUT SYSTEM — 8.5/10

### 4.1 Grid System

**Container:** `container mx-auto px-4` — Tailwind default container ✅
**Grid patterns:**
- HomePage hero: `grid lg:grid-cols-2 gap-12`
- Stats: `grid grid-cols-2 lg:grid-cols-4 gap-6`
- Bento services: `grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[250px]`
- Footer: `grid grid-cols-1 md:grid-cols-4 gap-8`
- Testimonials: `grid md:grid-cols-5` (2:3 split)

→ Grid usage varied và appropriate per context. ✅

### 4.2 Dashboard Layout Architecture

```
┌─────────────────────────────────────────────────┐
│ DESKTOP                                          │
│ ┌──────────┬────────────────────────────────────┐│
│ │ Sidebar  │ Main Content                       ││
│ │ 280px    │ flex-1 (p-4 md:p-8)               ││
│ │ fixed    │ max-w-7xl mx-auto (admin)          ││
│ │          │                                    ││
│ └──────────┴────────────────────────────────────┘│
│ MOBILE                                           │
│ ┌──────────────────────────────────────────────┐ │
│ │ Compact Header (h-14/h-16)                   │ │
│ ├──────────────────────────────────────────────┤ │
│ │ Content (full width)                         │ │
│ │                                              │ │
│ ├──────────────────────────────────────────────┤ │
│ │ Bottom Nav (h-[70px]) — Student only         │ │
│ └──────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

**Strengths:**
- Sidebar fixed 280px → `md:pl-[280px]` offset — chuẩn
- Mobile sidebar: overlay pattern (80vw / max 320px) — Material Design standard
- iOS safe area handling: `env(safe-area-inset-*)` — ✅
- `100dvh` usage cho mobile menu — modern approach
- Responsive branching: `AdminDashboard` → `AdminDashboardDesktop` / `AdminDashboardMobile`
- Bottom nav cho student mobile — app-like UX, rất tốt

**Issues:**

| # | Vấn đề | Severity |
|---|--------|----------|
| L1 | 3 sidebar implementations | 🟡 Medium |
| L2 | Admin content không có max-width ở mobile | 🟡 Medium |
| L3 | CSS `!important` abuse in sidebar | 🟡 Medium |

- **L1**: `DashboardSidebar` (student), `AdminSidebar` (admin), `AdminMobileLayout` drawer — 3 different sidebar implementations. Should extract shared Sidebar primitive.
- **L2**: Admin `max-w-7xl` only applies on desktop — mobile content fills full width which is correct, nhưng padding inconsistent (`p-4 md:p-8` vs `0.75rem !important` CSS override)
- **L3**: DashboardSidebar.css has 17 `!important` declarations → signals Tailwind class conflicts

### 4.3 Public Layout

```
ModernPublicLayout
├── ModernHeader (sticky, glass-panel, top bar + nav)
├── <main> (flex-1, w-full)
├── ModernFooter (4-column grid)
└── ScrollToTopButton
```

Simple, clean, effective. ✅

---

## V. ACCESSIBILITY (WCAG 2.2) — 5.5/10 ⚠️

### 5.1 Color Contrast

| Element | Foreground | Background | Ratio | WCAG AA |
|---------|-----------|------------|-------|---------|
| Top bar text | white | emerald-600 (#059669) | ~4.6:1 | ✅ Pass |
| Muted text | #71717a | #fcfcfd | ~4.9:1 | ✅ Pass |
| Primary button text | white | #10b981 | **3.2:1** | ❌ Fail |
| Ghost button text | varies | transparent | — | ⚠️ Depends |
| Slate-500 on white | #64748b | white | ~4.6:1 | ✅ Pass |
| Slate-400 on white | #94a3b8 | white | **3.0:1** | ❌ Fail |
| Toast warning text | white | #f59e0b | **2.1:1** | ❌ Fail |

**Critical:** Primary button (emerald-500 on white text) fails WCAG AA. Need to darken to emerald-600 (#059669) for 4.5:1 ratio. Toast warning (amber-500) also fails badly.

### 5.2 Focus Management

**Good:**
- Button: `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2` ✅
- Input: Same focus ring pattern ✅
- DialogClose: `focus:ring-2` ✅
- DateInput: calendar button `tabIndex={0}` ✅ (có comment "fix #11")

**Bad:**
- Dialog backdrop click closes → no focus trap inside dialog ❌
- Mobile menu: no focus trap ❌
- Sidebar: no focus management when opening/closing ❌
- NotificationBell dropdown: no focus trap, no arrow key navigation ❌
- CategoryFilter dropdown: no focus trap ❌
- AI Assistant chat: no focus management on open ❌
- Tab navigation in Tabs component: no arrow key support ❌

### 5.3 Screen Reader Support

**Good:**
- `aria-label` on mobile menu toggle, notification bell, scroll-to-top ✅
- `aria-current="page"` on active nav links ✅
- `aria-expanded` on mobile menu button ✅
- `aria-controls` connecting menu button to menu panel ✅
- `aria-selected` on TabsTrigger ✅
- `sr-only` on DialogClose "Close" text ✅
- `aria-hidden` on decorative elements (blob backgrounds, icons) — partial ✅
- `aria-label="Menu điều hướng"` on sidebar aside ✅
- ExternalLink `<span class="sr-only">(mở tab mới)</span>` ✅

**Bad:**
- Dialog missing `role="dialog"` and `aria-modal="true"` ❌
- Dialog missing `aria-labelledby` pointing to DialogTitle ❌
- Toast missing `role="alert"` or `role="status"` ❌
- Tabs missing `role="tablist"` on TabsList ❌ (only TabsTrigger has `role="tab"`)
- TabsContent missing `role="tabpanel"` attribute properly linked ❌
- NotificationBell dropdown: no `role="menu"`, items no `role="menuitem"` ❌
- ConfirmDialog: no ARIA roles ❌
- LoadingSpinner: no `role="status"` or `aria-live` ❌
- Progress: no `role="progressbar"`, no `aria-valuenow/min/max` ❌

### 5.4 Keyboard Navigation

| Component | Tab | Enter | Escape | Arrows |
|-----------|-----|-------|--------|--------|
| Button | ✅ | ✅ | N/A | N/A |
| Dialog | ❌ No trap | ❌ No close | ❌ No close | N/A |
| Tabs | ✅ | ✅ | N/A | ❌ No arrows |
| NotificationBell | ✅ | ✅ | ❌ | ❌ |
| CategoryFilter | ✅ | ✅ | ❌ | ❌ |
| AI Assistant | ✅ | ✅ (send) | ❌ No close | N/A |
| Mobile Menu | ❌ | ❌ | ❌ | ❌ |

**Critical gaps:** Dialogs and dropdowns cannot be closed with Escape key. No focus trapping in modals.

### 5.5 Motion Preferences

- **prefers-reduced-motion: Không được implement ở bất kỳ đâu** ❌
- GSAP animations, CSS animations, animate-pulse, glass-card hover transforms — all play regardless
- This is a WCAG 2.3.3 (AAA) / 2.3.1 (A) concern

---

## VI. INTERACTION DESIGN — 7.5/10

### 6.1 Micro-interactions ✅ Tốt

- Button hover: `hover:scale-105 active:scale-95` → tactile feel
- Glass card hover: translateY + scale + shadow change → depth perception
- Logo: `hover:scale-105 transition-transform`
- Sidebar nav: active item has pill indicator + `shadow-md shadow-emerald-500/20` glow
- AI Assistant toggle: `hover:scale-110` + gradient reveal on hover
- Bottom nav: `active:scale-95` + top indicator bar animation

### 6.2 Feedback Mechanisms

**Good:**
- Toast system (success/error/warning/info) with auto-dismiss ✅
- CCCDUploader: upload progress → success badge → error badge ✅
- LoadingSpinner for page-level loading ✅
- SkeletonLoader cho card, text, image, avatar, button, news card ✅
- Form validation via react-hook-form + zod ✅
- NotificationBell polling (30s interval) ✅

**Missing:**
- No optimistic UI patterns (mutation feedback slow)
- No toast for API errors at global level
- No progress indicator for multi-step flows
- Button loading state not built into Button component
- No inline validation (only on submit)

### 6.3 Form UX Patterns

**DateInput:** Clever dual-input pattern (visible dd/mm/yyyy + hidden native picker) — ✅ good Vietnamese UX
**DateTimeInput:** Similar approach for datetime — ✅
**CCCDUploader:** Camera-first with editor → robust upload flow — ✅ excellent mobile UX
**Select:** Native `<select>` with custom chevron SVG — ✅ simple, accessible

**Missing:**
- No auto-save / draft saving
- No form progress indicator for long forms
- No character count for textarea
- No search/filter within Select (no combobox pattern)

### 6.4 Navigation Patterns

- **Public:** Header nav with active page highlighting → standard, clear
- **Student dashboard:** Sidebar (desktop) + Bottom nav (mobile) → app-like, excellent
- **Admin dashboard:** Sidebar with grouped menu → organized
- **Teacher dashboard:** Dedicated design system with own patterns
- **Breadcrumb component exists** but not widely used
- **Language switcher** (VN/EN) in top bar → basic but functional

### 6.5 Onboarding Flow

- **No onboarding flow detected** ❌
- Coursera has guided first-time user experience
- edX has welcome walkthrough
- **Recommendation:** Add step-by-step wizard for first-time student registration

---

## VII. SO SÁNH VỚI BENCHMARK PLATFORMS

### 7.1 vs Coursera

| Aspect | VanTrangEdu | Coursera | Gap |
|--------|------------|---------|-----|
| Design System | Tailwind + CVA (partial) | Custom design system (mature) | Need token unification |
| Dark Mode | ❌ | ✅ | Missing |
| Accessibility | Partial | WCAG AA compliant | Major gap |
| Animation | GSAP + CSS (rich) | Framer Motion (subtle) | VanTrang more animated |
| Component API | Inconsistent | Strict API contracts | Need standardization |
| Mobile UX | Bottom nav + adaptive | Responsive + PWA | VanTrang good, add PWA |
| i18n | Basic (VN/EN) | Full i18n framework | Need expansion |
| Loading States | Skeleton + Spinner | Skeleton + Placeholder + Shimmer | Similar quality |

### 7.2 vs Canvas LMS

| Aspect | VanTrangEdu | Canvas LMS | Gap |
|--------|------------|-----------|-----|
| Dashboard Layout | Sidebar + content | Sidebar + breadcrumb + content | Need better breadcrumb usage |
| Form UX | Basic validation | Inline validation + auto-save | Need inline validation |
| Data Tables | Per-page custom | Reusable DataTable component | Need shared DataTable |
| Notification | Polling 30s | WebSocket real-time | Should upgrade to WS/SSE |
| Accessibility | 5.5/10 | 8.5/10 (Instructure focus) | Major gap |

### 7.3 vs edX

| Aspect | VanTrangEdu | edX | Gap |
|--------|------------|-----|-----|
| Visual Polish | Glassmorphism (modern) | Paragon design system (clean) | VanTrang more trendy |
| Component Reuse | Moderate | High (Paragon library) | Need more shared components |
| Error Handling | Toast-based | Inline + Banner + Toast | Need layered error handling |
| Performance | Code-split (lazy) | SSR + Code-split | Consider SSR/SSG |

---

## VIII. TOP PRIORITY ISSUES

### 🔴 Critical (Fix Immediately)

1. **Dialog missing accessibility roles** — Add `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, focus trap, Escape key handler
2. **Primary button contrast fails WCAG AA** — Darken primary from `#10b981` to `#059669` (emerald-600) cho interactive elements
3. **Toast missing `role="alert"`** — Screen readers won't announce toast notifications
4. **No `prefers-reduced-motion`** — Add global media query to disable/reduce animations
5. **Progress bar missing ARIA** — Add `role="progressbar"`, `aria-valuenow`, `aria-valuemin="0"`, `aria-valuemax="100"`

### 🟡 High (Fix This Sprint)

6. **Dual styling paradigm** — Migrate ConfirmDialog.css, Toast.css, Breadcrumb.css, NotificationBell.css to Tailwind classes. Eliminate raw CSS for UI components.
7. **Color inconsistency** — Unify `green-*` vs `emerald-*` across entire codebase. Pick one. (Recommend `emerald`)
8. **StatusBadge + Toast emoji → lucide icons** — Replace emoji icons with lucide-react for cross-platform consistency
9. **Button loading state** — Add `loading` prop to Button with spinner animation
10. **Export pattern standardization** — All UI components should use named exports + forwardRef + displayName
11. **Focus trap for modals/dialogs** — Implement or use a library like `@radix-ui/react-focus-scope`
12. **Teacher design system CSS variables** — Merge into global theme or import from shared tokens

### 🟢 Medium (Next Sprint)

13. **Dark mode support** — Leverage Tailwind 4 `@dark` theme block
14. **DataTable shared component** — Create reusable table with sorting, filtering, pagination
15. **Form component system** — Build FormField, FormLabel, FormMessage wrapper for react-hook-form
16. **Sidebar component extraction** — Create shared Sidebar primitive used by Student, Admin, Teacher
17. **Onboarding flow** — First-time user wizard with progress steps
18. **Notification WebSocket** — Replace 30s polling with real-time connection
19. **Combobox/Autocomplete Select** — Upgrade Select for searchable dropdowns

---

## IX. DESIGN TOKEN ARCHITECTURE — Recommended

```css
/* Proposed unified token structure in index.css @theme */

@theme {
  /* === BRAND === */
  --color-brand-50: #ecfdf5;
  --color-brand-100: #d1fae5;
  --color-brand-200: #a7f3d0;
  --color-brand-300: #6ee7b7;
  --color-brand-400: #34d399;
  --color-brand-500: #10b981;  /* Primary */
  --color-brand-600: #059669;  /* Primary Dark — WCAG AA safe */
  --color-brand-700: #047857;
  --color-brand-800: #065f46;
  --color-brand-900: #064e3b;

  /* === SEMANTIC === */
  --color-success: var(--color-brand-500);
  --color-warning: #d97706;  /* Amber 600 — WCAG safe */
  --color-error: #dc2626;    /* Red 600 — WCAG safe */
  --color-info: #2563eb;     /* Blue 600 — WCAG safe */

  /* === SPACING === */
  --spacing-sidebar: 280px;
  --spacing-header: 80px;
  --spacing-bottom-nav: 70px;

  /* === RADIUS === */
  --radius-card: 1rem;
  --radius-button: 0.75rem;
  --radius-input: 0.75rem;
  --radius-badge: 9999px;
  --radius-sidebar-item: 1rem;

  /* === TYPOGRAPHY === */
  --font-sans: 'Inter', sans-serif;
  --font-heading: 'Outfit', sans-serif;
  --font-size-display: clamp(2.5rem, 5vw, 4.5rem);
  --font-size-h1: 2.25rem;
  --font-size-h2: 1.75rem;
  --font-size-h3: 1.25rem;
  --font-size-body: 1rem;
  --font-size-body-sm: 0.875rem;
  --font-size-caption: 0.75rem;

  /* === Z-INDEX === */
  --z-sidebar: 40;
  --z-header: 50;
  --z-dropdown: 60;
  --z-modal-backdrop: 9998;
  --z-modal: 9999;
  --z-toast: 10000;
}
```

---

## X. COMPONENT LIBRARY IMPROVEMENTS — Quick Wins

### 10.1 Button — Add Loading State

```jsx
// Current: no loading support
// Proposed: add loading prop with built-in spinner

const Button = forwardRef(({ loading, children, disabled, ...props }, ref) => (
  <button ref={ref} disabled={disabled || loading} {...props}>
    {loading && <Loader2 className="animate-spin mr-2" size={16} />}
    {children}
  </button>
));
```

### 10.2 Dialog — Add ARIA Compliance

```
Missing: role="dialog", aria-modal="true", aria-labelledby, focus trap, Escape handler
```

### 10.3 Toast — Add ARIA

```
Missing: role="alert" (error/warning) or role="status" (success/info), aria-live="polite"
```

### 10.4 Progress — Add ARIA

```
Missing: role="progressbar", aria-valuenow, aria-valuemin="0", aria-valuemax="100", aria-label
```

---

## XI. POSITIVE HIGHLIGHTS 🏆

1. **Neo-glassmorphism execution** — `glass-panel`, `glass-card`, `liquid-shadow` utilities are production-quality, on-trend 2026
2. **Bento Grid layout** — HomePage services grid with asymmetric cards — visually compelling
3. **GSAP ScrollTrigger integration** — Staggered scroll reveals add premium feel
4. **Mobile-first adaptive architecture** — Desktop/Mobile component branching (AdminDashboard, TeacherDashboard) shows maturity
5. **iOS safe area handling** — `env(safe-area-inset-*)` throughout mobile layouts
6. **AI Assistant** — Chatbot with fallback offline mode — forward-thinking feature
7. **CCCDUploader** — Camera overlay + image editor + auto-resize pipeline — sophisticated upload UX
8. **Skeleton loading system** — 6 skeleton variants (Card, Text, Image, Avatar, Button, NewsCard) — thorough
9. **CVA + cn() + tailwind-merge** foundation — right tools chosen for scalable variant system
10. **SEO component** — react-helmet-async + semantic landing pages → good SEO architecture

---

## XII. UNRESOLVED QUESTIONS

1. Có plan nào cho **PWA support** (offline, install prompt) không? Mobile UX đang rất app-like.
2. **Framer Motion** import nhưng chưa thấy sử dụng nhiều — có plan remove để giảm bundle hay sẽ adopt thay GSAP?
3. **react-quill** (rich text editor) — có plan upgrade sang modern alternative (TipTap, Plate.js)?
4. i18n hiện chỉ VN/EN — có plan mở rộng sang ngôn ngữ khác (Chinese, Japanese cho khóa ngoại ngữ)?
5. Testing UI components? Không thấy component-level test files — có vitest setup nhưng chưa rõ coverage.

---

*Report generated by Senior UI/UX Designer Agent — VanTrangEdu Design System Audit 2026-03-04*
