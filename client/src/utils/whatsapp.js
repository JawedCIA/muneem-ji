// Helpers for "Share via WhatsApp" buttons throughout the app.
//
// Strategy: register the share with the backend (gets a token, writes audit log),
// then build a public link + message and hand it to wa.me. The customer's WhatsApp
// opens with the chat pre-filled — they tap Send.
//
// Phone handling: Indian shop owners often store numbers as "9876543210" or
// "+919876543210" or "91-9876543210". wa.me wants digits only with country code.
// We assume +91 when the number looks like a 10-digit Indian mobile and no
// country code is present.

import { api } from './api.js';
import { formatINR } from './format.js';
import { toast } from '../store/toast.js';

const DEFAULT_TEMPLATE =
  'Hi {customer}, here is your {kind} {number} for {amount} from {business}. View: {link}\n\nThank you!';

export function getShareTemplate(settings) {
  return settings?.shareMessageTemplate || DEFAULT_TEMPLATE;
}

// Strip everything but digits, then prepend +91 if it looks like a bare 10-digit mobile.
export function normalizePhone(raw) {
  if (!raw) return '';
  const digits = String(raw).replace(/\D+/g, '');
  if (!digits) return '';
  if (digits.length === 10 && /^[6-9]/.test(digits)) return '91' + digits;
  if (digits.length === 11 && digits.startsWith('0') && /^0[6-9]/.test(digits)) return '91' + digits.slice(1);
  return digits; // assume already includes country code
}

export function buildShareMessage(template, vars) {
  return Object.entries(vars).reduce(
    (acc, [k, v]) => acc.replaceAll(`{${k}}`, v == null ? '' : String(v)),
    template,
  );
}

function publicLinkFor(invoice, token) {
  const path = invoice.type === 'quotation' ? `/q/${token}` : `/i/${token}`;
  return `${window.location.origin}${path}`;
}

/**
 * Share an invoice/quotation over WhatsApp.
 *
 *   - Calls POST /invoices/:id/share to ensure a token exists + log the share event.
 *   - Opens https://wa.me/<phone>?text=<msg> in a new tab; if no phone, the user
 *     picks a contact themselves inside WhatsApp.
 */
export async function shareInvoiceViaWhatsApp({ invoice, settings, phoneOverride }) {
  try {
    const { share_token } = await api.post(`/invoices/${invoice.id}/share`, {
      channel: 'whatsapp',
      to: phoneOverride || null,
    });
    const link = publicLinkFor(invoice, share_token);
    const template = getShareTemplate(settings);
    const message = buildShareMessage(template, {
      customer: invoice.party_name || 'there',
      kind: invoice.type === 'quotation' ? 'quotation' : 'invoice',
      number: invoice.no,
      amount: formatINR(invoice.total),
      business: settings?.businessName || 'us',
      link,
    });
    const phone = normalizePhone(phoneOverride);
    const url = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'noopener');
  } catch (e) {
    toast.error('Could not prepare share link: ' + e.message);
  }
}

export { DEFAULT_TEMPLATE };
