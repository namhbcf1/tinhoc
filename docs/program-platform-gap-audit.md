# Gap Audit: Program Platform va Lop hoc

## Nhung diem da dung huong

- He thong da co taxonomy rieng cho program platform:
  - `program_organizers`
  - `programs`
  - `program_levels`
  - `field_definitions`
  - `field_options`
  - `field_values`
- `field_definitions` da cho phep owner theo ng canh (`owner_entity_type`, `owner_entity_uuid`), phu hop huong metadata-driven.
- `vantrangedu` da la noi quan tri taxonomy, con site tieu thu du lieu se read-only.

## Lech chinh truoc khi sua

- Seed data va mapping van exam-biased:
  - Program mac dinh nghieng ve `VSTEP`, `VEPT`, `TIN_HOC`
  - `legacy_exam_category_id` va `legacy_exam_type_id` duoc ng am hieu la mac dinh cua program
- `class_schedules` chi mo ta lich tuan:
  - `day_of_week`
  - `start_time`
  - `end_time`
  - `room`
  - `notes`
- UI admin cua Program Platform van de wording theo "chuong trinh thi" thay vi "chuong trinh dao tao thuc te".
- UI lop hoc da co tab lich trinh, nhung du lieu chinh van la weekly template, chua phai session-based schedule.

## Diem da duoc xu ly trong dot nay

- `programs` da co capability fields moi:
  - `assessment_mode`
  - `certificate_enabled`
  - `schedule_model`
- API `/programs` da tra them:
  - `assessmentMode`
  - `certificateEnabled`
  - `scheduleModel`
  - `hasLevels`
- Tao moi model `class_sessions` va CRUD qua:
  - `GET /classes/:id/sessions`
  - `POST /classes/:id/sessions`
  - `PUT /classes/:id/sessions/:sessionId`
  - `DELETE /classes/:id/sessions/:sessionId`
- UI admin da doi wording cua Program Platform theo nghia "chuong trinh dao tao".
- UI lop hoc da chuyen sang quan ly buoi hoc theo session, dong thoi van hien lich tuan cu de tham chieu.

## Khoang trong con lai

- Chua co job migrate tu dong tu `class_schedules` sang `class_sessions`.
- Chua sua toan bo site tieu thu du lieu (`vantrangexam`) de render capability moi trong tat ca man hinh teacher/student.
- Chua them event/sync contract chi tiet cho `class_sessions`.
- Chua xay engine rieng cho manual assessment; hien tai van theo huong reuse assignments.
