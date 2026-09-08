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
  attendance: true,
  deviceOffline: true,
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
    const safeFrom = escapeHtml(from);
    await _sendMessage(chatId,
      `👋 <b>Halo ${safeFrom}!</b>\n\n` +
      `ID Chat Telegram Anda: <code>${chatId}</code>\n\n` +
      (isRegistered
        ? `✅ Chat ID Anda sudah terdaftar dan terhubung ke sistem Kurmon.\nKetik <b>/help</b> untuk melihat menu perintah.`
        : `⚠️ Chat ID ini belum didaftarkan di sistem Kurmon.\nSalin ID ini: <code>${chatId}</code> lalu masukkan ke menu <b>Pengaturan > Backup & Bot Telegram > API Key</b> di aplikasi Kurmon.`
      ),
      { isHtml: true }
    );
    return;
  }

  // Whitelist check
  if (_allowedChatIds.size > 0 && !_allowedChatIds.has(chatId)) {
    await _sendMessage(chatId, `⛔ <b>Akses Tidak Diizinkan</b>\n\nChat ID Anda: <code>${chatId}</code>\nHubungi administrator untuk mendaftarkan ID ini.`, { isHtml: true });
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
    default: await _sendMessage(chatId, `❓ Perintah tidak dikenal. Ketik <b>/help</b> untuk daftar perintah.`, { isHtml: true });
  }
}

// ── Commands ─────────────────────────────────────────────

async function _cmdHelp(chatId) {
  await _sendMessage(chatId,
    `🤖 <b>Kurmon Bot Monitoring</b>\n\n` +
    `Daftar perintah yang tersedia:\n` +
    `• <b>/status</b> — Status server & database\n` +
    `• <b>/absen</b> — Rekap kehadiran guru & siswa hari ini\n` +
    `• <b>/logs [n]</b> — Log audit terakhir (contoh: /logs 10)\n` +
    `• <b>/backup</b> — Trigger backup database manual\n` +
    `• <b>/alerts</b> — Alert keamanan sistem terkini\n` +
    `• <b>/stats</b> — Statistik jumlah data sistem\n` +
    `• <b>/help</b> — Menampilkan petunjuk ini`,
    { isHtml: true }
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
    try { await _dbPool.query('SELECT 1'); dbStatus = '✅ Terhubung Normal'; }
    catch { dbStatus = '❌ Terputus'; }
  }

  await _sendMessage(chatId,
    `📊 <b>Status Server Kurmon</b>\n\n` +
    `• <b>Uptime:</b> ${uptime}\n` +
    `• <b>RAM Terpakai:</b> ${usedMemGB} GB / ${totalMemGB} GB\n` +
    `• <b>Heap Memory:</b> ${(mem.heapUsed / 1024 / 1024).toFixed(1)} MB\n` +
    `• <b>Koneksi Database:</b> ${dbStatus}\n` +
    `• <b>Platform:</b> ${os.platform()} (${os.arch()})\n` +
    `• <b>Waktu Server:</b> ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB`,
    { isHtml: true }
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
      return `• [${t}] <b>${escapeHtml(r.action)}</b> (${escapeHtml(r.user_name || 'System')})\n  ${escapeHtml((r.detail || '').slice(0, 100))}`;
    }).join('\n\n');
    await _sendMessage(chatId, `📋 <b>${limit} Log Terakhir:</b>\n\n${lines}`, { isHtml: true });
  } catch (err) {
    await _sendMessage(chatId, `❌ Gagal mengambil log: ${escapeHtml(err.message)}`, { isHtml: true });
  }
}

