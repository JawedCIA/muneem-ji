import { Router } from 'express';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import db from '../db/db.js';
import { validate } from '../middleware/validate.js';
import { requireAuth, requireRole } from '../middleware/requireAuth.js';
import {
  hashPassword, verifyPassword, signToken, verifyToken,
  COOKIE_NAME, cookieOptions,
} from '../utils/auth.js';
import { audit, recordAudit } from '../utils/audit.js';
import { generateSecret, verifyTOTP, buildOtpAuthUri, generateBackupCodes } from '../utils/totp.js';

const router = Router();

function userCount() {
  return db.prepare('SELECT COUNT(*) as c FROM users').get().c;
}

function publicUser(u) {
  if (!u) return null;
  return { id: u.id, email: u.email, name: u.name, role: u.role, last_login_at: u.last_login_at };
}

router.get('/status', (req, res) => {
  res.json({ setupRequired: userCount() === 0 });
});

router.get('/me', requireAuth, (req, res) => {
  const u = db.prepare('SELECT id, email, name, role, last_login_at FROM users WHERE id = ?').get(req.user.id);
  if (!u) return res.status(401).json({ error: 'User no longer exists' });
  res.json(publicUser(u));
});

const setupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1),
  business: z.object({
    businessName: z.string().min(1),
    gstin: z.string().optional().or(z.literal('')),
    pan: z.string().optional().or(z.literal('')),
    phone: z.string().optional().or(z.literal('')),
    email: z.string().email().optional().or(z.literal('')),
    address: z.string().optional().or(z.literal('')),
    city: z.string().optional().or(z.literal('')),
    pincode: z.string().optional().or(z.literal('')),
    stateCode: z.string().optional().or(z.literal('')),
    stateName: z.string().optional().or(z.literal('')),
    gstEnabled: z.union([z.boolean(), z.string(), z.number()]).optional(),
    'feature.serials':    z.union([z.boolean(), z.string(), z.number()]).optional(),
    'feature.batches':    z.union([z.boolean(), z.string(), z.number()]).optional(),
    'feature.banking':    z.union([z.boolean(), z.string(), z.number()]).optional(),
    'feature.recurring':  z.union([z.boolean(), z.string(), z.number()]).optional(),
    'feature.pos':        z.union([z.boolean(), z.string(), z.number()]).optional(),
    'feature.quotations': z.union([z.boolean(), z.string(), z.number()]).optional(),
  }).optional(),
});

router.post('/setup', validate(setupSchema), (req, res) => {
  if (userCount() > 0) {
    return res.status(409).json({ error: 'Setup already completed. Use /auth/login.' });
  }
  const { email, password, name, business } = req.body;
  const id = nanoid();
  const tx = db.transaction(() => {
    db.prepare(`INSERT INTO users (id, email, password_hash, name, role)
                VALUES (?, ?, ?, ?, 'admin')`)
      .run(id, email.toLowerCase(), hashPassword(password), name);
    if (business) {
      const upsert = db.prepare(`INSERT INTO settings (key, value) VALUES (?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value`);
      for (const [k, v] of Object.entries(business)) {
        // gstEnabled and feature.* are toggles — normalize to '1'/'0'
        if (k === 'gstEnabled' || k.startsWith('feature.')) {
          upsert.run(k, v ? '1' : '0');
        } else {
          upsert.run(k, v == null ? null : String(v));
        }
      }
      upsert.run('setupCompletedAt', new Date().toISOString());
    }
  });
  tx();
  const user = db.prepare('SELECT id, email, name, role, last_login_at FROM users WHERE id = ?').get(id);
  const token = signToken(user);
  res.cookie(COOKIE_NAME, token, cookieOptions());
  // Set req.user so audit captures the actor
  req.user = { id: user.id, email: user.email, role: user.role, name: user.name };
  audit.create(req, 'user', publicUser(user), `Initial setup: admin ${user.email} created`);
  recordAudit({ req, action: 'login', entity: 'auth', summary: 'Initial admin setup + login' });
  res.status(201).json({ user: publicUser(user) });
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  totp: z.string().optional(),         // 6-digit code from authenticator app
  backupCode: z.string().optional(),   // OR a one-time backup code
});

function consumeBackupCode(user, supplied) {
  if (!supplied) return false;
  let codes;
  try { codes = JSON.parse(user.totp_backup_codes || '[]'); } catch { codes = []; }
  const upper = String(supplied).toUpperCase().replace(/[\s-]/g, '');
  const idx = codes.indexOf(upper);
  if (idx < 0) return false;
  codes.splice(idx, 1);
  db.prepare('UPDATE users SET totp_backup_codes = ? WHERE id = ?').run(JSON.stringify(codes), user.id);
  return true;
}

