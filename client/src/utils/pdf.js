import { pdf, Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { formatINR, formatDate } from './format.js';
import { gstIsEnabled } from '../store/settings.js';
import React from 'react';

const styles = StyleSheet.create({
  page: { padding: 32, fontFamily: 'Helvetica', fontSize: 9, color: '#1a2b5e' },
  header: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 2, borderBottomColor: '#1a2b5e', paddingBottom: 14, marginBottom: 14 },
  brandRow: { flexDirection: 'row', alignItems: 'flex-start', flex: 1 },
  logo: { width: 56, height: 56, marginRight: 12, objectFit: 'contain' },
  bizName: { fontSize: 17, fontWeight: 'bold', color: '#1a2b5e' },
  bizMeta: { fontSize: 8, color: '#475569', marginTop: 2 },
  bizMetaBold: { fontSize: 8, color: '#1a2b5e', fontWeight: 'bold', marginTop: 2 },
  invTitle: { fontSize: 9, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 },
  invNo: { fontSize: 18, fontWeight: 'bold', color: '#1a2b5e' },
  twoCol: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  label: { fontSize: 7, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  value: { fontSize: 11, fontWeight: 'bold', color: '#1a2b5e' },
  pill: { backgroundColor: '#f1f5f9', color: '#475569', fontSize: 8, paddingTop: 3, paddingBottom: 3, paddingLeft: 8, paddingRight: 8, borderRadius: 10 },
  table: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 4, marginBottom: 14 },
  thead: { flexDirection: 'row', backgroundColor: '#1a2b5e', padding: 6 },
  th: { color: '#fff', fontSize: 8, fontWeight: 'bold', textTransform: 'uppercase' },
  trow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#f1f5f9', padding: 6 },
  td: { fontSize: 9, color: '#374151' },
  totals: { width: '40%', alignSelf: 'flex-end', backgroundColor: '#f8fafc', padding: 10, borderRadius: 4 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  grand: { borderTopWidth: 1, borderTopColor: '#cbd5e1', paddingTop: 6, marginTop: 4, flexDirection: 'row', justifyContent: 'space-between' },
  grandLabel: { fontSize: 12, fontWeight: 'bold', color: '#1a2b5e' },
  grandValue: { fontSize: 14, fontWeight: 'bold', color: '#1a2b5e' },
  notes: { marginTop: 14, fontSize: 8, color: '#64748b' },
  footer: { position: 'absolute', bottom: 20, left: 32, right: 32, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#e2e8f0', textAlign: 'center', fontSize: 7, color: '#94a3b8' },
});

function joinNonEmpty(parts, sep = ' · ') {
  return parts.filter(Boolean).join(sep);
}

function InvoiceDoc({ invoice, settings, logoSrc }) {
  const gstOn = gstIsEnabled(settings);
  const fullAddress = [
    settings.address,
    settings.city,
    settings.pincode && `- ${settings.pincode}`,
    settings.stateName,
  ].filter(Boolean).join(', ');
  const contactLine = joinNonEmpty([
    settings.phone && `Tel: ${settings.phone}`,
    settings.email,
    settings.website,
  ]);
  const taxLine = joinNonEmpty([
    gstOn && settings.gstin && `GSTIN: ${settings.gstin}`,
    settings.pan && `PAN: ${settings.pan}`,
  ]);

  return React.createElement(Document, {},
    React.createElement(Page, { size: 'A4', style: styles.page },
      React.createElement(View, { style: styles.header },
        React.createElement(View, { style: styles.brandRow },
          logoSrc && React.createElement(Image, { src: logoSrc, style: styles.logo }),
          React.createElement(View, { style: { flex: 1 } },
            React.createElement(Text, { style: styles.bizName }, settings.businessName || 'Your Business'),
            fullAddress && React.createElement(Text, { style: styles.bizMeta }, fullAddress),
            contactLine && React.createElement(Text, { style: styles.bizMeta }, contactLine),
            taxLine && React.createElement(Text, { style: styles.bizMetaBold }, taxLine),
          ),
        ),
        React.createElement(View, { style: { alignItems: 'flex-end' } },
          React.createElement(Text, { style: styles.invTitle }, invoice.type === 'quotation' ? 'Quotation' : (gstOn ? 'Tax Invoice' : 'Invoice')),
          React.createElement(Text, { style: styles.invNo }, invoice.no),
          React.createElement(Text, { style: { fontSize: 8, color: '#475569', marginTop: 6 } }, `Date: ${formatDate(invoice.date)}`),
          invoice.due_date && React.createElement(Text, { style: { fontSize: 8, color: '#475569', marginTop: 2 } }, `${invoice.type === 'quotation' ? 'Expires' : 'Due'}: ${formatDate(invoice.due_date)}`),
        ),
      ),

      React.createElement(View, { style: styles.twoCol },
        React.createElement(View, {},
          React.createElement(Text, { style: styles.label }, 'Bill To'),
          React.createElement(Text, { style: styles.value }, invoice.party_name || 'Walk-in customer'),
        ),
        gstOn && React.createElement(View, { style: { alignItems: 'flex-end' } },
          React.createElement(Text, { style: styles.pill }, invoice.interstate ? 'IGST (Interstate)' : 'CGST + SGST (Intrastate)'),
        ),
      ),

      React.createElement(View, { style: styles.table },
        gstOn
          ? React.createElement(View, { style: styles.thead },
              React.createElement(Text, { style: [styles.th, { width: '5%' }] }, '#'),
              React.createElement(Text, { style: [styles.th, { width: '40%' }] }, 'Item'),
              React.createElement(Text, { style: [styles.th, { width: '12%' }] }, 'HSN'),
              React.createElement(Text, { style: [styles.th, { width: '10%', textAlign: 'right' }] }, 'Qty'),
              React.createElement(Text, { style: [styles.th, { width: '13%', textAlign: 'right' }] }, 'Rate'),
              React.createElement(Text, { style: [styles.th, { width: '8%', textAlign: 'right' }] }, 'Tax'),
              React.createElement(Text, { style: [styles.th, { width: '12%', textAlign: 'right' }] }, 'Amount'),
            )
          : React.createElement(View, { style: styles.thead },
              React.createElement(Text, { style: [styles.th, { width: '5%' }] }, '#'),
              React.createElement(Text, { style: [styles.th, { width: '55%' }] }, 'Item'),
              React.createElement(Text, { style: [styles.th, { width: '12%', textAlign: 'right' }] }, 'Qty'),
              React.createElement(Text, { style: [styles.th, { width: '14%', textAlign: 'right' }] }, 'Rate'),
              React.createElement(Text, { style: [styles.th, { width: '14%', textAlign: 'right' }] }, 'Amount'),
            ),
        ...(invoice.items || []).map((it, i) => {
          const itemCell = it.serials?.length
            ? React.createElement(View, { style: { flexDirection: 'column' } },
                React.createElement(Text, { style: { fontWeight: 'bold' } }, it.name),
                React.createElement(Text, { style: { fontSize: 7, color: '#64748b', marginTop: 2 } },
                  `S/N: ${it.serials.join(', ')}`
                ),
              )
            : React.createElement(Text, { style: { fontWeight: 'bold' } }, it.name);
          return gstOn
            ? React.createElement(View, { style: styles.trow, key: i },
                React.createElement(Text, { style: [styles.td, { width: '5%' }] }, String(i + 1)),
                React.createElement(View, { style: [styles.td, { width: '40%' }] }, itemCell),
                React.createElement(Text, { style: [styles.td, { width: '12%' }] }, it.hsn_code || '—'),
                React.createElement(Text, { style: [styles.td, { width: '10%', textAlign: 'right' }] }, `${it.qty} ${it.unit}`),
                React.createElement(Text, { style: [styles.td, { width: '13%', textAlign: 'right' }] }, formatINR(it.rate)),
                React.createElement(Text, { style: [styles.td, { width: '8%', textAlign: 'right' }] }, `${it.tax_rate}%`),
                React.createElement(Text, { style: [styles.td, { width: '12%', textAlign: 'right', fontWeight: 'bold' }] }, formatINR(it.total)),
              )
            : React.createElement(View, { style: styles.trow, key: i },
                React.createElement(Text, { style: [styles.td, { width: '5%' }] }, String(i + 1)),
                React.createElement(View, { style: [styles.td, { width: '55%' }] }, itemCell),
                React.createElement(Text, { style: [styles.td, { width: '12%', textAlign: 'right' }] }, `${it.qty} ${it.unit}`),
                React.createElement(Text, { style: [styles.td, { width: '14%', textAlign: 'right' }] }, formatINR(it.rate)),
                React.createElement(Text, { style: [styles.td, { width: '14%', textAlign: 'right', fontWeight: 'bold' }] }, formatINR(it.total)),
              );
        }),
      ),

      React.createElement(View, { style: styles.totals },
        React.createElement(View, { style: styles.totalRow },
          React.createElement(Text, { style: { color: '#64748b' } }, 'Subtotal'),
          React.createElement(Text, { style: { fontWeight: 'bold' } }, formatINR(invoice.subtotal)),
        ),
        gstOn && (invoice.interstate
          ? React.createElement(View, { style: styles.totalRow },
              React.createElement(Text, { style: { color: '#64748b' } }, 'IGST'),
              React.createElement(Text, { style: { fontWeight: 'bold' } }, formatINR(invoice.igst_total)),
            )
          : React.createElement(View, {},
              React.createElement(View, { style: styles.totalRow },
                React.createElement(Text, { style: { color: '#64748b' } }, 'CGST'),
                React.createElement(Text, { style: { fontWeight: 'bold' } }, formatINR(invoice.cgst_total)),
              ),
              React.createElement(View, { style: styles.totalRow },
                React.createElement(Text, { style: { color: '#64748b' } }, 'SGST'),
                React.createElement(Text, { style: { fontWeight: 'bold' } }, formatINR(invoice.sgst_total)),
              ),
            )),
        invoice.discount > 0 && React.createElement(View, { style: styles.totalRow },
          React.createElement(Text, { style: { color: '#64748b' } }, 'Discount'),
          React.createElement(Text, { style: { fontWeight: 'bold' } }, `− ${formatINR(invoice.discount)}`),
        ),
        React.createElement(View, { style: styles.grand },
          React.createElement(Text, { style: styles.grandLabel }, 'Grand Total'),
          React.createElement(Text, { style: styles.grandValue }, formatINR(invoice.total)),
        ),
      ),

      invoice.notes && React.createElement(View, { style: styles.notes },
        React.createElement(Text, { style: { fontWeight: 'bold', color: '#1a2b5e', marginBottom: 4 } }, 'Notes'),
        React.createElement(Text, {}, invoice.notes),
      ),

      React.createElement(View, { style: styles.footer, fixed: true },
        React.createElement(Text, {}, joinNonEmpty([settings.businessName, settings.phone, settings.email, settings.website])),
        React.createElement(Text, { style: { marginTop: 2 } }, 'Generated by Muneem Ji · Aapka Digital Muneem'),
      ),
    ),
  );
}

async function fetchAsDataUrl(url) {
  try {
    const res = await fetch(url, { credentials: 'include' });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  } catch { return null; }
}

// Render the invoice/quotation as a PDF Blob. Used by both the download flow
// and the WhatsApp PDF-share flow (which wraps it in a File for Web Share API).
export async function generateInvoicePdfBlob(invoice, settings) {
  // Prefer the uploaded business logo, fall back to the default Muneem Ji logo.
  // Public viewer pages send `branding` (the whitelisted settings subset) here
  // — same shape as `settings`, so no special-casing needed.
  const logoUrl = settings?.logoUrl || '/logo.png';
  const logoSrc = await fetchAsDataUrl(logoUrl) || await fetchAsDataUrl('/logo.png');
  return await pdf(InvoiceDoc({ invoice, settings: settings || {}, logoSrc })).toBlob();
}

export function pdfFilename(invoice) {
  return `${invoice.no || 'invoice'}.pdf`;
}

export async function generateInvoicePDF(invoice, settings) {
  const blob = await generateInvoicePdfBlob(invoice, settings);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = pdfFilename(invoice);
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
