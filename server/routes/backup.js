import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { z } from 'zod';
import { requireRole } from '../middleware/requireAuth.js';
import { exportAll, importAll } from '../utils/backup.js';
import { backupsDir, runBackupNow } from '../utils/backupScheduler.js';
import { recordAudit } from '../utils/audit.js';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/json' || file.originalname.endsWith('.json')) cb(null, true);
    else cb(new Error('Only .json backup files are allowed'));
  },
});

router.get('/export', (req, res) => {
  const data = exportAll();
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="muneemji-backup-${new Date().toISOString().slice(0, 10)}.json"`);
  res.send(JSON.stringify(data, null, 2));
});

router.post('/import', requireRole('admin'), upload.single('file'), (req, res) => {
  try {
    let payload;
    if (req.file) {
      payload = JSON.parse(req.file.buffer.toString('utf-8'));
    } else if (req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0) {
      payload = req.body;
    } else {
      return res.status(400).json({ error: 'No backup file provided' });
    }
    const mode = req.query.mode === 'merge' ? 'merge' : 'replace';
    const counts = importAll(payload, { mode });
    const total = Object.values(counts || {}).reduce((s, n) => s + (n || 0), 0);
    recordAudit({
      req, action: 'backup_import', entity: 'backup',
      after: { mode, counts },
      summary: `Restored ${total} record(s) from backup (mode: ${mode})`,
    });
    res.json({ ok: true, restored: counts });
  } catch (e) {
    res.status(400).json({ error: `Import failed: ${e.message}` });
  }
});

router.get('/list', requireRole('admin'), (req, res) => {
  if (!fs.existsSync(backupsDir())) return res.json([]);
  const files = fs.readdirSync(backupsDir())
    .filter((f) => f.endsWith('.json'))
    .map((f) => {
      const stat = fs.statSync(path.join(backupsDir(), f));
      return { name: f, size: stat.size, created: stat.mtime.toISOString() };
    })
    .sort((a, b) => b.created.localeCompare(a.created));
  res.json(files);
});

router.post('/run-now', requireRole('admin'), (req, res) => {
  try {
    const file = runBackupNow();
    res.json({ ok: true, file });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/download/:name', requireRole('admin'), (req, res) => {
  const name = path.basename(req.params.name); // prevent traversal
  if (!/^backup-[\w.-]+\.json$/.test(name)) return res.status(400).json({ error: 'Invalid backup name' });
  const file = path.join(backupsDir(), name);
  if (!fs.existsSync(file)) return res.status(404).json({ error: 'Backup not found' });
  res.download(file);
});

export default router;
