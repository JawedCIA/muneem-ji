// Minimal RFC-4180 CSV parser. Handles quoted fields, embedded commas, and
// escaped quotes. No external dependency.

export function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  const s = text.replace(/^﻿/, ''); // strip BOM
  while (i < s.length) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      field += c; i++; continue;
    }
    if (c === '"') { inQuotes = true; i++; continue; }
    if (c === ',') { row.push(field); field = ''; i++; continue; }
    if (c === '\r') { i++; continue; }
    if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue; }
    field += c; i++;
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((cell) => cell !== ''));
}

/**
 * Parse a bank-statement CSV. We accept any reasonable column layout — the user
 * tells us which columns are which after upload. For v1 we auto-detect the
 * common Indian-bank exports: Date, Description, Reference, Debit, Credit, Balance.
 *
 * Returns { headers: string[], rows: object[] } where each row is keyed by header.
 */
export function parseBankCSV(text) {
  const cells = parseCSV(text);
  if (cells.length < 2) throw new Error('CSV is empty or has no data rows');
  const headers = cells[0].map((h) => h.trim());
  const rows = cells.slice(1).map((r) => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = r[i] != null ? String(r[i]).trim() : ''; });
    return obj;
  });
  return { headers, rows };
}

const DATE_FIELDS  = ['date', 'transaction date', 'txn date', 'value date', 'posting date'];
const DESC_FIELDS  = ['description', 'narration', 'particulars', 'details', 'transaction details'];
const REF_FIELDS   = ['reference', 'ref', 'cheque', 'cheque no', 'utr', 'transaction ref', 'ref no'];
const DEBIT_FIELDS = ['debit', 'withdrawal', 'withdrawal amt', 'dr', 'debit amount', 'paid out'];
const CREDIT_FIELDS= ['credit', 'deposit', 'deposit amt', 'cr', 'credit amount', 'paid in'];
const BAL_FIELDS   = ['balance', 'closing balance', 'running balance'];

function findCol(headers, candidates) {
  const lower = headers.map((h) => h.toLowerCase().trim());
  for (const cand of candidates) {
    const idx = lower.indexOf(cand);
    if (idx >= 0) return headers[idx];
  }
  return null;
}

export function detectBankColumns(headers) {
  return {
    date:        findCol(headers, DATE_FIELDS),
    description: findCol(headers, DESC_FIELDS),
    reference:   findCol(headers, REF_FIELDS),
    debit:       findCol(headers, DEBIT_FIELDS),
    credit:      findCol(headers, CREDIT_FIELDS),
    balance:     findCol(headers, BAL_FIELDS),
  };
}

const NUM_RE = /^-?[\d,]+(\.\d+)?$/;
function num(v) {
  if (v == null || v === '') return 0;
  const cleaned = String(v).replace(/,/g, '').replace(/[^\d.\-]/g, '');
  if (!cleaned || !NUM_RE.test(cleaned.replace(/-/, ''))) return 0;
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

/** YYYY-MM-DD given a varied bank-date string (DD/MM/YYYY, DD-MM-YYYY, etc.) */
export function normalizeBankDate(s) {
  if (!s) return null;
  const trimmed = s.trim();
  // Already ISO?
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10);
  const m = trimmed.match(/^(\d{1,2})[\/\-\s.](\d{1,2})[\/\-\s.](\d{2,4})/);
  if (!m) return null;
  let [_, dd, mm, yyyy] = m;
  if (yyyy.length === 2) yyyy = '20' + yyyy;
  return `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
}

export function normalizeStatementRows(rows, mapping) {
  const out = [];
  for (const row of rows) {
    const date = normalizeBankDate(row[mapping.date]);
    if (!date) continue; // skip rows without a parseable date (totals, blank lines)
    const debit = mapping.debit ? num(row[mapping.debit]) : 0;
    const credit = mapping.credit ? num(row[mapping.credit]) : 0;
    if (debit === 0 && credit === 0) continue; // skip zero rows
    out.push({
      date,
      description: mapping.description ? (row[mapping.description] || '').trim() : '',
      reference:   mapping.reference   ? (row[mapping.reference] || '').trim()   : '',
      debit,
      credit,
      balance:     mapping.balance     ? num(row[mapping.balance]) : null,
      raw:         row,
    });
  }
  return out;
}
