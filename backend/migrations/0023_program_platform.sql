-- Migration: Shared program platform taxonomy and canonical refs

CREATE TABLE IF NOT EXISTS program_organizers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  updated_by INTEGER,
  source_site TEXT NOT NULL DEFAULT 'edu',
  last_event_uuid TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS programs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT NOT NULL UNIQUE,
  organizer_uuid TEXT NOT NULL,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  description TEXT,
  delivery_mode TEXT NOT NULL DEFAULT 'internal_training',
  training_enabled INTEGER NOT NULL DEFAULT 1,
  linked_class_enabled INTEGER NOT NULL DEFAULT 1,
  visible_on_edu_public INTEGER NOT NULL DEFAULT 1,
  visible_on_edu_admin INTEGER NOT NULL DEFAULT 1,
  visible_on_exam_teacher INTEGER NOT NULL DEFAULT 1,
  visible_on_exam_student INTEGER NOT NULL DEFAULT 1,
  redirect_url TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  legacy_exam_category_id INTEGER,
  legacy_exam_type_id INTEGER,
  updated_by INTEGER,
  source_site TEXT NOT NULL DEFAULT 'edu',
  last_event_uuid TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organizer_uuid) REFERENCES program_organizers(uuid) ON DELETE RESTRICT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_programs_organizer_code
  ON programs(organizer_uuid, code);

CREATE TABLE IF NOT EXISTS program_levels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT NOT NULL UNIQUE,
  program_uuid TEXT NOT NULL,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  updated_by INTEGER,
  source_site TEXT NOT NULL DEFAULT 'edu',
  last_event_uuid TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (program_uuid) REFERENCES programs(uuid) ON DELETE RESTRICT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_program_levels_program_code
  ON program_levels(program_uuid, code);

CREATE TABLE IF NOT EXISTS field_definitions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT NOT NULL UNIQUE,
  field_key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT,
  field_type TEXT NOT NULL,
  target_entity_type TEXT NOT NULL,
  owner_entity_type TEXT,
  owner_entity_uuid TEXT,
  placeholder TEXT,
  help_text TEXT,
  config_json TEXT,
  searchable INTEGER NOT NULL DEFAULT 0,
  filterable INTEGER NOT NULL DEFAULT 0,
  exportable INTEGER NOT NULL DEFAULT 0,
  reportable INTEGER NOT NULL DEFAULT 0,
  visible_on_edu_public INTEGER NOT NULL DEFAULT 0,
  visible_on_edu_admin INTEGER NOT NULL DEFAULT 1,
  visible_on_exam_teacher INTEGER NOT NULL DEFAULT 1,
  visible_on_exam_student INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  updated_by INTEGER,
  source_site TEXT NOT NULL DEFAULT 'edu',
  last_event_uuid TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_field_definitions_target_entity
  ON field_definitions(target_entity_type, owner_entity_type, owner_entity_uuid);

CREATE TABLE IF NOT EXISTS field_options (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT NOT NULL UNIQUE,
  field_definition_uuid TEXT NOT NULL,
  label TEXT NOT NULL,
  value TEXT NOT NULL,
  color TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  updated_by INTEGER,
  source_site TEXT NOT NULL DEFAULT 'edu',
  last_event_uuid TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (field_definition_uuid) REFERENCES field_definitions(uuid) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_field_options_definition_value
  ON field_options(field_definition_uuid, value);

CREATE TABLE IF NOT EXISTS field_values (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT NOT NULL UNIQUE,
  field_definition_uuid TEXT NOT NULL,
  target_entity_type TEXT NOT NULL,
  target_entity_uuid TEXT NOT NULL,
  value_json TEXT,
  source_site TEXT NOT NULL DEFAULT 'edu',
  last_event_uuid TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (field_definition_uuid) REFERENCES field_definitions(uuid) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_field_values_target
  ON field_values(field_definition_uuid, target_entity_type, target_entity_uuid);

CREATE TABLE IF NOT EXISTS sync_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_uuid TEXT NOT NULL UNIQUE,
  entity_type TEXT NOT NULL,
  entity_uuid TEXT NOT NULL,
  action TEXT NOT NULL,
  source_site TEXT NOT NULL,
  changed_at DATETIME NOT NULL,
  payload_json TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE exam_schedules ADD COLUMN organizer_uuid TEXT;
ALTER TABLE exam_schedules ADD COLUMN program_uuid TEXT;
ALTER TABLE exam_schedules ADD COLUMN level_uuid TEXT;
ALTER TABLE exam_schedules ADD COLUMN custom_field_payload TEXT;
ALTER TABLE exam_schedules ADD COLUMN override_payload TEXT;
ALTER TABLE exam_schedules ADD COLUMN updated_by INTEGER;
ALTER TABLE exam_schedules ADD COLUMN source_site TEXT DEFAULT 'edu';
ALTER TABLE exam_schedules ADD COLUMN last_event_uuid TEXT;

ALTER TABLE online_classes ADD COLUMN organizer_uuid TEXT;
ALTER TABLE online_classes ADD COLUMN program_uuid TEXT;
ALTER TABLE online_classes ADD COLUMN level_uuid TEXT;
ALTER TABLE online_classes ADD COLUMN custom_field_payload TEXT;
ALTER TABLE online_classes ADD COLUMN override_payload TEXT;
ALTER TABLE online_classes ADD COLUMN source_site TEXT DEFAULT 'edu';
ALTER TABLE online_classes ADD COLUMN last_event_uuid TEXT;

ALTER TABLE documents ADD COLUMN organizer_uuid TEXT;
ALTER TABLE documents ADD COLUMN program_uuid TEXT;
ALTER TABLE documents ADD COLUMN level_uuid TEXT;
ALTER TABLE documents ADD COLUMN custom_field_payload TEXT;
ALTER TABLE documents ADD COLUMN override_payload TEXT;

ALTER TABLE assignments ADD COLUMN organizer_uuid TEXT;
ALTER TABLE assignments ADD COLUMN program_uuid TEXT;
ALTER TABLE assignments ADD COLUMN level_uuid TEXT;
ALTER TABLE assignments ADD COLUMN custom_field_payload TEXT;
ALTER TABLE assignments ADD COLUMN override_payload TEXT;

CREATE INDEX IF NOT EXISTS idx_exam_schedules_program_uuid
  ON exam_schedules(program_uuid);

CREATE INDEX IF NOT EXISTS idx_exam_schedules_level_uuid
  ON exam_schedules(level_uuid);

CREATE INDEX IF NOT EXISTS idx_online_classes_program_uuid
  ON online_classes(program_uuid);

CREATE INDEX IF NOT EXISTS idx_documents_program_uuid
  ON documents(program_uuid);

CREATE INDEX IF NOT EXISTS idx_assignments_program_uuid
  ON assignments(program_uuid);
