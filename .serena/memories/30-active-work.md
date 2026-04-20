# Active Work — vantrangedu

## Session: 2026-04-11 — Admin-only exam fee filter in exam student lists

### Status: COMPLETED

### Mô tả
User yêu cầu thêm bộ lọc `Đã nộp học phí` / `Chưa nộp học phí` trong danh sách thí sinh của `Lịch thi` và chặn hoàn toàn khỏi tài khoản giáo viên nội bộ. Rà lại auth/session cho thấy teaching staff đang dùng session `admin` có `teacher_code`, nên fix được thực hiện ở cả frontend lẫn backend để không chỉ ẩn UI mà còn không lộ `payment_status` qua API.

### Files thay đổi
- `frontend/src/utils/adminSession.ts`
- `frontend/src/utils/adminSession.test.ts`
- `frontend/src/pages/admin/desktop/ExamSchedulesPage.tsx`
- `frontend/src/pages/admin/mobile/MobileExamSchedulesModule.tsx`
- `backend/src/routes/exam-schedules.ts`
- `backend/src/routes/exam-schedules.js`
- `backend/src/test/routes/exam-schedules.test.ts`
- `.serena/memories/30-active-work.md`
- `.serena/memories/40-decisions.md`
- `.serena/memories/50-verification.md`

### Completed Items
- Thêm helper frontend `canAccessExamFeeStatus()` để phân biệt admin/super_admin thực sự với staff có `teacher_code`.
- Desktop `ExamSchedulesPage` có thêm bộ lọc `Tất cả / Đã nộp / Chưa nộp` trong tab `Đã duyệt`; tài khoản teacher nội bộ không còn thấy badge/toggle/filter học phí.
- Mobile `MobileExamSchedulesModule` đồng bộ cùng behavior với bộ lọc paid/unpaid chỉ trên tab `Đã duyệt`.
- Backend `GET /exam-schedules/:id/students` và `GET /exam-schedules/:id/pending` strip field `payment_status` khỏi response nếu session là admin có `teacher_code`.
- Backend `PUT /exam-schedules/:id/students/:studentId/payment-status` giờ trả `403` cho teacher-code admin, chỉ cho admin/super_admin không mang `teacher_code` cập nhật.
- Thêm test backend cover 3 case: teacher-code admin không thấy `payment_status`, full admin vẫn xem/cập nhật được, teacher-code admin bị chặn update.
- Thêm test frontend cho helper phân quyền học phí.
- Deployment: backend Worker production đã deploy, version `f3ec45ca-d022-43df-8c99-6defed99b625`.
- Deployment: frontend Pages production đã deploy, preview URL `https://03b144df.vantrangedu.pages.dev`.
- Smoke check `https://vantrangedu-api.bangachieu2.workers.dev`, `https://vantrangedu.com`, và preview URL đều trả `200 OK`.

### Updated
2026-04-11 15:11:57 +07:00

## Session: 2026-04-12 — Remove student nav items and rename feedback entry

### Status: COMPLETED

### Mô tả
User yêu cầu gỡ 3 mục học viên `Lớp của tôi / Điểm danh / Báo cáo` khỏi điều hướng `vantrangedu`, đồng thời đổi tên mục `Phản hồi` thành `FEEDBACK LỚP HỌC`. Cần đảm bảo thay đổi áp dụng cho cả desktop lẫn mobile và chặn truy cập lại bằng link cũ.

### Files thay đổi
- `frontend/src/features/student/student-nav.tsx`
- `frontend/src/App.tsx`
- `frontend/src/pages/student/desktop/StudentFeedbackView.tsx`
- `.serena/memories/30-active-work.md`
- `.serena/memories/40-decisions.md`
- `.serena/memories/50-verification.md`

### Completed Items
- Gỡ 3 nav item học viên `my-classes`, `attendance`, `reviews` khỏi `STUDENT_MAIN_MENU`.
- Đổi label + page title của feedback sang `FEEDBACK LỚP HỌC`.
- Redirect route cũ:
  - `/dashboard/my-classes` -> `/dashboard/exams`
  - `/dashboard/attendance` -> `/dashboard/exams`
  - `/dashboard/reviews` -> `/dashboard/feedback`
- Xác nhận menu học viên desktop/mobile đều dùng chung `STUDENT_MAIN_MENU`, nên thay đổi áp dụng đồng thời cho `DashboardSidebar`, `StudentBottomNav`, `StudentMobileLayout`, `StudentDashboardMobile`.
- Frontend build pass và đã deploy Pages preview mới `https://9de913c1.vantrangedu.pages.dev`.

### Updated
2026-04-12 12:02:00 +07:00

## Session: 2026-04-13 — Faster handoff from student "Học tập" to vantrangexam

### Status: COMPLETED

### Mô tả
User phản hồi khi bấm `Học tập` trong `vantrangedu` để sang `vantrangexam` thì app load rất lâu. Đã tối ưu luồng handoff phía `vantrangedu` để không boot `vantrangexam` sớm một lần vô ích trước khi lấy được SSO handoff URL.

### Files thay đổi
- `frontend/src/features/student/student-nav.tsx`
- `.serena/memories/30-active-work.md`
- `.serena/memories/40-decisions.md`
- `.serena/memories/50-verification.md`

### Completed Items
- `STUDY_PLATFORM_URL` đổi về canonical hash login URL `https://vantrangexam.pages.dev/#/login`.
- `openStudyPlatform()` không còn mở ngay `vantrangexam` URL thật trong popup; giờ mở tab trống trước để tránh boot app 2 lần.
- Thêm loading state trực tiếp vào popup blank (`Đang mở khu học tập`) để người dùng không thấy tab trắng khi đang chờ handoff.
- Frontend build pass và đã deploy Pages preview mới `https://c26f6a17.vantrangedu.pages.dev`.

### Updated
2026-04-13 22:33:00 +07:00

## Session: 2026-04-13 — Ensure student study entry always uses SSO auto-login

### Status: COMPLETED

### Mô tả
User hỏi đúng: bấm `Học tập` từ `vantrangedu` phải auto-login sang `vantrangexam`, không được rơi về login thường. Qua kiểm tra, menu external đã gọi `openStudyPlatform()`, nhưng route trung gian `StudyPlatformRedirect` trong `frontend/src/App.tsx` vẫn render `ExternalRedirect` sang login URL thường, có thể phá handoff và làm mất auto-login ở các luồng đi qua `/dashboard/online-classes`, `/dashboard/register-class`, `/dashboard/vstep/*`.

### Files thay đổi
- `frontend/src/features/student/student-nav.tsx`
- `frontend/src/App.tsx`
- `.serena/memories/30-active-work.md`
- `.serena/memories/40-decisions.md`
- `.serena/memories/50-verification.md`

### Completed Items
- `openStudyPlatform()` nhận thêm options `target` và `returnTo`.
- Với route redirect nội bộ, dùng `openStudyPlatform({ target: '_self' })` để current tab đi qua SSO handoff thật thay vì redirect thẳng sang login thường.
- `StudyPlatformRedirect` không còn dùng `ExternalRedirect` nữa; thay bằng loading state tại chỗ trong khi chờ handoff.
- Route `/dashboard/online-classes` giờ trả `returnTo = '/#/student-classes'`; các route học tập khác giữ `'/#/student-learning'`.
- Frontend build pass và đã deploy Pages preview mới `https://f0f5833a.vantrangedu.pages.dev`.

### Updated
2026-04-13 22:52:00 +07:00

## Session: 2026-04-11 — Redesign exam student list modal for balance and responsive sizing

### Status: COMPLETED

### Mô tả
User thấy modal/sheet `Danh sách thí sinh` ở module `Lịch thi` quá chật và mất cân đối. Đã redesign lại theo hướng modal rộng hơn, summary rõ ràng hơn, toolbar co giãn tốt hơn, list card gọn và dễ đọc hơn, đồng thời tối ưu auto-resize cho desktop, tablet và mobile overlay.

### Files thay đổi
- `frontend/src/pages/admin/desktop/ExamSchedulesPage.tsx`
- `frontend/src/pages/admin/mobile/MobileExamSchedulesModule.tsx`
- `.serena/memories/30-active-work.md`
- `.serena/memories/40-decisions.md`
- `.serena/memories/50-verification.md`

### Completed Items
- Modal desktop `Danh sách thí sinh` đổi sang shell lớn hơn, responsive theo viewport, header có summary cards và action close rõ hơn.
- Tabs được redesign thành card-like segmented controls thay vì thanh tab phẳng cũ.
- Toolbar desktop được sắp lại để search, filter, và action buttons không chèn ép nhau ở màn vừa.
- Vùng nội dung desktop chuyển sang `flex-1` + scroll nội bộ, bỏ giới hạn `50vh` cũ gây bí nội dung.
- Card thí sinh `Đã duyệt` và `Chờ duyệt` được bố cục lại với metadata boxes, spacing thoáng và action rõ ràng hơn.
- Mobile exam detail sheet hỗ trợ centered modal trên màn lớn/tablet, stats cân đối hơn và header/action spacing thoáng hơn.
- Frontend build pass và đã deploy Pages preview mới `https://3627458f.vantrangedu.pages.dev`.

### Updated
2026-04-11 15:27:49 +07:00

## Session: 2026-04-11 — Compact exam student modal header to show more students

### Status: COMPLETED

### Mô tả
User yêu cầu phần đầu của modal `Danh sách thí sinh` desktop nhỏ lại khoảng 40% để thấy được nhiều học viên hơn ở phần dưới. Đã nén riêng header, stats, tabs và toolbar của modal desktop mà không thay đổi luồng chức năng.

### Files thay đổi
- `frontend/src/pages/admin/desktop/ExamSchedulesPage.tsx`
- `.serena/memories/30-active-work.md`
- `.serena/memories/40-decisions.md`
- `.serena/memories/50-verification.md`

### Completed Items
- Giảm padding, font size và khoảng cách của header gradient.
- Thu gọn 4 summary cards thành dạng compact hơn, giảm chiều cao đáng kể.
- Thu nhỏ tabs, count badges, search bar, action buttons và filter pills ở toolbar.
- Bỏ dòng helper dư ở toolbar để nhường thêm không gian cho danh sách học viên.
- Frontend build pass.
- Frontend đã deploy preview mới `https://ab96af79.vantrangedu.pages.dev` và production `vantrangedu.com` trả `200 OK`.

### Updated
2026-04-11 15:35:47 +07:00

## Session: 2026-04-11 — Redesign learning management workspace pages and sidebar

### Status: COMPLETED

### Mô tả
User yêu cầu redesign toàn bộ cụm page trong menu `Quản lý học tập` cho đẹp mắt, cân đối và thông minh hơn. Đã thực hiện một pass đồng bộ theo hướng workspace-level: sidebar desktop mới, top bar mới, shared learning header shell, và refresh giao diện cho `Lịch thi`, `Học viên`, `Lớp học` (wrapper + online + legacy), `Chương trình tổng`.

### Files thay đổi
- `frontend/src/pages/admin/shared/LearningWorkspaceHeader.tsx`
- `frontend/src/components/layout/AdminSidebar.tsx`
- `frontend/src/components/layout/AdminLayout.tsx`
- `frontend/src/pages/admin/desktop/ExamSchedulesPage.tsx`
- `frontend/src/pages/admin/desktop/StudentsManagement.tsx`
- `frontend/src/pages/admin/desktop/UnifiedClassesManagement.tsx`
- `frontend/src/pages/admin/desktop/ClassesManagement.tsx`
- `frontend/src/pages/admin/desktop/OnlineClassesManagement.tsx`
- `frontend/src/pages/admin/desktop/ProgramPlatformPage.tsx`
- `.serena/memories/30-active-work.md`
- `.serena/memories/40-decisions.md`
- `.serena/memories/50-verification.md`

