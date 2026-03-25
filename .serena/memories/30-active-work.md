# Active Work — vantrangedu

## Session Update — 2026-03-25 +07 (latest)

### Task: Tab "Điểm danh học tập" trong modal Quản lý thí sinh (ExamSchedulesPage desktop)

**Mục tiêu:** Thêm tab thứ 3 "Điểm danh học tập" bên cạnh "Đã duyệt" / "Chờ duyệt" trong modal quản lý thí sinh của kỳ thi. Tab này hiển thị bảng cross-tab: rows = học viên, columns = buổi học của online_class gắn với kỳ thi.

**Các thay đổi:**

1. **backend/src/routes/exam-schedules.ts**
   - Thêm `GET /exam-schedules/:id/learning-attendance`
   - Tìm `online_class` gắn với exam qua `source_exam_schedule_id`
   - Lấy sessions + attendance records từ `online_class_sessions` + `online_class_attendance`
   - Tổng hợp theo học viên: present_count, late_count, absent_count + chi tiết từng buổi
   - Trả về `{ online_class_id, class_name, sessions[], students[] }` với `zoom_checked_in_at` cả khi 0 sessions

2. **frontend/src/services/api-exam-schedule-methods.ts**
   - Thêm `ApiClient.prototype.getExamLearningAttendance(examId)`

3. **frontend/src/pages/admin/desktop/ExamSchedulesPage.tsx**
   - Import `ClipboardCheck, RefreshCw` từ lucide-react
   - State: `studentTab` mở rộng 3 giá trị: `'approved' | 'pending' | 'attendance'`
   - State: `learningAttendance` + `learningAttendanceLoading`
   - Hàm `loadLearningAttendance(examId)` dùng `(api as any).getExamLearningAttendance()`
   - Tab "Điểm danh học tập" trong modal → lazy load khi click lần đầu
   - Bảng điểm danh: sticky cột tên, badge màu per status, chú thích
   - Toolbar (search/filter) ẩn khi đang ở tab attendance

**Build:** ✅ `npm run build` thành công, 0 lỗi mới (10.74s)

**Files changed:**
- backend/src/routes/exam-schedules.ts
- frontend/src/services/api-exam-schedule-methods.ts
- frontend/src/pages/admin/desktop/ExamSchedulesPage.tsx

---

## Session Update — 2026-03-25 +07

### Task: Zoom Check-in tracking trong danh sách thí sinh kỳ thi

**Mục tiêu:** Hiển thị thời điểm thí sinh bấm "Vào Zoom" trong Danh sách thí sinh của kỳ thi (cả desktop lẫn mobile), dùng dữ liệu từ `online_class_attendance.zoom_join_source`.

**Các thay đổi:**

1. **backend/src/db/attendance-queries.ts**
   - Thêm hàm `getZoomCheckinsForExam(db, examScheduleId)`:
     - Query `online_class_attendance → online_class_sessions → online_classes`
     - JOIN qua `online_classes.source_exam_schedule_id = examScheduleId`
     - Filter `zoom_join_source = 'zoom_click'`
     - Trả về `Map<student_id, { checked_in_at, zoom_join_source }>`
     - Fallback: catch mọi lỗi (cột chưa migrate) → trả về Map rỗng

2. **backend/src/routes/exam-schedules.ts**
   - Import `getZoomCheckinsForExam` từ attendance-queries
   - `GET /:id/students`: nhận query `?with_zoom_checkin=1`
     → merge `zoom_checked_in_at` và `zoom_join_source` vào mỗi student object

3. **frontend/src/services/api-exam-schedule-methods.ts**
   - `getExamStudents(examId, { withZoomCheckin = false })`:
     - Truyền `?with_zoom_checkin=1` khi `withZoomCheckin: true`

4. **frontend/src/pages/admin/desktop/ExamSchedulesPage.tsx**
   - `handleOpenStudentsModal` + `refreshSelectedExamStudents`:
     - Gọi `getExamStudents(..., { withZoomCheckin: true })`
   - Card thí sinh đã duyệt: thêm badge "🎥 Vào Zoom: <datetime>" (màu emerald, chỉ hiện nếu có data)

5. **frontend/src/pages/admin/mobile/MobileExamSchedulesModule.tsx**
   - `loadStudentLists`: gọi `getExamStudents(..., { withZoomCheckin: true })`
   - Student card: thêm badge "🎥 Zoom <datetime>" (bg-emerald-100, chỉ hiện cho approved + có data)

**Build:** ✅ `npm run build` thành công, 0 lỗi (7.76s, 2036 modules)

**Files changed:**
- backend/src/db/attendance-queries.ts
- backend/src/routes/exam-schedules.ts
- frontend/src/services/api-exam-schedule-methods.ts
- frontend/src/pages/admin/desktop/ExamSchedulesPage.tsx
- frontend/src/pages/admin/mobile/MobileExamSchedulesModule.tsx

---

## Session Update — 2026-03-25 +07 (trước)

### Task: Admin Mobile UX/UI Audit + Fix + Deploy

**Vấn đề phát hiện và đã sửa:**

1. **AdminMobileLayout.css** — scale mobile cực nhỏ gây vỡ layout
2. **AdminMobileLayout.tsx** — font size, profile navigate
3. **MobilePaymentsModule.tsx** — nhiều chức năng thiếu so với desktop
4. **GuidesPage.tsx** + **PostDetailPage.tsx** — hỗ trợ video trực tiếp

**Deployment:**
- Commit: `a61188255` — fix(admin-mobile): cải thiện UX/scale + đầy đủ chức năng mobile

## Blockers
_None._
