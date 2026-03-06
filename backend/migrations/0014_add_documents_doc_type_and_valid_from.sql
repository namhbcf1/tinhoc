-- Phase 1.1: Add doc_type and valid_from to documents (for better filtering & governance)
ALTER TABLE documents ADD COLUMN doc_type TEXT DEFAULT 'general';
ALTER TABLE documents ADD COLUMN valid_from DATETIME;

CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(doc_type);
CREATE INDEX IF NOT EXISTS idx_documents_valid_from ON documents(valid_from);