### Completed Items
- Tạo shared component `LearningWorkspaceHeader` để gom title/description/actions/pills/stats theo cùng một visual language.
- Redesign desktop `AdminSidebar` sang style card-group mềm hơn, active state rõ hơn, header/sidebar branding gọn hơn.
- Redesign desktop top bar trong `AdminLayout` để khớp ngôn ngữ mới của workspace.
- `ExamSchedulesPage` đổi hero, pills, stats và toolbar sang layout thống nhất, vẫn giữ nguyên luồng nghiệp vụ hiện có.
- `StudentsManagement` đổi sang workspace hero mới và bỏ stats bar lặp trong main card để đỡ rối.
- `UnifiedClassesManagement` thêm hero chung + mode switch rõ ràng cho online/legacy.
- `ClassesManagement` và `OnlineClassesManagement` được làm lại stats shell, toolbar và card style để bớt cảm giác “template cũ”.
- `ProgramPlatformPage` được đưa vào `admin-page` + shared hero mới và panel shell cao cấp hơn.
- Frontend build pass, Pages production đã deploy, preview URL `https://b4418f4c.vantrangedu.pages.dev`.

### Updated
2026-04-11 16:01:26 +07:00

## Session: 2026-04-11 — Stronger visual redesign for learning workspace shell and exam cards

### Status: COMPLETED

### Mô tả
Sau khi user xem production và phản hồi “không thấy khác mấy”, thực hiện một pass mạnh tay hơn tập trung vào những phần nhìn thấy ngay trên `Lịch thi`: hero shell đổi sang gradient đậm, pills/stats glass style, card lịch thi đổi bề mặt/layout rõ hơn, sidebar active state nổi bật hơn.

### Files thay đổi
- `frontend/src/pages/admin/shared/LearningWorkspaceHeader.tsx`
- `frontend/src/pages/admin/desktop/ExamSchedulesPage.tsx`
- `frontend/src/components/layout/AdminSidebar.tsx`
- `.serena/memories/30-active-work.md`
- `.serena/memories/40-decisions.md`
- `.serena/memories/50-verification.md`

### Completed Items
- `LearningWorkspaceHeader` đổi từ light shell sang gradient/tinted shell mạnh hơn theo tone, text/pill/stat chuyển sang glass style để nhìn khác hẳn.
- `ExamSchedulesPage` card lịch thi đổi sang surface nổi khối hơn, meta blocks rõ hơn, footer action rõ hơn và toàn trang nhìn đậm hơn.
- `AdminSidebar` active state chuyển sang full gradient button thay vì chỉ tint nhẹ.
- Frontend build pass và Pages production đã deploy, preview URL `https://d1ebdecd.vantrangedu.pages.dev`.

### Updated
2026-04-11 16:09:53 +07:00

## Session: 2026-04-11 — Bring mobile admin learning workspace up to desktop quality

### Status: COMPLETED

### Mô tả
User yêu cầu làm toàn bộ phần mobile tốt như desktop. Đã thực hiện một pass mobile-first rộng hơn: nâng shared mobile hero/stat/button/bottom-sheet, redesign mobile admin header/drawer/bottom nav, và áp dụng cho các module mobile chính `Lịch thi`, `Học viên`, `Lớp học`, `Học phí`, `Tổng quan`.

### Files thay đổi
- `frontend/src/pages/admin/shared/mobileAdminUi.tsx`
- `frontend/src/components/layout/AdminMobileLayout.tsx`
- `frontend/src/components/layout/AdminMobileLayout.css`
- `frontend/src/styles/MobileDesignSystem.css`
- `frontend/src/pages/admin/mobile/MobileExamSchedulesModule.tsx`
- `frontend/src/pages/admin/mobile/MobileStudentsModule.tsx`
- `frontend/src/pages/admin/mobile/MobileClassesModule.tsx`
- `frontend/src/pages/admin/mobile/MobilePaymentsModule.tsx`
- `frontend/src/pages/admin/mobile/MobileDashboardOverview.tsx`
- `.serena/memories/30-active-work.md`
- `.serena/memories/40-decisions.md`
- `.serena/memories/50-verification.md`

### Completed Items
- `mobileAdminUi` đổi sang ngôn ngữ gradient/glass mạnh hơn, đồng bộ với desktop shell mới.
- `AdminMobileLayout` và CSS mobile shell đổi header, drawer, active nav, bottom nav để nhìn cao cấp và rõ active state hơn.
- `MobileExamSchedulesModule` hero và `ExamCard` được làm lại mạnh tay hơn thay vì chỉ chỉnh nhẹ phần trên.
- `MobileStudentsModule` hero và `StudentCard` được nâng cấp để nhìn chắc và có nhiều hierarchy hơn.
- `MobileClassesModule` hero và `ClassCard` được nâng cấp để gần với chất lượng desktop hơn.
- `MobilePaymentsModule` hero và `PaymentCard` được nâng cấp để rõ số tiền/trạng thái và action hơn.
- `MobileDashboardOverview` được kéo về cùng ngôn ngữ mobile shell mới.
- Frontend build pass và Pages production đã deploy, preview URL `https://739160e8.vantrangedu.pages.dev`.

### Updated
2026-04-11 16:26:43 +07:00

## Session: 2026-04-11 — Mobile balance pass for iPhone and Android ergonomics

### Status: COMPLETED

### Mô tả
User phản hồi mobile vẫn còn xấu và mất cân đối. Đã thực hiện thêm một pass cân chỉnh chuyên cho mobile ergonomics: safe-area iPhone, đáy content/nav/FAB, hero action wrapping, filter/search clash, upcoming exam hero body, và nhịp card/dashboard trên màn hẹp Android/iPhone.

### Files thay đổi
- `frontend/src/pages/admin/shared/mobileAdminUi.tsx`
- `frontend/src/components/layout/AdminMobileLayout.css`
- `frontend/src/pages/admin/mobile/MobileClassesModule.tsx`
- `frontend/src/pages/admin/mobile/MobilePaymentsModule.tsx`
- `frontend/src/pages/admin/mobile/MobileDashboardOverview.tsx`
- `.serena/memories/30-active-work.md`
- `.serena/memories/40-decisions.md`
- `.serena/memories/50-verification.md`

### Completed Items
- `MobileAdminHeroCard` giờ render `children`, chuyển action xuống dưới title để bớt vỡ hàng trên máy hẹp.
- `MobileAdminBottomSheet`, content padding và FAB offset đã cộng `safe-area-inset` để đỡ cấn trên iPhone.
- `AdminMobileLayout.css` sửa header/content theo safe-area thực tế thay vì chỉ padding wrapper.
- `MobileClassesModule` và `MobilePaymentsModule` tách filter button khỏi search field để bỏ vùng chạm chồng nhau.
- `MobileDashboardOverview` thêm quick action thứ 6 để grid đều hơn và chuyển timestamp của học viên mới xuống dòng phụ.
- Build pass, Pages production đã deploy, preview URL `https://646a4451.vantrangedu.pages.dev`.

### Updated
2026-04-11 16:43:51 +07:00

## Session: 2026-04-11 — Adaptive device and resolution-driven admin layout system

### Status: COMPLETED

### Mô tả
User yêu cầu hệ thống tự detect thiết bị và độ phân giải để auto cân chỉnh giao diện. Đã thêm lớp adaptive runtime ở frontend: nhận diện platform, viewport width/height/orientation, suy ra viewport bucket và bơm CSS variables cho mobile/desktop shells để UI co giãn đồng đều hơn thay vì chỉ dựa vào breakpoint tĩnh.

### Files thay đổi
- `frontend/src/utils/deviceDetection.ts`
- `frontend/src/main.tsx`
- `frontend/src/components/layout/AdminMobileLayout.tsx`
- `frontend/src/components/layout/AdminLayout.tsx`
- `frontend/src/components/layout/AdminSidebar.tsx`
- `frontend/src/styles/admin/AdminModern.css`
- `.serena/memories/30-active-work.md`
- `.serena/memories/40-decisions.md`
- `.serena/memories/50-verification.md`

### Completed Items
- `deviceDetection.ts` được mở rộng thành hệ adaptive: trả về `platform`, `screenSize`, `orientation`, `viewportBucket`, `width`, `height`, `isTouch`, `devicePixelRatio`.
- Thêm `initAdaptiveViewport()` để tự cập nhật CSS variables theo `resize`, `orientationchange`, `visualViewport`.
- Mobile root font scale, spacing scale, touch scale, radius scale, layout scale và bottom-nav height giờ được set động theo `compact-phone/phone/large-phone/tablet`.
- Desktop admin shell giờ tự chỉnh `sidebar width`, `topbar height`, `page padding`, `page max width` theo `desktop-compact/desktop/desktop-wide`.
- Gỡ root font-size override cứng trong `AdminMobileLayout` để không còn phá adaptive runtime.
- Frontend build pass và Pages production đã deploy, preview URL `https://fdd7006d.vantrangedu.pages.dev`.

### Updated
2026-04-11 16:56:45 +07:00

## Session: 2026-04-11 — Compact admin mode for mobile and desktop headers

### Status: COMPLETED

### Mô tả
User yêu cầu chuyển sang kiểu `compact admin`, thực dụng hơn và ít mô tả. Đã nén tiếp shared mobile admin UI, giảm density scale mobile toàn cục, thu nhỏ header top bar mobile, hero admin mobile, sheet header mobile; đồng thời desktop vẫn giữ adaptive shell nhưng đi theo hướng gọn và ít mô tả.

### Files thay đổi
- `frontend/src/utils/deviceDetection.ts`
- `frontend/src/pages/admin/shared/mobileAdminUi.tsx`
- `frontend/src/styles/MobileDesignSystem.css`
- `frontend/src/pages/admin/mobile/MobileExamSchedulesModule.tsx`
- `.serena/memories/30-active-work.md`
- `.serena/memories/40-decisions.md`
- `.serena/memories/50-verification.md`

### Completed Items
- Giảm mạnh mobile density scale theo viewport bucket để toàn bộ mobile bớt phình.
- `MobileAdminHeroCard` chuyển sang compact hero: icon nhỏ, title nhỏ, button thấp hơn, spacing ngắn hơn.
- `MobileAdminSectionCard`, `MobileAdminStatCard`, `MobileAdminSearchField`, primary/secondary button đều được nén tiếp.
- `MobileDesignSystem.css` thu nhỏ top mobile header kicker/heading.
- `MobileExamSchedulesModule` sheet header chi tiết được nén tiếp để thấy nhiều nội dung hơn.
- Frontend build pass và production vẫn trả `200 OK` sau deploy.

### Updated
2026-04-11 17:18:14 +07:00

## Session: 2026-04-11 — Remove all admin header descriptions

### Status: COMPLETED

### Mô tả
User yêu cầu bỏ hết mô tả. Đã loại bỏ render description khỏi shared admin headers cho cả desktop và mobile để toàn bộ các page dùng shell chung tự gọn lại.

### Files thay đổi
- `frontend/src/pages/admin/shared/LearningWorkspaceHeader.tsx`
- `frontend/src/pages/admin/shared/mobileAdminUi.tsx`
- `.serena/memories/30-active-work.md`
- `.serena/memories/40-decisions.md`
- `.serena/memories/50-verification.md`

### Completed Items
- Desktop shared header không còn render description.
- Mobile shared hero header không còn render description.
- Frontend build pass và production vẫn trả `200 OK` sau deploy.

### Updated
2026-04-11 17:27:41 +07:00

## Session: 2026-04-11 — Admin overlay stacking audit and modal UX stabilization

### Status: COMPLETED

### Mô tả
User báo một số lớp UI bị che phía sau trong admin, gồm modal xác nhận và control học phí trong modal danh sách thí sinh. Thực hiện một pass audit theo pattern overlay/modal ở admin, sửa các điểm bị render inline trong shell và thay control học phí khỏi native select để tránh clipping trong modal.

