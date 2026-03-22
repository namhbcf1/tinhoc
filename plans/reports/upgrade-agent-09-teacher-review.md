# Agent 09 — Teacher Portal UX Review (Cô Hương, 50 tuổi)

**Persona:** Cô Hương, 50 tuổi, giáo viên tiếng Anh. Chỉ biết dùng Zalo, Facebook, Word. Cần hệ thống ĐƠN GIẢN để: điểm danh, xem lịch, gửi tin nhắn cho sinh viên, xem điểm thi.

**Date:** 2026-03-04
**Files reviewed:** 28 files (all teacher desktop, mobile, layout, login, API, CSS)

---

## TÓM TẮT EXECUTIVE

| Hạng mục | Điểm (1-10) | Ghi chú |
|---|---|---|
| Đăng nhập | 5/10 | Thiếu "Ghi nhớ đăng nhập", không có quên mật khẩu, không có hướng dẫn lần đầu |
| Dashboard tổng quan | 4/10 | Không có overview nhanh, vào thẳng tab Lịch dạy, thiếu "Hôm nay bạn có gì" |
| Điểm danh | 6/10 | Quy trình 3-4 click, thiếu "điểm danh nhanh 1-click", thiếu sửa điểm danh |
| Tin nhắn | 6/10 | Chỉ nhắn 1-1, không gửi cả lớp, không gửi file/ảnh |
| Lịch dạy | 7/10 | Calendar view rõ ràng, có "Hôm nay", thiếu nhắc nhở & Google Calendar sync |
| Xem điểm | 3/10 | Chỉ xem lịch thi, KHÔNG CÓ nhập/xem điểm sinh viên |
| Mobile UX | 5/10 | Layout tốt nhưng nhiều module thiếu chức năng (attendance mobile chỉ xem, không điểm danh được) |
| Font size / Accessibility | 4/10 | Text quá nhỏ cho người lớn tuổi (10px labels, 12px content), thiếu tùy chỉnh cỡ chữ |
| **Tổng điểm** | **5.0/10** | **Cần cải thiện đáng kể cho giáo viên lớn tuổi** |

---

## 1. ĐĂNG NHẬP (UnifiedLogin.jsx)

### Hiện trạng
- **Login flow:** Tab switcher (Sinh viên / Giáo viên), nhập Mã GV + Mật khẩu → Đăng nhập
- **Validation:** Zod schema kiểm tra mã GV và mật khẩu không rỗng
- **Token persistence:** `localStorage` lưu `teacher_token` + `teacher` data
- **Password visibility:** Có nút toggle ẩn/hiện mật khẩu ✅
- **ARIA attributes:** Có role="tablist", role="tab", aria-controls ✅

### Vấn đề từ góc nhìn cô Hương

| # | Vấn đề | Mức độ | Chi tiết |
|---|---|---|---|
| L1 | **Không có "Ghi nhớ đăng nhập"** | 🔴 Critical | Mỗi lần mở trình duyệt phải nhập lại mã GV + mật khẩu. Cô Hương sẽ quên mật khẩu, gọi IT liên tục |
| L2 | **Không có "Quên mật khẩu"** | 🔴 Critical | Form giáo viên không có link reset password. Nếu quên → bế tắc hoàn toàn |
| L3 | **Không có hướng dẫn sử dụng lần đầu (Onboarding)** | 🟡 High | Lần đầu login không có tooltip/walkthrough nào. Cô Hương sẽ không biết bắt đầu từ đâu |
| L4 | **Placeholder "GV001" không rõ ràng** | 🟡 Medium | "Ví dụ: GV001" — cô Hương có thể không biết mã GV của mình là gì, ở đâu tìm |
| L5 | **Tab "Sinh viên" hiển thị mặc định** | 🟢 Low | Giáo viên phải click tab "Giáo viên" mỗi lần. Nên nhớ tab lần cuối |
| L6 | **Không có đăng nhập bằng Google/Zalo** | 🟡 Medium | Cô Hương quen dùng Zalo, nếu login qua Zalo/Google sẽ dễ hơn nhiều |

