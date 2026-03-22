# BÁO CÁO TỔNG HỢP: 10 AGENTS "ROAST" CODEBASE
**Ngày:** 2026-03-04
**Dự án:** VanTrangEdu (frontend + backend)
**Tổng vấn đề:** 214 | **Cao/Nghiêm trọng:** 101

---

## TỔNG QUAN NHANH

| # | Vai trò | Vấn đề | Cao | File chính |
|---|---|---|---|---|
| 1 | Phụ huynh lần đầu | 27 | 19 | HomePage, Training, Contact, Registration |
| 2 | Mobile UX | 23 | 8 | HomePage, Header, News, PostDetail, CertLookup |
| 3 | Sinh viên mới | 14 | 9 | Registration, Login, Dashboard, Classes, Payment |
| 4 | Thí sinh VSTEP | 12 | 6 | VStepExamHall, ExamSecurity, VStepExamList |
| 5 | Admin daily | 14 | 6 | Students, Payments, Documents, Certificates |
| 6 | Admin exam/class | 25 | 11 | ExamSchedules, OnlineClasses, VStepManager, Reports |
| 7 | Giáo viên | 16 | 6 | TeacherDashboard, Attendance, Schedule, Messaging |
| 8 | SEO Expert | 24 | 12 | App.jsx, SEO.jsx, index.html, all public pages |
| 9 | Security Auditor | 15 | 7 | index.js, auth.js, students.js, helpers.js |
| 10 | UX Designer | 44 | 17 | Registration, Login, Header, Sidebar, DateInput |

---

## TOP 20 VẤN ĐỀ NGHIÊM TRỌNG NHẤT

### P0 — SỬA NGAY (Bảo mật + Mất dữ liệu)

**1. Route `/students/` không có auth — lộ toàn bộ CCCD, SĐT, ảnh CCCD**
- Agent: Security #3
- File: `backend/src/index.js` L107, `routes/students.js` L46-51
- Impact: Ai cũng GET được danh sách 97 sinh viên + thông tin nhạy cảm

**2. `DELETE /students/:id` không có auth — xóa sinh viên không cần đăng nhập**
- Agent: Security #13
- File: `backend/src/routes/students.js` L90-95
- Impact: Phá hoại dữ liệu chỉ bằng 1 curl command

**3. `PUT /students/update-by-cccd` không có auth — sửa dữ liệu sinh viên tùy ý**
- Agent: Security #8
- File: `backend/src/routes/students.js` L75-88
- Impact: Thay đổi email, SĐT, ảnh CCCD của bất kỳ sinh viên nào

**4. CORS mở hoàn toàn `origin: '*'` — mọi website đều gọi được API**
- Agent: Security #1
- File: `backend/src/index.js` L50-55
- Impact: Cross-origin attack kết hợp với các lỗ hổng trên

**5. CCCD Upload endpoint không có auth + ảnh CCCD serve public**
- Agent: Security #4, #10
- File: `routes/cccd-upload.js` L26, L263-295
- Impact: Upload spam + lộ ảnh CCCD quốc gia

**6. Student login bằng CCCD + SĐT plaintext trong localStorage**
- Agent: Security #2, Student #2
- File: `UnifiedLogin.jsx` L59-61
- Impact: XSS = đánh cắp identity, không có session revoke

### P1 — SỬA TUẦN NÀY (Core UX broken)

**7. Form liên hệ chỉ `console.log` — KHÔNG gửi đi đâu cả**
- Agent: Phụ huynh #25
- File: `ContactPage.jsx` L36-43
- Impact: Phụ huynh tưởng đã liên hệ, thực ra message bị vứt

**8. 7/8 khóa học đều trỏ về cùng 1 link `/training/short-term`**
- Agent: Phụ huynh #8
- File: `TrainingPage.jsx` L15-67
- Impact: Tiếng Nhật, Tiếng Hàn, Tiếng Trung... đều vào cùng 1 trang

**9. Nút "Thanh toán ngay" chỉ là `alert('Tính năng đang phát triển')`**
- Agent: Student #9
- File: `Payment.jsx` L119
- Impact: Sinh viên không biết trả tiền bằng cách nào

**10. Dashboard `<ActiveModule />` không truyền `studentData` prop — Schedule + Payment trắng**
- Agent: Student #8, #10
- File: `StudentDashboard.jsx` L78
- Impact: Lịch học và thanh toán luôn trống do bug prop

**11. VStepManager: Search, Filter, View/Edit/Delete buttons đều KHÔNG hoạt động**
- Agent: Admin Exam #17, #18, #19
- File: `VStepManager.jsx` L58-63, L64-74, L131-141
- Impact: Admin không quản lý được đề thi VSTEP

**12. VStepEditor chỉ là "Coming soon..." — không tạo/sửa đề thi được**
- Agent: Admin Exam #21
- File: `VStepEditor.jsx` L1-12
- Impact: Tính năng core chưa tồn tại

