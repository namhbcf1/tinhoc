-- Migration: 0000_initial_database_schema
-- Description: Baseline schema for the entire application

-- ========================================
-- 1. ADMINS - Quản trị viên
-- ========================================
CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT DEFAULT 'admin' CHECK(role IN ('super_admin', 'admin', 'staff')),
    email TEXT,
    phone TEXT,
    last_login DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_admins_username ON admins(username);
CREATE INDEX IF NOT EXISTS idx_admins_role ON admins(role);

-- ========================================
-- 2. TEACHERS - Giáo viên
-- ========================================
CREATE TABLE IF NOT EXISTS teachers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    teacher_code TEXT UNIQUE NOT NULL,
    ho TEXT NOT NULL,
    ten_dem TEXT,
    ten TEXT NOT NULL,
    ho_ten_full TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    sdt TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    department TEXT,
    position TEXT,
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'on_leave')),
    last_login DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_teachers_code ON teachers(teacher_code);
CREATE INDEX IF NOT EXISTS idx_teachers_email ON teachers(email);
CREATE INDEX IF NOT EXISTS idx_teachers_status ON teachers(status);

-- ========================================
-- 3. STUDENTS - Học viên (Removed ho_khau)
-- ========================================
CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cccd TEXT UNIQUE NOT NULL,
    ho TEXT NOT NULL,
    ten_dem TEXT NOT NULL,
    ten TEXT NOT NULL,
    ho_ten_full TEXT NOT NULL,
    ngay_sinh DATE NOT NULL,
    noi_sinh TEXT NOT NULL,
    gioi_tinh TEXT NOT NULL CHECK(gioi_tinh IN ('Nam', 'Nữ')),
    email TEXT NOT NULL,
    sdt TEXT NOT NULL,
    dia_chi TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_students_cccd ON students(cccd);
CREATE INDEX IF NOT EXISTS idx_students_email ON students(email);
CREATE INDEX IF NOT EXISTS idx_students_sdt ON students(sdt);

-- ========================================
-- 4. CLASSES - Lớp học
-- ========================================
CREATE TABLE IF NOT EXISTS classes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ten_lop TEXT NOT NULL,
    ma_lop TEXT,
    ngay_thi DATE,
    ngay_bat_dau DATE,
    ngay_ket_thuc DATE,
    gio_thi TEXT,
    dia_diem TEXT,
    hoc_phi INTEGER DEFAULT 0,
    open_at DATETIME NOT NULL,
    close_at DATETIME NOT NULL,
    status TEXT DEFAULT 'open' CHECK(status IN ('open', 'closed', 'completed', 'cancelled')),
    class_type TEXT DEFAULT 'hoc' CHECK(class_type IN ('hoc', 'thi', 'tin_chi')),
    max_students INTEGER,
    current_students INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_classes_status ON classes(status);
CREATE INDEX IF NOT EXISTS idx_classes_type ON classes(class_type);

-- ========================================
-- 5. REGISTRATIONS - Đăng ký lớp
-- ========================================
CREATE TABLE IF NOT EXISTS registrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    class_id INTEGER NOT NULL,
    so_phach TEXT,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'studying', 'completed', 'certified', 'cancelled')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    UNIQUE(student_id, class_id)
);

CREATE INDEX IF NOT EXISTS idx_registrations_student ON registrations(student_id);
CREATE INDEX IF NOT EXISTS idx_registrations_class ON registrations(class_id);

-- ========================================
-- 6. EXAM SCHEDULES - Lịch thi (Decoupled from Classes)
-- ========================================
CREATE TABLE IF NOT EXISTS exam_schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    class_id INTEGER, -- Nullable for standalone exams
    exam_name TEXT NOT NULL,
    exam_date DATETIME NOT NULL,
    duration_minutes INTEGER DEFAULT 120,
    location TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_exam_schedules_class ON exam_schedules(class_id);
CREATE INDEX IF NOT EXISTS idx_exam_schedules_date ON exam_schedules(exam_date);

