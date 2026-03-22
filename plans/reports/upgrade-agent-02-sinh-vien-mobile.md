# Agent 2: Sinh viên Gen Z — Mobile UX Review

**Persona:** Minh, 20 tuổi, SV ĐH Văn hóa HN, dùng iPhone 13 100%, quen TikTok/Zalo/Shopee
**Ngày review:** 2026-03-04
**Phạm vi:** Toàn bộ student mobile flow (Login → Dashboard → tất cả module mobile)

---

## Tổng điểm: 5.5/10

**Nhận xét chung:** App có design khá sạch sẽ, dùng gradient đẹp. Nhưng từ góc nhìn một người dùng Gen Z quen TikTok/Shopee, app vẫn còn thiếu nhiều thứ quan trọng: không có dark mode, không gesture support, không offline, không pull-to-refresh, form đăng ký dài khiếp, và nhiều chỗ loading không có feedback đàng hoàng.

---

## I. Vấn đề phát hiện

### 🔴 NGHIÊM TRỌNG (Gây rời bỏ app)

#### 1. Không có Pull-to-refresh — Toàn bộ mobile modules
- **File:** Tất cả files trong `pages/student/mobile/`
- **Vấn đề:** Không file nào implement pull-to-refresh. User phải bấm nút RefreshCw nhỏ xíu ở góc phải.
- **So sánh Duolingo:** Pull-to-refresh mượt mà ở mọi màn hình, animation vui nhộn khi kéo xuống
- **So sánh Shopee:** Kéo xuống refresh là chuẩn — ai cũng quen rồi
- **Impact:** Gen Z kéo xuống không thấy gì xảy ra → nghĩ app lag → bỏ

#### 2. Form đăng ký quá dài, UX mobile cực tệ
- **File:** `src/pages/public/StudentRegistration.jsx` (615 dòng)
- **Vấn đề:**
  - Form có ~15 field trải dài trên 1 page duy nhất — scroll mỏi tay
  - 2 bộ date picker dùng 3 dropdown riêng (Ngày/Tháng/Năm) — trên iPhone phải tap 6 lần mới xong ngày sinh + ngày cấp CCCD
  - Upload 3 ảnh (CCCD trước, sau, 3x4) ở cuối form — nếu validation fail ở trên thì phải scroll lên lại
  - Không có progress indicator (step 1/3, 2/3...)
  - Không dùng native `<input type="date">` — lãng phí date picker native của iOS
- **So sánh Duolingo:** Onboarding chia thành từng bước nhỏ, mỗi bước 1-2 field, animation chuyển mượt
- **So sánh Elsa Speak:** Sign up 3 step: Info → Preferences → Done. Simple.
- **Line:** L253-L609

#### 3. Dùng `window.alert()` và `window.confirm()` trên mobile
- **Files:**
  - `MobileExamModule.jsx` L143: `window.confirm('Bắt đầu bài thi?...')`
  - `MobileExamModule.jsx` L153: `alert(err.message)`
  - `MobileExamsModule.jsx` L286-L294: `window.confirm()` + `alert()`
  - `MobilePaymentModule.jsx` L84: `alert('Tính năng thanh toán online đang phát triển')`
- **Vấn đề:** Native alert/confirm trên iOS Safari trông rất xấu, phá vỡ trải nghiệm. Gen Z sẽ thấy app "cũ kỹ" ngay
- **Giải pháp:** Dùng custom bottom sheet confirm dialog đẹp như Shopee

#### 4. Không có Error Retry / Offline graceful handling
- **Files:** Tất cả mobile modules
- **Vấn đề:** Khi fetch API fail, chỉ `console.error` rồi set data = []. Không có:
  - Retry button khi mất mạng
  - Cached data hiển thị khi offline
  - Toast/banner báo "Đang offline"
- **So sánh Duolingo:** Có offline mode, lesson đã download vẫn học được, thông báo rõ ràng khi mất kết nối
- **Impact:** SV dùng 4G yếu trong giảng đường → trắng xóa → nghĩ app hỏng

#### 5. Không có PWA / Service Worker
- **File:** Không tìm thấy `manifest.json`, không có service worker registration
- **Vấn đề:** App không install được lên home screen, không cache offline, không push notification
- **So sánh Duolingo/Elsa:** Có native app riêng, push notification nhắc học hàng ngày
- **Impact:** Không có notification nhắc lịch thi → SV quên → miss deadline

### 🟡 TRUNG BÌNH (Gây khó chịu)

