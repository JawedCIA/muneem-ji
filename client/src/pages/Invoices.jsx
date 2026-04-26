import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Search, Download, Filter } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader.jsx';
import Button from '../components/ui/Button.jsx';
import Table from '../components/ui/Table.jsx';
import { StatusBadge } from '../components/ui/Badge.jsx';
import { SlideOver } from '../components/ui/Modal.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import { SkeletonTable } from '../components/ui/Skeleton.jsx';
import InvoiceForm from '../components/invoice/InvoiceForm.jsx';
import Pagination from '../components/ui/Pagination.jsx';
import { api } from '../utils/api.js';
import { formatINR, formatDate, downloadCSV } from '../utils/format.js';
import { toast } from '../store/toast.js';

const STATUSES = ['', 'draft', 'sent', 'paid', 'partial', 'overdue', 'cancelled'];
const PAGE_SIZE = 50;

export default function Invoices() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [parties, setParties] = useState([]);
  const [filters, setFilters] = useState({ q: '', status: '', party: '', from: '', to: '' });
  const [open, setOpen] = useState(params.get('new') === '1');

  const load = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams({ type: 'sale', page: String(page), pageSize: String(PAGE_SIZE) });
    Object.entries(filters).forEach(([k, v]) => v && qs.append(k, v));
    try {
      const data = await api.get(`/invoices?${qs}`);
      setInvoices(data.rows); setTotal(data.total);
    } catch (e) { toast.error(e.message); }
    finally { setLoading(false); }
  }, [filters, page]);

  useEffect(() => { setPage(1); }, [filters]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { api.get('/parties?type=customer&all=1').then(setParties); }, []);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener('mj:new-invoice', handler);
    return () => window.removeEventListener('mj:new-invoice', handler);
  }, []);

  async function exportCSV() {
    // Export ALL matching rows, not just the current page
    const qs = new URLSearchParams({ type: 'sale', all: '1' });
    Object.entries(filters).forEach(([k, v]) => v && qs.append(k, v));
    try {
      const all = await api.get(`/invoices?${qs}`);
      const rows = all.map((i) => ({
        'Invoice No': i.no, Date: i.date, Party: i.party_name, Subtotal: i.subtotal,
        CGST: i.cgst_total, SGST: i.sgst_total, IGST: i.igst_total, Total: i.total,
        'Amount Paid': i.amount_paid, Status: i.status,
      }));
      if (!rows.length) return toast.warning('Nothing to export');
      downloadCSV(`invoices-${Date.now()}.csv`, rows);
    } catch (e) { toast.error(e.message); }
  }

  const columns = [
    { key: 'no', label: 'Invoice No', render: (r) => <span className="font-mono font-semibold text-navy">{r.no}</span> },
    { key: 'date', label: 'Date', render: (r) => formatDate(r.date) },
    { key: 'party', label: 'Party', render: (r) => <span className="font-medium text-navy">{r.party_name || '—'}</span> },
    { key: 'amount', label: 'Amount', align: 'right', render: (r) => formatINR(r.total) },
    { key: 'gst', label: 'GST', align: 'right', render: (r) => formatINR(r.cgst_total + r.sgst_total + r.igst_total) },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <div>
      <PageHeader
        title="Invoices"
        subtitle={`${total.toLocaleString()} ${total === 1 ? 'invoice' : 'invoices'}`}
        actions={
          <>
            <Button variant="secondary" onClick={exportCSV}><Download size={14} /> Export CSV</Button>
            <Button onClick={() => setOpen(true)}><Plus size={16} /> New Invoice <span className="ml-1 text-[10px] opacity-70 font-mono">N</span></Button>
          </>
        }
      />

      <div className="card mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative sm:col-span-2 lg:col-span-2">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className="input pl-9" placeholder="Search by invoice # or party" value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} />
          </div>
          <select className="input" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
            <option value="">All statuses</option>
            {STATUSES.filter(Boolean).map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
          <select className="input" value={filters.party} onChange={(e) => setFilters({ ...filters, party: e.target.value })}>
            <option value="">All parties</option>
            {parties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-2 sm:col-span-2 lg:col-span-1">
            <input type="date" className="input min-w-0" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
            <input type="date" className="input min-w-0" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
          </div>
        </div>
      </div>

      {loading ? <SkeletonTable /> : invoices.length === 0 ? (
        <div className="card"><EmptyState
          title="No invoices yet"
          description="Pehla invoice banakar shuruwat karein. Apne customers ko send karein, status track karein."
          action={<Button onClick={() => setOpen(true)}><Plus size={14} /> Create your first invoice</Button>}
        /></div>
      ) : (
        <>
          <Table columns={columns} rows={invoices} onRowClick={(r) => navigate(`/invoices/${r.id}`)} />
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} onChange={setPage} className="mt-4" />
        </>
      )}

      <SlideOver open={open} onClose={() => { setOpen(false); if (params.get('new')) { params.delete('new'); setParams(params); } }} title="Create Invoice" size="xl">
        <InvoiceForm
          type="sale"
          onSaved={(saved) => { setOpen(false); load(); toast.success(`Invoice ${saved.no} saved`); navigate(`/invoices/${saved.id}`); }}
          onCancel={() => setOpen(false)}
        />
      </SlideOver>
    </div>
  );
}
