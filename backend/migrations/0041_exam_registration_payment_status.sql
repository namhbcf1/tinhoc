-- Track manual fee status for exam registrations in admin exam schedules.
ALTER TABLE exam_registrations
ADD COLUMN payment_status TEXT DEFAULT 'paid' CHECK (payment_status IN ('unpaid', 'paid'));

UPDATE exam_registrations
SET payment_status = 'paid'
WHERE payment_status IS NULL;

CREATE INDEX IF NOT EXISTS idx_exam_registrations_payment_status
ON exam_registrations(payment_status);