async function _cmdBackup(chatId, from) {
  if (!_dbPool) { await _sendMessage(chatId, '❌ Database tidak tersedia.'); return; }
  await _sendMessage(chatId, `⏳ Sedang membuat berkas cadangan database...`);
  try {
    const { runBackupJson } = await import('./auto-backup.mjs');
    const result = await runBackupJson();
    await _sendMessage(chatId,
      `✅ <b>Pencadangan Database Berhasil!</b>\n\n` +
      `• <b>Nama Berkas:</b> <code>${escapeHtml(result.fileName)}</code>\n` +
      `• <b>Ukuran:</b> <b>${result.size}</b>\n` +
      `• <b>SHA-256:</b> <code>${result.checksum ? result.checksum.slice(0, 20) + '...' : '-'}</code>\n` +
      `• <b>Diminta Oleh:</b> ${escapeHtml(from)}\n` +
      `• <b>Waktu:</b> ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB`,
      { isHtml: true }
    );
  } catch (err) {
    await _sendMessage(chatId, `❌ <b>Pencadangan Gagal!</b>\n\nKendala: ${escapeHtml(err.message)}`, { isHtml: true });
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
      return `🚨 [${t}]\n   <b>${escapeHtml(r.action)}</b> (${escapeHtml(r.user_name || 'Unknown')})\n   ${escapeHtml((r.detail || '').slice(0, 100))}`;
    }).join('\n\n');
    await _sendMessage(chatId, `🛡️ <b>Alert Keamanan Terkini:</b>\n\n${lines}`, { isHtml: true });
  } catch (err) {
    await _sendMessage(chatId, `❌ Gagal mengambil alert: ${escapeHtml(err.message)}`, { isHtml: true });
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
      `📈 <b>Statistik Sistem Kurmon</b>\n\n` +
      `• 👨‍🏫 <b>Guru Terdaftar:</b> ${tRes.rows[0].count} orang\n` +
      `• 👤 <b>Karyawan:</b> ${sRes.rows[0].count} orang\n` +
      `• 🎓 <b>Siswa:</b> ${stRes.rows[0].count} orang\n` +
      `• 🔐 <b>Aktivitas Login (24 Jam):</b> ${lRes.rows[0].count} kali\n` +
      `• 💾 <b>Pencadangan (7 Hari):</b> ${bRes.rows[0].count} kali\n` +
      `• 🕰 <b>Waktu:</b> ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB`,
      { isHtml: true }
    );
  } catch (err) {
    await _sendMessage(chatId, `❌ Gagal mengambil statistik: ${escapeHtml(err.message)}`, { isHtml: true });
  }
}

// ── Alert System (dipanggil dari server lain) ─────────────

/**
 * Kirim alert push ke Telegram.
 * @param {string} type - 'bruteForce'|'serverError'|'backupStatus'|'adminLogin'|'restoreDatabase'|'apiKeyAdded'|'attendance'
 * @param {string} message - Pesan (plain text, bukan markdown)
 * @param {'info'|'warning'|'critical'} level
 * @param {object} extraContext - Data tambahan spesifik error (req, err, ip)
 */
export async function sendTelegramAlert(type, message, level = 'warning', extraContext = null) {
  if (!_initialized && _dbPool) await _loadConfig();
  if (!_botToken || !_chatId) return;
  if (_alertConfig[type] === false) return;

  // Rate limiting (bypass untuk attendance atau backup)
  const bypassRateLimit = ['backupStatus', 'attendance'].includes(type);
  const now = Date.now();
  const lastSent = _recentAlerts.get(type) || 0;
  const cooldownMs = type === 'deviceOffline' ? 3 * 60_000 : RATE_LIMIT_MS;
  if (!bypassRateLimit && (now - lastSent < cooldownMs)) return;
  _recentAlerts.set(type, now);

  const emoji = { info: 'ℹ️', warning: '⚠️', critical: '🚨' }[level] || '⚠️';
  const header = {
    bruteForce:      'PERINGATAN BRUTE FORCE',
    serverError:     'PERINGATAN SISTEM SERVER',
    backupStatus:    'STATUS PENCADANGAN DATABASE',
    adminLogin:      'NOTIFIKASI LOGIN ADMIN',
    restoreDatabase: 'PEMULIHAN DATABASE',
    apiKeyAdded:     'API KEY BARU DITAMBAHKAN',
    attendance:      'LAPORAN KEHADIRAN',
    deviceOffline:   'MESIN ABSENSI OFFLINE / GAGAL SYNC',
    dailyReport:     'RINGKASAN HARIAN APLIKASI',
  }[type] || 'NOTIFIKASI SISTEM';

  const time = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
  let formattedContent = formatMessageToHtml(message);

  if (extraContext) {
    let contextStr = '';
    if (extraContext.method && extraContext.path) {
      contextStr += `\n• <b>Endpoint:</b> <code>${escapeHtml(extraContext.method)} ${escapeHtml(extraContext.path)}</code>`;
    }
    if (extraContext.ip) {
      contextStr += `\n• <b>Alamat IP:</b> <code>${escapeHtml(extraContext.ip)}</code>`;
    }
    if (extraContext.user) {
      contextStr += `\n• <b>Pengguna:</b> <b>${escapeHtml(extraContext.user)}</b>`;
    }
    if (extraContext.stack) {
      const stackHead = String(extraContext.stack).split('\n').slice(0, 3).join('\n');
      contextStr += `\n\n<b>Detail Masalah:</b>\n<pre><code>${escapeHtml(stackHead)}</code></pre>`;
    }
    formattedContent += contextStr;
  }

  const fullMsg = 
`${emoji} <b>${header}</b>

${formattedContent}

🕒 <i>Waktu: ${time} WIB</i>`;

  await _sendMessage(_chatId, fullMsg, { isHtml: true });
}

