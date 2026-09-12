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
let _serviceName = 'telegram_backup';

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
      `SELECT service_name, api_key, extra_config FROM api_keys 
       WHERE (service_name = 'telegram_backup' OR service_name = 'telegram_bot_monitor' OR service_name LIKE 'telegram%') 
       AND is_active = true 
       ORDER BY CASE WHEN service_name = 'telegram_backup' THEN 1 WHEN service_name = 'telegram_bot_monitor' THEN 2 ELSE 3 END 
       LIMIT 1`
    );
    if (rows.length > 0) {
      _serviceName = rows[0].service_name;
      _botToken = rows[0].api_key ? rows[0].api_key.trim() : null;
      let cfg = {};
      try {
        cfg = typeof rows[0].extra_config === 'string' && rows[0].extra_config.trim().startsWith('{') 
          ? JSON.parse(rows[0].extra_config) 
          : (typeof rows[0].extra_config === 'object' ? rows[0].extra_config : {});
      } catch (e) {
        console.error("Format JSON pada Extra Config telegram bot tidak valid.");
      }
      _chatId = cfg?.chat_id ? String(cfg.chat_id).trim() : null;
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
  _registerBotCommands().catch(err => console.warn('[TelegramBot] register commands error:', err.message));
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
  // ── Dukung tombol inline keyboard (callback_query) ────────
  if (update.callback_query) {
    const cb = update.callback_query;
    const cbChatId = String(cb.message?.chat?.id || cb.from?.id);
    const cbData = cb.data;

    if (_botToken && cb.id) {
      fetch(`https://api.telegram.org/bot${_botToken}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callback_query_id: cb.id })
      }).catch(() => {});
    }

    update.message = {
      chat: { id: cbChatId },
      from: cb.from,
      text: cbData
    };
  }

  const msg = update.message;
  if (!msg || !msg.text) return;

  const chatId = String(msg.chat.id);
  const text = msg.text.trim();
  const from = msg.from?.username ? `@${msg.from.username}` : (msg.from?.first_name || chatId);

  // Keyboard menu utama yang menempel permanen di bawah chat HP/Desktop
  const MAIN_MENU_KEYBOARD = {
    keyboard: [
      [{ text: '📊 Rekap Presensi' }, { text: '🏫 Daftar Kelas' }],
      [{ text: '📈 Presensi Per Kelas' }, { text: '👨‍🏫 Presensi Guru' }],
      [{ text: '💻 Status Server' }, { text: '❓ Bantuan' }]
    ],
    resize_keyboard: true,
    is_persistent: true
  };

  const MAIN_INLINE_KEYBOARD = {
    inline_keyboard: [
      [
        { text: '📊 Rekap Presensi', callback_data: '/absen' },
        { text: '🏫 Daftar Kelas', callback_data: '/kelas' }
      ],
      [
        { text: '📈 Presensi Per Kelas', callback_data: '/rekap_kelas' },
        { text: '👨‍🏫 Presensi Guru', callback_data: '/absen_guru' }
      ],
      [
        { text: '💻 Status Server', callback_data: '/status' },
        { text: '❓ Panduan Bantuan', callback_data: '/help' }
      ]
    ]
  };

  const parts = text.split(/\s+/);
  let cmd = parts[0].toLowerCase().split('@')[0];

  // Pemetaan teks tombol keyboard ke perintah bot
  const lowerText = text.toLowerCase().trim();
  if (lowerText.includes('rekap presensi') || lowerText === 'rekap') {
    cmd = '/absen';
  } else if (lowerText.includes('daftar kelas')) {
    cmd = '/kelas';
  } else if (lowerText.includes('presensi per kelas') || lowerText.includes('rekap kelas')) {
    cmd = '/rekap_kelas';
  } else if (lowerText.includes('presensi guru') || lowerText.includes('absen guru')) {
    cmd = '/absen_guru';
  } else if (lowerText.includes('status server')) {
    cmd = '/status';
  } else if (lowerText.includes('bantuan') || lowerText.includes('petunjuk')) {
    cmd = '/help';
  } else if (lowerText === 'menu' || lowerText === '/menu') {
    cmd = '/menu';
  } else if (!cmd.startsWith('/')) {
    const knownWords = ['help', 'status', 'logs', 'backup', 'alerts', 'stats', 'absen', 'rekap', 'kelas', 'guru', 'menu'];
    if (knownWords.includes(cmd)) {
      cmd = '/' + cmd;
    }
  }
  const args = parts.slice(1);

  // Perintah /start dan /menu menampilkan sambutan dan memunculkan menu tombol di chat
  if (cmd === '/start' || cmd === '/menu') {
    const isRegistered = _allowedChatIds.has(chatId) || (!!_chatId && chatId === String(_chatId));
    const safeFrom = escapeHtml(from);

    await _sendMessage(chatId,
      `👋 <b>Halo ${safeFrom}! Selamat datang di Bot Kurmon!</b>\n\n` +
      `Sistem Monitoring & Presensi Sekolah Terpadu.\n` +
      `ID Chat Telegram Anda: <code>${chatId}</code>\n\n` +
      (isRegistered
        ? `✅ Chat ID Anda sudah terdaftar dan siap digunakan.\nSilakan gunakan tombol menu di bawah ini untuk memulai:`
        : `⚠️ Chat ID ini belum didaftarkan di sistem Kurmon.\nSalin ID ini: <code>${chatId}</code> lalu masukkan ke menu <b>Pengaturan > Backup & Bot Telegram > API Key</b> di aplikasi Kurmon.`
      ),
      {
        isHtml: true,
        reply_markup: isRegistered ? MAIN_MENU_KEYBOARD : undefined
      }
    );

    if (isRegistered) {
      await _sendMessage(chatId,
        `📋 <b>PILIHAN MENU CEPAT</b>\n\n` +
        `Pilih opsi yang ingin Anda akses:`,
        {
          isHtml: true,
          reply_markup: MAIN_INLINE_KEYBOARD
        }
      );
    }
    return;
  }

  // Whitelist check
  if (_allowedChatIds.size > 0 && !_allowedChatIds.has(chatId)) {
    await _sendMessage(chatId, `⛔ <b>Akses Tidak Diizinkan</b>\n\nChat ID Anda: <code>${chatId}</code>\nHubungi administrator untuk mendaftarkan ID ini.`, { isHtml: true });
    return;
  }
  if (_allowedChatIds.size === 0 && _chatId && chatId !== String(_chatId)) return;

  // Pintasan langsung dari link perintah, contoh: /absen_X_TKJ_1
  if (cmd.startsWith('/absen_') && !['/absen_guru', '/absen_semua', '/absen_rekap'].includes(cmd)) {
    const targetClass = cmd.slice(7).replace(/_/g, ' ').trim();
    await _cmdAbsenPerKelas(chatId, targetClass);
    return;
  }

  switch (cmd) {
    case '/help':   await _cmdHelp(chatId); break;
    case '/status': await _cmdStatus(chatId); break;
    case '/logs':   await _cmdLogs(chatId, parseInt(args[0]) || 10); break;
    case '/backup': await _cmdBackup(chatId, from); break;
    case '/alerts': await _cmdAlerts(chatId); break;
    case '/stats':  await _cmdStats(chatId); break;
    case '/absen':
    case '/rekap':
      if (args.length > 0) {
        await _cmdAbsenPerKelas(chatId, args.join(' '));
      } else {
        await sendDailyMorningAttendanceReport(chatId);
      }
      break;
    case '/absen_semua':
    case '/rekap_semua':
      await sendDailyMorningAttendanceReport(chatId);
      break;
    case '/kelas':
    case '/daftarkelas':
      await _cmdDaftarKelas(chatId);
      break;
    case '/rekap_kelas':
    case '/rekapkelas':
      await _cmdRekapSemuaKelas(chatId);
      break;
    case '/guru':
    case '/absen_guru':
    case '/presensi_guru':
      await _cmdAbsenGuru(chatId);
      break;
    default:
      await _sendMessage(chatId, `❓ Perintah tidak dikenal. Ketik <b>/help</b> untuk daftar perintah.`, { isHtml: true });
  }
}

// ── Commands ─────────────────────────────────────────────

async function _cmdHelp(chatId) {
  const MAIN_MENU_KEYBOARD = {
    keyboard: [
      [{ text: '📊 Rekap Presensi' }, { text: '🏫 Daftar Kelas' }],
      [{ text: '📈 Presensi Per Kelas' }, { text: '👨‍🏫 Presensi Guru' }],
      [{ text: '💻 Status Server' }, { text: '❓ Bantuan' }]
    ],
    resize_keyboard: true,
    is_persistent: true
  };

  await _sendMessage(chatId,
    `🤖 <b>Kurmon Bot Presensi & Monitoring</b>\n\n` +
    `Daftar perintah yang dapat Anda gunakan:\n\n` +
    `📱 <b>NAVIGASI & MENU:</b>\n` +
    `• <b>/menu</b> — Munculkan kembali tombol menu utama di layar chat\n\n` +
    `📊 <b>PRESENSI & DATA:</b>\n` +
    `• <b>/absen</b> — Rekap presensi keseluruhan (Guru, Karyawan, Siswa)\n` +
    `• <b>/absen [kelas]</b> — Cek detail kehadiran kelas (contoh: <code>/absen XI TKJ 1</code>)\n` +
    `• <b>/kelas</b> — Daftar seluruh kelas yang ada untuk cek cepat\n` +
    `• <b>/rekap_kelas</b> — Ringkasan persentase kehadiran per kelas\n` +
    `• <b>/absen_guru</b> — Detail presensi guru & karyawan hari ini\n\n` +
    `⚙️ <b>SISTEM & SERVER:</b>\n` +
    `• <b>/status</b> — Status kesehatan server & database\n` +
    `• <b>/stats</b> — Statistik jumlah data sistem\n` +
    `• <b>/alerts</b> — Alert keamanan sistem terkini\n` +
    `• <b>/logs [n]</b> — Log audit terakhir (contoh: <code>/logs 10</code>)\n` +
    `• <b>/backup</b> — Trigger backup database manual\n` +
    `• <b>/help</b> — Menampilkan panduan bantuan ini`,
    { isHtml: true, reply_markup: MAIN_MENU_KEYBOARD }
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

async function _registerBotCommands() {
  if (!_botToken) return;
  try {
    const commands = [
      { command: 'menu', description: 'Tampilkan tombol menu utama' },
      { command: 'absen', description: 'Rekap presensi keseluruhan hari ini' },
      { command: 'rekap_kelas', description: 'Ringkasan presensi per kelas' },
      { command: 'kelas', description: 'Daftar seluruh kelas aktif' },
      { command: 'absen_guru', description: 'Presensi guru & karyawan hari ini' },
      { command: 'status', description: 'Status kesehatan server & database' },
      { command: 'stats', description: 'Statistik data sistem Kurmon' },
      { command: 'alerts', description: 'Alert keamanan sistem terkini' },
      { command: 'backup', description: 'Trigger pencadangan database manual' },
      { command: 'help', description: 'Panduan lengkap perintah bot' },
    ];
    await fetch(`https://api.telegram.org/bot${_botToken}/setMyCommands`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commands }),
    });
  } catch (err) {
    console.warn('[TelegramBot] Gagal mendaftarkan menu perintah ke Telegram:', err.message);
  }
}

