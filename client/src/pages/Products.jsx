import { useEffect, useState, useCallback } from 'react';
import { Plus, Search, Edit2, Trash2, Box } from 'lucide-react';
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
import { TAX_RATES, UNITS } from '../utils/gst.js';
import { toast } from '../store/toast.js';

const PAGE_SIZE = 50;

export default function Products() {
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [allCategories, setAllCategories] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [delTarget, setDelTarget] = useState(null);
  const [adjustTarget, setAdjustTarget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (q) qs.append('q', q);
    if (category) qs.append('category', category);
    try {
      const r = await api.get(`/products?${qs}`);
      setList(r.rows); setTotal(r.total);
    } catch (e) { toast.error(e.message); }
    finally { setLoading(false); }
  }, [q, category, page]);

  // Fetch ALL distinct categories for the filter dropdown (paginated list won't have them all)
  useEffect(() => {
    api.get('/products?all=1').then((rows) => {
      setAllCategories([...new Set(rows.map((p) => p.category).filter(Boolean))]);
    }).catch(() => {});
  }, []);

  useEffect(() => { setPage(1); }, [q, category]);
  useEffect(() => { load(); }, [load]);

  const categories = allCategories;

  async function del() {
    try {
      await api.delete(`/products/${delTarget.id}`);
      toast.success('Product deleted');
      setDelTarget(null);
      load();
    } catch (e) { toast.error(e.message); }
  }

  const columns = [
    { key: 'name', label: 'Name', render: (r) => <div><div className="font-bold text-navy">{r.name}</div><div className="text-xs text-slate-400">{r.category}</div></div> },
    { key: 'sku', label: 'SKU', render: (r) => <span className="font-mono text-xs text-slate-500">{r.sku}</span> },
    { key: 'sale_price', label: 'Sale', align: 'right', render: (r) => formatINR(r.sale_price) },
    { key: 'buy_price', label: 'Buy', align: 'right', render: (r) => <span className="text-slate-500">{formatINR(r.buy_price)}</span> },
    { key: 'tax_rate', label: 'Tax', align: 'right', render: (r) => `${r.tax_rate}%` },
    { key: 'stock', label: 'Stock', align: 'right', render: (r) => <span className={r.stock <= r.min_stock ? 'text-rose-600 font-bold' : 'text-navy font-semibold'}>{r.stock} {r.unit}</span> },
    { key: 'min_stock', label: 'Min', align: 'right', render: (r) => <span className="text-slate-400">{r.min_stock}</span> },
    {
      key: 'actions', label: '', align: 'right',
      render: (r) => (
        <div className="row-actions" onClick={(e) => e.stopPropagation()}>
          <Button size="sm" variant="ghost" onClick={() => setAdjustTarget(r)} title="Adjust stock"><Box size={14} /></Button>
          <Button size="sm" variant="ghost" onClick={() => setEditing(r)}><Edit2 size={14} /></Button>
          <Button size="sm" variant="ghost" onClick={() => setDelTarget(r)}><Trash2 size={14} className="text-rose-500" /></Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Products & Inventory"
        subtitle={`${total.toLocaleString()} product${total === 1 ? '' : 's'}`}
        actions={<Button onClick={() => setOpen(true)}><Plus size={16} /> New Product</Button>}
      />

      <div className="card mb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative md:col-span-2">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className="input pl-9" placeholder="Search by name or SKU" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All categories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {loading ? <SkeletonTable /> : list.length === 0 ? (
        <div className="card"><EmptyState
          title="No products yet"
          description="Apne products jodein, prices set karein, aur stock track karein automatically."
          action={<Button onClick={() => setOpen(true)}><Plus size={14} /> Add your first product</Button>}
        /></div>
      ) : (
        <>
          <Table columns={columns} rows={list} rowClassName={(r) => r.stock <= r.min_stock ? 'bg-rose-50/50' : ''} />
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} onChange={setPage} className="mt-4" />
        </>
      )}

      <ProductForm open={open || !!editing} initial={editing} onClose={() => { setOpen(false); setEditing(null); }} onSaved={() => { setOpen(false); setEditing(null); load(); }} />
      <StockAdjustModal target={adjustTarget} onClose={() => setAdjustTarget(null)} onSaved={() => { setAdjustTarget(null); load(); }} />

      <Confirm open={!!delTarget} onClose={() => setDelTarget(null)} onConfirm={del} title={`Delete ${delTarget?.name}?`} description="This cannot be undone." confirmText="Delete" danger />
    </div>
  );
}

