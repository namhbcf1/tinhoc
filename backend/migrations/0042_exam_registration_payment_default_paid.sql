-- Switch default exam registration fee marker to paid.
-- Existing rows are upgraded so the admin list starts in the paid state by default.

UPDATE exam_registrations
SET payment_status = 'paid'
WHERE payment_status IS NULL OR payment_status = 'unpaid';
