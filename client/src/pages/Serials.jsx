import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, ShieldCheck, ShieldAlert, ShieldX, Shield, ExternalLink } from 'lucide-react';
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
  { key: 'unknown', label: 'No warranty' },
];

function StatusBadge({ status, until }) {
  const map = {
    active:   { label: 'Active',         icon: ShieldCheck, cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    expiring: { label: 'Expiring soon',  icon: ShieldAlert, cls: 'bg-amber-50 text-amber-700 border-amber-300' },
    expired:  { label: 'Expired',        icon: ShieldX,     cls: 'bg-rose-50 text-rose-700 border-rose-200' },
    unknown:  { label: 'No warranty',    icon: Shield,      cls: 'bg-slate-50 text-slate-500 border-slate-200' },
  }[status] || { label: status, icon: Shield, cls: 'bg-slate-50 text-slate-500 border-slate-200' };
  const Icon = map.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border ${map.cls}`}>
      <Icon size={11} />
      <span className="font-semibold">{map.label}</span>
      {until && status !== 'unknown' && <span className="ml-1 text-[10px] opacity-75">till {until}</span>}
    </span>
  );
}

export default function Serials() {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [stats, setStats] = useState(null);
  const [data, setData] = useState({ rows: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    api.get('/serials/stats').then(setStats).catch(() => {});
  }, [data]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (status) params.set('status', status);
    params.set('page', page);
    params.set('pageSize', '50');
    api.get(`/serials?${params}`)
      .then(setData)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [q, status, page]);

  const cols = useMemo(() => [
    { key: 'serial', label: 'Serial / IMEI', render: (r) => <span className="font-mono text-xs font-bold text-navy">{r.serial}</span> },
    { key: 'product_name', label: 'Product' },
    { key: 'party_name', label: 'Sold to', render: (r) => r.party_name || <span className="text-slate-400">Walk-in</span> },
    { key: 'sold_date', label: 'Sold', render: (r) => formatDate(r.sold_date) },
    { key: 'warranty_until', label: 'Warranty', render: (r) => <StatusBadge status={r.status} until={r.warranty_until ? formatDate(r.warranty_until) : null} /> },
    { key: 'invoice_no', label: 'Invoice', render: (r) => (
        <Link to={`/invoices/${r.invoice_id}`} className="font-mono text-xs text-amber-700 hover:underline inline-flex items-center gap-1">
          {r.invoice_no} <ExternalLink size={10} />
        </Link>
      ) },
  ], []);

  return (
    <div>
      <PageHeader
        title="Serials & Warranty"
        subtitle="Search by serial / IMEI to find the original sale and warranty status"
      />

      {stats && stats.total === 0 && (
        <div className="card text-sm text-slate-500 mb-4">
          No serial-tracked items sold yet. Mark a product as "Has serial numbers" under
          {' '}<Link to="/products" className="text-amber-700 hover:underline font-semibold">Products</Link>,
          then sell it — the serial appears here automatically.
        </div>
      )}

      {stats && stats.total > 0 && (
        <div className="card mb-4 grid grid-cols-2 md:grid-cols-5 gap-3 text-center">
          <Stat label="Total tracked" value={stats.total} />
          <Stat label="Active" value={stats.active} cls="text-emerald-700" />
          <Stat label="Expiring (≤30d)" value={stats.expiring} cls="text-amber-700" />
          <Stat label="Expired" value={stats.expired} cls="text-rose-700" />
          <Stat label="No warranty" value={stats.unknown} cls="text-slate-500" />
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
                placeholder="Serial, product, customer or invoice number"
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
