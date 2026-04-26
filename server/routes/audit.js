import { Router } from 'express';
import db from '../db/db.js';
import { requireRole } from '../middleware/requireAuth.js';

const router = Router();

// All audit endpoints are admin-only
router.use(requireRole('admin'));

const ENTITIES = ['invoice', 'party', 'product', 'payment', 'expense', 'user', 'settings', 'auth', 'backup', 'demo'];
const ACTIONS  = ['create', 'update', 'delete', 'login', 'logout', 'login_failed', 'password_change', 'logo_upload', 'logo_remove', 'backup_import', 'demo_load', 'demo_clear', 'status_change', 'convert', 'adjust_stock'];

function buildWhere(query) {
  const where = [];
  const params = {};
  if (query.entity)    { where.push('entity = @entity');       params.entity = String(query.entity); }
  if (query.action)    { where.push('action = @action');       params.action = String(query.action); }
  if (query.user_id)   { where.push('user_id = @user_id');     params.user_id = String(query.user_id); }
  if (query.entity_id) { where.push('entity_id = @entity_id'); params.entity_id = String(query.entity_id); }
  if (query.from)      { where.push("ts >= @from");            params.from = String(query.from); }
  if (query.to)        { where.push("ts < @to_excl");          params.to_excl = String(query.to) + 'T99'; } // simple lex-comparable upper bound
  if (query.q) {
    where.push('(summary LIKE @q OR user_email LIKE @q OR entity_id LIKE @q)');
    params.q = `%${query.q}%`;
  }
  return { whereClause: where.length ? 'WHERE ' + where.join(' AND ') : '', params };
}

router.get('/', (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const pageSize = Math.min(200, Math.max(1, parseInt(req.query.pageSize) || 50));
  const offset = (page - 1) * pageSize;
  const { whereClause, params } = buildWhere(req.query);

  const total = db.prepare(`SELECT COUNT(*) c FROM audit_log ${whereClause}`).get(params).c;
  const rows = db.prepare(`
    SELECT id, ts, user_id, user_email, user_role, action, entity, entity_id, summary, before_json, after_json, ip
    FROM audit_log
    ${whereClause}
    ORDER BY ts DESC, id DESC
    LIMIT @lim OFFSET @off
  `).all({ ...params, lim: pageSize, off: offset });

  res.json({ rows, total, page, pageSize });
});

router.get('/facets', (req, res) => {
  // Distinct values for dropdown filters
  const users = db.prepare(`
    SELECT user_id, user_email, MAX(ts) AS last_seen
    FROM audit_log
    WHERE user_id IS NOT NULL
    GROUP BY user_id, user_email
    ORDER BY last_seen DESC
  `).all();
  const entities = db.prepare(`SELECT DISTINCT entity FROM audit_log ORDER BY entity`).all().map((r) => r.entity);
  const actions  = db.prepare(`SELECT DISTINCT action FROM audit_log ORDER BY action`).all().map((r) => r.action);
  res.json({ users, entities, actions, knownEntities: ENTITIES, knownActions: ACTIONS });
});

router.get('/csv', (req, res) => {
  const { whereClause, params } = buildWhere(req.query);
  const rows = db.prepare(`
    SELECT ts, user_email, user_role, action, entity, entity_id, summary, ip
    FROM audit_log
    ${whereClause}
    ORDER BY ts DESC
    LIMIT 50000
  `).all(params);

  const esc = (v) => {
    if (v == null) return '';
    const s = String(v).replace(/"/g, '""');
    return /[",\n]/.test(s) ? `"${s}"` : s;
  };
  const header = 'timestamp,user_email,user_role,action,entity,entity_id,summary,ip\n';
  const body = rows.map((r) => [r.ts, r.user_email, r.user_role, r.action, r.entity, r.entity_id, r.summary, r.ip].map(esc).join(',')).join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="audit-log-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send(header + body);
});

export default router;
