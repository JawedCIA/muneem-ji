// Hourly job that auto-generates invoices from active recurring templates
// whose next_run_date <= today. Runs in-process (no external queue).

import db from '../db/db.js';
import { runTemplate } from '../routes/recurring.js';
import { todayISO } from './recurring.js';

let timer = null;

function tick() {
  try {
    const today = todayISO();
    const due = db.prepare(`SELECT id, name FROM recurring_invoices
      WHERE status = 'active' AND next_run_date <= ?
      ORDER BY next_run_date`).all(today);
    if (due.length === 0) return;
    console.log(`[recurring] ${due.length} template(s) due — running now`);
    for (const t of due) {
      try {
        const r = runTemplate(t.id, { req: null, manual: false });
        if (r.skipped) continue;
        console.log(`[recurring] Generated ${r.invoice.no} from "${t.name}"`);
      } catch (e) {
        console.error(`[recurring] Failed to run template ${t.id} "${t.name}":`, e.message);
      }
    }
  } catch (e) {
    console.error('[recurring] tick error:', e.message);
  }
}

export function startRecurringScheduler() {
  if (timer) return;
  // Run on boot (catches missed runs while server was down), then every hour.
  if (process.env.RECURRING_ON_START !== '0') tick();
  timer = setInterval(tick, 60 * 60 * 1000);
  console.log(`[recurring] Scheduler armed — checking hourly for due templates`);
}
