/**
 * server/utils/studentCardSecurity.mjs
 * 
 * Modul enkripsi & verifikasi tanda tangan digital untuk Kartu Pelajar SMK Karya Guna 2.
 * Menggunakan AES-256-GCM (Authenticated Encryption) agar:
 * 1. NIS siswa di URL tidak dapat dilihat (rahasia/terenkripsi).
 * 2. URL validasi tidak dapat dimanipulasi atau diubah-ubah secara manual (anti-tamper).
 * 3. Mencegah scraping / enumerasi NIS siswa lain.
 */

import crypto from 'node:crypto';

const CARD_SECRET_KEY = process.env.CARD_SECRET_KEY || process.env.JWT_SECRET || 'KURMON_SMK_KG2_STUDENT_CARD_SECRET_KEY_2026';
const DERIVED_KEY = crypto.createHash('sha256').update(CARD_SECRET_KEY).digest();

/**
 * Menghasilkan token terenkripsi dan terotentikasi (AES-256-GCM) untuk QR Code kartu pelajar.
 * @param {string|number} nis - NIS siswa
 * @returns {string} base64url token
 */
export function generateStudentCardToken(nis) {
  if (!nis) return '';
  const cleanNis = String(nis).trim();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', DERIVED_KEY, iv);

  const payload = JSON.stringify({
    nis: cleanNis,
    school: 'smkkg2',
    iat: Math.floor(Date.now() / 1000)
  });

  const encrypted = Buffer.concat([cipher.update(payload, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  // Susunan buffer: [IV (12B)] + [Auth Tag (16B)] + [Ciphertext]
  const combined = Buffer.concat([iv, tag, encrypted]);
  return combined.toString('base64url');
}

/**
 * Mendekripsi dan memverifikasi token dari QR Code kartu pelajar.
 * Jika token diubah/dimanipulasi walau 1 karakter, autentikasi GCM akan gagal (throw).
 * @param {string} token - base64url token
 * @returns {{ valid: boolean, nis?: string, iat?: number, error?: string }}
 */
export function verifyStudentCardToken(token) {
  if (!token || typeof token !== 'string') {
    return { valid: false, error: 'Token tidak boleh kosong' };
  }

  try {
    const combined = Buffer.from(token.trim(), 'base64url');
    if (combined.length < 29) {
      return { valid: false, error: 'Format token tidak valid' };
    }

    const iv = combined.subarray(0, 12);
    const tag = combined.subarray(12, 28);
    const encrypted = combined.subarray(28);

    const decipher = crypto.createDecipheriv('aes-256-gcm', DERIVED_KEY, iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
    const data = JSON.parse(decrypted);

    if (!data.nis) {
      return { valid: false, error: 'Payload token tidak valid' };
    }

    return { valid: true, nis: String(data.nis), iat: data.iat };
  } catch (err) {
    // Autentikasi GCM gagal karena token tidak cocok atau dimanipulasi
    return { valid: false, error: 'Tanda tangan digital kartu tidak valid atau telah dimodifikasi' };
  }
}
