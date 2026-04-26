import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, Printer, AlertCircle, Download, Share2 } from 'lucide-react';
import InvoicePreview from '../components/invoice/InvoicePreview.jsx';
import Button from '../components/ui/Button.jsx';
import { generateInvoicePDF } from '../utils/pdf.js';
import { canShareFiles, sharePdfFile } from '../utils/share.js';
import { toast } from '../store/toast.js';

// Renders a read-only invoice/quotation reachable via a public share link.
// No auth, no app chrome — designed for a customer who just tapped a WhatsApp link.
export default function PublicInvoice({ kind = 'invoice' }) {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const canShare = useMemo(() => canShareFiles(), []);

  async function downloadPdf() {
    if (!data) return;
    setBusy(true);
    try { await generateInvoicePDF(data.invoice, data.branding); }
    catch (e) { toast.error('PDF download failed: ' + e.message); }
    finally { setBusy(false); }
  }

  async function sharePdf() {
    if (!data) return;
    setBusy(true);
    try {
      await sharePdfFile({
        invoice: data.invoice,
        settings: data.branding,
        title: `${data.invoice.type === 'quotation' ? 'Quotation' : 'Invoice'} ${data.invoice.no}`,
      });
    } catch (e) { toast.error('Share failed: ' + (e.message || e)); }
    finally { setBusy(false); }
  }

  useEffect(() => {
    let cancelled = false;
    setData(null); setError(null);
    fetch(`/api/public/${kind}/${token}`, { credentials: 'omit' })
      .then(async (r) => {
        if (!r.ok) throw new Error(r.status === 404 ? 'This link is no longer valid.' : 'Could not load.');
        return r.json();
      })
      .then((d) => { if (!cancelled) setData(d); })
      .catch((e) => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, [kind, token]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-page p-6">
        <div className="card max-w-md text-center">
          <AlertCircle size={32} className="mx-auto text-rose-500" />
          <h1 className="text-lg font-bold text-navy mt-3">Link expired or invalid</h1>
          <p className="text-sm text-slate-500 mt-2">{error}</p>
          <p className="text-xs text-slate-400 mt-4">If you need this {kind}, please ask the sender for a fresh link.</p>
        </div>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-page">
        <Loader2 size={28} className="animate-spin text-amber" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-page">
      <div className="max-w-4xl mx-auto p-4 md:p-8">
        <div className="no-print flex items-center justify-between gap-3 mb-4 flex-wrap">
          <div className="text-xs text-slate-500">
            Shared by <span className="font-semibold text-navy">{data.branding.businessName || 'a Muneem Ji user'}</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {canShare && (
              <Button variant="primary" size="sm" onClick={sharePdf} disabled={busy}>
                <Share2 size={14} /> Share PDF
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={downloadPdf} disabled={busy}>
              <Download size={14} /> Download PDF
            </Button>
            <Button variant="ghost" size="sm" onClick={() => window.print()}>
              <Printer size={14} /> Print
            </Button>
          </div>
        </div>
        <InvoicePreview invoice={data.invoice} settings={data.branding} />
        <div className="no-print text-center text-[11px] text-slate-400 mt-4">
          Powered by <span className="font-semibold text-slate-500">Muneem Ji</span> · <a href="https://mannatai.com" target="_blank" rel="noopener noreferrer" className="hover:text-amber underline-offset-2 hover:underline">mannatai.com</a>
        </div>
      </div>
    </div>
  );
}
