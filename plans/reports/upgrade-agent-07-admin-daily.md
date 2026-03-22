# Agent 07: Admin Daily Operations Audit
## Vai tro: Chi Trang — Admin trung tam VanTrangEdu, quan ly 97 sinh vien, 5 giao vien

> **Muc tieu:** Danh gia he thong tu goc nhin admin dung 8 tieng/ngay. So sanh voi MISA AMIS, SMAS, ERP giao duc 2025.

---

## I. TONG QUAN ADMIN PANEL

### Modules hien tai (17 modules)
| Module | Desktop | Mobile | Shared Hook |
|--------|---------|--------|-------------|
| Students | `StudentsManagement.jsx` + 5 sub-components | `MobileStudentsModule.jsx` | - |
| Classes (Offline) | `ClassesManagement.jsx` + 3 sub-components | `MobileClassesModule.jsx` | `useClassesManagement.js` |
| Classes (Online) | `OnlineClassesManagement.jsx` + `ClassDetailDashboard.jsx` | via MobileClassesModule | - |
| Payments | `PaymentsManagement.jsx` | `MobilePaymentsModule.jsx` | `usePaymentsManagement.js` |
| Certificates | `CertificatesManagement.jsx` | `MobileCertificatesModule` (simple) | - |
| Documents | `DocumentsManagement.jsx` | `MobileDocumentsModule.jsx` | `useDocumentsManagement.js` |
| Teachers | `TeachersManagement.jsx` | `MobileTeachersModule.jsx` | `useTeachersManagement.js` |
| Assignments | `AssignmentsManagement.jsx` | `MobileAssignmentsModule.jsx` | `useAssignmentsManagement.js` |
| Exam Schedules | `ExamSchedulesPage.jsx` | `MobileExamSchedulesModule.jsx` | - |
| Reports | `ReportsPage.jsx` (recharts) | `MobileReportsModule` (simple) | - |
| Registrations | `RegistrationsManagement.jsx` | - | - |
| Posts | `PostsManagement.jsx` | `MobilePostsModule` (simple) | - |
| Homepage | `HomepageManagement.jsx` | `MobileHomepageModule` (simple) | - |
| Activity Logs | `ActivityLogs.jsx` | `MobileLogsModule` (simple) | - |
| Admin Management | `AdminManagement.jsx` | `MobileAdminsModule` (simple) | - |
| Profile | `AdminProfile.jsx` | Reuses desktop | - |
| Backup | `BackupPage.jsx` | `MobileBackupModule` (simple) | - |

### Routing
- Hash-based navigation (`window.location.hash`)
- Desktop: `AdminDashboardDesktop.jsx` — switch/case render
- Mobile: `AdminDashboardMobile.jsx` — switch/case render
- Responsive detection: `AdminDashboard.jsx` delegates to Desktop/Mobile variant

---

## II. PHAN TICH CHI TIET THEO CHUC NANG

### A. QUAN LY SINH VIEN (StudentsManagement)

| Tieu chi | Hien trang | Muc do |
|----------|-----------|--------|
| Tim kiem (ten, CCCD, SDT) | CO — debounced search 300ms, goi `api.searchStudents()` | **OK** |
| Import Excel | **KHONG CO** — khong co nut import, khong co modal import | **THIEU NGHIEM TRONG** |
| Export Excel | **KHONG CO** o trang students (chi co o Registrations) | **THIEU NGHIEM TRONG** |
| Bulk actions (duyet/xoa hang loat) | **KHONG CO** — chi co xoa tung nguoi voi `confirm()` | **THIEU NGHIEM TRONG** |
| Student detail view | CO — `StudentDetailModal.jsx` 2-column, anh CCCD, lich su dang ky | **OK** |
| Edit student | CO — `StudentFormModal.jsx` modal, 3-column layout, day du fields | **OK** |
| In danh sach | **KHONG CO** nut Print rieng (chi co `window.print()` trong detail modal) | **THIEU** |
| Pagination | CO — client-side, 20/page | **CAN CAI THIEN** |
| Grid/Table view toggle | CO | **OK** |
| Loc theo trang thai | **KHONG CO** — khong filter studying/pending/certified | **THIEU** |
| Upload anh (3x4, CCCD) | **KHONG CO** trong form admin — chi view anh co san | **THIEU** |
| Stats bar | CO — tong, dang hoc, cho duyet, co chung chi | **OK** |