-- ========================================
-- 7. EXAM REGISTRATIONS - Đăng ký thi
-- ========================================
CREATE TABLE IF NOT EXISTS exam_registrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    exam_id INTEGER NOT NULL,
    student_id INTEGER NOT NULL,
    status TEXT DEFAULT 'registered' CHECK(status IN ('registered', 'cancelled', 'attended')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (exam_id) REFERENCES exam_schedules(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    UNIQUE(exam_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_exam_registrations_exam ON exam_registrations(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_registrations_student ON exam_registrations(student_id);

-- ========================================
-- 8. ATTENDANCE - Điểm danh
-- ========================================
CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    registration_id INTEGER NOT NULL,
    class_id INTEGER NOT NULL,
    attendance_date DATE NOT NULL,
    status TEXT CHECK(status IN ('present', 'absent', 'late', 'excused')),
    notes TEXT,
    marked_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (registration_id) REFERENCES registrations(id) ON DELETE CASCADE,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    FOREIGN KEY (marked_by) REFERENCES admins(id),
    UNIQUE(registration_id, attendance_date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_registration ON attendance(registration_id);
CREATE INDEX IF NOT EXISTS idx_attendance_class ON attendance(class_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(attendance_date);

-- ========================================
-- 9. PAYMENTS - Thanh toán
-- ========================================
CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    registration_id INTEGER NOT NULL,
    amount INTEGER NOT NULL,
    method TEXT CHECK(method IN ('bank_transfer', 'cash', 'other')),
    transaction_code TEXT,
    receipt_image_url TEXT,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'confirmed', 'rejected', 'refunded')),
    confirmed_by INTEGER,
    confirmed_at DATETIME,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (registration_id) REFERENCES registrations(id) ON DELETE CASCADE,
    FOREIGN KEY (confirmed_by) REFERENCES admins(id)
);

CREATE INDEX IF NOT EXISTS idx_payments_registration ON payments(registration_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- ========================================
-- 10. DOCUMENTS - Tài liệu
-- ========================================
CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size INTEGER,
    file_type TEXT,
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'archived')),
    valid_until DATETIME,
    uploaded_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (uploaded_by) REFERENCES admins(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON documents(uploaded_by);

-- ========================================
-- 11. DOCUMENT PERMISSIONS & DOWNLOADS
-- ========================================
CREATE TABLE IF NOT EXISTS document_permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id INTEGER NOT NULL,
    permission_type TEXT NOT NULL CHECK(permission_type IN ('public', 'class', 'student')),
    class_id INTEGER,
    student_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_document_permissions_document ON document_permissions(document_id);
CREATE INDEX IF NOT EXISTS idx_document_permissions_type ON document_permissions(permission_type);
CREATE INDEX IF NOT EXISTS idx_document_permissions_class ON document_permissions(class_id);
CREATE INDEX IF NOT EXISTS idx_document_permissions_student ON document_permissions(student_id);

CREATE TABLE IF NOT EXISTS document_downloads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id INTEGER NOT NULL,
    student_id INTEGER,
    downloaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_document_downloads_document ON document_downloads(document_id);

-- ========================================
-- 12. CERTIFICATES - Chứng chỉ
-- ========================================
CREATE TABLE IF NOT EXISTS certificates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    class_id INTEGER,
    certificate_number TEXT UNIQUE,
    title TEXT NOT NULL,
    issued_date DATE NOT NULL,
    pdf_url TEXT,
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'revoked')),
    issued_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (class_id) REFERENCES classes(id),
    FOREIGN KEY (issued_by) REFERENCES admins(id)
);

CREATE INDEX IF NOT EXISTS idx_certificates_student ON certificates(student_id);
CREATE INDEX IF NOT EXISTS idx_certificates_class ON certificates(class_id);
CREATE INDEX IF NOT EXISTS idx_certificates_number ON certificates(certificate_number);

-- ========================================
-- 13. POSTS - Tin tức
-- ========================================
CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    excerpt TEXT,
    slug TEXT UNIQUE,
    category TEXT CHECK(category IN ('announcement', 'news', 'guide', 'event', 'other')),
    tags TEXT,
    status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'published', 'archived')),
    featured_image TEXT,
    author_id INTEGER NOT NULL,
    view_count INTEGER DEFAULT 0,
    publish_at DATETIME,
    published_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (author_id) REFERENCES admins(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category);
CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts(slug);
CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_published ON posts(published_at);

-- ========================================
-- 14. HOMEPAGE SETTINGS
-- ========================================
CREATE TABLE IF NOT EXISTS homepage_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    setting_key TEXT UNIQUE NOT NULL,
    setting_value TEXT,
    value_type TEXT DEFAULT 'string' CHECK(value_type IN ('string', 'number', 'boolean', 'json')),
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_homepage_key ON homepage_settings(setting_key);

-- ========================================
-- 15. CLASS SCHEDULES & TEACHERS
-- ========================================
CREATE TABLE IF NOT EXISTS class_schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    class_id INTEGER NOT NULL,
    day_of_week INTEGER NOT NULL CHECK(day_of_week >= 0 AND day_of_week <= 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    room TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_class_schedules_class ON class_schedules(class_id);
CREATE INDEX IF NOT EXISTS idx_class_schedules_day ON class_schedules(day_of_week);

CREATE TABLE IF NOT EXISTS class_teachers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    class_id INTEGER NOT NULL,
    teacher_id INTEGER NOT NULL,
    role TEXT DEFAULT 'teacher' CHECK(role IN ('teacher', 'assistant', 'coordinator')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
    UNIQUE(class_id, teacher_id)
);

CREATE INDEX IF NOT EXISTS idx_class_teachers_class ON class_teachers(class_id);
CREATE INDEX IF NOT EXISTS idx_class_teachers_teacher ON class_teachers(teacher_id);

-- ========================================
-- 16. NOTIFICATIONS - Thông báo
-- ========================================
CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    user_type TEXT CHECK(user_type IN ('student', 'admin', 'all')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info' CHECK(type IN ('info', 'success', 'warning', 'error', 'payment', 'certificate', 'registration', 'class')),
    link TEXT,
    read BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES students(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, user_type);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read, created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type, created_at);

-- ========================================
-- 17. PASSWORD RESET TOKENS
-- ========================================
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_id INTEGER NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expires_at DATETIME NOT NULL,
    used BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_password_reset_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_admin ON password_reset_tokens(admin_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_expires ON password_reset_tokens(expires_at);

-- ========================================
-- 18. AUDIT LOGS - Nhật ký
-- ========================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_id INTEGER,
    action_type TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id INTEGER,
    details TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (admin_id) REFERENCES admins(id)
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_admin ON audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);
