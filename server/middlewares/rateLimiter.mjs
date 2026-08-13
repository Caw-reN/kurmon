const requestCounts = new Map();
const BLOCKED_IPS = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 150; // max 150 requests per minute per IP
const BLOCK_DURATION_MS = 5 * 60 * 1000; // 5 minutes block

// Bersihkan memory setiap menit
setInterval(() => {
  requestCounts.clear();
  const now = Date.now();
  for (const [ip, expiry] of BLOCKED_IPS.entries()) {
    if (now > expiry) {
      BLOCKED_IPS.delete(ip);
    }
  }
}, RATE_LIMIT_WINDOW_MS);

/**
 * Memeriksa apakah IP klien melebihi batas request.
 * Jika ya, kembalikan true (yang berarti request harus diblokir).
 */
export function isRateLimited(req) {
  const ip = req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown';
  
  // Lewati pengecekan jika IP unknown (misal proxy lokal)
  if (ip === 'unknown') return false;

  const now = Date.now();
  
  // Periksa apakah IP sedang diblokir
  if (BLOCKED_IPS.has(ip)) {
    const expiry = BLOCKED_IPS.get(ip);
    if (now < expiry) {
      return true;
    } else {
      // Waktu blokir sudah habis
      BLOCKED_IPS.delete(ip);
    }
  }

  const count = (requestCounts.get(ip) || 0) + 1;
  requestCounts.set(ip, count);

  if (count > MAX_REQUESTS_PER_WINDOW) {
    BLOCKED_IPS.set(ip, now + BLOCK_DURATION_MS);
    console.warn(`[RATE LIMIT] IP ${ip} diblokir sementara karena terlalu banyak request (> ${MAX_REQUESTS_PER_WINDOW} per menit).`);
    return true;
  }

  return false;
}
