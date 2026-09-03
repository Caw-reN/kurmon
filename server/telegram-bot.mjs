/**
 * telegram-bot.mjs
 * ─────────────────────────────────────────────────────────
 * Telegram Bot untuk monitoring & keamanan sistem Kurmon.
 *
 * Fitur:
 * - Long-polling (bekerja di localhost tanpa domain/HTTPS)
 * - Perintah interaktif: /status /logs /backup /alerts /stats /help
 * - sendTelegramAlert() untuk push notifikasi dari seluruh server
 * - Rate-limiting pesan agar tidak spam
 *
 * Konfigurasi (simpan di database tabel api_keys, service_name='telegram_bot_monitor'):
 *   api_key      = Bot Token dari @BotFather
 *   extra_config = { "chat_id": "-100xxx", "allowed_chat_ids": [...], "alerts": {...} }
 */

import os from 'os';

// ── State ────────────────────────────────────────────────
let _botToken = null;
let _chatId = null;
let _allowedChatIds = new Set();
let _alertConfig = {
  bruteForce: true,
  serverError: true,
  backupStatus: true,
  adminLogin: false,
  restoreDatabase: true,
  apiKeyAdded: true,
};
let _dbPool = null;
let _isRunning = false;
let _pollOffset = 0;
let _startTime = Date.now();
let _initialized = false;

// Rate-limit: max 1 pesan per event per 60 detik
const _recentAlerts = new Map();
const RATE_LIMIT_MS = 60_000;

// ── Init ─────────────────────────────────────────────────

/**
 * Inisialisasi bot. Dipanggil dari auth-server.mjs saat startup.
 * @param {object} dbPool - PostgreSQL pool
 */
export async function initTelegramBot(dbPool) {
  _dbPool = dbPool;
  await _loadConfig();
  if (_botToken && _chatId) {
    _startPolling();
    console.log('[TelegramBot] ✅ Bot aktif. Long-polling dimulai.');
  } else {
    console.log('[TelegramBot] ⚠️  Bot Token / Chat ID belum dikonfigurasi.');
  }
  _initialized = true;
}

/**
 * Reload konfigurasi dari database.
 */
export async function reloadTelegramBotConfig() {
  await _loadConfig();
  if (_botToken && _chatId && !_isRunning) {
    _startPolling();
    console.log('[TelegramBot] 🔄 Bot direstart dengan config baru.');
  } else if (!_botToken || !_chatId) {
    _stopPolling();
    console.log('[TelegramBot] ⏹  Bot dihentikan (config tidak lengkap).');
  }
}

async function _loadConfig() {
  if (!_dbPool) return;
  try {
    const { rows } = await _dbPool.query(
      "SELECT api_key, extra_config FROM api_keys WHERE service_name = 'telegram_bot_monitor' AND is_active = true LIMIT 1"
    );
    if (rows.length > 0) {
      _botToken = rows[0].api_key || null;
      let cfg = {};
      try {
        cfg = typeof rows[0].extra_config === 'string' && rows[0].extra_config.trim().startsWith('{') 
          ? JSON.parse(rows[0].extra_config) 
          : (typeof rows[0].extra_config === 'object' ? rows[0].extra_config : {});
      } catch (e) {
        console.error("Format JSON pada Extra Config telegram bot tidak valid.");
      }
      _chatId = cfg?.chat_id || null;
      _allowedChatIds = new Set(cfg.allowed_chat_ids || (_chatId ? [String(_chatId)] : []));
      if (cfg.alerts && typeof cfg.alerts === 'object') {
        _alertConfig = { ..._alertConfig, ...cfg.alerts };
      }
    } else {
      _botToken = null;
      _chatId = null;
    }
  } catch (err) {
    console.warn('[TelegramBot] Gagal load config:', err.message);
  }
}

// ── Polling ──────────────────────────────────────────────

function _startPolling() {
  if (_isRunning) return;
  _isRunning = true;
  _pollLoop();
}

function _stopPolling() {
  _isRunning = false;
}

