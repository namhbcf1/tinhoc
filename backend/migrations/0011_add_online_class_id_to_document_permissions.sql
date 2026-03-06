-- Add support for online class document permissions
-- NOTE: SQLite/D1 allows ADD COLUMN; we intentionally avoid FK constraint here
-- to prevent constraint mismatch between classes(id) and online_classes(id).

ALTER TABLE document_permissions ADD COLUMN online_class_id INTEGER;

CREATE INDEX IF NOT EXISTS idx_document_permissions_online_class ON document_permissions(online_class_id);