**Diem dau nhat:** Voi 97 SV, khong co Import Excel la that su kho chiu. Moi SV phai nhap tay 15+ fields.

### B. QUAN LY LOP HOC

#### Offline Classes (ClassesManagement)
| Tieu chi | Hien trang | Muc do |
|----------|-----------|--------|
| Tao/sua/xoa lop | CO — modal form voi day du fields | **OK** |
| Them SV vao lop | CO — qua `ClassRegistrations` sub-component | **OK** |
| Them GV vao lop | CO — qua `ClassTeachers` sub-component | **OK** |
| Xem tong quan lop | CO — click vao card de xem chi tiet | **OK** |
| Lich hoc (calendar view) | **KHONG CO** — chi hien schedule_days dang text | **THIEU** |
| Si so / tien do | CO — `current_students` hien tren card | **OK** |
| Diem danh | **KHONG CO** | **THIEU NGHIEM TRONG** |
| Lich hoc calendar drag-drop | **KHONG CO** | **THIEU** |

#### Online Classes (OnlineClassesManagement)
| Tieu chi | Hien trang | Muc do |
|----------|-----------|--------|
| Tao lop + Google Meet auto | CO — `regenerate-meet` API | **TOT** |
| Copy Meet link | CO | **OK** |
| Quan ly enrollment | CO — hien enrollment_count | **OK** |
| Class Detail Dashboard | CO — `ClassDetailDashboard.jsx` | **TOT** |
| Filter theo status | CO — active/paused/completed/cancelled | **OK** |
| Stats summary | CO — tong lop, dang hoat dong, tong HV, online now | **OK** |

### C. THANH TOAN (PaymentsManagement)

| Tieu chi | Hien trang | Muc do |
|----------|-----------|--------|
| Theo doi da/chua dong | CO — filter pending/confirmed/rejected | **OK** |
| Xac nhan/tu choi payment | CO — button tren moi row | **OK** |
| Tim kiem theo ten/CCCD | CO | **OK** |
| Tao hoa don | **KHONG CO** — khong co invoice generation | **THIEU NGHIEM TRONG** |
| Bao cao doanh thu | CO co ban — stats card + progress bar | **CAN CAI THIEN** |
| Nhac nho tu dong | **KHONG CO** — khong co reminder system | **THIEU NGHIEM TRONG** |
| Export bao cao thanh toan | **KHONG CO** | **THIEU** |
| Lich su thanh toan chi tiet | CO — detail modal | **OK** |
| Phan bo trang thai (chart) | CO — visual progress bar | **OK** |
| Thanh toan nhieu dot | **KHONG CO** — chi 1 payment/registration | **THIEU** |

### D. CHUNG CHI (CertificatesManagement)

| Tieu chi | Hien trang | Muc do |
|----------|-----------|--------|
| Generate certificate | CO — `issueCertificate()` API | **OK** |
| Bulk issue | CO — chon nhieu SV, cap 1 lan | **TOT** |
| Tra cuu certificate | CO — tab "Lich su cap" | **OK** |
| Template management | **KHONG CO** — khong co UI quan ly template | **THIEU** |
| Download certificate | CO — `getCertificateDownloadUrl()` | **OK** |
| Preview certificate | **KHONG CO** — chi download, khong preview inline | **THIEU** |
| Certificate verification (public) | **KHONG RO** — can kiem tra route | **CAN KIEM TRA** |

### E. DASHBOARD (DashboardOverview)