function _normalizeClassInput(str) {
  let s = String(str || '').trim().toUpperCase();
  s = s.replace(/^10(\s+|$)/, 'X $1')
       .replace(/^11(\s+|$)/, 'XI $1')
       .replace(/^12(\s+|$)/, 'XII $1')
       .replace(/\s+/g, ' ');
  return s.trim();
}

async function _findMatchingClasses(queryStr) {
  if (!_dbPool) return [];
  const { rows } = await _dbPool.query("SELECT payload FROM mst_classes");
  const allClasses = rows.map(r => r.payload).filter(Boolean);

  const cleanQuery = _normalizeClassInput(queryStr);
  const cleanQueryNoSpace = cleanQuery.replace(/\s+/g, '');

  if (!cleanQuery) return [];

  // 1. Cocok persis (Exact match)
  const exact = allClasses.filter(c => (c.name || '').toUpperCase().trim() === cleanQuery);
  if (exact.length === 1) return exact;

  // 2. Cocok persis tanpa spasi (misal 'XTKJ1' -> 'X TKJ 1')
  const exactNoSpace = allClasses.filter(c => (c.name || '').toUpperCase().replace(/\s+/g, '') === cleanQueryNoSpace);
  if (exactNoSpace.length === 1) return exactNoSpace;

  // 3. Cocok sebagian / mengandung kata
  const partial = allClasses.filter(c => {
    const nameUpper = (c.name || '').toUpperCase().trim();
    const nameNoSpace = nameUpper.replace(/\s+/g, '');
    return nameUpper.includes(cleanQuery) || nameNoSpace.includes(cleanQueryNoSpace);
  });

  return partial;
}

