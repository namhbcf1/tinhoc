# Verification & Deployment — vantrangedu

## Verification Run - 2026-04-11 15:06 +07 (Admin-only exam fee filter)

### Commands
1. `cd backend && npx vitest run src/test/routes/exam-schedules.test.ts -t "payment status"`
- Result: **PASSED** (`3 passed, 27 skipped`)

2. `cd frontend && npx vitest run src/utils/adminSession.test.ts`
- Result: **PASSED** (`4/4`)

3. `cd frontend && npm run build`
- Result: **PASSED**

4. `cd backend && npx vitest run src/test/routes/exam-schedules.test.ts`
- Result: **FAILED**
- Summary: File test tổng vẫn còn 7 lỗi legacy ở nhóm registration bucket/linked-class đã có từ trước; các test payment status mới đều pass khi chạy targeted.

### Notes
- `payment_status` giờ không còn được trả về cho session admin có `teacher_code` trên danh sách thí sinh kỳ thi.
- Bộ lọc `Đã nộp / Chưa nộp` chỉ xuất hiện cho admin/super_admin thực sự ở tab `Đã duyệt`.
- Không deploy trong session này.

## Verification Run - 2026-04-11 15:11 +07 (Deploy admin-only exam fee filter)

### Commands
1. `cd backend && npm run deploy:quick`
- Result: **PASSED**
- Summary: Worker `vantrangedu-api` deploy thành công, version `f3ec45ca-d022-43df-8c99-6defed99b625`.

2. `cd frontend && npm run deploy:quick`
- Result: **PASSED**
- Summary: Cloudflare Pages deploy hoàn tất, preview URL `https://03b144df.vantrangedu.pages.dev`.

3. `curl.exe -I https://vantrangedu-api.bangachieu2.workers.dev`
- Result: **PASSED** (`200 OK`)

4. `curl.exe -I https://vantrangedu.com`
- Result: **PASSED** (`200 OK`)

5. `curl.exe -I https://03b144df.vantrangedu.pages.dev`
- Result: **PASSED** (`200 OK`)

### Notes
- Production backend và frontend đều đã lên bản chỉ cho admin/super_admin thực sự xem/lọc học phí kỳ thi.

## Verification Run - 2026-04-11 15:27 +07 (Redesign exam student list modal)

### Commands
1. `cd frontend && npm run build`
- Result: **FAILED**, then **PASSED**
- Summary: Có lỗi JSX do thiếu một thẻ đóng trong toolbar mới của modal; đã sửa và build sạch.

2. `cd frontend && npm run deploy:quick`
- Result: **PASSED**
- Summary: Cloudflare Pages deploy hoàn tất, preview URL `https://3627458f.vantrangedu.pages.dev`.

3. `curl.exe -I https://vantrangedu.com`
- Result: **PASSED** (`200 OK`)

4. `curl.exe -I https://3627458f.vantrangedu.pages.dev`
- Result: **FAILED** (`404`) với `HEAD`

5. `curl.exe -L -o NUL -s -w "%{http_code}" https://3627458f.vantrangedu.pages.dev`
- Result: **PASSED** (`200`)

### Notes
- `HEAD` trên preview Pages mới có thể trả `404` dù preview đã hoạt động; `GET` xác nhận preview URL vẫn lên đúng.
- Không có thay đổi backend trong pass redesign này.

## Verification Run - 2026-04-11 15:35 +07 (Compact modal header for more visible students)

### Commands
1. `cd frontend && npm run build`
- Result: **PASSED**

2. `cd frontend && npm run deploy:quick`
- Result: **PASSED**
- Summary: Cloudflare Pages deploy hoàn tất, preview URL `https://ab96af79.vantrangedu.pages.dev`.

3. `curl.exe -I https://vantrangedu.com`
- Result: **PASSED** (`200 OK`)

4. `curl.exe -L -o NUL -s -w "%{http_code}" https://ab96af79.vantrangedu.pages.dev`
- Result: **FAILED** (`404`) lần đầu ngay sau deploy

5. `Start-Sleep -Seconds 8; curl.exe -L -o NUL -s -w "%{http_code}" https://ab96af79.vantrangedu.pages.dev`
- Result: **PASSED** (`200`)

### Notes
- Preview Pages cần vài giây để propagate sau deploy; lần kiểm tra thứ hai xác nhận preview mới hoạt động bình thường.
- Pass này chỉ thu gọn phần đầu modal desktop để tăng số lượng card học viên nhìn thấy trong viewport.

## Verification Run - 2026-04-11 16:01 +07 (Learning workspace redesign)

### Commands
1. `cd frontend && npm run build`
- Result: **FAILED**, then **PASSED**
- Summary: Trong lúc redesign `ProgramPlatformPage` và `OnlineClassesManagement`, có lỗi JSX do thiếu thẻ đóng sau khi tái cấu trúc shell; đã sửa và build sạch.

2. `cd frontend && npm run deploy:quick`
- Result: **PASSED**
- Summary: Cloudflare Pages deploy hoàn tất, preview URL `https://b4418f4c.vantrangedu.pages.dev`.

3. `curl.exe -I https://vantrangedu.com`
- Result: **PASSED** (`200 OK`)

4. `curl.exe -L -o NUL -s -w "%{http_code}" https://b4418f4c.vantrangedu.pages.dev`
- Result: **PASSED** (`200`)

### Notes
- Pass này chỉ thay frontend.
- Shared component mới `LearningWorkspaceHeader` đã được dùng cho các page chính trong cụm `Quản lý học tập`.

## Verification Run - 2026-04-11 16:09 +07 (Stronger visual redesign follow-up)

### Commands
1. `cd frontend && npm run build`
- Result: **PASSED**

## Verification Run - 2026-04-12 12:02 +07 (Student nav cleanup + feedback rename)

### Commands
1. `cd frontend && npm run build:prod`
- Result: **PASSED**

2. `cd frontend && npm run deploy:quick`
- Result: **PASSED**
- Summary: Cloudflare Pages deploy hoàn tất, preview URL `https://9de913c1.vantrangedu.pages.dev`.

3. `curl.exe -L -s https://9de913c1.vantrangedu.pages.dev`
- Result: **PASSED**
- Summary: Preview phục vụ bundle mới `index-mnvazl7e-DktVesbm.js` + `index-mnvazl7e-B4YfmYAT.css`.

4. `curl.exe -L -s https://vantrangedu.com`
- Result: **PASSED**
- Summary: Main alias phục vụ cùng bundle mới `index-mnvazl7e-DktVesbm.js` + `index-mnvazl7e-B4YfmYAT.css`.

5. Source checks
- Result: **PASSED**
- Summary:
  - `frontend/src/features/student/student-nav.tsx` chỉ còn `Lịch thi`, `FEEDBACK LỚP HỌC`, `Học tập`
  - `frontend/src/App.tsx` redirect các route cũ `my-classes`, `attendance`, `reviews`
  - `frontend/src/pages/student/desktop/StudentFeedbackView.tsx` đổi title sang `FEEDBACK LỚP HỌC`

### Notes
- Thay đổi áp dụng cho cả desktop và mobile vì `DashboardSidebar`, `StudentBottomNav`, `StudentMobileLayout`, `StudentDashboardMobile` cùng dùng `STUDENT_MAIN_MENU`.

## Verification Run - 2026-04-13 22:33 +07 (Faster study handoff to vantrangexam)

### Commands
1. `cd frontend && npm run build:prod`
- Result: **PASSED**

2. `cd frontend && npm run deploy:quick`
- Result: **PASSED**
- Summary: Cloudflare Pages deploy hoàn tất, preview URL `https://c26f6a17.vantrangedu.pages.dev`.

3. `curl.exe -L -s https://c26f6a17.vantrangedu.pages.dev`
- Result: **PASSED**
- Summary: Preview phục vụ bundle mới `index-mnxckenz-FY_zbZDt.js` + `index-mnxckenz-B4YfmYAT.css`.

4. `curl.exe -L -s https://vantrangedu.com`
- Result: **PASSED**
- Summary: Main alias phục vụ cùng bundle mới `index-mnxckenz-FY_zbZDt.js` + `index-mnxckenz-B4YfmYAT.css`.

5. Source checks
- Result: **PASSED**
- Summary:
  - `frontend/src/features/student/student-nav.tsx` dùng `https://vantrangexam.pages.dev/#/login`
  - popup mở blank tab trước rồi mới `location.replace()` sang handoff URL
  - popup hiển thị loading message ngay trong lúc chờ handoff

## Verification Run - 2026-04-13 22:52 +07 (Study entry always uses SSO auto-login)

### Commands
1. `cd frontend && npm run build:prod`
- Result: **PASSED**

2. `cd frontend && npm run deploy:quick`
- Result: **PASSED**
- Summary: Cloudflare Pages deploy hoàn tất, preview URL `https://f0f5833a.vantrangedu.pages.dev`.

3. `curl.exe -L -s https://f0f5833a.vantrangedu.pages.dev`
- Result: **PASSED**
- Summary: Preview phục vụ bundle mới `index-mnxewaht-D1kJctNg.js` + `index-mnxewaht-B4YfmYAT.css`.

4. `curl.exe -L -s https://vantrangedu.com`
- Result: **PASSED**
- Summary: Main alias phục vụ cùng bundle mới `index-mnxewaht-D1kJctNg.js` + `index-mnxewaht-B4YfmYAT.css`.

5. Source checks
- Result: **PASSED**
- Summary:
  - `frontend/src/App.tsx` `StudyPlatformRedirect` dùng `openStudyPlatform({ target: '_self', returnTo })`
  - Không còn `ExternalRedirect` fallback sang login thường trong route helper này
  - `frontend/src/features/student/student-nav.tsx` hỗ trợ `target` + `returnTo` cho handoff helper

2. `cd frontend && npm run deploy:quick`
- Result: **PASSED**
- Summary: Cloudflare Pages deploy hoàn tất, preview URL `https://d1ebdecd.vantrangedu.pages.dev`.

3. `curl.exe -I https://vantrangedu.com`
- Result: **PASSED** (`200 OK`)

4. `curl.exe -L -o NUL -s -w "%{http_code}" https://d1ebdecd.vantrangedu.pages.dev`
- Result: **PASSED** (`200`)

### Notes
- Đây là pass tăng độ khác biệt thị giác sau khi user xem production và thấy thay đổi chưa đủ rõ.
- Không có thay đổi backend trong pass này.

## Verification Run - 2026-04-11 16:26 +07 (Mobile admin redesign parity with desktop)

### Commands
1. `cd frontend && npm run build`
- Result: **PASSED**

2. `cd frontend && npm run deploy:quick`
- Result: **PASSED**
- Summary: Cloudflare Pages deploy hoàn tất, preview URL `https://739160e8.vantrangedu.pages.dev`.

3. `curl.exe -I https://vantrangedu.com`
- Result: **PASSED** (`200 OK`)

4. `curl.exe -L -o NUL -s -w "%{http_code}" https://739160e8.vantrangedu.pages.dev`
- Result: **PASSED** (`200`)

### Notes
- Pass này chỉ thay frontend, tập trung vào mobile admin shell và các mobile module trọng yếu.

## Verification Run - 2026-04-11 16:43 +07 (Mobile balance and ergonomics pass)

### Commands
1. `cd frontend && npm run build`
- Result: **PASSED**