router.post('/login', validate(loginSchema), (req, res) => {
  const { email, password, totp, backupCode } = req.body;
  const u = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
  if (!u || !u.active || !verifyPassword(password, u.password_hash)) {
    recordAudit({
      req, action: 'login_failed', entity: 'auth',
      summary: `Failed login attempt for ${email}`,
      actor: { email, role: null },
    });
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  // Second factor required?
  if (u.totp_enabled) {
    if (!totp && !backupCode) {
      // Tell the client to prompt for the second factor without revealing more
      return res.status(401).json({ error: '2FA code required', requires2fa: true });
    }
    const ok = (totp && verifyTOTP(u.totp_secret, totp)) || consumeBackupCode(u, backupCode);
    if (!ok) {
      recordAudit({
        req, action: 'login_failed', entity: 'auth',
        summary: `Failed 2FA challenge for ${email}`,
        actor: { id: u.id, email: u.email, role: u.role },
      });
      return res.status(401).json({ error: 'Invalid 2FA code', requires2fa: true });
    }
  }

  db.prepare('UPDATE users SET last_login_at = datetime(\'now\') WHERE id = ?').run(u.id);
  const fresh = db.prepare('SELECT id, email, name, role, last_login_at FROM users WHERE id = ?').get(u.id);
  const token = signToken(fresh);
  res.cookie(COOKIE_NAME, token, cookieOptions());
  recordAudit({
    req, action: 'login', entity: 'auth', entityId: fresh.id,
    summary: `${fresh.email} signed in${u.totp_enabled ? ' (with 2FA)' : ''}`,
    actor: fresh,
  });
  res.json({ user: publicUser(fresh) });
});

router.post('/logout', (req, res) => {
  // requireAuth isn't applied here, so decode the cookie ourselves for the audit trail
  if (req.cookies?.[COOKIE_NAME]) {
    const payload = verifyToken(req.cookies[COOKIE_NAME]);
    if (payload) {
      recordAudit({
        req, action: 'logout', entity: 'auth', entityId: payload.sub,
        summary: `${payload.email} signed out`,
        actor: { id: payload.sub, email: payload.email, role: payload.role },
      });
    }
  }
  res.clearCookie(COOKIE_NAME, { path: '/' });
  res.json({ ok: true });
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

router.post('/change-password', requireAuth, validate(changePasswordSchema), (req, res) => {
  const u = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!u || !verifyPassword(req.body.currentPassword, u.password_hash)) {
    return res.status(400).json({ error: 'Current password is incorrect' });
  }
  db.prepare('UPDATE users SET password_hash = ?, updated_at = datetime(\'now\') WHERE id = ?')
    .run(hashPassword(req.body.newPassword), req.user.id);
  recordAudit({
    req, action: 'password_change', entity: 'user', entityId: req.user.id,
    summary: `${req.user.email} changed their password`,
  });
  res.json({ ok: true });
});

// --- 2FA (TOTP) ---

// Step 1: generate a fresh secret for the calling user. Doesn't persist enabled=1
// until step 2 verifies they can produce a valid code.
router.post('/2fa/setup', requireAuth, (req, res) => {
  const u = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!u) return res.status(404).json({ error: 'User not found' });
  if (u.totp_enabled) return res.status(409).json({ error: '2FA is already enabled. Disable it first to re-enroll.' });
  const secret = generateSecret();
  db.prepare('UPDATE users SET totp_secret = ?, totp_enabled = 0 WHERE id = ?').run(secret, u.id);
  const otpauth = buildOtpAuthUri({ secret, accountName: u.email, issuer: 'Muneem Ji' });
  res.json({ secret, otpauth });
});

const enableSchema = z.object({ code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code') });

// Step 2: verify the user can produce a valid code, then mark 2FA enabled and
// hand back fresh backup codes (this is the only time they're shown).
router.post('/2fa/enable', requireAuth, validate(enableSchema), (req, res) => {
  const u = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!u || !u.totp_secret) return res.status(400).json({ error: 'Run /2fa/setup first to generate a secret.' });
  if (!verifyTOTP(u.totp_secret, req.body.code)) {
    return res.status(400).json({ error: 'Code is invalid or expired. Make sure your phone clock is correct.' });
  }
  const codes = generateBackupCodes(8);
  db.prepare('UPDATE users SET totp_enabled = 1, totp_backup_codes = ? WHERE id = ?').run(JSON.stringify(codes), u.id);
  recordAudit({ req, action: 'totp_enable', entity: 'user', entityId: u.id, summary: `${u.email} enabled 2FA` });
  res.json({ ok: true, backupCodes: codes });
});

// Disable 2FA. Requires re-entry of either the current TOTP or a backup code,
// so a stolen session cookie alone can't disable the second factor.
const disableSchema = z.object({
  code: z.string().regex(/^\d{6}$/).optional(),
  backupCode: z.string().optional(),
});
router.post('/2fa/disable', requireAuth, validate(disableSchema), (req, res) => {
  const u = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!u) return res.status(404).json({ error: 'User not found' });
  if (!u.totp_enabled) return res.status(400).json({ error: '2FA is not enabled.' });
  const ok = (req.body.code && verifyTOTP(u.totp_secret, req.body.code)) || consumeBackupCode(u, req.body.backupCode);
  if (!ok) return res.status(400).json({ error: 'Invalid 2FA code or backup code.' });
  db.prepare('UPDATE users SET totp_secret = NULL, totp_enabled = 0, totp_backup_codes = NULL WHERE id = ?').run(u.id);
  recordAudit({ req, action: 'totp_disable', entity: 'user', entityId: u.id, summary: `${u.email} disabled 2FA` });
  res.json({ ok: true });
});

// Read-only: tells the client whether 2FA is on for the current user
router.get('/2fa/status', requireAuth, (req, res) => {
  const u = db.prepare('SELECT totp_enabled, totp_backup_codes FROM users WHERE id = ?').get(req.user.id);
  let backupCount = 0;
  try { backupCount = JSON.parse(u?.totp_backup_codes || '[]').length; } catch {}
  res.json({ enabled: !!u?.totp_enabled, backupCodesRemaining: backupCount });
});

// User management (admin only)
router.get('/users', requireAuth, requireRole('admin'), (req, res) => {
  const users = db.prepare('SELECT id, email, name, role, active, last_login_at, created_at FROM users ORDER BY created_at').all();
  res.json(users);
});

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  role: z.enum(['admin', 'cashier']).default('cashier'),
});