async function _cmdAbsenPerKelas(chatId, classQuery) {
  if (!_dbPool) {
    await _sendMessage(chatId, '❌ Database tidak tersedia.');
    return;
  }

  const queryTrimmed = String(classQuery || '').trim();
  if (!queryTrimmed) {
    await _sendMessage(chatId,
      `⚠️ <b>Nama kelas belum dimasukkan.</b>\n\n` +
      `Contoh penggunaan:\n` +
      `• <code>/absen X TKJ 1</code>\n` +
      `• <code>/absen XI RPL 2</code>\n\n` +
      `Ketik <b>/kelas</b> untuk melihat seluruh daftar kelas yang ada.`,
      { isHtml: true }
    );
    return;
  }

  const matches = await _findMatchingClasses(queryTrimmed);

  if (matches.length === 0) {
    await _sendMessage(chatId,
      `❌ Kelas <b>"${escapeHtml(queryTrimmed)}"</b> tidak ditemukan di database Kurmon.\n\n` +
      `💡 Ketik <b>/kelas</b> untuk melihat daftar nama kelas yang tersedia.`,
      { isHtml: true }
    );
    return;
  }

  if (matches.length > 1) {
    const exact = matches.find(c => (c.name || '').toUpperCase().trim() === _normalizeClassInput(queryTrimmed));
    if (!exact) {
      const list = matches.slice(0, 15).map(c => `• <code>/absen ${escapeHtml(c.name)}</code>`).join('\n');
      const more = matches.length > 15 ? `\n<i>...dan ${matches.length - 15} kelas lainnya.</i>` : '';
      await _sendMessage(chatId,
        `🔍 Ditemukan <b>${matches.length}</b> kelas yang mirip dengan "<b>${escapeHtml(queryTrimmed)}</b>":\n\n` +
        list + more + `\n\n` +
        `<i>Ketuk salah satu perintah di atas untuk melihat detail absensi.</i>`,
        { isHtml: true }
      );
      return;
    }
  }

  const cls = (matches.length === 1)
    ? matches[0]
    : (matches.find(c => (c.name || '').toUpperCase().trim() === _normalizeClassInput(queryTrimmed)) || matches[0]);
  const className = cls.name;

  // Ambil nama wali kelas jika terdata
  let walasName = '-';
  if (cls.homeroom) {
    const { rows: tRows } = await _dbPool.query(
      "SELECT payload FROM mst_teachers WHERE payload->>'id' = $1 OR payload->>'code' = $1 LIMIT 1",
      [String(cls.homeroom)]
    ).catch(() => ({ rows: [] }));
    if (tRows.length > 0 && tRows[0].payload?.name) {
      walasName = tRows[0].payload.name;
    }
  }

  // Ambil data siswa dari mst_students & hikvision_students
  const studentMap = new Map();

  const { rows: mstStudents } = await _dbPool.query(
    `SELECT payload FROM mst_students 
     WHERE LOWER(COALESCE(payload->>'class_name', payload->>'kelas', '')) = LOWER($1)`,
    [className]
  ).catch(() => ({ rows: [] }));
  mstStudents.forEach(r => {
    const p = r.payload || {};
    const nis = String(p.nis || p.code || '').trim();
    const name = String(p.name || p.nama || '').trim();
    if (nis) studentMap.set(nis, { nis, name: name || `Siswa ${nis}` });
  });

  const { rows: hikStudents } = await _dbPool.query(
    `SELECT nis, name FROM hikvision_students WHERE LOWER(class_name) = LOWER($1)`,
    [className]
  ).catch(() => ({ rows: [] }));
  hikStudents.forEach(r => {
    const nis = String(r.nis || '').trim();
    const name = String(r.name || '').trim();
    if (nis) {
      if (!studentMap.has(nis)) {
        studentMap.set(nis, { nis, name: name || `Siswa ${nis}` });
      } else if (!studentMap.get(nis).name && name) {
        studentMap.get(nis).name = name;
      }
    }
  });

  const totalStudents = studentMap.size;
  if (totalStudents === 0) {
    await _sendMessage(chatId,
      `ℹ️ Belum ada data siswa yang terdaftar di kelas <b>${escapeHtml(className)}</b>.\n\n` +
      `👨‍🏫 <b>Wali Kelas:</b> ${escapeHtml(walasName)}`,
      { isHtml: true }
    );
    return;
  }

  const nisList = Array.from(studentMap.keys());
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' });
  const todayFormatted = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' });
  const nowTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });

  // Ambil batas jam masuk (default 07:00)
  let masukLate = '07:00';
  try {
    const confRes = await _dbPool.query("SELECT data FROM app_data WHERE store_key = 'hikvision_attendance_config' LIMIT 1");
    if (confRes.rowCount > 0 && confRes.rows[0].data) {
      const conf = typeof confRes.rows[0].data === 'string' ? JSON.parse(confRes.rows[0].data) : confRes.rows[0].data;
      masukLate = conf?.siswa?.masuk_late || conf?.masuk_late || '07:00';
    }
  } catch (e) {}

  // Batch query log mesin dan surat izin hari ini
  const [logsRes, permitsRes] = await Promise.all([
    _dbPool.query(
      `SELECT employee_id, MIN(timestamp) as first_tap
       FROM hikvision_logs
       WHERE employee_id = ANY($1) AND timestamp::date = $2::date
       GROUP BY employee_id`,
      [nisList, today]
    ).catch(() => ({ rows: [] })),
    _dbPool.query(
      `SELECT siswa_nis, status, keterangan 
       FROM kedisiplinan_absensi 
       WHERE siswa_nis = ANY($1) AND tanggal::date = $2::date`,
      [nisList, today]
    ).catch(() => ({ rows: [] }))
  ]);

  const tapMap = new Map();
  logsRes.rows.forEach(r => {
    const t = new Date(r.first_tap).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }).replace('.', ':');
    tapMap.set(String(r.employee_id).trim(), t);
  });

  const permitMap = new Map();
  permitsRes.rows.forEach(r => {
    permitMap.set(String(r.siswa_nis).trim(), { status: r.status, ket: r.keterangan });
  });

  // Klasifikasi kehadiran
  const tepatList = [];
  const telatList = [];
  const permitList = [];
  const belumList = [];

  const sortedStudents = Array.from(studentMap.values()).sort((a, b) => a.name.localeCompare(b.name, 'id'));

  for (const s of sortedStudents) {
    const timeIn = tapMap.get(s.nis);
    const permit = permitMap.get(s.nis);

    if (timeIn) {
      if (timeIn > masukLate) {
        telatList.push({ ...s, time: timeIn });
      } else {
        tepatList.push({ ...s, time: timeIn });
      }
    } else if (permit && ['Izin', 'Sakit', 'Dispensasi'].includes(permit.status)) {
      permitList.push({ ...s, status: permit.status, ket: permit.ket });
    } else {
      belumList.push(s);
    }
  }

  const totalHadir = tepatList.length + telatList.length;
  const hadirPct = Math.round((totalHadir / totalStudents) * 100);

  let msg = `📊 <b>PRESENSI KELAS: ${escapeHtml(className)}</b>\n`;
  msg += `📅 <i>${todayFormatted} (${nowTime} WIB)</i>\n`;
  msg += `👨‍🏫 <b>Wali Kelas:</b> ${escapeHtml(walasName)}\n\n`;

  msg += `👥 <b>Total Siswa:</b> ${totalStudents} orang\n`;
  msg += `✅ <b>Hadir:</b> <b>${totalHadir}</b> (${hadirPct}%)\n`;
  msg += `  • Tepat Waktu: ${tepatList.length} orang\n`;
  msg += `  • Terlambat: ${telatList.length} orang\n`;
  if (permitList.length > 0) {
    msg += `📝 <b>Izin/Sakit:</b> ${permitList.length} orang\n`;
  }
  msg += `❌ <b>Belum Hadir:</b> <b>${belumList.length}</b> orang\n\n`;

  if (telatList.length > 0) {
    msg += `⏰ <b>Siswa Terlambat (&gt; ${masukLate}):</b>\n`;
    telatList.forEach(s => {
      msg += `• ${escapeHtml(s.name)} (<code>${s.time}</code>)\n`;
    });
    msg += `\n`;
  }

  if (permitList.length > 0) {
    msg += `📝 <b>Siswa Izin / Sakit:</b>\n`;
    permitList.forEach(s => {
      const detail = s.ket ? ` — <i>${escapeHtml(s.ket)}</i>` : '';
      msg += `• ${escapeHtml(s.name)} (<b>${escapeHtml(s.status)}</b>${detail})\n`;
    });
    msg += `\n`;
  }

  if (belumList.length > 0) {
    msg += `❌ <b>Belum Terdata Presensi Scan / Alpha (${belumList.length}):</b>\n`;
    const maxShow = 30;
    belumList.slice(0, maxShow).forEach((s, idx) => {
      msg += `${idx + 1}. ${escapeHtml(s.name)}\n`;
    });
    if (belumList.length > maxShow) {
      msg += `<i>...dan ${belumList.length - maxShow} siswa lainnya.</i>\n`;
    }
    msg += `\n`;
  } else if (totalHadir === totalStudents) {
    msg += `🎉 <i>Luar biasa! 100% siswa kelas ini telah hadir lengkap!</i>\n\n`;
  }

  msg += `<i>Ketik <b>/kelas</b> untuk kembali ke daftar kelas atau <b>/absen</b> untuk rekap global.</i>`;

  await _sendMessage(chatId, msg, { isHtml: true });
}

