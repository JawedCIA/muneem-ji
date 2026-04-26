import { useEffect, useMemo, useState } from 'react';
import { MessageCircle, FileDown, Link2 } from 'lucide-react';
import Modal from '../ui/Modal.jsx';
import Button from '../ui/Button.jsx';
import { Input, Textarea } from '../ui/Input.jsx';
import { api } from '../../utils/api.js';
import { formatINR } from '../../utils/format.js';
import { toast } from '../../store/toast.js';
import {
  buildShareMessage, getShareTemplate, normalizePhone,
} from '../../utils/whatsapp.js';
import { canShareFiles, sharePdfFile } from '../../utils/share.js';

// Confirms phone + message before opening WhatsApp.
// Pre-fills the customer's phone from the linked party, but lets the shop
// owner edit it (e.g. for a Walk-in customer where they typed a name only).
export default function WhatsAppShareDialog({ open, onClose, invoice, settings }) {
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sharingPdf, setSharingPdf] = useState(false);
  const pdfShareSupported = useMemo(() => canShareFiles(), []);

  useEffect(() => {
    if (!open || !invoice) return;
    let cancelled = false;
    setLoading(true);
    setPhone(''); setToken(null);
    (async () => {
      try {
        // 1. Reserve a share token (and write the audit row eagerly so we have
        //    a record even if the user never hits Send — share intent is itself useful).
        const { share_token } = await api.post(`/invoices/${invoice.id}/share`, { channel: 'whatsapp' });
        if (cancelled) return;
        setToken(share_token);

        // 2. Pre-fill phone from the party record, if any.
        let partyPhone = '';
        if (invoice.party_id) {
          try {
            const p = await api.get(`/parties/${invoice.party_id}`);
            partyPhone = p?.phone || '';
          } catch { /* ignore — keep phone blank */ }
        }
        if (cancelled) return;
        setPhone(partyPhone);
      } catch (e) {
        toast.error('Could not prepare share: ' + e.message);
        if (!cancelled) onClose();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, invoice, onClose]);

  // Recompute the message preview whenever inputs change.
  useEffect(() => {
    if (!invoice || !token) return;
    const link = `${window.location.origin}${invoice.type === 'quotation' ? `/q/${token}` : `/i/${token}`}`;
    const tmpl = getShareTemplate(settings);
    setMessage(buildShareMessage(tmpl, {
      customer: invoice.party_name || 'there',
      kind: invoice.type === 'quotation' ? 'quotation' : 'invoice',
      number: invoice.no,
      amount: formatINR(invoice.total),
      business: settings?.businessName || 'us',
      link,
    }));
  }, [invoice, token, settings]);

  function sendLink() {
    if (!message) return;
    setSending(true);
    const normalized = normalizePhone(phone);
    const url = normalized
      ? `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'noopener');
    setSending(false);
    onClose();
  }

  // Native OS share sheet path (mobile only). Generates the PDF in-browser, hands
  // it + the message to navigator.share — the customer picks WhatsApp themselves
  // and the PDF arrives as a real attachment.
  async function sendPdf() {
    if (!invoice) return;
    setSharingPdf(true);
    try {
      const shared = await sharePdfFile({
        invoice,
        settings,
        message,
        title: `${invoice.type === 'quotation' ? 'Quotation' : 'Invoice'} ${invoice.no}`,
      });
      if (shared) {
        // Log the PDF share separately so the audit log distinguishes link vs file shares.
        try { await api.post(`/invoices/${invoice.id}/share`, { channel: 'whatsapp', to: 'pdf-attach' }); } catch {}
        onClose();
      }
    } catch (e) {
      toast.error('Could not share PDF: ' + (e.message || e));
    } finally {
      setSharingPdf(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={<span className="inline-flex items-center gap-2"><MessageCircle size={18} className="text-emerald-500" /> Share via WhatsApp</span>}
      actions={<>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        {pdfShareSupported && (
          <Button onClick={sendPdf} disabled={loading || sharingPdf} className="bg-emerald-500 hover:bg-emerald-600">
            <FileDown size={14} /> {sharingPdf ? 'Preparing…' : 'Send PDF'}
          </Button>
        )}
        <Button
          onClick={sendLink}
          disabled={loading || sending || !message}
          className={pdfShareSupported ? '' : 'bg-emerald-500 hover:bg-emerald-600'}
          variant={pdfShareSupported ? 'secondary' : undefined}
        >
          <Link2 size={14} /> {sending ? 'Opening…' : 'Send Link'}
        </Button>
      </>}
    >
      {loading ? (
        <div className="text-sm text-slate-500">Preparing share…</div>
      ) : (
        <div className="space-y-3">
          {pdfShareSupported && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-[12px] text-emerald-800">
              <strong>Send PDF</strong> opens your phone's share sheet — pick WhatsApp and the {invoice?.type === 'quotation' ? 'quotation' : 'invoice'} arrives as a PDF attachment.
              <br /><strong>Send Link</strong> opens WhatsApp with a view-online link instead.
            </div>
          )}
          <Input
            label="Customer phone (optional)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91 98765 43210"
            hint={pdfShareSupported ? 'Phone is used only by Send Link (PDF share lets you pick a contact inside WhatsApp).' : 'Leave blank to pick a contact inside WhatsApp.'}
          />
          <Textarea
            label="Message"
            rows="5"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <p className="text-[11px] text-slate-400">
            Anyone with the link can view this {invoice?.type === 'quotation' ? 'quotation' : 'invoice'}.
            The link uses a private token — share only with the customer.
          </p>
        </div>
      )}
    </Modal>
  );
}