2. `cd frontend && npm run deploy:quick`
- Result: **PASSED**
- Summary: Cloudflare Pages deploy hoàn tất, preview URL `https://646a4451.vantrangedu.pages.dev`.

3. `curl.exe -I https://vantrangedu.com`
- Result: **PASSED** (`200 OK`)

4. `curl.exe -L -o NUL -s -w "%{http_code}" https://646a4451.vantrangedu.pages.dev`
- Result: **PASSED** (`200`)

### Notes
- Pass này tập trung vào cân chỉnh mobile trên máy hẹp/safe-area hơn là thêm module mới.

## Verification Run - 2026-04-11 16:56 +07 (Adaptive device and resolution layout system)

### Commands
1. `cd frontend && npm run build`
- Result: **PASSED**

2. `cd frontend && npm run deploy:quick`
- Result: **PASSED**
- Summary: Cloudflare Pages deploy hoàn tất, preview URL `https://fdd7006d.vantrangedu.pages.dev`.

3. `curl.exe -I https://vantrangedu.com`
- Result: **PASSED** (`200 OK`)

4. `curl.exe -L -o NUL -s -w "%{http_code}" https://fdd7006d.vantrangedu.pages.dev`
- Result: **PASSED** (`200`)

### Notes
- Pass này thêm adaptive runtime layer cho admin/mobile responsive behavior, không có thay đổi backend.

## Verification Run - 2026-04-15 18:17 +07 (Synthetic test students 001-0019 use test123)

### Commands
1. `cd backend && npx vitest run src/test/services/student-profile.test.ts`
- Result: **PASSED**
- Summary: `4 tests` passed, including the new coverage for `test123` on synthetic test CCCDs and the unchanged phone-based login path for regular students.

2. `cd frontend && npm run build`
- Result: **PASSED**
- Summary: frontend build completed after client-side validation was widened to accept test CCCDs `001`-`0019` and literal `test123`.

3. `cd backend && npx wrangler d1 execute DB --remote --command "PRAGMA table_info(students);"`
- Result: **PASSED**
- Summary: verified remote `students` table has no password column.

4. `cd backend && npx wrangler d1 execute DB --remote --command "SELECT id, cccd, ho_ten_full, sdt, email FROM students WHERE cccd IN ('001','002','003','004','005','006','007','008','009','0010','0011','0012','0013','0014','0015','0016','0017','0018','0019') ORDER BY CAST(cccd AS INTEGER);"`
- Result: **PASSED**
- Summary: confirmed all synthetic test accounts `001`-`0019` exist in remote `vantrangedu_db` before applying the code-level login override.

5. `cd backend && npm run deploy:quick`
- Result: **PASSED**
- Summary: deployed Worker `vantrangedu-api` version `6147180c-8679-4216-9789-c75d80118a15`.

6. `cd frontend && npm run deploy:quick`
- Result: **PASSED**
- Summary: deployed Pages preview `https://5d748490.vantrangedu.pages.dev`.

7. `curl.exe -I https://vantrangedu-api.bangachieu2.workers.dev`
- Result: **PASSED** (`200 OK`)

8. `curl.exe -L -o NUL -s -w "%{http_code}" https://5d748490.vantrangedu.pages.dev`
- Result: **PASSED** (`200`)

9. `curl.exe -L -o NUL -s -w "%{http_code}" https://vantrangedu.com`
- Result: **PASSED** (`200`)

## Verification Run - 2026-04-15 18:42 +07 (Synthetic test students reject seeded phone fallback)

### Commands
1. `cd backend && npx vitest run src/test/services/student-profile.test.ts`
- Result: **PASSED**
- Summary: `4 tests` passed, including the new assertion that `003 + 123456` is rejected while `003 + test123` still succeeds.

2. `cd backend && npm run deploy:quick`
- Result: **PASSED**
- Summary: deployed Worker `vantrangedu-api` version `a70fc2b9-b085-4bfa-9e66-4453c4effa78`.

3. PowerShell `Invoke-WebRequest` to `https://vantrangedu-api.bangachieu2.workers.dev/sso/direct-login` with body `{ type: 'student', cccd: '003', phone: '123456', targetApp: 'exam' }`
- Result: **PASSED**
- Summary: server returned auth failure (`Thông tin đăng nhập không chính xác`).

4. PowerShell `Invoke-WebRequest` to `https://vantrangedu-api.bangachieu2.workers.dev/sso/direct-login` with body `{ type: 'student', cccd: '003', phone: 'test123', targetApp: 'exam' }`
- Result: **PASSED**
- Summary: server returned success payload with issued session token for student `003`.

## Verification Run - 2026-04-11 17:18 +07 (Compact admin density pass)

### Commands
1. `cd frontend && npm run build`
- Result: **PASSED**

2. `cd frontend && npm run deploy:quick`
- Result: **PASSED**

3. `curl.exe -I https://vantrangedu.com`
- Result: **PASSED** (`200 OK`)

### Notes
- Pass này thu nhỏ mobile header/hero/search/button/stats theo hướng compact admin.

## Verification Run - 2026-04-11 17:27 +07 (Remove all header descriptions)

### Commands
1. `cd frontend && npm run build`
- Result: **PASSED**

2. `cd frontend && npm run deploy:quick`
- Result: **PASSED**
- Summary: Cloudflare Pages deploy hoàn tất, preview URL `https://49f24bd9.vantrangedu.pages.dev`.

3. `curl.exe -I https://vantrangedu.com`
- Result: **PASSED** (`200 OK`)

4. `curl.exe -L -o NUL -s -w "%{http_code}" https://49f24bd9.vantrangedu.pages.dev`
- Result: **FAILED** (`404`) ngay sau deploy

### Notes
- Production đã lên bản mới; preview URL mới có thể cần thêm thời gian propagate từ Pages.

## Verification Run - 2026-04-11 01:41 +07 (Admin overlay stacking audit)

### Commands
1. `cd frontend && npm run build`
- Result: **PASSED**

2. `cd frontend && npm run deploy:quick`
- Result: **PASSED**
- Summary: Cloudflare Pages deploy hoàn tất, preview URL `https://48200b6d.vantrangedu.pages.dev`.

3. `curl -I https://vantrangedu.com`
- Result: **PASSED** (`200 OK`)

4. `curl -I https://48200b6d.vantrangedu.pages.dev`
- Result: **PASSED** (`200 OK`)

### Notes
- Overlay/modal pass này chỉ thay frontend.
- Native select học phí ở modal danh sách thí sinh đã được thay bằng button group để tránh hiện tượng dropdown bị che phía sau.
- Một số overlay mobile/module cũ vẫn còn render inline trong từng file feature và nên được gom về pattern portal ở pass sau nếu tiếp tục audit toàn site.

## Verification Run - 2026-04-11 01:58 +07 (Full frontend overlay audit)

### Commands
1. `cd frontend && npm run build`
- Result: **PASSED**

2. `cd frontend && npm run deploy:quick`
- Result: **PASSED**
- Summary: Cloudflare Pages deploy hoàn tất, preview URL `https://6cde8582.vantrangedu.pages.dev`.

3. `curl -I https://vantrangedu.com`
- Result: **PASSED** (`200 OK`)

4. `curl -I https://6cde8582.vantrangedu.pages.dev`
- Result: **PASSED** (`200 OK`)

### Notes
- Đã rà bằng code-search toàn frontend cho pattern `fixed inset-0` và `createPortal/OverlayPortal`.
- Những overlay chính còn lại sau pass này hoặc đã portal, hoặc là lớp điều hướng/sidebar/filter có chủ đích chứ không phải modal nội dung bị render inline trong shell.

## Verification Run - 2026-04-11 02:11 +07 (Dynamic overlay stacking)

### Commands
1. `cd frontend && npm run build`
- Result: **PASSED**

2. `cd frontend && npm run deploy:quick`
- Result: **PASSED**
- Summary: Cloudflare Pages deploy hoàn tất, preview URL `https://bc86ecde.vantrangedu.pages.dev`.

3. `curl -I https://vantrangedu.com`
- Result: **PASSED** (`200 OK`)

4. `curl -I https://bc86ecde.vantrangedu.pages.dev`
- Result: **PASSED** (`200 OK`)

### Notes
- Confirm dialog trong modal `Danh sách thí sinh` hiện dùng layer động nên phải nổi lên ngay khi click icon xóa.

## Verification Run - 2026-04-11 01:29 +07 (Pending unknown, approved paid/unpaid)

### Commands
1. `cd frontend && npm run build`
- Result: **PASSED**

2. `cd backend && npm run deploy:quick`
- Result: **PASSED**
- Summary: Worker `vantrangedu-api` deploy thành công, version `a4d66bb6-e208-4755-9cbb-f18b7b64289b`.

3. `cd backend && npx wrangler d1 execute vantrangedu_db --remote --file=./migrations/0043_exam_registration_payment_status_by_workflow.sql`
- Result: **PASSED**
- Summary: Production D1 normalize lại workflow payment marker (`pending -> NULL/unknown`, `approved null -> unpaid`), `2` rows written.

4. `cd frontend && npm run deploy:quick`
- Result: **PASSED**
- Summary: Cloudflare Pages deploy hoàn tất, preview URL `https://201bad9d.vantrangedu.pages.dev`.

5. `curl -I https://vantrangedu-api.bangachieu2.workers.dev`
- Result: **PASSED** (`200 OK`)

6. `curl -I https://vantrangedu.com`
- Result: **PASSED** (`200 OK`)

7. `curl -I https://201bad9d.vantrangedu.pages.dev`
- Result: **PASSED** (`200 OK`)

### Notes
- Pending rows giờ luôn hiển thị `Chưa xác định`.
- Approved rows giờ chỉ còn 2 lựa chọn `Đã nộp học phí` và `Chưa nộp học phí`.

## Verification Run - 2026-04-11 01:19 +07 (Unknown exam fee state)

### Commands
1. `cd frontend && npm run build`
- Result: **PASSED**

2. `cd backend && npx tsc --noEmit`
- Result: **FAILED**
- Summary: Backend đang có nhiều lỗi TypeScript legacy/không liên quan ở `admin-queries.ts`, `index.ts`, `classes.ts`, `documents.ts`, một số test files, và utils. Không thấy lỗi mới trỏ vào phần thay đổi `exam_registrations.payment_status`.

3. `cd backend && npx vitest run src/test/routes/exam-schedules.test.ts src/test/routes/export.test.ts`
- Result: **FAILED**
- Summary:
  - `src/test/routes/export.test.ts`: **PASSED** (`12/12`).
  - `src/test/routes/exam-schedules.test.ts`: **FAILED** ở 7 test bucket/linked-class có sẵn, kèm warning Google Calendar thiếu `GOOGLE_PRIVATE_KEY`; không có test nào hiện đang cover flow mới `unknown|paid|unpaid` của payment marker.

4. `cd backend && npm run deploy:quick`
- Result: **PASSED**
- Summary: Worker `vantrangedu-api` deploy thành công, version `c7d4f392-e0f9-4fa3-bf82-ae41f9c5b75d`.

5. `cd frontend && npm run deploy:quick`
- Result: **PASSED**
- Summary: Cloudflare Pages deploy hoàn tất, preview URL `https://500b35a7.vantrangedu.pages.dev`.

6. `curl -I https://vantrangedu-api.bangachieu2.workers.dev`
- Result: **PASSED** (`200 OK`)

7. `curl -I https://vantrangedu.com`
- Result: **PASSED** (`200 OK`)