### Đề xuất
1. ✅ Thêm checkbox "Ghi nhớ đăng nhập" → lưu token lâu dài (30 ngày)
2. ✅ Thêm link "Quên mật khẩu?" → flow reset qua email/SMS
3. ✅ Thêm onboarding tour (3-4 bước) cho lần đăng nhập đầu tiên
4. ✅ Thêm gợi ý "Mã giáo viên được cung cấp bởi phòng đào tạo"
5. ✅ Lưu tab cuối cùng vào localStorage, tự chọn lại khi quay lại

---

## 2. DASHBOARD GIÁO VIÊN (Desktop + Mobile)

### Hiện trạng — Desktop (`TeacherDashboardDesktop.jsx`)
- **Layout:** Sidebar trái (w-64, collapsible to w-20) + Main content
- **Default tab:** `schedule` (Lịch dạy)
- **Menu items:** Lịch dạy, Lớp học, Tài liệu, Điểm danh, Nhắn tin, Cá nhân (6 items)
- **Sidebar:** Glassmorphism design, gradient teal-emerald, hiển thị tên GV
- **Hash-based routing:** URL hash (#schedule, #classes, etc.)

### Hiện trạng — Mobile (`TeacherDashboardMobile.jsx` + `TeacherMobileLayout.jsx`)
- **Layout:** Header fixed top + Bottom nav (4 items + Profile) + Side drawer menu
- **Bottom nav:** Lịch học, Lớp học, Tài liệu, Điểm danh, Tôi (5 items)
- **Header:** Hamburger menu + Page title + Bell notification + Avatar
- **Side drawer:** Full menu with animations (GSAP)

### Vấn đề từ góc nhìn cô Hương

| # | Vấn đề | Mức độ | Chi tiết |
|---|---|---|---|
| D1 | **Không có trang Overview/Tổng quan** | 🔴 Critical | Vào thẳng "Lịch dạy", KHÔNG hiển thị: hôm nay có bao nhiêu lớp, bao nhiêu SV vắng, tin nhắn chưa đọc. Cô Hương phải tự mò từng tab |
| D2 | **Sidebar collapse button quá nhỏ** (16px icon) | 🟡 Medium | Nút thu nhỏ sidebar chỉ 16px, nằm ở mép phải — khó nhấn cho người lớn tuổi |
| D3 | **Menu text size quá nhỏ** | 🟡 High | Menu items dùng default Tailwind size (14px), labels 10px tracking-widest — rất khó đọc |
| D4 | **Không có badge thông báo trên menu** | 🟡 High | Tab "Nhắn tin" không hiện số tin chưa đọc. Cô Hương không biết có tin mới |
| D5 | **Mobile bottom nav thiếu "Nhắn tin"** | 🔴 Critical | Bottom nav chỉ hiện 4 mục + Profile → "Nhắn tin" bị ẩn trong drawer menu. Cô Hương sẽ KHÔNG TÌM THẤY chức năng nhắn tin |
| D6 | **Bell notification icon không hoạt động** | 🟡 High | Mobile header có icon Bell nhưng chỉ là UI, không có chức năng thực sự |
| D7 | **Logout quá dễ nhấn nhầm** | 🟢 Low | Nút đăng xuất ngay cuối sidebar, không có confirmation dialog |

### Đề xuất
1. ✅ **Thêm tab "Tổng quan" (Overview) làm trang mặc định**, hiển thị:
   - Lịch dạy hôm nay (classes + time)
   - Số sinh viên vắng mặt hôm qua
   - Tin nhắn chưa đọc (count)
   - Lịch thi sắp tới (1 tuần)
   - Quick actions: "Điểm danh nhanh", "Gửi tin nhắn"
2. ✅ Thêm badge count trên menu item "Nhắn tin"
3. ✅ Mobile: đưa "Nhắn tin" vào bottom nav (thay "Tài liệu" ra drawer)
4. ✅ Tăng font size menu lên 16px, labels lên 13px
5. ✅ Thêm confirmation dialog trước khi logout

---

## 3. ĐIỂM DANH (AttendancePage.jsx + MobileTeacherAttendance.jsx)

### Hiện trạng — Desktop
- **Flow:** Chọn lớp (dropdown) → Tab "Điểm danh hôm nay" / "Lịch sử"
- **Điểm danh:** Table với checkbox, mặc định ALL ABSENT, click row hoặc checkbox để mark present
- **Lưu:** Nút "Lưu điểm danh" → API `markAttendanceBatch` → tự chuyển sang tab History
- **Lịch sử:** Table flat với student_name, date, status, note
- **Stats:** 3 card (Tổng HV, Có mặt lần cuối, Vắng lần cuối)

### Hiện trạng — Mobile
- **NGHIÊM TRỌNG:** Mobile `MobileTeacherAttendance.jsx` chỉ XEM lịch sử, KHÔNG CÓ khả năng điểm danh hôm nay!
- Class selector chỉ hiển thị text "Chọn lớp học..." nhưng KHÔNG có picker/modal thực sự
- Không có nút "Điểm danh hôm nay"

### Vấn đề từ góc nhìn cô Hương

| # | Vấn đề | Mức độ | Chi tiết |
|---|---|---|---|
| A1 | **3-4 clicks để điểm danh** | 🟡 High | Click "Điểm danh" → Chọn lớp dropdown → Tab "Điểm danh hôm nay" → tick từng SV → "Lưu". Quá nhiều bước |
| A2 | **Mặc định ALL ABSENT** | 🟡 High | Mở lên tất cả SV đều vắng, phải tick từng người. Nếu lớp 30 SV có mặt đủ → tick 30 lần. Nên có "Chọn tất cả có mặt" |
| A3 | **Không có "Điểm danh nhanh 1-click"** | 🔴 Critical | Không có shortcut từ Lịch dạy → Điểm danh ngay lớp đó. Phải tự chọn lại lớp |
| A4 | **Không sửa được điểm danh sai** | 🔴 Critical | Sau khi lưu, không có chức năng edit/undo. Nếu tick sai → không sửa được |
| A5 | **Mobile KHÔNG điểm danh được** | 🔴 Critical | MobileTeacherAttendance chỉ view history, không có form điểm danh. Cô Hương dùng điện thoại → bế tắc |
| A6 | **Checkbox 20px quá nhỏ** | 🟡 Medium | Checkbox `w-5 h-5` (20px) trên mobile → khó nhấn chính xác cho ngón tay lớn |
| A7 | **Không có lý do vắng** | 🟡 Medium | Chỉ có present/absent, không có: trễ, có phép, không phép |
| A8 | **Lịch sử flat list, không group by date** | 🟡 Low | Bảng lịch sử hiển thị flat, khó tìm ngày cụ thể |

### Đề xuất
1. ✅ **Quick attendance:** Từ Schedule, click vào lớp → nút "Điểm danh ngay" → mở form điểm danh pre-filled
2. ✅ **Nút "Chọn tất cả có mặt"** + "Bỏ chọn tất cả" ở header table
3. ✅ **Port full attendance form sang Mobile** (hiện chỉ có desktop)
4. ✅ **Thêm chức năng sửa điểm danh** trong vòng 24h
5. ✅ Thêm trạng thái: `present`, `absent`, `late`, `excused`
6. ✅ Tăng checkbox size lên 32px+ trên mobile
7. ✅ Group history by date, collapsible accordion

---

## 4. MESSAGING (TeacherMessaging.jsx + MobileTeacherMessaging.jsx)

### Hiện trạng — Desktop
- **Layout:** Sidebar conversations + Main chat area (giống Messenger/Zalo)
- **Features:** Search, real-time polling (10s), optimistic send, unread count
- **1-1 only:** Chỉ nhắn tin 1 teacher ↔ 1 student
- **Text only:** Input text, KHÔNG hỗ trợ file/ảnh
- **Phone/MoreVertical buttons:** Chỉ là UI, không có chức năng

### Hiện trạng — Mobile
- **List view only:** MobileTeacherMessaging chỉ hiện danh sách conversations
- **KHÔNG CÓ chat detail:** Click vào conversation → KHÔNG MỞ chat. Chỉ hiện list
- **Nút "+" (Plus) tạo mới:** Có UI nhưng không có handler

### Vấn đề từ góc nhìn cô Hương

| # | Vấn đề | Mức độ | Chi tiết |
|---|---|---|---|
| M1 | **Không gửi tin nhắn cho CẢ LỚP** | 🔴 Critical | Nhu cầu chính của GV: "Cả lớp mai nghỉ" hoặc "Nhớ nộp bài". Hiện chỉ gửi 1-1 |
| M2 | **Không gửi file/ảnh** | 🟡 High | Không attach file (đề thi, bài tập) hoặc ảnh. Cô Hương phải dùng Zalo song song |
| M3 | **Mobile chat không mở được** | 🔴 Critical | MobileTeacherMessaging chỉ list, không navigate vào chat detail |
| M4 | **Phone + MoreVertical buttons không hoạt động** | 🟡 Medium | Fake UI, click không làm gì |
| M5 | **Không có notification sound/push** | 🟡 High | Polling 10s server-side, nhưng KHÔNG có browser notification hoặc sound alert |
| M6 | **Không có tin nhắn mẫu** | 🟡 Medium | Cô Hương hay gửi cùng loại tin ("Nhớ nộp bài", "Mai nghỉ"). Cần quick templates |

### Đề xuất
1. ✅ **Broadcast messaging:** Thêm "Gửi tin cho cả lớp" — chọn lớp → type message → gửi all students
2. ✅ **File/Image attachment:** Upload button + preview + send
3. ✅ **Fix Mobile chat:** Navigate vào chat detail khi click conversation
4. ✅ **Push notification:** Service Worker + Web Push API
5. ✅ **Quick templates:** "Nhắc nộp bài", "Thông báo nghỉ", "Lịch thi thay đổi"

---

## 5. LỊCH DẠY (TeacherSchedule.jsx + MobileTeacherSchedule.jsx)

### Hiện trạng — Desktop
- **View:** 7-column week grid, mỗi ngày hiển thị các slot thời gian
- **Navigation:** Prev/Next week + "Hôm nay" button
- **Detail modal:** Click slot → modal hiện thông tin (thời gian, phòng, meeting link)
- **Actions:** "Quản lý lớp học" (navigate to classes tab), "Tham gia dạy học trực tuyến"
- **Today highlight:** Ngày hôm nay có bg teal nổi bật ✅

### Hiện trạng — Mobile
- **View:** List view theo ngày trong tuần (vertical scroll)
- **Navigation:** Prev/Next week, swipe weeks
- **Detail modal:** Bottom sheet animation
- **Today highlight:** Có ✅

### Vấn đề từ góc nhìn cô Hương

| # | Vấn đề | Mức độ | Chi tiết |
|---|---|---|---|
| S1 | **Không có nhắc nhở trước giờ dạy** | 🔴 Critical | Không có reminder 15-30 phút trước giờ. Cô Hương hay quên lịch |
| S2 | **Không đồng bộ Google Calendar** | 🟡 High | Cô Hương dùng Google Calendar trên điện thoại, muốn thấy lịch dạy ở đó luôn |
| S3 | **Desktop: 7 cột quá hẹp trên màn hình nhỏ** | 🟡 Medium | 7 columns `xl:grid-cols-7` → text bị truncate, khó đọc tên lớp |
| S4 | **Không link trực tiếp đến Điểm danh** | 🟡 High | Modal chi tiết có "Quản lý lớp học" nhưng KHÔNG CÓ "Điểm danh lớp này" |
| S5 | **Mobile: "Điểm danh lớp" button trong modal không navigate** | 🟡 Medium | Nút "Điểm danh lớp" hiện diện nhưng onClick không có logic thực tế |
| S6 | **Ngày trống hiện icon nhỏ + "Trống"** | 🟢 Low | Có thể tận dụng space trống hiển thị gợi ý soạn bài |

### Đề xuất
1. ✅ **Browser notification:** 15 phút trước giờ dạy, popup nhắc + link vào lớp online
2. ✅ **Google Calendar sync:** Export .ics hoặc API sync
3. ✅ Thêm nút "Điểm danh ngay" trong schedule detail modal
4. ✅ Desktop: cho phép switch calendar/list view
5. ✅ Mobile: fix "Điểm danh lớp" button logic

---

## 6. XEM ĐIỂM THI (TeacherExams.jsx)

### Hiện trạng
- **View:** Card list các kỳ thi (tên thi, ngày, giờ, thời lượng, địa điểm, ghi chú)
- **Filter:** Tất cả / Sắp tới / Đã qua
- **Detail modal:** Click "Chi tiết" → modal hiện info
- **CHỈ XEM, KHÔNG NHẬP:** Giáo viên chỉ XEM lịch thi, KHÔNG nhập được điểm

### Vấn đề

| # | Vấn đề | Mức độ | Chi tiết |
|---|---|---|---|
| E1 | **KHÔNG CÓ chức năng nhập điểm** | 🔴 Critical | Nhu cầu cốt lõi của GV: nhập điểm sau khi chấm thi. Hiện hệ thống KHÔNG HỖ TRỢ |
| E2 | **KHÔNG CÓ xem điểm sinh viên** | 🔴 Critical | GV không thể xem bảng điểm lớp mình dạy |
| E3 | **Không có export/import điểm** | 🟡 High | GV thường chấm trên Excel rồi import. Không có chức năng này |

---

## 7. TÀI LIỆU (TeacherDocuments.jsx + MobileTeacherDocuments.jsx)

### Hiện trạng — Desktop
- **Features:** Upload tài liệu (chọn lớp + file + mô tả), lọc theo lớp, tab "Lớp tôi" / "Công khai"
- **Upload:** Modal với form, drag-drop, preview file info
- **Download:** Click card → download
- **Search:** Có ✅
- **File types:** Nhận diện PDF, DOC, XLS, PPT, ảnh, video

### Hiện trạng — Mobile
- **Features:** Search + list view + download button
- **Thiếu:** KHÔNG CÓ upload trên mobile

### Vấn đề

| # | Vấn đề | Mức độ | Chi tiết |
|---|---|---|---|
| DO1 | **Mobile KHÔNG upload được** | 🟡 High | MobileTeacherDocuments chỉ có search + download, thiếu upload |
| DO2 | **Upload dùng alert() thay vì toast** | 🟢 Low | `alert('Upload thành công!')` — không chuyên nghiệp, nên dùng toast |
| DO3 | **Không có preview file** | 🟡 Medium | Click = download ngay. Nên có preview (PDF viewer, image viewer) trước |

---

## 8. PROFILE (TeacherProfile.jsx + MobileTeacherProfile.jsx)

### Hiện trạng — Desktop
- **Info tab:** Form sửa Họ, Tên đệm, Tên, Email, SĐT, Khoa, Chức vụ + Avatar upload
- **Password tab:** Đổi mật khẩu (current + new + confirm), validate min 6 ký tự
- **Layout:** Left sidebar tabs + Right content area

### Hiện trạng — Mobile
- **RẤT SƠ SÀI:** Chỉ hiện tên, email, SĐT, ngày sinh. KHÔNG có form edit, KHÔNG đổi password

### Vấn đề

| # | Vấn đề | Mức độ | Chi tiết |
|---|---|---|---|
| P1 | **Mobile profile không sửa được** | 🟡 High | Chỉ view, không edit. GV dùng mobile phải chuyển desktop để đổi thông tin |
| P2 | **"Verified account" hiển thị tiếng Anh** | 🟢 Low | Badge "Verified account" nên dịch sang tiếng Việt |
| P3 | **Avatar upload dùng base64** | 🟡 Medium | Lưu base64 trong profile form → gửi cả chuỗi dài qua API. Nên upload riêng file |

---

## 9. FONT SIZE & ACCESSIBILITY

### Phân tích kích thước chữ hiện tại

| Element | Size | Đánh giá cho người 50 tuổi |
|---|---|---|
| Page titles (h1) | `text-3xl` (30px) | ✅ Đủ lớn |
| Card titles | `text-xl` (20px) | ✅ OK |
| Menu items | `text-sm` (14px) | 🟡 Hơi nhỏ, nên 16px |
| Body text | `text-sm` (14px) | 🟡 Hơi nhỏ |
| Labels (UPPERCASE) | `text-[10px]` (10px) | 🔴 QUÁ NHỎ — người lớn tuổi không đọc được |
| Badge text | `text-[8px]-[10px]` | 🔴 QUÁ NHỎ |
| Table header | `text-[10px]` tracking-widest | 🔴 QUÁ NHỎ |
| Mobile bottom nav label | `text-[9px]` | 🔴 QUÁ NHỎ — 9px uppercase tracking-widest gần như không đọc được |
| Timestamp text | `text-[9px]-[10px]` | 🔴 QUÁ NHỎ |

### Vấn đề Accessibility

| # | Vấn đề | Mức độ |
|---|---|---|
| ACC1 | **Không có tùy chỉnh font size** (zoom/accessibility settings) | 🔴 Critical |
| ACC2 | **Labels 10px uppercase tracking-widest** — unreadable cho mắt 50 tuổi | 🔴 Critical |
| ACC3 | **Không có high contrast mode** | 🟡 High |
| ACC4 | **Touch targets mobile 32-40px** — nên ≥ 44px (WCAG guideline) | 🟡 High |
| ACC5 | **Grayscale cho inactive tabs** — `opacity-40 grayscale` bottom nav items rất khó nhìn | 🟡 High |

### Đề xuất
1. ✅ **Minimum font size 13px** cho mọi text, 16px cho interactive labels
2. ✅ **Font size toggle:** Nhỏ / Vừa / Lớn (stored in localStorage)
3. ✅ **Touch targets ≥ 44x44px** trên mobile
4. ✅ **Bỏ grayscale** bottom nav, dùng opacity + color thay thế
5. ✅ Labels nên 12px minimum, bỏ UPPERCASE nếu size < 13px

---

## 10. THIẾU GÌ — FEATURE GAP ANALYSIS

### So sánh với Google Classroom & ClassDojo

| Feature | Hệ thống hiện tại | Google Classroom | ClassDojo | Cần thiết? |
|---|---|---|---|---|
| **Overview Dashboard** | ❌ Không có | ✅ "Stream" tổng hợp | ✅ Trang chính có overview | 🔴 BẮT BUỘC |
| **Nhập điểm** | ❌ Không có | ✅ Gradebook đầy đủ | ❌ (không phải mục tiêu) | 🔴 BẮT BUỘC |
| **Xem bảng điểm lớp** | ❌ Không có | ✅ Có | ❌ | 🔴 BẮT BUỘC |
| **Tạo bài tập** | ❌ Không có | ✅ Assignments | ❌ | 🟡 NÊN CÓ |
| **Broadcast tin nhắn cả lớp** | ❌ Không có | ✅ Announcements | ✅ Class Story | 🔴 BẮT BUỘC |
| **Gửi file/ảnh trong chat** | ❌ Không có | ✅ Attachment | ✅ Ảnh/Video | 🟡 NÊN CÓ |
| **Quên mật khẩu** | ❌ Không có | ✅ Google Account | ✅ Email reset | 🔴 BẮT BUỘC |
| **Ghi nhớ đăng nhập** | ❌ Không có | ✅ Google Account | ✅ Persistent login | 🔴 BẮT BUỘC |
| **Push Notification** | ❌ Không có | ✅ Email + Push | ✅ Push + Email | 🟡 NÊN CÓ |
| **Nhắc nhở trước giờ dạy** | ❌ Không có | ✅ Calendar reminder | ❌ | 🟡 NÊN CÓ |
| **Google Calendar sync** | ❌ Không có | ✅ Native | ❌ | 🟡 NÊN CÓ |
| **Export báo cáo điểm danh** | ❌ Không có | ❌ | ✅ Report export | 🟡 NÊN CÓ |
| **Xem progress sinh viên** | ❌ Không có | ✅ Student view | ✅ Behavior points | 🟡 NÊN CÓ |
| **Video recording lớp học** | ❌ Không có | ✅ Google Meet record | ❌ | 🟢 NICE-TO-HAVE |
| **Onboarding tour** | ❌ Không có | ✅ Setup wizard | ✅ Guided setup | 🔴 BẮT BUỘC |
| **Điểm danh nhanh 1-click** | ❌ Không có | ❌ | ✅ Quick tap | 🔴 BẮT BUỘC |
| **Font size accessibility** | ❌ Không có | ✅ Browser zoom | ✅ App settings | 🔴 BẮT BUỘC |

---

## 11. MOBILE VS DESKTOP PARITY

| Feature | Desktop | Mobile | Gap |
|---|---|---|---|
| Điểm danh hôm nay | ✅ Full form | ❌ Chỉ view history | 🔴 CRITICAL |
| Chat detail (tin nhắn) | ✅ Full chat | ❌ Chỉ list conversations | 🔴 CRITICAL |
| Upload tài liệu | ✅ Full form | ❌ Không có | 🟡 HIGH |
| Profile edit | ✅ Full form | ❌ Chỉ view | 🟡 HIGH |
| Đổi mật khẩu | ✅ Có | ❌ Không có | 🟡 HIGH |
| Schedule view | ✅ 7-col grid | ✅ List view | ✅ OK (khác format) |
| Classes list | ✅ Card grid | ✅ Card list | ✅ OK |
| Class detail | ✅ Full tabs | ❌ Không có | 🟡 HIGH |
| Exam view | ✅ Card + filter | ❌ Không có trên mobile | 🟡 HIGH |

**Kết luận:** Mobile thiếu ~60% chức năng so với Desktop. Đây là vấn đề NGHIÊM TRỌNG vì giáo viên hay dùng điện thoại.

---

## 12. TỔNG HỢP ĐỀ XUẤT ƯU TIÊN

### 🔴 P0 — Phải làm ngay (Critical)

| # | Đề xuất | Component | Effort |
|---|---|---|---|
| 1 | Thêm trang Overview/Dashboard tổng quan | New `TeacherOverview.jsx` | Medium |
| 2 | Thêm "Ghi nhớ đăng nhập" + "Quên mật khẩu" | `UnifiedLogin.jsx` + backend | Medium |
| 3 | Thêm chức năng NHẬP ĐIỂM + XEM ĐIỂM | New `TeacherGrades.jsx` + API | Large |
| 4 | Fix Mobile Attendance — port full form | `MobileTeacherAttendance.jsx` | Medium |
| 5 | Fix Mobile Chat — add chat detail view | `MobileTeacherMessaging.jsx` | Medium |
| 6 | Broadcast messaging (gửi cả lớp) | `TeacherMessaging.jsx` + API | Medium |
| 7 | Điểm danh nhanh từ Schedule | `TeacherSchedule.jsx` + `AttendancePage.jsx` | Small |
| 8 | Nút "Chọn tất cả có mặt" cho điểm danh | `AttendancePage.jsx` | Small |
| 9 | Fix font size minimum 13px + accessibility | All teacher CSS/components | Medium |
| 10 | Onboarding tour lần đầu đăng nhập | New `TeacherOnboarding.jsx` | Medium |

### 🟡 P1 — Nên làm (High)

| # | Đề xuất | Component | Effort |
|---|---|---|---|
| 11 | File/Image attachment trong chat | `TeacherMessaging.jsx` + API | Medium |
| 12 | Nhắc nhở trước giờ dạy (browser notification) | Service Worker + Scheduler | Medium |
| 13 | Sửa điểm danh (edit within 24h) | `AttendancePage.jsx` + API | Small |
| 14 | Mobile profile edit + change password | `MobileTeacherProfile.jsx` | Medium |
| 15 | Mobile upload tài liệu | `MobileTeacherDocuments.jsx` | Small |
| 16 | Badge count tin nhắn chưa đọc trên menu | `TeacherDashboardDesktop.jsx` | Small |
| 17 | Export điểm danh (Excel/PDF) | `AttendancePage.jsx` + API | Medium |
| 18 | Font size toggle (Nhỏ/Vừa/Lớn) | Global settings | Medium |
| 19 | Trạng thái điểm danh mở rộng (late, excused) | `AttendancePage.jsx` + API | Small |
| 20 | Mobile class detail view | New `MobileTeacherClassDetail.jsx` | Medium |

### 🟢 P2 — Nice to have

| # | Đề xuất | Component | Effort |
|---|---|---|---|
| 21 | Google Calendar sync (.ics export) | `TeacherSchedule.jsx` | Medium |
| 22 | Quick message templates | `TeacherMessaging.jsx` | Small |
| 23 | Student progress dashboard | New component | Large |
| 24 | Tạo bài tập / Assignment | New module | Large |
| 25 | File preview (PDF, image) trước download | `TeacherDocuments.jsx` | Medium |
| 26 | Login via Zalo/Google OAuth | `UnifiedLogin.jsx` + backend | Large |
| 27 | Video recording integration | 3rd party | Large |

---

## 13. UNRESOLVED QUESTIONS

1. **Backend API cho nhập điểm:** API `/teachers/grades` đã tồn tại chưa? Cần kiểm tra backend routes
2. **Push notification infrastructure:** Server có hỗ trợ Web Push (VAPID keys, subscription storage) chưa?
3. **Broadcast messaging:** Backend có endpoint gửi message đến tất cả students trong 1 class không?
4. **Password reset:** Backend có endpoint `/teachers/forgot-password` chưa? Gửi email hay SMS?
5. **Mobile attendance form:** API `markAttendanceBatch` có require teacher token type không? (Cần verify authorization)
6. **File upload trong chat:** API messaging hiện chỉ hỗ trợ text. Cần thêm multipart upload endpoint?