**13. Timer thi VSTEP tính từ lúc tạo attempt, không phải lúc bắt đầu làm bài**
- Agent: VSTEP #2
- File: `VStepExamHall.jsx` L80-82
- Impact: Thí sinh mất thời gian oan

**14. Auto-save thi VSTEP thất bại im lặng (`console.error` only)**
- Agent: VSTEP #4
- File: `VStepExamHall.jsx` L144-146
- Impact: Câu trả lời bị mất mà thí sinh không biết

**15. Giáo viên KHÔNG thể điểm danh — trang chỉ xem lịch sử**
- Agent: Teacher #2
- File: `AttendancePage.jsx` L49-62
- Impact: Tính năng chính của giáo viên không hoạt động

**16. Dropdown chọn lớp của giáo viên bị lỗi type (`string === number`)**
- Agent: Teacher #4
- File: `AttendancePage.jsx` L80-82
- Impact: Chọn lớp không load được dữ liệu

### P2 — SỬA THÁNG NÀY (SEO + Architecture)

**17. Pure CSR SPA — Google không đọc được nội dung**
- Agent: SEO #4
- File: Toàn bộ kiến trúc frontend
- Impact: Mọi đầu tư SEO vô nghĩa khi HTML trống rỗng

**18. Không có sitemap.xml, robots.txt**
- Agent: SEO #3
- Impact: Googlebot không biết trang nào cần crawl

**19. Structured Data array bị serialize sai — rich snippet mất hoàn toàn**
- Agent: SEO #8
- File: `SEO.jsx` L73-80
- Impact: FAQPage, BreadcrumbList schema không hoạt động

**20. GA4 Measurement ID = placeholder `G-XXXXXXXXXX`**
- Agent: SEO #1
- File: `index.html` L58-66
- Impact: Analytics hoàn toàn mù, không track được gì

---

## PHÂN LOẠI THEO LĨNH VỰC

### BẢO MẬT (15 vấn đề — 7 Nghiêm trọng, 7 Cao)
| # | Vấn đề | Mức |
|---|--------|-----|
| 1 | CORS wildcard `*` | Nghiêm trọng |
| 2 | Student auth = CCCD+SĐT plaintext localStorage | Nghiêm trọng |
| 3 | `/students/` public — lộ toàn bộ data | Nghiêm trọng |
| 4 | CCCD upload no auth | Nghiêm trọng |
| 5 | Username enumeration (login error messages) | Cao |
| 6 | Token payload logged in console | Cao |
| 7 | Token without `exp` treated as permanent | Cao |
| 8 | PUT students no auth — IDOR write | Nghiêm trọng |
| 9 | `/students/register` = `z.any()` — mass assignment | Cao |
| 10 | GET CCCD images public | Nghiêm trọng |
| 11 | ExamSecurity client-only — trivial bypass | Cao |
| 12 | Microsoft Clarity may record CCCD input | Cao |
| 13 | DELETE students no auth | Nghiêm trọng |
| 14 | Custom JWT implementation | Trung bình |
| 15 | No rate limit on student login | Cao |

### TÍNH NĂNG BROKEN/GIẢ (28 vấn đề)
| Vấn đề | Agent |
|--------|-------|
| Form liên hệ fake (console.log) | Phụ huynh |
| Nút "Thanh toán ngay" = alert | Student |
| VStepManager search/filter/buttons dead | Admin Exam |
| VStepEditor = "Coming soon" | Admin Exam |
| 7/8 khóa trỏ cùng 1 link | Phụ huynh |
| Nút "Chi tiết" kỳ thi không onClick | Teacher |
| Nút camera avatar không onClick | Teacher |
| CTA "Bắt đầu ngay" không có link | UX |
| ArrowUpRight icons không clickable | UX |
| "+N sự kiện nữa" không click được | Student |
| Radio "Trong nước/Nước ngoài" không làm gì | Student |
| Stat "+12%" doanh thu hardcode giả | Admin |
| "Cập nhật lần cuối" = ngày hôm nay hardcode | Admin |
| "Online Now" stat = `-` cứng | Admin Exam |
| Rating 4.9/1250 reviews hardcode fake | SEO |
| GA4 = `G-XXXXXXXXXX` placeholder | SEO |