#### 6. Bottom Nav chỉ 5 items — thiếu quan trọng
- **File:** `src/components/student/StudentBottomNav.jsx` L8-L14
- **Items hiện tại:** Lịch thi | Lớp học | Học tập (external link!) | Lịch học | Học phí
- **Vấn đề:**
  - "Học tập" link ra ngoài `vantrangexam.pages.dev` — mở browser mới, user mất context
  - Không có tab "Profile/Tôi" — phải dùng hamburger menu
  - Không có tab "Thông báo" — notification bell chỉ có trong `StudentMobileLayout.jsx` nhưng KHÔNG dùng trong `StudentDashboard.jsx`
  - Icon `GraduationCap` cho "Học tập" dễ nhầm với "Lịch thi" (CalendarCheck)
- **So sánh Duolingo:** 5 tabs rõ ràng: Home | Khám phá | Bảng xếp hạng | Shop | Profile
- **So sánh Shopee:** Tab "Tôi" luôn ở cuối, có notification badge

#### 7. Touch targets nhiều chỗ quá nhỏ
- **Files + Lines:**
  - `StudentBottomNav.jsx` L52: Label text `text-[10px]` — quá nhỏ dù icon area đủ
  - `MobileExamsModule.jsx` L66: Badge `text-[10px]` trong filter pills
  - `MobileScheduleModule.jsx` L372: Nút chuyển tháng `p-1.5` ≈ 30px — dưới chuẩn 48px
  - `MobileCertificatesModule.jsx` L50-55: Nút Download/Share `w-9 h-9` = 36px — dưới chuẩn 44px (Apple HIG)
  - `MobileDocumentsModule.jsx` L61: Nút Download `w-9 h-9` = 36px
  - `StudentDashboard.jsx` L62-68: Hamburger button `p-2` — khoảng 37px
  - `StudentDashboard.jsx` L78-84: Logout button `w-9 h-9` = 36px
- **Chuẩn:** Apple HIG yêu cầu minimum 44×44pt, Material Design 48×48dp
- **Impact:** Ngón tay bấm trượt, phải bấm 2-3 lần mới trúng → bực mình

#### 8. Không có Dark Mode
- **Phân tích:** Grep toàn bộ `src/` không tìm thấy dark mode implementation nào cho student views
- **Vấn đề:** SV học tối, nằm trên giường dùng điện thoại → màn trắng chói mắt
- **So sánh:** Duolingo, Elsa, TikTok, Zalo đều có dark mode
- **Impact:** UX ban đêm rất tệ

#### 9. Skeleton loading chỉ dùng basic pulse — không có shimmer effect đẹp
- **Files:** Tất cả mobile modules đều dùng `animate-pulse` cơ bản
- **Vấn đề:** Pulse animation trông "nhạt", không professional
- **So sánh Shopee/TikTok:** Dùng shimmer gradient animation, trông mượt hơn nhiều
- **Nên dùng:** CSS shimmer gradient sweep thay vì chỉ opacity pulse

#### 10. Calendar Schedule trên mobile quá chật
- **File:** `MobileScheduleModule.jsx` L410-471
- **Vấn đề:**
  - Grid 7 cột trên iPhone SE/13 Mini → mỗi ô rất nhỏ (~50px)
  - Text `text-[9px]` và `text-[10px]` — gần như không đọc được
  - Event card trong ô lịch quá bé, phải nheo mắt
  - Tên phòng bị cắt: `evt.room.substring(0, 10) + '...'` (L459)
- **So sánh:** Google Calendar mobile dùng list view (Agenda) mặc định, không ép calendar grid
- **Đề xuất:** Thêm Agenda view (danh sách theo ngày) làm default, calendar grid là secondary

#### 11. Encoding bị lỗi trong MobileScheduleModule
- **File:** `MobileScheduleModule.jsx`
- **Lines:**
  - L397: `Äang táº£i lá»‹ch há»c...` (phải là "Đang tải lịch học...")
  - L510: `Äang táº£i thÃ´ng tin lá»›p...`
  - L594-L598: Tất cả status labels bị mojibake
  - L656-L676: Labels trong ClassDetailSheet bị lỗi encoding
- **Impact:** User thấy ký tự lạ → mất tin tưởng vào app

#### 12. Không có gesture navigation
- **Phân tích:** Grep `swipe|gesture|haptic` — chỉ tìm thấy trong ExamSecurity (exam lockdown), không phải UX gesture
- **Thiếu:**
  - Swipe right để back (iOS standard gesture)
  - Swipe giữa các tab
  - Long press cho context menu
  - Haptic feedback khi tap
- **So sánh Duolingo:** Swipe giữa lessons, haptic feedback khi trả lời đúng/sai

