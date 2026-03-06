-- ========================================
-- MIGRATION: Online Classes with Google Meet
-- Created: 2026-01-21
-- ========================================

-- Bảng ONLINE_CLASSES - Lớp học online với Google Meet
CREATE TABLE IF NOT EXISTS online_classes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    class_name TEXT NOT NULL,
    description TEXT,
    
    -- Schedule Info
    schedule_rule TEXT NOT NULL,          -- Quy tắc lịch: DAILY, WEEKLY:1,3,5, etc.
    schedule_time TEXT NOT NULL,          -- Giờ học: "19:00-21:00"
    timezone TEXT DEFAULT 'Asia/Ho_Chi_Minh',  -- Timezone cho Google Calendar
    recurrence TEXT,                       -- RRULE gốc: "RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR"
    
    -- Dates
    start_date DATE NOT NULL,
    end_date DATE,                        -- NULL = không có ngày kết thúc
    
    -- Google Calendar Integration
    meet_link TEXT,                       -- Google Meet link cố định
    calendar_event_id TEXT,               -- Google Calendar Event ID
    
    -- Class Info
    teacher_name TEXT,
    max_students INTEGER DEFAULT 50,
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'paused', 'completed', 'cancelled')),
    
    -- Metadata
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (created_by) REFERENCES admins(id)
);

-- Bảng đăng ký lớp online
CREATE TABLE IF NOT EXISTS online_class_enrollments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    online_class_id INTEGER NOT NULL,
    student_id INTEGER NOT NULL,
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'cancelled')),
    enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (online_class_id) REFERENCES online_classes(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    UNIQUE(online_class_id, student_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_online_classes_status ON online_classes(status);
CREATE INDEX IF NOT EXISTS idx_online_classes_start_date ON online_classes(start_date);
CREATE INDEX IF NOT EXISTS idx_online_enrollments_class ON online_class_enrollments(online_class_id);
CREATE INDEX IF NOT EXISTS idx_online_enrollments_student ON online_class_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_online_enrollments_status ON online_class_enrollments(status);
