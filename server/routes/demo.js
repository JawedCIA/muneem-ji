import { Router } from 'express';
import { requireRole } from '../middleware/requireAuth.js';
import { seedDemoData, clearDemoData, isDemoDataLoaded, countBusinessData } from '../db/seed.js';
import { recordAudit } from '../utils/audit.js';

const router = Router();

router.get('/status', (req, res) => {
  res.json({
    hasData: isDemoDataLoaded(),
    counts: countBusinessData(),
  });
});

router.post('/load', requireRole('admin'), (req, res) => {
  const keepSettings = req.body?.keepSettings !== false;
  try {
    const counts = seedDemoData({ keepSettings });
    const total = Object.values(counts).reduce((s, n) => s + (n || 0), 0);
    recordAudit({
      req, action: 'demo_load', entity: 'demo',
      after: { counts, keepSettings },
      summary: `Loaded demo data: ${total} record(s) (settings ${keepSettings ? 'kept' : 'reset'})`,
    });
    res.json({ ok: true, counts, keepSettings });
  } catch (e) {
    res.status(500).json({ error: `Failed to load demo data: ${e.message}` });
  }
});

router.post('/clear', requireRole('admin'), (req, res) => {
  const keepSettings = req.body?.keepSettings !== false;
  try {
    const before = countBusinessData();
    const result = clearDemoData({ keepSettings });
    recordAudit({
      req, action: 'demo_clear', entity: 'demo',
      before,
      after: { tables: result.cleared, keepSettings },
      summary: `Cleared all business data (${Object.values(before).reduce((s, n) => s + n, 0)} record(s) removed)`,
    });
    res.json({ ok: true, ...result, keepSettings });
  } catch (e) {
    res.status(500).json({ error: `Failed to clear data: ${e.message}` });
  }
});

export default router;
