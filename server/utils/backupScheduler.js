import fs from 'node:fs';
import path from 'node:path';
import { exportAll } from './backup.js';

const RETENTION_DAYS = parseInt(process.env.BACKUP_RETENTION_DAYS || '7', 10);
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(process.cwd(), 'data', 'backups');

export function backupsDir() {
  return BACKUP_DIR;
}

export function runBackupNow() {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const file = path.join(BACKUP_DIR, `backup-${stamp}.json`);
  const data = exportAll();
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
  pruneOld();
  return file;
}

function pruneOld() {
  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  for (const name of fs.readdirSync(BACKUP_DIR)) {
    if (!name.endsWith('.json')) continue;
    const full = path.join(BACKUP_DIR, name);
    const stat = fs.statSync(full);
    if (stat.mtimeMs < cutoff) {
      try { fs.unlinkSync(full); } catch {}
    }
  }
}

let timer = null;

export function startBackupScheduler() {
  if (timer) return;
  // Check every hour, run once a day at the configured hour (default 02:00 local)
  const targetHour = parseInt(process.env.BACKUP_HOUR || '2', 10);
  let lastRunDay = null;
  const tick = () => {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    if (now.getHours() === targetHour && lastRunDay !== today) {
      try {
        const file = runBackupNow();
        console.log(`[backup] Auto-backup written: ${file}`);
        lastRunDay = today;
      } catch (e) {
        console.error('[backup] Auto-backup failed:', e.message);
      }
    }
  };
  // First run on boot if no backup exists today
  try {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    const today = new Date().toISOString().slice(0, 10);
    const hasToday = fs.readdirSync(BACKUP_DIR).some((f) => f.includes(today));
    if (!hasToday && process.env.BACKUP_ON_START !== '0') {
      runBackupNow();
      console.log(`[backup] Startup backup written to ${BACKUP_DIR}`);
      lastRunDay = today;
    }
  } catch (e) {
    console.warn('[backup] Could not initialise backup dir:', e.message);
  }
  timer = setInterval(tick, 60 * 60 * 1000); // hourly
  console.log(`[backup] Scheduler armed — daily backups at ${targetHour}:00, retain ${RETENTION_DAYS} days, dir: ${BACKUP_DIR}`);
}
