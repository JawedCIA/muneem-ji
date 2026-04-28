// GSTR-1 / GSTR-3B return generators.
//
// Pure functions: take normalized inputs from the DB, return the structured
// return object. No DB access here — the route layer fetches and shapes the
// data before calling these.
//
// References (current as of 2025 GSTN spec):
//   * GSTR-1 sections covered: B2B, B2CL, B2CS, CDNR, CDNUR, HSN, DOCS
//   * Skipped (out of scope for SMB v1): EXP, AT, ATADJ, NIL, ECOM
//   * B2CL threshold: invoice value > ₹1,00,000 (interstate, party w/o GSTIN).
//     Configurable via the b2clThreshold setting; we read it in the route.

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[0-9A-Z]{1}Z[0-9A-Z]{1}$/;

export function isValidGstin(g) {
  if (!g) return false;
  return GSTIN_REGEX.test(String(g).trim().toUpperCase());
}

// Pad an Indian state code to two digits (DB sometimes stores '7' instead of '07').
function padState(code) {
  if (code === null || code === undefined || code === '') return '';
  const s = String(code).trim();
  return s.length === 1 ? `0${s}` : s;
}

// Group invoice items by GSTIN+invoice for B2B (one row per (invoice, rate) pair),
// and into rate buckets for B2CS / HSN.
function bucketByRate(items) {
  const buckets = new Map();
  for (const it of items) {
    const rate = Number(it.tax_rate || 0);
    const cur = buckets.get(rate) || { taxable: 0, cgst: 0, sgst: 0, igst: 0, qty: 0 };
    cur.taxable += Number(it.taxable_amt || 0);
    cur.cgst += Number(it.cgst || 0);
    cur.sgst += Number(it.sgst || 0);
    cur.igst += Number(it.igst || 0);
    cur.qty += Number(it.qty || 0);
    buckets.set(rate, cur);
  }
  return buckets;
}

// Re-derive per-line CGST/SGST/IGST from taxable_amt + tax_rate + interstate flag,
// because the DB stores `tax_amt` as a single number per line.
function explodeLine(line, interstate) {
  const taxable = Number(line.taxable_amt || 0);
  const rate = Number(line.tax_rate || 0);
  const taxFull = round2(taxable * (rate / 100));
  if (interstate) {
    return { ...line, taxable_amt: round2(taxable), cgst: 0, sgst: 0, igst: taxFull };
  }
  const half = round2(taxable * (rate / 200));
  // Mirror the per-line halving used in calcLine — keeps totals reconciled.
  return { ...line, taxable_amt: round2(taxable), cgst: half, sgst: half, igst: 0 };
}

// ───────────────────────── GSTR-1 ─────────────────────────

