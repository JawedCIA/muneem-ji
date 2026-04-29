import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, CalendarCheck, CalendarClock, CalendarX, Calendar, ExternalLink } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader.jsx';
import Table from '../components/ui/Table.jsx';
import { Input } from '../components/ui/Input.jsx';
import { api } from '../utils/api.js';
import { formatDate } from '../utils/format.js';
import { toast } from '../store/toast.js';

const STATUS_TABS = [
  { key: '', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'expiring', label: 'Expiring (≤30d)' },
  { key: 'expired', label: 'Expired' },
  { key: 'unknown', label: 'No expiry' },
];

const TYPE_TABS = [
  { key: '', label: 'All movements' },
  { key: 'sale', label: 'Sales' },
  { key: 'purchase', label: 'Purchases' },
];

function StatusBadge({ status, until }) {
  const map = {
    active:   { label: 'Active',         icon: CalendarCheck, cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    expiring: { label: 'Expiring soon',  icon: CalendarClock, cls: 'bg-amber-50 text-amber-700 border-amber-300' },
    expired:  { label: 'Expired',        icon: CalendarX,     cls: 'bg-rose-50 text-rose-700 border-rose-200' },
    unknown:  { label: 'No expiry',      icon: Calendar,      cls: 'bg-slate-50 text-slate-500 border-slate-200' },
  }[status] || { label: status, icon: Calendar, cls: 'bg-slate-50 text-slate-500 border-slate-200' };
  const Icon = map.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border ${map.cls}`}>
      <Icon size={11} />
      <span className="font-semibold">{map.label}</span>
      {until && status !== 'unknown' && <span className="ml-1 text-[10px] opacity-75">on {until}</span>}
    </span>
  );
}

export default function Batches() {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [stats, setStats] = useState(null);
  const [data, setData] = useState({ rows: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    api.get('/batches/stats').then(setStats).catch(() => {});
  }, [data]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (status) params.set('status', status);
    if (type) params.set('type', type);
    params.set('page', page);
    params.set('pageSize', '50');
    api.get(`/batches?${params}`)
      .then(setData)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [q, status, type, page]);

  const cols = useMemo(() => [
    { key: 'batch_no', label: 'Batch', render: (r) => <span className="font-mono text-xs font-bold text-navy">{r.batch_no}</span> },
    { key: 'product_name', label: 'Product' },
    { key: 'qty', label: 'Qty', render: (r) => `${r.qty} ${r.unit || ''}` },
    { key: 'mfg_date', label: 'Mfg', render: (r) => r.mfg_date ? formatDate(r.mfg_date) : <span className="text-slate-400">—</span> },
    { key: 'exp_date', label: 'Expiry', render: (r) => <StatusBadge status={r.status} until={r.exp_date ? formatDate(r.exp_date) : null} /> },
    { key: 'invoice_type', label: 'Type', render: (r) => (
        <span className={`text-[10px] uppercase font-bold tracking-wider ${r.invoice_type === 'purchase' ? 'text-emerald-700' : 'text-slate-500'}`}>
          {r.invoice_type === 'purchase' ? 'Purchase' : r.invoice_type === 'sale' ? 'Sale' : r.invoice_type}
        </span>
      ) },
    { key: 'invoice_no', label: 'Invoice', render: (r) => (
        <Link to={`/invoices/${r.invoice_id}`} className="font-mono text-xs text-amber-700 hover:underline inline-flex items-center gap-1">
          {r.invoice_no} <ExternalLink size={10} />
        </Link>
      ) },
  ], []);

  return (
    <div>
      <PageHeader
        title="Batches & Expiry"
        subtitle="Track batch numbers and shelf life across every invoice line — pharmacy, food, cosmetics"
      />

      {stats && stats.total === 0 && (
        <div className="card text-sm text-slate-500 mb-4">
          No batch-tracked items yet. Mark a product as "Has batch / expiry" under
          {' '}<Link to="/products" className="text-amber-700 hover:underline font-semibold">Products</Link>,
          then capture batch + expiry on the invoice line — it appears here automatically.
        </div>
      )}

      {stats && stats.total > 0 && (
        <div className="card mb-4 grid grid-cols-2 md:grid-cols-5 gap-3 text-center">
          <Stat label="Total tracked" value={stats.total} />
          <Stat label="Active" value={stats.active} cls="text-emerald-700" />
          <Stat label="Expiring (≤30d)" value={stats.expiring} cls="text-amber-700" />
          <Stat label="Expired" value={stats.expired} cls="text-rose-700" />
          <Stat label="No expiry" value={stats.unknown} cls="text-slate-500" />
        </div>
      )}

      <div className="card mb-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[260px]">
            <label className="label">Search</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                className="pl-9 font-mono"
                placeholder="Batch, product or invoice number"
                value={q}
                onChange={(e) => { setQ(e.target.value); setPage(1); }}
                autoFocus
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-1">
            {STATUS_TABS.map((t) => (
              <button
                key={t.key || 'all'}
                onClick={() => { setStatus(t.key); setPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold ${status === t.key ? 'bg-navy text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1">
            {TYPE_TABS.map((t) => (
              <button
                key={t.key || 'all-type'}
                onClick={() => { setType(t.key); setPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold ${type === t.key ? 'bg-amber text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading && <div className="card text-sm text-slate-400">Loading…</div>}
      {!loading && (
        <>
          <Table columns={cols} rows={data.rows || []} />
          {(data.total || 0) > 50 && (
            <div className="flex items-center justify-center gap-2 mt-4 text-xs">
              <button disabled={page === 1} onClick={() => setPage(page - 1)} className="px-3 py-1 rounded-lg bg-slate-100 disabled:opacity-50">Prev</button>
              <span className="text-slate-500">Page {page} of {Math.ceil(data.total / 50)}</span>
              <button disabled={page >= Math.ceil(data.total / 50)} onClick={() => setPage(page + 1)} className="px-3 py-1 rounded-lg bg-slate-100 disabled:opacity-50">Next</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Stat({ label, value, cls }) {
  return (
    <div>
      <div className="text-xs text-slate-500 font-semibold">{label}</div>
      <div className={`text-2xl font-extrabold mt-1 ${cls || 'text-navy'}`}>{value}</div>
    </div>
  );
}
