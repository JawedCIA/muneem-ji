import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const SECRET_FILE = process.env.JWT_SECRET_FILE || path.join(process.cwd(), '.jwt-secret');

function loadOrCreateSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  try {
    if (fs.existsSync(SECRET_FILE)) {
      return fs.readFileSync(SECRET_FILE, 'utf-8').trim();
    }
  } catch {}
  const generated = crypto.randomBytes(64).toString('hex');
  try {
    fs.writeFileSync(SECRET_FILE, generated, { mode: 0o600 });
    console.log(`[auth] Generated new JWT secret at ${SECRET_FILE}`);
  } catch (e) {
    console.warn('[auth] Could not persist JWT secret — sessions will reset on restart:', e.message);
  }
  return generated;
}

export const JWT_SECRET = loadOrCreateSecret();
export const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

export function hashPassword(plain) {
  return bcrypt.hashSync(plain, 12);
}

export function verifyPassword(plain, hash) {
  return bcrypt.compareSync(plain, hash);
}

export function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: TOKEN_TTL_SECONDS }
  );
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

export const COOKIE_NAME = 'mj_session';

export function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production' && process.env.COOKIE_INSECURE !== '1',
    path: '/',
    maxAge: TOKEN_TTL_SECONDS * 1000,
  };
}
