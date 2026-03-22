-- Migration: central auth sessions and cross-site SSO handoffs

CREATE TABLE IF NOT EXISTS auth_sessions (
  sid TEXT PRIMARY KEY,
  subject_key TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  user_type TEXT NOT NULL,
  role TEXT,
  username TEXT,
  cccd TEXT,
  teacher_code TEXT,
  phone TEXT,
  email TEXT,
  display_name TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at DATETIME,
  revoked_at DATETIME
);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_subject
  ON auth_sessions(subject_key, status);

CREATE TABLE IF NOT EXISTS sso_handoffs (
  ticket TEXT PRIMARY KEY,
  sid TEXT NOT NULL,
  target_app TEXT NOT NULL,
  return_to TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  used_at DATETIME,
  FOREIGN KEY (sid) REFERENCES auth_sessions(sid) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sso_handoffs_sid
  ON sso_handoffs(sid, status);