### Files thay đổi
- `frontend/src/components/ui/OverlayPortal.tsx`
- `frontend/src/components/ui/ConfirmDialog.tsx`
- `frontend/src/pages/admin/desktop/StudentsManagement.tsx`
- `frontend/src/pages/admin/desktop/ClassDetailDashboard.tsx`
- `frontend/src/components/admin/GlobalSearch.tsx`
- `frontend/src/components/profile/StudentProfileEditor.tsx`
- `frontend/src/pages/admin/shared/mobileAdminUi.tsx`
- `frontend/src/pages/admin/desktop/ExamSchedulesPage.tsx`
- `frontend/src/pages/admin/mobile/MobileExamSchedulesModule.tsx`
- `.serena/memories/30-active-work.md`
- `.serena/memories/40-decisions.md`
- `.serena/memories/50-verification.md`

### Completed Items
- Thêm `OverlayPortal` để portal các overlay custom lên `document.body` và tái dùng overlay lock.
- `ConfirmDialog` không còn render inline trong page tree nên không bị header/sidebar/content shell đè lớp.
- Portal hóa thêm các overlay custom có rủi ro cao trong admin: bulk delete học viên, báo cáo học viên, global search, student profile editor, mobile admin full-screen sheet, import lịch học từ ảnh, tạo buổi học mới.
- Ở `ExamSchedulesPage` và `MobileExamSchedulesModule`, thay native `select` học phí của thí sinh đã duyệt bằng button group 2 trạng thái để tránh dropdown bị che/clipped trong modal scroll + transformed container.
- Pending rows vẫn giữ badge `Chưa xác định` không tương tác.
- Mở rộng pass audit ra toàn frontend: portal hóa thêm `AddStudentModal`, `MyExamsPage`, `MySchedulePage`, `UnifiedLogin`, `ExitIntentModal`, shared student sheet, `MobileCertificatesModule`, `MobileAttendanceModule`, `MobileDocumentsModule`, `MobileAssignmentsModule`, `MobileSimpleModules`, `MobileMyScheduleModule`, và các sheet còn lại trong `MobileExamSchedulesModule`.
- Sau grep lại, các `fixed inset-0` còn lại chủ yếu là overlay/sidebar/filter có chủ đích hoặc component đã portal hóa; không còn nhóm modal chính nào còn render inline với `z-50` thấp như trước.
- Frontend production đã deploy lại sau pass audit mở rộng này.
- Bổ sung `overlay layer` động theo thứ tự mở cho `Dialog`, `OverlayPortal`, `MobileAdminBottomSheet`, `StudentFormModal`, `StudentDetailModal`, và `MobileStudentsModule` để modal mở sau luôn nằm trên modal mở trước.
- Fix trực tiếp bug user báo: bấm icon xóa trong modal `Danh sách thí sinh` giờ confirm dialog sẽ nổi lên ngay trên modal hiện tại thay vì bị chìm phía sau và chỉ lộ ra sau khi đóng modal cha.

### Updated
2026-04-11 02:11 +07:00

## Session: 2026-04-11 — Add unknown exam fee state and lock workflow-specific options

### Status: COMPLETED

### Mô tả
User yêu cầu phần học phí trong danh sách thí sinh của `Lịch thi` có thêm trạng thái `Chưa xác định`, sau đó chốt lại rule vận hành: `Chờ duyệt` luôn để `Chưa xác định`, còn `Đã duyệt` chỉ còn `Đã nộp học phí` hoặc `Chưa nộp học phí`.

### Files thay đổi
- `frontend/src/pages/admin/desktop/ExamSchedulesPage.tsx`
- `frontend/src/pages/admin/mobile/MobileExamSchedulesModule.tsx`
- `backend/src/db/attendance-queries.ts`
- `backend/src/db/attendance-queries.js`
- `backend/migrations/0043_exam_registration_payment_status_by_workflow.sql`
- `backend/src/routes/exam-schedules.ts`
- `backend/src/routes/exam-schedules.js`
- `.serena/memories/30-active-work.md`
- `.serena/memories/40-decisions.md`
- `.serena/memories/50-verification.md`

### Completed Items
- Desktop/mobile admin exam schedules đổi badge học phí từ nút toggle sang rule theo workflow: tab `Chờ duyệt` luôn hiển thị `Chưa xác định`, tab `Đã duyệt` chỉ cho chọn `Đã nộp học phí` hoặc `Chưa nộp học phí`.
- Frontend normalize `payment_status` mặc định về `unknown` thay vì `paid`, và approved rows fallback về `unpaid` nếu DB chưa có marker.
- Backend route `PUT /exam-schedules/:id/students/:studentId/payment-status` chấp nhận thêm giá trị `unknown`.
- Backend lưu trạng thái `unknown` dưới dạng `NULL` để tương thích schema/check constraint hiện có, tránh phải rebuild bảng chỉ để mở rộng enum.
- `registerStudentForExam` giờ ghi `NULL` cho đăng ký pending và `unpaid` cho đăng ký được admin thêm trực tiếp vào approved.
- Duyệt 1 hoặc duyệt tất cả pending sẽ tự đổi marker `NULL` sang `unpaid`.
- Migration production `0043_exam_registration_payment_status_by_workflow.sql` đã chạy để reset pending rows về `NULL` và bù approved null sang `unpaid`.
- Deployment: backend Worker production và frontend Pages production đã deploy lại xong từ worktree hiện tại theo yêu cầu user.

### Updated
2026-04-11 01:29 +07:00

## Session: 2026-04-10 — Center all admin dialogs via portal and default exam fee marker to paid

### Status: COMPLETED

### Mô tả
User phản hồi modal admin vẫn bị neo thấp/không cân giữa viewport ở zoom 100%, đồng thời muốn mặc định badge học phí ở lịch thi là `Đã nộp học phí`. Sửa `Dialog` dùng portal toàn cục để mọi dialog desktop canh giữa thật sự theo viewport, đổi fallback/default payment marker của `exam_registrations` sang `paid`, migrate dữ liệu production hiện có, rồi deploy backend + frontend.

### Files thay đổi
- `frontend/src/components/ui/Dialog.tsx`
- `frontend/src/pages/admin/desktop/ExamSchedulesPage.tsx`
- `frontend/src/pages/admin/mobile/MobileExamSchedulesModule.tsx`
- `backend/src/db/attendance-queries.ts`
- `backend/src/db/attendance-queries.js`
- `backend/migrations/0041_exam_registration_payment_status.sql`
- `backend/migrations/0042_exam_registration_payment_default_paid.sql`
- `.serena/memories/30-active-work.md`
- `.serena/memories/40-decisions.md`
- `.serena/memories/50-verification.md`

### Completed Items
- `Dialog` render qua `createPortal(document.body)` để các modal desktop không còn phụ thuộc layout ancestor và được canh giữa theo viewport.
- `ExamSchedulesPage` và `MobileExamSchedulesModule` coi trạng thái không khai báo là `paid`; chỉ `unpaid` mới hiện đỏ.
- Backend đổi fallback app-layer của `exam_registrations.payment_status` từ `unpaid` sang `paid`.
- `registerStudentForExam` ghi đè `payment_status = 'paid'` cho đăng ký thi mới/re-activate.
- Production D1 migration `0042_exam_registration_payment_default_paid.sql` đã chạy để đổi các marker hiện có từ mặc định đỏ sang mặc định xanh.
- Backend Worker và frontend Pages production đã deploy xong.

### Updated
2026-04-10 02:08 +07:00

## Session: 2026-04-10 — Force student edit form to render as true overlay modal

### Status: COMPLETED

### Mô tả
User phản hồi modal `Sửa học viên` vẫn xuất hiện như một khối trượt xuống trong flow của trang thay vì nổi hẳn như overlay. Sửa `StudentFormModal` để render qua `createPortal(document.body)` và canh giữa viewport bằng container fixed + flex center, giữ luôn cơ chế khóa scroll nền hiện có.

### Files thay đổi
- `frontend/src/pages/admin/desktop/students/StudentFormModal.tsx`
- `.serena/memories/30-active-work.md`
- `.serena/memories/40-decisions.md`
- `.serena/memories/50-verification.md`

### Completed Items
- `StudentFormModal` chuyển sang render bằng portal để không còn bị ảnh hưởng bởi layout/stacking/transform của trang `StudentsManagement`.
- Overlay modal được canh giữa viewport và tăng `z-index` để hiển thị đúng như modal desktop chuẩn.
- Verification: `cd frontend && npm run build` pass.

### Updated
2026-04-10 02:00 +07:00

## Session: 2026-04-10 — Admin-wide UI normalization, overlay scroll lock, and class mode logic cleanup

### Status: COMPLETED

### Mô tả
Sau phản hồi user về admin bị rối và modal học viên gây scroll sai, thực hiện một đợt chuẩn hóa rộng hơn trên admin desktop/mobile: thêm shell/header dùng chung, khóa scroll nền cho overlay, tách modal học viên theo pane thao tác, chuẩn hóa mobile hero/actions/stats cho các module chính, và sửa logic tab `Lớp học` để không còn chỉ hiển thị lớp online một cách mơ hồ.

### Files thay đổi
- `frontend/src/components/ui/overlay-lock.ts`
- `frontend/src/components/ui/Dialog.tsx`
- `frontend/src/components/layout/AdminLayout.tsx`
- `frontend/src/components/layout/AdminMobileLayout.css`
- `frontend/src/styles/admin/AdminModern.css`
- `frontend/src/pages/admin/shared/AdminPageHeader.tsx`
- `frontend/src/pages/admin/shared/mobileAdminUi.tsx`
- `frontend/src/pages/admin/desktop/students/StudentFormModal.tsx`
- `frontend/src/pages/admin/desktop/students/StudentDetailModal.tsx`
- `frontend/src/pages/admin/desktop/UnifiedClassesManagement.tsx`
- `frontend/src/pages/admin/desktop/DashboardOverview.tsx`
- `frontend/src/pages/admin/desktop/ActivityLogs.tsx`
- `frontend/src/pages/admin/desktop/PostsManagement.tsx`
- `frontend/src/pages/admin/desktop/AdminManagement.tsx`
- `frontend/src/pages/admin/desktop/CertificatesManagement.tsx`
- `frontend/src/pages/admin/desktop/PaymentsManagement.tsx`
- `frontend/src/pages/admin/desktop/BackupPage.tsx`
- `frontend/src/pages/admin/desktop/BackupPage.css`
- `frontend/src/pages/admin/desktop/HomepageManagement.tsx`
- `frontend/src/pages/admin/desktop/HomepageManagement.css`
- `frontend/src/pages/admin/desktop/DocumentsManagement.css`
- `frontend/src/pages/admin/mobile/MobileStudentsModule.tsx`
- `frontend/src/pages/admin/mobile/MobileClassesModule.tsx`
- `frontend/src/pages/admin/mobile/MobilePaymentsModule.tsx`
- `frontend/src/pages/admin/desktop/components/ClassRegistrations.tsx`
- `frontend/src/pages/admin/desktop/components/ClassSchedules.tsx`
- `.serena/memories/30-active-work.md`
- `.serena/memories/40-decisions.md`
- `.serena/memories/50-verification.md`

