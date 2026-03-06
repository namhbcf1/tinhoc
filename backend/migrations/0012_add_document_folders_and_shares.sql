-- Phase 1: Document folders + shares (Drive-like)
-- NOTE: Keep existing tables for backward compatibility.

-- 1) Folders
CREATE TABLE IF NOT EXISTS document_folders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  parent_id INTEGER,
  folder_type TEXT NOT NULL DEFAULT 'shared' CHECK(folder_type IN ('shared','private')),
  owner_role TEXT CHECK(owner_role IN ('admin','teacher')),
  owner_id INTEGER,
  created_by_admin_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_id) REFERENCES document_folders(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_document_folders_parent ON document_folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_document_folders_type ON document_folders(folder_type);
CREATE INDEX IF NOT EXISTS idx_document_folders_owner ON document_folders(owner_role, owner_id);

-- 2) Shares (publish documents into classes)
CREATE TABLE IF NOT EXISTS document_shares (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id INTEGER NOT NULL,
  target_type TEXT NOT NULL CHECK(target_type IN ('offline_class','online_class')),
  target_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','revoked')),
  shared_by_role TEXT CHECK(shared_by_role IN ('admin','teacher')),
  shared_by_id INTEGER,
  shared_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  revoked_at DATETIME,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_document_shares_doc ON document_shares(document_id);
CREATE INDEX IF NOT EXISTS idx_document_shares_target ON document_shares(target_type, target_id);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_document_shares_doc_target ON document_shares(document_id, target_type, target_id);

