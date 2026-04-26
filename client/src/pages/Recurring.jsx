import { useEffect, useState, useCallback } from 'react';
import { Plus, Play, Pause, Trash2, Edit2, RefreshCw, Repeat } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader.jsx';
import Button from '../components/ui/Button.jsx';
import Table from '../components/ui/Table.jsx';
import Badge, { StatusBadge } from '../components/ui/Badge.jsx';
import { SlideOver } from '../components/ui/Modal.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import { SkeletonTable } from '../components/ui/Skeleton.jsx';
import Confirm from '../components/ui/Confirm.jsx';
import Pagination from '../components/ui/Pagination.jsx';
import RecurringForm from '../components/invoice/RecurringForm.jsx';
import { api } from '../utils/api.js';
import { formatINR, formatDate, todayISO } from '../utils/format.js';
import { toast } from '../store/toast.js';

const PAGE_SIZE = 50;
const CADENCE_LABEL = { weekly: 'Weekly', monthly: 'Monthly', quarterly: 'Quarterly', yearly: 'Yearly' };

export default function Recurring() {
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', q: '' });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [delTarget, setDelTarget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (filters.status) qs.append('status', filters.status);
    if (filters.q) qs.append('q', filters.q);
    try {
      const r = await api.get(`/recurring?${qs}`);
      setList(r.rows); setTotal(r.total);
    } catch (e) { toast.error(e.message); }
    finally { setLoading(false); }
  }, [filters, page]);

  useEffect(() => { setPage(1); }, [filters]);
  useEffect(() => { load(); }, [load]);

  async function pause(t) {
    try { await api.post(`/recurring/${t.id}/pause`); toast.success(`Paused "${t.name}"`); load(); }
    catch (e) { toast.error(e.message); }
  }
  async function resume(t) {
    try { await api.post(`/recurring/${t.id}/resume`); toast.success(`Resumed "${t.name}"`); load(); }
    catch (e) { toast.error(e.message); }
  }
  async function runNow(t) {
    try {
      const r = await api.post(`/recurring/${t.id}/run`);
      toast.success(`Generated invoice ${r.invoice.no}`);
      load();
    } catch (e) { toast.error(e.message); }
  }
  async function del() {
    try { await api.delete(`/recurring/${delTarget.id}`); toast.success('Recurring template deleted'); setDelTarget(null); load(); }
    catch (e) { toast.error(e.message); }
  }

  const today = todayISO();
  const columns = [
    { key: 'name', label: 'Template', render: (r) => (
      <div>
        <div className="font-bold text-navy">{r.name}</div>
        <div className="text-xs text-slate-500">{r.party_name || 'Walk-in customer'}</div>
      </div>
    )},
    { key: 'cadence', label: 'Cadence', render: (r) => (
      <span className="text-sm capitalize">
        {r.cadence_n > 1 ? `Every ${r.cadence_n} ${r.cadence === 'weekly' ? 'weeks' : r.cadence === 'monthly' ? 'months' : r.cadence === 'quarterly' ? 'quarters' : 'years'}` : CADENCE_LABEL[r.cadence]}
      </span>
    )},
    { key: 'next', label: 'Next run', render: (r) => {
      if (r.status !== 'active') return <span className="text-slate-400">—</span>;
      const overdue = r.next_run_date <= today;
      return <span className={overdue ? 'font-bold text-amber-700' : ''}>{formatDate(r.next_run_date)}{overdue && ' (due)'}</span>;
    }},
    { key: 'last', label: 'Last run', render: (r) => r.last_run_at ? new Date(r.last_run_at.replace(' ', 'T') + 'Z').toLocaleDateString() : <span className="text-slate-400">never</span> },
    { key: 'runs', label: 'Generated', render: (r) => `${r.run_count} invoice${r.run_count === 1 ? '' : 's'}` },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'actions', label: '', align: 'right', render: (r) => (
      <div className="row-actions" onClick={(e) => e.stopPropagation()}>
        {r.status === 'active' && <Button size="sm" variant="ghost" onClick={() => runNow(r)} title="Run now"><RefreshCw size={14} /></Button>}
        {r.status === 'active' && <Button size="sm" variant="ghost" onClick={() => pause(r)} title="Pause"><Pause size={14} /></Button>}
        {r.status === 'paused' && <Button size="sm" variant="ghost" onClick={() => resume(r)} title="Resume"><Play size={14} className="text-emerald-600" /></Button>}
        <Button size="sm" variant="ghost" onClick={() => setEditing(r)} title="Edit"><Edit2 size={14} /></Button>
        <Button size="sm" variant="ghost" onClick={() => setDelTarget(r)} title="Delete"><Trash2 size={14} className="text-rose-500" /></Button>
      </div>
    )},
  ];

  return (
    <div>
      <PageHeader
        title="Recurring Invoices"
        subtitle={`${total.toLocaleString()} template${total === 1 ? '' : 's'} — auto-generate invoices on a schedule`}
        actions={<Button onClick={() => setOpen(true)}><Plus size={16} /> New Recurring</Button>}
      />

      <div className="card mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="relative">
            <input className="input" placeholder="Search by name or party" value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} />
          </div>
          <select className="input" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="ended">Ended</option>
          </select>
        </div>
      </div>

      {loading ? <SkeletonTable /> : list.length === 0 ? (
        <div className="card"><EmptyState
          title="No recurring templates yet"
          description="Set up monthly retainers, quarterly subscriptions, or weekly deliveries — Muneem Ji will auto-create the invoice for you."
          action={<Button onClick={() => setOpen(true)}><Plus size={14} /> Create your first recurring</Button>}
        /></div>
      ) : (
        <>
          <Table columns={columns} rows={list} />
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} onChange={setPage} className="mt-4" />
        </>
      )}

      <SlideOver
        open={open || !!editing}
        onClose={() => { setOpen(false); setEditing(null); }}
        title={editing ? `Edit "${editing.name}"` : 'New Recurring Invoice'}
        size="xl"
      >
        <RecurringForm
          initial={editing}
          onSaved={() => { setOpen(false); setEditing(null); load(); toast.success('Recurring template saved'); }}
          onCancel={() => { setOpen(false); setEditing(null); }}
        />
      </SlideOver>

      <Confirm
        open={!!delTarget}
        onClose={() => setDelTarget(null)}
        onConfirm={del}
        title={`Delete "${delTarget?.name}"?`}
        description="The schedule stops immediately. Invoices that were already generated stay in your books."
        confirmText="Delete"
        danger
      />
    </div>
  );
}