async function _cmdDaftarKelas(chatId) {
  if (!_dbPool) {
    await _sendMessage(chatId, '❌ Database tidak tersedia.');
    return;
  }

  const { rows: cRows } = await _dbPool.query("SELECT payload FROM mst_classes ORDER BY id ASC");
  const classes = cRows.map(r => r.payload).filter(Boolean);

  if (classes.length === 0) {
    await _sendMessage(chatId, '📋 Belum ada data kelas yang terdaftar.');
    return;
  }

  const groupX = [];
  const groupXI = [];
  const groupXII = [];
  const groupOther = [];

  classes.forEach(c => {
    const name = (c.name || '').trim();
    if (!name) return;
    if (/^X\s+/i.test(name)) groupX.push(name);
    else if (/^XI\s+/i.test(name)) groupXI.push(name);
    else if (/^XII\s+/i.test(name)) groupXII.push(name);
    else groupOther.push(name);
  });

  const sortAlpha = (a, b) => a.localeCompare(b, 'id', { numeric: true });
  groupX.sort(sortAlpha);
  groupXI.sort(sortAlpha);
  groupXII.sort(sortAlpha);
  groupOther.sort(sortAlpha);

  let msg = `🏫 <b>DAFTAR KELAS KURMON (${classes.length} KELAS)</b>\n\n`;
  msg += `<i>Ketuk salah satu perintah di bawah ini untuk melihat detail absensi kelas:</i>\n\n`;

  if (groupX.length > 0) {
    msg += `<b>📌 KELAS X:</b>\n`;
    groupX.forEach(name => {
      msg += `• /absen_${name.replace(/\s+/g, '_')} (<code>/absen ${name}</code>)\n`;
    });
    msg += `\n`;
  }

  if (groupXI.length > 0) {
    msg += `<b>📌 KELAS XI:</b>\n`;
    groupXI.forEach(name => {
      msg += `• /absen_${name.replace(/\s+/g, '_')} (<code>/absen ${name}</code>)\n`;
    });
    msg += `\n`;
  }

  if (groupXII.length > 0) {
    msg += `<b>📌 KELAS XII:</b>\n`;
    groupXII.forEach(name => {
      msg += `• /absen_${name.replace(/\s+/g, '_')} (<code>/absen ${name}</code>)\n`;
    });
    msg += `\n`;
  }

  if (groupOther.length > 0) {
    msg += `<b>📌 LAINNYA:</b>\n`;
    groupOther.forEach(name => {
      msg += `• /absen_${name.replace(/\s+/g, '_')} (<code>/absen ${name}</code>)\n`;
    });
    msg += `\n`;
  }

  msg += `💡 <i>Tip: Anda juga bisa mengetik langsung <b>/absen [nama_kelas]</b>, contoh: <code>/absen X TKJ 1</code></i>`;

  await _sendMessage(chatId, msg, { isHtml: true });
}