### Completed Items
- Thêm `overlay-lock` dùng chung và áp vào `Dialog` + các modal học viên để chặn scroll nền/nested scroll khi overlay mở.
- `StudentFormModal` đổi từ form dài 2 cột sang 2 pane `Hồ sơ học viên` / `Ảnh & CCCD`, giảm việc phải cuộn sâu trong modal.
- `StudentDetailModal` chuyển sang cùng cơ chế khóa scroll nền.
- Desktop top bar admin đổi sang dạng context bar nhẹ hơn: hiển thị group + title module thay vì trùng cấp với hero nội dung.
- Thêm `AdminPageHeader` dùng chung và áp vào các trang trọng yếu: tổng quan, nhật ký, bài viết, quản lý admin, chứng chỉ, thanh toán, sao lưu, trang chủ.
- Thêm `mobileAdminUi` dùng chung và áp vào các module mobile trọng yếu: học viên, lớp học, thanh toán.
- Chuẩn hóa spacing bottom/floating action trên mobile bằng `mobileAdminContentPadding` và FAB theo `--mb-bottom-nav-height`.
- `UnifiedClassesManagement` giờ có 2 mode rõ ràng `Lớp online` / `Lớp legacy` thay vì tab `Lớp học` nhưng thực tế chỉ render online classes.
- Sửa import path cũ trong `ClassRegistrations` / `ClassSchedules` để build pass khi bật lại mode lớp legacy.
- Nâng style các trang legacy/ẩn (`BackupPage`, `HomepageManagement`, `DocumentsManagement`) để bám gần hơn hệ `AdminModern`.
- Deployment: frontend Pages production đã deploy sau đợt chuẩn hóa admin; smoke check `vantrangedu.com`, `vantrangedu.pages.dev`, và preview URL pass.

### Updated
2026-04-10 01:52 +07:00

## Session: 2026-04-10 — Simplify admin students page layout and student edit modal

### Status: COMPLETED

### Mô tả
Sau khi user phản hồi giao diện `Học viên` trong admin quá rối, đặc biệt ở modal `Sửa học viên`, rà lại toàn bộ flow desktop và gọn hóa cả trang quản lý lẫn modal chỉnh sửa để dễ quét hơn, tránh tràn viewport và giảm cảm giác dồn thông tin.

### Files thay đổi
- `frontend/src/pages/admin/desktop/StudentsManagement.tsx`
- `frontend/src/pages/admin/desktop/students/StudentFormModal.tsx`
- `.serena/memories/30-active-work.md`
- `.serena/memories/50-verification.md`

### Completed Items
- `StudentsManagement` header gọn lại, thêm pills trạng thái tổng quan và toolbar tìm kiếm rõ nhịp hơn.
- `StudentFormModal` đổi sang cấu trúc modal cao an toàn theo viewport, body cuộn độc lập, footer luôn hiện.
- Form được chia thành các card section rõ ràng: thông tin cá nhân, liên hệ, giấy tờ/tài khoản.
- Khu upload ảnh chuyển thành sidebar riêng, uploader không còn dồn 2 cột chật như trước.
- `BirthPlaceField` được tách thành hàng riêng để không làm lệch nhịp toàn bộ hàng input.
- Verification: `cd frontend && npm run build` pass.
- Deployment: frontend Pages production đã deploy từ worktree hiện tại theo yêu cầu user; smoke check `vantrangedu.com`, `vantrangedu.pages.dev`, và preview URL pass.

### Updated
2026-04-10 01:11 +07:00

## Session: 2026-04-09 — Add admin-only exam fee marker in exam schedules

### Status: COMPLETED

### Mô tả
Theo yêu cầu user, thêm nút/nhãn đánh dấu học phí ngay trong danh sách thí sinh của lịch thi admin. Trạng thái `Chưa nộp học phí` hiển thị đỏ, `Đã nộp học phí` hiển thị viền/trạng thái xanh-trắng; chỉ admin/super_admin nhìn thấy và có thể bấm đổi trạng thái. Backend lưu marker này riêng cho `exam_registrations` và export exam-list cũng đọc cùng nguồn dữ liệu.

### Files thay đổi
- `backend/migrations/0041_exam_registration_payment_status.sql`
- `backend/src/db/attendance-queries.ts`
- `backend/src/db/attendance-queries.js`
- `backend/src/routes/exam-schedules.ts`
- `backend/src/routes/exam-schedules.js`
- `frontend/src/services/api-exam-schedule-methods.ts`
- `frontend/src/pages/admin/desktop/ExamSchedulesPage.tsx`
- `frontend/src/pages/admin/mobile/MobileExamSchedulesModule.tsx`
- `.serena/memories/30-active-work.md`
- `.serena/memories/40-decisions.md`
- `.serena/memories/50-verification.md`

### Completed Items
- Thêm API `PUT /exam-schedules/:id/students/:studentId/payment-status` để admin đổi marker học phí của đăng ký thi.
- Truy vấn exam registrations/export trả `payment_status` và fallback an toàn về `unpaid` khi DB test/dev chưa chạy migration mới.
- Desktop `ExamSchedulesPage` hiển thị badge toggle học phí cho cả tab đã duyệt và chờ duyệt, chỉ dành cho admin/super_admin.
- Mobile `MobileExamSchedulesModule` đồng bộ cùng behavior để không lệch tính năng giữa 2 giao diện admin.
- Tinh gọn UI/UX trước deploy: badge học phí rút gọn label, có tooltip, và header badge desktop cho phép wrap để tránh vỡ dòng.
- Verification: frontend build pass; backend export route tests pass; full backend Vitest vẫn còn fail ở một số test legacy không liên quan đến thay đổi này.
- Deployment: migration `0041_exam_registration_payment_status.sql` đã chạy trên production D1; backend Worker và frontend Pages production đã deploy xong; smoke check `vantrangedu.com`, `vantrangedu.pages.dev`, và API root pass.

### Updated
2026-04-09 23:54 +07:00

## Session: 2026-04-09 — Remove noisy CCCD copy, allow partial OCR autofill, and unhide editor controls

### Status: COMPLETED

### Mô tả
Sau phản hồi user về ảnh CCCD rõ nhưng vẫn không tự điền và editor đang bị nhiều phần chữ/controls che chỗ thao tác, cập nhật cả frontend lẫn backend: bỏ copy thừa trong `DocumentSmartEditor`, nới flow OCR để tự điền theo phần đọc được, và tối ưu lại bố cục editor để controls/nút xác nhận ít bị ẩn hơn.

### Files thay đổi
- `frontend/src/components/upload/DocumentSmartEditor.tsx`
- `frontend/src/components/upload/DocumentSmartEditor.css`
- `frontend/src/pages/public/StudentRegistration.tsx`
- `frontend/src/utils/viewportFix.ts`
- `backend/src/routes/cccd-upload.ts`
- `backend/src/routes/cccd-upload.js`
- `.serena/memories/30-active-work.md`
- `.serena/memories/40-decisions.md`
- `.serena/memories/50-verification.md`

### Completed Items
- Bỏ các đoạn copy thừa trong `DocumentSmartEditor` theo yêu cầu user.
- Backend `/cccd-upload/extract` không còn trả `hasUsefulData: false` chỉ vì CCCD front/back còn thiếu 1 trường bắt buộc; thay vào đó trả `missingCriticalFields` để frontend vẫn tự điền phần đọc được.
- Frontend `StudentRegistration` áp dụng partial OCR autofill và chỉ nhắc user bổ sung phần còn thiếu, thay vì bỏ qua toàn bộ prefill.
- Editor CSS được siết lại để canvas/controls/nút xác nhận dễ thấy hơn, ít bị ẩn khi cuộn.
- `viewportFix` chỉ `preventDefault` khi `event.cancelable` để giảm spam console.
- Verification: frontend build pass, backend CCCD OCR tests 14/14 pass, smoke fetch frontend `/register` và API root pass.
- Deployment: production Cloudflare Pages + Workers deploy hoàn tất.

### Updated
2026-04-09 19:33 +07:00

## Session: 2026-04-09 — Clarify in UI that manual CCCD crop still runs OCR afterward

### Status: COMPLETED

### Mô tả
User hiểu nhầm rằng flow CCCD mới chỉ crop tay rồi xong luôn, không OCR nữa. Cập nhật copy và CTA trong `DocumentSmartEditor` để nói rõ sau khi xác nhận vùng CCCD, hệ thống vẫn OCR và tự điền thông tin.

### Files thay đổi
- `frontend/src/components/upload/DocumentSmartEditor.tsx`
- `.serena/memories/30-active-work.md`
- `.serena/memories/40-decisions.md`
- `.serena/memories/50-verification.md`

### Completed Items
- Sửa mô tả trong editor CCCD để nêu rõ OCR vẫn chạy sau bước crop tay.
- Đổi CTA chính thành `Xác nhận vùng CCCD và OCR`.
- Verification: frontend build pass.
- Deployment: frontend production Pages deploy hoàn tất.

### Updated
2026-04-09 18:56 +07:00

## Session: 2026-04-09 — Reduce false timeouts and strengthen production OCR for CCCD + 3x4

### Status: COMPLETED

### Mô tả
Rà lại production flow của `/register` sau phản hồi user về lỗi `Yêu cầu quá thời gian` và OCR sai. Sửa timeout frontend theo endpoint, tránh timeout giả ở 3x4 polling, và tối ưu backend OCR candidate order để ra kết quả nhanh/chính xác hơn trên production thật.

### Files thay đổi
- `frontend/src/services/api-request-engine.ts`
- `frontend/src/services/api-student-methods.ts`
- `frontend/src/components/upload/CCCDUploaderGenerateFirst.tsx`
- `backend/src/services/cccd-ocr-service.ts`
- `backend/src/services/cccd-ocr-service.js`
- `.serena/memories/30-active-work.md`
- `.serena/memories/40-decisions.md`
- `.serena/memories/50-verification.md`

### Completed Items
- Frontend request engine hỗ trợ `timeoutMs` theo request; `/cccd-upload/extract` được nới lên `120s`, `/students/register` lên `60s`.
- 3x4 polling không còn tự báo `quá thời gian cho phép` sau một mốc cố định; khi AI xử lý lâu hơn bình thường sẽ tiếp tục poll chậm thay vì tự fail.
- Backend OCR candidate arbitration ưu tiên các ảnh OCR-friendly (`text_priority`, `balanced`, `normalized`) trước và có early-exit khi đã có winner mạnh, để giảm thời gian và tăng độ ổn định.
- Verification: frontend build pass, backend CCCD OCR tests 14/14 pass, smoke fetch frontend `/register` và API root pass.
- Deployment: production Cloudflare Pages + Workers deploy hoàn tất.

### Updated
2026-04-09 18:52 +07:00

## Session: 2026-04-09 — Raise mobile upload/review sheets toward screen center for 3x4 and CCCD

### Status: COMPLETED

### Mô tả
Chuyển các modal mobile trong flow upload/review của `3x4` và `CCCD` từ kiểu dính đáy sang floating sheet nằm cao gần giữa màn hình để dễ nhìn, dễ thao tác hơn trên Android Chrome và iOS.

### Files thay đổi
- `frontend/src/components/upload/CCCDUploader.css`
- `.serena/memories/30-active-work.md`
- `.serena/memories/40-decisions.md`
- `.serena/memories/50-verification.md`

### Completed Items
- Đổi `photo guide`, `photo selection`, `full preview` mobile sang floating centered sheet.
- Tăng padding safe-area, bỏ cảm giác bị kẹt dưới mép màn hình.
- Áp dụng cùng kiểu trình bày cho cả 3x4 lẫn CCCD review modal.
- Verification: frontend build pass.
- Deployment: frontend production Pages deploy hoàn tất.

### Updated
2026-04-09 18:20 +07:00

## Session: 2026-04-09 — Improve mobile 3x4 upload UX end-to-end

### Status: COMPLETED

### Mô tả
Rà và nâng cấp riêng flow ảnh 3x4 trên mobile trong `/register`: thêm chụp selfie bằng camera trước, làm rõ hành động upload/chọn ảnh, tối ưu editor mobile, và cải tiến dialog chọn 3 ảnh AI cho màn hình nhỏ.

### Files thay đổi
- `frontend/src/components/upload/CCCDUploaderGenerateFirst.tsx`
- `frontend/src/components/upload/CCCDUploader.css`
- `frontend/src/components/upload/ImageEditorMobile.tsx`
- `.serena/memories/30-active-work.md`
- `.serena/memories/40-decisions.md`
- `.serena/memories/50-verification.md`