### BUG KỸ THUẬT (22 vấn đề)
| Vấn đề | File |
|--------|------|
| `studentData` prop không truyền → Schedule+Payment trắng | StudentDashboard.jsx |
| Dropdown class_id string vs number | AttendancePage.jsx |
| Timer tính từ tạo attempt, không phải bắt đầu | VStepExamHall.jsx |
| Auto-save fail silent | VStepExamHall.jsx |
| Auto-advance không cảnh báo trước | VStepExamHall.jsx |
| Sender_type `admin` cho teacher messages | TeacherMessaging.jsx |
| Upload online_class_ids bị bỏ qua | DocumentsManagement.jsx |
| Structured data array serialize sai | SEO.jsx |
| LazyImage double-load ảnh | LazyImage.jsx |
| useAnalytics không track first page view | useAnalytics.js |
| Duplicate route `/news/:slug` | App.jsx |
| Attendance stats tính sai "Lần cuối" | AttendancePage.jsx |
| Mobile menu height calc sai | ModernHeader.jsx |
| fetchAll posts to find 1 | PostDetailPage.jsx |
| `window.location.href` in SSR context | SemanticLanding.jsx |
| No code splitting — bundle quá lớn | App.jsx |
| localStorage `setTimeout` + CustomEvent race | TeacherSchedule.jsx |
| "Duyệt tất cả" sequential thay vì parallel | ClassDetailDashboard.jsx |
| Client load 1000 records rồi paginate | StudentsManagement.jsx |
| Calendar button tabIndex=-1 | DateInput.jsx |
| No request timeout — fetch hang vĩnh viễn | api-request-engine.js |
| dangerouslySetInnerHTML không sanitize | PostDetailPage.jsx |

### UX/ACCESSIBILITY (44 vấn đề — top issues)
| Vấn đề | WCAG |
|--------|------|
| Form labels không có htmlFor + input id | 1.3.1 |
| Modal không focus trap, không aria roles | 2.4.3 |
| Tab "Sinh viên/Giáo viên" không ARIA tab pattern | 4.1.2 |
| Error messages không role="alert" | 4.1.3 |
| Hamburger không aria-expanded | 4.1.2 |
| Div onClick thay vì button — keyboard inaccessible | 2.1.1 |
| Focus ring bị Tailwind reset | 2.4.7 |
| Calendar button tabIndex=-1 | 2.1.1 |
| No progress indicator cho form dài | UX |
| No password visibility toggle | UX |
| Date of birth 3 selects không fieldset/legend | 1.3.1 |
| Upload error silent (console.error only) | UX |

### CONTENT/BUSINESS (19 vấn đề — top issues)
| Vấn đề | Agent |
|--------|-------|
| Tiêu đề hero quá chung, không nói trường dạy gì | Phụ huynh |
| Số liệu "10K+" vs "500+" mâu thuẫn | Phụ huynh |
| Form ghi "DỰ THI" không phải "đăng ký học" | Phụ huynh |
| Không có ô chọn khóa muốn học | Phụ huynh |
| Upload 3 ảnh CCCD ngay lần đầu → sợ hãi | Phụ huynh |
| Tên "Sơn Trang" vs "Van Trang" — khác brand | Phụ huynh |
| "Bảo hành trọn đời" không giải thích nghĩa gì | Phụ huynh |
| Địa chỉ chỉ ghi "Hà Nội, Việt Nam" | Phụ huynh |
| Không có thông tin giáo viên cụ thể | Phụ huynh |
| Không có Zalo trên trang Contact | Phụ huynh |
| Không có onboarding sau đăng ký | Student |
| Không có trang Profile cho sinh viên | Student |
| Không có báo cáo thi cử | Admin Exam |
| Giáo viên không nhập điểm được | Teacher |
| Không có "Quên mật khẩu" cho giáo viên | UX |

---

## ĐỀ XUẤT ƯU TIÊN HÀNH ĐỘNG

### TUẦN 1: Bảo mật khẩn cấp
1. Thêm `authMiddleware` cho routes: `/students/*`, `/cccd-upload/*`
2. Đổi CORS từ `*` sang whitelist domains
3. Chuyển student auth sang JWT (bỏ CCCD+SĐT plaintext)
4. Thêm `loginRateLimiter` cho student login
5. Sanitize `dangerouslySetInnerHTML` (DOMPurify)

### TUẦN 2: Fix broken features
1. Truyền `studentData` prop trong StudentDashboard
2. Kết nối form Contact với API thật
3. Fix VStepManager (search, filter, buttons)
4. Fix timer VSTEP (tính từ lúc bắt đầu thật)
5. Fix dropdown class_id type trong AttendancePage
6. Fix sender_type cho teacher messaging

### TUẦN 3-4: Core UX
1. Thêm onboarding flow sau đăng ký
2. Tạo trang Profile cho sinh viên
3. Fix form đăng ký (bớt fields, thêm chọn khóa học)
4. ARIA fixes cho form, modal, tabs
5. Mobile responsive fixes

### THÁNG 2: SEO + Architecture
1. Cài prerendering (Rendertron/Prerender.io)
2. Thêm sitemap.xml + robots.txt
3. Fix structured data serialization
4. Code splitting với React.lazy
5. Set GA4 measurement ID thật

---

*Báo cáo tự động tạo bởi 10 AI agents chạy song song, mỗi agent phân tích từ 1 góc nhìn riêng biệt.*
