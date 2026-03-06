-- Create admin_activity_logs table
CREATE TABLE IF NOT EXISTS admin_activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_id INTEGER NOT NULL,
    action TEXT NOT NULL,
    resource_type TEXT,
    resource_id INTEGER,
    details TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_admin_activity_admin ON admin_activity_logs(admin_id, created_at);
CREATE INDEX IF NOT EXISTS idx_admin_activity_action ON admin_activity_logs(action, created_at);
CREATE INDEX IF NOT EXISTS idx_admin_activity_resource ON admin_activity_logs(resource_type, resource_id);