async function _cmdRekapSemuaKelas(chatId) {
  if (!_dbPool) {
    await _sendMessage(chatId, '❌ Database tidak tersedia.');
    return;
  }

  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' });
  const todayFormatted = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' });
  const nowTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });

  const { rows: cRows } = await _dbPool.query("SELECT payload FROM mst_classes ORDER BY id ASC");
  const classes = cRows.map(r => r.payload).filter(Boolean);

  if (classes.length === 0) {
    await _sendMessage(chatId, '📋 Belum ada data kelas yang terdaftar.');
    return;
  }

  const [mstRes, hikRes, todayLogsRes] = await Promise.all([
    _dbPool.query("SELECT payload FROM mst_students").catch(() => ({ rows: [] })),
    _dbPool.query("SELECT nis, class_name FROM hikvision_students").catch(() => ({ rows: [] })),
    _dbPool.query(
      `SELECT DISTINCT employee_id FROM hikvision_logs WHERE timestamp::date = $1::date`,
      [today]
    ).catch(() => ({ rows: [] }))
  ]);

  const tappedNisSet = new Set(todayLogsRes.rows.map(r => String(r.employee_id).trim()));

  const classStudentsMap = new Map();

  mstRes.rows.forEach(r => {
    const p = r.payload || {};
    const cls = String(p.class_name || p.kelas || '').trim();
    const nis = String(p.nis || p.code || '').trim();
    if (cls && nis) {
      const k = cls.toLowerCase();
      if (!classStudentsMap.has(k)) classStudentsMap.set(k, new Set());
      classStudentsMap.get(k).add(nis);
    }
  });

  hikRes.rows.forEach(r => {
    const cls = String(r.class_name || '').trim();
    const nis = String(r.nis || '').trim();
    if (cls && nis) {
      const k = cls.toLowerCase();
      if (!classStudentsMap.has(k)) classStudentsMap.set(k, new Set());
      classStudentsMap.get(k).add(nis);
    }
  });

  const results = classes.map(c => {
    const name = c.name || '';
    const stuSet = classStudentsMap.get(name.toLowerCase()) || new Set();
    const total = stuSet.size;
    let hadir = 0;
    stuSet.forEach(nis => {
      if (tappedNisSet.has(nis)) hadir++;
    });
    const pct = total > 0 ? Math.round((hadir / total) * 100) : 0;
    return { name, total, hadir, pct };
  });

  // Urutkan kelas secara alfabetis natural
  results.sort((a, b) => a.name.localeCompare(b.name, 'id', { numeric: true }));

  // Kelompokkan per tingkat
  const groupX = results.filter(r => /^X\s+/i.test(r.name));
  const groupXI = results.filter(r => /^XI\s+/i.test(r.name));
  const groupXII = results.filter(r => /^XII\s+/i.test(r.name));
  const groupOther = results.filter(r => !/^X\s+/i.test(r.name) && !/^XI\s+/i.test(r.name) && !/^XII\s+/i.test(r.name));

  let msg = `📊 <b>RINGKASAN PRESENSI PER KELAS</b>\n`;
  msg += `📅 <i>${todayFormatted} (${nowTime} WIB)</i>\n\n`;

  const renderGroup = (title, arr) => {
    if (arr.length === 0) return '';
    let out = `<b>📌 ${title}:</b>\n`;
    arr.forEach(r => {
      const icon = r.pct >= 90 ? '🟢' : (r.pct >= 70 ? '🟡' : '🔴');
      out += `${icon} <b>${escapeHtml(r.name)}:</b> ${r.hadir}/${r.total} hadir (<b>${r.pct}%</b>)\n`;
    });
    return out + '\n';
  };

  msg += renderGroup('TINGKAT X', groupX);
  msg += renderGroup('TINGKAT XI', groupXI);
  msg += renderGroup('TINGKAT XII', groupXII);
  if (groupOther.length > 0) msg += renderGroup('LAINNYA', groupOther);

  msg += `💡 <i>Ketik <b>/absen [nama_kelas]</b> untuk melihat detail siswa yang belum hadir per kelas.</i>`;

  await _sendMessage(chatId, msg, { isHtml: true });
}