async function _pollLoop() {
  while (_isRunning && _botToken) {
    try {
      const res = await fetch(
        `https://api.telegram.org/bot${_botToken}/getUpdates?offset=${_pollOffset}&timeout=25`
      );
      if (!res.ok) { await _sleep(5000); continue; }
      const data = await res.json();
      if (data.ok && data.result.length > 0) {
        for (const update of data.result) {
          _pollOffset = update.update_id + 1;
          _handleUpdate(update).catch(err => console.warn('[TelegramBot] handleUpdate error:', err.message));
        }
      }
    } catch (err) {
      console.warn('[TelegramBot] Polling error:', err.message);
      await _sleep(5000);
    }
  }
}

async function _handleUpdate(update) {
  const msg = update.message;
  if (!msg || !msg.text) return;

  const chatId = String(msg.chat.id);
  const text = msg.text.trim();
  const from = msg.from?.username ? `@${msg.from.username}` : (msg.from?.first_name || chatId);

  const parts = text.split(/\s+/);
  const cmd = parts[0].toLowerCase().split('@')[0];
  const args = parts.slice(1);

  // Perintah /start selalu diizinkan agar admin/pengguna baru bisa langsung melihat Chat ID mereka
  if (cmd === '/start') {
    const isRegistered = _allowedChatIds.has(chatId) || (!!_chatId && chatId === String(_chatId));
    const safeFrom = from.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
    await _sendMessage(chatId,
      `👋 *Halo ${safeFrom}\\!*\n\n` +
      `ID Chat Telegram Anda adalah: \`${chatId}\`\n\n` +
      (isRegistered
        ? `✅ Chat ID Anda sudah terdaftar dan terhubung ke sistem Kurmon\\.\nKetik /help untuk melihat menu perintah\\.`
        : `⚠️ Chat ID ini belum didaftarkan di sistem Kurmon\\.\nSalin Chat ID: \`${chatId}\` lalu masukkan ke menu *Pengaturan > Backup & Bot Telegram > API Key* di aplikasi Kurmon\\.`
      )
    );
    return;
  }

  // Whitelist check
  if (_allowedChatIds.size > 0 && !_allowedChatIds.has(chatId)) {
    await _sendMessage(chatId, `⛔ Akses tidak diizinkan.\nChat ID Anda: \`${chatId}\`\nHubungi administrator untuk mendaftarkan ID ini.`);
    return;
  }
  if (_allowedChatIds.size === 0 && _chatId && chatId !== String(_chatId)) return;

  switch (cmd) {
    case '/help':   await _cmdHelp(chatId); break;
    case '/status': await _cmdStatus(chatId); break;
    case '/logs':   await _cmdLogs(chatId, parseInt(args[0]) || 10); break;
    case '/backup': await _cmdBackup(chatId, from); break;
    case '/alerts': await _cmdAlerts(chatId); break;
    case '/stats':  await _cmdStats(chatId); break;
    case '/absen':
    case '/rekap':  await sendDailyMorningAttendanceReport(chatId); break;
    default: await _sendMessage(chatId, `❓ Perintah tidak dikenal. Ketik /help untuk daftar perintah.`);
  }
}

// ── Commands ─────────────────────────────────────────────

async function _cmdHelp(chatId) {
  await _sendMessage(chatId,
    `🤖 *Kurmon Bot Monitoring*\n\n` +
    `Perintah yang tersedia:\n` +
    `/status — Status server & database\n` +
    `/absen — Rekap absensi guru & siswa hari ini\n` +
    `/logs [n] — n log audit terakhir (max 20)\n` +
    `/backup — Trigger backup manual langsung\n` +
    `/alerts — Alert keamanan terkini\n` +
    `/stats — Statistik jumlah data sistem\n` +
    `/help — Tampilkan petunjuk ini`
  );
}

