// Pure helpers for recurring invoices.

import { calcInvoice, isInterstate } from './gstCalc.js';

export function advanceDate(iso, cadence, n = 1) {
  const d = new Date(iso + 'T00:00:00Z');
  if (cadence === 'weekly')    d.setUTCDate(d.getUTCDate() + 7 * n);
  if (cadence === 'monthly')   d.setUTCMonth(d.getUTCMonth() + n);
  if (cadence === 'quarterly') d.setUTCMonth(d.getUTCMonth() + 3 * n);
  if (cadence === 'yearly')    d.setUTCFullYear(d.getUTCFullYear() + n);
  return d.toISOString().slice(0, 10);
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function shouldEnd(nextRun, endDate) {
  return endDate && nextRun > endDate;
}
