import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import authRoutes from './routes/auth.js';
import settingsRoutes from './routes/settings.js';
import partiesRoutes from './routes/parties.js';
import productsRoutes from './routes/products.js';
import invoicesRoutes from './routes/invoices.js';
import paymentsRoutes from './routes/payments.js';
import expensesRoutes from './routes/expenses.js';
import reportsRoutes from './routes/reports.js';
import backupRoutes from './routes/backup.js';
import demoRoutes from './routes/demo.js';
import auditRoutes from './routes/audit.js';
import recurringRoutes from './routes/recurring.js';
import bankRoutes from './routes/bank.js';
import publicRoutes from './routes/public.js';
import serialsRoutes from './routes/serials.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { requireAuth } from './middleware/requireAuth.js';
import { startBackupScheduler } from './utils/backupScheduler.js';
import { startRecurringScheduler } from './utils/recurringScheduler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;
const isProd = process.env.NODE_ENV === 'production';
const CLIENT_DIST = process.env.CLIENT_DIST || path.resolve(__dirname, '..', 'client', 'dist');

const app = express();

app.set('trust proxy', 1);

app.use(helmet({
  contentSecurityPolicy: false, // React inline styles + Tailwind compatibility
  crossOriginEmbedderPolicy: false,
}));

const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:5174')
  .split(',').map((s) => s.trim()).filter(Boolean);
app.use(cors({ origin: corsOrigins, credentials: true }));

app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(morgan(isProd ? 'combined' : 'dev'));

const uploadsDir = process.env.UPLOADS_DIR || path.join(__dirname, 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', requireAuth, express.static(uploadsDir));

app.get('/api/health', (req, res) => res.json({ ok: true, name: 'Muneem Ji API', version: '1.0.0' }));

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth/setup', rateLimit({ windowMs: 60 * 60 * 1000, max: 5 }));

app.use('/api/auth', authRoutes);

// Public share-link lookups — no auth required, rate-limited inside the router.
app.use('/api/public', publicRoutes);

// All routes below require authentication
app.use('/api/settings', requireAuth, settingsRoutes);
app.use('/api/parties', requireAuth, partiesRoutes);
app.use('/api/products', requireAuth, productsRoutes);
app.use('/api/invoices', requireAuth, invoicesRoutes);
app.use('/api/payments', requireAuth, paymentsRoutes);
app.use('/api/expenses', requireAuth, expensesRoutes);
app.use('/api/reports', requireAuth, reportsRoutes);
app.use('/api/backup', requireAuth, backupRoutes);
app.use('/api/demo', requireAuth, demoRoutes);
app.use('/api/audit', requireAuth, auditRoutes);
app.use('/api/recurring', requireAuth, recurringRoutes);
app.use('/api/bank', requireAuth, bankRoutes);
app.use('/api/serials', requireAuth, serialsRoutes);

app.use('/api', notFound);

// In production, serve the built React app
if (isProd && fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
    res.sendFile(path.join(CLIENT_DIST, 'index.html'));
  });
  console.log(`[server] Serving client from ${CLIENT_DIST}`);
} else if (isProd) {
  console.warn(`[server] NODE_ENV=production but ${CLIENT_DIST} does not exist — API only.`);
}

app.use(errorHandler);

const server = app.listen(PORT, () => {
  console.log(`\n  Muneem Ji ${isProd ? 'production' : 'API'} server ready on http://localhost:${PORT}\n`);
  startBackupScheduler();
  startRecurringScheduler();
});

function shutdown(signal) {
  console.log(`\n[server] ${signal} received — shutting down gracefully…`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