### Completed Items
- Thêm action `Chụp selfie` cho ảnh 3x4 trên mobile bằng `capture="user"` qua picker hệ thống.
- Tối ưu lại khu upload 3x4 mobile: template lớn hơn, action xếp dọc, có tip riêng cho mobile.
- Cải tiến dialog chọn 3 ảnh AI trên mobile: full-height hơn, header sticky, card preview lớn hơn, CTA to hơn.
- Thêm nút `Dùng ảnh đề xuất` để chọn nhanh phương án AI recommended trên mobile.
- Cập nhật text trong `ImageEditorMobile` để user biết cách kéo/chụm khi căn ảnh 3x4.
- Verification: frontend build pass.
- Deployment: frontend production Pages deploy hoàn tất.

### Updated
2026-04-09 14:40 +07:00

## Session: 2026-04-09 — Improve OCR on manual CCCD crops by sending OCR-safe variants after user confirmation

### Status: COMPLETED

### Mô tả
Giữ nguyên UX crop tay cho CCCD nhưng khôi phục các biến thể OCR-friendly ở hậu trường: sau khi học viên xác nhận crop, frontend tạo thêm `normalizedOriginal`, `ocrRestoreBalanced`, `ocrRestoreTextPriority` từ chính ảnh crop đó để backend OCR.space đọc nhiều candidate như PC hơn.

### Files thay đổi
- `frontend/src/components/upload/document-normalization.ts`
- `frontend/src/components/upload/DocumentSmartEditor.tsx`
- `frontend/src/components/upload/CCCDUploaderGenerateFirst.tsx`
- `.serena/memories/30-active-work.md`
- `.serena/memories/40-decisions.md`
- `.serena/memories/50-verification.md`

### Completed Items
- Thêm helper `buildManualCropOcrVariants` sinh OCR variants từ đúng `cropCanvas` user-confirmed, không dùng để hiển thị UI review.
- `DocumentSmartEditor` gửi lại `processingMeta` + `auxiliaryFiles` sau khi crop tay để backend OCR-space có nhiều candidate image hơn.
- `CCCDUploaderGenerateFirst` nhận lại payload mới nhưng vẫn dùng preview local của ảnh crop cho UI review.
- Verification: frontend build pass.
- Deployment: frontend production Pages deploy hoàn tất.

### Updated
2026-04-09 14:12 +07:00

## Session: 2026-04-09 — Add real touch drag/pinch zoom for mobile CCCD crop editor

### Status: COMPLETED

### Mô tả
Thêm gesture mobile thật cho `DocumentSmartEditor` để học viên có thể kéo bằng 1 ngón và chụm 2 ngón để zoom tay vào đúng ảnh CCCD khi crop trên điện thoại.

### Files thay đổi
- `frontend/src/components/upload/DocumentSmartEditor.tsx`
- `.serena/memories/30-active-work.md`
- `.serena/memories/40-decisions.md`
- `.serena/memories/50-verification.md`

### Completed Items
- Thêm touch handlers non-passive cho `touchstart`, `touchmove`, `touchend`, `touchcancel` trong `DocumentSmartEditor`.
- Hỗ trợ drag 1 ngón và pinch zoom 2 ngón với clamp theo khung crop.
- Đồng bộ state/refs để zoom-kéo mượt và không bị trôi state trên mobile.
- Cập nhật hướng dẫn ngay trong editor để user biết cách thao tác trên điện thoại.
- Verification: frontend build pass.
- Deployment: frontend production Pages deploy hoàn tất.

### Updated
2026-04-09 13:53 +07:00

## Session: 2026-04-09 — Web-only optimal CCCD flow: manual crop-first + stronger OCR.space

### Status: COMPLETED

### Mô tả
Làm lại luồng CCCD theo hướng web-thuần tối ưu nhất: frontend chỉ còn crop tay do học viên xác nhận, preview review bám đúng ảnh crop local, backend OCR.space được nâng chiến lược theo tài liệu hiện tại để vẫn giữ OCR sau bước crop.

### Files thay đổi
- `frontend/src/components/upload/DocumentSmartEditor.tsx`
- `frontend/src/components/upload/CCCDUploaderGenerateFirst.tsx`
- `frontend/src/utils/viewportFix.ts`
- `backend/src/services/cccd-ocr-service.ts`
- `backend/src/services/cccd-ocr-service.js`
- `backend/src/routes/cccd-upload.ts`
- `backend/src/routes/cccd-upload.js`
- `backend/src/test/services/cccd-ocr.test.ts`
- `.serena/memories/30-active-work.md`
- `.serena/memories/40-decisions.md`
- `.serena/memories/50-verification.md`

### Completed Items
- Frontend CCCD editor chuyển thành manual crop-only thật sự: không còn normalize/finalize pipeline trong bước xác nhận.
- Preview CCCD sau khi crop bám đúng object URL của file crop local; sửa runtime `setDocumentPreviewFromFile is not defined`.
- OCR.space strategy mới: `Engine 3 + auto` trước, sau đó `Engine 2 auto/vnm/eng`, `Engine 1 vnm/eng`, kèm `scale=true`, `detectOrientation=true`, `filetype=JPG`.
- Sửa mã tiếng Việt OCR.space từ `vie` sang `vnm` theo tài liệu OCR.space.
- Log backend cho flow mới dùng `generation_mode = manual_crop` khi không có processing meta từ AI/normalize.
- Verification: frontend build pass, backend CCCD OCR tests 14/14 pass.
- Deployment: frontend Pages và backend Worker production deploy hoàn tất; smoke fetch `/register` và API root pass.

### Updated
2026-04-09 13:44 +07:00

## Session: 2026-04-09 — Remove CCCD auto-normalize and switch to manual crop-only flow

### Status: COMPLETED

### Mô tả
Theo yêu cầu user, bỏ hẳn AI/auto normalize trong luồng CCCD. Học viên tự crop và căn chỉnh, ảnh gửi đi là đúng canvas crop đã xác nhận, không qua bước normalize/artifact OCR-safe nào nữa.

### Files thay đổi
- `frontend/src/components/upload/DocumentSmartEditor.tsx`
- `.serena/memories/30-active-work.md`
- `.serena/memories/40-decisions.md`
- `.serena/memories/50-verification.md`

### Completed Items
- Loại bỏ `normalizeDocumentSource` khỏi luồng mở editor CCCD.
- Loại bỏ `finalizeManualDocumentCanvas` khỏi bước xác nhận CCCD.
- Chuyển `DocumentSmartEditor` thành manual-only: không còn auto panel/AI preview trong flow chính.
- Ảnh upload sau xác nhận là đúng `canvasToFile(cropCanvas, type)` từ vùng học viên tự căn.
- Verification: frontend build pass.
- Deployment: frontend production Pages deploy hoàn tất.

### Updated
2026-04-09 13:15 +07:00

## Session: 2026-04-09 — Use client-side cropped CCCD image for review preview and fix passive touch warning

### Status: COMPLETED

### Mô tả
Sửa việc modal `Xem`/thumbnail của CCCD vẫn hiển thị ảnh lệch chéo sau khi crop-first: preview review của CCCD giờ bám theo file crop tay phía client, không dùng artifact OCR-safe restore từ backend. Đồng thời sửa passive `touchend` listener trong `viewportFix`.

### Files thay đổi
- `frontend/src/components/upload/CCCDUploaderGenerateFirst.tsx`
- `frontend/src/utils/viewportFix.ts`
- `.serena/memories/30-active-work.md`
- `.serena/memories/40-decisions.md`
- `.serena/memories/50-verification.md`

### Completed Items
- Thêm local object URL preview cho CCCD sau khi user xác nhận crop tay.
- Không cho preview backend OCR-safe ghi đè lên thumbnail/modal review của CCCD nữa.
- Sửa `touchend` thành non-passive để hết lỗi `Unable to preventDefault inside passive event listener`.
- Verification: frontend build pass.
- Deployment: frontend production Pages deploy hoàn tất.

### Updated
2026-04-09 13:09 +07:00

## Session: 2026-04-09 — Make mobile CCCD crop conservative enough to keep the full card

### Status: COMPLETED

### Mô tả
Sửa hiện tượng crop CCCD trên mobile bị cắt mép, nhất là phần dưới, bằng cách nới source quad/padding và giảm độ hung hãn của bước auto-trim sau khi normalize.

### Files thay đổi
- `frontend/src/components/upload/document-normalization.ts`
- `frontend/src/components/upload/DocumentSmartEditor.tsx`
- `.serena/memories/30-active-work.md`
- `.serena/memories/40-decisions.md`
- `.serena/memories/50-verification.md`

### Completed Items
- Tăng padding của `buildDocumentBoxFromCorners` để editor không auto-zoom quá sát vào CCCD.
- Tăng padding của `expandDetectedQuad`, nhất là hướng xuống cạnh dưới của thẻ.
- Làm `autoTrimAlignedDocumentCanvas` bảo thủ hơn: chỉ trim khi thật sự chắc tay và luôn để safety margin quanh mép thẻ.
- Verification: frontend build pass.
- Deployment: frontend production Pages deploy hoàn tất; smoke fetch `/register` pass.

### Updated
2026-04-09 12:08 +07:00

## Session: 2026-04-09 — Harden mobile/iOS CCCD flow (camera, viewport, touch, Safari export)

### Status: COMPLETED

### Mô tả
Rà và vá một pass riêng cho mobile/iOS trong luồng CCCD: camera Safari fallback, viewport `dvh`/safe-area, touch handling của editor, và fallback export JPEG khi `canvas.toBlob()` không ổn trên Safari.

### Files thay đổi
- `frontend/src/components/upload/CameraWithOverlay.tsx`
- `frontend/src/components/upload/CameraWithOverlay.css`
- `frontend/src/components/upload/DocumentSmartEditor.tsx`
- `frontend/src/components/upload/DocumentSmartEditor.css`
- `frontend/src/components/upload/ImageEditorMobile.tsx`
- `frontend/src/components/upload/ImageEditorMobile.css`
- `.serena/memories/30-active-work.md`
- `.serena/memories/40-decisions.md`
- `.serena/memories/50-verification.md`

### Completed Items
- Camera Safari/iOS: thêm dãy fallback constraints, bind stream chặt hơn (`playsinline`/`webkit-playsinline` + `video.play()`), clear `srcObject` khi stop.
- Chuẩn hóa viewport `dvh`/`--vh` + safe-area cho camera, mobile editor và `DocumentSmartEditor`.
- Thêm `orientationchange`/`visualViewport` redraw cho editor mobile và `DocumentSmartEditor`.
- Touch/gesture: thêm `preventDefault`, `touchcancel`, `pointercancel` để giảm lỗi kéo ảnh trên iOS.
- Safari JPEG export: thêm fallback `toDataURL -> blob -> File` khi `canvas.toBlob()` không trả blob.
- Verification: frontend build pass.
- Deployment: frontend production Pages deploy hoàn tất; smoke fetch `/register` pass.

### Updated
2026-04-09 11:55 +07:00

## Session: 2026-04-09 — Fix runtime crash in document-normalization (angleAt missing)

### Status: COMPLETED

### Mô tả
Sửa lỗi runtime `ReferenceError: angleAt is not defined` làm văng `DocumentSmartEditor` khi mở flow căn chỉnh CCCD.

### Files thay đổi
- `frontend/src/components/upload/document-normalization.ts`
- `.serena/memories/30-active-work.md`
- `.serena/memories/40-decisions.md`
- `.serena/memories/50-verification.md`

### Completed Items
- Bổ sung hàm `angleAt` còn thiếu trong `document-normalization.ts`.
- Verification: frontend build pass.
- Deployment: frontend production Pages deploy hoàn tất.

