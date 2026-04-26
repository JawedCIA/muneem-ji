// GST calculation rules — see BRIEF.md
const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

export function calcLine({ qty, rate, taxRate, interstate }) {
  const q = Number(qty) || 0;
  const r = Number(rate) || 0;
  const t = Number(taxRate) || 0;
  const taxableAmt = round2(q * r);
  let cgst = 0, sgst = 0, igst = 0;
  if (interstate) {
    igst = round2(taxableAmt * (t / 100));
  } else {
    cgst = round2(taxableAmt * (t / 200));
    sgst = round2(taxableAmt * (t / 200));
  }
  const taxAmt = round2(cgst + sgst + igst);
  const total = round2(taxableAmt + taxAmt);
  return { taxableAmt, cgst, sgst, igst, taxAmt, total };
}

export function calcInvoice({ items = [], discount = 0, interstate = false }) {
  let subtotal = 0, cgstTotal = 0, sgstTotal = 0, igstTotal = 0;
  const lines = items.map((it) => {
    const c = calcLine({ qty: it.qty, rate: it.rate, taxRate: it.tax_rate ?? it.taxRate, interstate });
    subtotal += c.taxableAmt;
    cgstTotal += c.cgst;
    sgstTotal += c.sgst;
    igstTotal += c.igst;
    return {
      ...it,
      taxable_amt: c.taxableAmt,
      tax_amt: c.taxAmt,
      total: c.total,
    };
  });
  const disc = Number(discount) || 0;
  const total = round2(subtotal + cgstTotal + sgstTotal + igstTotal - disc);
  return {
    items: lines,
    subtotal: round2(subtotal),
    cgst_total: round2(cgstTotal),
    sgst_total: round2(sgstTotal),
    igst_total: round2(igstTotal),
    discount: round2(disc),
    total,
  };
}

export function isInterstate(partyStateCode, businessStateCode) {
  if (!partyStateCode || !businessStateCode) return false;
  return String(partyStateCode).trim() !== String(businessStateCode).trim();
}

export const round = round2;
