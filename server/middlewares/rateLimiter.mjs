// SEC-09 FIX: Rate limiter dengan PostgreSQL-backed persistence untuk blocked IPs.
// In-memory Map digunakan sebagai cache cepat (L1). Blocked IPs disimpan ke DB (L2)
// agar tidak hilang saat server restart. Fallback graceful ke in-memory jika DB tidak tersedia.

const requestCounts = new Map();
const BLOCKED_IPS = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 300;    // FIX B-08: turun dari 2000 → 300 req/mnt per IP
const BLOCK_DURATION_MS = 5 * 60 * 1000; // 5 menit blokir

// Login-specific rate limit (brute force protection)
const loginRequestCounts = new Map();
const LOGIN_BLOCK_DURATION_MS = 15 * 60 * 1000; // 15 menit blokir untuk login
const loginBlockedIPs = new Map();
const MAX_LOGIN_ATTEMPTS = 10; // max 10 percobaan login per menit per IP

// Database pool — di-inject oleh auth-server.mjs setelah DB init
let _dbPool = null;

/**
 * Inject database pool ke rate limiter untuk persistence.
 * Dipanggil setelah initDb() berhasil di auth-server.mjs
 */
export function setRateLimiterDbPool(pool) {
  _dbPool = pool;
  // Muat blocked IPs dari database ke cache in-memory saat startup
  loadBlockedIpsFromDb().catch(e => console.warn('[RateLimit] Gagal muat blocked IPs dari DB:', e.message));
}

/**
 * Simpan blocked IP ke database untuk persistence across restarts
 */
async function persistBlockedIp(ip, expiryMs, type = 'general') {
  if (!_dbPool) return;
  try {
    await _dbPool.query(
      `INSERT INTO rate_limit_blocks (ip_address, block_type, expires_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (ip_address, block_type) DO UPDATE SET expires_at = EXCLUDED.expires_at`,
      [ip, type, expiryMs]
    );
  } catch (e) {
    // Jika tabel belum ada atau error DB, fallback ke in-memory saja
    if (e.code !== '42P01') { // 42P01 = undefined_table
      console.warn('[RateLimit] Gagal persist blocked IP ke DB:', e.message);
    }
  }
}

/**
 * Hapus blocked IP dari database setelah expired
 */
async function removeBlockedIpFromDb(ip, type = 'general') {
  if (!_dbPool) return;
  try {
    await _dbPool.query(
      `DELETE FROM rate_limit_blocks WHERE ip_address = $1 AND block_type = $2`,
      [ip, type]
    );
  } catch (e) {
    // Ignore DB errors — in-memory cache masih valid
  }
}

/**
 * Muat semua blocked IPs yang masih aktif dari database ke cache in-memory
 */
async function loadBlockedIpsFromDb() {
  if (!_dbPool) return;
  try {
    const now = Date.now();
    const { rows } = await _dbPool.query(
      `SELECT ip_address, block_type, expires_at FROM rate_limit_blocks WHERE expires_at > $1`,
      [now]
    );
    let loaded = 0;
    for (const row of rows) {
      const expiresAt = Number(row.expires_at);
      if (expiresAt > now) {
        if (row.block_type === 'login') {
          loginBlockedIPs.set(row.ip_address, expiresAt);
        } else {
          BLOCKED_IPS.set(row.ip_address, expiresAt);
        }
        loaded++;
      }
    }
    if (loaded > 0) {
      console.info(`[RateLimit] Memuat ${loaded} IP yang masih diblokir dari database.`);
    }
    // Bersihkan entri expired dari DB
    await _dbPool.query(`DELETE FROM rate_limit_blocks WHERE expires_at <= $1`, [now]).catch(() => {});
  } catch (e) {
    if (e.code !== '42P01') { // Abaikan jika tabel belum ada
      console.warn('[RateLimit] Gagal muat blocked IPs dari DB:', e.message);
    }
  }
}

/**
 * Buat tabel rate_limit_blocks jika belum ada.
 * Dipanggil dari initDb() di auth-server.mjs
 */
export async function ensureRateLimitTable(pool) {
  if (!pool) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS rate_limit_blocks (
        id SERIAL PRIMARY KEY,
        ip_address VARCHAR(100) NOT NULL,
        block_type VARCHAR(20) NOT NULL DEFAULT 'general',
        expires_at BIGINT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(ip_address, block_type)
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_rate_limit_blocks_ip ON rate_limit_blocks (ip_address, expires_at)`);
  } catch (e) {
    console.warn('[RateLimit] Gagal membuat tabel rate_limit_blocks:', e.message);
  }
}

// Bersihkan memory setiap menit
setInterval(() => {
  requestCounts.clear();
  loginRequestCounts.clear();
  const now = Date.now();
  for (const [ip, expiry] of BLOCKED_IPS.entries()) {
    if (now > expiry) {
      BLOCKED_IPS.delete(ip);
      removeBlockedIpFromDb(ip, 'general').catch(() => {});
    }
  }
  for (const [ip, expiry] of loginBlockedIPs.entries()) {
    if (now > expiry) {
      loginBlockedIPs.delete(ip);
      removeBlockedIpFromDb(ip, 'login').catch(() => {});
    }
  }
  // Bersihkan DB dari entri expired secara periodik
  if (_dbPool) {
    _dbPool.query(`DELETE FROM rate_limit_blocks WHERE expires_at <= $1`, [now]).catch(() => {});
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
    removeBlockedIpFromDb(ip, 'general').catch(() => {});
  }

  const count = (requestCounts.get(ip) || 0) + 1;
  requestCounts.set(ip, count);

  if (count > MAX_REQUESTS_PER_WINDOW) {
    const expiryMs = now + BLOCK_DURATION_MS;
    BLOCKED_IPS.set(ip, expiryMs);
    // Persist ke database agar blokir bertahan setelah restart
    persistBlockedIp(ip, expiryMs, 'general').catch(() => {});
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
    removeBlockedIpFromDb(ip, 'login').catch(() => {});
  }

  const count = (loginRequestCounts.get(ip) || 0) + 1;
  loginRequestCounts.set(ip, count);

  if (count > MAX_LOGIN_ATTEMPTS) {
    const expiryMs = now + LOGIN_BLOCK_DURATION_MS;
    loginBlockedIPs.set(ip, expiryMs);
    // Persist ke database agar blokir login bertahan setelah restart
    persistBlockedIp(ip, expiryMs, 'login').catch(() => {});
    console.warn(`[LOGIN RATE LIMIT] IP ${ip} diblokir 15 menit karena terlalu banyak percobaan login.`);
    return true;
  }
  return false;
}