async function _cmdAbsenGuru(chatId) {
  if (!_dbPool) {
    await _sendMessage(chatId, '❌ Database tidak tersedia.');
    return;
  }

  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' });
  const todayFormatted = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' });
  const nowTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });

  // 1. Ambil data guru
  const { rows: tRows } = await _dbPool.query("SELECT payload FROM mst_teachers ORDER BY id ASC").catch(() => ({ rows: [] }));
  const teachers = tRows.map(r => r.payload).filter(Boolean);

  if (teachers.length === 0) {
    await _sendMessage(chatId, '📋 Belum ada master data guru.');
    return;
  }

  // 2. Ambil logs presensi hari ini
  const { rows: logs } = await _dbPool.query(
    `SELECT employee_id, MIN(timestamp) as first_tap
     FROM hikvision_logs
     WHERE timestamp::date = $1::date
     GROUP BY employee_id`,
    [today]
  ).catch(() => ({ rows: [] }));

  const tapMap = new Map();
  logs.forEach(r => {
    const t = new Date(r.first_tap).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }).replace('.', ':');
    tapMap.set(String(r.employee_id).trim(), t);
  });

  let masukLate = '07:15';
  try {
    const confRes = await _dbPool.query("SELECT data FROM app_data WHERE store_key = 'hikvision_attendance_config' LIMIT 1");
    if (confRes.rowCount > 0 && confRes.rows[0].data) {
      const conf = typeof confRes.rows[0].data === 'string' ? JSON.parse(confRes.rows[0].data) : confRes.rows[0].data;
      masukLate = conf?.guru?.masuk_late || conf?.masuk_late || '07:15';
    }
  } catch (e) {}

  const tepatList = [];
  const telatList = [];
  const belumList = [];

  const sortedTeachers = [...teachers].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'id'));

  sortedTeachers.forEach(t => {
    const name = t.name || t.nama || 'Guru';
    const id = String(t.id || t.code || '').trim();
    const code = String(t.code || t.id || '').trim();

    const timeIn = tapMap.get(id) || tapMap.get(code);

    if (timeIn) {
      if (timeIn > masukLate) telatList.push({ name, time: timeIn });
      else tepatList.push({ name, time: timeIn });
    } else {
      belumList.push({ name });
    }
  });

  const totalHadir = tepatList.length + telatList.length;
  const pct = Math.round((totalHadir / teachers.length) * 100);

  let msg = `👨‍🏫 <b>PRESENSI GURU HARI INI</b>\n`;
  msg += `📅 <i>${todayFormatted} (${nowTime} WIB)</i>\n\n`;

  msg += `• Total Guru Terdaftar: <b>${teachers.length}</b> orang\n`;
  msg += `• Hadir Scan: <b>${totalHadir}</b> (${pct}%)\n`;
  msg += `  - Tepat Waktu (&lt;= ${masukLate}): <b>${tepatList.length}</b> orang\n`;
  msg += `  - Terlambat (&gt; ${masukLate}): <b>${telatList.length}</b> orang\n`;
  msg += `• Belum Presensi Scan: <b>${belumList.length}</b> orang\n\n`;

  if (telatList.length > 0) {
    msg += `⏰ <b>Guru Terlambat:</b>\n`;
    telatList.forEach(t => {
      msg += `• ${escapeHtml(t.name)} (<code>${t.time}</code>)\n`;
    });
    msg += `\n`;
  }

  if (belumList.length > 0) {
    msg += `❌ <b>Belum Presensi Scan (${belumList.length} guru):</b>\n`;
    const maxShow = 30;
    belumList.slice(0, maxShow).forEach((t, idx) => {
      msg += `${idx + 1}. ${escapeHtml(t.name)}\n`;
    });
    if (belumList.length > maxShow) {
      msg += `<i>...dan ${belumList.length - maxShow} guru lainnya.</i>\n`;
    }
  } else {
    msg += `🎉 <i>Seluruh guru telah melakukan presensi scan hari ini!</i>\n`;
  }

  await _sendMessage(chatId, msg, { isHtml: true });
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
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' });
    const todayFormatted = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' });
    const nowTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });

    // 1. Data log presensi dari hikvision_logs hari ini
    const { rows: todayLogs } = await _dbPool.query(`
      SELECT employee_id, person_type, timestamp
      FROM hikvision_logs
      WHERE timestamp::date = $1::date
      ORDER BY timestamp ASC
    `, [today]).catch((e) => { console.error('[TelegramBot] Query Absensi Error:', e.message); return { rows: [] }; });

    // Ambil data master guru, staff, dan siswa
    const { rows: tRows } = await _dbPool.query(`SELECT payload FROM mst_teachers`).catch(() => ({ rows: [] }));
    const { rows: sRows } = await _dbPool.query(`SELECT payload FROM mst_staffs`).catch(() => ({ rows: [] }));
    const { rows: stdRows } = await _dbPool.query(`SELECT COUNT(*) as count FROM mst_students`).catch(() => ({ rows: [{ count: 0 }] }));

    const teacherCodes = new Set();
    tRows.forEach(r => {
      const p = r.payload || {};
      if (p.id) teacherCodes.add(String(p.id).trim());
      if (p.code) teacherCodes.add(String(p.code).trim());
    });

    const staffCodes = new Set();
    sRows.forEach(r => {
      const p = r.payload || {};
      if (p.id) staffCodes.add(String(p.id).trim());
      if (p.code) staffCodes.add(String(p.code).trim());
    });

    const totalGuruMaster = tRows.length;
    const totalStaffMaster = sRows.length;
    const totalStudentMaster = parseInt(stdRows[0]?.count || 0, 10);

    // Ambil batas waktu keterlambatan dari config sistem
    let masukLateGuru = '07:15';
    let masukLateSiswa = '07:00';
    try {
      const confRes = await _dbPool.query("SELECT data FROM app_data WHERE store_key = 'hikvision_attendance_config' LIMIT 1");
      if (confRes.rowCount > 0 && confRes.rows[0].data) {
        const conf = typeof confRes.rows[0].data === 'string' ? JSON.parse(confRes.rows[0].data) : confRes.rows[0].data;
        masukLateGuru = conf?.guru?.masuk_late || conf?.masuk_late || '07:15';
        masukLateSiswa = conf?.siswa?.masuk_late || conf?.masuk_late || '07:00';
      }
    } catch (e) {}

    // Filter unique tap per user
    const teacherTaps = new Map();
    const staffTaps = new Map();
    const studentTaps = new Map();

    todayLogs.forEach(r => {
      const type = String(r.person_type || '').toLowerCase();
      const id = String(r.employee_id || '').trim();
      if (type === 'guru' || teacherCodes.has(id)) {
        if (!teacherTaps.has(id)) teacherTaps.set(id, r);
      } else if (type === 'karyawan' || type === 'staff' || staffCodes.has(id)) {
        if (!staffTaps.has(id)) staffTaps.set(id, r);
      } else {
        if (!studentTaps.has(id)) studentTaps.set(id, r);
      }
    });

    // Hitung guru tepat waktu vs terlambat
    let guruTepat = 0, guruTelat = 0;
    teacherTaps.forEach(r => {
      const timeOnly = new Date(r.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }).replace('.', ':');
      if (timeOnly > masukLateGuru) guruTelat++;
      else guruTepat++;
    });
    const guruBelum = Math.max(0, totalGuruMaster - teacherTaps.size);

    // Hitung siswa tepat waktu vs terlambat
    let siswaTepat = 0, siswaTelat = 0;
    studentTaps.forEach(r => {
      const timeOnly = new Date(r.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }).replace('.', ':');
      if (timeOnly > masukLateSiswa) siswaTelat++;
      else siswaTepat++;
    });
    const siswaBelum = Math.max(0, totalStudentMaster - studentTaps.size);

    // Ambil rekap surat izin / sakit / dispensasi siswa
    const { rows: suratRows } = await _dbPool.query(`
      SELECT status, COUNT(*) as cnt FROM kedisiplinan_absensi 
      WHERE tanggal::date = $1::date GROUP BY status
    `, [today]).catch(() => ({ rows: [] }));

    let siswaIzin = 0, siswaSakit = 0, siswaDispen = 0;
    suratRows.forEach(sr => {
      const st = String(sr.status || '').toLowerCase();
      if (st.includes('izin')) siswaIzin += parseInt(sr.cnt, 10);
      else if (st.includes('sakit')) siswaSakit += parseInt(sr.cnt, 10);
      else if (st.includes('dispen')) siswaDispen += parseInt(sr.cnt, 10);
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
• Izin / Sakit: <b>${siswaIzin + siswaSakit + siswaDispen}</b> siswa (Izin: ${siswaIzin}, Sakit: ${siswaSakit})
• Total Tap Mesin: <b>${studentTaps.size}</b> dari ${totalStudentMaster} siswa
• Belum Absen: <b>${siswaBelum}</b> siswa

<i>Laporan otomatis dikirim dari Mesin Presensi & Sistem Kurmon.</i>

💡 <b>Perintah Tambahan:</b>
• <code>/absen [nama_kelas]</code> — Detail presensi per kelas
• <code>/rekap_kelas</code> — Ringkasan kehadiran per kelas
• <code>/absen_guru</code> — Detail presensi guru & karyawan
• <code>/kelas</code> — Daftar seluruh kelas`;

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
        botTokenMasked: _botToken ? (_botToken.substring(0, 8) + '...' + _botToken.slice(-4)) : '',
        chatId: _chatId || '',
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
    
    try {
      // Ambil existing config dari DB (dukung telegram_backup dan telegram_bot_monitor)
      const { rows } = await _dbPool.query(
        `SELECT service_name, api_key, extra_config FROM api_keys 
         WHERE (service_name = 'telegram_backup' OR service_name = 'telegram_bot_monitor' OR service_name LIKE 'telegram%') 
         LIMIT 1`
      );
      const targetService = rows.length > 0 ? rows[0].service_name : 'telegram_backup';
      let existingCfg = rows.length > 0 ? (typeof rows[0].extra_config === 'string' ? JSON.parse(rows[0].extra_config || '{}') : rows[0].extra_config || {}) : {};

      if (body.alerts) {
        _alertConfig = { ..._alertConfig, ...body.alerts };
        existingCfg.alerts = _alertConfig;
      }
      if (body.chat_id !== undefined && String(body.chat_id).trim()) {
        existingCfg.chat_id = String(body.chat_id).trim();
        _chatId = existingCfg.chat_id;
      }
      
      const newBotToken = (body.bot_token !== undefined && String(body.bot_token).trim()) ? String(body.bot_token).trim() : (rows[0]?.api_key || '');

      await _dbPool.query(
        `INSERT INTO api_keys (service_name, service_label, api_key, extra_config, is_active)
         VALUES ($1, $2, $3, $4, true)
         ON CONFLICT (service_name) DO UPDATE SET 
           api_key = CASE WHEN $3 = '' AND api_keys.api_key IS NOT NULL THEN api_keys.api_key ELSE $3 END,
           extra_config = $4,
           is_active = true,
           updated_at = CURRENT_TIMESTAMP`,
        [targetService, 'Telegram Auto-Backup', newBotToken, JSON.stringify(existingCfg)]
      );

      await reloadTelegramBotConfig();
      send(req, res, 200, {
        ok: true,
        alertConfig: _alertConfig,
        isRunning: _isRunning,
        hasBotToken: !!_botToken,
        hasChatId: !!_chatId,
        chatId: _chatId || ''
      });
      return true;
    } catch (err) {
      console.warn("[TelegramBot] Failed to save config to DB:", err.message);
      send(req, res, 500, { ok: false, error: err.message });
      return true;
    }
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
      send(req, res, 400, { ok: false, error: 'Bot belum dikonfigurasi. Masukkan Bot Token dan Chat ID terlebih dahulu.' });
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
      } else if (errorMsg.toLowerCase().includes('bot was blocked')) {
        errorMsg = 'Bot diblokir oleh akun pengguna Telegram. Buka bot di Telegram dan klik "Unblock" / /start.';
      } else if (errorMsg.toLowerCase() === 'not found' || errorMsg.toLowerCase().includes('404')) {
        errorMsg = 'Bot Token tidak valid (Not Found). Pastikan Anda memasukkan HTTP API Token yang benar dari @BotFather.';
      } else if (errorMsg.toLowerCase().includes('unauthorized') || errorMsg.toLowerCase().includes('401')) {
        errorMsg = 'Bot Token tidak sah / ditolak oleh Telegram (Unauthorized). Periksa kembali token dari @BotFather.';
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
    const payload = {
      chat_id: chatId,
      text: htmlText,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    };
    if (options.reply_markup) {
      payload.reply_markup = options.reply_markup;
    }

    const r = await fetch(`https://api.telegram.org/bot${_botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const d = await r.json();
    if (!d.ok) {
      console.warn('[TelegramBot] sendMessage HTML gagal:', d.description, 'Mencoba fallback plain text bersih...');
      // Fallback: hapus semua tag HTML dan karakter markdown yang merusak
      const cleanPlainText = text
        .replace(/<[^>]*>/g, '')
        .replace(/[*_`]/g, '');
      const retryPayload = {
        chat_id: chatId,
        text: cleanPlainText,
        disable_web_page_preview: true,
      };
      if (options.reply_markup) {
        retryPayload.reply_markup = options.reply_markup;
      }
      const retryRes = await fetch(`https://api.telegram.org/bot${_botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(retryPayload),
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