8. `curl -I https://500b35a7.vantrangedu.pages.dev`
- Result: **PASSED** (`200 OK`)

### Notes
- Frontend build sạch sau khi đổi UI badge học phí sang select 3 trạng thái.
- Verification backend hiện vẫn bị chặn bởi các lỗi legacy ngoài phạm vi chỉnh sửa này.
- Production hiện đã có cả backend lẫn frontend cho flow `Chưa xác định`.

## Verification Run - 2026-04-10 02:08 +07 (Dialog portal + paid exam fee default)

### Commands
1. `cd frontend && npm run build`
- Result: **PASSED**

2. `cd backend && npx vitest run src/test/routes/export.test.ts src/test/routes/export.test.js`
- Result: **PASSED** (`24/24`)

3. `cd backend && npx wrangler d1 execute vantrangedu_db --remote --file=./migrations/0042_exam_registration_payment_default_paid.sql`
- Result: **PASSED**
- Summary: production D1 updated current exam registration fee markers to `paid` (`397` changes).

4. `cd backend && npm run deploy:quick`
- Result: **PASSED**
- Summary: Worker `vantrangedu-api` deploy thành công, version `a8d2c15d-0703-4d0c-aa11-4a6476db5401`.

5. `cd frontend && npm run deploy:quick`
- Result: **PASSED**
- Summary: Cloudflare Pages deploy hoàn tất, preview URL `https://9f6cc5c3.vantrangedu.pages.dev`.

6. Smoke fetch `https://vantrangedu.com`
- Result: **PASSED**

7. Smoke fetch `https://vantrangedu.pages.dev`
- Result: **PASSED**

8. Smoke fetch `https://9f6cc5c3.vantrangedu.pages.dev`
- Result: **PASSED**

9. Smoke fetch `https://vantrangedu-api.bangachieu2.workers.dev`
- Result: **PASSED**

### Notes
- Dialog desktop giờ portal ra `document.body`, nên canh giữa viewport ổn định hơn ở zoom 100%.
- Exam fee marker mặc định production hiện tại và cho đăng ký mới đều đã đổi sang `paid`.

## Verification Run - 2026-04-10 02:00 +07 (Student modal portal fix)

### Commands
1. `cd frontend && npm run build`
- Result: **PASSED**

### Notes
- Xác nhận `StudentFormModal` build sạch sau khi đổi sang portal + overlay centered container.
- Không deploy trong session này.

## Verification Run - 2026-04-10 01:51 +07 (Admin-wide normalization sweep)

### Commands
1. `cd frontend && npm run build`
- Result: **FAILED**, then **PASSED** after fixing legacy class component imports exposed by re-enabling `ClassesManagement` mode inside `UnifiedClassesManagement`.

2. `cd frontend && npm run deploy:quick`
- Result: **PASSED**
- Summary: Cloudflare Pages deploy hoàn tất, preview URL `https://30507794.vantrangedu.pages.dev`.

3. Smoke fetch `https://vantrangedu.com`
- Result: **PASSED**

4. Smoke fetch `https://vantrangedu.pages.dev`
- Result: **PASSED**

5. Smoke fetch `https://30507794.vantrangedu.pages.dev`
- Result: **PASSED**

### Notes
- Frontend build passes after admin-wide shell/header/mobile/modal changes.
- Deploy trong session này đã được thực hiện theo yêu cầu user.

## Verification Run - 2026-04-10 01:09 +07 (Admin students layout cleanup)

### Commands
1. `cd frontend && npm run build`
- Result: **PASSED**

2. `cd frontend && npm run deploy:quick`
- Result: **PASSED**
- Summary: Cloudflare Pages deploy hoàn tất, preview URL `https://848e9ad5.vantrangedu.pages.dev`.

3. Smoke fetch `https://vantrangedu.com`
- Result: **PASSED**

4. Smoke fetch `https://vantrangedu.pages.dev`
- Result: **PASSED**

5. Smoke fetch `https://848e9ad5.vantrangedu.pages.dev`
- Result: **PASSED**

### Notes
- Xác nhận layout mới của `StudentsManagement` và `StudentFormModal` build sạch sau khi đổi cấu trúc modal/body scroll/sidebar.
- Deploy trong session này được thực hiện theo yêu cầu user và sẽ bao gồm toàn bộ trạng thái frontend hiện tại trong worktree.

## Verification Run - 2026-04-09 23:40 +07 (Admin exam fee marker)

### Commands
1. `cd frontend && npm run build`
- Result: **PASSED**

2. `cd backend && npx vitest run`
- Result: **FAILED**
- Summary:
  - New export-route regression from `exam_registrations.payment_status` was fixed afterward.
  - Remaining failures are in legacy/unrelated suites: `src/test/services/cccd-ocr.test.js`, `src/test/routes/exam-schedules.test.ts`, `src/test/routes/exam-schedules.test.js`.

3. `cd backend && npx vitest run src/test/routes/export.test.ts src/test/routes/export.test.js`
- Result: **PASSED** (`24/24`)

4. `cd backend && npx wrangler d1 execute vantrangedu_db --remote --command "PRAGMA table_info(exam_registrations);"`
- Result: **PASSED**
- Summary: production D1 chưa có cột `payment_status` trước khi migrate.

5. `cd backend && npx wrangler d1 execute vantrangedu_db --remote --file=./migrations/0041_exam_registration_payment_status.sql`
- Result: **PASSED**

6. `cd backend && npm run deploy:quick`
- Result: **PASSED**
- Summary: Worker `vantrangedu-api` deploy thành công, version `2da22468-50ab-4ff3-8854-d35fbeb3a5c8`.

7. `cd frontend && npm run deploy:quick`
- Result: **PASSED**
- Summary: Cloudflare Pages deploy hoàn tất, preview URL `https://0ce48855.vantrangedu.pages.dev`.

8. Smoke fetch `https://vantrangedu-api.bangachieu2.workers.dev`
- Result: **PASSED**

9. Smoke fetch `https://vantrangedu.pages.dev`
- Result: **PASSED**

10. Smoke fetch `https://vantrangedu.com`
- Result: **PASSED**

### Notes
- Feature-specific verification now passes for frontend build and backend export flows that consume the new exam registration payment marker.
- Production DB migration + deploy đã hoàn tất trong session này.

## Verification Run - 2026-04-02 07:45 +07 (Local environment setup)

### Commands
1. `node --version`
- Result: **PASSED** (`v22.22.2`)

2. `npm --version`
- Result: **PASSED** (`10.9.7`)

3. `python --version`
- Result: **PASSED** (`Python 3.12.10`)

4. `.venv_ocr\\Scripts\\python.exe -c "import fitz, paddleocr, docx, numpy, PIL, PyPDF2, requests, paddle; print('python-ok')"`
- Result: **PASSED**

5. `cd frontend && npm run build`
- Result: **PASSED**

6. `cd frontend && npx playwright install chromium`
- Result: **PASSED**

7. `cd frontend && npx playwright test e2e/auth-visibility-smoke.spec.ts`
- Result: **PASSED** (`6/6`)

8. `cd backend && npx vitest run`
- Result: **FAILED**
- Summary:
  - `src/test/routes/export.test.ts`: `8` tests fail due `D1_ERROR: no such column: s.image_cccd_front`
  - `src/test/routes/exam-schedules.test.ts`: `1` test fails (`expected 400, received 200`) and Google Calendar path logs missing `GOOGLE_PRIVATE_KEY`

## Test Commands
| Command | Purpose | Path |
|---------|---------|------|
| `npm run test` | Run Vitest suite | backend/ or frontend/ |
| `npm run build` | Build for production | both |
| `npm run dev` | Start dev server | both |
| `npm run deploy` | Deploy to production | both |

## Database Migration Checklist
```
Migrations run in order (critical):
✓ 0000_initial_database_schema.sql
✓ 0002_vstep_schema.sql
✓ 0005_add_meeting_link_to_class_schedules.sql
✓ ... (through 0028_add_zoom_link_backup_to_exam_schedules.sql)
```
**Command**: `wrangler d1 execute vantrangedu_db --file=./migrations/NNNN_*.sql`

## Production Deployment Checklist
- [ ] `JWT_SECRET` set via `wrangler secret put JWT_SECRET`
- [ ] D1 binding: DB → vantrangedu_db (ID: ae59b4c6-0c72-4e7c-856c-d2106da89004)
- [ ] R2 binding: R2 → vantrangedu-files
- [ ] R2 binding: VIDEO_BUCKET → class-videos
- [ ] All 28 migrations run in order
- [ ] CORS whitelist includes vantrangexam domains
- [ ] Rate limiting configured in wrangler.toml
- [ ] Google credentials set (GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY)
- [ ] Cloudflare Images token set (CLOUDFLARE_IMAGES_API_TOKEN)
- [ ] R2 credentials set (R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY)

## Known Gotchas & Risks
| Issue | Impact | Mitigation |
|-------|--------|-----------|
| exam-schedules.ts is 1487 LOC | Hard to test, review, maintain | Refactor into smaller modules |
| export.ts is 1296 LOC | Same as above | Extract Excel generation logic |
| No transaction locks on payments | Race condition: confirm → cancel → refund broken | Manual verification before confirm |
| Session touch on every request | DB hit per request (bottleneck at scale) | Consider caching; monitor performance |
| Soft deletes not filtered | Risk: deleted data exposed | Always use WHERE deleted_at IS NULL |
| No audit trail for payments | Can't track who confirmed payment | Add audit logging to payment endpoints |
| R2 files never cleaned up | Storage bloat over time | Implement cleanup job (cron) |
| RESEND_API_KEY env set but unused | Dead code; confusing | Remove or implement email notifications |
| Google Meet automation incomplete | Columns exist but no handler | Complete implementation or remove columns |

## QA Test Flow (Manual)

### 1. Auth & SSO
- [ ] Admin login → token issued → stored in auth_sessions
- [ ] Session touch updates last_active on every request
- [ ] Session revoke → next request returns 401
- [ ] SSO handoff: redirect → create handoff → authenticate → exchange → JWT issued

### 2. Student Flow
- [ ] Register new student (CCCD, phone, email)
- [ ] Login with CCCD + phone
- [ ] Browse available classes
- [ ] Register for class (status: pending)
- [ ] Admin approves registration
- [ ] Student sees class in dashboard

### 3. Payments
- [ ] Admin creates payment record (amount, student, class)
- [ ] Admin confirms payment (status: confirmed)
- [ ] Student can proceed with class (if payment required)

### 4. Exams
- [ ] Create exam schedule (date, time, location)
- [ ] Student registers for exam
- [ ] Admin approves registration
- [ ] Student takes exam (exam_attempts, exam_answers)
- [ ] System grades automatically or flags for review

### 5. Online Classes
- [ ] Create online class (topic, schedule)
- [ ] Student enrolls (status: pending)
- [ ] Admin approves enrollment
- [ ] Student joins class session (Zoom/Meet link)
- [ ] Attendance recorded

### 6. Documents
- [ ] Admin uploads document (PDF, DOCX, etc.)
- [ ] Set permissions (public, students, teachers)
- [ ] Student downloads document
- [ ] Document audit logged

### 7. Export
- [ ] Admin triggers student export
- [ ] Excel file generated with CCCD, phone, email
- [ ] Download via R2 presigned URL

