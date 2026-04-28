import { useEffect, useMemo, useState } from 'react';
import { Search, Plus, Minus, Trash2, Printer, Wallet, X, Edit3, MessageCircle } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader.jsx';
import Button from '../components/ui/Button.jsx';
import Modal from '../components/ui/Modal.jsx';
import { Input, Select } from '../components/ui/Input.jsx';
import PartyPicker from '../components/invoice/PartyPicker.jsx';
import WhatsAppShareDialog from '../components/invoice/WhatsAppShareDialog.jsx';
import { api } from '../utils/api.js';
import { calcInvoice, PAYMENT_MODES, TAX_RATES, UNITS } from '../utils/gst.js';
import { formatINR, todayISO } from '../utils/format.js';
import { useSettings, useGstEnabled, gstIsEnabled } from '../store/settings.js';
import { toast } from '../store/toast.js';

let customCounter = 0;
const newCustomId = () => `custom-${Date.now()}-${++customCounter}`;

/**
 * Print only the receipt by cloning it into a top-level portal div.
 * `display: none` on body's other children removes them from the print layout
 * entirely (visibility:hidden left blank pages).
 */
function printReceipt() {
  const source = document.querySelector('.receipt-print-target');
  if (!source) { window.print(); return; }

  // Build a top-level portal containing only the receipt clone
  const portal = document.createElement('div');
  portal.className = 'receipt-print-portal';
  portal.appendChild(source.cloneNode(true));
  document.body.appendChild(portal);

  // Inject @page rule for thermal width — overrides the default A4 page rule for this print
  const pageStyle = document.createElement('style');
  pageStyle.id = 'mj-receipt-page-style';
  pageStyle.textContent = '@media print { @page { size: 80mm auto !important; margin: 0 !important; } }';
  document.head.appendChild(pageStyle);

  document.body.classList.add('print-mode-receipt');

  const cleanup = () => {
    document.body.classList.remove('print-mode-receipt');
    if (portal.parentNode) portal.parentNode.removeChild(portal);
    if (pageStyle.parentNode) pageStyle.parentNode.removeChild(pageStyle);
    window.removeEventListener('afterprint', cleanup);
  };
  window.addEventListener('afterprint', cleanup);
  setTimeout(cleanup, 10000); // safety in case afterprint never fires

  // Defer one frame so the portal is in the DOM before print fires
  requestAnimationFrame(() => window.print());
}

