const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

export function calcLine({ qty, rate, taxRate, interstate }) {
  const taxableAmt = round2(Number(qty || 0) * Number(rate || 0));
  const t = Number(taxRate || 0);
  let cgst = 0, sgst = 0, igst = 0;
  if (interstate) {
    igst = round2(taxableAmt * (t / 100));
  } else {
    cgst = round2(taxableAmt * (t / 200));
    sgst = round2(taxableAmt * (t / 200));
  }
  const taxAmt = round2(cgst + sgst + igst);
  return { taxableAmt, cgst, sgst, igst, taxAmt, total: round2(taxableAmt + taxAmt) };
}

export function calcInvoice(items = [], discount = 0, interstate = false) {
  let subtotal = 0, cgst = 0, sgst = 0, igst = 0;
  const lines = items.map((it) => {
    const c = calcLine({ qty: it.qty, rate: it.rate, taxRate: it.tax_rate, interstate });
    subtotal += c.taxableAmt;
    cgst += c.cgst; sgst += c.sgst; igst += c.igst;
    return { ...it, taxable_amt: c.taxableAmt, tax_amt: c.taxAmt, total: c.total };
  });
  const disc = Number(discount || 0);
  return {
    items: lines,
    subtotal: round2(subtotal),
    cgst: round2(cgst),
    sgst: round2(sgst),
    igst: round2(igst),
    discount: round2(disc),
    total: round2(subtotal + cgst + sgst + igst - disc),
  };
}

export const TAX_RATES = [0, 5, 12, 18, 28];
export const UNITS = ['Nos', 'Pcs', 'Kg', 'Gm', 'Ltr', 'Mtr', 'Box', 'Set', 'Dozen'];
export const PAYMENT_MODES = ['cash', 'upi', 'card', 'netbanking', 'cheque', 'other'];
export const EXPENSE_CATEGORIES = [
  'Rent', 'Salaries', 'Utilities', 'Office Supplies', 'Travel',
  'Marketing', 'Software', 'Equipment', 'Professional Services', 'Other',
];

export const STATES = [
  ['01', 'Jammu & Kashmir'], ['02', 'Himachal Pradesh'], ['03', 'Punjab'],
  ['04', 'Chandigarh'], ['05', 'Uttarakhand'], ['06', 'Haryana'],
  ['07', 'Delhi'], ['08', 'Rajasthan'], ['09', 'Uttar Pradesh'],
  ['10', 'Bihar'], ['11', 'Sikkim'], ['12', 'Arunachal Pradesh'],
  ['13', 'Nagaland'], ['14', 'Manipur'], ['15', 'Mizoram'],
  ['16', 'Tripura'], ['17', 'Meghalaya'], ['18', 'Assam'],
  ['19', 'West Bengal'], ['20', 'Jharkhand'], ['21', 'Odisha'],
  ['22', 'Chhattisgarh'], ['23', 'Madhya Pradesh'], ['24', 'Gujarat'],
  ['27', 'Maharashtra'], ['29', 'Karnataka'], ['30', 'Goa'],
  ['32', 'Kerala'], ['33', 'Tamil Nadu'], ['34', 'Puducherry'],
  ['36', 'Telangana'], ['37', 'Andhra Pradesh'],
];