## Monitoring & Health Checks
| Metric | Target | Check |
|--------|--------|-------|
| API response time | < 200ms (p95) | Monitor Wrangler analytics |
| DB connection pool | < 10 pending | Check D1 metrics |
| R2 upload success | 99%+ | Monitor error logs |
| Session validity | 0 revoked before exp | Check auth_sessions table |
| Rate limit enforcement | 0 false positives | Test with load tool |

## Performance Baselines
- **Login**: < 300ms (1x DB query)
- **Student list (admin)**: < 1s (1 DB query)
- **Export (100 students)**: < 5s (Excel generation)
- **Exam attempt submit**: < 500ms (2 DB writes)

## Rollback Procedure
1. Revert code to previous tag: `git checkout <tag>`
2. Revert D1 if needed: Run previous migration or restore backup
3. Re-deploy: `npm run deploy`
4. Verify health: Check auth_sessions, class registrations, payments

## Verification Run — 2026-03-23 01:32 +07 (vantrangedu Zoom Links Max-2)

### Commands
1. `cd backend && npx vitest run src/test/routes/exam-schedules.test.ts`
- Result: **PASSED** (`1 file`, `20 tests passed`).

2. `cd frontend && npm run build`
- Result: **PASSED** (Vite production build succeeded).

3. `cd backend && npm run deploy:quick`
- Result: **PASSED**
- URL: `https://vantrangedu-api.bangachieu2.workers.dev`
- Version: `ee1c4120-14bf-4352-900b-ccd8d4463af6`

4. `cd frontend && npm run deploy:quick`
- Result: **PASSED**
- URL: `https://1c756c0d.vantrangedu.pages.dev`

## Test Run — 2026-03-23 01:33
- **Status**: no package.json found
- **Summary**:  

## Verification Run — 2026-03-23 01:44 +07 (Zoom backup credentials + label sync)

### Commands
1. `cd backend && npx vitest run src/test/routes/exam-schedules.test.ts`
- Result: **PASSED** (`1 file`, `20 tests passed`).

2. `cd frontend && npm run build`
- Result: **PASSED**.

3. `cd backend && npm run db:migrate:0030`
- Result: **PASSED** (remote D1, 2 queries executed).

4. `cd backend && npm run deploy:quick`
- Result: **PASSED**
- URL: `https://vantrangedu-api.bangachieu2.workers.dev`
- Version: `c7a78708-5761-4ee2-82d3-dd0fe4735173`

5. `cd frontend && npm run deploy:quick`
- Result: **PASSED**
- URL: `https://9bef87bb.vantrangedu.pages.dev`

## Test Run — 2026-03-23 01:44
- **Command**: `cd backend && npx vitest run`
- **Status**: failing
- **Summary**: [OCR] OCR.space raw engine=2 lang=eng: {"OCRExitCode":1,"IsErroredOnProcessing":false,"ParsedResults":[{"ParsedText":"CĂN CƯỚC CÔNG DÂN\nSố 079203001234\nHọ và tên: NGUYỄN VĂN A\nNgày sinh: 09/12/2002"}]} stdout | src/test/services/cccd-ocr.test.ts > extractRegistrationPrefillFromImage > retries OCR.space with engine 1 in Vietnamese if engine 2 fails [OCR] OCR.space raw engine=2 lang=eng: {"OCRExitCode":3,"IsErroredOnProcessing":true,"ErrorMessage":["engine 2 failed"]} 

## Test Run — 2026-03-31 16:35
- **Command**: `cd backend && npx vitest run`
- **Status**: failing
- **Summary**: [OCR] OCR.space raw engine=2 lang=eng: {"OCRExitCode":1,"IsErroredOnProcessing":false,"ParsedResults":[{"ParsedText":"CĂN CƯỚC CÔNG DÂN\nSố 079203001234\nHọ và tên: NGUYỄN VĂN A\nNgày sinh: 09/12/2002"}]}    ✓ student profile service > normalizeStudentGender > rejects unsupported gender values with a clear error 874ms stdout | src/test/services/cccd-ocr.test.ts > extractRegistrationPrefillFromImage > retries OCR.space with engine 1 in Vietnamese if engine 2 fails 

