-- Performance indexes for commonly queried columns
-- Fixes: missing indexes identified in backend architect report (Agent 3)

-- students: ho_ten_normalized used heavily in search but not indexed
CREATE INDEX IF NOT EXISTS idx_students_ho_ten_normalized ON students(ho_ten_normalized);

-- students: cccd is the primary lookup key for login and student lookups
CREATE INDEX IF NOT EXISTS idx_students_cccd ON students(cccd);

-- students: email lookup for duplicate check on registration
CREATE INDEX IF NOT EXISTS idx_students_email ON students(email);

-- students: sdt (phone) lookup for login and search
CREATE INDEX IF NOT EXISTS idx_students_sdt ON students(sdt);

-- registrations: status filter is very common (pending/approved/studying/etc)
CREATE INDEX IF NOT EXISTS idx_registrations_status ON registrations(status);

-- registrations: student_id join used in getStudentRegistrations
CREATE INDEX IF NOT EXISTS idx_registrations_student_id ON registrations(student_id);

-- registrations: class_id join used in getRegistrationsByClass and eligible check
CREATE INDEX IF NOT EXISTS idx_registrations_class_id ON registrations(class_id);

-- certificates: student_id + class_id combo checked in eligible and bulk issue
CREATE INDEX IF NOT EXISTS idx_certificates_student_class ON certificates(student_id, class_id);

-- certificates: class_id filter used in getCertificatesByClass
CREATE INDEX IF NOT EXISTS idx_certificates_class_id ON certificates(class_id);

-- payments: registration_id used in payment status lookups
CREATE INDEX IF NOT EXISTS idx_payments_registration_id ON payments(registration_id);

-- payments: status filter for confirmed payments
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- classes: ma_lop unique lookup
CREATE INDEX IF NOT EXISTS idx_classes_ma_lop ON classes(ma_lop);

-- classes: status filter for open classes
CREATE INDEX IF NOT EXISTS idx_classes_status ON classes(status);