### Updated
2026-04-09 11:47 +07:00

## Session: 2026-04-09 — Tell users the normalize-first CCCD screen may take up to 3 minutes

### Status: COMPLETED

### Mô tả
Sửa text ngay trong modal `DocumentSmartEditor` để cả mobile và desktop đều nói rõ bước nhận diện/cân khung CCCD có thể mất tới 3 phút và người dùng không nên thoát ra.

### Files thay đổi
- `frontend/src/components/upload/DocumentSmartEditor.tsx`
- `.serena/memories/30-active-work.md`
- `.serena/memories/40-decisions.md`
- `.serena/memories/50-verification.md`

### Completed Items
- Cập nhật message trạng thái `checking` trong `DocumentSmartEditor`.
- Cập nhật text spinner ở giữa modal normalize-first.
- Verification: frontend build pass.
- Deployment: frontend production Pages deploy hoàn tất; smoke fetch `/register` pass.

### Updated
2026-04-09 11:43 +07:00

## Session: 2026-04-09 — Add explicit 3-minute wait notice for register upload processing

### Status: COMPLETED

### Mô tả
Thêm thông báo rõ ràng ở `/register` để người dùng biết upload ảnh CCCD/3x4 có thể mất tới 3 phút cho OCR và tự điền thông tin, tránh hiểu nhầm là hệ thống bị lỗi hoặc lag.

### Files thay đổi
- `frontend/src/pages/public/StudentRegistration.tsx`
- `frontend/src/styles/public/RegistrationFormA4.css`
- `.serena/memories/30-active-work.md`
- `.serena/memories/40-decisions.md`
- `.serena/memories/50-verification.md`

### Completed Items
- Thêm dòng nhắc cố định ngay trên khối upload ảnh ở `/register`.
- Đồng bộ lại subtitle của panel processing để nói rõ thời gian chờ có thể tới 3 phút và không nên thoát ra.
- Verification: frontend build pass.
- Deployment: frontend production Pages deploy hoàn tất; smoke fetch `/register` pass.

### Updated
2026-04-09 11:35 +07:00

## Session: 2026-04-09 — Upgrade OCR.space mobile CCCD path without switching providers

### Status: COMPLETED

### Mô tả
Nâng luồng OCR CCCD trên mobile nhưng vẫn chỉ dùng `OCR.space`: chuẩn hóa file CCCD ở frontend cho hợp ngưỡng OCR.space hơn, đồng thời nâng backend OCR.space để ưu tiên tiếng Việt và dùng URL mode cho ảnh lớn thay vì fail cứng.

### Files thay đổi
- `frontend/src/components/upload/CCCDUploaderGenerateFirst.tsx`
- `backend/src/services/cccd-ocr-service.ts`
- `backend/src/services/cccd-ocr-service.js`
- `backend/src/test/services/cccd-ocr.test.ts`
- `.serena/memories/30-active-work.md`
- `.serena/memories/40-decisions.md`
- `.serena/memories/50-verification.md`

### Completed Items
- Frontend: tối ưu file CCCD upload và các OCR restoration artifacts về profile thân thiện với `OCR.space` hơn, nhất là trên mobile.
- Backend OCR.space: thử `vie` trước `eng`, vẫn fallback engine/language đầy đủ, và ảnh >1MB chuyển sang `url` mode thay vì reject.
- Giữ nguyên chiến lược chỉ dùng `OCR.space`, không chuyển sang Google Vision hay provider khác.
- Verification: frontend build pass; backend `cccd-ocr` tests 14/14 pass.
- Deployment: deploy thành công cả frontend Pages và backend Worker; smoke fetch frontend `/register` và API root pass.

### Updated
2026-04-09 11:32 +07:00

## Session: 2026-04-09 — Improve mobile OCR by widening camera crop context and tolerating candidate conflicts

### Status: COMPLETED

### Mô tả
Tăng chất lượng OCR trên mobile bằng cách giữ thêm viền ngữ cảnh quanh CCCD khi chụp từ camera và nới arbitration backend để không fail oan khi các candidate OCR mâu thuẫn nhẹ nhưng có một candidate vượt trội rõ ràng.

### Files thay đổi
- `frontend/src/components/upload/CameraWithOverlay.tsx`
- `backend/src/services/cccd-ocr-service.ts`
- `.serena/memories/30-active-work.md`
- `.serena/memories/40-decisions.md`
- `.serena/memories/50-verification.md`

### Completed Items
- Camera mobile giờ crop rộng hơn quanh overlay thay vì cắt sát khung, giúp editor/OCR còn biên an toàn để nhận diện thẻ.
- Tăng camera constraints ưu tiên stream độ phân giải cao hơn trên mobile.
- Backend OCR candidate arbitration giờ chấp nhận winner mạnh nếu lead đủ lớn và đủ trường bắt buộc, thay vì fail ngay vì conflict nhỏ giữa các candidate.
- Verification: frontend build pass; `backend` OCR tests pass.
- Deployment: deploy thành công cả frontend Pages và backend Worker; smoke fetch frontend `/register` và API root pass.

### Updated
2026-04-09 11:01 +07:00

## Session: 2026-04-09 — Fix mobile CCCD auto-alignment picking full-frame zoom instead of card crop

### Status: COMPLETED

### Mô tả
Sửa pipeline chọn candidate và transform khởi tạo trong editor để mobile ưu tiên crop bám theo CCCD thật, tránh hiện tượng tự động “zoom cả ảnh” thay vì tập trung vào thẻ.

### Files thay đổi
- `frontend/src/components/upload/document-normalization.ts`
- `frontend/src/components/upload/DocumentSmartEditor.tsx`
- `.serena/memories/30-active-work.md`
- `.serena/memories/40-decisions.md`
- `.serena/memories/50-verification.md`

### Completed Items
- Nới logic chọn `autoRectified` candidate khi fallback native trông giống crop toàn khung (`native-frame`/`native-inset`) để tránh chọn nhầm full-frame zoom.
- Dùng chính `documentCorners` đã detect được để khởi tạo transform của `DocumentSmartEditor`, giúp mobile auto-zoom vào CCCD ổn định hơn.
- Chuẩn hóa việc dùng `naturalWidth`/`naturalHeight` trong editor để scale/translate khớp kích thước ảnh thật.
- Verification: frontend build pass.
- Deployment: frontend production Pages deploy hoàn tất; smoke fetch `/` và `/register` pass.

### Updated
2026-04-09 10:50 +07:00

## Session: 2026-04-09 — Tighten mobile register UX and deploy latest tolerant CCCD flow

### Status: COMPLETED

### Mô tả
Rà lại riêng UX mobile của `/register`, làm gọn/ổn định phần loading-progress sau pass trước và deploy production bản mới đã nới lỏng luồng CCCD.

### Files thay đổi
- `frontend/src/styles/public/RegistrationFormA4.css`
- `frontend/src/components/upload/CCCDUploader.css`
- `.serena/memories/30-active-work.md`
- `.serena/memories/40-decisions.md`
- `.serena/memories/50-verification.md`

### Completed Items
- Tối ưu panel progress fixed cho mobile: không chặn thao tác, có giới hạn chiều cao và hỗ trợ safe-area bottom.
- Thu gọn overlay processing bên trong uploader cho màn hình nhỏ để nội dung dễ đọc hơn.
- Verification: frontend build pass.
- Deployment: frontend production Pages deploy hoàn tất; smoke fetch `/` và `/register` của deployment mới trả về bình thường.

### Updated
2026-04-09 10:44 +07:00

## Session: 2026-04-09 — Make register processing unmistakable and stop blocking CCCD uploads on weak OCR

### Status: COMPLETED

### Mô tả
Sửa 2 điểm gây fail UX lớn ở `/register`: trạng thái chờ OCR/AI quá khó thấy trên mobile/desktop, và CCCD upload đang bị chặn quá mạnh khi OCR/crop không đạt kỳ vọng.

### Files thay đổi
- `frontend/src/pages/public/StudentRegistration.tsx`
- `frontend/src/components/upload/CCCDUploaderGenerateFirst.tsx`
- `frontend/src/components/upload/DocumentSmartEditor.tsx`
- `frontend/src/components/upload/CCCDUploader.css`
- `frontend/src/styles/public/RegistrationFormA4.css`
- `.serena/memories/30-active-work.md`
- `.serena/memories/40-decisions.md`
- `.serena/memories/50-verification.md`

### Completed Items
- Thêm panel progress nổi `position: fixed` ngoài khung A4 để mobile/desktop đều thấy rõ trạng thái OCR/AI.
- Thêm overlay loading trực tiếp lên card uploader để trạng thái chờ không còn bị chìm vào badge nhỏ.
- Đổi flow CCCD sang giữ ảnh trước, OCR thất bại chỉ cảnh báo nhập tay thay vì reject upload.
- Bỏ chặn cứng ở uploader/editor khi ảnh CCCD bị đánh giá `blocked`; vẫn cho người dùng lưu ảnh và tiếp tục với cảnh báo chất lượng.
- Verification: frontend build tạm pass và đã dọn `temp-build/`.

### Updated
2026-04-09 10:38 +07:00

## Session: 2026-04-09 — Add obvious waiting progress for CCCD OCR and 3x4 AI on /register

### Status: COMPLETED

### Mô tả
Tăng độ rõ ràng của trạng thái chờ trong trang `/register` để người dùng thấy ngay hệ thống đang OCR CCCD hoặc AI generate ảnh 3x4, thay vì nghĩ form bị lag/đơ.

### Files thay đổi
- `frontend/src/components/upload/CCCDUploader.tsx`
- `frontend/src/components/upload/CCCDUploaderGenerateFirst.tsx`
- `frontend/src/components/upload/cccd-upload-progress.tsx`
- `frontend/src/pages/public/StudentRegistration.tsx`
- `frontend/src/styles/public/RegistrationFormA4.css`
- `.serena/memories/30-active-work.md`
- `.serena/memories/40-decisions.md`
- `.serena/memories/50-verification.md`

### Completed Items
- Thêm callback trạng thái từ uploader để form `/register` biết uploader nào đang `uploading` hoặc `processing`.
- Thêm panel chờ nổi bật ở section upload của `/register` với spinner, mô tả bước đang chạy và thanh tiến độ dễ thấy.
- Thêm tiến độ giả lập cho bước OCR CCCD vì bước này chưa có progress từ backend nhưng vẫn cần feedback rõ cho người dùng.
- Sửa label progress của uploader để bước AI 3x4 không còn hiển thị sai kiểu `Đang tải lên...` khi thực tế đang generate/chấm điểm.
- Verification: frontend build tạm pass và đã dọn `temp-build/`.
- Deployment: frontend production Pages deploy thành công sau khi thêm loading/progress mới cho `/register`.

### Updated
2026-04-09 10:26 +07:00

## Session: 2026-04-09 — Canonicalize all public registration entry points to /register

### Status: COMPLETED

### Mô tả
Chuẩn hóa toàn bộ entry public có ý nghĩa đăng ký/tuyển sinh về cùng trang form `/register` trên cả desktop và mobile.

### Files thay đổi
- `frontend/src/App.tsx`
- `frontend/src/components/layout/ModernHeader.tsx`
- `frontend/src/components/layout/ModernFooter.tsx`
- `frontend/src/components/layout/Layout.tsx`
- `frontend/src/components/ui/FloatingCTA.tsx`
- `frontend/src/components/ui/ExitIntentModal.tsx`
- `frontend/src/pages/public/HomePage.tsx`
- `frontend/src/pages/public/AboutPage.tsx`
- `frontend/src/pages/public/TrainingPage.tsx`
- `.serena/memories/30-active-work.md`
- `.serena/memories/40-decisions.md`
- `.serena/memories/50-verification.md`

