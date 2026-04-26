import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import db from '../db/db.js';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { requireRole } from '../middleware/requireAuth.js';
import { audit, recordAudit } from '../utils/audit.js';

const router = Router();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.resolve(__dirname, '..', 'uploads');
const BRANDING_DIR = path.join(UPLOADS_DIR, 'branding');
fs.mkdirSync(BRANDING_DIR, { recursive: true });

const ALLOWED_LOGO_MIME = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']);
const EXT_BY_MIME = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/svg+xml': 'svg' };

const logoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
  fileFilter: (req, file, cb) => {
    if (ALLOWED_LOGO_MIME.has(file.mimetype)) cb(null, true);
    else cb(new Error('Logo must be PNG, JPG, WebP, or SVG (max 2 MB)'));
  },
});

function setSetting(key, value) {
  db.prepare(`INSERT INTO settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value`)
    .run(key, value == null ? null : String(value));
}

function getAllSettings() {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const obj = {};
  rows.forEach((r) => { obj[r.key] = r.value; });
  return obj;
}

router.get('/', (req, res) => {
  res.json(getAllSettings());
});

const settingsSchema = z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()]));

router.put('/', validate(settingsSchema), (req, res) => {
  const before = getAllSettings();
  const tx = db.transaction((entries) => {
    for (const [k, v] of entries) setSetting(k, v);
  });
  tx(Object.entries(req.body));
  const after = getAllSettings();
  // Build a small diff: only the keys that actually changed
  const changedKeys = Object.keys(req.body).filter((k) => String(before[k] ?? '') !== String(after[k] ?? ''));
  audit.update(req, 'settings',
    Object.fromEntries(changedKeys.map((k) => [k, before[k] ?? null])),
    Object.fromEntries(changedKeys.map((k) => [k, after[k] ?? null])),
    `Updated ${changedKeys.length} setting(s): ${changedKeys.slice(0, 5).join(', ')}${changedKeys.length > 5 ? '…' : ''}`,
  );
  res.json(after);
});

function handleLogoUpload(req, res, next) {
  logoUpload.single('file')(req, res, (err) => {
    if (err) {
      const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
      return res.status(status).json({ error: err.message || 'Upload failed' });
    }
    next();
  });
}

router.post('/logo', requireRole('admin'), handleLogoUpload, (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const ext = EXT_BY_MIME[req.file.mimetype];
  if (!ext) return res.status(400).json({ error: 'Unsupported logo format' });

  // Remove any previous logo files (we always store as logo.<ext>)
  for (const e of Object.values(EXT_BY_MIME)) {
    const f = path.join(BRANDING_DIR, `logo.${e}`);
    try { if (fs.existsSync(f)) fs.unlinkSync(f); } catch {}
  }

  const targetName = `logo.${ext}`;
  const targetPath = path.join(BRANDING_DIR, targetName);
  fs.writeFileSync(targetPath, req.file.buffer);

  // Cache-bust version param so browsers refresh immediately
  const v = Date.now();
  const url = `/uploads/branding/${targetName}?v=${v}`;
  setSetting('logoUrl', url);
  setSetting('logoUpdatedAt', new Date().toISOString());

  recordAudit({
    req, action: 'logo_upload', entity: 'settings',
    after: { logoUrl: url, mimeType: req.file.mimetype, size: req.file.size },
    summary: `Uploaded logo (${req.file.mimetype}, ${(req.file.size / 1024).toFixed(1)} KB)`,
  });
  res.json({ ok: true, logoUrl: url, settings: getAllSettings() });
});

router.delete('/logo', requireRole('admin'), (req, res) => {
  for (const e of Object.values(EXT_BY_MIME)) {
    const f = path.join(BRANDING_DIR, `logo.${e}`);
    try { if (fs.existsSync(f)) fs.unlinkSync(f); } catch {}
  }
  setSetting('logoUrl', null);
  setSetting('logoUpdatedAt', null);
  recordAudit({ req, action: 'logo_remove', entity: 'settings', summary: 'Removed business logo' });
  res.json({ ok: true, settings: getAllSettings() });
});

export default router;
