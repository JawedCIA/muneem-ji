import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runMigrations } from './migrate.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// In production (Docker), data lives in /app/data (volume-mounted).
// In dev, falls back to server/db/muneemji.sqlite for backwards compatibility.
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

// Apply pending migrations. Boot fails loudly if any applied migration's
// checksum has drifted (someone edited it in place — that's always a bug).
runMigrations(db, { quiet: process.env.MIGRATE_QUIET === '1' });

export default db;
export { DB_PATH };
