// Indian numbering format: ₹1,23,456.00
export function formatINR(value, opts = {}) {
  const n = Number(value || 0);
  const showSymbol = opts.symbol !== false;
  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
  return showSymbol ? `₹${formatted}` : formatted;
}

export function formatINRCompact(value) {
  const n = Number(value || 0);
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n.toFixed(0)}`;
}

export function formatDate(d) {
  if (!d) return '—';
  const dt = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(dt)) return '—';
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateInput(d) {
  if (!d) return '';
  const dt = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(dt)) return '';
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayISO() {
  return formatDateInput(new Date());
}

export function addDays(d, n) {
  const dt = typeof d === 'string' ? new Date(d) : new Date(d);
  dt.setDate(dt.getDate() + n);
  return formatDateInput(dt);
}

export const STATUS_LABEL = {
  draft: 'Draft', sent: 'Sent', paid: 'Paid', partial: 'Partial', overdue: 'Overdue',
  cancelled: 'Cancelled', accepted: 'Accepted', rejected: 'Rejected', expired: 'Expired',
};

export const STATUS_COLORS = {
  draft:     'bg-slate-100 text-slate-600',
  sent:      'bg-blue-50 text-blue-700',
  paid:      'bg-emerald-50 text-emerald-700',
  partial:   'bg-amber-50 text-amber-700',
  overdue:   'bg-rose-50 text-rose-700',
  cancelled: 'bg-slate-100 text-slate-500 line-through',
  accepted:  'bg-emerald-50 text-emerald-700',
  rejected:  'bg-rose-50 text-rose-700',
  expired:   'bg-slate-100 text-slate-500',
};

export function downloadCSV(filename, rows) {
  if (!rows || !rows.length) return;
  const headers = Object.keys(rows[0]);
  const escape = (v) => {
    if (v == null) return '';
    const s = String(v).replace(/"/g, '""');
    return /[",\n]/.test(s) ? `"${s}"` : s;
  };
  const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => escape(r[h])).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