export default function POS() {
  const settings = useSettings((s) => s.settings);
  const gstOn = useGstEnabled();
  const [products, setProducts] = useState([]);
  const [parties, setParties] = useState([]);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]);
  const [customer, setCustomer] = useState({ id: null, name: '' });
  const [discount, setDiscount] = useState(0);
  const [payOpen, setPayOpen] = useState(false);
  const [lastReceipt, setLastReceipt] = useState(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [editing, setEditing] = useState(null); // cart item being inline-edited
  const [sharingReceipt, setSharingReceipt] = useState(false);

  useEffect(() => {
    api.get('/products?all=1').then(setProducts);
    api.get('/parties?type=customer&all=1').then(setParties);
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return products.filter((p) => !q || p.name.toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q));
  }, [products, search]);

  const interstate = useMemo(() => {
    if (!customer.id) return false;
    const p = parties.find((x) => x.id === customer.id);
    return p && p.state_code && settings.stateCode && String(p.state_code) !== String(settings.stateCode);
  }, [customer, parties, settings.stateCode]);

  const calc = useMemo(() => calcInvoice(cart.map((c) => ({
    name: c.name, hsn_code: c.hsn_code, qty: c.qty, unit: c.unit, rate: c.sale_price,
    tax_rate: c.tax_rate, product_id: c.product_id,
  })), discount, interstate), [cart, discount, interstate]);

  function addToCart(p) {
    setCart((c) => {
      const idx = c.findIndex((x) => x.product_id === p.id);
      if (idx >= 0) {
        const next = [...c];
        next[idx] = { ...next[idx], qty: next[idx].qty + 1 };
        return next;
      }
      return [...c, {
        cart_id: p.id, product_id: p.id,
        name: p.name, hsn_code: p.hsn_code, unit: p.unit,
        sale_price: p.sale_price, tax_rate: p.tax_rate,
        qty: 1, is_custom: false,
        has_serial: !!p.has_serial && p.has_serial !== 0,
        warranty_months: p.warranty_months ?? null,
        serials: [],
      }];
    });
  }

  function setSerials(cart_id, serials) {
    setCart((c) => c.map((x) => x.cart_id === cart_id ? { ...x, serials } : x));
  }

  function addCustomItem({ name, price, qty, tax_rate, unit }) {
    if (!name.trim() || !(price >= 0) || !(qty > 0)) return;
    setCart((c) => [...c, {
      cart_id: newCustomId(), product_id: null,
      name: name.trim(), hsn_code: '', unit: unit || 'Nos',
      sale_price: Number(price), tax_rate: Number(tax_rate || 18),
      qty: Number(qty), is_custom: true,
    }]);
    setCustomOpen(false);
  }

  function setQty(cart_id, qty) {
    setCart((c) => c.map((x) => x.cart_id === cart_id ? { ...x, qty: Math.max(0.01, qty) } : x));
  }
  function setPrice(cart_id, price) {
    setCart((c) => c.map((x) => x.cart_id === cart_id ? { ...x, sale_price: Math.max(0, price) } : x));
  }
  function setName(cart_id, name) {
    setCart((c) => c.map((x) => x.cart_id === cart_id ? { ...x, name } : x));
  }
  function remove(cart_id) { setCart((c) => c.filter((x) => x.cart_id !== cart_id)); }
  function clear() { setCart([]); setDiscount(0); setCustomer({ id: null, name: '' }); setEditing(null); }

  async function checkout(mode) {
    if (cart.length === 0) return;
    try {
      const payload = {
        type: 'sale',
        date: todayISO(),
        party_id: customer.id || null,
        party_name: customer.name?.trim() || 'Walk-in customer',
        interstate,
        discount,
        status: 'paid',
        notes: 'POS sale',
        items: cart.map((c) => ({
          product_id: c.product_id || null,
          name: c.name,
          hsn_code: c.hsn_code || '',
          qty: c.qty,
          unit: c.unit,
          rate: c.sale_price,
          tax_rate: c.tax_rate,
          serials: c.has_serial ? (c.serials || []).map((s) => String(s).trim()).filter(Boolean) : [],
        })),
      };
      const inv = await api.post('/invoices', payload);
      await api.post('/payments', {
        invoice_id: inv.id, party_id: inv.party_id, amount: inv.total, date: todayISO(), mode, reference: 'POS',
      });
      toast.success(`Sale ${inv.no} completed`);
      setLastReceipt(inv);
      clear();
      setPayOpen(false);
      api.get('/products?all=1').then(setProducts);
    } catch (e) { toast.error(e.message); }
  }

  return (
    <div>
      <PageHeader title="Point of Sale" subtitle="Quick billing for walk-in customers" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 card">
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input className="input pl-9" placeholder="Search products by name or SKU…" value={search} onChange={(e) => setSearch(e.target.value)} autoFocus />
            </div>
            <Button variant="secondary" onClick={() => setCustomOpen(true)} className="shrink-0 justify-center">
              <Plus size={14} /> Custom Item
            </Button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[55vh] sm:max-h-[68vh] overflow-y-auto pr-1">
            {filtered.map((p) => (
              <button
                key={p.id}
                onClick={() => addToCart(p)}
                className="text-left bg-white border border-cardBorder rounded-xl p-3 min-h-[88px] hover:border-amber hover:shadow-card active:scale-[0.98] transition group"
              >
                <div className="font-bold text-sm text-navy line-clamp-2">{p.name}</div>
                <div className="text-xs text-slate-400 font-mono mt-1">{p.sku}</div>
                <div className="flex items-center justify-between mt-2">
                  <div className="text-amber font-extrabold">{formatINR(p.sale_price)}</div>
                  <div className={`text-[11px] ${p.stock <= p.min_stock ? 'text-rose-600 font-bold' : 'text-slate-400'}`}>Stock: {p.stock}</div>
                </div>
              </button>
            ))}
            {filtered.length === 0 && <div className="col-span-full text-center text-sm text-slate-400 py-12">No products match</div>}
          </div>
        </div>

        <div className="card flex flex-col min-h-[60vh] lg:h-[calc(100vh-180px)]">
          <div className="mb-3">
            <PartyPicker
              label={null}
              parties={parties}
              value={customer}
              onChange={({ id, name }) => setCustomer({ id: id || null, name })}
              placeholder="Customer name (or leave blank for walk-in)"
            />
          </div>
          <div className="flex-1 overflow-y-auto -mx-2 px-2 divide-y divide-slate-100">
            {cart.length === 0 ? (
              <div className="text-center text-sm text-slate-400 py-12">Cart is empty</div>
            ) : (
              cart.map((it) => {
                const isOpen = editing === it.cart_id;
                const lineTotal = (calc.items.find((_, i) => cart[i]?.cart_id === it.cart_id)?.total) || 0;
                return (
                  <div key={it.cart_id} className="py-3 space-y-2">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        {isOpen && it.is_custom ? (
                          <input className="input py-1 text-sm font-semibold" value={it.name} onChange={(e) => setName(it.cart_id, e.target.value)} placeholder="Item name" />
                        ) : (
                          <div className="font-semibold text-navy text-sm line-clamp-1 flex items-center gap-1">
                            {it.name}
                            {it.is_custom && <span className="text-[9px] uppercase tracking-wider bg-amber/20 text-amber-700 px-1.5 py-0.5 rounded">custom</span>}
                          </div>
                        )}
                        <div className="text-xs text-slate-400">{formatINR(it.sale_price)} × {it.qty} = <span className="text-navy font-semibold">{formatINR(lineTotal)}</span></div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button className="w-9 h-9 rounded-lg bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-navy flex items-center justify-center" onClick={() => setQty(it.cart_id, it.qty - 1)} title="Decrease qty"><Minus size={14} /></button>
                        <input type="number" min="0.01" step="0.01" className="w-14 text-center input py-1 px-1 text-sm" value={it.qty} onChange={(e) => setQty(it.cart_id, parseFloat(e.target.value) || 0)} />
                        <button className="w-9 h-9 rounded-lg bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-navy flex items-center justify-center" onClick={() => setQty(it.cart_id, it.qty + 1)} title="Increase qty"><Plus size={14} /></button>
                        <button className={`w-9 h-9 rounded-lg flex items-center justify-center ml-1 ${isOpen ? 'bg-amber/20 text-amber-700' : 'text-slate-400 hover:bg-slate-100 active:bg-slate-200'}`} onClick={() => setEditing(isOpen ? null : it.cart_id)} title="Adjust price"><Edit3 size={14} /></button>
                        <button className="w-9 h-9 rounded-lg text-rose-500 hover:bg-rose-50 active:bg-rose-100 flex items-center justify-center" onClick={() => remove(it.cart_id)} title="Remove"><Trash2 size={14} /></button>
                      </div>
                    </div>
                    {isOpen && (
                      <div className="flex gap-2 items-end pl-1">
                        <div className="flex-1">
                          <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">Price ₹</div>
                          <input type="number" min="0" step="0.01" className="input py-1 text-sm" value={it.sale_price} onChange={(e) => setPrice(it.cart_id, parseFloat(e.target.value) || 0)} />
                        </div>
                        {gstOn && (
                          <div className="flex-1">
                            <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">Tax %</div>
                            <select className="input py-1 text-sm" value={it.tax_rate} onChange={(e) => setCart((c) => c.map((x) => x.cart_id === it.cart_id ? { ...x, tax_rate: parseFloat(e.target.value) } : x))}>
                              {TAX_RATES.map((t) => <option key={t} value={t}>{t}%</option>)}
                            </select>
                          </div>
                        )}
                      </div>
                    )}
                    {it.has_serial && (
                      <div className="pl-1">
                        <div className="text-[10px] uppercase tracking-wider text-amber-700 font-bold mb-0.5">
                          Serial / IMEI · {(it.serials || []).filter((s) => String(s).trim()).length}/{it.qty}
                        </div>
                        <textarea
                          rows={Math.min(Math.max(it.qty, 1), 4)}
                          className="input py-1 text-xs font-mono bg-amber-50/50"
                          placeholder={`Enter ${it.qty} serial(s), one per line`}
                          value={(it.serials || []).join('\n')}
                          onChange={(e) => setSerials(it.cart_id, e.target.value.split('\n').map((s) => s.replace(/\r/g, '')))}
                        />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 space-y-2 text-sm">
            <div className="flex items-center justify-between"><span className="text-slate-500">Subtotal</span><span className="font-semibold">{formatINR(calc.subtotal)}</span></div>
            {gstOn && (
              <div className="flex items-center justify-between"><span className="text-slate-500">Tax</span><span className="font-semibold">{formatINR(calc.cgst + calc.sgst + calc.igst)}</span></div>
            )}
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500">Discount</span>
              <input type="number" min="0" step="0.01" value={discount} onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)} className="input w-28 py-1 text-right" />
            </div>
            <div className="flex items-center justify-between border-t border-slate-200 pt-3">
              <span className="text-base font-bold text-navy">Total</span>
              <span className="text-3xl font-extrabold text-amber">{formatINR(calc.total)}</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-4">
            <Button variant="secondary" onClick={clear} disabled={cart.length === 0} className="justify-center"><X size={14} /> Clear</Button>
            <Button size="lg" onClick={() => setPayOpen(true)} disabled={cart.length === 0} className="col-span-2 justify-center"><Wallet size={16} /> Collect Payment</Button>
          </div>
        </div>
      </div>

      <Modal open={payOpen} onClose={() => setPayOpen(false)} title="Collect Payment" size="sm">
        <div className="text-center mb-4">
          <div className="text-xs uppercase tracking-wider text-slate-500">Total</div>
          <div className="text-4xl sm:text-5xl font-extrabold text-amber my-2">{formatINR(calc.total)}</div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {PAYMENT_MODES.slice(0, 3).map((m) => (
            <Button key={m} size="lg" variant="primary" onClick={() => checkout(m)} className="capitalize justify-center min-h-[56px]">{m}</Button>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2 mt-2">
          {PAYMENT_MODES.slice(3).map((m) => (
            <Button key={m} size="lg" variant="secondary" onClick={() => checkout(m)} className="capitalize justify-center min-h-[56px]">{m}</Button>
          ))}
        </div>
      </Modal>

      <CustomItemModal open={customOpen} onClose={() => setCustomOpen(false)} onAdd={addCustomItem} />

      {lastReceipt && (
        <Modal
          open
          onClose={() => setLastReceipt(null)}
          title={`Receipt — ${lastReceipt.no}`}
          actions={<>
            <Button variant="secondary" onClick={() => setLastReceipt(null)}>Close</Button>
            <Button variant="secondary" onClick={() => setSharingReceipt(true)} className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100"><MessageCircle size={14} /> WhatsApp</Button>
            <Button onClick={printReceipt}><Printer size={14} /> Print Receipt</Button>
          </>}
        >
          <div className="receipt-print-target">
            <ReceiptThermal invoice={lastReceipt} settings={settings} />
          </div>
        </Modal>
      )}

      <WhatsAppShareDialog
        open={sharingReceipt}
        onClose={() => setSharingReceipt(false)}
        invoice={lastReceipt}
        settings={settings}
      />
    </div>
  );
}

function CustomItemModal({ open, onClose, onAdd }) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [qty, setQty] = useState(1);
  const [taxRate, setTaxRate] = useState(18);
  const [unit, setUnit] = useState('Nos');

  useEffect(() => {
    if (open) { setName(''); setPrice(''); setQty(1); setTaxRate(18); setUnit('Nos'); }
  }, [open]);

  function submit() {
    if (!name.trim()) { toast.error('Item name required'); return; }
    const p = parseFloat(price);
    const q = parseFloat(qty);
    if (!(p >= 0)) { toast.error('Valid price required'); return; }
    if (!(q > 0)) { toast.error('Quantity must be greater than 0'); return; }
    onAdd({ name, price: p, qty: q, tax_rate: taxRate, unit });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add custom item"
      size="sm"
      actions={<>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={submit}><Plus size={14} /> Add to cart</Button>
      </>}
    >
      <div className="space-y-3">
        <Input label="Item name *" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Service charge / Bulk discount item" />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Price ₹ *" type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" />
          <Input label="Quantity *" type="number" min="0.01" step="0.01" value={qty} onChange={(e) => setQty(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Select label="Unit" value={unit} onChange={(e) => setUnit(e.target.value)}>
            {UNITS.map((u) => <option key={u}>{u}</option>)}
          </Select>
          <Select label="Tax rate" value={taxRate} onChange={(e) => setTaxRate(parseFloat(e.target.value))}>
            {TAX_RATES.map((t) => <option key={t} value={t}>{t}%</option>)}
          </Select>
        </div>
        <p className="text-xs text-slate-500">This won't be saved as a product — it's a one-off line for this bill only. Use the pencil icon on any cart row to adjust its price too.</p>
      </div>
    </Modal>
  );
}

function ReceiptThermal({ invoice, settings }) {
  const logoSrc = settings.logoUrl || null; // only show if owner uploaded one
  const fullAddress = [settings.address, settings.city, settings.pincode && `- ${settings.pincode}`, settings.stateName]
    .filter(Boolean).join(', ');
  return (
    <div className="bg-white text-navy mx-auto print:p-0" style={{ width: '80mm', fontSize: 11, fontFamily: 'monospace' }}>
      <div className="text-center pb-2 mb-2 border-b border-slate-300">
        {logoSrc && (
          <div className="flex justify-center mb-1">
            <img src={logoSrc} alt="" style={{ maxHeight: 42, maxWidth: '60mm', objectFit: 'contain' }} />
          </div>
        )}
        <div className="font-bold text-sm">{settings.businessName || 'Your Business'}</div>
        {fullAddress && <div className="text-[9px] leading-snug mt-0.5">{fullAddress}</div>}
        {settings.phone && <div className="text-[9px]">Tel: {settings.phone}</div>}
        {(settings.email || settings.website) && (
          <div className="text-[9px]">{[settings.email, settings.website].filter(Boolean).join(' · ')}</div>
        )}
        {gstIsEnabled(settings) && settings.gstin && <div className="text-[9px] mt-0.5"><span className="font-bold">GSTIN:</span> {settings.gstin}</div>}
      </div>
      <div className="text-[10px] mb-2 space-y-0.5">
        <div className="flex justify-between"><span className="font-bold">Receipt #</span><span>{invoice.no}</span></div>
        <div className="flex justify-between"><span className="font-bold">Date</span><span>{invoice.date}</span></div>
        <div className="flex justify-between"><span className="font-bold">Customer</span><span className="text-right">{invoice.party_name || 'Walk-in customer'}</span></div>
      </div>
      <div className="border-t border-b border-slate-300 py-1 mb-1">
        {invoice.items.map((it, i) => (
          <div key={i} className="text-[10px] py-0.5">
            <div className="font-semibold">{it.name}</div>
            <div className="flex justify-between text-slate-600"><span>{it.qty} {it.unit} × {formatINR(it.rate)}</span><span>{formatINR(it.total)}</span></div>
          </div>
        ))}
      </div>
      <div className="space-y-0.5 text-[10px]">
        <div className="flex justify-between"><span>Subtotal</span><span>{formatINR(invoice.subtotal)}</span></div>
        {gstIsEnabled(settings) && (invoice.interstate
          ? <div className="flex justify-between"><span>IGST</span><span>{formatINR(invoice.igst_total)}</span></div>
          : (<>
            <div className="flex justify-between"><span>CGST</span><span>{formatINR(invoice.cgst_total)}</span></div>
            <div className="flex justify-between"><span>SGST</span><span>{formatINR(invoice.sgst_total)}</span></div>
          </>))}
        {invoice.discount > 0 && <div className="flex justify-between"><span>Discount</span><span>-{formatINR(invoice.discount)}</span></div>}
        <div className="flex justify-between font-bold border-t border-slate-300 pt-1 mt-1 text-sm"><span>TOTAL</span><span>{formatINR(invoice.total)}</span></div>
      </div>
      <div className="text-center text-[10px] mt-3 pt-2 border-t border-slate-300 leading-snug">
        Dhanyawad! Phir Aaiye 🙏
        {settings.website && <div className="text-[9px] mt-1">{settings.website}</div>}
        <div className="text-[9px] mt-1 text-slate-500">Powered by Muneem Ji</div>
      </div>
    </div>
  );
}
