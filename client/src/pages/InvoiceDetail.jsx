import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Printer, Download, MessageCircle, Edit2, Trash2, Wallet } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader.jsx';
import Button from '../components/ui/Button.jsx';
import { StatusBadge } from '../components/ui/Badge.jsx';
import Modal, { SlideOver } from '../components/ui/Modal.jsx';
import Confirm from '../components/ui/Confirm.jsx';
import { Input, Select, Textarea } from '../components/ui/Input.jsx';
import InvoiceForm from '../components/invoice/InvoiceForm.jsx';
import InvoicePreview from '../components/invoice/InvoicePreview.jsx';
import WhatsAppShareDialog from '../components/invoice/WhatsAppShareDialog.jsx';
import { api } from '../utils/api.js';
import { formatINR, todayISO } from '../utils/format.js';
import { useSettings } from '../store/settings.js';
import { PAYMENT_MODES } from '../utils/gst.js';
import { toast } from '../store/toast.js';
import { generateInvoicePDF } from '../utils/pdf.js';

const STATUS_OPTS = ['draft', 'sent', 'paid', 'partial', 'overdue', 'cancelled'];

export default function InvoiceDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const settings = useSettings((s) => s.settings);
  const [invoice, setInvoice] = useState(null);
  const [editing, setEditing] = useState(false);
  const [paying, setPaying] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [sharing, setSharing] = useState(false);

  async function load() {
    try {
      const inv = await api.get(`/invoices/${id}`);
      setInvoice(inv);
    } catch (e) { toast.error(e.message); }
  }
  useEffect(() => { load(); }, [id]);

  async function changeStatus(status) {
    try {
      const updated = await api.patch(`/invoices/${id}/status`, { status });
      setInvoice(updated);
      toast.success(`Status updated to ${status}`);
    } catch (e) { toast.error(e.message); }
  }

  async function del() {
    try {
      await api.delete(`/invoices/${id}`);
      toast.success('Invoice deleted');
      nav('/invoices');
    } catch (e) { toast.error(e.message); }
  }

  async function downloadPDF() {
    try {
      await generateInvoicePDF(invoice, settings);
    } catch (e) { toast.error('PDF generation failed: ' + e.message); }
  }

  if (!invoice) return <div className="text-slate-400 text-sm">Loading…</div>;

  const due = invoice.total - invoice.amount_paid;

  return (
    <div>
      <div className="no-print mb-4">
        <Link to="/invoices" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-navy">
          <ArrowLeft size={14} /> Back to invoices
        </Link>
      </div>

      <PageHeader
        title={<span className="font-mono">{invoice.no}</span>}
        subtitle={<span className="inline-flex items-center gap-2"><StatusBadge status={invoice.status} /> · {invoice.party_name || 'Walk-in'}</span>}
        actions={
          <div className="no-print flex flex-wrap items-center gap-2">
            <select className="input py-1.5 text-xs" value={invoice.status} onChange={(e) => changeStatus(e.target.value)}>
              {STATUS_OPTS.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
            <Button variant="secondary" size="sm" onClick={() => setPaying(true)} disabled={due <= 0}><Wallet size={14} /> Record Payment</Button>
            <Button variant="secondary" size="sm" onClick={() => window.print()}><Printer size={14} /> Print</Button>
            <Button variant="secondary" size="sm" onClick={downloadPDF}><Download size={14} /> PDF</Button>
            <Button variant="secondary" size="sm" onClick={() => setSharing(true)}><MessageCircle size={14} /> WhatsApp</Button>
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)}><Edit2 size={14} /> Edit</Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirmDel(true)} className="text-rose-600 hover:bg-rose-50"><Trash2 size={14} /></Button>
          </div>
        }
      />

      <InvoicePreview invoice={invoice} settings={settings} />

      {invoice.payments?.length > 0 && (
        <div className="card mt-6 no-print">
          <h3 className="text-base font-bold text-navy mb-3">Payment History</h3>
          <div className="divide-y divide-slate-100">
            {invoice.payments.map((p) => (
              <div key={p.id} className="flex justify-between items-center py-3 text-sm">
                <div>
                  <div className="font-semibold text-navy">{formatINR(p.amount)}</div>
                  <div className="text-xs text-slate-500">{p.date} · {p.mode}{p.reference ? ` · ${p.reference}` : ''}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <SlideOver open={editing} onClose={() => setEditing(false)} title={`Edit ${invoice.no}`} size="xl">
        <InvoiceForm
          type={invoice.type === 'quotation' ? 'quotation' : 'sale'}
          initial={invoice}
          onSaved={(saved) => { setEditing(false); setInvoice(saved); toast.success('Invoice updated'); }}
          onCancel={() => setEditing(false)}
        />
      </SlideOver>

      <PaymentModal
        open={paying}
        onClose={() => setPaying(false)}
        invoice={invoice}
        onSaved={() => { setPaying(false); load(); toast.success('Payment recorded'); }}
      />

      <WhatsAppShareDialog
        open={sharing}
        onClose={() => setSharing(false)}
        invoice={invoice}
        settings={settings}
      />

      <Confirm
        open={confirmDel}
        onClose={() => setConfirmDel(false)}
        onConfirm={del}
        title="Delete invoice?"
        description={`This will permanently delete ${invoice.no} and reverse stock movements. This cannot be undone.`}
        confirmText="Delete"
        danger
      />
    </div>
  );
}

function PaymentModal({ open, onClose, invoice, onSaved }) {
  const due = invoice.total - invoice.amount_paid;
  const [form, setForm] = useState({ amount: due, date: todayISO(), mode: 'cash', reference: '', notes: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm({ amount: due, date: todayISO(), mode: 'cash', reference: '', notes: '' });
  }, [open, due]);

  async function submit() {
    setSaving(true);
    try {
      await api.post('/payments', { ...form, invoice_id: invoice.id, party_id: invoice.party_id });
      onSaved?.();
    } catch (e) { toast.error(e.message); }
    finally { setSaving(false); }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Record payment for ${invoice.no}`}
      actions={<>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={submit} disabled={saving}>{saving ? 'Saving…' : 'Record Payment'}</Button>
      </>}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Input type="number" min="0" step="0.01" label="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })} hint={`Due: ${formatINR(due)}`} />
        <Input type="date" label="Date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        <Select label="Mode" value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })}>
          {PAYMENT_MODES.map((m) => <option key={m} value={m}>{m.toUpperCase()}</option>)}
        </Select>
        <Input label="Reference" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="Cheque #, UPI ID, etc." />
      </div>
      <div className="mt-3">
        <Textarea label="Notes" rows="2" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      </div>
    </Modal>
  );
}
