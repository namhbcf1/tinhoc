import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// ----------------------------------------------------
// 1. Users (Giữ lại thông tin HS/GV/Admin cũ)
// ----------------------------------------------------
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  phone: text('phone').notNull().unique(), // Username đăng nhập
  email: text('email'),
  password_hash: text('password_hash').notNull(),
  role: text('role', { enum: ['super_admin', 'admin', 'teacher', 'student'] }).notNull(),
  
  // Thông tin thêm CCCD AI
  cccd_number: text('cccd_number'),
  dob: text('dob'), 
  avatar_url: text('avatar_url'),
  cccd_front_url: text('cccd_front_url'),
  cccd_back_url: text('cccd_back_url'),
  
  status: text('status', { enum: ['active', 'inactive', 'banned'] }).default('active'),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updated_at: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// ----------------------------------------------------
// 2. Kế Toán & Thanh toán
// ----------------------------------------------------
export const payments = sqliteTable('payments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  student_id: integer('student_id').references(() => users.id, { onDelete: 'cascade' }),
  amount: real('amount').notNull(),
  payment_method: text('payment_method', { enum: ['cash', 'transfer'] }).notNull(),
  reason: text('reason').notNull(),
  status: text('status', { enum: ['completed', 'pending', 'refunded'] }).default('completed'),
  note: text('note'),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// ----------------------------------------------------
// 3. Quản lý Lớp Cốt Lõi
// ----------------------------------------------------
export const classes = sqliteTable('classes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description'),
  type: text('type', { enum: ['online', 'offline'] }).notNull(),
  price: real('price').notNull().default(0),
  status: text('status', { enum: ['enrolling', 'active', 'completed', 'cancelled'] }).default('enrolling'),
  start_date: text('start_date'),
  end_date: text('end_date'),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const class_teachers = sqliteTable('class_teachers', {
  class_id: integer('class_id').references(() => classes.id, { onDelete: 'cascade' }),
  teacher_id: integer('teacher_id').references(() => users.id, { onDelete: 'cascade' }),
  role: text('role', { enum: ['main', 'assistant'] }).default('main'),
});

export const class_students = sqliteTable('class_students', {
  class_id: integer('class_id').references(() => classes.id, { onDelete: 'cascade' }),
  student_id: integer('student_id').references(() => users.id, { onDelete: 'cascade' }),
  enrollment_date: text('enrollment_date').default(sql`CURRENT_TIMESTAMP`),
  status: text('status', { enum: ['active', 'dropped', 'completed', 'pending'] }).default('active'),
});

// Lịch học & Google Meet
export const class_schedules = sqliteTable('class_schedules', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  class_id: integer('class_id').references(() => classes.id, { onDelete: 'cascade' }),
  date: text('date').notNull(), // YYYY-MM-DD
  start_time: text('start_time').notNull(), // HH:MM
  end_time: text('end_time').notNull(), // HH:MM
  meeting_link: text('meeting_link'), // Dành cho class Online
  room: text('room'), // Dành cho class Offline
  google_event_id: text('google_event_id'),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const attendance = sqliteTable('attendance', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  schedule_id: integer('schedule_id').references(() => class_schedules.id, { onDelete: 'cascade' }),
  student_id: integer('student_id').references(() => users.id, { onDelete: 'cascade' }),
  status: text('status', { enum: ['present', 'absent', 'late', 'excused'] }).notNull(),
  note: text('note'),
  recorded_at: text('recorded_at').default(sql`CURRENT_TIMESTAMP`),
});

// ----------------------------------------------------
// 4. Bài Tập & Tài Liệu
// ----------------------------------------------------
export const assignments = sqliteTable('assignments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  class_id: integer('class_id').references(() => classes.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  file_url: text('file_url'),
  deadline: text('deadline'),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const student_assignments = sqliteTable('student_assignments', {
  assignment_id: integer('assignment_id').references(() => assignments.id, { onDelete: 'cascade' }),
  student_id: integer('student_id').references(() => users.id, { onDelete: 'cascade' }),
  submission_url: text('submission_url'),
  score: real('score'),
  feedback: text('feedback'),
  submitted_at: text('submitted_at').default(sql`CURRENT_TIMESTAMP`),
});

// ----------------------------------------------------
// 5. Nền Tảng Thi Đánh Giá (Exam Platform)
// ----------------------------------------------------
export const exams = sqliteTable('exams', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  type: text('type', { enum: ['VSTEP', 'TOEIC', 'CUSTOM'] }).notNull(),
  duration_minutes: integer('duration_minutes').notNull(),
  content_json: text('content_json').notNull(), // Lưu Data Bank Câu hỏi + Audio links
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const exam_schedules = sqliteTable('exam_schedules', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  exam_id: integer('exam_id').references(() => exams.id, { onDelete: 'cascade' }),
  date: text('date').notNull(),
  start_time: text('start_time').notNull(),
  room: text('room'),
  status: text('status', { enum: ['upcoming', 'ongoing', 'completed', 'cancelled'] }).default('upcoming'),
  max_students: integer('max_students'),
});

export const exam_registrations = sqliteTable('exam_registrations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  schedule_id: integer('schedule_id').references(() => exam_schedules.id, { onDelete: 'cascade' }),
  student_id: integer('student_id').references(() => users.id, { onDelete: 'cascade' }),
  status: text('status', { enum: ['pending', 'approved', 'rejected', 'completed'] }).default('pending'),
  score: real('score'), 
  score_details: text('score_details'), // JSON lưu log (Reading: X, Listening: Y)
  registered_at: text('registered_at').default(sql`CURRENT_TIMESTAMP`),
});

// ----------------------------------------------------
// 6. Chứng Chỉ & Log
// ----------------------------------------------------
export const certificates = sqliteTable('certificates', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  student_id: integer('student_id').references(() => users.id, { onDelete: 'cascade' }),
  exam_id: integer('exam_id').references(() => exams.id, { onDelete: 'set null' }), // Có thể cấp chứng chỉ khóa học
  type: text('type').notNull(), // VD: "Chứng chỉ Tin học", "VSTEP B2"
  issue_date: text('issue_date').notNull(),
  certificate_number: text('certificate_number').notNull().unique(),
  pdf_url: text('pdf_url'), // Link r2
  status: text('status', { enum: ['active', 'revoked'] }).default('active'),
});

export const activity_logs = sqliteTable('activity_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  user_id: integer('user_id').references(() => users.id, { onDelete: 'cascade' }),
  action: text('action').notNull(),
  details: text('details'),
  ip_address: text('ip_address'),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});