async function _cmdStatus(chatId) {
  const uptime = _formatUptime(process.uptime());
  const mem = process.memoryUsage();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMemGB = ((totalMem - freeMem) / 1024 / 1024 / 1024).toFixed(2);
  const totalMemGB = (totalMem / 1024 / 1024 / 1024).toFixed(2);

  let dbStatus = '❓ Tidak diketahui';
  if (_dbPool) {
    try { await _dbPool.query('SELECT 1'); dbStatus = '✅ Terhubung'; }
    catch { dbStatus = '❌ Terputus'; }
  }

  await _sendMessage(chatId,
    `📊 *Status Server Kurmon*\n\n` +
    `🕐 Uptime: ${uptime}\n` +
    `💾 RAM: ${usedMemGB}GB / ${totalMemGB}GB\n` +
    `🧠 Heap: ${(mem.heapUsed / 1024 / 1024).toFixed(1)}MB\n` +
    `🗄️ Database: ${dbStatus}\n` +
    `📡 Platform: ${os.platform()} ${os.arch()}\n` +
    `🕰 Waktu: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`
  );
}

async function _cmdLogs(chatId, n) {
  if (!_dbPool) { await _sendMessage(chatId, '❌ Database tidak tersedia.'); return; }
  const limit = Math.min(Math.max(n, 1), 20);
  try {
    const { rows } = await _dbPool.query(
      `SELECT user_name, action, detail, created_at FROM audit_logs ORDER BY created_at DESC LIMIT $1`, [limit]
    );
    if (rows.length === 0) { await _sendMessage(chatId, '📋 Tidak ada log tersedia.'); return; }
    const lines = rows.map(r => {
      const t = new Date(r.created_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
      return `• [${t}] *${r.action}* — ${r.user_name || 'System'}\n  ${(r.detail || '').slice(0, 80)}`;
    }).join('\n\n');
    await _sendMessage(chatId, `📋 *${limit} Log Terakhir:*\n\n${lines}`);
  } catch (err) {
    await _sendMessage(chatId, `❌ Gagal ambil log: ${err.message}`);
  }
}

async function _cmdBackup(chatId, from) {
  if (!_dbPool) { await _sendMessage(chatId, '❌ Database tidak tersedia.'); return; }
  await _sendMessage(chatId, `⏳ Sedang membuat backup database...`);
  try {
    const { runBackupJson } = await import('./auto-backup.mjs');
    const result = await runBackupJson();
    await _sendMessage(chatId,
      `✅ *Backup Berhasil!*\n\n` +
      `📁 File: \`${result.fileName}\`\n` +
      `📦 Ukuran: ${result.size}\n` +
      `🔑 SHA-256: \`${result.checksum.slice(0, 20)}...\`\n` +
      `👤 Diminta: ${from}`
    );
  } catch (err) {
    await _sendMessage(chatId, `❌ *Backup Gagal!*\n\nError: ${err.message}`);
  }
}

async function _cmdAlerts(chatId) {
  if (!_dbPool) { await _sendMessage(chatId, '❌ Database tidak tersedia.'); return; }
  try {
    const { rows } = await _dbPool.query(
      `SELECT user_name, action, detail, created_at FROM audit_logs
       WHERE action IN ('LOGIN_FAILED','BRUTE_FORCE','RESTORE_BACKUP','API_KEY_ADDED','SUSPICIOUS_ACCESS','ACCOUNT_LOCKED')
       ORDER BY created_at DESC LIMIT 10`
    );
    if (rows.length === 0) { await _sendMessage(chatId, '✅ Tidak ada alert keamanan terkini.'); return; }
    const lines = rows.map(r => {
      const t = new Date(r.created_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
      return `🚨 [${t}]\n   *${r.action}* — ${r.user_name || 'Unknown'}\n   ${(r.detail || '').slice(0, 80)}`;
    }).join('\n\n');
    await _sendMessage(chatId, `🛡️ *Alert Keamanan Terkini:*\n\n${lines}`);
  } catch (err) {
    await _sendMessage(chatId, `❌ Gagal ambil alerts: ${err.message}`);
  }
}

async function _cmdStats(chatId) {
  if (!_dbPool) { await _sendMessage(chatId, '❌ Database tidak tersedia.'); return; }
  try {
    const [tRes, sRes, stRes, lRes, bRes] = await Promise.all([
      _dbPool.query('SELECT COUNT(*) FROM mst_teachers').catch(() => ({ rows: [{ count: 0 }] })),
      _dbPool.query('SELECT COUNT(*) FROM mst_staffs').catch(() => ({ rows: [{ count: 0 }] })),
      _dbPool.query('SELECT COUNT(*) FROM mst_students').catch(() => ({ rows: [{ count: 0 }] })),
      _dbPool.query("SELECT COUNT(*) FROM audit_logs WHERE action = 'LOGIN' AND created_at >= NOW() - INTERVAL '24 hours'").catch(() => ({ rows: [{ count: 0 }] })),
      _dbPool.query("SELECT COUNT(*) FROM audit_logs WHERE action LIKE '%BACKUP%' AND created_at >= NOW() - INTERVAL '7 days'").catch(() => ({ rows: [{ count: 0 }] })),
    ]);
    await _sendMessage(chatId,
      `📈 *Statistik Sistem Kurmon*\n\n` +
      `👨‍🏫 Guru: ${tRes.rows[0].count}\n` +
      `👤 Karyawan: ${sRes.rows[0].count}\n` +
      `🎓 Siswa: ${stRes.rows[0].count}\n` +
      `🔐 Login 24j: ${lRes.rows[0].count}\n` +
      `💾 Backup 7h: ${bRes.rows[0].count}\n` +
      `🕰 ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`
    );
  } catch (err) {
    await _sendMessage(chatId, `❌ Gagal ambil statistik: ${err.message}`);
  }
}

// ── Alert System (dipanggil dari server lain) ─────────────

/**
 * Kirim alert push ke Telegram.
 * @param {string} type - 'bruteForce'|'serverError'|'backupStatus'|'adminLogin'|'restoreDatabase'|'apiKeyAdded'
 * @param {string} message - Pesan (plain text, bukan markdown)
 * @param {'info'|'warning'|'critical'} level
 */
export async function sendTelegramAlert(type, message, level = 'warning') {
  if (!_initialized && _dbPool) await _loadConfig();
  if (!_botToken || !_chatId) return;
  if (_alertConfig[type] === false) return;

  // Rate limiting
  const now = Date.now();
  const lastSent = _recentAlerts.get(type) || 0;
  if (now - lastSent < RATE_LIMIT_MS) return;
  _recentAlerts.set(type, now);

  const emoji = { info: 'ℹ️', warning: '⚠️', critical: '🚨' }[level] || '⚠️';
  const header = {
    bruteForce:      '🔴 BRUTE FORCE TERDETEKSI',
    serverError:     '🟠 SERVER ERROR',
    backupStatus:    '💾 STATUS BACKUP',
    adminLogin:      '🔵 ADMIN LOGIN',
    restoreDatabase: '🔴 RESTORE DATABASE',
    apiKeyAdded:     '🔑 API KEY BARU',
  }[type] || '📢 NOTIFIKASI';

  const time = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
  // Escape karakter Markdown yang bisa merusak format
  const safeMsg = message.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
  const fullMsg = `${emoji} *${header}*\n\n${safeMsg}\n\n🕐 ${time}`;

  await _sendMessage(_chatId, fullMsg);
}

/**
 * Kirim Rekap Absensi Siswa & Guru (dijalankan otomatis pk 07:05 atau via /absen di bot)
 */
export async function sendDailyMorningAttendanceReport(targetChatId = null) {
  if (!_dbPool) return;
  if (!_initialized) await _loadConfig();
  const destChatId = targetChatId || _chatId;
  if (!_botToken || !destChatId) return;

  try {
    const today = new Date().toLocaleString('en-CA', { timeZone: 'Asia/Jakarta' }).split(',')[0];
    const todayFormatted = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' });
    const nowTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });

    // 1. Data Guru & Karyawan dari hikvision_logs hari ini
    const { rows: todayLogs } = await _dbPool.query(`
      SELECT employee_id, true_name, true_person_type, timestamp, status
      FROM hikvision_logs
      WHERE timestamp::date = $1::date
      ORDER BY timestamp ASC
    `, [today]).catch(() => ({ rows: [] }));

    // Ambil total guru & karyawan terdaftar
    const { rows: tRows } = await _dbPool.query(`SELECT COUNT(*) as count FROM mst_teachers`).catch(() => ({ rows: [{ count: 0 }] }));
    const { rows: sRows } = await _dbPool.query(`SELECT COUNT(*) as count FROM mst_staffs`).catch(() => ({ rows: [{ count: 0 }] }));
    const { rows: stdRows } = await _dbPool.query(`SELECT COUNT(*) as count FROM mst_students`).catch(() => ({ rows: [{ count: 0 }] }));
    
    const totalGuruMaster = parseInt(tRows[0]?.count || 0, 10);
    const totalStaffMaster = parseInt(sRows[0]?.count || 0, 10);
    const totalStudentMaster = parseInt(stdRows[0]?.count || 0, 10);

    // Filter unique tap per user
    const teacherTaps = new Map();
    const staffTaps = new Map();
    const studentTaps = new Map();

    todayLogs.forEach(r => {
      const type = String(r.true_person_type || '').toLowerCase();
      const id = String(r.employee_id || '').trim();
      if (type === 'guru') {
        if (!teacherTaps.has(id)) teacherTaps.set(id, r);
      } else if (type === 'karyawan') {
        if (!staffTaps.has(id)) staffTaps.set(id, r);
      } else {
        if (!studentTaps.has(id)) studentTaps.set(id, r);
      }
    });

    // Hitung guru tepat waktu vs terlambat (batas masuk 07:15)
    let guruTepat = 0, guruTelat = 0;
    teacherTaps.forEach(r => {
      const tsStr = String(r.timestamp || '');
      const timeOnly = tsStr.includes('T') ? tsStr.split('T')[1].substring(0, 5) : tsStr.substring(11, 16);
      if (timeOnly > "07:15") guruTelat++;
      else guruTepat++;
    });
    const guruBelum = Math.max(0, totalGuruMaster - teacherTaps.size);

    // Hitung siswa
    let siswaTepat = 0, siswaTelat = 0;
    studentTaps.forEach(r => {
      const tsStr = String(r.timestamp || '');
      const timeOnly = tsStr.includes('T') ? tsStr.split('T')[1].substring(0, 5) : tsStr.substring(11, 16);
      if (timeOnly > "07:00") siswaTelat++;
      else siswaTepat++;
    });
    const siswaBelum = Math.max(0, totalStudentMaster - studentTaps.size);

    // Ambil rekap surat izin / sakit siswa
    const { rows: suratRows } = await _dbPool.query(`
      SELECT status, COUNT(*) as cnt FROM kedisiplinan_absensi 
      WHERE date = $1 GROUP BY status
    `, [today]).catch(() => ({ rows: [] }));

    let siswaIzin = 0, siswaSakit = 0;
    suratRows.forEach(sr => {
      if (sr.status === 'Izin') siswaIzin += parseInt(sr.cnt, 10);
      if (sr.status === 'Sakit') siswaSakit += parseInt(sr.cnt, 10);
    });

    const msg = 
`📋 *LAPORAN KEHADIRAN PAGI (Pukul ${nowTime} WIB)*
📅 ${todayFormatted}

👨‍🏫 *GURU & KARYAWAN*
• Hadir Tepat Waktu: *${guruTepat}* guru
• Terlambat: *${guruTelat}* guru
• Sudah Scan: *${teacherTaps.size}* / ${totalGuruMaster} guru
• Belum Terdata Scan: *${guruBelum}* guru

🎓 *PRESENSI SISWA*
• Hadir Tepat Waktu: *${siswaTepat}* siswa
• Terlambat: *${siswaTelat}* siswa
• Izin / Sakit: *${siswaIzin + siswaSakit}* siswa (Izin: ${siswaIzin}, Sakit: ${siswaSakit})
• Total Tap Mesin: *${studentTaps.size}* / ${totalStudentMaster} siswa
• Belum Absen: *${siswaBelum}* siswa

_Laporan otomatis dikirim dari Mesin Absensi Hikvision & Sistem Kurmon._`;

    await _sendMessage(destChatId, msg);
    console.log('[TelegramBot] ✅ Laporan kehadiran pagi 07:05 berhasil dikirim ke Telegram.');
  } catch (err) {
    console.error('[TelegramBot] Gagal kirim laporan kehadiran pagi:', err.message);
  }
}

