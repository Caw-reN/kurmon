const requestCounts = new Map();
const BLOCKED_IPS = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 2000;   // max 2000 req/mnt per IP (general)
const BLOCK_DURATION_MS = 5 * 60 * 1000; // 5 menit blokir

// Login-specific rate limit (brute force protection)
const loginRequestCounts = new Map();
const LOGIN_BLOCK_DURATION_MS = 15 * 60 * 1000; // 15 menit blokir untuk login
const loginBlockedIPs = new Map();
const MAX_LOGIN_ATTEMPTS = 10; // max 10 percobaan login per menit per IP

// Bersihkan memory setiap menit
setInterval(() => {
  requestCounts.clear();
  loginRequestCounts.clear();
  const now = Date.now();
  for (const [ip, expiry] of BLOCKED_IPS.entries()) {
    if (now > expiry) BLOCKED_IPS.delete(ip);
  }
  for (const [ip, expiry] of loginBlockedIPs.entries()) {
    if (now > expiry) loginBlockedIPs.delete(ip);
  }
}, RATE_LIMIT_WINDOW_MS);

/**
 * Ambil IP nyata klien dengan aman.
 * TIDAK percaya X-Forwarded-For secara buta — hanya pakai jika
 * env TRUST_PROXY=true (misal di balik Nginx/Caddy).
 */
function getClientIp(req) {
  if (process.env.TRUST_PROXY === 'true') {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      // Ambil IP paling kiri (client), bukan IP proxy
      const first = forwarded.split(',')[0].trim();
      if (first && first !== 'unknown') return first;
    }
  }
  // Fallback ke koneksi TCP langsung (tidak bisa di-spoof)
  return req.socket?.remoteAddress || req.connection?.remoteAddress || 'unknown';
}

/**
 * Rate limiter umum — memeriksa apakah IP klien melebihi batas request.
 * Return true = request harus diblokir.
 */
export function isRateLimited(req) {
  const ip = getClientIp(req);
  if (ip === 'unknown') return false; // skip jika proxy lokal

  const now = Date.now();

  // Periksa apakah IP sedang diblokir
  if (BLOCKED_IPS.has(ip)) {
    const expiry = BLOCKED_IPS.get(ip);
    if (now < expiry) return true;
    BLOCKED_IPS.delete(ip);
  }

  const count = (requestCounts.get(ip) || 0) + 1;
  requestCounts.set(ip, count);

  if (count > MAX_REQUESTS_PER_WINDOW) {
    BLOCKED_IPS.set(ip, now + BLOCK_DURATION_MS);
    console.warn(`[RATE LIMIT] IP ${ip} diblokir sementara (>${MAX_REQUESTS_PER_WINDOW} req/mnt).`);
    return true;
  }
  return false;
}

/**
 * Login-specific rate limiter — lebih ketat untuk cegah brute force.
 * Return true = percobaan login harus ditolak.
 */
export function isLoginRateLimited(req) {
  const ip = getClientIp(req);
  if (ip === 'unknown') return false;

  const now = Date.now();

  if (loginBlockedIPs.has(ip)) {
    const expiry = loginBlockedIPs.get(ip);
    if (now < expiry) return true;
    loginBlockedIPs.delete(ip);
  }

  const count = (loginRequestCounts.get(ip) || 0) + 1;
  loginRequestCounts.set(ip, count);

  if (count > MAX_LOGIN_ATTEMPTS) {
    loginBlockedIPs.set(ip, now + LOGIN_BLOCK_DURATION_MS);
    console.warn(`[LOGIN RATE LIMIT] IP ${ip} diblokir 15 menit karena terlalu banyak percobaan login.`);
    return true;
  }
  return false;
}
