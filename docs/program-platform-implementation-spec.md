# Implementation Spec: Program Capability va Class Sessions

## Scope da chot

Dot nay tap trung vao 4 nhom thay doi:

1. Mo rong schema cua `programs` de khai bao capability nghiep vu.
2. Them `class_sessions` de quan ly lich theo tung buoi.
3. Mo rong API taxonomy va class sessions.
4. Cap nhat UI admin de quan ly dung nghia Organizer / Program / Level / Sessions.

## Schema

### programs

Them 3 cot:

- `assessment_mode TEXT NOT NULL DEFAULT 'official_exam'`
- `certificate_enabled INTEGER NOT NULL DEFAULT 0`
- `schedule_model TEXT NOT NULL DEFAULT 'session_based'`

Rule:

- `legacy_exam_category_id` va `legacy_exam_type_id` chi duoc tu dong map khi `assessment_mode` la:
  - `official_exam`
  - `practice_test`
  - `mixed`
- Neu `assessment_mode` la `none` hoac `manual_assessment` thi 2 cot legacy exam de `NULL`.

### class_sessions

Bang moi:

- `id`
- `class_id`
- `session_date`
- `start_time`
- `end_time`
- `session_type`
- `title`
- `content_outline`
- `period_count`
- `teacher_id`
- `room`
- `meeting_link`
- `notes`
- `sort_order`
- timestamps

Chi so:

- `(class_id, session_date, sort_order, id)`
- `(teacher_id)`

## API contract

### /programs

Response moi tra them:

- `assessmentMode`
- `certificateEnabled`
- `scheduleModel`
- `hasLevels`

### /classes/:id/sessions

- `GET`: danh sach buoi hoc theo thu tu ngay + sort order
- `POST`: tao buoi hoc moi
- `PUT`: sua buoi hoc
- `DELETE`: xoa buoi hoc

Payload chinh:

- `session_date`
- `start_time`
- `end_time`
- `session_type`
- `title`
- `content_outline`
- `period_count`
- `teacher_id`
- `room`
- `meeting_link`
- `notes`
- `sort_order`

## UI admin

### Program Platform

- Doi wording tu "chuong trinh thi" sang "chuong trinh dao tao".
- Form Program them:
  - `assessment_mode`
  - `certificate_enabled`
  - `schedule_model`
- Danh sach Program hien:
  - loai danh gia
  - co/khong co level

### Class detail

- Session la giao dien chinh de quan ly lich tung buoi.
- Legacy weekly schedule chi hien de tham chieu, khong phai model chinh nua.
- Cho phep gan giao vien theo tung buoi.

## Backward compatibility

- `class_schedules` van duoc giu nguyen.
- UI van hien du lieu `class_schedules` cu neu lop chua co `class_sessions`.
- Cac flow exam cu van chay duoc voi program co `assessment_mode` exam-related.

## Kiem thu da them

- Backend route test cho `/programs`:
  - tao program khong co level
  - tra ve capability fields moi
  - `hasLevels` = false/true dung theo du lieu
- Backend route test cho `/classes/:id/sessions`:
  - create
  - list
  - update
  - delete