export function buildGstr1({ invoices, businessStateCode, b2clThreshold }) {
  const businessState = padState(businessStateCode);
  const threshold = Number(b2clThreshold) || 100000;

  const b2b = [];
  const b2cl = [];
  const b2csByKey = new Map(); // key: pos|rate → row
  const cdnr = [];
  const cdnur = [];
  const hsnByKey = new Map(); // key: hsn|rate|unit → row
  const warnings = [];

  // Document series tracking — group by alpha prefix
  const seriesByPrefix = new Map(); // prefix → { nums:[int], cancelled, total }

  const sortedInvoices = [...invoices].sort((a, b) =>
    String(a.no || '').localeCompare(String(b.no || ''))
  );

  for (const inv of sortedInvoices) {
    if (inv.type !== 'sale' && inv.type !== 'credit_note') continue;
    if (inv.status === 'draft' || inv.status === 'cancelled') {
      // cancelled still counted in DOCS series
      if (inv.status === 'cancelled') trackSeries(seriesByPrefix, inv, true);
      continue;
    }
    trackSeries(seriesByPrefix, inv, false);

    const party = inv.party || {};
    const partyGstin = (party.gstin || '').trim().toUpperCase();
    const partyState = padState(party.state_code);
    const interstate = inv.interstate ? true : (partyState && partyState !== businessState);
    const placeOfSupply = partyState || businessState; // POS for unidentified B2C = business state
    const items = (inv.items || []).map((it) => explodeLine(it, interstate));

    if (partyGstin && !isValidGstin(partyGstin)) {
      warnings.push({ invoice_no: inv.no, message: `Invalid GSTIN format: ${partyGstin} — treated as B2C` });
    }
    const gstinValid = partyGstin && isValidGstin(partyGstin);

    // Per-rate buckets for this invoice
    const buckets = bucketByRate(items);

    if (inv.type === 'sale') {
      if (gstinValid) {
        // B2B: one row per rate within the invoice
        for (const [rate, b] of buckets) {
          b2b.push({
            gstin: partyGstin,
            party_name: inv.party_name || party.name || '',
            invoice_no: inv.no,
            invoice_date: inv.date,
            invoice_value: round2(Number(inv.total || 0)),
            place_of_supply: placeOfSupply,
            reverse_charge: 'N',
            invoice_type: 'Regular',
            rate,
            taxable_value: round2(b.taxable),
            cgst: round2(b.cgst),
            sgst: round2(b.sgst),
            igst: round2(b.igst),
            cess: 0,
          });
        }
      } else if (interstate && Number(inv.total || 0) > threshold) {
        // B2CL: interstate B2C above threshold
        for (const [rate, b] of buckets) {
          b2cl.push({
            invoice_no: inv.no,
            invoice_date: inv.date,
            invoice_value: round2(Number(inv.total || 0)),
            place_of_supply: placeOfSupply,
            rate,
            taxable_value: round2(b.taxable),
            igst: round2(b.igst),
            cess: 0,
          });
        }
      } else {
        // B2CS: aggregated by (POS, rate, type=OE)
        for (const [rate, b] of buckets) {
          const key = `${placeOfSupply}|${rate}`;
          const cur = b2csByKey.get(key) || {
            type: 'OE',
            place_of_supply: placeOfSupply,
            rate,
            taxable_value: 0, cgst: 0, sgst: 0, igst: 0, cess: 0,
          };
          cur.taxable_value += b.taxable;
          cur.cgst += b.cgst;
          cur.sgst += b.sgst;
          cur.igst += b.igst;
          b2csByKey.set(key, cur);
        }
      }
    } else if (inv.type === 'credit_note') {
      const noteRow = {
        note_no: inv.no,
        note_date: inv.date,
        note_type: 'C', // C = Credit
        original_invoice_no: inv.original_invoice_no || '',
        original_invoice_date: inv.original_invoice_date || '',
        place_of_supply: placeOfSupply,
        reverse_charge: 'N',
        note_value: round2(Number(inv.total || 0)),
      };
      if (!noteRow.original_invoice_no) {
        warnings.push({ invoice_no: inv.no, message: 'Credit note missing original invoice reference — required for filing' });
      }
      for (const [rate, b] of buckets) {
        const row = {
          ...noteRow,
          rate,
          taxable_value: round2(b.taxable),
          cgst: round2(b.cgst),
          sgst: round2(b.sgst),
          igst: round2(b.igst),
          cess: 0,
        };
        if (gstinValid) {
          cdnr.push({ gstin: partyGstin, party_name: inv.party_name || party.name || '', ...row });
        } else {
          cdnur.push({ ut: interstate && Number(inv.total || 0) > threshold ? 'B2CL' : 'B2CS', ...row });
        }
      }
    }

    // HSN rollup — every outward supply line counts. Credit notes are netted (negative).
    const sign = inv.type === 'credit_note' ? -1 : 1;
    for (const it of items) {
      const hsn = (it.hsn_code || '').trim();
      const unit = (it.unit || 'NOS').toUpperCase();
      const rate = Number(it.tax_rate || 0);
      const key = `${hsn}|${rate}|${unit}`;
      const cur = hsnByKey.get(key) || {
        hsn, description: it.name || '', unit, rate,
        qty: 0, taxable_value: 0, igst: 0, cgst: 0, sgst: 0, cess: 0, total_value: 0,
      };
      cur.qty += sign * Number(it.qty || 0);
      cur.taxable_value += sign * Number(it.taxable_amt || 0);
      cur.cgst += sign * Number(it.cgst || 0);
      cur.sgst += sign * Number(it.sgst || 0);
      cur.igst += sign * Number(it.igst || 0);
      cur.total_value += sign * (Number(it.taxable_amt || 0) + Number(it.cgst || 0) + Number(it.sgst || 0) + Number(it.igst || 0));
      if (!hsn) cur._noHsn = true;
      hsnByKey.set(key, cur);
    }
  }

  for (const row of hsnByKey.values()) {
    if (row._noHsn) {
      warnings.push({ invoice_no: '', message: `Some line items have no HSN code (description "${row.description}") — required by GST rules` });
      delete row._noHsn;
    }
  }

  const b2cs = [...b2csByKey.values()].map(r => ({
    ...r,
    taxable_value: round2(r.taxable_value),
    cgst: round2(r.cgst), sgst: round2(r.sgst), igst: round2(r.igst), cess: round2(r.cess),
  }));

  const hsn = [...hsnByKey.values()].map(r => ({
    ...r,
    qty: round2(r.qty),
    taxable_value: round2(r.taxable_value),
    cgst: round2(r.cgst), sgst: round2(r.sgst), igst: round2(r.igst),
    total_value: round2(r.total_value),
  }));

  const docs = buildDocsSection(seriesByPrefix);

  return { b2b, b2cl, b2cs, cdnr, cdnur, hsn, docs, warnings };
}

