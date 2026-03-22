-- Migration: add-excel-templates
-- Description: Add support for multiple Excel export templates
-- Note: Safe migration - tables and columns may already exist

-- 1. Create excel_templates table (safe)
CREATE TABLE IF NOT EXISTS excel_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    file_key TEXT NOT NULL,
    header_rows INTEGER DEFAULT 8,
    data_start_row INTEGER DEFAULT 10,
    date_cell TEXT,
    column_mapping TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_excel_templates_name ON excel_templates(name);
CREATE INDEX IF NOT EXISTS idx_excel_templates_active ON excel_templates(is_active);

-- 2. Check if template_id column exists (safe no-op if exists)
SELECT template_id FROM exam_schedules LIMIT 0;

-- 3. Insert default templates (OR IGNORE handles duplicates)
INSERT OR IGNORE INTO excel_templates (name, display_name, file_key, header_rows, data_start_row, date_cell, column_mapping) VALUES
('default', 'VanTrang (Mặc định)', '', 6, 7, '', '{"ho_ten_dem":"A","ten":"B","ngay_sinh":"C","gioi_tinh":"D","dan_toc":"E","sdt":"F","email":"G","cccd":"H","ngay_cap_cccd":"I","noi_sinh":"J","don_vi":"K","dia_chi":"L"}'),
('ptit', 'Học viện PTIT', 'templates/MAUPTIT.xlsx', 8, 9, 'F4', '{"stt":"A","so_phach":"B","cccd":"C","ho_ten_dem":"D","ten":"E","ngay_sinh":"F","noi_sinh":"G","gioi_tinh":"H","dan_toc":"I"}'),
('vept', 'VEPT', 'templates/MAUVEPT.xlsx', 4, 5, '', '{"stt":"A","ho_ten_dem":"B","ten":"C","gioi_tinh":"D","ngay":"E","thang":"F","nam":"G","cccd":"H","sdt":"I","email":"J","don_vi":"K","exam_level":"M","exam_date":"N","location":"T"}');
