-- Phase 1: Add folder + visibility to documents (D1 current schema uses file_url as R2 key)
ALTER TABLE documents ADD COLUMN folder_id INTEGER;
ALTER TABLE documents ADD COLUMN visibility TEXT NOT NULL DEFAULT 'internal' CHECK(visibility IN ('internal','public'));

CREATE INDEX IF NOT EXISTS idx_documents_folder ON documents(folder_id);
CREATE INDEX IF NOT EXISTS idx_documents_visibility ON documents(visibility);