function trackSeries(seriesByPrefix, inv, cancelled) {
  const m = String(inv.no || '').match(/^(.*?)(\d+)$/);
  if (!m) return;
  const prefix = m[1];
  const num = parseInt(m[2], 10);
  const docType = inv.type === 'credit_note' ? 5 : 1; // GSTN doc type codes
  const key = `${docType}|${prefix}`;
  const cur = seriesByPrefix.get(key) || { docType, prefix, nums: [], cancelled: 0 };
  cur.nums.push(num);
  if (cancelled) cur.cancelled += 1;
  seriesByPrefix.set(key, cur);
}

function buildDocsSection(seriesByPrefix) {
  const docTypeLabel = {
    1: 'Invoices for outward supply',
    5: 'Credit Note',
  };
  const out = [];
  for (const s of seriesByPrefix.values()) {
    if (s.nums.length === 0) continue;
    const min = Math.min(...s.nums);
    const max = Math.max(...s.nums);
    const total = s.nums.length;
    out.push({
      doc_type_code: s.docType,
      doc_type: docTypeLabel[s.docType] || `Type ${s.docType}`,
      sr_no: 1,
      from_no: `${s.prefix}${String(min).padStart(3, '0')}`,
      to_no: `${s.prefix}${String(max).padStart(3, '0')}`,
      total,
      cancelled: s.cancelled,
      net: total - s.cancelled,
    });
  }
  return out.sort((a, b) => a.doc_type_code - b.doc_type_code || a.from_no.localeCompare(b.from_no));
}

// ───────────────────────── GSTR-3B ─────────────────────────

// Small read-only summary the user types into the portal.
// 3.1.a Outward taxable (other than zero/nil/exempt)
// 3.1.c Outward nil/exempt (rate = 0)
// 3.2   Of 3.1, supplies to unregistered persons (B2C) — by state
// 4(A)(5) All other ITC — sum of CGST/SGST/IGST on purchase invoices
// 6.1   Tax payable = output - ITC
export function buildGstr3b({ outward, purchases, businessStateCode }) {
  const businessState = padState(businessStateCode);

  let taxable = 0, igst = 0, cgst = 0, sgst = 0, cess = 0;
  let nil = 0;
  const b2cByState = new Map(); // state → { taxable, igst }

  for (const inv of outward) {
    if (inv.type === 'draft' || inv.status === 'draft' || inv.status === 'cancelled') continue;
    const party = inv.party || {};
    const partyGstin = (party.gstin || '').trim().toUpperCase();
    const partyState = padState(party.state_code) || businessState;
    const interstate = inv.interstate ? true : (partyState && partyState !== businessState);
    const items = (inv.items || []).map((it) => explodeLine(it, interstate));
    const gstinValid = partyGstin && isValidGstin(partyGstin);
    const sign = inv.type === 'credit_note' ? -1 : 1;

    for (const it of items) {
      const rate = Number(it.tax_rate || 0);
      if (rate === 0) {
        nil += sign * Number(it.taxable_amt || 0);
      } else {
        taxable += sign * Number(it.taxable_amt || 0);
        igst += sign * Number(it.igst || 0);
        cgst += sign * Number(it.cgst || 0);
        sgst += sign * Number(it.sgst || 0);
      }
    }

    // 3.2 — supplies to unregistered (B2C) interstate, broken down by state
    if (!gstinValid && interstate) {
      const cur = b2cByState.get(partyState) || { taxable: 0, igst: 0 };
      for (const it of items) {
        const rate = Number(it.tax_rate || 0);
        if (rate === 0) continue;
        cur.taxable += sign * Number(it.taxable_amt || 0);
        cur.igst += sign * Number(it.igst || 0);
      }
      b2cByState.set(partyState, cur);
    }
  }

  // ITC from purchases (4(A)(5) "All other ITC")
  let itcCgst = 0, itcSgst = 0, itcIgst = 0;
  for (const inv of purchases) {
    if (inv.type !== 'purchase') continue;
    if (inv.status === 'draft' || inv.status === 'cancelled') continue;
    itcCgst += Number(inv.cgst_total || 0);
    itcSgst += Number(inv.sgst_total || 0);
    itcIgst += Number(inv.igst_total || 0);
  }

  return {
    s31a: {
      label: 'Outward taxable supplies (other than zero rated, nil rated and exempted)',
      taxable: round2(taxable),
      igst: round2(igst),
      cgst: round2(cgst),
      sgst: round2(sgst),
      cess: round2(cess),
    },
    s31c: {
      label: 'Other outward supplies (Nil rated, Exempted)',
      taxable: round2(nil),
    },
    s32: {
      label: 'Supplies made to unregistered persons (interstate, by place of supply)',
      rows: [...b2cByState.entries()].map(([state, v]) => ({
        place_of_supply: state,
        taxable: round2(v.taxable),
        igst: round2(v.igst),
      })),
    },
    s4: {
      label: 'Eligible ITC — All other ITC (4(A)(5))',
      cgst: round2(itcCgst),
      sgst: round2(itcSgst),
      igst: round2(itcIgst),
    },
    s61: {
      label: 'Tax payable (Output − ITC)',
      cgst: round2(cgst - itcCgst),
      sgst: round2(sgst - itcSgst),
      igst: round2(igst - itcIgst),
    },
  };
}

