-- ========================================
-- MIGRATION: Tạo bảng document_permissions và document_downloads
-- ========================================
-- Chạy: wrangler d1 execute vantrangedu_db --remote --file=migrate-document-permissions.sql

-- Bảng DOCUMENT_PERMISSIONS - Phân quyền tài liệu (giống Google Drive)
CREATE TABLE IF NOT EXISTS document_permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id INTEGER NOT NULL,
    permission_type TEXT NOT NULL CHECK(permission_type IN ('public', 'class', 'student', 'admin')),
    class_id INTEGER,
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_document_permissions_doc ON document_permissions(document_id);
CREATE INDEX IF NOT EXISTS idx_document_permissions_type ON document_permissions(permission_type);
CREATE INDEX IF NOT EXISTS idx_document_permissions_class ON document_permissions(class_id);
CREATE INDEX IF NOT EXISTS idx_document_permissions_student ON document_permissions(student_id);
CREATE INDEX IF NOT EXISTS idx_document_downloads_doc ON document_downloads(document_id);
CREATE INDEX IF NOT EXISTS idx_document_downloads_student ON document_downloads(student_id);