| Tieu chi | Hien trang | Muc do |
|----------|-----------|--------|
| Thong ke quan trong | CO — 4 stat cards (SV, lop, doanh thu, chung chi) | **CO BAN** |
| Quick actions | **KHONG CO** — khong co shortcuts | **THIEU** |
| Notification center | **KHONG CO** | **THIEU NGHIEM TRONG** |
| Activity log widget | **KHONG CO** tren dashboard (co trang rieng) | **THIEU** |
| Bieu do xu huong | **KHONG CO** tren dashboard overview | **THIEU** |
| Lich su hoat dong gan day | **KHONG CO** | **THIEU** |
| To-do / Task list | **KHONG CO** | **THIEU** |
| Quick search global | **KHONG CO** — phai vao tung module de search | **THIEU** |

### F. BAO CAO (ReportsPage)

| Tieu chi | Hien trang | Muc do |
|----------|-----------|--------|
| Bieu do doanh thu | CO — recharts LineChart | **OK** |
| Bieu do dang ky | CO — BarChart | **OK** |
| Bieu do chung chi | CO — PieChart | **OK** |
| Export PDF | CO — jsPDF | **OK** |
| Loc theo nam | CO | **OK** |
| Loc theo thang/quy | **KHONG CO** — chi filter nam | **THIEU** |
| So sanh giai doan | **KHONG CO** | **THIEU** |
| Dashboard real-time | **KHONG CO** | **THIEU** |

### G. TAI LIEU (DocumentsManagement)

| Tieu chi | Hien trang | Muc do |
|----------|-----------|--------|
| Upload file | CO — drag & drop, max 1GB | **TOT** |
| Phan quyen | CO — public/class/student/admin | **TOT** |
| Chia se voi lop | CO — share modal | **OK** |
| Folder management | CO — tao folder | **OK** |
| Tim kiem | CO — theo ten, file name, mo ta | **OK** |
| Grid/Table view | CO | **OK** |
| Sort | CO — theo ten, dung luong, ngay tao | **OK** |
| Preview file | **KHONG CO** — chi download | **THIEU** |
| Version control | **KHONG CO** | **THIEU** |

### H. GIAO VIEN (TeachersManagement)

| Tieu chi | Hien trang | Muc do |
|----------|-----------|--------|
| CRUD giao vien | CO | **OK** |
| Tim kiem | CO — theo ten, ma GV | **OK** |
| Kich hoat/khoa | CO — toggle status | **OK** |
| Grid/Table view | CO | **OK** |
| Xem lich day | **KHONG CO** | **THIEU** |
| Danh gia giao vien | **KHONG CO** | **THIEU** |
| Phan cong tu dong | **KHONG CO** | **THIEU** |

---

## III. SO SANH VOI DOI THU (2025)

### MISA AMIS Education
| Tinh nang | MISA | VanTrangEdu |
|-----------|------|-------------|
| Import/Export Excel | Full (SV, GV, diem, diem danh) | Chi export registrations |
| Diem danh | QR code + face recognition | **KHONG CO** |
| SMS/Email tu dong | CO (nhac hoc phi, lich thi) | **KHONG CO** |
| Hoa don tu dong | CO (lien ket ke toan) | **KHONG CO** |
| Bao cao da chieu | CO (pivot, filter, drill-down) | Co ban (nam) |
| Mobile app native | CO | Web responsive |
| Parent portal | CO | **KHONG CO** |
| Keyboard shortcuts | CO | **KHONG CO** |

### SMAS (So Giao duc)
| Tinh nang | SMAS | VanTrangEdu |
|-----------|------|-------------|
| Diem danh dien tu | CO | **KHONG CO** |
| So diem dien tu | CO | Chi co grade trong assignments |
| Lich hoc calendar | CO (iCal sync) | **KHONG CO** |
| Thong bao realtime | CO (push notification) | **KHONG CO** |
| Nhap diem hang loat | CO (Excel) | **KHONG CO** |

