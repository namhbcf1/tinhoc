-- ========================================
-- MIGRATION: Add pending status to enrollments
-- Created: 2026-01-21
-- Purpose: Allow admin approval for class enrollments
-- ========================================

-- Add approval tracking columns to existing table
-- SQLite doesn't support modifying CHECK constraints, so we handle status validation in backend

-- Add approved_at - when admin approved the enrollment
ALTER TABLE online_class_enrollments ADD COLUMN approved_at DATETIME;

-- Add approved_by - which admin approved (foreign key to admins)
ALTER TABLE online_class_enrollments ADD COLUMN approved_by INTEGER;

-- Add rejection_reason - optional reason if rejected
ALTER TABLE online_class_enrollments ADD COLUMN rejection_reason TEXT;

-- Create index for filtering by status (pending, active, rejected, cancelled)
CREATE INDEX IF NOT EXISTS idx_online_enrollments_pending ON online_class_enrollments(status) WHERE status = 'pending';
