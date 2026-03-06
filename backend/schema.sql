-- ========================================
-- SCHEMA DATABASE - HỆ THỐNG QUẢN LÝ HỌC VIÊN
-- ========================================

-- Bảng ADMINS - Quản trị viên
CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT DEFAULT 'admin' CHECK(role IN ('admin', 'super_admin', 'staff')),
    last_login DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Bảng STUDENTS - Học viên
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

-- Bảng CLASSES - Lớp học
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

-- Bảng REGISTRATIONS - Đăng ký lớp
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

-- Bảng PAYMENTS - Thanh toán học phí
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

-- Bảng DOCUMENTS - Tài liệu
CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    file_name TEXT NOT NULL,
    file_size INTEGER,
    file_type TEXT,
    r2_key TEXT NOT NULL,
    uploaded_by INTEGER,
    doc_type TEXT DEFAULT 'general' CHECK(doc_type IN ('general', 'class', 'personal', 'announcement')),
    valid_from DATETIME,
    valid_until DATETIME,
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'expired', 'archived')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (uploaded_by) REFERENCES admins(id)
);

-- Bảng DOCUMENT_PERMISSIONS - Phân quyền tài liệu (giống Google Drive)
CREATE TABLE IF NOT EXISTS document_permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id INTEGER NOT NULL,
    permission_type TEXT NOT NULL CHECK(permission_type IN ('public', 'class', 'student', 'admin')),
    class_id INTEGER,
    online_class_id INTEGER,
    student_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- Bảng DOCUMENT_DOWNLOADS - Tracking người tải tài liệu
CREATE TABLE IF NOT EXISTS document_downloads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id INTEGER NOT NULL,
    student_id INTEGER NOT NULL,
    downloaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ip_address TEXT,
    user_agent TEXT,

    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- Bảng CERTIFICATES - Chứng chỉ
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

-- Bảng AUDIT_LOGS - Nhật ký hoạt động
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

-- ========================================
-- INDEXES để tối ưu query
-- ========================================

CREATE INDEX IF NOT EXISTS idx_students_cccd ON students(cccd);
CREATE INDEX IF NOT EXISTS idx_students_email ON students(email);
CREATE INDEX IF NOT EXISTS idx_students_sdt ON students(sdt);
CREATE INDEX IF NOT EXISTS idx_registrations_student ON registrations(student_id);
CREATE INDEX IF NOT EXISTS idx_registrations_class ON registrations(class_id);
CREATE INDEX IF NOT EXISTS idx_classes_status ON classes(status);
CREATE INDEX IF NOT EXISTS idx_classes_type ON classes(class_type);
CREATE INDEX IF NOT EXISTS idx_payments_registration ON payments(registration_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(doc_type);
CREATE INDEX IF NOT EXISTS idx_document_permissions_doc ON document_permissions(document_id);
CREATE INDEX IF NOT EXISTS idx_document_permissions_type ON document_permissions(permission_type);
CREATE INDEX IF NOT EXISTS idx_document_permissions_class ON document_permissions(class_id);
CREATE INDEX IF NOT EXISTS idx_document_permissions_student ON document_permissions(student_id);
CREATE INDEX IF NOT EXISTS idx_document_permissions_online_class ON document_permissions(online_class_id);
CREATE INDEX IF NOT EXISTS idx_document_downloads_doc ON document_downloads(document_id);
CREATE INDEX IF NOT EXISTS idx_document_downloads_student ON document_downloads(student_id);
CREATE INDEX IF NOT EXISTS idx_certificates_student ON certificates(student_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin ON audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);
