-- ========================================
-- Migration: Add missing student fields (v2)
-- Date: 2026-01-13
-- Note: dan_toc already exists, other fields existed in remote db
-- ========================================

-- 1. Thêm cột ngày cấp CCCD
-- ALTER TABLE students ADD COLUMN ngay_cap_cccd DATE;

-- 2. Thêm cột đơn vị công tác/học tập  
-- ALTER TABLE students ADD COLUMN don_vi_cong_tac TEXT;