### Completed Items
- Đổi các CTA public đang trỏ `/admissions` sang `/register` ở header, footer, floating CTA, exit intent modal và các landing page public.
- Đổi cả các entry của layout cũ để desktop/mobile legacy không còn đổ về route tuyển sinh cũ.
- Thêm redirect route `/admissions -> /register` để mọi link cũ hoặc external vẫn về đúng form đăng ký.
- Verification: frontend build tạm pass và đã dọn `temp-build/`.
- Deployment: frontend production Pages deploy thành công từ trạng thái local hiện tại theo xác nhận của user.

### Updated
2026-04-09 10:14 +07:00

## Session: 2026-04-09 — Expose login/register buttons on mobile header

### Status: COMPLETED

### Mô tả
Đưa nút `Đăng nhập` và `Đăng ký` ra hiển thị trực tiếp trên header mobile thay vì bắt buộc người dùng phải mở hamburger menu mới thấy.

### Files thay đổi
- `frontend/src/components/layout/ModernHeader.tsx`
- `.serena/memories/30-active-work.md`
- `.serena/memories/40-decisions.md`
- `.serena/memories/50-verification.md`

### Completed Items
- Thêm dải CTA mobile nằm ngay dưới thanh nav public để người dùng thấy ngay `Đăng nhập` và `Đăng ký`.
- Với trạng thái đã đăng nhập, hiện nhanh `Dashboard` và nút `Đăng xuất` ngay trên mobile.
- Giữ nguyên menu hamburger hiện có để không làm mất luồng điều hướng cũ.
- Giảm `max-height` của panel menu mobile để header cao hơn vẫn không làm menu tràn khỏi viewport.
- Verification: frontend build tạm pass và đã dọn sạch artifact `temp-build/`.

### Updated
2026-04-09 09:59 +07:00

## Session: 2026-04-09 — Improve CCCD auto-crop and normalization quality

### Status: COMPLETED

### Mô tả
Cải thiện pipeline `smart normalize-first` cho CCCD mặt trước/mặt sau theo hướng card được tự crop cân hơn, ít chạm mép hơn, giữ hình phẳng ổn định hơn và hậu xử lý ra ảnh nét hơn mà vẫn ưu tiên an toàn OCR.

### Files thay đổi
- `frontend/src/components/upload/document-normalization.ts`
- `.serena/memories/30-active-work.md`
- `.serena/memories/40-decisions.md`
- `.serena/memories/50-verification.md`

### Completed Items
- Mở rộng `DetectionCandidate` để giữ thêm `metrics` và `boundingBox` từ detector, giúp bước normalize chấm ứng viên chính xác hơn.
- Thêm `assessQuadGeometry()` để ưu tiên các ứng viên có hình học card cân, vuông góc, đúng tỷ lệ và gần trung tâm hơn.
- Nâng `expandDetectedQuad()` thành bản adaptive:
  - nới biên theo confidence/source của candidate,
  - fit lại toàn bộ quad trong biên ảnh để tránh warp vượt khung gây mép trắng/chạm cứng.
- Điều chỉnh selection score để không chỉ ưu tiên OCR/layout mà còn ưu tiên crop nhìn cân và gọn hơn.
- Tune hậu xử lý ảnh sau warp:
  - giảm blur làm mềm ở ảnh vốn đã thiếu nét,
  - tăng unsharp mask nhẹ để text/biên thẻ rõ hơn.
- Verification: frontend production build pass với source mới.

### Updated
2026-04-09 00:07 +07:00

## Session: 2026-04-08 — Production deploy + real online smoke on main

### Status: COMPLETED

### Mô tả
Hoàn tất pass rộng cho public pages/register rồi deploy thẳng frontend lên production branch `main` của Cloudflare Pages. Chạy smoke test online thật, không mock, trên deployment production hiện hành để kiểm tra các route public chính và luồng `/register` với upload ảnh thật. Trước khi deploy production, cũng đã dựng 1 backend `development` worker + queue dev để xác minh đường test online không đụng production DB.

### Files thay đổi
- `frontend/src/components/forms/BirthPlaceField.tsx`
- `frontend/src/pages/public/StudentRegistration.tsx`
- `frontend/src/pages/public/HomePage.tsx`
- `frontend/src/pages/public/FeedbackPage.tsx`
- `frontend/src/pages/public/GuidesPage.tsx`
- `frontend/src/components/common/SEO.tsx`
- `frontend/src/pages/public/SemanticLanding.tsx`
- `frontend/src/pages/public/PostDetailPage.tsx`
- `frontend/public/_headers`
- `frontend/e2e/register-birth-place.spec.ts`
- `frontend/e2e/live-production-smoke.spec.ts`
- `frontend/playwright.live.config.ts`
- `.serena/memories/30-active-work.md`
- `.serena/memories/40-decisions.md`
- `.serena/memories/50-verification.md`

### Completed Items
- Register / CRO / accessibility:
  - Thêm tracking `form_start`, `form_submit`, `form_error` cho `/register`.
  - Thêm `noValidate`, focus tới field lỗi đầu tiên, thông báo lỗi tổng quát rõ hơn.
  - Bổ sung `autocomplete`, `inputMode`, `maxLength`, `aria-invalid`, `aria-describedby` cho các field chính.
  - Tăng accessibility cho `BirthPlaceField` với `id`, `htmlFor`, hint/error IDs.
- Public SEO:
  - HomePage có structured data mức site/org.
  - FeedbackPage và GuidesPage có structured data động theo dữ liệu hiển thị.
  - Cải thiện SEO mặc định và locale/canonical cho các page đã sửa.
- Cloudflare:
  - Tạo queue dev `photo-3x4-pipeline-dev`.
  - Deploy worker dev `vantrangedu-api-dev` để thử online an toàn trước khi đi production.
  - Deploy frontend lên production Pages branch `main`.
- Live verification:
  - Smoke public routes production pass.
  - Smoke `register` production với upload thật pass.
  - Xác minh custom domain `vantrangedu.com` vẫn phản hồi cho `/register` và `/feedback`.

### Updated
2026-04-08 23:55 +07:00

## Session: 2026-04-08 — Apply skill pack to public pages + Cloudflare headers

### Status: COMPLETED

### Mô tả
Thực thi pass đầu tiên áp dụng bộ skill đã cài vào code thật, tập trung vào các thay đổi chéo toàn site thay vì chỉ cài skill: chuẩn hóa SEO mặc định cho public pages, xử lý đúng noindex cho bài viết không tồn tại, và nới CSP Cloudflare Pages để không chặn các iframe YouTube/Google hợp lệ mà site đang dùng.

### Files thay đổi
- `frontend/src/components/common/SEO.tsx`
- `frontend/src/pages/public/SemanticLanding.tsx`
- `frontend/src/pages/public/PostDetailPage.tsx`
- `frontend/public/_headers`
- `.serena/memories/30-active-work.md`
- `.serena/memories/40-decisions.md`
- `.serena/memories/50-verification.md`

### Completed Items
- Audit nhanh toàn cục:
  - Xác minh toàn bộ public pages đều đã mount component `SEO`.
  - Xác minh frontend đang chạy Cloudflare Pages + Functions proxy và backend đang dùng Workers + D1 + R2 + Queues + AI.
- SEO:
  - `SEO.tsx` giờ tự sinh JSON-LD `WebPage` mặc định khi page không truyền `structuredData`.
  - Thêm hỗ trợ `lang` để set `html lang` và `og:locale` phù hợp cho route song ngữ.
  - `SemanticLanding` truyền `lang` vào `SEO` để route tiếng Anh không còn bị đóng nhãn locale tiếng Việt.
  - `PostDetailPage` gắn `noindex` + canonical đúng cho trạng thái không tìm thấy bài viết.
- Cloudflare headers:
  - Cập nhật CSP trong `frontend/public/_headers` với `base-uri 'self'` và `object-src 'none'`.
  - Thêm `frame-src` cho YouTube/Google để không tự chặn embed hợp lệ trên public pages.
- Verification:
  - `npm exec vite build -- --outDir temp-build` pass.
  - Đã xóa `frontend/temp-build/` sau khi verify để không để lại artifact.

### Updated
2026-04-08 23:04 +07:00

## Session: 2026-04-08 — Install website skill pack from skills.sh

### Status: COMPLETED

### Mô tả
Ra soát stack/project, xác minh `skills.sh` là hệ sinh thái skill cho AI agents chứ không phải plugin runtime của website, rồi chọn và cài 1 skill sao cao nhất cho từng nhóm công việc sát nhất với repo này: frontend design, UI audit, React best practices, webapp testing, SEO audit, form CRO.

### Files thay đổi
- `.agents/skills/frontend-design/`
- `.agents/skills/webapp-testing/`
- `.agents/skills/vercel-react-best-practices/`
- `.agents/skills/web-design-guidelines/`
- `.agents/skills/form-cro/`
- `.agents/skills/seo-audit/`
- `skills-lock.json`
- `.serena/memories/30-active-work.md`
- `.serena/memories/40-decisions.md`
- `.serena/memories/50-verification.md`

### Completed Items
- Xác minh `skills.sh` dùng cho workflow agent/dev, không phải tính năng runtime cho người dùng cuối của website.
- Chọn và cài các skill phù hợp nhất với website giáo dục/public form của repo:
  - `frontend-design` (`anthropics/skills`, 112.3K GitHub stars)
  - `webapp-testing` (`anthropics/skills`, 112.3K GitHub stars)
  - `vercel-react-best-practices` (`vercel-labs/agent-skills`, 24.7K GitHub stars)
  - `web-design-guidelines` (`vercel-labs/agent-skills`, 24.7K GitHub stars)
  - `form-cro` (`coreyhaines31/marketingskills`, 19.5K GitHub stars)
  - `seo-audit` (`coreyhaines31/marketingskills`, 19.5K GitHub stars)
- Cài cho các agent đang dùng trong repo: `OpenCode`, `Codex`, `Cursor`, `Cline`.
- Xác minh bằng `npx skills ls --json` rằng các skill mới đã xuất hiện trong `.agents/skills/`.

### Updated
2026-04-08 22:50 +07:00

## Session: 2026-04-02 - Environment Setup (Local machine)

### Status: COMPLETED

### Mo ta
Cai runtime va dependency con thieu de chay repo tren may Windows hien tai, dong thoi ra soat cau truc repo de xac nhan app chinh la `frontend/` (Vite React) va `backend/` (Cloudflare Workers). Xac minh build/test/smoke sau khi cai.

### Files thay doi
- `.serena/memories/30-active-work.md`
- `.serena/memories/50-verification.md`

### Completed Items
- Runtime:
  - Cai Node.js `v22.22.2` va them vao user `PATH`.
  - Cai Python `3.12.10` va them vao user `PATH`.
- Python/OCR:
  - Nang cap `.venv_ocr` de tro dung Python moi.
  - Xac minh import thanh cong: `fitz`, `paddleocr`, `python-docx`, `numpy`, `Pillow`, `PyPDF2`, `requests`, `paddle`.
- Frontend:
  - Xac minh `npm`, `wrangler`, `playwright`.
  - Cai Playwright Chromium local browser.
  - Build production thanh cong.
  - Smoke E2E `auth-visibility-smoke.spec.ts` pass `6/6`.
- Backend:
  - Vitest suite khoi chay duoc voi runtime moi.
  - Lo ra loi source/data co san trong repo, khong phai loi cai dat:
    - `src/test/routes/export.test.ts`: fail do D1 schema test thieu cot `s.image_cccd_front`.
    - `src/test/routes/exam-schedules.test.ts`: co 1 assertion fail va log thieu `GOOGLE_PRIVATE_KEY` trong nhanh Google Calendar.

### Updated
2026-04-02 07:45 +07

## Current Task
Đồng bộ Preview Excel với file Excel export thật, sửa tiêu đề VanTrang full theo tên kỳ thi/lớp, kiểm tra desktop/mobile build, và deploy production backend + frontend.

