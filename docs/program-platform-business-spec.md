# Business Spec: Program Platform Metadata-Driven

## Muc tieu

He thong quan ly dao tao phai tach ro don vi to chuc, chuong trinh dao tao, trinh do, lop hoc, lich tung buoi, bai test/danh gia va chung chi. Model nghiep vu phai metadata-driven, khong duoc dong khung theo mot vai loai ky thi co dinh.

## Dinh nghia nghiep vu

- Organizer: don vi to chuc thuc te, vi du PTIT, HVKHQS, Hoc vien Quan ly Giao duc.
- Program: ten chuong trinh/khoa/boi duong thuc te, vi du Tieng Anh, Tin hoc, Chuc danh nghe nghiep, Ky nang song.
- Level: thuoc tinh tuy chon cua Program. Chuong trinh co the co level hoac khong.
- Class: lop hoc/lop thi cu the duoc mo de van hanh theo Program.
- Session: tung buoi hoc hoac tung moc danh gia cua mot Class.
- Exam/Test: bai test chuan hoac lich thi chinh thuc, chi ap dung voi mot so Program.
- Manual Assessment: bai thu hoach, danh gia cuoi khoa, cham tay.
- Certificate: chung chi dau ra, bat/tat theo tung Program.

## Quy tac bat buoc

- Khong ep moi Program phai co Level.
- Khong ep moi Program phai co Exam/Test.
- Program phai khai bao ten thuc te, khong duoc dung lai ten Organizer neu khong cung y nghia.
- Session schedule phai linh hoat theo tung buoi: ngay, gio, noi dung, so tiet, giang vien, dia diem/link, ghi chu.
- He thong phai ho tro buoi hoc, buoi test, danh gia cuoi khoa va bai thu hoach trong cung mot lop.

## Vi du nghiep vu

- Tieng Anh:
  - Co Level: A1, A2, B1, B2, C1, C2
  - Co Exam/Test
  - Co lich hoc theo tung buoi
- Tin hoc:
  - Co Level: Co ban, Nang cao
  - Co Test
  - Co lich hoc theo tung buoi
- Chuc danh nghe nghiep:
  - Co Level: Hang I, II, III
  - Khong bat buoc exam chuan
  - Co the dung bai thu hoach/danh gia cuoi khoa
- Ky nang song / Nghiep vu:
  - Co the khong co Level
  - Co the khong co Exam/Test
  - Van co Class va Session chi tiet

## Nang luc can cau hinh theo Program

- assessment_mode:
  - none
  - official_exam
  - practice_test
  - manual_assessment
  - mixed
- certificate_enabled: co/khong
- schedule_model:
  - session_based la model mac dinh
  - co the giu weekly_template cho du lieu legacy

## He qua cho UI

- Truong "Don vi to chuc" va "Chuong trinh" phai tach nghia ro rang.
- Truong "Trinh do" chi hien va chi yeu cau khi Program co Level.
- Block Exam/Test chi hien khi assessment_mode cho phep.
- Man hinh lop hoc phai quan ly Session theo tung buoi, khong chi lich tuan co dinh.