function ProductForm({ open, initial, onClose, onSaved }) {
  const [form, setForm] = useState(empty());
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) { setForm(initial ? { ...empty(), ...initial } : empty()); setErrors({}); } }, [open, initial]);

  async function submit() {
    const e = {};
    if (!form.name?.trim()) e.name = 'Name required';
    if (form.sale_price < 0) e.sale_price = 'Must be >= 0';
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    try {
      if (initial?.id) await api.put(`/products/${initial.id}`, form);
      else await api.post('/products', form);
      toast.success('Product saved');
      onSaved?.();
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? `Edit ${initial.name}` : 'New Product'}
      size="lg"
      actions={<>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={submit} disabled={saving}>{saving ? 'Saving…' : 'Save Product'}</Button>
      </>}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Input label="Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={errors.name} autoFocus />
        <Input label="SKU" value={form.sku || ''} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="Auto-generated if empty" className="font-mono" />
        <Input label="Category" value={form.category || ''} onChange={(e) => setForm({ ...form, category: e.target.value })} />
        <Input label="HSN Code" value={form.hsn_code || ''} onChange={(e) => setForm({ ...form, hsn_code: e.target.value })} className="font-mono" hint="4–8 digit HSN/SAC" />
        <Input type="number" min="0" step="0.01" label="Sale Price (ex-GST)" value={form.sale_price} onChange={(e) => setForm({ ...form, sale_price: parseFloat(e.target.value) || 0 })} error={errors.sale_price} />
        <Input type="number" min="0" step="0.01" label="Buy Price (ex-GST)" value={form.buy_price} onChange={(e) => setForm({ ...form, buy_price: parseFloat(e.target.value) || 0 })} />
        <Select label="Tax Rate" value={form.tax_rate} onChange={(e) => setForm({ ...form, tax_rate: parseFloat(e.target.value) })}>
          {TAX_RATES.map((t) => <option key={t} value={t}>{t}%</option>)}
        </Select>
        <Select label="Unit" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
          {UNITS.map((u) => <option key={u}>{u}</option>)}
        </Select>
        <Input type="number" min="0" step="0.01" label="Current Stock" value={form.stock} onChange={(e) => setForm({ ...form, stock: parseFloat(e.target.value) || 0 })} />
        <Input type="number" min="0" step="0.01" label="Min Stock (alert)" value={form.min_stock} onChange={(e) => setForm({ ...form, min_stock: parseFloat(e.target.value) || 0 })} />
        <div className="md:col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={!!form.has_serial && form.has_serial !== '0'}
              onChange={(e) => setForm({ ...form, has_serial: e.target.checked ? 1 : 0 })}
              className="mt-0.5 rounded border-slate-300 text-amber focus:ring-amber/40"
            />
            <div className="flex-1">
              <div className="text-sm font-semibold text-navy">This product has serial / IMEI numbers</div>
              <div className="text-xs text-slate-500 mt-0.5">
                For appliances, electronics, mobile phones, jewellery — every unit is tracked individually.
                You'll be asked to enter one serial per piece while billing.
              </div>
            </div>
          </label>
          {!!form.has_serial && form.has_serial !== '0' && (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                type="number"
                min="0"
                max="600"
                label="Default Warranty (months)"
                value={form.warranty_months ?? ''}
                onChange={(e) => setForm({ ...form, warranty_months: e.target.value === '' ? null : Number(e.target.value) })}
                hint="e.g. 12 for 1 year, 24 for 2 years. Leave blank if no warranty."
              />
            </div>
          )}
        </div>
        <div className="md:col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={!!form.has_batch && form.has_batch !== '0'}
              onChange={(e) => setForm({ ...form, has_batch: e.target.checked ? 1 : 0 })}
              className="mt-0.5 rounded border-slate-300 text-amber focus:ring-amber/40"
            />
            <div className="flex-1">
              <div className="text-sm font-semibold text-navy">This product has a batch number / expiry date</div>
              <div className="text-xs text-slate-500 mt-0.5">
                For pharmacy, food, cosmetics, paint, lubricants — each lot has its own batch and expiry.
                You'll be asked to capture batch and expiry on every invoice line.
              </div>
            </div>
          </label>
          {!!form.has_batch && form.has_batch !== '0' && (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                type="number"
                min="0"
                max="36500"
                label="Default Shelf Life (days)"
                value={form.shelf_life_days ?? ''}
                onChange={(e) => setForm({ ...form, shelf_life_days: e.target.value === '' ? null : Number(e.target.value) })}
                hint="Used to auto-suggest expiry from manufacturing date. e.g. 730 for 2 years."
              />
            </div>
          )}
        </div>
        <div className="md:col-span-2"><Textarea label="Description" rows="2" value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
      </div>
    </Modal>
  );
}

function StockAdjustModal({ target, onClose, onSaved }) {
  const [form, setForm] = useState({ qty: 0, reason: '', type: 'adjustment' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { setForm({ qty: 0, reason: '', type: 'adjustment' }); }, [target]);

  async function submit() {
    if (!Number(form.qty)) return;
    setSaving(true);
    try {
      await api.post(`/products/${target.id}/adjust-stock`, form);
      toast.success('Stock adjusted');
      onSaved?.();
    } catch (e) { toast.error(e.message); }
    finally { setSaving(false); }
  }

  if (!target) return null;
  return (
    <Modal
      open
      onClose={onClose}
      title={`Adjust stock — ${target.name}`}
      actions={<>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={submit} disabled={saving}>{saving ? 'Saving…' : 'Adjust Stock'}</Button>
      </>}
    >
      <div className="text-sm text-slate-500 mb-3">Current stock: <span className="font-bold text-navy">{target.stock} {target.unit}</span></div>
      <div className="grid grid-cols-2 gap-3">
        <Input type="number" step="0.01" label="Quantity (+ to add, − to remove)" value={form.qty} onChange={(e) => setForm({ ...form, qty: parseFloat(e.target.value) || 0 })} autoFocus />
        <Select label="Type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
          <option value="adjustment">Adjustment</option>
          <option value="purchase">Purchase</option>
          <option value="return">Return</option>
        </Select>
        <div className="col-span-2"><Input label="Reason" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></div>
      </div>
    </Modal>
  );
}

function empty() {
  return { name: '', sku: '', category: '', description: '', hsn_code: '', unit: 'Nos', sale_price: 0, buy_price: 0, tax_rate: 18, stock: 0, min_stock: 0, has_serial: 0, warranty_months: null, has_batch: 0, shelf_life_days: null };
}