// ───────────────────────── CSV serialization ─────────────────────────
// Header rows track the GSTN offline-tool / Tally template. Tools that ingest
// these CSVs key off the header text, so do not change capitalization or order.

const SECTION_HEADERS = {
  b2b: ['GSTIN/UIN of Recipient','Receiver Name','Invoice Number','Invoice date','Invoice Value','Place Of Supply','Reverse Charge','Invoice Type','E-Commerce GSTIN','Rate','Taxable Value','Integrated Tax','Central Tax','State/UT Tax','Cess'],
  b2cl: ['Invoice Number','Invoice date','Invoice Value','Place Of Supply','Rate','Taxable Value','Integrated Tax','Cess','E-Commerce GSTIN'],
  b2cs: ['Type','Place Of Supply','Rate','Taxable Value','Integrated Tax','Central Tax','State/UT Tax','Cess','E-Commerce GSTIN'],
  cdnr: ['GSTIN/UIN of Recipient','Receiver Name','Note Number','Note date','Note Type','Place Of Supply','Reverse Charge','Note Supply Type','Note Value','Original Invoice Number','Original Invoice date','Rate','Taxable Value','Integrated Tax','Central Tax','State/UT Tax','Cess'],
  cdnur: ['UR Type','Note Number','Note date','Note Type','Place Of Supply','Note Value','Original Invoice Number','Original Invoice date','Rate','Taxable Value','Integrated Tax','Cess'],
  hsn: ['HSN','Description','UQC','Total Quantity','Total Value','Rate','Taxable Value','Integrated Tax Amount','Central Tax Amount','State/UT Tax Amount','Cess Amount'],
  docs: ['Nature of Document','Sr. No. From','Sr. No. To','Total Number','Cancelled','Net Issued'],
};

function csvEscape(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function row(arr) {
  return arr.map(csvEscape).join(',');
}

export function gstr1ToCsv(section, data) {
  const header = SECTION_HEADERS[section];
  if (!header) throw new Error(`Unknown GSTR-1 section: ${section}`);
  const lines = [row(header)];

  switch (section) {
    case 'b2b':
      for (const r of data) lines.push(row([
        r.gstin, r.party_name, r.invoice_no, r.invoice_date, r.invoice_value,
        r.place_of_supply, r.reverse_charge, r.invoice_type, '',
        r.rate, r.taxable_value, r.igst, r.cgst, r.sgst, r.cess,
      ]));
      break;
    case 'b2cl':
      for (const r of data) lines.push(row([
        r.invoice_no, r.invoice_date, r.invoice_value, r.place_of_supply,
        r.rate, r.taxable_value, r.igst, r.cess, '',
      ]));
      break;
    case 'b2cs':
      for (const r of data) lines.push(row([
        r.type, r.place_of_supply, r.rate, r.taxable_value,
        r.igst, r.cgst, r.sgst, r.cess, '',
      ]));
      break;
    case 'cdnr':
      for (const r of data) lines.push(row([
        r.gstin, r.party_name, r.note_no, r.note_date, r.note_type,
        r.place_of_supply, r.reverse_charge, 'Regular', r.note_value,
        r.original_invoice_no, r.original_invoice_date,
        r.rate, r.taxable_value, r.igst, r.cgst, r.sgst, r.cess,
      ]));
      break;
    case 'cdnur':
      for (const r of data) lines.push(row([
        r.ut, r.note_no, r.note_date, r.note_type, r.place_of_supply, r.note_value,
        r.original_invoice_no, r.original_invoice_date,
        r.rate, r.taxable_value, r.igst, r.cess,
      ]));
      break;
    case 'hsn':
      for (const r of data) lines.push(row([
        r.hsn, r.description, r.unit, r.qty, r.total_value,
        r.rate, r.taxable_value, r.igst, r.cgst, r.sgst, r.cess,
      ]));
      break;
    case 'docs':
      for (const r of data) lines.push(row([
        r.doc_type, r.from_no, r.to_no, r.total, r.cancelled, r.net,
      ]));
      break;
  }
  return lines.join('\r\n') + '\r\n';
}