### Best School Management Systems 2025 (Alma, Teach'n Go, MyClassCampus)
| Tinh nang | Industry standard | VanTrangEdu |
|-----------|-------------------|-------------|
| Attendance tracking | CO (QR, biometric) | **KHONG CO** |
| Auto invoicing | CO (recurring) | **KHONG CO** |
| Parent/Student portal | CO | Chi co student portal |
| Communication hub (SMS/Email/Push) | CO | **KHONG CO** |
| Calendar with drag-drop | CO | **KHONG CO** |
| Gradebook | CO | Co ban (assignments only) |
| Library management | CO | **KHONG CO** |
| Transport management | N/A (trung tam nho) | N/A |
| Fee installments | CO | **KHONG CO** |
| Bulk operations everywhere | CO | Chi co bulk issue cert |
| Global search (Ctrl+K) | CO | **KHONG CO** |
| Keyboard shortcuts | CO | **KHONG CO** |
| Dark mode | CO | **KHONG CO** |
| Data import wizard | CO | **KHONG CO** |
| Custom fields | CO | **KHONG CO** |

---

## IV. TINH NANG THIEU MA ADMIN CAN HANG NGAY

### MUC DO: KHONG THE THIEU (P0) — Can lam ngay

| # | Tinh nang | Ly do admin can | Do kho |
|---|-----------|----------------|--------|
| 1 | **Import Excel sinh vien** | 97 SV, moi dot moi 20-30 SV, nhap tay mat 2h+ | Medium |
| 2 | **Export Excel sinh vien** | Gui bao cao, doi chieu du lieu, luu tru | Easy |
| 3 | **Diem danh (Attendance)** | Moi ngay phai track ai di hoc ai nghi, hien tai = 0 | Medium-Hard |
| 4 | **Notification center (Dashboard)** | Khong biet gi dang can xu ly, phai vao tung module check | Medium |
| 5 | **Nhac nho hoc phi tu dong** | SV quen dong, admin phai goi tung nguoi | Medium |
| 6 | **Global search (Ctrl+K)** | Tim SV xong phai quay lai tim lop, tim payment — mat thoi gian | Medium |
| 7 | **Bulk actions (SV)** | Duyet 30 SV pending, phai click 30 lan | Easy-Medium |
| 8 | **Tao hoa don (Invoice)** | Ke toan yeu cau hoa don, hien chi co "xac nhan" | Medium |

### MUC DO: RAT CAN (P1) — Can lam som

| # | Tinh nang | Ly do | Do kho |
|---|-----------|-------|--------|
| 9 | **Calendar view cho lich hoc** | Xem lich toan trung tam 1 cai, khong phai mo tung lop | Medium |
| 10 | **Quick actions tren Dashboard** | "Them SV", "Duyet payment", "Cap CC" — 1 click | Easy |
| 11 | **Student filter theo trang thai** | studying/pending/certified/all — hien khong filter duoc | Easy |
| 12 | **Export bao cao thanh toan** | Excel cho ke toan | Easy |
| 13 | **Certificate template management** | Thay doi mau chung chi khong can dev | Hard |
| 14 | **Loc bao cao theo thang/quy** | Chi nam thi qua tho | Easy |
| 15 | **Upload anh SV tu admin** | SV gui anh, admin upload ho — hien chi view | Easy-Medium |
| 16 | **Print danh sach SV** | In danh sach ky ten, diem danh giay | Easy |

### MUC DO: NEN CO (P2) — Can thiep de nang cap

| # | Tinh nang | Ly do | Do kho |
|---|-----------|-------|--------|
| 17 | **Keyboard shortcuts** | Admin dung 8h/ngay, tat ca bang mouse = cham | Medium |
| 18 | **Server-side pagination** | 200 SV load 1 lan se cham khi scale | Medium |
| 19 | **Preview tai lieu inline** | Moi file phai download roi xem | Medium |
| 20 | **So diem (Gradebook)** | Quan ly diem SV tap trung | Hard |
| 21 | **Xem lich day giao vien** | Phan cong GV hop ly | Medium |
| 22 | **Activity log widget tren Dashboard** | Biet ai lam gi gan day | Easy |
| 23 | **Thanh toan nhieu dot** | SV dong gop, tra gop | Medium |
| 24 | **Email/SMS tich hop** | Gui thong bao tren he thong | Hard |
| 25 | **Dark mode** | 8h nhin man hinh sang choi mat | Medium |
| 26 | **Data import wizard** | Huong dan step-by-step khi import | Medium |