/**
 * Kirim Rekap Absensi Siswa & Guru (dijalankan otomatis pk 07:05 atau via /absen di bot)
 */
export async function sendDailyMorningAttendanceReport(targetChatId = null) {
  if (!_dbPool) return;
  if (!_initialized) await _loadConfig();
  if (_alertConfig['attendance'] === false && !targetChatId) return; // Ignore if disabled globally unless requested via bot cmd
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
      WHERE "timestamp"::date = $1::date
      ORDER BY "timestamp" ASC
    `, [today]).catch((e) => { console.error('[TelegramBot] Query Absensi Error:', e.message); return { rows: [] }; });

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
`📋 <b>LAPORAN KEHADIRAN PAGI</b>
📅 <i>${todayFormatted} (Pukul ${nowTime} WIB)</i>

👨‍🏫 <b>GURU & KARYAWAN</b>
• Hadir Tepat Waktu: <b>${guruTepat}</b> orang
• Terlambat: <b>${guruTelat}</b> orang
• Sudah Presensi Scan: <b>${teacherTaps.size}</b> dari ${totalGuruMaster} orang
• Belum Terdata Scan: <b>${guruBelum}</b> orang

🎓 <b>PRESENSI SISWA</b>
• Hadir Tepat Waktu: <b>${siswaTepat}</b> siswa
• Terlambat: <b>${siswaTelat}</b> siswa
• Izin / Sakit: <b>${siswaIzin + siswaSakit}</b> siswa (Izin: ${siswaIzin}, Sakit: ${siswaSakit})
• Total Tap Mesin: <b>${studentTaps.size}</b> dari ${totalStudentMaster} siswa
• Belum Absen: <b>${siswaBelum}</b> siswa

<i>Laporan otomatis dikirim dari Mesin Presensi & Sistem Kurmon.</i>`;

    await _sendMessage(destChatId, msg, { isHtml: true });
    console.log('[TelegramBot] ✅ Laporan kehadiran pagi 07:05 berhasil dikirim ke Telegram.');
  } catch (err) {
    console.error('[TelegramBot] Gagal kirim laporan kehadiran pagi:', err.message);
  }
}

// ── HTTP Handler ─────────────────────────────────────────

export async function handleTelegramBotRoutes(req, res, url, ctx) {
  const { send, requireAuthenticated, normalizeServerRole, getRawBody } = ctx;

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

  if (req.method === 'POST' && url.pathname === '/api/telegram-bot/config') {
    const session = requireAuthenticated(req, res);
    if (!session) return true;
    if (!['admin', 'superadmin'].includes(normalizeServerRole(session.role))) {
      send(req, res, 403, { ok: false, error: 'Hanya admin' });
      return true;
    }
    
    let body;
    try {
      body = JSON.parse(await getRawBody(req));
    } catch(e) {
      send(req, res, 400, { ok: false, error: 'Invalid JSON' });
      return true;
    }
    
    if (body.alerts) {
       _alertConfig = { ..._alertConfig, ...body.alerts };
       try {
         // Ambil existing config dari DB
         const { rows } = await _dbPool.query("SELECT extra_config FROM api_keys WHERE service_name = 'telegram_bot_monitor' LIMIT 1");
         if (rows.length > 0) {
            let existingCfg = rows[0].extra_config || {};
            if (typeof existingCfg === 'string') existingCfg = JSON.parse(existingCfg);
            existingCfg.alerts = _alertConfig;
            
            await _dbPool.query(
              "UPDATE api_keys SET extra_config = $1 WHERE service_name = 'telegram_bot_monitor'",
              [JSON.stringify(existingCfg)]
            );
         }
       } catch (err) {
         console.warn("[TelegramBot] Failed to save config to DB:", err.message);
       }
    }
    
    send(req, res, 200, { ok: true, alertConfig: _alertConfig });
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
      const safeName = escapeHtml(session.name || session.id);
      
      await _sendMessage(_chatId,
        `🚀 <b>Uji Coba Notifikasi Berhasil!</b>\n\n` +
        `Sistem Bot Telegram dari <b>Website Kurmon</b> telah berhasil terhubung dengan ruang obrolan ini.\n\n` +
        `• <b>Waktu:</b> ${time} WIB\n` +
        `• <b>Admin:</b> ${safeName}\n` +
        `• <b>Status:</b> Siap Menerima Notifikasi & Laporan Sistem`,
        { isHtml: true }
      );
      send(req, res, 200, { ok: true });
    } catch (err) {
      let errorMsg = err.message || 'Gagal mengirim pesan';
      if (errorMsg.toLowerCase().includes('chat not found')) {
        errorMsg = 'Chat tidak ditemukan di Telegram! Buka bot Anda di Telegram dan tekan tombol "START" (/start) atau kirim pesan ke bot terlebih dahulu agar bot diizinkan mengirim pesan.';
      } else if (errorMsg.toLowerCase() === 'not found') {
        errorMsg = 'Bot Token tidak valid (Not Found). Pastikan Anda memasukkan HTTP API Token yang benar dari @BotFather.';
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

/**
 * Escape karakter spesial HTML untuk Telegram
 */
export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Konversi pesan markdown (*bold*, _italic_, `code`, ```pre```) ke HTML Telegram
 * dan bersihkan karakter asterisk / underscore yang merusak tampilan
 */
export function formatMessageToHtml(rawText) {
  if (!rawText) return '';
  let text = String(rawText);

  // 1. Escape karakter HTML dasar terlebih dahulu
  text = escapeHtml(text);

  // 2. Ubah blok kode ```code``` -> <pre><code>code</code></pre>
  text = text.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');

  // 3. Ubah inline code `code` -> <code>code</code>
  text = text.replace(/`([^`\n]+)`/g, '<code>$1</code>');

  // 4. Ubah **bold** atau *bold* -> <b>bold</b>
  text = text.replace(/\*\*([^*\n]+)\*\*/g, '<b>$1</b>');
  text = text.replace(/\*([^*\n]+)\*/g, '<b>$1</b>');

  // 5. Ubah _italic_ -> <i>italic</i>
  text = text.replace(/_([^_\n]+)_/g, '<i>$1</i>');

  // 6. Bersihkan sisa karakter * atau _ yang tidak berpasangan agar tidak tampil berantakan
  text = text.replace(/(\s|^)\*+(\s|$)/g, '$1•$2');
  text = text.replace(/(\s|^)_+(\s|$)/g, '$1$2');

  return text;
}

async function _sendMessage(chatId, text, options = {}) {
  if (!_botToken || !chatId) return;
  
  const htmlText = options.isHtml ? text : formatMessageToHtml(text);

  try {
    const r = await fetch(`https://api.telegram.org/bot${_botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: htmlText,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });
    const d = await r.json();
    if (!d.ok) {
      console.warn('[TelegramBot] sendMessage HTML gagal:', d.description, 'Mencoba fallback plain text bersih...');
      // Fallback: hapus semua tag HTML dan karakter markdown yang merusak
      const cleanPlainText = text
        .replace(/<[^>]*>/g, '')
        .replace(/[*_`]/g, '');
      const retryRes = await fetch(`https://api.telegram.org/bot${_botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: cleanPlainText,
          disable_web_page_preview: true,
        }),
      });
      const retryData = await retryRes.json();
      if (retryData.ok) return retryData;
      console.warn('[TelegramBot] sendMessage fallback gagal:', retryData.description);
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
  if (d > 0) parts.push(`${d} hari`);
  if (h > 0) parts.push(`${h} jam`);
  parts.push(`${m} menit`);
  return parts.join(' ');
}

function _sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
