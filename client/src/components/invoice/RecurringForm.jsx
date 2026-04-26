import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Input, Select, Textarea } from '../ui/Input.jsx';
import Button from '../ui/Button.jsx';
import PartyPicker from './PartyPicker.jsx';
import { api } from '../../utils/api.js';
import { calcInvoice, TAX_RATES, UNITS } from '../../utils/gst.js';
import { formatINR, todayISO } from '../../utils/format.js';

function emptyItem() {
  return { product_id: null, name: '', hsn_code: '', qty: 1, unit: 'Nos', rate: 0, tax_rate: 18 };
}

export default function RecurringForm({ initial, onSaved, onCancel }) {
  const [parties, setParties] = useState([]);
  const [products, setProducts] = useState([]);

  const [form, setForm] = useState(() => initial ? {
    ...initial,
    items: initial.items?.length ? initial.items : [emptyItem()],
  } : {
    name: '',
    party_id: null,
    party_name: '',
    cadence: 'monthly',
    cadence_n: 1,
    start_date: todayISO(),
    end_date: '',
    autosend: false,
    status: 'active',
    discount: 0,
    notes: '',
    items: [emptyItem()],
  });

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    api.get('/parties?type=customer&all=1').then(setParties);
    api.get('/products?all=1').then(setProducts);
  }, []);

  const calc = useMemo(() => calcInvoice(form.items, form.discount, false), [form.items, form.discount]);

  function updateItem(i, patch) {
    setForm((f) => ({ ...f, items: f.items.map((it, idx) => idx === i ? { ...it, ...patch } : it) }));
  }
  function addLine() { setForm((f) => ({ ...f, items: [...f.items, emptyItem()] })); }
  function removeLine(i) { setForm((f) => ({ ...f, items: f.items.length === 1 ? [emptyItem()] : f.items.filter((_, idx) => idx !== i) })); }

  function pickProduct(i, productId) {
    if (!productId) { updateItem(i, { product_id: null }); return; }
    const p = products.find((x) => x.id === productId);
    if (!p) return;
    updateItem(i, {
      product_id: p.id, name: p.name, hsn_code: p.hsn_code || '',
      unit: p.unit || 'Nos', rate: p.sale_price, tax_rate: p.tax_rate,
    });
  }

  function validate() {
    const e = {};
    if (!form.name?.trim()) e.name = 'Give this template a name (e.g. "Monthly retainer")';
    if (!form.start_date) e.start_date = 'Start date required';
    if (!form.cadence_n || form.cadence_n < 1) e.cadence_n = 'Must be at least 1';
    const validItems = form.items.filter((it) => it.name && Number(it.qty) > 0);
    if (validItems.length === 0) e.items = 'At least one valid line item required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit() {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        end_date: form.end_date || null,
        items: form.items.filter((it) => it.name && Number(it.qty) > 0),
      };
      let saved;
      if (initial?.id) saved = await api.put(`/recurring/${initial.id}`, payload);
      else saved = await api.post('/recurring', payload);
      onSaved?.(saved);
    } catch (err) {
      setErrors({ _root: err.message });
    } finally {
      setSaving(false);
    }
  }

  const cadenceUnit = form.cadence === 'weekly' ? 'week' : form.cadence === 'monthly' ? 'month' : form.cadence === 'quarterly' ? 'quarter' : 'year';

  return (
    <div className="space-y-6">
      {errors._root && <div className="bg-rose-50 text-rose-700 text-sm rounded-xl px-4 py-3">{errors._root}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input label="Template Name *" placeholder="e.g. Monthly retainer — Acme" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={errors.name} autoFocus />
        <div className="md:col-span-1">
          <PartyPicker
            label="Customer (optional)"
            parties={parties}
            value={{ id: form.party_id || null, name: form.party_name || '' }}
            onChange={({ id, name }) => setForm((f) => ({ ...f, party_id: id || null, party_name: name }))}
          />
        </div>
      </div>

      <div className="card bg-amber/5 border-amber/20 space-y-3">
        <h4 className="text-sm font-bold text-navy">Schedule</h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Select label="Repeat every" value={form.cadence_n} onChange={(e) => setForm({ ...form, cadence_n: parseInt(e.target.value) || 1 })}>
            {[1, 2, 3, 4, 6, 12].map((n) => <option key={n} value={n}>{n}</option>)}
          </Select>
          <Select label="Unit" value={form.cadence} onChange={(e) => setForm({ ...form, cadence: e.target.value })}>
            <option value="weekly">Week(s)</option>
            <option value="monthly">Month(s)</option>
            <option value="quarterly">Quarter(s)</option>
            <option value="yearly">Year(s)</option>
          </Select>
          <Input type="date" label="First invoice on *" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} error={errors.start_date} />
          <Input type="date" label="End on (optional)" value={form.end_date || ''} onChange={(e) => setForm({ ...form, end_date: e.target.value })} hint="Leave blank for indefinite" />
        </div>
        <div className="text-xs text-slate-600">
          Generates one invoice every <span className="font-semibold">{form.cadence_n} {cadenceUnit}{form.cadence_n > 1 ? 's' : ''}</span>, starting <span className="font-semibold">{form.start_date}</span>.
        </div>
        <label className="inline-flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={!!form.autosend}
            onChange={(e) => setForm({ ...form, autosend: e.target.checked })}
            className="rounded border-slate-300 text-amber focus:ring-amber/40"
          />
          Mark generated invoices as <span className="font-semibold">Sent</span> (otherwise saved as Draft for review)
        </label>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-bold text-navy">Line Items</h4>
          <Button variant="secondary" size="sm" onClick={addLine}><Plus size={14} /> Add row</Button>
        </div>
        {errors.items && <p className="text-xs text-rose-600 mb-2">{errors.items}</p>}
        <div className="border border-cardBorder rounded-2xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs">
              <tr>
                <th className="text-left px-3 py-2 font-semibold">Item</th>
                <th className="text-left px-2 py-2 font-semibold w-24">HSN</th>
                <th className="text-right px-2 py-2 font-semibold w-20">Qty</th>
                <th className="text-left px-2 py-2 font-semibold w-20">Unit</th>
                <th className="text-right px-2 py-2 font-semibold w-28">Rate</th>
                <th className="text-right px-2 py-2 font-semibold w-20">Tax%</th>
                <th className="text-right px-2 py-2 font-semibold w-32">Total</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {form.items.map((it, i) => (
                <tr key={i} className="border-t border-slate-100">
                  <td className="px-2 py-2">
                    <select className="input mb-1 text-xs" value={it.product_id || ''} onChange={(e) => pickProduct(i, e.target.value)}>
                      <option value="">— Pick product —</option>
                      {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <input className="input" placeholder="Or type item name" value={it.name} onChange={(e) => updateItem(i, { name: e.target.value })} />
                  </td>
                  <td className="px-2 py-2 align-top"><input className="input" value={it.hsn_code || ''} onChange={(e) => updateItem(i, { hsn_code: e.target.value })} /></td>
                  <td className="px-2 py-2 align-top"><input type="number" min="0" step="0.01" className="input text-right" value={it.qty} onChange={(e) => updateItem(i, { qty: parseFloat(e.target.value) || 0 })} /></td>
                  <td className="px-2 py-2 align-top">
                    <select className="input" value={it.unit} onChange={(e) => updateItem(i, { unit: e.target.value })}>
                      {UNITS.map((u) => <option key={u}>{u}</option>)}
                    </select>
                  </td>
                  <td className="px-2 py-2 align-top"><input type="number" min="0" step="0.01" className="input text-right" value={it.rate} onChange={(e) => updateItem(i, { rate: parseFloat(e.target.value) || 0 })} /></td>
                  <td className="px-2 py-2 align-top">
                    <select className="input" value={it.tax_rate} onChange={(e) => updateItem(i, { tax_rate: parseFloat(e.target.value) })}>
                      {TAX_RATES.map((t) => <option key={t} value={t}>{t}%</option>)}
                    </select>
                  </td>
                  <td className="px-2 py-2 align-top text-right font-semibold text-navy">{formatINR(calc.items[i]?.total || 0)}</td>
                  <td className="px-2 py-2 align-top text-center">
                    <button onClick={() => removeLine(i)} className="text-slate-400 hover:text-rose-500 transition"><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Textarea label="Notes (appears on every generated invoice)" rows="3" value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-sm">
          <div className="flex items-center justify-between mb-1"><span className="text-slate-500">Subtotal</span><span className="font-semibold">{formatINR(calc.subtotal)}</span></div>
          <div className="flex items-center justify-between mb-1"><span className="text-slate-500">Tax</span><span className="font-semibold">{formatINR(calc.cgst + calc.sgst + calc.igst)}</span></div>
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-slate-500">Discount</span>
            <input type="number" min="0" step="0.01" className="input text-right w-32 py-1.5" value={form.discount} onChange={(e) => setForm({ ...form, discount: parseFloat(e.target.value) || 0 })} />
          </div>
          <div className="border-t border-slate-200 pt-2 mt-2 flex items-center justify-between">
            <span className="text-base font-bold text-navy">Each invoice</span>
            <span className="text-xl font-extrabold text-navy">{formatINR(calc.total)}</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">Tax (CGST/SGST or IGST) is calculated per generated invoice based on the customer's state at that time.</div>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" onClick={onCancel} disabled={saving}>Cancel</Button>
        <Button onClick={submit} disabled={saving}>{saving ? 'Saving…' : (initial?.id ? 'Save changes' : 'Create Schedule')}</Button>
      </div>
    </div>
  );
}