// ── HTTP Handler ─────────────────────────────────────────

export async function handleTelegramBotRoutes(req, res, url, ctx) {
  const { send, requireAuthenticated, normalizeServerRole } = ctx;

  if (req.method === 'GET' && url.pathname === '/api/telegram-bot/status') {
    const session = requireAuthenticated(req, res);
    if (!session) return true;
    send(req, res, 200, {
      ok: true,
      data: {
        isRunning: _isRunning,
        hasBotToken: !!_botToken,
        hasChatId: !!_chatId,
        alertConfig: _alertConfig,
        uptime: Math.floor((Date.now() - _startTime) / 1000),
      }
    });
    return true;
  }

  if (req.method === 'POST' && url.pathname === '/api/telegram-bot/test') {
    const session = requireAuthenticated(req, res);
    if (!session) return true;
    if (!['admin', 'superadmin'].includes(normalizeServerRole(session.role))) {
      send(req, res, 403, { ok: false, error: 'Hanya admin' });
      return true;
    }
    await _loadConfig(); // Selalu refresh konfigurasi dari DB sebelum uji coba
    if (!_botToken || !_chatId) {
      send(req, res, 400, { ok: false, error: 'Bot belum dikonfigurasi. Tambahkan API Key dengan service_name=telegram_bot_monitor.' });
      return true;
    }
    try {
      const time = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
      const safeTime = time.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
      const safeName = String(session.name || session.id).replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
      
      await _sendMessage(_chatId,
        `🚀 *Test Koneksi Berhasil\\!*\n\nBot Kurmon aktif dan siap memantau sistem\\.\n🕒 ${safeTime}\n👤 Dikirim oleh: ${safeName}`
      );
      send(req, res, 200, { ok: true });
    } catch (err) {
      let errorMsg = err.message || 'Gagal mengirim pesan';
      if (errorMsg.toLowerCase().includes('chat not found')) {
        errorMsg = 'Chat tidak ditemukan di Telegram! Buka bot Anda di Telegram dan tekan tombol "START" (/start) atau kirim pesan ke bot terlebih dahulu agar bot diizinkan mengirim pesan.';
      }
      send(req, res, 500, { ok: false, error: errorMsg });
    }
    return true;
  }

  if (req.method === 'POST' && url.pathname === '/api/telegram-bot/reload') {
    const session = requireAuthenticated(req, res);
    if (!session) return true;
    if (!['admin', 'superadmin'].includes(normalizeServerRole(session.role))) {
      send(req, res, 403, { ok: false, error: 'Hanya admin' });
      return true;
    }
    await reloadTelegramBotConfig();
    send(req, res, 200, { ok: true, isRunning: _isRunning });
    return true;
  }

  return false;
}

