-- ========================================
-- MIGRATION: Tạo bảng payments và certificates
-- ========================================
-- Chạy: wrangler d1 execute vantrangedu_db --remote --file=migrate-payments-certificates.sql

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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payments_registration ON payments(registration_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_certificates_student ON certificates(student_id);
CREATE INDEX IF NOT EXISTS idx_certificates_class ON certificates(class_id);
CREATE INDEX IF NOT EXISTS idx_certificates_number ON certificates(certificate_number);