---

## V. DIEM MANH HIEN TAI

1. **UI/UX hien dai** — Tailwind + Lucide icons, layout sach, responsive
2. **Modular code** — Desktop/Mobile tach rieng, shared hooks
3. **Phan quyen tai lieu tot** — 4 cap (public/class/student/admin)
4. **Google Meet integration** — Tu dong tao phong hop cho lop online
5. **Bulk issue certificate** — Cap chung chi hang loat
6. **Reports voi recharts** — Bieu do truc quan
7. **Activity logs** — Theo doi hoat dong he thong
8. **Exam management** — Quan ly lich thi + them SV + export Excel (chi co o ExamSchedules)
9. **Document management** — Folder, drag-drop upload, chia se theo lop

---

## VI. VAN DE KY THUAT CAN LUU Y

| Van de | Chi tiet | Impact |
|--------|---------|--------|
| Client-side pagination | `StudentsManagement` load 200 SV 1 lan, slice tren client | Performance khi scale |
| Khong co error boundary rieng | Chi co try-catch trong render, khong co global error handler | UX khi crash |
| Mixed API patterns | `OnlineClassesManagement` dung `fetch()` truc tiep, cac module khac dung `api.*` | Maintainability |
| Inline styles nhiều | `PaymentsManagement`, `ActivityLogs` dung inline style thay vi CSS/Tailwind | Code consistency |
| Khong co loading skeleton | Chi co spinner, khong co skeleton placeholder | UX perceived performance |
| `confirm()` native | Delete operations dung browser `confirm()` thay vi custom dialog | UX quality |
| Registrations page dung CSS cu | `AdminDashboard.css` thay vi AdminModern.css | Visual inconsistency |
| Mobile modules "simple" | 7/17 modules mobile chi la placeholder (MobileSimpleModules.jsx) | Mobile usability |

---

## VII. KET LUAN

### Diem so tong the: **6.0/10**

| Hang muc | Diem | Ghi chu |
|----------|------|---------|
| CRUD co ban | 8/10 | Day du cho SV, lop, GV, thanh toan |
| Tim kiem | 7/10 | Co nhung khong co global search |
| Bulk operations | 3/10 | Chi co bulk cert, thieu bulk SV/payment |
| Import/Export | 2/10 | Chi co export registrations + exam |
| Bao cao | 6/10 | Co bieu do nhung thieu filter + export |
| Thong bao | 1/10 | Hoan toan khong co notification system |
| Mobile | 5/10 | Co nhung 7 module la placeholder |
| Workflow admin | 4/10 | Thieu quick actions, shortcuts, dashboard widgets |

### Top 5 uu tien de admin hanh phuc:
1. **Import/Export Excel** (tiet kiem 2h/ngay)
2. **Attendance system** (yeu cau nghiep vu bat buoc)
3. **Notification center + nhac hoc phi** (giam 50% thoi gian theo doi)
4. **Global search Ctrl+K** (tim moi thu trong 2 giay)
5. **Quick actions + Dashboard widgets** (giam 70% so click)

---

## UNRESOLVED QUESTIONS

1. Backend co API cho attendance chua? Hay phai build tu dau?
2. SMS/Email gateway nao dang dung (neu co)? Co the tich hop Twilio/Mailgun?
3. Certificate template dang generate tu backend (PDF) hay frontend? Can biet de plan template management.
4. Co ke hoach mobile native app khong? Hay chi web responsive?
5. Backend pagination API da support cursor/offset chua? (code co TODO comment ve viec nay)
6. `MobileSimpleModules.jsx` — 7 module placeholder co ke hoach implement full khong?
