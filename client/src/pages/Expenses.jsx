import { useEffect, useState, useCallback, useMemo } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader.jsx';
import Button from '../components/ui/Button.jsx';
import Table from '../components/ui/Table.jsx';
import Modal from '../components/ui/Modal.jsx';
import { Input, Select, Textarea } from '../components/ui/Input.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import { SkeletonTable } from '../components/ui/Skeleton.jsx';
import Confirm from '../components/ui/Confirm.jsx';
import Pagination from '../components/ui/Pagination.jsx';
import { api } from '../utils/api.js';
import { formatINR, formatDate, todayISO } from '../utils/format.js';
import { EXPENSE_CATEGORIES, PAYMENT_MODES } from '../utils/gst.js';
import { toast } from '../store/toast.js';

const PAGE_SIZE = 50;

export default function Expenses() {
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ from: '', to: '', category: '' });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [delTarget, setDelTarget] = useState(null);
  const [monthlyTotal, setMonthlyTotal] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    Object.entries(filters).forEach(([k, v]) => v && qs.append(k, v));
    try {
      const r = await api.get(`/expenses?${qs}`);
      setList(r.rows); setTotal(r.total);
    } catch (e) { toast.error(e.message); }
    finally { setLoading(false); }
  }, [filters, page]);

  // Pull the monthly total from ALL expenses in the current month (independent of page filters)
  useEffect(() => {
    const m = new Date().toISOString().slice(0, 7);
    const last = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().slice(0, 10);
    api.get(`/expenses?all=1&from=${m}-01&to=${last}`).then((rows) => {
      setMonthlyTotal(rows.reduce((s, e) => s + Number(e.amount || 0), 0));
    }).catch(() => {});
  }, [list.length]); // refresh after CRUD

  useEffect(() => { setPage(1); }, [filters]);
  useEffect(() => { load(); }, [load]);

  async function del() {
    try {
      await api.delete(`/expenses/${delTarget.id}`);
      toast.success('Expense deleted');
      setDelTarget(null);
      load();
    } catch (e) { toast.error(e.message); }
  }

  const columns = [
    { key: 'date', label: 'Date', render: (r) => formatDate(r.date) },
    { key: 'category', label: 'Category', render: (r) => <span className="badge bg-navy/5 text-navy">{r.category}</span> },
    { key: 'description', label: 'Description', render: (r) => <span className="font-medium text-navy">{r.description || '—'}</span> },
    { key: 'vendor', label: 'Vendor', render: (r) => r.vendor || '—' },
    { key: 'mode', label: 'Mode', render: (r) => <span className="capitalize text-slate-500 text-xs">{r.payment_mode}</span> },
    { key: 'amount', label: 'Amount', align: 'right', render: (r) => <span className="font-bold text-amber-700">{formatINR(r.amount)}</span> },
    {
      key: 'actions', label: '', align: 'right',
      render: (r) => (
        <div className="row-actions" onClick={(e) => e.stopPropagation()}>
          <Button size="sm" variant="ghost" onClick={() => setEditing(r)}><Edit2 size={14} /></Button>
          <Button size="sm" variant="ghost" onClick={() => setDelTarget(r)}><Trash2 size={14} className="text-rose-500" /></Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Expenses"
        subtitle={<>This month: <span className="font-bold text-amber-700">{formatINR(monthlyTotal)}</span></>}
        actions={<Button onClick={() => setOpen(true)}><Plus size={16} /> New Expense</Button>}
      />

      <div className="card mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <select className="input min-w-0" value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })}>
            <option value="">All categories</option>
            {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <input type="date" className="input min-w-0" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
          <input type="date" className="input min-w-0" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
          <Button variant="secondary" onClick={() => setFilters({ from: '', to: '', category: '' })}>Reset filters</Button>
        </div>
      </div>

      {loading ? <SkeletonTable /> : list.length === 0 ? (
        <div className="card"><EmptyState
          title="No expenses yet"
          description="Track karein har kharcha. Profit & Loss reports automatic ban jaayegi."
          action={<Button onClick={() => setOpen(true)}><Plus size={14} /> Add your first expense</Button>}
        /></div>
      ) : (
        <>
          <Table columns={columns} rows={list} />
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} onChange={setPage} className="mt-4" />
        </>
      )}

      <ExpenseForm open={open || !!editing} initial={editing} onClose={() => { setOpen(false); setEditing(null); }} onSaved={() => { setOpen(false); setEditing(null); load(); }} />

      <Confirm open={!!delTarget} onClose={() => setDelTarget(null)} onConfirm={del} title="Delete expense?" description={`Amount: ${delTarget && formatINR(delTarget.amount)} · ${delTarget?.category}`} confirmText="Delete" danger />
    </div>
  );
}

function ExpenseForm({ open, initial, onClose, onSaved }) {
  const [form, setForm] = useState(empty());
  const [file, setFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) { setForm(initial ? { ...empty(), ...initial } : empty()); setFile(null); setErrors({}); } }, [open, initial]);

  async function submit() {
    const e = {};
    if (!form.date) e.date = 'Date required';
    if (!form.category) e.category = 'Category required';
    if (!Number(form.amount) || form.amount <= 0) e.amount = 'Amount must be > 0';
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => v != null && fd.append(k, v));
      if (file) fd.append('receipt', file);
      const url = initial?.id ? `/api/expenses/${initial.id}` : '/api/expenses';
      const method = initial?.id ? 'PUT' : 'POST';
      const res = await fetch(url, { method, body: fd });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Save failed');
      }
      toast.success('Expense saved');
      onSaved?.();
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? 'Edit expense' : 'New Expense'}
      size="md"
      actions={<>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={submit} disabled={saving}>{saving ? 'Saving…' : 'Save Expense'}</Button>
      </>}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Input type="date" label="Date *" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} error={errors.date} />
        <Select label="Category *" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} error={errors.category}>
          <option value="">— Select —</option>
          {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
        <Input label="Vendor" value={form.vendor || ''} onChange={(e) => setForm({ ...form, vendor: e.target.value })} />
        <Input type="number" min="0" step="0.01" label="Amount *" value={form.amount} onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })} error={errors.amount} />
        <Select label="Payment Mode" value={form.payment_mode} onChange={(e) => setForm({ ...form, payment_mode: e.target.value })}>
          {PAYMENT_MODES.map((m) => <option key={m} value={m}>{m.toUpperCase()}</option>)}
        </Select>
        <div className="md:col-span-2"><Textarea label="Description" rows="2" value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        <div className="md:col-span-2">
          <label className="label">Receipt (optional)</label>
          <input type="file" accept="image/*,application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} className="text-sm text-slate-500" />
          {form.receipt_path && !file && <a href={form.receipt_path} target="_blank" rel="noreferrer" className="text-xs text-amber hover:underline ml-2">Current attachment</a>}
        </div>
      </div>
    </Modal>
  );
}

function empty() {
  return { date: todayISO(), category: '', description: '', vendor: '', amount: 0, payment_mode: 'cash', receipt_path: '' };
}
