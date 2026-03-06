@echo off
echo ========================================
echo CLOUDFLARE D1 DATABASE MIGRATION
echo ========================================
echo.

set DB_NAME=vantrangedu_db

echo Creating conversations table...
npx wrangler d1 execute %DB_NAME% --remote --command="CREATE TABLE IF NOT EXISTS conversations (id INTEGER PRIMARY KEY AUTOINCREMENT, student_id INTEGER, admin_id INTEGER, subject TEXT, last_message_at DATETIME, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);"

echo Creating messages table...
npx wrangler d1 execute %DB_NAME% --remote --command="CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT, conversation_id INTEGER NOT NULL, sender_type TEXT CHECK(sender_type IN ('student', 'admin')) NOT NULL, sender_id INTEGER NOT NULL, message TEXT NOT NULL, read BOOLEAN DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);"

echo Creating notifications table...
npx wrangler d1 execute %DB_NAME% --remote --command="CREATE TABLE IF NOT EXISTS notifications (id INTEGER PRIMARY KEY AUTOINCREMENT, student_id INTEGER, title TEXT NOT NULL, message TEXT NOT NULL, type TEXT DEFAULT 'info', read BOOLEAN DEFAULT 0, link TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);"

echo Creating attendance table...
npx wrangler d1 execute %DB_NAME% --remote --command="CREATE TABLE IF NOT EXISTS attendance (id INTEGER PRIMARY KEY AUTOINCREMENT, registration_id INTEGER NOT NULL, class_id INTEGER NOT NULL, attendance_date DATE NOT NULL, status TEXT DEFAULT 'absent', notes TEXT, marked_by INTEGER, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, UNIQUE(registration_id, attendance_date));"

echo Creating exam_schedules table...
npx wrangler d1 execute %DB_NAME% --remote --command="CREATE TABLE IF NOT EXISTS exam_schedules (id INTEGER PRIMARY KEY AUTOINCREMENT, class_id INTEGER NOT NULL, exam_name TEXT NOT NULL, exam_date DATETIME NOT NULL, duration_minutes INTEGER DEFAULT 120, location TEXT, notes TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);"

echo Creating teachers table...
npx wrangler d1 execute %DB_NAME% --remote --command="CREATE TABLE IF NOT EXISTS teachers (id INTEGER PRIMARY KEY AUTOINCREMENT, teacher_code TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, full_name TEXT NOT NULL, email TEXT, phone TEXT, specialization TEXT, status TEXT DEFAULT 'active', created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP);"

echo.
echo ========================================
echo Migration Complete!
echo ========================================
pause