## Recently Changed Files
- backend/src/routes/export.ts
- backend/src/test/routes/export.test.ts
- frontend/src/services/api-exam-schedule-methods.ts
- frontend/src/pages/admin/desktop/ExamSchedulesPage.tsx
- frontend/src/pages/admin/mobile/MobileExamSchedulesModule.tsx

## Completed Items
- Backend:
  - Sửa tiêu đề template `vantrang_full` từ `DANH SÁCH THÍ SINH - FULL THÔNG TIN` thành `DANH SÁCH THÍ SINH - <TÊN KỲ THI>` (uppercase chuẩn tiếng Việt).
  - Tách helper dùng chung cho export exam-list: lấy exam info, lấy danh sách thí sinh đã normalize/sort, resolve template.
  - Thêm endpoint preview server-side: `GET /export/exam/:exam_id/exam-list/preview` để frontend dùng đúng dữ liệu/logic như export.
  - Thêm builders preview cho 3 layout: `ptit`, `vept`, `vantrang_full`.
- Frontend:
  - Thêm API method `getExamListExcelPreview(examId)`.
  - Desktop ExamSchedulesPage:
    - Bỏ preview dựng local, chuyển sang fetch preview từ backend khi mở modal.
    - Thêm trạng thái loading preview.
    - Thêm renderer `ExcelPreviewFullInfoTable` cho layout `vantrang_full`.
  - Mobile ExamSchedulesModule:
    - Bỏ preview dựng local, chuyển sang fetch preview backend.
    - Thêm trạng thái loading preview.
    - Thêm renderer `MobileExcelPreviewFullInfo` cho layout `vantrang_full`.
- Tests & verification:
  - Backend export tests pass: `backend/src/test/routes/export.test.ts` (8/8).
  - Frontend production build pass.
  - E2E mobile/desktop smoke attempted nhưng fail do thiếu thư viện hệ thống cho Chromium (`libnspr4.so`) trên máy chạy test.
- Deploy:
  - Backend production worker deployed thành công.
  - Frontend Pages deploy production branch `main` thành công.

## Updated
2026-03-31 16:35 +07

---
## Session: 2026-04-01 — Feature: Báo cáo học tập (Student Reviews)

### Status: COMPLETED ✅

### Mô tả
Xây dựng tính năng báo cáo đánh giá học viên end-to-end.

### Files thay đổi
**Backend:**
- `backend/migrations/0036_student_reviews.sql` — 5 bảng mới: student_reviews, student_review_skills, student_review_test_scores, student_review_homework_tracking, student_review_attachments
- `backend/src/routes/student-reviews.ts` — Route CRUD + publish/unpublish
- `backend/src/index.ts` — Mount route `/student-reviews`

**Frontend:**
- `src/services/api-review-methods.ts` — API mixin (getMyReviews, listClassReviews, upsertClassReview, publishReview, unpublishReview, deleteReview, getClassReview, deleteReview)
- `src/services/api.ts` — Apply review mixin
- `src/features/student/student-hooks.ts` — useStudentReviews hook + types
- `src/features/student/student-nav.tsx` — Thêm "reviews" vào nav, icon FileText
- `src/pages/student/StudentDashboard.tsx` — Thêm TAB_MAP reviews + pathname detection
- `src/pages/student/mobile/StudentDashboardMobile.tsx` — Thêm case "reviews"
- `src/pages/student/desktop/StudentReviewsView.tsx` — View desktop với modal chi tiết
- `src/pages/student/desktop/StudentReviews.tsx` — Entry wrapper
- `src/pages/student/mobile/StudentReviewsMobileView.tsx` — Mobile wrapper
- `src/pages/admin/desktop/ClassDetailDashboard.tsx` — ReviewsTab + ReviewEditorModal + Tab trigger

### Deploy
- Backend: `vantrangedu-api` v`e3f2696a` ✅
- Frontend: `72cee162.vantrangedu.pages.dev` (main branch) ✅
- Migration D1: 0036_student_reviews.sql applied ✅
- Tables created: student_reviews, student_review_skills, student_review_test_scores, student_review_homework_tracking, student_review_attachments ✅

## Session: 2026-04-15 — Synthetic test students 001-0019 use test123

### Status: COMPLETED

### Mô tả
User yêu cầu nhóm tài khoản test `001` đến `0019` đăng nhập bằng `test123`. Kiểm tra trực tiếp `vantrangedu_db` cho thấy bảng `students` không có cột mật khẩu; học viên đang đăng nhập bằng `cccd + sdt`, nên fix được thực hiện ở code để chỉ nhóm test này chấp nhận `test123` như một login secret thay thế, còn tài khoản thật vẫn giữ luồng cũ.

### Files thay đổi
- `backend/src/services/student-service.ts`
- `backend/src/services/student-service.js`
- `backend/src/routes/sso.ts`
- `backend/src/routes/sso.js`
- `backend/src/test/services/student-profile.test.ts`
- `frontend/src/pages/public/UnifiedLogin.tsx`

### Completed Items
- Xác nhận remote `vantrangedu_db` không có cột password trong bảng `students`; các account `001`-`0019` tồn tại và đang có `sdt = 123456`.
- Thêm helper backend để chỉ `cccd` `001`-`0019` được dùng `test123`; các học viên khác vẫn phải nhập đúng số điện thoại đang lưu trong DB.
- Đồng bộ rule này cho cả login học viên nội bộ (`/students/login`) lẫn SSO broker direct login (`/sso/direct-login`) để `vantrangedu` và `vantrangexam` cùng hành xử giống nhau.
- Cập nhật form login học viên ở frontend `vantrangedu` để chấp nhận `cccd` test và `test123` ở client-side validation, đồng thời thêm hint cho người dùng.

### Updated
2026-04-15 18:17:00 +07:00

### Deploy
- Backend: `vantrangedu-api` v`6147180c-8679-4216-9789-c75d80118a15` ✅
- Frontend: `https://5d748490.vantrangedu.pages.dev` ✅

## Session: 2026-04-15 — Synthetic test student password is exclusive

### Status: COMPLETED

### Mô tả
User xác nhận nhóm test `001` đến `0019` phải chỉ đăng nhập được bằng `test123`; giá trị số điện thoại seed `123456` không được tiếp tục hoạt động như fallback login secret.

### Files thay đổi
- `backend/src/services/student-service.ts`
- `backend/src/services/student-service.js`
- `backend/src/test/services/student-profile.test.ts`

### Completed Items
- Siết helper auth để synthetic test students `001`-`0019` chỉ chấp nhận literal `test123`.
- Loại bỏ fallback so khớp `storedPhone` cho riêng nhóm synthetic test.
- Giữ nguyên phone-based login cho học viên thường.
- Deploy lại backend auth broker.

### Updated
2026-04-15 18:42:30 +07:00

## Session: 2026-04-17 â€” Apply `src2/src` into `src` on the current frontend stack

### Status: COMPLETED

### Mô tả
User yêu cầu áp dụng cây `src2` vào `src` nhưng theo cách phù hợp với repo hiện tại. Đã overlay toàn bộ `frontend/src2/src/` vào `frontend/src/`, sau đó chỉnh tương thích với stack hiện có của dự án thay vì kéo luôn toolchain riêng trong `src2`.

### Files thay đổi
- `frontend/src/` â€” bulk sync từ `frontend/src2/src/`
- `frontend/src/index.css`
- `frontend/src/App.tsx`
- `frontend/src/global.d.ts`
- `.serena/memories/30-active-work.md`
- `.serena/memories/40-decisions.md`
- `.serena/memories/50-verification.md`

### Completed Items
- Overlay toàn bộ source tree `src2/src` vào `src`, giữ lại source mới cho admin, student, public pages, upload flow, shared UI và styles.
- Giữ nguyên `frontend/package.json`, `frontend/vite.config.ts`, `frontend/public/` của repo hiện tại để không lôi sang stack React/Tailwind/package riêng của `src2`.
- Bổ sung lớp tương thích Tailwind 4 trong `frontend/src/index.css` cho semantic tokens như `bg-background`, `text-foreground`, `border-border`, `ring-ring`.
- Gỡ wiring của các route dev bypass khỏi `frontend/src/App.tsx` để không đưa mock-session login bypass vào router production.
- Xác nhận frontend production build pass trên cây mã sau khi merge.

### Updated
2026-04-17 11:31:27 +07:00

## Session: 2026-04-17 — Review FE/BE/API/UI-UX integration quality after src2 overlay

### Status: COMPLETED

### Mô tả
User hỏi hiện trạng nối frontend/backend, API flow và UI/UX đã đủ tốt chưa sau khi áp `src2` vào `src`. Đã review trực tiếp frontend + backend để kiểm tra auth flow, data loading, admin student list, accessibility của public forms và tính nhất quán của navigation.

### Files thay đổi
- `.serena/memories/30-active-work.md`
- `.serena/memories/50-verification.md`

### Completed Items
- Rà lại các flow FE-BE chính quanh student login, SSO exchange, dashboard session restore và admin students list.
- Xác nhận frontend vẫn build production pass trên cây hiện tại sau khi merge `src2`.
- Ghi nhận các finding chính cần ưu tiên: admin student list đang gọi full dataset từ FE và bị backend N+1 khi enrich registrations; form đăng ký còn thiếu liên kết label/control ở nhiều field; header public còn điểm a11y/session-state chưa chặt.

### Updated
2026-04-17 11:51:55 +07:00

## Session: 2026-04-17 — Deploy current vantrangedu frontend and backend to Cloudflare

### Status: COMPLETED

### Mô tả
User yêu cầu deploy ngay repo `vantrangedu` lên Cloudflare và nhấn mạnh không được nhầm sang `vantrangexam`. Đã xác minh trực tiếp account Cloudflare, Pages project `vantrangedu` và Worker service `vantrangedu-api`, sau đó deploy backend trước rồi frontend sau.

### Files thay đổi
- `.serena/memories/30-active-work.md`
- `.serena/memories/50-verification.md`

### Completed Items
- Xác minh Cloudflare account ID `5b62d10947844251d23e0eac532531dd` và Pages project đích là `vantrangedu`, không phải `vantrangexam`.
- Deploy backend Worker `vantrangedu-api`; version mới: `a670f5c0-f953-4aa5-8306-0c947113bc5b`.
- Deploy frontend Pages project `vantrangedu`; production deployment mới: `c2d915c7-9e55-4dc2-a3a9-00ebfab724ea` tại `https://c2d915c7.vantrangedu.pages.dev`.
- Smoke check HTTP thành công cho `https://vantrangedu-api.bangachieu2.workers.dev`, `https://c2d915c7.vantrangedu.pages.dev`, và `https://vantrangedu.com`.

### Updated
2026-04-17 11:58:12 +07:00

## Session: 2026-04-17 — Redeploy frontend only after reverting to older FE

### Status: COMPLETED

### Mô tả
User cho biết vừa chỉnh lại frontend và đã quay về FE cũ vì FE mới không đạt yêu cầu, sau đó yêu cầu deploy lại. Đã chỉ redeploy frontend Pages project `vantrangedu`; backend `vantrangedu-api` không bị đụng tới trong lượt này.

### Files thay đổi
- `.serena/memories/30-active-work.md`
- `.serena/memories/50-verification.md`

### Completed Items
- Build lại frontend production từ cây hiện tại.
- Deploy lại đúng Pages project `vantrangedu` trên account Cloudflare đã xác minh.
- Xác nhận production deployment mới là `c962c985-f018-4e1c-bd7f-3e4cc60fe73d` tại `https://c962c985.vantrangedu.pages.dev`.
- Smoke check thành công cho preview URL mới và `https://vantrangedu.com`; cả hai trả `200`.

### Updated
2026-04-17 12:04:35 +07:00
