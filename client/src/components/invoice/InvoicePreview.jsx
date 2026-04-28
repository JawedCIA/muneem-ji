import { Phone, Mail, Globe, MapPin } from 'lucide-react';
import { formatINR, formatDate } from '../../utils/format.js';
import { gstIsEnabled } from '../../store/settings.js';

export default function InvoicePreview({ invoice, settings }) {
  const logoSrc = settings.logoUrl || '/logo.png';
  const gstOn = gstIsEnabled(settings);
  const fullAddress = [settings.address, settings.city, settings.pincode && `- ${settings.pincode}`, settings.stateName]
    .filter(Boolean).join(', ');

  return (
    <div className="bg-white rounded-2xl shadow-card border border-cardBorder p-8 print:shadow-none print:border-0 print:rounded-none">
      <div className="flex items-start justify-between border-b-2 border-navy pb-6 mb-6 gap-6">
        <div className="flex items-start gap-4 min-w-0 flex-1">
          <img src={logoSrc} alt={settings.businessName || 'Logo'} className="w-20 h-20 object-contain shrink-0" />
          <div className="min-w-0">
            <div className="text-2xl font-extrabold text-navy leading-tight">{settings.businessName || 'Your Business'}</div>
            <div className="text-xs text-slate-600 mt-2 space-y-1 leading-relaxed">
              {fullAddress && (
                <div className="flex items-start gap-1.5">
                  <MapPin size={11} className="mt-0.5 shrink-0 text-slate-400" />
                  <span>{fullAddress}</span>
                </div>
              )}
              <div className="flex items-center flex-wrap gap-x-3 gap-y-0.5">
                {settings.phone && <span className="inline-flex items-center gap-1"><Phone size={11} className="text-slate-400" /> {settings.phone}</span>}
                {settings.email && <span className="inline-flex items-center gap-1"><Mail size={11} className="text-slate-400" /> {settings.email}</span>}
                {settings.website && <span className="inline-flex items-center gap-1"><Globe size={11} className="text-slate-400" /> {settings.website}</span>}
              </div>
              {(gstOn && settings.gstin) || settings.pan ? (
                <div className="font-mono text-[11px] mt-1">
                  {gstOn && settings.gstin && (
                    <><span className="text-slate-500">GSTIN:</span> <span className="font-bold text-navy">{settings.gstin}</span></>
                  )}
                  {settings.pan && <span className={gstOn && settings.gstin ? 'ml-3' : ''}><span className="text-slate-500">PAN:</span> <span className="font-bold text-navy">{settings.pan}</span></span>}
                </div>
              ) : null}
            </div>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-xs uppercase tracking-wider text-slate-400 font-bold">{invoice.type === 'quotation' ? 'Quotation' : (gstOn ? 'Tax Invoice' : 'Invoice')}</div>
          <div className="text-2xl font-extrabold text-navy mt-1 font-mono">{invoice.no}</div>
          <div className="text-xs text-slate-500 mt-2">Date: <span className="font-semibold text-navy">{formatDate(invoice.date)}</span></div>
          {invoice.due_date && <div className="text-xs text-slate-500">{invoice.type === 'quotation' ? 'Expires' : 'Due'}: <span className="font-semibold text-navy">{formatDate(invoice.due_date)}</span></div>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Bill To</div>
          <div className="text-base font-bold text-navy">{invoice.party_name || 'Walk-in customer'}</div>
        </div>
        {gstOn && (
          <div className="text-right text-sm">
            <span className="inline-block bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-semibold">
              {invoice.interstate ? 'IGST (Interstate)' : 'CGST + SGST (Intrastate)'}
            </span>
          </div>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 mb-6">
        <table className="w-full text-sm">
          <thead className="bg-navy text-white text-xs">
            <tr>
              <th className="text-left px-3 py-2 font-bold">#</th>
              <th className="text-left px-3 py-2 font-bold">Item</th>
              {gstOn && <th className="text-left px-3 py-2 font-bold">HSN</th>}
              <th className="text-right px-3 py-2 font-bold">Qty</th>
              <th className="text-right px-3 py-2 font-bold">Rate</th>
              {gstOn && <th className="text-right px-3 py-2 font-bold">Tax</th>}
              <th className="text-right px-3 py-2 font-bold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items?.map((it, i) => (
              <tr key={it.id || i} className="border-t border-slate-100">
                <td className="px-3 py-2 text-slate-500">{i + 1}</td>
                <td className="px-3 py-2 text-navy font-medium">{it.name}</td>
                {gstOn && <td className="px-3 py-2 font-mono text-xs">{it.hsn_code || '—'}</td>}
                <td className="px-3 py-2 text-right">{it.qty} {it.unit}</td>
                <td className="px-3 py-2 text-right">{formatINR(it.rate)}</td>
                {gstOn && <td className="px-3 py-2 text-right">{it.tax_rate}%</td>}
                <td className="px-3 py-2 text-right font-semibold text-navy">{formatINR(it.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          {invoice.notes && (
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Notes</div>
              <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">{invoice.notes}</p>
            </div>
          )}
        </div>
        <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm">
          <Row label="Subtotal" value={formatINR(invoice.subtotal)} />
          {gstOn && (invoice.interstate ? (
            <Row label="IGST" value={formatINR(invoice.igst_total)} />
          ) : (<>
            <Row label="CGST" value={formatINR(invoice.cgst_total)} />
            <Row label="SGST" value={formatINR(invoice.sgst_total)} />
          </>))}
          {invoice.discount > 0 && <Row label="Discount" value={`− ${formatINR(invoice.discount)}`} />}
          <div className="border-t border-slate-200 pt-2 mt-2">
            <div className="flex items-center justify-between">
              <span className="text-base font-bold text-navy">Grand Total</span>
              <span className="text-xl font-extrabold text-navy">{formatINR(invoice.total)}</span>
            </div>
          </div>
          {invoice.amount_paid > 0 && (
            <>
              <Row label="Amount Paid" value={formatINR(invoice.amount_paid)} />
              <Row label="Amount Due" value={formatINR(invoice.total - invoice.amount_paid)} bold />
            </>
          )}
        </div>
      </div>

      <div className="mt-10 pt-6 border-t border-slate-200 text-center text-xs text-slate-400">
        {settings.businessName} · {settings.phone || ''} {settings.email && `· ${settings.email}`} {settings.website && `· ${settings.website}`}
        <div className="mt-1 text-[10px]">Generated by Muneem Ji · Aapka Digital Muneem</div>
      </div>
    </div>
  );
}

function Row({ label, value, bold }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500">{label}</span>
      <span className={bold ? 'font-extrabold text-navy' : 'font-semibold text-navy'}>{value}</span>
    </div>
  );
}
