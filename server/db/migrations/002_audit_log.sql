-- 002_audit_log.sql — append-only audit trail of every mutation.
-- Routes call recordAudit() which inserts here. UI never deletes from this table.

CREATE TABLE IF NOT EXISTS audit_log (
  id          TEXT PRIMARY KEY,
  ts          TEXT NOT NULL DEFAULT (datetime('now')),
  user_id     TEXT,
  user_email  TEXT,
  user_role   TEXT,
  action      TEXT NOT NULL,            -- create | update | delete | login | logout | login_failed | password_change | logo_upload | logo_remove | backup_import | demo_load | demo_clear | status_change | convert | adjust_stock
  entity      TEXT NOT NULL,            -- invoice | party | product | payment | expense | user | settings | auth | backup | demo
  entity_id   TEXT,                     -- the affected row's id (nullable for non-row actions like login)
  summary     TEXT,                     -- short human-readable line for the table column
  before_json TEXT,                     -- JSON snapshot of row before change (NULL for create/login)
  after_json  TEXT,                     -- JSON snapshot of row after change (NULL for delete/login)
  ip          TEXT,
  user_agent  TEXT
);

CREATE INDEX IF NOT EXISTS idx_audit_ts        ON audit_log(ts);
CREATE INDEX IF NOT EXISTS idx_audit_entity    ON audit_log(entity);
CREATE INDEX IF NOT EXISTS idx_audit_user      ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity_id ON audit_log(entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_action    ON audit_log(action);
