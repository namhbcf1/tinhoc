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
    don_vi_cong_tac TEXT,
    nganh_dang_hoc TEXT,
    cccd_front_image_id TEXT,
    cccd_back_image_id TEXT,
    photo_3x4_image_id TEXT,
    cccd_front_url_expires_at DATETIME,
    cccd_back_url_expires_at DATETIME,
    photo_3x4_url_expires_at DATETIME,
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

CREATE TABLE IF NOT EXISTS certificate_shipments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    certificate_id INTEGER NOT NULL,
    student_id INTEGER NOT NULL,
    carrier TEXT NOT NULL DEFAULT 'viettel_post',
    carrier_order_number TEXT,
    carrier_tracking_number TEXT,
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK(status IN ('draft', 'quoted', 'created', 'in_transit', 'delivered', 'cancelled_local', 'failed')),
    receiver_name TEXT NOT NULL,
    receiver_phone TEXT NOT NULL,
    address_raw TEXT NOT NULL,
    address_line TEXT,
    province_id INTEGER,
    province_name TEXT,
    district_id INTEGER,
    district_name TEXT,
    ward_id INTEGER,
    ward_name TEXT,
    normalized_full_address TEXT,
    resolution_status TEXT NOT NULL DEFAULT 'unresolved'
        CHECK(resolution_status IN ('resolved', 'needs_review', 'unresolved')),
    warnings_json TEXT,
    service_code TEXT,
    service_name TEXT,
    service_add_codes_json TEXT,
    product_name TEXT NOT NULL DEFAULT 'Chứng chỉ',
    product_description TEXT NOT NULL DEFAULT 'Chứng chỉ, tài liệu',
    product_weight_grams INTEGER NOT NULL DEFAULT 250,
    declared_value INTEGER NOT NULL DEFAULT 0,
    shipping_fee INTEGER,
    raw_request_json TEXT,
    raw_response_json TEXT,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (certificate_id) REFERENCES certificates(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES admins(id)
);

-- Bảng AUDIT_LOGS - Nhật ký hoạt động
CREATE TABLE IF NOT EXISTS image_processing_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER,
    image_type TEXT NOT NULL,
    original_image_id TEXT,
    processed_image_id TEXT,
    source_image_id TEXT,
    candidate_image_id TEXT,
    final_image_id TEXT,
    processing_status TEXT DEFAULT 'pending',
    pipeline_stage TEXT DEFAULT 'uploaded',
    progress_percent INTEGER DEFAULT 0,
    pipeline_version TEXT DEFAULT 'v1',
    generation_mode TEXT,
    used_as_primary INTEGER DEFAULT 0,
    selection_status TEXT DEFAULT 'processing',
    selected_variant_id INTEGER,
    recommended_variant_id INTEGER,
    selection_completed_at DATETIME,
    ai_confidence_score REAL,
    quality_score REAL,
    error_message TEXT,
    processing_details TEXT,
    warnings_json TEXT,
    validation_result_json TEXT,
    processing_started_at DATETIME,
    processing_completed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS photo_3x4_variants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    processing_log_id INTEGER NOT NULL,
    variant_slot INTEGER NOT NULL,
    image_id TEXT NOT NULL,
    generation_mode TEXT NOT NULL,
    score REAL NOT NULL DEFAULT 0,
    recommended INTEGER NOT NULL DEFAULT 0,
    warnings_json TEXT,
    validation_result_json TEXT,
    prompt_profile TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (processing_log_id) REFERENCES image_processing_logs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS image_access_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    accessed_by_user_id INTEGER,
    access_type TEXT NOT NULL,
    image_type TEXT,
    ip_address TEXT,
    user_agent TEXT,
    accessed_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS image_quality_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    image_processing_log_id INTEGER NOT NULL,
    blur_score REAL,
    brightness_score REAL,
    contrast_score REAL,
    resolution_width INTEGER,
    resolution_height INTEGER,
    file_size_bytes INTEGER,
    has_cccd_corners BOOLEAN DEFAULT 0,
    aspect_ratio_match REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (image_processing_log_id) REFERENCES image_processing_logs(id) ON DELETE CASCADE
);

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
CREATE INDEX IF NOT EXISTS idx_students_cccd_front_image ON students(cccd_front_image_id);
CREATE INDEX IF NOT EXISTS idx_students_cccd_back_image ON students(cccd_back_image_id);
CREATE INDEX IF NOT EXISTS idx_students_photo_image ON students(photo_3x4_image_id);
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
CREATE INDEX IF NOT EXISTS idx_certificate_shipments_certificate ON certificate_shipments(certificate_id);
CREATE INDEX IF NOT EXISTS idx_certificate_shipments_student ON certificate_shipments(student_id);
CREATE INDEX IF NOT EXISTS idx_certificate_shipments_status ON certificate_shipments(status);
CREATE INDEX IF NOT EXISTS idx_image_logs_student ON image_processing_logs(student_id);
CREATE INDEX IF NOT EXISTS idx_image_logs_status ON image_processing_logs(processing_status);
CREATE INDEX IF NOT EXISTS idx_image_logs_stage ON image_processing_logs(pipeline_stage);
CREATE INDEX IF NOT EXISTS idx_image_logs_created ON image_processing_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_image_logs_selection_status ON image_processing_logs(selection_status);
CREATE INDEX IF NOT EXISTS idx_photo_3x4_variants_log ON photo_3x4_variants(processing_log_id);
CREATE INDEX IF NOT EXISTS idx_photo_3x4_variants_slot ON photo_3x4_variants(processing_log_id, variant_slot);
CREATE INDEX IF NOT EXISTS idx_photo_3x4_variants_recommended ON photo_3x4_variants(processing_log_id, recommended);
CREATE INDEX IF NOT EXISTS idx_access_logs_student ON image_access_logs(student_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_accessed_by ON image_access_logs(accessed_by_user_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_date ON image_access_logs(accessed_at);
CREATE INDEX IF NOT EXISTS idx_quality_metrics_log ON image_quality_metrics(image_processing_log_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin ON audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);
