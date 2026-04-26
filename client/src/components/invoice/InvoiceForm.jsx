import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Input, Select, Textarea } from '../ui/Input.jsx';
import Button from '../ui/Button.jsx';
import PartyPicker from './PartyPicker.jsx';
import { api } from '../../utils/api.js';
import { calcInvoice, TAX_RATES, UNITS } from '../../utils/gst.js';
import { formatINR, todayISO, addDays } from '../../utils/format.js';
import { useSettings } from '../../store/settings.js';

const STATUS_OPTIONS = {
  sale: ['draft', 'sent', 'paid', 'partial', 'overdue', 'cancelled'],
  quotation: ['draft', 'sent', 'accepted', 'rejected', 'expired'],
};

function emptyItem() {
  return { product_id: null, name: '', hsn_code: '', qty: 1, unit: 'Nos', rate: 0, tax_rate: 18 };
}

export default function InvoiceForm({ type = 'sale', initial, onSaved, onCancel }) {
  const settings = useSettings((s) => s.settings);
  const [parties, setParties] = useState([]);
  const [products, setProducts] = useState([]);

  const [form, setForm] = useState(() => initial ? {
    ...initial,
    items: initial.items?.length ? initial.items : [emptyItem()],
  } : {
    type,
    no: '',
    date: todayISO(),
    due_date: type === 'quotation' ? addDays(todayISO(), 30) : addDays(todayISO(), Number(settings.paymentTerms || 15)),
    party_id: '',
    party_name: '',
    interstate: false,
    interstateOverride: false,
    discount: 0,
    status: 'draft',
    notes: settings.defaultNotes || '',
    items: [emptyItem()],
  });

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    api.get('/parties?type=customer&all=1').then(setParties);
    api.get('/products?all=1').then(setProducts);
  }, []);

  // Auto-detect interstate from party state vs business state
  useEffect(() => {
    if (form.interstateOverride) return;
    if (!form.party_id) return;
    const party = parties.find((p) => p.id === form.party_id);
    if (!party) return;
    const inter = party.state_code && settings.stateCode && String(party.state_code) !== String(settings.stateCode);
    setForm((f) => ({ ...f, interstate: !!inter }));
  }, [form.party_id, form.interstateOverride, parties, settings.stateCode]);

  const calc = useMemo(() => calcInvoice(form.items, form.discount, form.interstate), [form.items, form.discount, form.interstate]);

  function updateItem(i, patch) {
    setForm((f) => ({
      ...f,
      items: f.items.map((it, idx) => idx === i ? { ...it, ...patch } : it),
    }));
  }
  function addLine() { setForm((f) => ({ ...f, items: [...f.items, emptyItem()] })); }
  function removeLine(i) {
    setForm((f) => ({ ...f, items: f.items.length === 1 ? [emptyItem()] : f.items.filter((_, idx) => idx !== i) }));
  }

  function pickProduct(i, productId) {
    if (!productId) {
      updateItem(i, { product_id: null });
      return;
    }
    const p = products.find((x) => x.id === productId);
    if (!p) return;
    updateItem(i, {
      product_id: p.id,
      name: p.name,
      hsn_code: p.hsn_code || '',
      unit: p.unit || 'Nos',
      rate: p.sale_price,
      tax_rate: p.tax_rate,
    });
  }

  function validate() {
    const e = {};
    if (!form.date) e.date = 'Date required';
    const validItems = form.items.filter((it) => it.name && Number(it.qty) > 0);
    if (validItems.length === 0) e.items = 'At least one valid line item required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit(status) {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        status: status || form.status,
        items: form.items.filter((it) => it.name && Number(it.qty) > 0),
      };
      if (form.interstateOverride) payload.interstate = form.interstate;
      else delete payload.interstate;
      delete payload.interstateOverride;
      let saved;
      if (initial?.id) saved = await api.put(`/invoices/${initial.id}`, payload);
      else saved = await api.post('/invoices', payload);
      onSaved?.(saved);
    } catch (err) {
      setErrors({ _root: err.message });
    } finally {
      setSaving(false);
    }
  }

  const statusOpts = STATUS_OPTIONS[type] || STATUS_OPTIONS.sale;

  return (
    <div className="space-y-6">
      {errors._root && <div className="bg-rose-50 text-rose-700 text-sm rounded-xl px-4 py-3">{errors._root}</div>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Input label={`${type === 'quotation' ? 'Quotation' : 'Invoice'} No.`} value={form.no} onChange={(e) => setForm({ ...form, no: e.target.value })} placeholder="Auto-generated" />
        <Input type="date" label="Date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} error={errors.date} />
        <Input type="date" label={type === 'quotation' ? 'Expires On' : 'Due Date'} value={form.due_date || ''} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <PartyPicker
            label={type === 'quotation' ? 'Quotation For' : 'Customer / Party'}
            parties={parties}
            value={{ id: form.party_id || null, name: form.party_name || '' }}
            onChange={({ id, name }) => setForm((f) => ({ ...f, party_id: id || null, party_name: name }))}
          />
        </div>
        <Select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
          {statusOpts.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </Select>
      </div>

      <label className="inline-flex items-center gap-2 text-sm text-slate-600">
        <input
          type="checkbox"
          checked={form.interstate}
          onChange={(e) => setForm({ ...form, interstate: e.target.checked, interstateOverride: true })}
          className="rounded border-slate-300 text-amber focus:ring-amber/40"
        />
        Interstate transaction (IGST applies)
        {!form.interstateOverride && <span className="text-xs text-slate-400">— auto-detected</span>}
      </label>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-bold text-navy">Line Items</h4>
          <Button variant="secondary" size="sm" onClick={addLine}>
            <Plus size={14} /> Add row
          </Button>
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
                    <select
                      className="input mb-1 text-xs"
                      value={it.product_id || ''}
                      onChange={(e) => pickProduct(i, e.target.value)}
                    >
                      <option value="">— Pick product —</option>
                      {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <input
                      className="input"
                      placeholder="Or type item name"
                      value={it.name}
                      onChange={(e) => updateItem(i, { name: e.target.value })}
                    />
                  </td>
                  <td className="px-2 py-2 align-top">
                    <input className="input" value={it.hsn_code || ''} onChange={(e) => updateItem(i, { hsn_code: e.target.value })} />
                  </td>
                  <td className="px-2 py-2 align-top">
                    <input type="number" min="0" step="0.01" className="input text-right" value={it.qty} onChange={(e) => updateItem(i, { qty: parseFloat(e.target.value) || 0 })} />
                  </td>
                  <td className="px-2 py-2 align-top">
                    <select className="input" value={it.unit} onChange={(e) => updateItem(i, { unit: e.target.value })}>
                      {UNITS.map((u) => <option key={u}>{u}</option>)}
                    </select>
                  </td>
                  <td className="px-2 py-2 align-top">
                    <input type="number" min="0" step="0.01" className="input text-right" value={it.rate} onChange={(e) => updateItem(i, { rate: parseFloat(e.target.value) || 0 })} />
                  </td>
                  <td className="px-2 py-2 align-top">
                    <select className="input" value={it.tax_rate} onChange={(e) => updateItem(i, { tax_rate: parseFloat(e.target.value) })}>
                      {TAX_RATES.map((t) => <option key={t} value={t}>{t}%</option>)}
                    </select>
                  </td>
                  <td className="px-2 py-2 align-top text-right font-semibold text-navy">
                    {formatINR(calc.items[i]?.total || 0)}
                  </td>
                  <td className="px-2 py-2 align-top text-center">
                    <button onClick={() => removeLine(i)} className="text-slate-400 hover:text-rose-500 transition">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Textarea label="Notes / Terms" rows="4" value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
          <div className="space-y-2 text-sm">
            <Row label="Subtotal" value={formatINR(calc.subtotal)} />
            {form.interstate
              ? <Row label="IGST" value={formatINR(calc.igst)} />
              : (<>
                <Row label="CGST" value={formatINR(calc.cgst)} />
                <Row label="SGST" value={formatINR(calc.sgst)} />
              </>)
            }
            <div className="flex items-center justify-between pt-1">
              <span className="text-slate-500">Discount</span>
              <input
                type="number"
                min="0"
                step="0.01"
                className="input text-right w-32 py-1.5"
                value={form.discount}
                onChange={(e) => setForm({ ...form, discount: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="border-t border-slate-200 pt-3 mt-2">
              <div className="flex items-center justify-between">
                <span className="text-base font-bold text-navy">Grand Total</span>
                <span className="text-2xl font-extrabold text-navy">{formatINR(calc.total)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" onClick={onCancel} disabled={saving}>Cancel</Button>
        <Button variant="ghost" onClick={() => submit('draft')} disabled={saving}>Save as Draft</Button>
        <Button onClick={() => submit(form.status === 'draft' ? 'sent' : form.status)} disabled={saving}>
          {saving ? 'Saving…' : (initial?.id ? 'Save changes' : `Save & ${type === 'quotation' ? 'Send' : 'Send'}`)}
        </Button>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold text-navy">{value}</span>
    </div>
  );
}