#### 13. Login UX mobile chưa optimal
- **File:** `src/pages/public/UnifiedLogin.jsx`
- **Vấn đề:**
  - Field CCCD không có `inputMode="numeric"` — iPhone hiện keyboard full thay vì numpad (L200-207)
  - Field SĐT có `type="tel"` (tốt) nhưng CCCD thì không
  - Không có biometric login (Face ID / fingerprint)
  - Không có "Remember me" / auto-login
  - Hero section left-side ẩn hoàn toàn trên mobile (`hidden lg:flex`) — ok, nhưng mobile chỉ thấy form trơn, không có branding
- **So sánh Shopee:** Mở app → auto-login, có Face ID option
- **Line:** L200 (`Input` cho CCCD thiếu `inputMode="numeric"`)

### 🟢 NHẸ (Nice-to-have)

#### 14. Bottom sheet không có drag-to-dismiss
- **Files:** `MobileCertificatesModule.jsx`, `MobileExamsModule.jsx`, `MobilePaymentModule.jsx`, `MobileScheduleModule.jsx`
- **Vấn đề:** Bottom sheet chỉ dismiss bằng click overlay hoặc nút X. Không có handle bar, không kéo xuống được
- **So sánh:** iOS Maps, Shopee đều có drag handle + swipe down to dismiss
- **Đề xuất:** Thêm drag handle bar 40px ở top, swipe down gesture

#### 15. Không có animation transition giữa các trang
- **File:** `StudentDashboard.jsx` L88 — render `<ActiveModule>` trực tiếp, không có page transition
- **So sánh Duolingo:** Fade/slide transition giữa các screens
- **Impact:** Chuyển trang cảm giác "giật" thay vì "mượt"

#### 16. Không có Empty State hấp dẫn với illustration
- **Files:** Tất cả mobile modules đều có empty state nhưng chỉ là icon + text
- **So sánh Duolingo:** Empty states có illustration hoạt hình cute, motivational text
- **Đề xuất:** Thêm Lottie animation hoặc SVG illustration cho empty states

#### 17. MobileClassesModule quá lớn
- **File:** `MobileClassesModule.jsx` — 69.5KB, khoảng 1500+ dòng
- **Vấn đề:** 1 file chứa tất cả: tabs, class cards, class detail sheet, video player, registration flow. Khó maintain.
- **Đề xuất:** Tách thành sub-modules: `ClassCard.jsx`, `ClassDetailSheet.jsx`, `ClassRegistration.jsx`, `ClassVideoPlayer.jsx`

#### 18. Thiếu notification badge trên Bottom Nav
- **File:** `StudentBottomNav.jsx`
- **Vấn đề:** Không có đếm unread notifications, không có badge đỏ
- **So sánh:** Shopee có số thông báo chưa đọc trên icon, Zalo có số tin nhắn

---

## II. So sánh với Duolingo / Elsa Speak

| Tiêu chí | VanTrangEdu | Duolingo | Elsa Speak |
|---|---|---|---|
| **Onboarding** | Form 15 field 1 trang, 3 ảnh upload | 5 bước gamified, mỗi bước 1-2 câu hỏi | 3 bước: profile → test → kết quả |
| **Dark Mode** | ❌ Không có | ✅ Có, tự chuyển | ✅ Có |
| **Pull-to-refresh** | ❌ Không có | ✅ Mượt + animation | ✅ Có |
| **Offline** | ❌ Mất mạng = trắng | ✅ Download lesson offline | ✅ Một số bài offline |
| **Push Notification** | ❌ Không có (no PWA) | ✅ Nhắc học mỗi ngày | ✅ Nhắc practice |
| **Gesture** | ❌ Không swipe/drag | ✅ Swipe, haptic feedback | ✅ Swipe giữa bài |
| **Gamification** | ❌ Không | ✅ Streak, XP, leaderboard | ✅ Score, stars |
| **Bottom Nav** | 5 items, 1 external link | 5 items clear | 4 items clear |
| **Loading UX** | Basic pulse skeleton | Shimmer + progress bar | Shimmer + Lottie |
| **Transition** | ❌ Hard cut | ✅ Slide/fade smooth | ✅ Smooth |
| **Touch target** | Nhiều chỗ <44px | ✅ Đều ≥44px | ✅ Đều ≥44px |
| **Empty state** | Icon + text nhạt | Illustration + animation | Illustration + CTA |
| **Biometric login** | ❌ | ✅ (native app) | ✅ (native app) |
| **Alert dialogs** | ❌ window.alert() | ✅ Custom modal đẹp | ✅ Custom modal |

---

## III. Đề xuất nâng cấp cụ thể (file + line)

### Ưu tiên CAO (nên làm ngay)

