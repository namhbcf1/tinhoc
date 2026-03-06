-- Migrate admins table to support super_admin role
-- Step 1: Disable foreign key constraints
PRAGMA foreign_keys = OFF;

-- Step 2: Create backup tables for all tables that reference admins
CREATE TABLE audit_log_backup AS SELECT * FROM audit_log;
CREATE TABLE payments_backup AS SELECT * FROM payments;
CREATE TABLE certificates_backup AS SELECT * FROM certificates;
CREATE TABLE admin_activity_logs_backup AS SELECT * FROM admin_activity_logs;
CREATE TABLE password_reset_tokens_backup AS SELECT * FROM password_reset_tokens;
CREATE TABLE documents_backup AS SELECT * FROM documents;
CREATE TABLE posts_backup AS SELECT * FROM posts;

-- Step 3: Drop all tables that reference admins
DROP TABLE audit_log;
DROP TABLE payments;
DROP TABLE certificates;
DROP TABLE admin_activity_logs;
DROP TABLE password_reset_tokens;
DROP TABLE documents;
DROP TABLE posts;

-- Step 4: Drop old admins table
DROP TABLE admins;

-- Step 5: Rename new admins table
ALTER TABLE admins_new RENAME TO admins;

-- Step 6: Create indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_admins_username ON admins(username);
CREATE INDEX IF NOT EXISTS idx_admins_role ON admins(role);

-- Step 7: Recreate all tables that reference admins
CREATE TABLE audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_id INTEGER,
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id INTEGER NOT NULL,
    old_value TEXT,
    new_value TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES admins(id)
);

CREATE TABLE payments (
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

CREATE TABLE certificates (
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

CREATE TABLE admin_activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_id INTEGER NOT NULL,
    action TEXT NOT NULL,
    resource_type TEXT,
    resource_id INTEGER,
    details TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE
);

CREATE TABLE password_reset_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_id INTEGER NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expires_at DATETIME NOT NULL,
    used BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE
);

CREATE TABLE documents (
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

CREATE TABLE posts (
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

-- Step 8: Restore data from backup tables
INSERT INTO audit_log SELECT * FROM audit_log_backup;
INSERT INTO payments SELECT * FROM payments_backup;
INSERT INTO certificates SELECT * FROM certificates_backup;
INSERT INTO admin_activity_logs SELECT * FROM admin_activity_logs_backup;
INSERT INTO password_reset_tokens SELECT * FROM password_reset_tokens_backup;
INSERT INTO documents SELECT * FROM documents_backup;
INSERT INTO posts SELECT * FROM posts_backup;

-- Step 9: Drop backup tables
DROP TABLE audit_log_backup;
DROP TABLE payments_backup;
DROP TABLE certificates_backup;
DROP TABLE admin_activity_logs_backup;
DROP TABLE password_reset_tokens_backup;
DROP TABLE documents_backup;
DROP TABLE posts_backup;

-- Step 10: Create indexes for all tables
CREATE INDEX IF NOT EXISTS idx_payments_registration ON payments(registration_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_certificates_student ON certificates(student_id);
CREATE INDEX IF NOT EXISTS idx_certificates_class ON certificates(class_id);
CREATE INDEX IF NOT EXISTS idx_certificates_number ON certificates(certificate_number);
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category);
CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts(slug);
CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_published ON posts(published_at);

-- Step 11: Re-enable foreign key constraints
PRAGMA foreign_keys = ON;
