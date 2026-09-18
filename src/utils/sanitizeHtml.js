/**
 * sanitizeHtml — Utility sanitasi HTML sederhana tanpa dependensi eksternal.
 *
 * FE-SEC-B FIX: Digunakan untuk membersihkan nilai yang di-render via
 * dangerouslySetInnerHTML (footerDescription, footerText) agar tidak bisa
 * mengandung skrip berbahaya meskipun akun admin dicompromise.
 *
 * Pendekatan: Allowlist tag + hapus atribut berbahaya.
 */

// Tag HTML yang diizinkan (hanya formatting & link dasar)
const ALLOWED_TAGS = new Set([
  'b', 'strong', 'i', 'em', 'u', 's', 'del', 'ins',
  'br', 'p', 'span', 'small', 'sup', 'sub',
  'ul', 'ol', 'li',
  'a', 'abbr',
]);

/**
 * Sanitize string HTML — hapus tag berbahaya dan event handler attributes.
 * @param {string} html - Raw HTML string dari DB/user input
 * @returns {string} - HTML bersih yang aman untuk di-render
 */
export function sanitizeHtml(html) {
  if (!html || typeof html !== 'string') return '';

  // 1. Hapus seluruh blok <script>, <style>, dan comment HTML
  let clean = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');

  // 2. Hapus semua tag yang tidak ada di allowlist, dan strip atribut berbahaya dari tag yang lolos
  clean = clean.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g, (match, tagName) => {
    if (ALLOWED_TAGS.has(tagName.toLowerCase())) {
      // Tag diizinkan — hapus semua event handler attribute (on*)
      return match.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '');
    }
    // Tag tidak di-allowlist — buang seluruh tag
    return '';
  });

  // 3. Hapus sisa referensi javascript: URL
  clean = clean.replace(/javascript\s*:/gi, '');

  return clean;
}

/**
 * Helper shorthand untuk dangerouslySetInnerHTML yang sudah di-sanitize:
 *   <span {...safeHtml(value)} />
 */
export function safeHtml(html) {
  return { dangerouslySetInnerHTML: { __html: sanitizeHtml(html) } };
}