| # | Đề xuất | File | Line/Area | Effort |
|---|---|---|---|---|
| 1 | **Thêm pull-to-refresh** cho tất cả mobile modules | Tất cả `mobile/*.jsx` | Wrap main content trong pull-to-refresh component | 2-3h |
| 2 | **Tách form đăng ký thành multi-step wizard** (3 bước: Info → CCCD → Upload) | `StudentRegistration.jsx` | L253-L609 | 4-6h |
| 3 | **Thay window.alert/confirm bằng custom modal** | `MobileExamModule.jsx`, `MobileExamsModule.jsx`, `MobilePaymentModule.jsx` | L143, L153, L286, L294, L84 | 2h |
| 4 | **Thêm `inputMode="numeric"` cho CCCD input** | `UnifiedLogin.jsx` | L200 | 5min |
| 5 | **Fix encoding lỗi trong MobileScheduleModule** | `MobileScheduleModule.jsx` | L397, L510, L594-L598, L656-L676 | 30min |
| 6 | **Thêm notification + profile tab vào Bottom Nav** | `StudentBottomNav.jsx` | L8-L14 | 1-2h |
| 7 | **Tăng touch target lên ≥44px** cho tất cả buttons | Nhiều files | Xem section 7 ở trên | 1-2h |
| 8 | **Thêm error retry UI khi API fail** | Tất cả mobile modules | Mỗi fetchXxx() function | 2-3h |

### Ưu tiên TRUNG BÌNH

| # | Đề xuất | File | Line/Area | Effort |
|---|---|---|---|---|
| 9 | **Implement Dark Mode** | Global CSS + Tailwind config | Toàn bộ | 1-2 ngày |
| 10 | **Thêm Agenda view cho Schedule** (list mặc định, grid phụ) | `MobileScheduleModule.jsx` | L392-L491 | 3-4h |
| 11 | **Thêm drag-to-dismiss cho bottom sheets** | Tất cả DetailSheet components | Bottom sheet wrappers | 2-3h |
| 12 | **Thêm page transition animations** | `StudentDashboard.jsx` | L88 | 1-2h |
| 13 | **Mở "Học tập" in-app thay vì external link** | `StudentBottomNav.jsx` | L11 | 4-8h |
| 14 | **Tách MobileClassesModule thành sub-modules** | `MobileClassesModule.jsx` | Toàn file ~1500 dòng | 2-3h |

### Ưu tiên THẤP (nice-to-have)

| # | Đề xuất | File | Line/Area | Effort |
|---|---|---|---|---|
| 15 | **PWA: thêm manifest.json + service worker** | Root project | `public/manifest.json`, `sw.js` | 1 ngày |
| 16 | **Shimmer loading thay pulse** | Tất cả skeleton components | CSS animation | 1-2h |
| 17 | **Lottie illustrations cho empty states** | Tất cả mobile modules | Empty state sections | 2-3h |
| 18 | **Remember me / auto-login** | `UnifiedLogin.jsx` | Login flow | 2h |
| 19 | **Haptic feedback** (navigator.vibrate) | Bottom nav, buttons | Tap handlers | 1h |
| 20 | **Gamification elements** (streak, progress bar) | New component | Dashboard | 1-2 ngày |

---

## IV. Tóm tắt nhanh cho Dev

```
PHẢI LÀM NGAY:
├── Pull-to-refresh → npm i react-pull-to-refresh hoặc custom hook
├── inputMode="numeric" cho CCCD field
├── Fix encoding MobileScheduleModule.jsx (save file as UTF-8)
├── Thay window.alert() → custom confirm dialog component
├── Touch targets ≥ 44px (w-11 h-11 thay vì w-9 h-9)
└── Multi-step registration wizard

NÊN LÀM SỚM:
├── Dark mode (Tailwind dark: variant)
├── Bottom nav: thêm Thông báo + Profile, bỏ external link
├── Agenda view cho Schedule
├── Error retry UI
└── Page transitions (framer-motion đã install rồi!)

BONUS:
├── PWA manifest + service worker
├── Haptic feedback
└── Gamification
```

---

## V. Unresolved Questions

1. **"Học tập" tab link external** (`vantrangexam.pages.dev`) — đây là intent hay bug? Nếu intent thì nên dùng WebView in-app thay vì mở Safari
2. **StudentMobileLayout.jsx** có code Bell notification nhưng **StudentDashboard.jsx** không dùng layout này — có 2 layout paths khác nhau, cái nào là chính?
3. **MobileClassesModule.jsx** 69.5KB — có plan refactor không? File này sẽ càng phình to khi thêm tính năng
4. **Biometric login** — có kế hoạch chuyển sang native app (React Native) không? PWA biometric rất hạn chế
5. **Payment button** hiện chỉ `alert('Tính năng đang phát triển')` — timeline tích hợp thanh toán online?