## Test Run — 2026-04-02 07:46
- **Command**: `cd backend && npx vitest run`
- **Status**: failing
- **Summary**: [OCR] OCR.space raw engine=2 lang=eng: {"OCRExitCode":1,"IsErroredOnProcessing":false,"ParsedResults":[{"ParsedText":"CĂN CƯỚC CÔNG DÂN\nSố 079203001234\nHọ và tên: NGUYỄN VĂN A\nNgày sinh: 09/12/2002"}]} [90mstdout[2m | src/test/services/cccd-ocr.test.ts[2m > [22m[2mextractRegistrationPrefillFromImage[2m > [22m[2mretries OCR.space with engine 1 in Vietnamese if engine 2 fails [OCR] OCR.space raw engine=2 lang=eng: {"OCRExitCode":3,"IsErroredOnProcessing":true,"ErrorMessage":["engine 2 failed"]} 

## Verification Run — 2026-04-08 22:50 +07:00 (skills.sh website skill pack)

### Commands
1. `npx skills add anthropics/skills --skill frontend-design webapp-testing --agent opencode codex cursor cline --yes --copy`
- Result: **PASSED**

2. `npx skills add vercel-labs/agent-skills --skill vercel-react-best-practices --agent opencode codex cursor cline --yes --copy`
- Result: **PASSED**

3. `npx skills add vercel-labs/agent-skills --skill web-design-guidelines --agent opencode codex cursor cline --yes --copy`
- Result: **PASSED**

4. `npx skills add coreyhaines31/marketingskills --skill seo-audit form-cro --agent opencode codex cursor cline --yes --copy`
- Result: **PASSED**

5. `npx skills ls --json`
- Result: **PASSED**
- Summary:
  - Skills mới được nhận diện trong `.agents/skills/`: `frontend-design`, `webapp-testing`, `vercel-react-best-practices`, `web-design-guidelines`, `form-cro`, `seo-audit`.
  - `skills-lock.json` được tạo để khóa nguồn + hash cho 6 skill đã cài.
  - CLI báo `Snyk Med Risk` cho `seo-audit` và `web-design-guidelines`; các skill còn lại ở mức `Low Risk` trong output cài đặt.

## Verification Run — 2026-04-08 23:04 +07:00 (cross-site SEO/CSP pass)

### Commands
1. `cd frontend && npm exec tsc --noEmit`
- Result: **FAILED / unrelated baseline issues**
- Summary:
  - Frontend hiện có nhiều lỗi TypeScript sẵn trong repo ngoài phạm vi pass này (admin/mobile/UI typing, API method typings, implicit any, v.v.).
  - Lệnh này không phù hợp để xác nhận riêng thay đổi mới vì baseline đã fail từ trước.

2. `cd frontend && npm exec vite build -- --outDir temp-build`
- Result: **PASSED**
- Summary:
  - Frontend build production thành công với source sau khi cập nhật `SEO.tsx`, `SemanticLanding.tsx`, `PostDetailPage.tsx`, `public/_headers`.
  - Chỉ có cảnh báo chunk lớn từ Vite; build không lỗi.

3. `cd frontend && Remove-Item "temp-build" -Recurse -Force`
- Result: **PASSED**
- Summary:
  - Đã dọn artifact verify tạm thời sau khi build pass.

## Test Run — 2026-04-08 22:51
- **Command**: `cd backend && npx vitest run`
- **Status**: inconclusive
- **Summary**: [2m   Duration [22m 41.34s[2m (transform 21.17s, setup 0ms, collect 447.37s, tests 62.28s, environment 23ms, prepare 244.18s)[22m  [vpw:dbg] Shutting down runtimes... 

## Test Run — 2026-04-08 23:06
- **Command**: `cd backend && npx vitest run`
- **Status**: inconclusive
- **Summary**:  [2m   Duration [22m 41.16s[2m (transform 22.35s, setup 0ms, collect 450.38s, tests 61.66s, environment 26ms, prepare 242.11s)[22m  [vpw:dbg] Shutting down runtimes... 

## Verification Run — 2026-04-08 23:55 +07:00 (Cloudflare live deploy + production smoke)

### Commands
1. `cd backend && npx wrangler queues create photo-3x4-pipeline-dev`
- Result: **PASSED**

2. `cd backend && npx wrangler deploy --env development`
- Result: **PASSED**

- Summary:
  - Development worker deployed: `https://vantrangedu-api-dev.bangachieu2.workers.dev`

3. `cd frontend && npx cross-env VITE_API_URL=https://vantrangedu-api-dev.bangachieu2.workers.dev npm run build:prod`
- Result: **PASSED**

4. `cd frontend && npx wrangler pages deploy dist --project-name=vantrangedu --branch=live-dev-register --commit-dirty=true`
- Result: **PASSED**
- Summary:
  - Preview alias deployed: `https://live-dev-register.vantrangedu.pages.dev`

5. `cd frontend && npm run deploy:quick`
- Result: **PASSED**
- Summary:
  - Frontend production branch `main` deployed.
  - Deployment URL returned by Wrangler: `https://15fb5283.vantrangedu.pages.dev`

6. `cd frontend && npx playwright test --config playwright.live.config.ts`
- Result: **PASSED**
- Summary:
  - `2/2` passed on production live site.
  - Public routes smoke pass.
  - `/register` flow pass với upload ảnh thật và submit thật, không dùng mock.

7. `https://vantrangedu.com/register` and `https://vantrangedu.com/feedback` via web fetch
- Result: **PASSED**
- Summary:
  - Custom domain phản hồi thành công sau deploy production.

## Test Run — 2026-04-08 23:58
- **Command**: `cd backend && npx vitest run`
- **Status**: inconclusive
- **Summary**: [2m   Duration [22m 47.09s[2m (transform 25.61s, setup 0ms, collect 534.05s, tests 77.52s, environment 37ms, prepare 251.09s)[22m  [vpw:dbg] Shutting down runtimes... 

## Verification Run — 2026-04-09 00:07 +07:00 (CCCD auto-crop refinement)

### Commands
1. `cd frontend && npm exec vite build -- --outDir temp-build`
- Result: **PASSED**
- Summary:
  - Frontend build production thành công sau khi cập nhật `frontend/src/components/upload/document-normalization.ts`.
  - Không phát sinh lỗi compile từ các thay đổi geometry-aware candidate scoring, adaptive quad expansion, và sharpen/noise tuning.

2. `cd frontend && Remove-Item "temp-build" -Recurse -Force`
- Result: **PASSED**
- Summary:
  - Đã dọn artifact build tạm sau verification.

## Test Run — 2026-04-09 00:08
- **Command**: `cd backend && npx vitest run`
- **Status**: inconclusive
- **Summary**: [2m   Duration [22m 46.54s[2m (transform 24.77s, setup 0ms, collect 503.10s, tests 77.08s, environment 35ms, prepare 253.09s)[22m  [vpw:dbg] Shutting down runtimes... 

## Verification Run — 2026-04-09 09:59 +07:00 (mobile auth CTA visibility)

### Commands
1. `cd frontend && $env:SKIP_PRERENDER='true'; npm exec vite build -- --outDir temp-build; if ($?) { Remove-Item "temp-build" -Recurse -Force }`
- Result: **PASSED**
- Summary:
  - Frontend Vite production build thành công sau khi cập nhật `ModernHeader.tsx`.
  - Artifact xác minh tạm `frontend/temp-build/` đã được dọn ngay sau build.

## Verification Run — 2026-04-09 10:05 +07:00 (public registration canonical route)

### Commands
1. `cd frontend && $env:SKIP_PRERENDER='true'; npm exec vite build -- --outDir temp-build; if ($?) { Remove-Item "temp-build" -Recurse -Force }`
- Result: **PASSED**
- Summary:
  - Frontend Vite production build thành công sau khi chuẩn hóa các CTA public từ `/admissions` sang `/register` và thêm redirect route compatibility.
  - Artifact xác minh tạm `frontend/temp-build/` đã được dọn ngay sau build.

## Verification Run — 2026-04-09 10:14 +07:00 (frontend production deploy)

### Commands
1. `cd frontend && npm run deploy:quick`
- Result: **PASSED**
- Summary:
  - Frontend build production thành công trong lệnh deploy.
  - Cloudflare Pages production deploy hoàn tất.
  - Deployment URL returned by Wrangler: `https://b95b99b7.vantrangedu.pages.dev`

## Verification Run — 2026-04-09 10:25 +07:00 (register processing progress UX)

### Commands
1. `cd frontend && $env:SKIP_PRERENDER='true'; npm exec vite build -- --outDir temp-build; if ($?) { Remove-Item "temp-build" -Recurse -Force }`
- Result: **PASSED**
- Summary:
  - Frontend Vite production build thành công sau khi thêm panel loading/progress cho OCR CCCD và AI generate ảnh 3x4 ở `/register`.
  - Artifact xác minh tạm `frontend/temp-build/` đã được dọn ngay sau build.

## Verification Run — 2026-04-09 10:26 +07:00 (deploy register processing progress UX)

### Commands
1. `cd frontend && npm run deploy:quick`
- Result: **PASSED**
- Summary:
  - Frontend production build thành công trong lệnh deploy.
  - Cloudflare Pages production deploy hoàn tất với loading/progress mới cho `/register`.
  - Deployment URL returned by Wrangler: `https://ffaabd0c.vantrangedu.pages.dev`

## Verification Run — 2026-04-09 10:38 +07:00 (register spinner visibility + tolerant CCCD flow)

### Commands
1. `cd frontend && $env:SKIP_PRERENDER='true'; npm exec vite build -- --outDir temp-build; if ($?) { Remove-Item "temp-build" -Recurse -Force }`
- Result: **PASSED**
- Summary:
  - Frontend Vite production build thành công sau khi thêm progress panel fixed + uploader overlay cho `/register`.
  - CCCD flow mới build pass với logic giữ ảnh và hạ OCR/crop failure xuống warning thay vì reject.
  - Artifact xác minh tạm `frontend/temp-build/` đã được dọn ngay sau build.

## Verification Run — 2026-04-09 10:44 +07:00 (mobile register polish + production deploy)

### Commands
1. `cd frontend && $env:SKIP_PRERENDER='true'; npm exec vite build -- --outDir temp-build; if ($?) { Remove-Item "temp-build" -Recurse -Force }`
- Result: **PASSED**
- Summary:
  - Frontend Vite production build thành công sau khi tinh chỉnh thêm progress UI cho mobile.
  - Artifact xác minh tạm `frontend/temp-build/` đã được dọn ngay sau build.

2. `cd frontend && npm run deploy:quick`
- Result: **PASSED**
- Summary:
  - Cloudflare Pages production deploy hoàn tất.
  - Deployment URL returned by Wrangler: `https://ba100842.vantrangedu.pages.dev`

3. `GET https://ba100842.vantrangedu.pages.dev/`
- Result: **PASSED**

4. `GET https://ba100842.vantrangedu.pages.dev/register`
- Result: **PASSED**

## Verification Run — 2026-04-09 10:50 +07:00 (mobile CCCD auto-alignment fix)

### Commands
1. `cd frontend && $env:SKIP_PRERENDER='true'; npm exec vite build -- --outDir temp-build; if ($?) { Remove-Item "temp-build" -Recurse -Force }`
- Result: **PASSED**
- Summary:
  - Frontend Vite production build thành công sau khi sửa candidate selection và transform khởi tạo cho mobile CCCD editor.
  - Artifact xác minh tạm `frontend/temp-build/` đã được dọn ngay sau build.

2. `cd frontend && npm run deploy:quick`
- Result: **PASSED**
- Summary:
  - Cloudflare Pages production deploy hoàn tất.
  - Deployment URL returned by Wrangler: `https://ea000338.vantrangedu.pages.dev`

3. `GET https://ea000338.vantrangedu.pages.dev/`
- Result: **PASSED**

4. `GET https://ea000338.vantrangedu.pages.dev/register`
- Result: **PASSED**

## Verification Run — 2026-04-09 11:01 +07:00 (mobile OCR quality improvement)

### Commands
1. `cd frontend && $env:SKIP_PRERENDER='true'; npm exec vite build -- --outDir temp-build; if ($?) { Remove-Item "temp-build" -Recurse -Force }`
- Result: **PASSED**
- Summary:
  - Frontend build thành công sau khi mở rộng crop context của camera mobile.
  - Artifact xác minh tạm `frontend/temp-build/` đã được dọn ngay sau build.

2. `cd backend && npm exec vitest run "src/test/services/cccd-ocr.test.ts"`
- Result: **PASSED**
- Summary:
  - 14/14 tests pass cho `cccd-ocr-service` sau khi nới conflict arbitration.

3. `cd frontend && npm run deploy:quick`
- Result: **PASSED**
- Summary:
  - Cloudflare Pages deploy hoàn tất.
  - Deployment URL returned by Wrangler: `https://9dfedb14.vantrangedu.pages.dev`

4. `cd backend && npm run deploy:quick`
- Result: **PASSED**
- Summary:
  - Cloudflare Worker deploy hoàn tất.
  - Production API URL: `https://vantrangedu-api.bangachieu2.workers.dev`

5. `GET https://9dfedb14.vantrangedu.pages.dev/register`
- Result: **PASSED**

6. `GET https://vantrangedu-api.bangachieu2.workers.dev/`
- Result: **PASSED**

## Verification Run — 2026-04-09 11:32 +07:00 (OCR.space-only mobile upgrade)

### Commands
1. `cd frontend && $env:SKIP_PRERENDER='true'; npm exec vite build -- --outDir temp-build; if ($?) { Remove-Item "temp-build" -Recurse -Force }`
- Result: **PASSED**
- Summary:
  - Frontend build thành công sau khi thêm tối ưu file CCCD cho OCR.space upload profile.
  - Artifact xác minh tạm `frontend/temp-build/` đã được dọn ngay sau build.

2. `cd backend && npm exec vitest run "src/test/services/cccd-ocr.test.ts"`
- Result: **PASSED**
- Summary:
  - 14/14 tests pass cho `cccd-ocr-service` sau khi nâng attempt strategy `vie -> eng` và URL fallback cho ảnh lớn.

3. `cd frontend && npm run deploy:quick`
- Result: **PASSED**
- Summary:
  - Cloudflare Pages deploy hoàn tất.
  - Deployment URL returned by Wrangler: `https://a3df707d.vantrangedu.pages.dev`

4. `cd backend && npm run deploy:quick`
- Result: **PASSED**
- Summary:
  - Cloudflare Worker deploy hoàn tất.
  - Production API URL: `https://vantrangedu-api.bangachieu2.workers.dev`

## Verification Run — 2026-04-09 13:09 +07:00 (client crop preview source + passive touch fix)

### Commands
1. `cd frontend && $env:SKIP_PRERENDER='true'; npm exec vite build -- --outDir temp-build; if ($?) { Remove-Item "temp-build" -Recurse -Force }`
- Result: **PASSED**
- Summary:
  - Frontend build thành công sau khi chuyển preview CCCD sang object URL của file crop local và sửa passive `touchend` listener.
  - Artifact xác minh tạm `frontend/temp-build/` đã được dọn ngay sau build.

2. `cd frontend && npm run deploy:quick`
- Result: **PASSED**
- Summary:
  - Cloudflare Pages deploy hoàn tất.
  - Deployment URL returned by Wrangler: `https://f02db0a6.vantrangedu.pages.dev`

## Verification Run — 2026-04-09 13:15 +07:00 (manual-only CCCD flow)

### Commands
1. `cd frontend && $env:SKIP_PRERENDER='true'; npm exec vite build -- --outDir temp-build; if ($?) { Remove-Item "temp-build" -Recurse -Force }`
- Result: **PASSED**
- Summary:
  - Frontend build thành công sau khi loại bỏ auto normalize/finalize khỏi luồng CCCD.
  - Artifact xác minh tạm `frontend/temp-build/` đã được dọn ngay sau build.

2. `cd frontend && npm run deploy:quick`
- Result: **PASSED**
- Summary:
  - Cloudflare Pages deploy hoàn tất.
  - Deployment URL returned by Wrangler: `https://c49963ab.vantrangedu.pages.dev`

5. `GET https://a3df707d.vantrangedu.pages.dev/register`
- Result: **PASSED**

6. `GET https://vantrangedu-api.bangachieu2.workers.dev/`
- Result: **PASSED**

## Verification Run — 2026-04-09 11:35 +07:00 (register wait-time notice)

### Commands
1. `cd frontend && $env:SKIP_PRERENDER='true'; npm exec vite build -- --outDir temp-build; if ($?) { Remove-Item "temp-build" -Recurse -Force }`
- Result: **PASSED**
- Summary:
  - Frontend build thành công sau khi thêm thông báo chờ tối đa 3 phút ở `/register`.
  - Artifact xác minh tạm `frontend/temp-build/` đã được dọn ngay sau build.

2. `cd frontend && npm run deploy:quick`
- Result: **PASSED**
- Summary:
  - Cloudflare Pages deploy hoàn tất.
  - Deployment URL returned by Wrangler: `https://d700c7e3.vantrangedu.pages.dev`

3. `GET https://d700c7e3.vantrangedu.pages.dev/register`
- Result: **PASSED**

## Verification Run — 2026-04-09 11:43 +07:00 (normalize-first 3-minute warning)

### Commands
1. `cd frontend && $env:SKIP_PRERENDER='true'; npm exec vite build -- --outDir temp-build; if ($?) { Remove-Item "temp-build" -Recurse -Force }`
- Result: **PASSED**
- Summary:
  - Frontend build thành công sau khi cập nhật text trong `DocumentSmartEditor` cho trạng thái normalize-first.
  - Artifact xác minh tạm `frontend/temp-build/` đã được dọn ngay sau build.

2. `cd frontend && npm run deploy:quick`
- Result: **PASSED**
- Summary:
  - Cloudflare Pages deploy hoàn tất.
  - Deployment URL returned by Wrangler: `https://0eafa77a.vantrangedu.pages.dev`

3. `GET https://0eafa77a.vantrangedu.pages.dev/register`
- Result: **PASSED**

## Verification Run — 2026-04-09 11:47 +07:00 (fix angleAt runtime error)

### Commands
1. `cd frontend && $env:SKIP_PRERENDER='true'; npm exec vite build -- --outDir temp-build; if ($?) { Remove-Item "temp-build" -Recurse -Force }`
- Result: **PASSED**
- Summary:
  - Frontend build thành công sau khi thêm helper `angleAt` còn thiếu vào `document-normalization.ts`.
  - Artifact xác minh tạm `frontend/temp-build/` đã được dọn ngay sau build.

2. `cd frontend && npm run deploy:quick`
- Result: **PASSED**
- Summary:
  - Cloudflare Pages deploy hoàn tất.
  - Deployment URL returned by Wrangler: `https://070805d4.vantrangedu.pages.dev`

## Verification Run — 2026-04-09 11:55 +07:00 (mobile/iOS CCCD hardening)

### Commands
1. `cd frontend && $env:SKIP_PRERENDER='true'; npm exec vite build -- --outDir temp-build; if ($?) { Remove-Item "temp-build" -Recurse -Force }`
- Result: **PASSED**
- Summary:
  - Frontend build thành công sau khi thêm pass mobile/iOS cho camera, viewport, touch handling và Safari export fallback.
  - Artifact xác minh tạm `frontend/temp-build/` đã được dọn ngay sau build.

2. `cd frontend && npm run deploy:quick`
- Result: **PASSED**
- Summary:
  - Cloudflare Pages deploy hoàn tất.
  - Deployment URL returned by Wrangler: `https://4abb4cc8.vantrangedu.pages.dev`

3. `GET https://4abb4cc8.vantrangedu.pages.dev/register`
- Result: **PASSED**

## Verification Run — 2026-04-09 12:08 +07:00 (mobile CCCD crop safety margins)

### Commands
1. `cd frontend && $env:SKIP_PRERENDER='true'; npm exec vite build -- --outDir temp-build; if ($?) { Remove-Item "temp-build" -Recurse -Force }`
- Result: **PASSED**
- Summary:
  - Frontend build thành công sau khi nới padding crop và làm auto-trim bảo thủ hơn cho CCCD mobile.
  - Artifact xác minh tạm `frontend/temp-build/` đã được dọn ngay sau build.

2. `cd frontend && npm run deploy:quick`
- Result: **PASSED**
- Summary:
  - Cloudflare Pages deploy hoàn tất.
  - Deployment URL returned by Wrangler: `https://caf45836.vantrangedu.pages.dev`

3. `GET https://caf45836.vantrangedu.pages.dev/register`
- Result: **PASSED**

## Test Run — 2026-04-09 10:01
- **Command**: `cd backend && npx vitest run`
- **Status**: inconclusive
- **Summary**: [2m   Duration [22m 41.71s[2m (transform 21.86s, setup 0ms, collect 449.85s, tests 64.31s, environment 23ms, prepare 246.94s)[22m  [vpw:dbg] Shutting down runtimes... 

## Test Run — 2026-04-09 10:09
- **Command**: `cd backend && npx vitest run`
- **Status**: inconclusive
- **Summary**: [2m   Duration [22m 41.42s[2m (transform 21.81s, setup 0ms, collect 447.14s, tests 63.49s, environment 20ms, prepare 246.27s)[22m  [vpw:dbg] Shutting down runtimes... 

## Test Run — 2026-04-09 10:14
- **Command**: `cd backend && npx vitest run`
- **Status**: inconclusive
- **Summary**: [2m   Duration [22m 41.53s[2m (transform 22.58s, setup 0ms, collect 449.94s, tests 63.03s, environment 22ms, prepare 244.89s)[22m  [vpw:dbg] Shutting down runtimes... 

## Test Run — 2026-04-09 10:24
- **Command**: `cd backend && npx vitest run`
- **Status**: inconclusive
- **Summary**: [2m   Duration [22m 41.14s[2m (transform 21.07s, setup 0ms, collect 429.25s, tests 60.55s, environment 21ms, prepare 235.88s)[22m  [vpw:dbg] Shutting down runtimes... 

## Test Run — 2026-04-09 10:26
- **Command**: `cd backend && npx vitest run`
- **Status**: inconclusive
- **Summary**: [2m   Duration [22m 43.23s[2m (transform 23.60s, setup 0ms, collect 465.84s, tests 69.09s, environment 19ms, prepare 241.60s)[22m  [vpw:dbg] Shutting down runtimes... 

## Test Run — 2026-04-09 10:36
- **Command**: `cd backend && npx vitest run`
- **Status**: inconclusive
- **Summary**: [2m   Duration [22m 42.39s[2m (transform 23.50s, setup 0ms, collect 464.86s, tests 64.12s, environment 27ms, prepare 243.87s)[22m  [vpw:dbg] Shutting down runtimes... 

## Test Run — 2026-04-09 10:41
- **Command**: `cd backend && npx vitest run`
- **Status**: inconclusive
- **Summary**: [2m   Duration [22m 45.65s[2m (transform 24.54s, setup 0ms, collect 489.93s, tests 68.34s, environment 22ms, prepare 255.35s)[22m  [vpw:dbg] Shutting down runtimes... 

## Test Run — 2026-04-09 10:50
- **Command**: `cd backend && npx vitest run`
- **Status**: inconclusive
- **Summary**: [2m   Duration [22m 47.54s[2m (transform 25.73s, setup 0ms, collect 551.21s, tests 74.62s, environment 35ms, prepare 257.69s)[22m  [vpw:dbg] Shutting down runtimes... 

## Test Run — 2026-04-09 11:01
- **Command**: `cd backend && npx vitest run`
- **Status**: inconclusive
- **Summary**: [2m   Duration [22m 45.67s[2m (transform 23.83s, setup 0ms, collect 489.13s, tests 69.41s, environment 24ms, prepare 253.40s)[22m  [vpw:dbg] Shutting down runtimes... 

## Test Run — 2026-04-09 11:32
- **Command**: `cd backend && npx vitest run`
- **Status**: inconclusive
- **Summary**: [2m   Duration [22m 46.12s[2m (transform 24.63s, setup 0ms, collect 502.59s, tests 68.57s, environment 30ms, prepare 254.38s)[22m  [vpw:dbg] Shutting down runtimes... 

## Test Run — 2026-04-09 11:41
- **Command**: `cd backend && npx vitest run`
- **Status**: inconclusive
- **Summary**: [2m   Duration [22m 42.56s[2m (transform 22.19s, setup 0ms, collect 459.17s, tests 63.77s, environment 23ms, prepare 242.22s)[22m  [vpw:dbg] Shutting down runtimes... 

## Test Run — 2026-04-09 11:45
- **Command**: `cd backend && npx vitest run`
- **Status**: inconclusive
- **Summary**: [2m   Duration [22m 42.53s[2m (transform 23.49s, setup 0ms, collect 466.24s, tests 63.88s, environment 21ms, prepare 240.92s)[22m  [vpw:dbg] Shutting down runtimes... 

## Test Run — 2026-04-09 11:48
- **Command**: `cd backend && npx vitest run`
- **Status**: inconclusive
- **Summary**: [2m   Duration [22m 41.74s[2m (transform 22.80s, setup 0ms, collect 461.49s, tests 62.18s, environment 23ms, prepare 242.40s)[22m  [vpw:dbg] Shutting down runtimes... 

## Test Run — 2026-04-09 12:03
- **Command**: `cd backend && npx vitest run`
- **Status**: inconclusive
- **Summary**: [2m   Duration [22m 41.10s[2m (transform 21.27s, setup 0ms, collect 425.87s, tests 62.68s, environment 23ms, prepare 233.47s)[22m  [vpw:dbg] Shutting down runtimes... 

## Test Run — 2026-04-09 12:12
- **Command**: `cd backend && npx vitest run`
- **Status**: inconclusive
- **Summary**: [2m   Duration [22m 41.35s[2m (transform 22.75s, setup 0ms, collect 451.04s, tests 61.39s, environment 18ms, prepare 241.49s)[22m  [vpw:dbg] Shutting down runtimes... 

## Test Run — 2026-04-09 13:11
- **Command**: `cd backend && npx vitest run`
- **Status**: inconclusive
- **Summary**: [2m   Duration [22m 41.36s[2m (transform 21.61s, setup 0ms, collect 437.89s, tests 60.58s, environment 18ms, prepare 233.70s)[22m  [vpw:dbg] Shutting down runtimes... 

## Test Run — 2026-04-09 13:21
- **Command**: `cd backend && npx vitest run`
- **Status**: inconclusive
- **Summary**: [2m   Duration [22m 41.75s[2m (transform 22.10s, setup 0ms, collect 451.88s, tests 61.87s, environment 21ms, prepare 243.69s)[22m  [vpw:dbg] Shutting down runtimes... 

## Verification Run — 2026-04-09 13:44 +07:00 (web-only optimal CCCD flow)

### Commands
1. `cd frontend && $env:SKIP_PRERENDER='true'; npm exec vite build -- --outDir temp-build; if ($?) { Remove-Item "temp-build" -Recurse -Force }`
- Result: **PASSED**
- Summary:
  - Frontend build thành công sau khi chuyển CCCD sang manual crop-only và sửa preview local.
  - Artifact xác minh tạm `frontend/temp-build/` đã được dọn ngay sau build.

2. `cd backend && npm exec vitest run "src/test/services/cccd-ocr.test.ts"`
- Result: **PASSED**
- Summary:
  - 14/14 tests pass cho `cccd-ocr-service` sau khi nâng attempt strategy OCR.space (`Engine 3 auto`, `vnm`, `detectOrientation`, `scale`).

3. `cd frontend && npm run deploy:quick`
- Result: **PASSED**
- Summary:
  - Cloudflare Pages deploy hoàn tất.
  - Deployment URL returned by Wrangler: `https://8e29b9f0.vantrangedu.pages.dev`

4. `cd backend && npm run deploy:quick`
- Result: **PASSED**
- Summary:
  - Cloudflare Worker deploy hoàn tất.
  - Production API URL: `https://vantrangedu-api.bangachieu2.workers.dev`

5. `GET https://8e29b9f0.vantrangedu.pages.dev/register`
- Result: **PASSED**

6. `GET https://vantrangedu-api.bangachieu2.workers.dev/`
- Result: **PASSED**

## Verification Run — 2026-04-09 13:53 +07:00 (mobile pinch zoom for CCCD crop)

### Commands
1. `cd frontend && $env:SKIP_PRERENDER='true'; npm exec vite build -- --outDir temp-build; if ($?) { Remove-Item "temp-build" -Recurse -Force }`
- Result: **PASSED**
- Summary:
  - Frontend build thành công sau khi thêm drag 1 ngón + pinch zoom 2 ngón cho `DocumentSmartEditor`.
  - Artifact xác minh tạm `frontend/temp-build/` đã được dọn ngay sau build.

2. `cd frontend && npm run deploy:quick`
- Result: **PASSED**
- Summary:
  - Cloudflare Pages deploy hoàn tất.
  - Deployment URL returned by Wrangler: `https://cebe34e1.vantrangedu.pages.dev`

## Verification Run — 2026-04-09 14:12 +07:00 (manual crop OCR variants)

### Commands
1. `cd frontend && $env:SKIP_PRERENDER='true'; npm exec vite build -- --outDir temp-build; if ($?) { Remove-Item "temp-build" -Recurse -Force }`
- Result: **PASSED**
- Summary:
  - Frontend build thành công sau khi thêm OCR-safe variants từ ảnh crop tay của CCCD.
  - Artifact xác minh tạm `frontend/temp-build/` đã được dọn ngay sau build.

2. `cd frontend && npm run deploy:quick`
- Result: **PASSED**
- Summary:
  - Cloudflare Pages deploy hoàn tất.
  - Deployment URL returned by Wrangler: `https://08c32eab.vantrangedu.pages.dev`

## Verification Run — 2026-04-09 14:40 +07:00 (mobile 3x4 UX improvements)

### Commands
1. `cd frontend && $env:SKIP_PRERENDER='true'; npm exec vite build -- --outDir temp-build; if ($?) { Remove-Item "temp-build" -Recurse -Force }`
- Result: **PASSED**
- Summary:
  - Frontend build thành công sau khi thêm selfie capture, mobile action layout mới và tối ưu dialog chọn ảnh 3x4 trên mobile.
  - Artifact xác minh tạm `frontend/temp-build/` đã được dọn ngay sau build.

2. `cd frontend && npm run deploy:quick`
- Result: **PASSED**
- Summary:
  - Cloudflare Pages deploy hoàn tất.
  - Deployment URL returned by Wrangler: `https://95ee32db.vantrangedu.pages.dev`

## Verification Run — 2026-04-09 18:20 +07:00 (raise mobile sheets toward center)

### Commands
1. `cd frontend && $env:SKIP_PRERENDER='true'; npm exec vite build -- --outDir temp-build; if ($?) { Remove-Item "temp-build" -Recurse -Force }`
- Result: **PASSED**
- Summary:
  - Frontend build thành công sau khi chuyển mobile upload/review sheets sang floating centered layout.
  - Artifact xác minh tạm `frontend/temp-build/` đã được dọn ngay sau build.

2. `cd frontend && npm run deploy:quick`
- Result: **PASSED**
- Summary:
  - Cloudflare Pages deploy hoàn tất.
  - Deployment URL returned by Wrangler: `https://d52e0481.vantrangedu.pages.dev`

## Verification Run — 2026-04-09 18:52 +07:00 (production timeout + OCR robustness pass)

### Commands
1. `cd frontend && $env:SKIP_PRERENDER='true'; npm exec vite build -- --outDir temp-build; if ($?) { Remove-Item "temp-build" -Recurse -Force }`
- Result: **PASSED**
- Summary:
  - Frontend build thành công sau khi thêm timeout theo endpoint và bỏ hard-fail timeout ở 3x4 polling.
  - Artifact xác minh tạm `frontend/temp-build/` đã được dọn ngay sau build.

2. `cd backend && npm exec vitest run "src/test/services/cccd-ocr.test.ts"`
- Result: **PASSED**
- Summary:
  - 14/14 tests pass cho `cccd-ocr-service` sau khi tối ưu candidate priority và early-exit.

3. `cd frontend && npm run deploy:quick`
- Result: **PASSED**
- Summary:
  - Cloudflare Pages deploy hoàn tất.
  - Deployment URL returned by Wrangler: `https://0aa8ee7a.vantrangedu.pages.dev`

4. `cd backend && npm run deploy:quick`
- Result: **PASSED**
- Summary:
  - Cloudflare Worker deploy hoàn tất.
  - Production API URL: `https://vantrangedu-api.bangachieu2.workers.dev`

5. `GET https://0aa8ee7a.vantrangedu.pages.dev/register`
- Result: **PASSED**

6. `GET https://vantrangedu-api.bangachieu2.workers.dev/`
- Result: **PASSED**

## Verification Run — 2026-04-09 18:56 +07:00 (clarify OCR-after-crop UI)

### Commands
1. `cd frontend && $env:SKIP_PRERENDER='true'; npm exec vite build -- --outDir temp-build; if ($?) { Remove-Item "temp-build" -Recurse -Force }`
- Result: **PASSED**
- Summary:
  - Frontend build thành công sau khi cập nhật copy/CTA trong `DocumentSmartEditor` để nói rõ OCR vẫn chạy sau bước crop tay.
  - Artifact xác minh tạm `frontend/temp-build/` đã được dọn ngay sau build.

2. `cd frontend && npm run deploy:quick`
- Result: **PASSED**
- Summary:
  - Cloudflare Pages deploy hoàn tất.
  - Deployment URL returned by Wrangler: `https://13d96c89.vantrangedu.pages.dev`

## Verification Run — 2026-04-09 19:33 +07:00 (partial OCR autofill + editor cleanup)

### Commands
1. `cd frontend && $env:SKIP_PRERENDER='true'; npm exec vite build -- --outDir temp-build; if ($?) { Remove-Item "temp-build" -Recurse -Force }`
- Result: **PASSED**
- Summary:
  - Frontend build thành công sau khi bỏ copy thừa trong `DocumentSmartEditor`, nới partial autofill trong `StudentRegistration`, và tối ưu editor CSS.
  - Artifact xác minh tạm `frontend/temp-build/` đã được dọn ngay sau build.

2. `cd backend && npm exec vitest run "src/test/services/cccd-ocr.test.ts"`
- Result: **PASSED**
- Summary:
  - 14/14 tests pass cho `cccd-ocr-service` sau các thay đổi gần đây.

3. `cd frontend && npm run deploy:quick`
- Result: **PASSED**
- Summary:
  - Cloudflare Pages deploy hoàn tất.
  - Deployment URL returned by Wrangler: `https://427c5799.vantrangedu.pages.dev`

4. `cd backend && npm run deploy:quick`
- Result: **PASSED**
- Summary:
  - Cloudflare Worker deploy hoàn tất.
  - Production API URL: `https://vantrangedu-api.bangachieu2.workers.dev`

5. `GET https://427c5799.vantrangedu.pages.dev/register`
- Result: **PASSED**

6. `GET https://vantrangedu-api.bangachieu2.workers.dev/`
- Result: **PASSED**

## Test Run — 2026-04-09 13:47
- **Command**: `cd backend && npx vitest run`
- **Status**: inconclusive
- **Summary**: [2m   Duration [22m 42.39s[2m (transform 22.73s, setup 0ms, collect 457.67s, tests 62.85s, environment 23ms, prepare 245.30s)[22m  [vpw:dbg] Shutting down runtimes... 

## Test Run — 2026-04-09 14:05
- **Command**: `cd backend && npx vitest run`
- **Status**: inconclusive
- **Summary**: [2m   Duration [22m 41.55s[2m (transform 21.35s, setup 0ms, collect 449.71s, tests 61.96s, environment 20ms, prepare 244.22s)[22m  [vpw:dbg] Shutting down runtimes... 

## Test Run — 2026-04-09 14:32
- **Command**: `cd backend && npx vitest run`
- **Status**: inconclusive
- **Summary**: [2m   Duration [22m 41.62s[2m (transform 23.04s, setup 0ms, collect 452.64s, tests 61.88s, environment 23ms, prepare 244.87s)[22m  [vpw:dbg] Shutting down runtimes... 

## Test Run — 2026-04-09 16:13
- **Command**: `cd backend && npx vitest run`
- **Status**: inconclusive
- **Summary**: [2m   Duration [22m 42.05s[2m (transform 22.14s, setup 0ms, collect 455.48s, tests 62.63s, environment 23ms, prepare 248.95s)[22m  [vpw:dbg] Shutting down runtimes... 

## Test Run — 2026-04-09 18:14
- **Command**: `cd backend && npx vitest run`
- **Status**: inconclusive
- **Summary**: [2m   Duration [22m 43.19s[2m (transform 23.17s, setup 0ms, collect 468.66s, tests 63.93s, environment 26ms, prepare 243.53s)[22m  [vpw:dbg] Shutting down runtimes... 

## Test Run — 2026-04-09 18:52
- **Command**: `cd backend && npx vitest run`
- **Status**: inconclusive
- **Summary**: [2m   Duration [22m 42.03s[2m (transform 21.91s, setup 0ms, collect 452.85s, tests 63.29s, environment 33ms, prepare 244.24s)[22m  [vpw:dbg] Shutting down runtimes... 

## Test Run — 2026-04-09 18:58
- **Command**: `cd backend && npx vitest run`
- **Status**: inconclusive
- **Summary**: [2m   Duration [22m 42.01s[2m (transform 22.97s, setup 0ms, collect 461.67s, tests 62.63s, environment 22ms, prepare 245.23s)[22m  [vpw:dbg] Shutting down runtimes... 

## Test Run — 2026-04-09 19:36
- **Command**: `cd backend && npx vitest run`
- **Status**: inconclusive
- **Summary**: [2m   Duration [22m 41.89s[2m (transform 22.41s, setup 0ms, collect 452.66s, tests 62.22s, environment 22ms, prepare 243.67s)[22m  [vpw:dbg] Shutting down runtimes... 

## Test Run — 2026-04-09 23:40
- **Command**: `cd backend && npx vitest run`
- **Status**: inconclusive
- **Summary**: [2m   Duration [22m 45.70s[2m (transform 23.61s, setup 0ms, collect 487.91s, tests 68.78s, environment 29ms, prepare 248.72s)[22m  [vpw:dbg] Shutting down runtimes... 

## Test Run — 2026-04-09 23:55
- **Command**: `cd backend && npx vitest run`
- **Status**: inconclusive
- **Summary**: [2m   Duration [22m 45.38s[2m (transform 23.59s, setup 0ms, collect 489.93s, tests 68.07s, environment 37ms, prepare 250.15s)[22m  [vpw:dbg] Shutting down runtimes... 

## Test Run — 2026-04-10 01:09
- **Command**: `cd backend && npx vitest run`
- **Status**: inconclusive
- **Summary**: [2m   Duration [22m 45.65s[2m (transform 23.86s, setup 0ms, collect 489.09s, tests 67.66s, environment 23ms, prepare 253.39s)[22m  [vpw:dbg] Shutting down runtimes... 

## Test Run — 2026-04-10 01:15
- **Command**: `cd backend && npx vitest run`
- **Status**: inconclusive
- **Summary**: [2m   Duration [22m 45.00s[2m (transform 23.80s, setup 0ms, collect 483.33s, tests 66.73s, environment 21ms, prepare 247.94s)[22m  [vpw:dbg] Shutting down runtimes... 

## Test Run — 2026-04-10 01:51
- **Command**: `cd backend && npx vitest run`
- **Status**: inconclusive
- **Summary**: [2m   Duration [22m 42.06s[2m (transform 23.14s, setup 0ms, collect 463.69s, tests 62.89s, environment 31ms, prepare 245.38s)[22m  [vpw:dbg] Shutting down runtimes... 

## Test Run — 2026-04-10 01:54
- **Command**: `cd backend && npx vitest run`
- **Status**: inconclusive
- **Summary**: [2m   Duration [22m 42.53s[2m (transform 22.91s, setup 0ms, collect 468.48s, tests 63.96s, environment 20ms, prepare 244.23s)[22m  [vpw:dbg] Shutting down runtimes... 

## Test Run — 2026-04-10 02:00
- **Command**: `cd backend && npx vitest run`
- **Status**: inconclusive
- **Summary**: [2m   Duration [22m 42.09s[2m (transform 22.86s, setup 0ms, collect 457.84s, tests 62.70s, environment 22ms, prepare 242.59s)[22m  [vpw:dbg] Shutting down runtimes... 

## Test Run — 2026-04-10 02:09
- **Command**: `cd backend && npx vitest run`
- **Status**: inconclusive
- **Summary**: [2m   Duration [22m 42.00s[2m (transform 21.71s, setup 0ms, collect 454.92s, tests 62.79s, environment 29ms, prepare 245.20s)[22m  [vpw:dbg] Shutting down runtimes... 

## Test Run — 2026-04-11 01:22
- **Command**: `cd backend && npx vitest run`
- **Status**: inconclusive
- **Summary**: [2m   Duration [22m 41.40s[2m (transform 22.64s, setup 0ms, collect 453.11s, tests 64.45s, environment 25ms, prepare 241.53s)[22m  [vpw:dbg] Shutting down runtimes... 

## Test Run — 2026-04-11 01:30
- **Command**: `cd backend && npx vitest run`
- **Status**: inconclusive
- **Summary**: [2m   Duration [22m 42.58s[2m (transform 22.65s, setup 0ms, collect 473.17s, tests 64.17s, environment 21ms, prepare 237.51s)[22m  [vpw:dbg] Shutting down runtimes... 

## Test Run — 2026-04-11 01:42
- **Command**: `cd backend && npx vitest run`
- **Status**: inconclusive
- **Summary**: [2m   Duration [22m 41.53s[2m (transform 21.93s, setup 0ms, collect 451.17s, tests 62.81s, environment 21ms, prepare 236.62s)[22m  [vpw:dbg] Shutting down runtimes... 

## Test Run — 2026-04-11 02:00
- **Command**: `cd backend && npx vitest run`
- **Status**: inconclusive
- **Summary**: [2m   Duration [22m 42.04s[2m (transform 22.59s, setup 0ms, collect 462.07s, tests 63.82s, environment 22ms, prepare 243.25s)[22m  [vpw:dbg] Shutting down runtimes... 

## Test Run — 2026-04-11 02:12
- **Command**: `cd backend && npx vitest run`
- **Status**: inconclusive
- **Summary**: [2m   Duration [22m 41.63s[2m (transform 22.10s, setup 0ms, collect 456.89s, tests 63.64s, environment 24ms, prepare 236.65s)[22m  [vpw:dbg] Shutting down runtimes... 

## Test Run — 2026-04-11 15:14
- **Command**: `cd backend && npx vitest run`
- **Status**: inconclusive
- **Summary**: [2m   Duration [22m 42.76s[2m (transform 23.17s, setup 0ms, collect 458.66s, tests 64.38s, environment 23ms, prepare 244.71s)[22m  [vpw:dbg] Shutting down runtimes... 

## Test Run — 2026-04-11 15:28
- **Command**: `cd backend && npx vitest run`
- **Status**: inconclusive
- **Summary**: [2m   Duration [22m 42.56s[2m (transform 22.76s, setup 0ms, collect 459.49s, tests 65.13s, environment 23ms, prepare 239.10s)[22m  [vpw:dbg] Shutting down runtimes... 

## Test Run — 2026-04-11 15:36
- **Command**: `cd backend && npx vitest run`
- **Status**: inconclusive
- **Summary**: [2m   Duration [22m 42.73s[2m (transform 23.17s, setup 0ms, collect 463.39s, tests 65.00s, environment 18ms, prepare 238.94s)[22m  [vpw:dbg] Shutting down runtimes... 

## Test Run — 2026-04-11 16:02
- **Command**: `cd backend && npx vitest run`
- **Status**: inconclusive
- **Summary**: [2m   Duration [22m 42.68s[2m (transform 22.84s, setup 0ms, collect 463.99s, tests 64.22s, environment 21ms, prepare 244.15s)[22m  [vpw:dbg] Shutting down runtimes... 

## Test Run — 2026-04-11 16:11
- **Command**: `cd backend && npx vitest run`
- **Status**: inconclusive
- **Summary**: [2m   Duration [22m 43.12s[2m (transform 23.01s, setup 0ms, collect 467.85s, tests 63.84s, environment 26ms, prepare 249.85s)[22m  [vpw:dbg] Shutting down runtimes... 

## Test Run — 2026-04-11 16:27
- **Command**: `cd backend && npx vitest run`
- **Status**: inconclusive
- **Summary**: [2m   Duration [22m 41.84s[2m (transform 21.14s, setup 0ms, collect 429.99s, tests 61.02s, environment 26ms, prepare 233.49s)[22m  [vpw:dbg] Shutting down runtimes... 

## Test Run — 2026-04-11 16:44
- **Command**: `cd backend && npx vitest run`
- **Status**: inconclusive
- **Summary**: [2m   Duration [22m 42.51s[2m (transform 21.89s, setup 0ms, collect 458.84s, tests 63.32s, environment 17ms, prepare 243.29s)[22m  [vpw:dbg] Shutting down runtimes... 

## Test Run — 2026-04-11 16:57
- **Command**: `cd backend && npx vitest run`
- **Status**: inconclusive
- **Summary**: [2m   Duration [22m 42.59s[2m (transform 22.49s, setup 0ms, collect 460.26s, tests 62.54s, environment 24ms, prepare 245.90s)[22m  [vpw:dbg] Shutting down runtimes... 

## Test Run — 2026-04-11 17:20
- **Command**: `cd backend && npx vitest run`
- **Status**: inconclusive
- **Summary**: [2m   Duration [22m 45.13s[2m (transform 24.77s, setup 0ms, collect 481.08s, tests 68.32s, environment 29ms, prepare 246.60s)[22m  [vpw:dbg] Shutting down runtimes... 

## Test Run — 2026-04-11 17:29
- **Command**: `cd backend && npx vitest run`
- **Status**: inconclusive
- **Summary**: [2m   Duration [22m 45.74s[2m (transform 25.61s, setup 0ms, collect 490.01s, tests 67.19s, environment 25ms, prepare 251.47s)[22m  [vpw:dbg] Shutting down runtimes... 

## Test Run — 2026-04-12 12:11
- **Command**: `cd backend && npx vitest run`
- **Status**: inconclusive
- **Summary**: [2m   Duration [22m 42.93s[2m (transform 21.11s, setup 0ms, collect 460.72s, tests 65.83s, environment 24ms, prepare 249.16s)[22m  [vpw:dbg] Shutting down runtimes... 

## Test Run — 2026-04-13 22:31
- **Command**: `cd backend && npx vitest run`
- **Status**: inconclusive
- **Summary**: [2m   Duration [22m 48.79s[2m (transform 23.44s, setup 0ms, collect 517.29s, tests 77.03s, environment 32ms, prepare 259.66s)[22m  [vpw:dbg] Shutting down runtimes... 

## Test Run — 2026-04-13 23:35
- **Command**: `cd backend && npx vitest run`
- **Status**: inconclusive
- **Summary**: [2m   Duration [22m 48.15s[2m (transform 25.45s, setup 0ms, collect 530.59s, tests 76.62s, environment 34ms, prepare 259.97s)[22m  [vpw:dbg] Shutting down runtimes... 

## Test Run — 2026-04-15 18:18
- **Command**: `cd backend && npx vitest run`
- **Status**: inconclusive
- **Summary**: [2m   Duration [22m 42.51s[2m (transform 22.88s, setup 0ms, collect 454.14s, tests 66.30s, environment 28ms, prepare 245.53s)[22m  [vpw:dbg] Shutting down runtimes... 

## Test Run — 2026-04-15 18:23
- **Command**: `cd backend && npx vitest run`
- **Status**: inconclusive
- **Summary**: [2m   Duration [22m 42.42s[2m (transform 22.33s, setup 0ms, collect 453.57s, tests 64.90s, environment 24ms, prepare 245.91s)[22m  [vpw:dbg] Shutting down runtimes... 

## Test Run — 2026-04-15 18:42
- **Command**: `cd backend && npx vitest run`
- **Status**: inconclusive
- **Summary**: [2m   Duration [22m 41.59s[2m (transform 21.99s, setup 0ms, collect 450.39s, tests 64.06s, environment 22ms, prepare 240.80s)[22m  [vpw:dbg] Shutting down runtimes... 

## Test Run â€” 2026-04-17 11:29
- **Command**: `cd frontend && npm run build`
- **Status**: failed
- **Summary**: unrestricted build surfaced a real compatibility issue after the `src2` overlay: Tailwind 4 rejected semantic utility usage in `frontend/src/index.css` with `Cannot apply unknown utility class border-border`.

## Test Run â€” 2026-04-17 11:31
- **Command**: `cd frontend && npm run build`
- **Status**: passed
- **Summary**: production Vite build succeeded after adding Tailwind semantic token mappings in `frontend/src/index.css` and removing the imported dev bypass routes from `frontend/src/App.tsx`; remaining output only warned about large chunks such as `heic2any`.

## Test Run — 2026-04-17 11:46
- **Command**: `cd backend && npx vitest run`
- **Status**: inconclusive
- **Summary**: [2m   Duration [22m 19.12s[2m (transform 9.85s, setup 0ms, collect 265.42s, tests 32.38s, environment 18ms, prepare 112.77s)[22m  [vpw:dbg] Shutting down runtimes... 
## Test Run — 2026-04-17 11:51
- **Command**: `cd frontend && npm run build`
- **Status**: passed
- **Summary**: production Vite build still succeeds after the `src2` merge review; build output only reports large-chunk warnings, notably the `heic2any` bundle over 1 MB.

## Test Run — 2026-04-17 11:52
- **Command**: `cd backend && npx vitest run`
- **Status**: inconclusive
- **Summary**: [2m   Duration [22m 18.58s[2m (transform 9.64s, setup 0ms, collect 257.79s, tests 32.21s, environment 15ms, prepare 108.73s)[22m  [vpw:dbg] Shutting down runtimes... 
## Verification Run — 2026-04-17 11:58
- **Command**: `cd backend && npm run deploy:quick`
- **Status**: passed
- **Summary**: deployed Worker `vantrangedu-api` to the verified Cloudflare account; current version ID is `a670f5c0-f953-4aa5-8306-0c947113bc5b`.

## Verification Run — 2026-04-17 11:58
- **Command**: `cd frontend && npm run deploy:quick`
- **Status**: passed
- **Summary**: built and deployed Pages project `vantrangedu`; production deployment ID `c2d915c7-9e55-4dc2-a3a9-00ebfab724ea` is live at `https://c2d915c7.vantrangedu.pages.dev`.

## Verification Run — 2026-04-17 11:58
- **Command**: `Invoke-WebRequest https://vantrangedu-api.bangachieu2.workers.dev`, `Invoke-WebRequest https://c2d915c7.vantrangedu.pages.dev`, `Invoke-WebRequest https://vantrangedu.com`
- **Status**: passed
- **Summary**: all three HTTP smoke checks returned status `200`.

## Test Run — 2026-04-17 11:58
- **Command**: `cd backend && npx vitest run`
- **Status**: inconclusive
- **Summary**: [2m   Duration [22m 18.01s[2m (transform 8.92s, setup 0ms, collect 246.27s, tests 32.07s, environment 10ms, prepare 100.21s)[22m  [vpw:dbg] Shutting down runtimes... 
## Verification Run — 2026-04-17 12:04
- **Command**: `cd frontend && npm run deploy:quick`
- **Status**: passed
- **Summary**: rebuilt and redeployed Pages project `vantrangedu`; the new production deployment ID is `c962c985-f018-4e1c-bd7f-3e4cc60fe73d` at `https://c962c985.vantrangedu.pages.dev`.

## Verification Run — 2026-04-17 12:04
- **Command**: `Invoke-WebRequest https://c962c985.vantrangedu.pages.dev`, `Invoke-WebRequest https://vantrangedu.com`
- **Status**: passed
- **Summary**: both frontend smoke checks returned HTTP `200`.

## Test Run — 2026-04-17 12:04
- **Command**: `cd backend && npx vitest run`
- **Status**: inconclusive
- **Summary**: [2m   Duration [22m 19.44s[2m (transform 10.31s, setup 0ms, collect 272.60s, tests 33.87s, environment 8ms, prepare 111.81s)[22m  [vpw:dbg] Shutting down runtimes... 
