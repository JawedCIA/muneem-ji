// Shared pagination contract for list endpoints.
//
// - Default behaviour: returns wrapped { rows, total, page, pageSize }
// - Caller can opt out with ?all=1 (returns flat array) — used by UI pickers
//   that need the full set, e.g. invoice form's product/party dropdowns.
//
// pageSize defaults to 50, capped at 200 to protect the server from giant pages.

export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 200;

export function parsePagination(query) {
  if (query.all === '1' || query.all === 'true') return { all: true };
  const page = Math.max(1, parseInt(query.page) || 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(query.pageSize) || DEFAULT_PAGE_SIZE));
  return { all: false, page, pageSize, offset: (page - 1) * pageSize };
}

/**
 * Run a list query under the pagination contract.
 *
 * @param db                  better-sqlite3 connection
 * @param baseSql             SELECT … FROM table [JOIN …]
 * @param whereClause         '' or 'WHERE …'
 * @param orderClause         e.g. 'ORDER BY name'
 * @param params              SQL bind params for WHERE
 * @param pag                 result of parsePagination(req.query)
 * @returns {rows, total, page, pageSize} OR plain array if pag.all
 */
export function paginatedQuery(db, baseSql, whereClause, orderClause, params, pag) {
  if (pag.all) {
    return db.prepare(`${baseSql} ${whereClause} ${orderClause}`).all(...params);
  }
  const total = db.prepare(`SELECT COUNT(*) AS c FROM (${baseSql} ${whereClause})`).get(...params).c;
  const rows = db.prepare(`${baseSql} ${whereClause} ${orderClause} LIMIT ? OFFSET ?`).all(...params, pag.pageSize, pag.offset);
  return { rows, total, page: pag.page, pageSize: pag.pageSize };
}
