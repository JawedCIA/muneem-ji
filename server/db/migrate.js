// Forward-only SQLite migration runner.
//
// Conventions:
//   - Files live in server/db/migrations/, named NNN_description.sql (e.g. 001_initial.sql)
//   - The 3-digit prefix is the version. Versions must be unique and monotonically increasing.
//   - Once a migration is APPLIED to any production DB, never edit the file. Add a new one.
//     The runner stores a SHA-256 checksum of every applied file and refuses to boot
//     if the file's checksum has changed (catches in-place edits during development).
//   - Each migration runs inside a single transaction. If it throws, nothing is committed.
//
// Special-case: legacy DBs that were initialised by the older `db.exec(schema.sql)` flow
// already have all the v001 tables. The runner detects this (via a sentinel table check)
// and records v001 as applied without re-executing — safe because the file is idempotent
// CREATE TABLE IF NOT EXISTS, but skipping avoids unnecessary work + clutter in logs.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

const FILE_RE = /^(\d{3,})_[a-z0-9_]+\.sql$/i;

function sha256(text) {
  return crypto.createHash('sha256').update(text, 'utf-8').digest('hex');
}

function loadMigrationFiles() {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    throw new Error(`Migrations directory missing: ${MIGRATIONS_DIR}`);
  }
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter((f) => FILE_RE.test(f))
    .sort(); // lexicographic = numeric for zero-padded prefixes
  return files.map((name) => {
    const version = parseInt(name.match(FILE_RE)[1], 10);
    const fullPath = path.join(MIGRATIONS_DIR, name);
    const sql = fs.readFileSync(fullPath, 'utf-8');
    return { version, name, sql, checksum: sha256(sql) };
  });
}

function ensureMigrationsTable(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version    INTEGER PRIMARY KEY,
      name       TEXT NOT NULL,
      checksum   TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

function listApplied(db) {
  return db.prepare('SELECT version, name, checksum, applied_at FROM schema_migrations ORDER BY version').all();
}

// A legacy DB has all v001 tables but no schema_migrations row for v001.
function isLegacyV001(db) {
  // Settings is the very first table created by 001 and was present in the
  // original schema.sql. If it exists but schema_migrations is empty, it's legacy.
  const t = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='settings'").get();
  const sm = db.prepare("SELECT COUNT(*) c FROM schema_migrations").get();
  return Boolean(t) && sm.c === 0;
}

export function runMigrations(db, { quiet = false } = {}) {
  ensureMigrationsTable(db);
  const files = loadMigrationFiles();
  if (files.length === 0) {
    if (!quiet) console.warn('[migrate] No migration files found in', MIGRATIONS_DIR);
    return { applied: [], skipped: [], pending: [] };
  }

  const applied = listApplied(db);
  const appliedByVersion = new Map(applied.map((a) => [a.version, a]));

  // Drift detection — refuse to start if any applied migration's file has been edited
  for (const a of applied) {
    const f = files.find((x) => x.version === a.version);
    if (f && f.checksum !== a.checksum) {
      throw new Error(
        `[migrate] Checksum drift on ${a.name} (v${String(a.version).padStart(3, '0')}): ` +
        `database has ${a.checksum.slice(0, 12)}…, file has ${f.checksum.slice(0, 12)}…\n` +
        `Migration files must NEVER be edited after they are applied. Add a new migration file instead.`
      );
    }
    if (!f) {
      console.warn(`[migrate] Warning: applied migration v${a.version} (${a.name}) is not present on disk. ` +
        `That's fine if you rolled back the codebase, but no integrity check can run.`);
    }
  }

  const result = { applied: [], skipped: [], pending: [] };
  const legacy = files.length > 0 && !appliedByVersion.has(1) && isLegacyV001(db);

  const insertApplied = db.prepare('INSERT INTO schema_migrations (version, name, checksum) VALUES (?, ?, ?)');

  for (const f of files) {
    if (appliedByVersion.has(f.version)) {
      result.skipped.push(f);
      continue;
    }
    if (f.version === 1 && legacy) {
      // Legacy DB already has v001 tables — record as applied without re-executing
      insertApplied.run(f.version, f.name, f.checksum);
      result.applied.push({ ...f, legacyImport: true });
      if (!quiet) console.log(`[migrate] v001 detected on legacy DB — recorded as applied without re-execution`);
      continue;
    }
    if (!quiet) console.log(`[migrate] Applying ${f.name}…`);
    db.transaction(() => {
      db.exec(f.sql);
      insertApplied.run(f.version, f.name, f.checksum);
    })();
    result.applied.push(f);
    if (!quiet) console.log(`[migrate] Applied ${f.name}`);
  }

  if (!quiet && result.applied.length === 0) {
    console.log(`[migrate] Database up to date (${result.skipped.length} migration${result.skipped.length === 1 ? '' : 's'} applied)`);
  }
  return result;
}

// CLI: `node server/db/migrate.js` — applies pending migrations and exits.
//      `node server/db/migrate.js status` — prints current state without changing anything.
//
// We open the DB directly (not via db.js) to avoid a circular import — db.js
// itself imports this file and would re-trigger runMigrations during the CLI run.
function openDbForCli() {
  // Lazy-import better-sqlite3 only when used as CLI
  return import('better-sqlite3').then(({ default: Database }) => {
    const DEFAULT_PROD_DIR = path.resolve(process.cwd(), 'data');
    const DEFAULT_DEV_PATH = path.join(__dirname, 'muneemji.sqlite');
    const DB_PATH = process.env.DB_PATH
      || (process.env.NODE_ENV === 'production'
          ? path.join(DEFAULT_PROD_DIR, 'muneemji.sqlite')
          : DEFAULT_DEV_PATH);
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    const db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    return { db, DB_PATH };
  });
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const { db, DB_PATH } = await openDbForCli();
  const cmd = process.argv[2];

  if (cmd === 'status') {
    ensureMigrationsTable(db);
    const files = loadMigrationFiles();
    const applied = new Map(listApplied(db).map((a) => [a.version, a]));
    console.log(`Database: ${DB_PATH}`);
    console.log(`Migrations on disk: ${files.length}`);
    console.log('');
    console.log('  Ver  Status   Name                                  Applied at');
    console.log('  ───  ───────  ────────────────────────────────────  ─────────────────────');
    for (const f of files) {
      const a = applied.get(f.version);
      const status = a ? 'APPLIED' : 'pending';
      const when = a?.applied_at || '—';
      const drift = a && a.checksum !== f.checksum ? '  ⚠ DRIFT' : '';
      console.log(`  ${String(f.version).padStart(3, '0')}  ${status.padEnd(7)}  ${f.name.padEnd(36)}  ${when}${drift}`);
    }
    const pending = files.filter((f) => !applied.has(f.version));
    console.log('');
    console.log(pending.length === 0 ? '✓ Up to date.' : `⚠ ${pending.length} pending migration${pending.length === 1 ? '' : 's'} — run \`npm run db:migrate\` to apply.`);
    db.close();
    process.exit(0);
  }

  // Default action: apply pending migrations
  const r = runMigrations(db, { quiet: false });
  console.log(`Done. ${r.applied.length} applied, ${r.skipped.length} already present.`);
  db.close();
  process.exit(0);
}
