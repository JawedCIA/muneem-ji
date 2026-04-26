// Web Share API helpers — the bridge between our PDF generator and the OS share sheet.
//
// Browser support landscape (2026):
//   - Android Chrome / Edge: full support, including files. ✅ Picks WhatsApp from share sheet.
//   - iOS Safari 15.4+: full support, including files. ✅
//   - Desktop: Chrome on macOS supports share; Linux/Windows usually don't. We feature-detect
//     and fall back to "open WhatsApp Web with link" silently.

import { generateInvoicePdfBlob, pdfFilename } from './pdf.js';

/** True if this browser can share files via navigator.share — i.e. mobile WhatsApp attach works. */
export function canShareFiles() {
  if (typeof navigator === 'undefined' || !navigator.share || !navigator.canShare) return false;
  try {
    // probe with a 1-byte text file; canShare must accept files
    const probe = new File(['x'], 'probe.txt', { type: 'text/plain' });
    return navigator.canShare({ files: [probe] });
  } catch {
    return false;
  }
}

/**
 * Build the invoice PDF, wrap it in a File, and hand it to the OS share sheet.
 * Throws if the user cancels — caller should swallow.
 *
 * @returns {Promise<boolean>} true if the share dialog was actually shown.
 */
export async function sharePdfFile({ invoice, settings, message, title }) {
  if (!canShareFiles()) return false;
  const blob = await generateInvoicePdfBlob(invoice, settings);
  const file = new File([blob], pdfFilename(invoice), { type: 'application/pdf' });
  if (!navigator.canShare({ files: [file] })) return false;
  // Some platforms (older iOS) reject text+files together. Try with text first; if it
  // throws "NotAllowedError" we retry without text. Real user cancels surface as AbortError.
  try {
    await navigator.share({ files: [file], text: message, title });
    return true;
  } catch (e) {
    if (e?.name === 'AbortError') return false; // user cancelled — not an error
    if (e?.name === 'NotAllowedError') {
      await navigator.share({ files: [file], title });
      return true;
    }
    throw e;
  }
}