// ── Helpers ──────────────────────────────────────────────

async function _sendMessage(chatId, text) {
  if (!_botToken || !chatId) return;
  try {
    const r = await fetch(`https://api.telegram.org/bot${_botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'MarkdownV2',
        disable_web_page_preview: true,
      }),
    });
    const d = await r.json();
    if (!d.ok) {
      // Fallback jika formatting MarkdownV2 ditolak oleh Telegram
      if (d.description && (d.description.includes("can't parse entities") || d.description.includes("character"))) {
        const plainText = text.replace(/\\([_*[\]()~`>#+\-=|{}.!])/g, '$1');
        const retryRes = await fetch(`https://api.telegram.org/bot${_botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: plainText,
            disable_web_page_preview: true,
          }),
        });
        const retryData = await retryRes.json();
        if (retryData.ok) return retryData;
      }
      console.warn('[TelegramBot] sendMessage failed:', d.description);
      throw new Error(d.description);
    }
    return d;
  } catch (err) {
    console.error('[TelegramBot] network error:', err.message);
    throw err;
  }
}

function _formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const parts = [];
  if (d > 0) parts.push(`${d}h`);
  if (h > 0) parts.push(`${h}j`);
  parts.push(`${m}m`);
  return parts.join(' ');
}

function _sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