router.post('/users', requireAuth, requireRole('admin'), validate(createUserSchema), (req, res) => {
  const { email, password, name, role } = req.body;
  const id = nanoid();
  try {
    db.prepare(`INSERT INTO users (id, email, password_hash, name, role)
                VALUES (?, ?, ?, ?, ?)`)
      .run(id, email.toLowerCase(), hashPassword(password), name, role);
  } catch (e) {
    if (String(e.message).includes('UNIQUE')) {
      return res.status(409).json({ error: 'A user with this email already exists' });
    }
    throw e;
  }
  const u = db.prepare('SELECT id, email, name, role, active, last_login_at, created_at FROM users WHERE id = ?').get(id);
  audit.create(req, 'user', u, `Created ${role} ${u.email}`);
  res.status(201).json(u);
});

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.enum(['admin', 'cashier']).optional(),
  active: z.boolean().optional(),
  password: z.string().min(8).optional(),
});

router.put('/users/:id', requireAuth, requireRole('admin'), validate(updateUserSchema), (req, res) => {
  const { id } = req.params;
  const u = db.prepare('SELECT id, email, name, role, active FROM users WHERE id = ?').get(id);
  if (!u) return res.status(404).json({ error: 'User not found' });
  const updates = [];
  const values = [];
  if (req.body.name !== undefined) { updates.push('name = ?'); values.push(req.body.name); }
  if (req.body.role !== undefined) { updates.push('role = ?'); values.push(req.body.role); }
  if (req.body.active !== undefined) { updates.push('active = ?'); values.push(req.body.active ? 1 : 0); }
  if (req.body.password) { updates.push('password_hash = ?'); values.push(hashPassword(req.body.password)); }
  if (updates.length === 0) return res.json(u);
  updates.push('updated_at = datetime(\'now\')');
  values.push(id);
  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  const fresh = db.prepare('SELECT id, email, name, role, active, last_login_at, created_at FROM users WHERE id = ?').get(id);
  const changed = Object.keys(req.body).filter((k) => k !== 'password').join(', ') + (req.body.password ? ' (+ password reset)' : '');
  audit.update(req, 'user', u, fresh, `Updated ${fresh.email}: ${changed || 'password'}`);
  res.json(fresh);
});

router.delete('/users/:id', requireAuth, requireRole('admin'), (req, res) => {
  if (req.params.id === req.user.id) {
    return res.status(400).json({ error: 'You cannot delete your own account' });
  }
  // Prevent deleting the last admin
  const adminCount = db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'admin' AND active = 1").get().c;
  const target = db.prepare('SELECT id, email, name, role, active FROM users WHERE id = ?').get(req.params.id);
  if (target && target.role === 'admin' && target.active && adminCount <= 1) {
    return res.status(400).json({ error: 'Cannot delete the last active admin' });
  }
  if (!target) return res.status(404).json({ error: 'User not found' });
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  audit.delete(req, 'user', target, `Deleted user ${target.email}`);
  res.status(204).end();
});

export default router;
