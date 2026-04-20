-- Normalize exam registration fee markers by workflow state.
-- Pending rows should stay unknown (NULL); approved/registered rows fall back to unpaid.

UPDATE exam_registrations
SET payment_status = NULL
WHERE status = 'pending';

UPDATE exam_registrations
SET payment_status = 'unpaid'
WHERE status IN ('approved', 'registered')
  AND payment_status IS NULL;
