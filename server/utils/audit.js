// Centralised audit-log writer used by mutating routes.
//
// Conventions:
//   - Always call AFTER the DB change succeeds (so we don't log writes that didn't happen).
//   - `before` is the row before the change (null for creates/logins).
//   - `after`  is the row after  the change (null for deletes/logins).
//   - Sensitive fields are auto-redacted before serialising.
//   - Failures here are swallowed-with-log — auditing must never block a real operation.

import { nanoid } from 'nanoid';
import db from '../db/db.js';

const REDACT_KEYS = new Set([
  'password', 'password_hash', 'currentPassword', 'newPassword',
  'jwt_secret', 'token', 'cookie',
]);

function redact(obj) {
  if (obj == null) return null;
  if (Array.isArray(obj)) return obj.map(redact);
  if (typeof obj !== 'object') return obj;
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (REDACT_KEYS.has(k)) {
      out[k] = '[REDACTED]';
    } else if (v && typeof v === 'object') {
      out[k] = redact(v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

function serialise(value) {
  if (value == null) return null;
  try { return JSON.stringify(redact(value)); }
  catch { return JSON.stringify({ _error: 'unserialisable' }); }
}

function clientIp(req) {
  if (!req) return null;
  // Express respects 'trust proxy' (set in index.js) so req.ip already honours X-Forwarded-For
  return req.ip || req.headers?.['x-forwarded-for']?.split(',')[0]?.trim() || null;
}

function clientUA(req) {
  const ua = req?.headers?.['user-agent'] || '';
  return ua.length > 200 ? ua.slice(0, 200) + '…' : ua;
}

const insertStmt = db.prepare(`
  INSERT INTO audit_log
    (id, user_id, user_email, user_role, action, entity, entity_id, summary, before_json, after_json, ip, user_agent)
  VALUES
    (@id, @user_id, @user_email, @user_role, @action, @entity, @entity_id, @summary, @before_json, @after_json, @ip, @user_agent)
`);

/**
 * Record an audit event.
 *
 * @param {object} args
 * @param {object} [args.req]        - Express req (for user + ip + ua)
 * @param {string} args.action       - 'create' | 'update' | 'delete' | 'login' | 'logout' | 'login_failed' | etc.
 * @param {string} args.entity       - 'invoice' | 'party' | 'product' | 'payment' | 'expense' | 'user' | 'settings' | 'auth' | 'backup' | 'demo' | etc.
 * @param {string|null} [args.entityId]
 * @param {object|null} [args.before]
 * @param {object|null} [args.after]
 * @param {string} [args.summary]
 * @param {object} [args.actor]      - override actor (used for login_failed where req.user is unset)
 */
export function recordAudit({ req, action, entity, entityId = null, before = null, after = null, summary = null, actor = null }) {
  try {
    const u = actor || req?.user || {};
    insertStmt.run({
      id: nanoid(16),
      user_id: u.id || null,
      user_email: u.email || null,
      user_role: u.role || null,
      action,
      entity,
      entity_id: entityId,
      summary: summary || null,
      before_json: serialise(before),
      after_json: serialise(after),
      ip: clientIp(req),
      user_agent: clientUA(req),
    });
  } catch (e) {
    // Never break the real request because of an audit-log failure
    console.error('[audit] failed to record event:', e.message);
  }
}

// Convenience wrappers — pure sugar, same insert
export const audit = {
  create:  (req, entity, row, summary)        => recordAudit({ req, action: 'create',  entity, entityId: row?.id, after: row, summary }),
  update:  (req, entity, before, after, summary) => recordAudit({ req, action: 'update', entity, entityId: after?.id || before?.id, before, after, summary }),
  delete:  (req, entity, before, summary)     => recordAudit({ req, action: 'delete',  entity, entityId: before?.id, before, summary }),
  custom:  (req, action, entity, opts = {})   => recordAudit({ req, action, entity, ...opts }),
};
