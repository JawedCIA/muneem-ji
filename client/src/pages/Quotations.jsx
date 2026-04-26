import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FileCheck2, Edit2, Trash2, Search, Eye, MessageCircle } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader.jsx';
import Button from '../components/ui/Button.jsx';
import Table from '../components/ui/Table.jsx';
import { StatusBadge } from '../components/ui/Badge.jsx';
import { SlideOver } from '../components/ui/Modal.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import { SkeletonTable } from '../components/ui/Skeleton.jsx';
import Confirm from '../components/ui/Confirm.jsx';
import InvoiceForm from '../components/invoice/InvoiceForm.jsx';
import WhatsAppShareDialog from '../components/invoice/WhatsAppShareDialog.jsx';
import Pagination from '../components/ui/Pagination.jsx';
import { api } from '../utils/api.js';
import { formatINR, formatDate } from '../utils/format.js';
import { toast } from '../store/toast.js';
import { useSettings } from '../store/settings.js';

const STATUSES = ['', 'draft', 'sent', 'accepted', 'rejected', 'expired'];
const PAGE_SIZE = 50;

export default function Quotations() {
  const navigate = useNavigate();
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ q: '', status: '' });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [delTarget, setDelTarget] = useState(null);
  const [shareTarget, setShareTarget] = useState(null);
  const settings = useSettings((s) => s.settings);

  const load = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams({ type: 'quotation', page: String(page), pageSize: String(PAGE_SIZE) });
    if (filters.status) qs.append('status', filters.status);
    if (filters.q) qs.append('q', filters.q);
    try {
      const r = await api.get(`/invoices?${qs}`);
      setList(r.rows); setTotal(r.total);
    } catch (e) { toast.error(e.message); }
    finally { setLoading(false); }
  }, [filters, page]);

  useEffect(() => { setPage(1); }, [filters]);
  useEffect(() => { load(); }, [load]);

  async function convert(quote) {
    try {
      const inv = await api.post(`/invoices/${quote.id}/convert`);
      toast.success(`Converted to ${inv.no}`);
      load();
      navigate(`/invoices/${inv.id}`);
    } catch (e) { toast.error(e.message); }
  }
  async function del() {
    try {
      await api.delete(`/invoices/${delTarget.id}`);
      toast.success('Quotation deleted');
      setDelTarget(null);
      load();
    } catch (e) { toast.error(e.message); }
  }

  const columns = [
    { key: 'no', label: 'Quote No.', render: (r) => <span className="font-mono font-semibold text-navy">{r.no}</span> },
    { key: 'date', label: 'Date', render: (r) => formatDate(r.date) },
    { key: 'expires', label: 'Expires', render: (r) => formatDate(r.due_date) },
    { key: 'party', label: 'Party', render: (r) => <span className="font-medium text-navy">{r.party_name || '—'}</span> },
    { key: 'amount', label: 'Amount', align: 'right', render: (r) => formatINR(r.total) },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'actions', label: '', align: 'right',
      render: (r) => (
        <div className="row-actions" onClick={(e) => e.stopPropagation()}>
          {r.status !== 'rejected' && r.status !== 'expired' && (
            <Button size="sm" variant="ghost" onClick={() => convert(r)} title="Convert to invoice">
              <FileCheck2 size={14} className="text-emerald-600" />
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => setShareTarget(r)} title="Share via WhatsApp"><MessageCircle size={14} className="text-emerald-500" /></Button>
          <Button size="sm" variant="ghost" onClick={() => setEditing(r)}><Edit2 size={14} /></Button>
          <Button size="sm" variant="ghost" onClick={() => setDelTarget(r)}><Trash2 size={14} className="text-rose-500" /></Button>
        </div>
      )
    },
  ];

  return (
    <div>
      <PageHeader
        title="Quotations"
        subtitle={`${total.toLocaleString()} ${total === 1 ? 'quote' : 'quotes'}`}
        actions={<Button onClick={() => setOpen(true)}><Plus size={16} /> New Quotation</Button>}
      />

      <div className="card mb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative md:col-span-2">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className="input pl-9" placeholder="Search by quote # or party" value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} />
          </div>
          <select className="input" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
            <option value="">All statuses</option>
            {STATUSES.filter(Boolean).map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
        </div>
      </div>

      {loading ? <SkeletonTable /> : list.length === 0 ? (
        <div className="card"><EmptyState
          title="No quotations yet"
          description="Quote bana ke customers ko bhejein. Approve hone par ek click mein invoice mein convert karein."
          action={<Button onClick={() => setOpen(true)}><Plus size={14} /> Create your first quotation</Button>}
        /></div>
      ) : (
        <>
          <Table columns={columns} rows={list} />
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} onChange={setPage} className="mt-4" />
        </>
      )}

      <SlideOver open={open || !!editing} onClose={() => { setOpen(false); setEditing(null); }} title={editing ? `Edit ${editing.no}` : 'New Quotation'} size="xl">
        <InvoiceForm
          type="quotation"
          initial={editing}
          onSaved={() => { setOpen(false); setEditing(null); load(); toast.success('Quotation saved'); }}
          onCancel={() => { setOpen(false); setEditing(null); }}
        />
      </SlideOver>

      <Confirm open={!!delTarget} onClose={() => setDelTarget(null)} onConfirm={del} title="Delete quotation?" description={`This will permanently delete ${delTarget?.no}.`} confirmText="Delete" danger />

      <WhatsAppShareDialog
        open={!!shareTarget}
        onClose={() => setShareTarget(null)}
        invoice={shareTarget}
        settings={settings}
      />
    </div>
  );
}
