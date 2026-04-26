import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Edit2, Trash2, Eye } from 'lucide-react';
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
import { formatINR } from '../utils/format.js';
import { STATES } from '../utils/gst.js';
import { isValidGSTIN, isValidPincode, isValidEmail } from '../utils/validators.js';
import { toast } from '../store/toast.js';

const TABS = [
  { value: '', label: 'All' },
  { value: 'customer', label: 'Customers' },
  { value: 'supplier', label: 'Suppliers' },
];

const PAGE_SIZE = 50;

export default function Parties() {
  const nav = useNavigate();
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState('');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [delTarget, setDelTarget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (type) qs.append('type', type);
    if (q) qs.append('q', q);
    try {
      const r = await api.get(`/parties?${qs}`);
      setList(r.rows); setTotal(r.total);
    } catch (e) { toast.error(e.message); }
    finally { setLoading(false); }
  }, [type, q, page]);

  // Reset to page 1 when filters change (so we don't end up on a non-existent page)
  useEffect(() => { setPage(1); }, [type, q]);
  useEffect(() => { load(); }, [load]);

  async function del() {
    try {
      await api.delete(`/parties/${delTarget.id}`);
      toast.success('Party deleted');
      setDelTarget(null);
      load();
    } catch (e) { toast.error(e.message); }
  }

  const columns = [
    { key: 'name', label: 'Name', render: (r) => <span className="font-bold text-navy">{r.name}</span> },
    { key: 'type', label: 'Type', render: (r) => <span className="capitalize text-slate-600">{r.type}</span> },
    { key: 'gstin', label: 'GSTIN', render: (r) => <span className="font-mono text-xs">{r.gstin || '—'}</span> },
    { key: 'phone', label: 'Phone' },
    { key: 'city', label: 'City' },
    { key: 'outstanding', label: 'Outstanding', align: 'right', render: (r) => <span className={r.outstanding > 0 ? 'font-bold text-amber-700' : 'text-slate-400'}>{formatINR(r.outstanding)}</span> },
    {
      key: 'actions', label: '', align: 'right',
      render: (r) => (
        <div className="row-actions" onClick={(e) => e.stopPropagation()}>
          <Button size="sm" variant="ghost" onClick={() => nav(`/parties/${r.id}`)}><Eye size={14} /></Button>
          <Button size="sm" variant="ghost" onClick={() => setEditing(r)}><Edit2 size={14} /></Button>
          <Button size="sm" variant="ghost" onClick={() => setDelTarget(r)}><Trash2 size={14} className="text-rose-500" /></Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Parties"
        subtitle="Customers and suppliers"
        actions={<Button onClick={() => setOpen(true)}><Plus size={16} /> New Party</Button>}
      />

      <div className="card mb-4">
        <div className="flex flex-wrap items-center gap-3 mb-3">
          {TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setType(t.value)}
              className={`px-4 py-1.5 text-sm rounded-xl font-semibold transition ${type === t.value ? 'bg-navy text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {t.label}
            </button>
          ))}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className="input pl-9" placeholder="Search by name, GSTIN, phone" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
      </div>

      {loading ? <SkeletonTable /> : list.length === 0 ? (
        <div className="card"><EmptyState
          title="No parties yet"
          description="Apne customers aur suppliers ko jodein. Har transaction unke khate mein record hogi."
          action={<Button onClick={() => setOpen(true)}><Plus size={14} /> Add your first party</Button>}
        /></div>
      ) : (
        <>
          <Table columns={columns} rows={list} onRowClick={(r) => nav(`/parties/${r.id}`)} />
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} onChange={setPage} className="mt-4" />
        </>
      )}

      <PartyForm
        open={open || !!editing}
        initial={editing}
        onClose={() => { setOpen(false); setEditing(null); }}
        onSaved={() => { setOpen(false); setEditing(null); load(); }}
      />

      <Confirm open={!!delTarget} onClose={() => setDelTarget(null)} onConfirm={del} title={`Delete ${delTarget?.name}?`} description="All linked invoices and payments will keep the historical name. This cannot be undone." confirmText="Delete" danger />
    </div>
  );
}

function PartyForm({ open, initial, onClose, onSaved }) {
  const [form, setForm] = useState(emptyForm());
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm(initial ? { ...emptyForm(), ...initial } : emptyForm());
    if (open) setErrors({});
  }, [open, initial]);

  function validate() {
    const e = {};
    if (!form.name?.trim()) e.name = 'Name required';
    if (form.gstin && !isValidGSTIN(form.gstin)) e.gstin = 'Invalid GSTIN format';
    if (form.email && !isValidEmail(form.email)) e.email = 'Invalid email';
    if (form.pincode && !isValidPincode(form.pincode)) e.pincode = 'Invalid pincode';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit() {
    if (!validate()) return;
    setSaving(true);
    try {
      const stateName = STATES.find((s) => s[0] === form.state_code)?.[1] || form.state_name || null;
      const payload = { ...form, state_name: stateName, gstin: form.gstin?.toUpperCase() || null };
      if (initial?.id) await api.put(`/parties/${initial.id}`, payload);
      else await api.post('/parties', payload);
      toast.success('Party saved');
      onSaved?.();
    } catch (e) { toast.error(e.message); }
    finally { setSaving(false); }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? `Edit ${initial.name}` : 'New Party'}
      size="lg"
      actions={<>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={submit} disabled={saving}>{saving ? 'Saving…' : 'Save Party'}</Button>
      </>}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Input label="Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={errors.name} autoFocus />
        <Select label="Type *" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
          <option value="customer">Customer</option>
          <option value="supplier">Supplier</option>
        </Select>
        <Input label="Phone" value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <Input label="Email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} error={errors.email} />
        <Input label="GSTIN" value={form.gstin || ''} onChange={(e) => setForm({ ...form, gstin: e.target.value })} error={errors.gstin} className="font-mono" placeholder="27AABCS1429B1ZB" />
        <Input label="Opening Balance" type="number" value={form.opening_bal || 0} onChange={(e) => setForm({ ...form, opening_bal: parseFloat(e.target.value) || 0 })} />
        <div className="md:col-span-2">
          <Textarea label="Address Line" rows="2" value={form.address || ''} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </div>
        <Input label="City" value={form.city || ''} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        <Input label="Pincode" value={form.pincode || ''} onChange={(e) => setForm({ ...form, pincode: e.target.value })} error={errors.pincode} />
        <Select label="State" value={form.state_code || ''} onChange={(e) => setForm({ ...form, state_code: e.target.value })} className="md:col-span-2">
          <option value="">— Select state —</option>
          {STATES.map(([code, name]) => <option key={code} value={code}>{code} · {name}</option>)}
        </Select>
      </div>
    </Modal>
  );
}

function emptyForm() {
  return {
    name: '', type: 'customer', email: '', phone: '', gstin: '', address: '',
    city: '', pincode: '', state_code: '', state_name: '', opening_bal: 0,
  };
}
