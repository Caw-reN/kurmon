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
import net from 'node:net';
import { decryptPassword, HikvisionAPI } from './hikvision-api.mjs';

/**
 * Pengecekan koneksi TCP port socket dengan diagnosa mendalam untuk status mesin
 */
function _probeDeviceTcp(ip, port = 80, timeoutMs = 2500) {
  return new Promise((resolve) => {
    const start = Date.now();
    const socket = new net.Socket();
    let done = false;

    socket.setTimeout(timeoutMs);

    socket.on('connect', () => {
      const latency = Date.now() - start;
      socket.destroy();
      if (!done) {
        done = true;
        resolve({ ok: true, latency, code: null, message: 'Connected' });
      }
    });

    socket.on('timeout', () => {
      socket.destroy();
      if (!done) {
        done = true;
        resolve({
          ok: false,
          latency: null,
          code: 'ETIMEDOUT',
          message: 'Connection Timeout'
        });
      }
    });

    socket.on('error', (err) => {
      socket.destroy();
      if (!done) {
        done = true;
        resolve({
          ok: false,
          latency: null,
          code: err.code || 'ERR_SOCKET',
          message: err.message
        });
      }
    });

    socket.connect(port, ip);
  });
}

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

  // Keyboard menu utama yang menempel permanen di bawah chat HP/Desktop (Lengkap & Terorganisir)
  const MAIN_MENU_KEYBOARD = {
    keyboard: [
      [{ text: '📊 Rekap Presensi' }, { text: '👨‍🏫 Presensi Guru' }],
      [{ text: '⏰ Siswa Terlambat' }, { text: '📟 Status Mesin Absensi' }],
      [{ text: '🔄 Tarik Log Mesin' }, { text: '🚨 Kasus Pelanggaran' }],
      [{ text: '🏆 Prestasi Siswa' }, { text: '📈 Presensi Per Kelas' }],
      [{ text: '🏫 Daftar Kelas' }, { text: '💬 Status WhatsApp' }],
      [{ text: '💻 Server & DB' }, { text: '💾 Backup Database' }],
      [{ text: '📢 Info Update & Versi' }, { text: '❓ Tanya & Bantuan' }]
    ],
    resize_keyboard: true,
    is_persistent: true
  };

  const MAIN_INLINE_KEYBOARD = {
    inline_keyboard: [
      [
        { text: '📊 Rekap Siswa', callback_data: '/absen' },
        { text: '👨‍🏫 Presensi Guru', callback_data: '/absen_guru' }
      ],
      [
        { text: '⏰ Keterlambatan', callback_data: '/terlambat' },
        { text: '📟 Status Mesin', callback_data: '/mesin' }
      ],
      [
        { text: '🔄 Tarik Log Sekarang', callback_data: '/sync' },
        { text: '🚨 Pelanggaran & SP', callback_data: '/pelanggaran' }
      ],
      [
        { text: '🏆 Prestasi Siswa', callback_data: '/prestasi' },
        { text: '📈 Rekap Per Kelas', callback_data: '/rekap_kelas' }
      ],
      [
        { text: '🏫 Daftar Kelas', callback_data: '/kelas' },
        { text: '💬 Status WhatsApp', callback_data: '/wa' }
      ],
      [
        { text: '💻 Status Server', callback_data: '/status' },
        { text: '🗄️ Info Database', callback_data: '/db' }
      ],
      [
        { text: '🛡️ Alert Keamanan', callback_data: '/alerts' },
        { text: '💾 Backup Database', callback_data: '/backup' }
      ],
      [
        { text: '📢 Info Update & Versi', callback_data: '/update' },
        { text: '❓ Tanya Asisten & Bantuan', callback_data: '/help' }
      ]
    ]
  };

  const parts = text.split(/\s+/);
  let cmd = parts[0].toLowerCase().split('@')[0];

  // Pemetaan teks tombol keyboard ke perintah bot
  const lowerText = text.toLowerCase().trim();
  if (lowerText.includes('rekap presensi') || lowerText === 'rekap') {
    cmd = '/absen';
  } else if (lowerText.includes('presensi guru') || lowerText.includes('absen guru')) {
    cmd = '/absen_guru';
  } else if (lowerText.includes('terlambat') || lowerText.includes('keterlambatan')) {
    cmd = '/terlambat';
  } else if (lowerText.includes('status mesin') || lowerText.includes('mesin absensi') || lowerText === 'mesin' || lowerText === 'perangkat') {
    cmd = '/mesin';
  } else if (lowerText.includes('tarik log') || lowerText.includes('tarik absensi') || lowerText === 'sync') {
    cmd = '/sync';
  } else if (lowerText.includes('kasus pelanggaran') || lowerText.includes('pelanggaran') || lowerText.includes('poin')) {
    cmd = '/pelanggaran';
  } else if (lowerText.includes('prestasi siswa') || lowerText.includes('prestasi')) {
    cmd = '/prestasi';
  } else if (lowerText.includes('status whatsapp') || lowerText.includes('whatsapp') || lowerText === 'wa') {
    cmd = '/wa';
  } else if (lowerText.includes('server & db') || lowerText.includes('info database') || lowerText === 'db' || lowerText === 'database') {
    cmd = '/db';
  } else if (lowerText.includes('daftar kelas')) {
    cmd = '/kelas';
  } else if (lowerText.includes('presensi per kelas') || lowerText.includes('rekap kelas')) {
    cmd = '/rekap_kelas';
  } else if (lowerText.includes('status server')) {
    cmd = '/status';
  } else if (lowerText.includes('statistik') || lowerText.includes('stats')) {
    cmd = '/stats';
  } else if (lowerText.includes('keamanan') || lowerText.includes('alert')) {
    cmd = '/alerts';
  } else if (lowerText.includes('backup') || lowerText.includes('cadangan')) {
    cmd = '/backup';
  } else if (lowerText.includes('info update') || lowerText.includes('changelog') || lowerText.includes('pembaruan') || lowerText === 'update' || lowerText === 'versi') {
    cmd = '/update';
  } else if (lowerText.includes('tanya') || lowerText.includes('bantuan') || lowerText.includes('panduan') || lowerText.includes('petunjuk')) {
    cmd = '/help';
  } else if (lowerText === 'menu' || lowerText === '/menu') {
    cmd = '/menu';
  } else if (!cmd.startsWith('/')) {
    const knownWords = [
      'help', 'status', 'logs', 'backup', 'alerts', 'stats', 'absen', 'rekap', 'kelas', 'guru', 'menu', 
      'mesin', 'perangkat', 'terlambat', 'sync', 'siswa', 'pelanggaran', 'poin', 'prestasi', 'wa', 'db', 'pkl', 'tanya', 'update', 'versi', 'changelog'
    ];
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
      if (args.length > 0) {
        await _cmdCariGuru(chatId, args.join(' '));
      } else {
        await _cmdAbsenGuru(chatId);
      }
      break;
    case '/siswa':
    case '/carisiswa':
      await _cmdCariSiswa(chatId, args.join(' '));
      break;
    case '/pelanggaran':
    case '/poin':
      await _cmdPelanggaran(chatId);
      break;
    case '/prestasi':
      await _cmdPrestasi(chatId);
      break;
    case '/sync':
    case '/tarik_log':
    case '/tariklog':
      await _cmdSync(chatId);
      break;
    case '/wa':
    case '/whatsapp':
      await _cmdStatusWa(chatId);
      break;
    case '/db':
    case '/database':
      await _cmdStatusDb(chatId);
      break;
    case '/pkl':
      await _cmdPkl(chatId);
      break;
    case '/mesin':
    case '/perangkat':
    case '/device':
    case '/devices':
      await _cmdStatusMesin(chatId);
      break;
    case '/terlambat':
    case '/late':
      await _cmdTerlambat(chatId);
      break;
    case '/update':
    case '/versi':
    case '/changelog':
    case '/pembaruan':
    case '/info_update':
      await _cmdInfoUpdate(chatId);
      break;
    case '/tanya':
      await _handleSmartAssistant(chatId, args.join(' '));
      break;
    default:
      await _handleSmartAssistant(chatId, text);
  }
}

// ── Commands ─────────────────────────────────────────────

async function _cmdHelp(chatId) {
  const MAIN_MENU_KEYBOARD = {
    keyboard: [
      [{ text: '📊 Rekap Presensi' }, { text: '👨‍🏫 Presensi Guru' }],
      [{ text: '⏰ Siswa Terlambat' }, { text: '📟 Status Mesin Absensi' }],
      [{ text: '🔄 Tarik Log Mesin' }, { text: '🚨 Kasus Pelanggaran' }],
      [{ text: '🏆 Prestasi Siswa' }, { text: '📈 Presensi Per Kelas' }],
      [{ text: '🏫 Daftar Kelas' }, { text: '💬 Status WhatsApp' }],
      [{ text: '💻 Server & DB' }, { text: '💾 Backup Database' }],
      [{ text: '📢 Info Update & Versi' }, { text: '❓ Tanya & Bantuan' }]
    ],
    resize_keyboard: true,
    is_persistent: true
  };

  await _sendMessage(chatId,
    `🤖 <b>PANDUAN LENGKAP BOT MONITORING & ASISTEN KURMON</b>\n\n` +
    `Bot resmi untuk pemantauan presensi, kehadiran guru, diagnosa perangkat keras IoT, kedisiplinan siswa, dan bantuan cerdas operasional sekolah.\n\n` +
    `📱 <b>NAVIGASI UTAMA:</b>\n` +
    `• <b>/menu</b> — Munculkan tombol menu navigasi utama\n` +
    `• <b>/update</b> — <b>Informasi rilis, update & fitur baru sistem</b>\n` +
    `• <b>/help</b> — Menampilkan buku panduan ini\n\n` +
    `📊 <b>PRESENSI & KETERLAMBATAN:</b>\n` +
    `• <b>/absen</b> — Rekap presensi lengkap siswa & guru hari ini\n` +
    `• <b>/terlambat</b> — Daftar siswa & guru yang terlambat hari ini\n` +
    `• <b>/rekap_kelas</b> — Ringkasan persentase kehadiran seluruh kelas\n` +
    `• <b>/kelas</b> — Daftar seluruh kelas aktif (bisa diklik instan)\n` +
    `• <b>/absen [nama kelas]</b> — Presensi detail satu kelas (contoh: <code>/absen XI TKJ 1</code>)\n\n` +
    `👨‍🏫 <b>GURU & KARYAWAN:</b>\n` +
    `• <b>/absen_guru</b> — Daftar kehadiran guru dan karyawan hari ini\n` +
    `• <b>/guru [nama/kode]</b> — Cari profil, NIP, kontak WA, dan status guru\n\n` +
    `🎓 <b>SISWA & KEDISIPLINAN:</b>\n` +
    `• <b>/siswa [nama/NIS]</b> — Cek data siswa, kelas, presensi & poin pelanggaran\n` +
    `• <b>/pelanggaran</b> — Rekap siswa dengan poin pelanggaran tertinggi & SP\n` +
    `• <b>/prestasi</b> — Daftar prestasi dan kejuaraan siswa terkini\n` +
    `• <b>/pkl</b> — Status penempatan dan monitoring PKL siswa\n\n` +
    `📟 <b>MESIN ABSENSI HIKVISION IoT:</b>\n` +
    `• <b>/mesin</b> — <b>Diagnosa real-time seluruh mesin absensi</b>\n` +
    `  <i>(Mengecek status online/offline dan mendeteksi penyebab detail jika mati/terputus)</i>\n` +
    `• <b>/sync</b> — <b>Tarik log absensi sekarang juga</b> secara manual\n\n` +
    `⚙️ <b>SERVER, DATABASE & SISTEM:</b>\n` +
    `• <b>/status</b> — Kesehatan server (Uptime, RAM, Koneksi Database)\n` +
    `• <b>/stats</b> — Statistik total data (Siswa, Guru, Staff, Log)\n` +
    `• <b>/db</b> — Kapasitas database PostgreSQL dan jumlah baris tabel\n` +
    `• <b>/wa</b> — Status integrasi WhatsApp Gateway (Fonnte)\n` +
    `• <b>/alerts</b> — Peringatan keamanan & aktivitas mencurigakan\n` +
    `• <b>/logs [n]</b> — Log audit aktivitas admin/pengguna terkini\n` +
    `• <b>/backup</b> — Unduh dan buat cadangan database seketika\n` +
    `• <b>/update</b> — Log versi dan rincian pembaruan Kurmon\n\n` +
    `💡 <b>ASISTEN CERDAS (TANYA APA SAJA):</b>\n` +
    `Anda bisa langsung mengetik pertanyaan bebas di chat tanpa garis miring! Contoh:\n` +
    `• <i>"Ada update apa saja?"</i>\n` +
    `• <i>"Bagaimana cara setting mesin absensi?"</i>\n` +
    `• <i>"Kenapa absensi hari ini kosong?"</i>\n` +
    `• <i>"Berapa jumlah siswa?"</i> atau <i>"Cari siswa Budi"</i>\n` +
    `• <i>"Apa password default admin?"</i>\n` +
    `• <i>"Bagaimana alur surat peringatan SP?"</i>`,
    { isHtml: true, reply_markup: MAIN_MENU_KEYBOARD }
  );
}

/**
 * Menampilkan informasi rilis, update, dan fitur baru sistem Kurmon
 */
async function _cmdInfoUpdate(chatId) {
  const version = 'v2.1.0';
  const releaseDate = '13 September 2026';
  
  const msg = 
`🚀 <b>INFORMASI PEMBARUAN & LOG RILIS SISTEM</b>
📦 <b>Versi Aplikasi:</b> <code>Kurmon ${version}</code>
📅 <b>Tanggal Rilis:</b> <i>${releaseDate}</i>
🏛️ <b>Status Sistem:</b> 🟢 <b>Stabil & Operasional</b>

✨ <b>DAFTAR PEMBARUAN TERBARU:</b>

1. 🤖 <b>Asisten Cerdas & AI Q&A Telegram:</b>
   • Bot kini dapat diajak bicara bahasa sehari-hari tanpa tanda garis miring (<code>/</code>).
   • Menjawab pertanyaan seputar akun default (<code>admin123</code>), aturan presensi 07:00, alur SP kesiswaan, kartu pelajar digital, modul ajar, dan akses HP lewat LAN.
   • Pencarian profil siswa (<code>/siswa [nama]</code>) & guru (<code>/guru [nama]</code>) instan dari chat.

2. 📟 <b>Diagnosa Mesin Absensi Mendalam (/mesin):</b>
   • Probe soket jaringan TCP secara live untuk mendeteksi latency dan respons.
   • Deteksi penyebab otomatis jika mesin mati:
     - <code>EHOSTUNREACH:</code> Jalur jaringan / link antar-kampus terputus.
     - <code>ETIMEDOUT:</code> Mesin mati, adaptor lepas, atau IP berubah.
     - <code>401 Unauthorized:</code> Password Digest Auth di database tidak cocok.
   • Fitur <b>/sync</b> untuk memaksa penarikan log mesin detik itu juga.

3. ⏰ <b>Rekap Keterlambatan Real-time (/terlambat):</b>
   • Rekap instan siswa & guru yang scan > 07:00 WIB hari ini beserta jam scan.
   • Terkoneksi ke auto-notifikasi WhatsApp Gateway untuk orang tua.

4. 🔒 <b>Peningkatan Keamanan & Manajemen Token:</b>
   • Hook sesi terpusat (<code>useAuthToken</code>) dan deteksi kedaluwarsa sesi (<code>useSessionExpiry</code>) dengan peringatan banner otomatis 5 menit sebelum logout.
   • Redaksi proteksi keamanan untuk kredensial sensitif saat backup database.

5. 📊 <b>Menu Operasional Baru:</b>
   • <code>/pelanggaran</code> — Monitoring 5 siswa poin tertinggi & kasus terkini.
   • <code>/prestasi</code> — Rekap prestasi lomba dan akademik siswa.
   • <code>/wa</code> — Pengecekan token & status gateway WhatsApp.
   • <code>/db</code> — Ukuran storage PostgreSQL dan statistik baris tabel.
   • <code>/pkl</code> — Status lokasi DU/DI dan siswa PKL aktif.

💡 <i>Gunakan tombol <b>Menu</b> di bawah atau ketik <b>/menu</b> untuk menjelajahi semua fitur.</i>`;

  await _sendMessage(chatId, msg, { isHtml: true });
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

/**
 * Pengecekan status & diagnosa real-time seluruh mesin absensi Hikvision
 * Menampilkan status online/offline beserta penyebab detail jika tidak terhubung
 */
async function _cmdStatusMesin(chatId) {
  if (!_dbPool) {
    await _sendMessage(chatId, '❌ Database tidak tersedia.');
    return;
  }

  await _sendMessage(chatId, '🔍 <i>Sedang mendiagnosa seluruh mesin absensi secara real-time... Mohon tunggu sebentar.</i>', { isHtml: true });

  try {
    const { rows: devices } = await _dbPool.query('SELECT * FROM hikvision_devices ORDER BY id');
    if (devices.length === 0) {
      await _sendMessage(chatId, '⚠️ Belum ada mesin absensi yang terdaftar di database.');
      return;
    }

    const todayJkt = new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);

    // Ambil rekap log per mesin dari database
    const { rows: logStats } = await _dbPool.query(`
      SELECT device_id, 
             MAX(timestamp) as last_log_time, 
             MAX(created_at) as last_sync_time, 
             COUNT(id) as total_logs,
             COUNT(CASE WHEN timestamp::date = $1 THEN 1 END) as today_logs
      FROM hikvision_logs
      GROUP BY device_id
    `, [todayJkt]);

    const statMap = new Map(logStats.map(s => [s.device_id, s]));

    let onlineCount = 0;
    let offlineCount = 0;
    const deviceReports = [];

    for (const dev of devices) {
      const stats = statMap.get(dev.id) || { total_logs: 0, today_logs: 0, last_log_time: null, last_sync_time: null };
      const ip = dev.ip_address;
      const port = 80;

      // 1. TCP Socket Ping / Probe
      const probeRes = await _probeDeviceTcp(ip, port, 2500);

      let statusIcon = '🟢';
      let statusBadge = 'ONLINE';
      let latencyStr = probeRes.latency !== null ? `${probeRes.latency} ms` : '-';
      let detailDiagnostic = '';

      if (!probeRes.ok) {
        statusIcon = '🔴';
        statusBadge = 'OFFLINE / TERPUTUS';
        offlineCount++;

        if (probeRes.code === 'EHOSTUNREACH') {
          detailDiagnostic = 
            `⚠️ <b>Analisis Kendala:</b> <code>Host Unreachable</code>\n` +
            `• <b>Penyebab:</b> Jalur router antar-kampus terputus atau subnet tidak dapat dijangkau dari server.\n` +
            `• <b>Solusi:</b> Periksa switch utama / link radio / kabel FO antar kampus, pastikan gateway router menyala.`;
        } else if (probeRes.code === 'ENETUNREACH') {
          detailDiagnostic = 
            `⚠️ <b>Analisis Kendala:</b> <code>Network Unreachable</code>\n` +
            `• <b>Penyebab:</b> Tidak ada rute gateway menuju alamat IP <code>${escapeHtml(ip)}</code>.\n` +
            `• <b>Solusi:</b> Periksa kabel LAN server atau tabel routing jaringan lokal.`;
        } else if (probeRes.code === 'ETIMEDOUT') {
          detailDiagnostic = 
            `⚠️ <b>Analisis Kendala:</b> <code>Connection Timeout (2.5s)</code>\n` +
            `• <b>Penyebab:</b> Mesin tidak merespon paket jaringan. Kemungkinan mesin mati (power off / mati lampu), kabel LAN tercabut, atau IP mesin diubah / bentrok.\n` +
            `• <b>Solusi:</b> Cek fisik mesin di lokasi, pastikan adaptor PoE / power menyala dan lampu port LAN berkedip.`;
        } else if (probeRes.code === 'ECONNREFUSED') {
          detailDiagnostic = 
            `⚠️ <b>Analisis Kendala:</b> <code>Connection Refused (Port 80)</code>\n` +
            `• <b>Penyebab:</b> IP aktif namun port HTTP ditolak. Service web ISAPI Hikvision mungkin sedang restart atau crash.\n` +
            `• <b>Solusi:</b> Restart mesin absensi (cabut dan colok kembali power adaptor).`;
        } else {
          detailDiagnostic = 
            `⚠️ <b>Analisis Kendala:</b> <code>${escapeHtml(probeRes.message || 'Gagal terhubung')}</code>\n` +
            `• <b>Solusi:</b> Cek jaringan fisik dan status kelistrikan mesin di lokasi.`;
        }
      } else {
        // TCP OK -> Cek Autentikasi ISAPI
        try {
          const plainPwd = decryptPassword(dev.encrypted_password, dev.iv_vector);
          const api = new HikvisionAPI(ip, dev.username, plainPwd);
          const testStart = new Date(Date.now() - 30 * 60 * 1000);
          const testEnd = new Date();
          await api.searchEvents(testStart, testEnd);
          onlineCount++;
          detailDiagnostic = `✅ <b>Kondisi:</b> Terhubung stabil (${latencyStr}), port terbuka & kredensial valid siap tarik log.`;
        } catch (authErr) {
          if (authErr.message?.includes('401') || authErr.message?.includes('auth') || authErr.message?.includes('Unauthorized')) {
            statusIcon = '🟠';
            statusBadge = 'KREDENSIAL SALAH (401)';
            offlineCount++;
            detailDiagnostic = 
              `⚠️ <b>Analisis Kendala:</b> <code>401 Unauthorized (Digest Auth)</code>\n` +
              `• <b>Penyebab:</b> Mesin online dan port terbuka (${latencyStr}), namun password ditolak oleh mesin.\n` +
              `• <b>Solusi:</b> Perbarui password perangkat di menu <b>Pengaturan > Mesin Hikvision</b>.`;
          } else {
            onlineCount++;
            detailDiagnostic = `✅ <b>Kondisi:</b> Port terbuka (${latencyStr}), respon: ${escapeHtml(authErr.message.slice(0, 80))}`;
          }
        }
      }

      const lastScanStr = stats.last_log_time 
        ? new Date(stats.last_log_time).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) + ' WIB'
        : 'Belum ada data';
      const lastSyncStr = stats.last_sync_time
        ? new Date(stats.last_sync_time).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) + ' WIB'
        : 'Belum pernah';

      deviceReports.push(
        `${statusIcon} <b>[ID ${dev.id}] ${escapeHtml(dev.location || 'Mesin Absensi')}</b>\n` +
        `• <b>IP:</b> <code>${escapeHtml(ip)}</code> | <b>Tipe:</b> ${escapeHtml(dev.device_type || 'siswa')}\n` +
        `• <b>Status Jaringan:</b> <b>${statusBadge}</b> ${probeRes.latency ? `(${latencyStr})` : ''}\n` +
        `• <b>Log Hari Ini:</b> <b>${stats.today_logs}</b> scan | <b>Total:</b> ${stats.total_logs} log\n` +
        `• <b>Scan Terakhir:</b> ${lastScanStr}\n` +
        `• <b>Sinkron Terakhir:</b> ${lastSyncStr}\n` +
        `${detailDiagnostic}`
      );
    }

    const summaryHeader = 
      `📟 <b>DIAGNOSA REAL-TIME MESIN ABSENSI</b>\n` +
      `<i>Pengecekan koneksi langsung dari server Kurmon</i>\n\n` +
      `📊 <b>Hasil:</b> 🟢 <b>${onlineCount} Online</b> | 🔴 <b>${offlineCount} Bermasalah</b>\n` +
      `📅 <b>Waktu Cek:</b> ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n\n`;

    const troubleshootFooter = offlineCount > 0
      ? `\n━━━━━━━━━━━━━━━━━━━━━\n` +
        `💡 <b>CATATAN TIM IT / TEKNISI:</b>\n` +
        `• Jika hari Minggu/Libur, mesin di kampus tertentu wajar dimatikan.\n` +
        `• Jika hari aktif sekolah namun mesin 🔴, periksa power adaptor PoE & switch LAN di lokasi bersangkutan.`
      : `\n━━━━━━━━━━━━━━━━━━━━━\n` +
        `✨ <i>Semua mesin absensi terhubung lancar dan siap memproses kehadiran.</i>`;

    const half = Math.ceil(deviceReports.length / 2);
    const part1 = summaryHeader + deviceReports.slice(0, half).join('\n\n');
    const part2 = deviceReports.slice(half).join('\n\n') + troubleshootFooter;

    await _sendMessage(chatId, part1, { isHtml: true });
    if (deviceReports.length > half) {
      await _sendMessage(chatId, part2, { isHtml: true });
    }

  } catch (err) {
    await _sendMessage(chatId, `❌ Gagal memeriksa status mesin: ${escapeHtml(err.message)}`, { isHtml: true });
  }
}

/**
 * Menampilkan daftar keterlambatan siswa dan guru hari ini
 */
async function _cmdTerlambat(chatId) {
  if (!_dbPool) {
    await _sendMessage(chatId, '❌ Database tidak tersedia.');
    return;
  }
  try {
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' });
    
    let masukLate = '07:00';
    let guruLate = '07:00';
    try {
      const confRes = await _dbPool.query("SELECT data FROM app_data WHERE store_key = 'main_store'");
      if (confRes.rows.length > 0 && confRes.rows[0].data) {
        const conf = typeof confRes.rows[0].data === 'string' ? JSON.parse(confRes.rows[0].data) : confRes.rows[0].data;
        masukLate = conf?.featureSettings?.masuk_late || conf?.siswa?.masuk_late || '07:00';
        guruLate = conf?.featureSettings?.guru_masuk_late || conf?.guru?.masuk_late || '07:00';
      }
    } catch(e) {}

    // 1. Siswa Terlambat Hari Ini
    const { rows: siswaLate } = await _dbPool.query(`
      SELECT l.employee_id, MIN(l.timestamp) as scan_time,
             COALESCE(ms.payload->>'name', ms.payload->>'nama', hs.name, l.employee_id) as student_name,
             COALESCE(ms.payload->>'class_name', ms.payload->>'kelas', hs.class_name, '-') as class_name
      FROM hikvision_logs l
      LEFT JOIN mst_students ms ON ms.payload->>'nis' = l.employee_id OR ms.payload->>'code' = l.employee_id
      LEFT JOIN hikvision_students hs ON hs.nis = l.employee_id
      WHERE l.timestamp::date = $1::date
        AND l.person_type = 'siswa'
        AND CAST(l.timestamp AS TIME) > $2::time
      GROUP BY l.employee_id, ms.payload, hs.name, hs.class_name
      ORDER BY scan_time ASC
      LIMIT 50
    `, [today, masukLate]);

    // 2. Guru / Karyawan Terlambat Hari Ini
    const { rows: guruLateList } = await _dbPool.query(`
      SELECT l.employee_id, MIN(l.timestamp) as scan_time,
             COALESCE(mt.payload->>'name', mt.payload->>'nama', mf.payload->>'name', l.employee_id) as name,
             l.person_type
      FROM hikvision_logs l
      LEFT JOIN mst_teachers mt ON mt.payload->>'code' = l.employee_id OR mt.payload->>'nip' = l.employee_id
      LEFT JOIN mst_staffs mf ON mf.payload->>'staff_code' = l.employee_id OR mf.payload->>'code' = l.employee_id
      WHERE l.timestamp::date = $1::date
        AND l.person_type IN ('guru', 'karyawan', 'staff')
        AND CAST(l.timestamp AS TIME) > $2::time
      GROUP BY l.employee_id, mt.payload, mf.payload, l.person_type
      ORDER BY scan_time ASC
      LIMIT 30
    `, [today, guruLate]);

    let msg = `⏰ <b>REKAP KETERLAMBATAN HARI INI</b>\n` +
              `📅 <b>Tanggal:</b> ${new Date().toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}\n` +
              `⏳ <b>Batas Jam Masuk Siswa:</b> <code>${masukLate} WIB</code>\n` +
              `⏳ <b>Batas Jam Masuk Guru:</b> <code>${guruLate} WIB</code>\n` +
              `━━━━━━━━━━━━━━━━━━━━━\n\n`;

    msg += `👨‍🏫 <b>GURU & KARYAWAN TERLAMBAT (${guruLateList.length}):</b>\n`;
    if (guruLateList.length === 0) {
      msg += `<i>Tidak ada guru/karyawan terlambat hari ini.</i>\n\n`;
    } else {
      guruLateList.forEach((g, idx) => {
        const timeStr = new Date(g.scan_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }).replace('.', ':');
        msg += `${idx + 1}. <b>${escapeHtml(g.name)}</b> (${escapeHtml(g.person_type)})\n   🕒 Masuk: <code>${timeStr} WIB</code>\n`;
      });
      msg += `\n`;
    }

    msg += `🎓 <b>SISWA TERLAMBAT (${siswaLate.length}):</b>\n`;
    if (siswaLate.length === 0) {
      msg += `<i>Tidak ada siswa tercatat terlambat hari ini.</i>\n`;
    } else {
      siswaLate.forEach((s, idx) => {
        const timeStr = new Date(s.scan_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }).replace('.', ':');
        msg += `${idx + 1}. <b>${escapeHtml(s.student_name)}</b> (${escapeHtml(s.class_name)})\n   🕒 Scan: <code>${timeStr} WIB</code> | NIS: <code>${escapeHtml(s.employee_id)}</code>\n`;
      });
    }

    await _sendMessage(chatId, msg, { isHtml: true });
  } catch (err) {
    await _sendMessage(chatId, `❌ Gagal mengambil rekap keterlambatan: ${escapeHtml(err.message)}`, { isHtml: true });
  }
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
      { command: 'menu', description: 'Tampilkan tombol menu navigasi' },
      { command: 'absen', description: 'Rekap presensi lengkap hari ini' },
      { command: 'absen_guru', description: 'Presensi guru & staff hari ini' },
      { command: 'terlambat', description: 'Rekap keterlambatan siswa & guru' },
      { command: 'mesin', description: 'Diagnosa real-time mesin absensi' },
      { command: 'sync', description: 'Tarik log absensi sekarang juga' },
      { command: 'siswa', description: 'Cari data siswa, presensi & poin' },
      { command: 'guru', description: 'Cari kontak & info guru/staff' },
      { command: 'pelanggaran', description: 'Rekap poin pelanggaran & status SP' },
      { command: 'prestasi', description: 'Daftar prestasi siswa di kesiswaan' },
      { command: 'rekap_kelas', description: 'Ringkasan presensi per kelas' },
      { command: 'kelas', description: 'Daftar seluruh kelas aktif' },
      { command: 'status', description: 'Status kesehatan server & sistem' },
      { command: 'stats', description: 'Statistik data sistem Kurmon' },
      { command: 'wa', description: 'Status layanan WhatsApp Gateway' },
      { command: 'db', description: 'Info kapasitas & tabel database' },
      { command: 'pkl', description: 'Monitoring PKL & tempat magang' },
      { command: 'alerts', description: 'Alert peringatan keamanan sistem' },
      { command: 'logs', description: 'Log audit aktivitas terakhir' },
      { command: 'backup', description: 'Trigger backup database manual' },
      { command: 'update', description: 'Info pembaruan & rilis fitur baru' },
      { command: 'help', description: 'Panduan lengkap & tanya asisten' },
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

/**
 * Mencari profil siswa, kelas, presensi hari ini, dan poin pelanggaran
 */
async function _cmdCariSiswa(chatId, query) {
  if (!_dbPool) { await _sendMessage(chatId, '❌ Database tidak tersedia.'); return; }
  const q = String(query || '').trim();
  if (!q) {
    await _sendMessage(chatId, '💡 <b>Format Penggunaan:</b>\n<code>/siswa [nama atau NIS]</code>\n\nContoh: <code>/siswa Kevin</code> atau <code>/siswa 252610123</code>', { isHtml: true });
    return;
  }
  const { rows } = await _dbPool.query(`
    SELECT ms.id, ms.payload, hs.name as hs_name, hs.class_name as hs_class
    FROM mst_students ms
    LEFT JOIN hikvision_students hs ON hs.nis = ms.payload->>'nis'
    WHERE ms.payload->>'name' ILIKE $1 
       OR ms.payload->>'nama' ILIKE $1 
       OR ms.payload->>'nis' ILIKE $1
       OR ms.id ILIKE $1
    LIMIT 5
  `, [`%${q}%`]);

  if (rows.length === 0) {
    await _sendMessage(chatId, `❌ Siswa dengan kata kunci "<b>${escapeHtml(q)}</b>" tidak ditemukan.`, { isHtml: true });
    return;
  }

  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' });

  for (const r of rows) {
    const p = typeof r.payload === 'string' ? JSON.parse(r.payload) : (r.payload || {});
    const nis = p.nis || p.code || r.id;
    const name = p.name || p.nama || r.hs_name || 'Tanpa Nama';
    const className = p.class_name || p.kelas || r.hs_class || '-';
    const gender = p.gender || p.jenis_kelamin || '-';

    const [logRes, permitRes, poinRes] = await Promise.all([
      _dbPool.query("SELECT timestamp FROM hikvision_logs WHERE employee_id = $1 AND timestamp::date = $2 ORDER BY timestamp ASC LIMIT 1", [nis, today]),
      _dbPool.query("SELECT status, keterangan FROM kedisiplinan_absensi WHERE siswa_nis = $1 AND tanggal::date = $2", [nis, today]),
      _dbPool.query("SELECT COALESCE(SUM(poin), 0) as total_poin FROM kedisiplinan_riwayat_poin WHERE siswa_nis = $1 AND jenis = 'pelanggaran'", [nis])
    ]);

    let absenStatus = '⚪ Belum ada catatan scan hari ini';
    if (logRes.rows.length > 0) {
      const scanTime = new Date(logRes.rows[0].timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }).replace('.', ':');
      absenStatus = `🟢 Hadir (Scan: ${scanTime} WIB)`;
    } else if (permitRes.rows.length > 0) {
      absenStatus = `🟡 ${permitRes.rows[0].status} (${permitRes.rows[0].keterangan || '-'})`;
    }

    const totalPoin = parseInt(poinRes.rows[0]?.total_poin || 0, 10);
    let statusSP = '🟢 Tertib';
    if (totalPoin >= 50) statusSP = '🔴 SP-3 (Panggilan Orang Tua)';
    else if (totalPoin >= 30) statusSP = '🟠 SP-2 (Peringatan Keras)';
    else if (totalPoin >= 15) statusSP = '🟡 SP-1 (Teguran Pertama)';

    await _sendMessage(chatId,
      `🎓 <b>PROFIL SISWA: ${escapeHtml(name)}</b>\n\n` +
      `• <b>NIS:</b> <code>${escapeHtml(nis)}</code>\n` +
      `• <b>Kelas:</b> <b>${escapeHtml(className)}</b>\n` +
      `• <b>Jenis Kelamin:</b> ${escapeHtml(gender)}\n` +
      `• <b>Presensi Hari Ini:</b> ${absenStatus}\n` +
      `• <b>Poin Pelanggaran:</b> <b>${totalPoin} Poin</b> (${statusSP})\n`,
      { isHtml: true }
    );
  }
}

/**
 * Mencari data guru & kontak
 */
async function _cmdCariGuru(chatId, query) {
  if (!_dbPool) { await _sendMessage(chatId, '❌ Database tidak tersedia.'); return; }
  const q = String(query || '').trim();
  const { rows } = await _dbPool.query(`
    SELECT id, payload FROM mst_teachers
    WHERE payload->>'name' ILIKE $1 
       OR payload->>'nama' ILIKE $1 
       OR payload->>'nip' ILIKE $1 
       OR payload->>'code' ILIKE $1
       OR id ILIKE $1
    LIMIT 5
  `, [`%${q}%`]);

  if (rows.length === 0) {
    await _sendMessage(chatId, `❌ Guru dengan kata kunci "<b>${escapeHtml(q)}</b>" tidak ditemukan.`, { isHtml: true });
    return;
  }

  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' });

  for (const r of rows) {
    const p = typeof r.payload === 'string' ? JSON.parse(r.payload) : (r.payload || {});
    const code = p.code || r.id;
    const name = p.name || p.nama || 'Guru';
    const nip = p.nip || '-';
    const phone = p.phone || p.no_hp || p.telepon || '-';
    const subject = p.subject || p.mapel || '-';

    const logRes = await _dbPool.query("SELECT timestamp FROM hikvision_logs WHERE employee_id = $1 AND timestamp::date = $2 ORDER BY timestamp ASC LIMIT 1", [code, today]);
    let statusHadir = '⚪ Belum ada catatan scan hari ini';
    if (logRes.rows.length > 0) {
      const scanTime = new Date(logRes.rows[0].timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }).replace('.', ':');
      statusHadir = `🟢 Hadir (Scan: ${scanTime} WIB)`;
    }

    await _sendMessage(chatId,
      `👨‍🏫 <b>PROFIL GURU: ${escapeHtml(name)}</b>\n\n` +
      `• <b>Kode Guru:</b> <code>${escapeHtml(code)}</code>\n` +
      `• <b>NIP:</b> <code>${escapeHtml(nip)}</code>\n` +
      `• <b>Mata Pelajaran:</b> ${escapeHtml(subject)}\n` +
      `• <b>Kontak WhatsApp:</b> <code>${escapeHtml(phone)}</code>\n` +
      `• <b>Presensi Hari Ini:</b> ${statusHadir}\n`,
      { isHtml: true }
    );
  }
}

/**
 * Menampilkan kasus pelanggaran dan top siswa dengan poin tertinggi
 */
async function _cmdPelanggaran(chatId) {
  if (!_dbPool) { await _sendMessage(chatId, '❌ Database tidak tersedia.'); return; }
  try {
    const [topRows, recentRows] = await Promise.all([
      _dbPool.query(`
        SELECT p.siswa_nis, SUM(p.poin) as total_poin,
               COALESCE(ms.payload->>'name', ms.payload->>'nama', p.siswa_nis) as student_name,
               COALESCE(ms.payload->>'class_name', ms.payload->>'kelas', '-') as class_name
        FROM kedisiplinan_riwayat_poin p
        LEFT JOIN mst_students ms ON ms.payload->>'nis' = p.siswa_nis OR ms.id = p.siswa_nis
        WHERE p.jenis = 'pelanggaran'
        GROUP BY p.siswa_nis, ms.payload
        ORDER BY total_poin DESC
        LIMIT 5
      `),
      _dbPool.query(`
        SELECT p.*, 
               COALESCE(ms.payload->>'name', ms.payload->>'nama', p.siswa_nis) as student_name,
               COALESCE(ms.payload->>'class_name', ms.payload->>'kelas', '-') as class_name
        FROM kedisiplinan_riwayat_poin p
        LEFT JOIN mst_students ms ON ms.payload->>'nis' = p.siswa_nis OR ms.id = p.siswa_nis
        WHERE p.jenis = 'pelanggaran'
        ORDER BY p.id DESC
        LIMIT 5
      `)
    ]);

    let msg = `🚨 <b>REKAP KEDISIPLINAN & PELANGGARAN SISWA</b>\n` +
              `<i>Sistem Kredit Skor & Eskalasi SP Kurmon</i>\n\n` +
              `🏆 <b>TOP 5 SISWA DENGAN POIN TERTINGGI:</b>\n`;

    if (topRows.rows.length === 0) {
      msg += `<i>Belum ada catatan pelanggaran siswa.</i>\n\n`;
    } else {
      topRows.rows.forEach((r, idx) => {
        const poin = parseInt(r.total_poin, 10);
        let sp = '🟢 Normal';
        if (poin >= 50) sp = '🔴 SP-3 (Panggilan Ortu)';
        else if (poin >= 30) sp = '🟠 SP-2';
        else if (poin >= 15) sp = '🟡 SP-1';
        msg += `${idx + 1}. <b>${escapeHtml(r.student_name)}</b> (${escapeHtml(r.class_name)})\n   • Total: <b>${poin} Poin</b> | Status: <b>${sp}</b> | NIS: <code>${escapeHtml(r.siswa_nis)}</code>\n`;
      });
      msg += `\n`;
    }

    msg += `📋 <b>5 CATATAN PELANGGARAN TERAKHIR:</b>\n`;
    if (recentRows.rows.length === 0) {
      msg += `<i>Belum ada log pelanggaran.</i>\n`;
    } else {
      recentRows.rows.forEach((r, idx) => {
        const tgl = new Date(r.tanggal_kejadian || r.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
        const namaTindakan = (r.tindakan_nama || 'Pelanggaran').split('-')[0].trim();
        msg += `${idx + 1}. [${tgl}] <b>${escapeHtml(r.student_name)}</b> (+${r.poin} Poin)\n   ${escapeHtml(namaTindakan.slice(0, 60))}\n`;
      });
    }

    msg += `\n💡 <i>Ketentuan SP: SP-1 (≥15 Poin), SP-2 (≥30 Poin), SP-3 (≥50 Poin). Input pos piket dilakukan di menu Kedisiplinan > Pos Piket.</i>`;

    await _sendMessage(chatId, msg, { isHtml: true });
  } catch (err) {
    await _sendMessage(chatId, `❌ Gagal mengambil rekap pelanggaran: ${escapeHtml(err.message)}`, { isHtml: true });
  }
}

/**
 * Menampilkan daftar prestasi siswa terbaru
 */
async function _cmdPrestasi(chatId) {
  if (!_dbPool) { await _sendMessage(chatId, '❌ Database tidak tersedia.'); return; }
  try {
    const { rows } = await _dbPool.query(`
      SELECT pr.*, 
             COALESCE(ms.payload->>'name', ms.payload->>'nama', pr.siswa_nis) as student_name,
             COALESCE(ms.payload->>'class_name', ms.payload->>'kelas', '-') as class_name
      FROM kesiswaan_prestasi pr
      LEFT JOIN mst_students ms ON ms.payload->>'nis' = pr.siswa_nis OR ms.id = pr.siswa_nis
      ORDER BY pr.id DESC
      LIMIT 8
    `);

    if (rows.length === 0) {
      await _sendMessage(chatId, '🏆 <b>Prestasi Siswa:</b> Belum ada catatan prestasi yang terdaftar di database.');
      return;
    }

    let msg = `🏆 <b>DAFTAR PRESTASI SISWA TERBARU</b>\n` +
              `<i>Pencatatan Bidang Kesiswaan Kurmon</i>\n\n`;

    rows.forEach((r, idx) => {
      const tgl = r.tanggal_prestasi ? new Date(r.tanggal_prestasi).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
      msg += `${idx + 1}. <b>${escapeHtml(r.student_name)}</b> (${escapeHtml(r.class_name)})\n` +
             `   🥇 <b>${escapeHtml(r.peringkat || 'Juara')}</b> — ${escapeHtml(r.nama_prestasi)}\n` +
             `   📍 Tingkat: ${escapeHtml(r.tingkat || 'Sekolah')} | Penyelenggara: ${escapeHtml(r.penyelenggara || '-')}\n` +
             `   📅 Tanggal: ${tgl}\n\n`;
    });

    await _sendMessage(chatId, msg, { isHtml: true });
  } catch (err) {
    await _sendMessage(chatId, `❌ Gagal mengambil daftar prestasi: ${escapeHtml(err.message)}`, { isHtml: true });
  }
}

/**
 * Menjalankan sinkronisasi penarikan log mesin langsung dari Telegram
 */
async function _cmdSync(chatId) {
  await _sendMessage(chatId, '🔄 <i>Memulai sinkronisasi manual ke seluruh mesin absensi online... Mohon tunggu sebentar.</i>', { isHtml: true });
  try {
    const { pullHikvisionLogs } = await import('./auth-server.mjs');
    const result = await pullHikvisionLogs(true);
    await _sendMessage(chatId,
      `✅ <b>Sinkronisasi Selesai!</b>\n\n` +
      `• <b>Event Ditemukan:</b> <b>${result?.logs_found || 0}</b> scan\n` +
      `• <b>Log Baru Disimpan:</b> <b>${result?.logs_saved || 0}</b> log kehadiran\n` +
      `• <b>Waktu:</b> ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB\n\n` +
      `💡 Ketik <code>/absen</code> atau <code>/terlambat</code> untuk melihat data terbaru.`,
      { isHtml: true }
    );
  } catch (err) {
    await _sendMessage(chatId, `❌ Gagal menjalankan sinkronisasi: ${escapeHtml(err.message)}`, { isHtml: true });
  }
}

/**
 * Menampilkan status WhatsApp Gateway (Fonnte)
 */
async function _cmdStatusWa(chatId) {
  if (!_dbPool) { await _sendMessage(chatId, '❌ Database tidak tersedia.'); return; }
  try {
    const { rows } = await _dbPool.query("SELECT * FROM api_keys WHERE service_name = 'whatsapp_fonnte' LIMIT 1");
    if (rows.length === 0) {
      await _sendMessage(chatId, `📱 <b>Status WhatsApp Gateway</b>\n\n⚠️ Layanan Fonnte belum dikonfigurasi di database. Buka menu <b>Pengaturan > Layanan API</b> untuk memasukkan token Fonnte.`, { isHtml: true });
      return;
    }
    const r = rows[0];
    const isAct = r.is_active ? '🟢 AKTIF' : '🔴 NON-AKTIF';
    const tokenMasked = r.api_key ? `${r.api_key.slice(0, 4)}••••••••${r.api_key.slice(-4)}` : 'Belum diisi';
    
    await _sendMessage(chatId,
      `📱 <b>STATUS WHATSAPP GATEWAY (FONNTE)</b>\n\n` +
      `• <b>Status Layanan:</b> <b>${isAct}</b>\n` +
      `• <b>API Token:</b> <code>${tokenMasked}</code>\n` +
      `• <b>Auto Notifikasi Terlambat ke Ortu:</b> ${r.is_active ? '✅ Aktif' : '❌ Mati'}\n` +
      `• <b>Rekap Harian Jam 12:00 ke Walas:</b> ${r.is_active ? '✅ Aktif' : '❌ Mati'}\n\n` +
      `💡 <i>Jika token kedaluwarsa atau kuota habis, perbarui token di Fonnte.com lalu simpan di menu Pengaturan Kurmon.</i>`,
      { isHtml: true }
    );
  } catch (err) {
    await _sendMessage(chatId, `❌ Gagal memeriksa status WhatsApp: ${escapeHtml(err.message)}`, { isHtml: true });
  }
}

/**
 * Menampilkan kapasitas database dan jumlah record tabel
 */
async function _cmdStatusDb(chatId) {
  if (!_dbPool) { await _sendMessage(chatId, '❌ Database tidak tersedia.'); return; }
  try {
    const [sizeRes, tRes] = await Promise.all([
      _dbPool.query("SELECT pg_size_pretty(pg_database_size(current_database())) as db_size"),
      _dbPool.query(`
        SELECT relname as table_name, n_live_tup as row_count 
        FROM pg_stat_user_tables 
        WHERE relname IN ('mst_students', 'mst_teachers', 'mst_classes', 'hikvision_logs', 'audit_logs', 'kedisiplinan_absensi', 'kedisiplinan_riwayat_poin', 'users')
        ORDER BY n_live_tup DESC;
      `)
    ]);

    let msg = `🗄️ <b>STATUS DATABASE POSTGRESQL</b>\n\n` +
              `• <b>Database Name:</b> <code>school_system_db</code>\n` +
              `• <b>Ukuran Database:</b> <b>${sizeRes.rows[0]?.db_size || '-'}</b>\n` +
              `• <b>Koneksi Pool:</b> ✅ Aktif & Sehat\n\n` +
              `📊 <b>Jumlah Data per Tabel Utama:</b>\n`;

    tRes.rows.forEach(r => {
      msg += `• <code>${r.table_name.padEnd(26, ' ')}</code>: <b>${r.row_count}</b> baris\n`;
    });

    await _sendMessage(chatId, msg, { isHtml: true });
  } catch (err) {
    await _sendMessage(chatId, `❌ Gagal mengambil status database: ${escapeHtml(err.message)}`, { isHtml: true });
  }
}

/**
 * Menampilkan ringkasan status PKL
 */
async function _cmdPkl(chatId) {
  if (!_dbPool) { await _sendMessage(chatId, '❌ Database tidak tersedia.'); return; }
  try {
    const [locCount, stuCount, logCount] = await Promise.all([
      _dbPool.query("SELECT COUNT(*) FROM pkl_locations"),
      _dbPool.query("SELECT COUNT(*) FROM pkl_students"),
      _dbPool.query("SELECT COUNT(*) FROM pkl_logbooks")
    ]);
    await _sendMessage(chatId,
      `🏢 <b>MONITORING PRAKTIK KERJA LAPANGAN (PKL)</b>\n\n` +
      `• 📍 <b>Lokasi DU/DI Terdaftar:</b> ${locCount.rows[0].count} perusahaan / instansi\n` +
      `• 🎓 <b>Siswa PKL Aktif:</b> ${stuCount.rows[0].count} siswa\n` +
      `• 📖 <b>Total Logbook Dikirim:</b> ${logCount.rows[0].count} kegiatan\n\n` +
      `💡 <i>Manajemen penempatan PKL dan monitoring guru pembimbing dapat diakses via menu Monitoring PKL di aplikasi web.</i>`,
      { isHtml: true }
    );
  } catch (err) {
    await _sendMessage(chatId, `❌ Gagal mengambil data PKL: ${escapeHtml(err.message)}`, { isHtml: true });
  }
}

/**
 * Asisten Cerdas Kurmon (Smart AI Assistant / Q&A Engine)
 * Menjawab pertanyaan natural dan query data secara cerdas
 */
async function _handleSmartAssistant(chatId, queryText) {
  if (!_dbPool) {
    await _sendMessage(chatId, '❌ Database tidak tersedia.');
    return;
  }

  const rawQ = String(queryText || '').trim();
  const q = rawQ.toLowerCase();

  if (!rawQ) {
    await _sendMessage(chatId,
      `🤖 <b>Halo! Saya Asisten Cerdas Kurmon.</b>\n\n` +
      `Silakan ajukan pertanyaan apa saja tentang aplikasi Kurmon, misalnya:\n` +
      `• <i>"Bagaimana cara setting mesin absensi?"</i>\n` +
      `• <i>"Kenapa absensi hari ini kosong?"</i>\n` +
      `• <i>"Apa password default admin?"</i>\n` +
      `• <i>"Bagaimana alur poin pelanggaran dan SP?"</i>\n` +
      `• <i>"Berapa jumlah siswa sekarang?"</i>\n` +
      `• <i>"Cari siswa Budi"</i> atau <i>"Cari guru Joko"</i>\n` +
      `• <i>"Cara cetak kartu pelajar"</i>\n` +
      `• <i>"Cara broadcast WhatsApp ke wali murid"</i>`,
      { isHtml: true }
    );
    return;
  }

  // Query: Update / Changelog / Fitur Baru
  if (q.includes('update') || q.includes('pembaruan') || q.includes('fitur baru') || q.includes('changelog') || q.includes('versi') || q.includes('apa yang baru')) {
    await _cmdInfoUpdate(chatId);
    return;
  }

  // 1. Query Dinamis: Cari Siswa Langsung
  const cariSiswaMatch = q.match(/^(?:cari\s+siswa|siswa\s+bernama|data\s+siswa|profil\s+siswa|nis)\s+(.+)$/i);
  if (cariSiswaMatch) {
    await _cmdCariSiswa(chatId, cariSiswaMatch[1].trim());
    return;
  }

  // 2. Query Dinamis: Cari Guru Langsung
  const cariGuruMatch = q.match(/^(?:cari\s+guru|guru\s+bernama|data\s+guru|profil\s+guru|kontak\s+guru|nip)\s+(.+)$/i);
  if (cariGuruMatch) {
    await _cmdCariGuru(chatId, cariGuruMatch[1].trim());
    return;
  }

  // 3. Query Dinamis: Hitung Data (Siswa, Guru, Kelas, Mesin)
  if (q.includes('berapa siswa') || q.includes('jumlah siswa') || q.includes('total siswa')) {
    const { rows } = await _dbPool.query('SELECT COUNT(*) as cnt FROM mst_students');
    await _sendMessage(chatId,
      `🎓 <b>Statistik Siswa Kurmon</b>\n\n` +
      `• Total Siswa Terdaftar: <b>${rows[0].cnt} siswa</b>.\n\n` +
      `💡 <i>Ketik <code>/kelas</code> untuk melihat rekap per kelas atau <code>/siswa [nama]</code> untuk mencari detail siswa.</i>`,
      { isHtml: true }
    );
    return;
  }

  if (q.includes('berapa guru') || q.includes('jumlah guru') || q.includes('total guru')) {
    const { rows } = await _dbPool.query('SELECT COUNT(*) as cnt FROM mst_teachers');
    await _sendMessage(chatId,
      `👨‍🏫 <b>Statistik Guru Kurmon</b>\n\n` +
      `• Total Guru Terdaftar: <b>${rows[0].cnt} guru</b>.\n\n` +
      `💡 <i>Ketik <code>/absen_guru</code> untuk melihat daftar kehadiran guru dan karyawan hari ini.</i>`,
      { isHtml: true }
    );
    return;
  }

  if (q.includes('berapa kelas') || q.includes('jumlah kelas') || q.includes('total kelas')) {
    const { rows } = await _dbPool.query('SELECT COUNT(*) as cnt FROM mst_classes');
    await _sendMessage(chatId,
      `🏫 <b>Statistik Kelas Kurmon</b>\n\n` +
      `• Total Rombel Kelas: <b>${rows[0].cnt} kelas</b>.\n\n` +
      `💡 <i>Ketik <code>/kelas</code> untuk melihat daftar seluruh kelas.</i>`,
      { isHtml: true }
    );
    return;
  }

  // 4. Pertanyaan: Password / Login / Akun
  if (q.includes('password') || q.includes('kata sandi') || q.includes('login') || q.includes('masuk akun') || q.includes('lupa password')) {
    await _sendMessage(chatId,
      `🔐 <b>PANDUAN LOGIN & AKUN KURMON</b>\n\n` +
      `• <b>Akun Admin Default:</b>\n` +
      `  - Username: <code>admin</code> atau <code>masadmin</code>\n` +
      `  - Password Default: <code>admin123</code>\n\n` +
      `• <b>Cara Mengganti Password:</b>\n` +
      `  1. Login ke aplikasi web Kurmon.\n` +
      `  2. Buka menu <b>Pengaturan > Keamanan Akun</b>.\n` +
      `  3. Masukkan password lama dan tentukan password baru yang kuat.\n\n` +
      `• <b>Sistem Auto-Logout (Keamanan):</b>\n` +
      `  Sesi login akan otomatis kedaluwarsa jika inaktif selama 8 jam, dengan notifikasi banner peringatan 5 menit sebelumnya.\n\n` +
      `• <b>Role Pengguna:</b>\n` +
      `  Admin, Kepala Sekolah, Waka, Guru Mapel, Wali Kelas, Guru Piket, BP/BK, dan Siswa memiliki hak akses terpisah.`,
      { isHtml: true }
    );
    return;
  }

  // 5. Pertanyaan: Kenapa Absensi Kosong / Log Tidak Muncul
  if (q.includes('kenapa kosong') || q.includes('absensi kosong') || q.includes('tidak ada yang absen') || q.includes('log tidak muncul') || q.includes('absen tidak masuk') || q.includes('dashboard kosong')) {
    await _sendMessage(chatId,
      `🔍 <b>KENAPA LOG ABSENSI KOSONG / BELUM MUNCUL?</b>\n\n` +
      `Berikut 4 penyebab paling umum dan solusinya:\n\n` +
      `1. <b>Hari Libur / Hari Minggu:</b>\n` +
      `   Dashboard utama memfilter data <b>khusus hari ini</b>. Jika hari ini hari libur atau belum ada jam masuk KBM, rekap harian wajar bernilai 0.\n\n` +
      `2. <b>Mesin Sedang Offline / Tidak Terhubung:</b>\n` +
      `   Ketik <code>/mesin</code> untuk mengecek apakah mesin di lokasi mengalami timeout (mati lampu / kabel LAN lepas) atau unreachable.\n\n` +
      `3. <b>Sinkronisasi Belum Berjalan:</b>\n` +
      `   Cron server menarik log setiap 5 menit. Anda bisa memaksa server menarik log saat ini juga dengan mengetik perintah <code>/sync</code>.\n\n` +
      `4. <b>NIS / NIP Belum Terdaftar:</b>\n` +
      `   Sistem hanya mencatat tap dari siswa/guru yang terdaftar di Master Data. Jika kartu baru belum di-assign, scan akan diabaikan demi integritas data.`,
      { isHtml: true }
    );
    return;
  }

  // 6. Pertanyaan: Mesin Absensi / Hikvision / Setting Perangkat
  if (q.includes('setting mesin') || q.includes('tambah mesin') || q.includes('mesin mati') || q.includes('hikvision') || q.includes('offline') || q.includes('koneksi mesin')) {
    await _sendMessage(chatId,
      `📟 <b>PANDUAN MESIN ABSENSI HIKVISION IoT</b>\n\n` +
      `• <b>Cek Status Seluruh Mesin:</b>\n` +
      `  Ketik perintah <code>/mesin</code> untuk diagnosa koneksi real-time.\n\n` +
      `• <b>Langkah Menambah / Setting Mesin di Web:</b>\n` +
      `  1. Masuk ke web Kurmon > menu <b>Pengaturan > Mesin Hikvision</b>.\n` +
      `  2. Masukkan <b>IP Address Mesin</b> (contoh: <code>192.168.101.250</code>), port <code>80</code>.\n` +
      `  3. Masukkan <b>Username</b> (default: <code>admin</code>) dan <b>Password</b> perangkat.\n` +
      `  4. Pilih tipe mesin: <code>siswa</code> atau <code>staff/guru</code>.\n` +
      `  5. Klik <b>Tes Koneksi</b> lalu simpan.\n\n` +
      `• <b>Penyebab Umum Mesin Bermasalah:</b>\n` +
      `  - <code>ETIMEDOUT:</code> Power adaptor PoE mati atau kabel LAN lepas.\n` +
      `  - <code>EHOSTUNREACH:</code> Router/link antar-kampus terputus.\n` +
      `  - <code>401 Unauthorized:</code> Password di database tidak cocok dengan mesin.\n\n` +
      `💡 <i>Ketik <code>/sync</code> untuk menarik log kehadiran dari mesin secara instan.</i>`,
      { isHtml: true }
    );
    return;
  }

  // 7. Pertanyaan: Keterlambatan & Jam Masuk
  if (q.includes('terlambat') || q.includes('jam masuk') || q.includes('batas jam') || q.includes('koreksi jam') || q.includes('toleransi')) {
    await _sendMessage(chatId,
      `⏰ <b>ATURAN JAM MASUK & KETERLAMBATAN</b>\n\n` +
      `• <b>Batas Jam Masuk Siswa:</b> <code>07:00 WIB</code>\n` +
      `• <b>Batas Jam Masuk Guru:</b> <code>07:00 WIB</code>\n` +
      `<i>(Jam dapat diubah di menu Pengaturan > Kebijakan Sekolah)</i>\n\n` +
      `• <b>Bagaimana Jika Siswa Scan > 07:00?</b>\n` +
      `  - Status otomatis tercatat <b>Terlambat</b> di log.\n` +
      `  - Notifikasi keterlambatan otomatis terkirim ke WhatsApp orang tua (jika WA Gateway aktif).\n` +
      `  - Siswa wajib melapor ke Pos Piket untuk pencatatan poin kedisiplinan.\n\n` +
      `• <b>Fitur Koreksi Jam:</b>\n` +
      `  Jika mesin salah jam atau ada kendala massal, Admin dapat menekan tombol <b>Koreksi Jam</b> di Dashboard web.\n\n` +
      `💡 <i>Ketik <code>/terlambat</code> untuk melihat siapa saja yang terlambat hari ini.</i>`,
      { isHtml: true }
    );
    return;
  }

  // 8. Pertanyaan: Tata Tertib, Poin, dan Surat Peringatan (SP)
  if (q.includes('poin') || q.includes('pelanggaran') || q.includes('tata tertib') || q.includes('sp') || q.includes('surat peringatan') || q.includes('skor kredit') || q.includes('piket') || q.includes('bk')) {
    await _sendMessage(chatId,
      `🚨 <b>SISTEM SKOR KREDIT & SURAT PERINGATAN (SP)</b>\n\n` +
      `Kurmon menggunakan sistem akumulasi poin pelanggaran dan penghargaan:\n\n` +
      `• <b>Ambang Batas Surat Peringatan:</b>\n` +
      `  🟡 <b>SP-1 (Teguran Pertama):</b> Akumulasi <b>≥ 15 Poin</b>\n` +
      `  🟠 <b>SP-2 (Peringatan Keras):</b> Akumulasi <b>≥ 30 Poin</b>\n` +
      `  🔴 <b>SP-3 (Panggilan Orang Tua):</b> Akumulasi <b>≥ 50 Poin</b>\n\n` +
      `• <b>Eskalasi Multi-Level Berdasarkan Tahun Ajaran:</b>\n` +
      `  Siswa yang mencapai SP-1 akan bereskalasi ke SP-2 lalu SP-3 secara adil dalam tahun ajaran berjalan.\n\n` +
      `• <b>Cara Input Pelanggaran:</b>\n` +
      `  - Petugas Piket menggunakan menu <b>Kedisiplinan > Pos Piket</b> (Mode POS scan cepat).\n` +
      `  - Guru BK dapat mencatat sesi konseling & Home Visit di menu <b>Bimbingan Konseling</b>.\n\n` +
      `💡 <i>Ketik <code>/pelanggaran</code> untuk melihat top 5 pelanggaran siswa terkini.</i>`,
      { isHtml: true }
    );
    return;
  }

  // 9. Pertanyaan: Kartu Pelajar Digital
  if (q.includes('kartu') || q.includes('kartu pelajar') || q.includes('cetak kartu') || q.includes('qr code') || q.includes('barcode')) {
    await _sendMessage(chatId,
      `🪪 <b>MODUL KARTU PELAJAR DIGITAL</b>\n\n` +
      `• <b>Fitur Kartu Pelajar:</b>\n` +
      `  - Desain template kustom depan & belakang (landscape/portrait).\n` +
      `  - <b>QR Code Ber-Token HMAC Aman:</b> Mencegah pemalsuan kartu atau scan liar.\n` +
      `  - Generator Cetak Massal PDF: Layout otomatis 8 kartu per lembar kertas A4 siap cetak.\n\n` +
      `• <b>Cara Mencetak:</b>\n` +
      `  1. Buka menu <b>Administrasi > Kartu Pelajar</b> di aplikasi web.\n` +
      `  2. Pilih kelas atau cari nama siswa yang ingin dicetak.\n` +
      `  3. Klik tombol <b>Cetak Kartu Terpilih (PDF)</b>.\n\n` +
      `• <b>Penggunaan untuk Absensi:</b>\n` +
      `  QR Code pada kartu dapat di-scan langsung di kamera webcam/HP atau mesin scanner barcode 2D.`,
      { isHtml: true }
    );
    return;
  }

  // 10. Pertanyaan: WhatsApp Gateway (Fonnte)
  if (q.includes('whatsapp') || q.includes('wa') || q.includes('fonnte') || q.includes('notifikasi wa') || q.includes('broadcast')) {
    await _sendMessage(chatId,
      `💬 <b>INTEGRASI WHATSAPP GATEWAY (FONNTE)</b>\n\n` +
      `• <b>Fungsi Otomatisasi WA:</b>\n` +
      `  1. <b>Auto-Notif Terlambat:</b> Begitu siswa scan > 07:00, bot langsung mengirim pesan WhatsApp ke nomor HP orang tua.\n` +
      `  2. <b>Rekap Harian Wali Kelas:</b> Setiap pkl 12:00 WIB, ringkasan kehadiran kelas dikirim otomatis ke WA Wali Kelas.\n` +
      `  3. <b>Notifikasi SP & Panggilan:</b> Kirim surat panggilan resmi via WA.\n\n` +
      `• <b>Cara Konfigurasi Token:</b>\n` +
      `  1. Dapatkan token akun dari <b>Fonnte.com</b>.\n` +
      `  2. Buka web Kurmon > menu <b>Pengaturan > Layanan API</b>.\n` +
      `  3. Masukkan token di kolom <i>WhatsApp Gateway</i> dan aktifkan tombol switch.\n\n` +
      `💡 <i>Ketik <code>/wa</code> untuk memeriksa status aktivasi WhatsApp saat ini.</i>`,
      { isHtml: true }
    );
    return;
  }

  // 11. Pertanyaan: Jurnal Guru & Modul Ajar
  if (q.includes('jurnal') || q.includes('modul ajar') || q.includes('kbm') || q.includes('materi')) {
    await _sendMessage(chatId,
      `📖 <b>MODUL JURNAL MENGAJAR GURU</b>\n\n` +
      `• <b>Fungsi Jurnal:</b>\n` +
      `  Mencatat kegiatan belajar mengajar harian guru di kelas secara transparan dan terintegrasi dengan presensi siswa.\n\n` +
      `• <b>Cara Mengisi Jurnal Guru:</b>\n` +
      `  1. Login sebagai Guru > buka menu <b>Jurnal Harian Guru</b>.\n` +
      `  2. Pilih tanggal, kelas, jam pelajaran ke-, dan mata pelajaran.\n` +
      `  3. Catat materi/topik bahasan yang diajarkan.\n` +
      `  4. Tandai siswa yang tidak hadir di kelas (Alpa/Sakit/Izin/Dispen).\n` +
      `  5. Simpan jurnal. Rekap kehadiran per mapel otomatis terupdate!\n\n` +
      `• <b>Modul Ajar / RPP:</b>\n` +
      `  Guru dapat mengunggah berkas modul ajar (PDF/Doc) untuk verifikasi kurikulum oleh Waka Kurikulum.`,
      { isHtml: true }
    );
    return;
  }

  // 12. Pertanyaan: PKL (Praktik Kerja Lapangan)
  if (q.includes('pkl') || q.includes('prakerin') || q.includes('magang') || q.includes('logbook')) {
    await _sendMessage(chatId,
      `🏢 <b>SISTEM MONITORING PKL (PRAKERIN)</b>\n\n` +
      `• <b>Fitur Modul PKL:</b>\n` +
      `  - Database DU/DI (Dunia Usaha & Industri) mitra sekolah.\n` +
      `  - <b>Auto-Assign Siswa:</b> Penempatan otomatis siswa ke lokasi PKL berdasarkan jurusan & kuota.\n` +
      `  - <b>Logbook Digital:</b> Siswa mengisi laporan kegiatan harian disertai foto dan koordinat GPS.\n` +
      `  - <b>Monitoring Pembimbing:</b> Guru pembimbing mencatat kunjungan dan penilaian siswa di tempat magang.\n` +
      `  - <b>Surat Pengantar Otomatis:</b> Cetak surat pengantar resmi ber-barcode verifikasi.\n\n` +
      `💡 <i>Ketik <code>/pkl</code> untuk melihat ringkasan data PKL saat ini.</i>`,
      { isHtml: true }
    );
    return;
  }

  // 13. Pertanyaan: Backup & Restore Database
  if (q.includes('backup') || q.includes('cadangan') || q.includes('restore') || q.includes('database')) {
    await _sendMessage(chatId,
      `💾 <b>PANDUAN CADANGAN (BACKUP) & RESTORE</b>\n\n` +
      `• <b>Jadwal Backup Otomatis:</b>\n` +
      `  Server menjalankan backup database otomatis setiap hari pkl 16:00 WIB.\n\n` +
      `• <b>Trigger Backup Langsung dari Bot:</b>\n` +
      `  Cukup ketik perintah <code>/backup</code> di sini, database akan langsung dicadangkan ke format JSON terenkripsi dan berkasnya siap diunduh.\n\n` +
      `• <b>Keamanan Data (Hardened):</b>\n` +
      `  Kolom sensitif seperti password hash dan token otomatis disamarkan [REDACTED] pada berkas ekspor cadangan.\n\n` +
      `• <b>Kapasitas Database:</b>\n` +
      `  Ketik <code>/db</code> untuk melihat ukuran penyimpanan database PostgreSQL dan baris per tabel.`,
      { isHtml: true }
    );
    return;
  }

  // 14. Pertanyaan: Akses dari HP / Jaringan Lokal
  if (q.includes('buka di hp') || q.includes('akses hp') || q.includes('wifi') || q.includes('jaringan') || q.includes('ip address') || q.includes('port')) {
    await _sendMessage(chatId,
      `📱 <b>CARA MEMBUKA KURMON DI HP (JARINGAN LOKAL)</b>\n\n` +
      `1. Pastikan HP dan Komputer Server terhubung ke <b>jaringan WiFi / LAN yang sama</b>.\n` +
      `2. Cari tahu IP komputer server (buka Command Prompt lalu ketik <code>ipconfig</code>).\n` +
      `3. Buka browser HP (Chrome / Safari), lalu ketik URL:\n` +
      `   <code>http://[IP_KOMPUTER]:6677</code>\n` +
      `   <i>(Contoh: <code>http://192.168.1.50:6677</code>)</i>\n\n` +
      `• <b>Port Server Kurmon:</b>\n` +
      `  - Web Frontend: <code>6677</code> (Vite)\n` +
      `  - API Backend: <code>4174</code> (Node.js Auth Server)\n` +
      `  - PostgreSQL: <code>5432</code>`,
      { isHtml: true }
    );
    return;
  }

  // 15. Pertanyaan: Apa itu Kurmon / Gambaran Umum
  if (q.includes('apa itu kurmon') || q.includes('tentang kurmon') || q.includes('aplikasi apa') || q.includes('fitur') || q.includes('kurmon')) {
    await _sendMessage(chatId,
      `🏫 <b>TENTANG SISTEM KURMON v2.1.0</b>\n\n` +
      `<b>Kurmon</b> (Kurikulum & Monitoring) adalah sistem tata kelola sekolah terpadu yang menghubungkan perangkat keras IoT, guru, siswa, dan manajemen sekolah.\n\n` +
      `🚀 <b>MODUL UTAMA APLIKASI:</b>\n` +
      `1. <b>Presensi Real-time:</b> Integrasi mesin absensi biometrik wajah & sidik jari Hikvision.\n` +
      `2. <b>Kedisiplinan & Piket:</b> Sistem poin pelanggaran, POS piket cepat, reward prestasi, dan eskalasi SP.\n` +
      `3. <b>Bimbingan Konseling (BP/BK):</b> Rekam jejak konseling siswa, home visit, dan pemanggilan orang tua.\n` +
      `4. <b>Jurnal Mengajar Guru:</b> Pencatatan KBM harian, absensi kelas, dan upload modul ajar.\n` +
      `5. <b>Monitoring PKL:</b> Pengelolaan tempat magang DU/DI, auto-assign, dan logbook kegiatan siswa.\n` +
      `6. <b>Kartu Pelajar Digital:</b> Pembuat kartu pelajar ber-QR Code token aman anti-pemalsuan.\n` +
      `7. <b>WhatsApp Gateway:</b> Broadcast otomatis kehadiran dan keterlambatan via Fonnte.\n` +
      `8. <b>Telegram Bot Monitor:</b> Pemantauan operasional, rekap presensi, dan diagnosa mesin langsung dari HP.\n\n` +
      `💡 <i>Ketik <code>/menu</code> untuk mengakses seluruh fitur bot ini.</i>`,
      { isHtml: true }
    );
    return;
  }

  // Fallback: Tawarkan panduan dan topik bantuan
  await _sendMessage(chatId,
    `🤖 <b>Asisten Cerdas Kurmon</b>\n\n` +
    `Saya belum menemukan jawaban langsung untuk pertanyaan Anda: <i>"${escapeHtml(rawQ)}"</i>.\n\n` +
    `💡 <b>Topik yang dapat Anda tanyakan secara langsung:</b>\n` +
    `• <i>"Kenapa absensi hari ini kosong?"</i>\n` +
    `• <i>"Bagaimana cara setting mesin absensi?"</i>\n` +
    `• <i>"Apa password default admin?"</i>\n` +
    `• <i>"Berapa jumlah siswa?"</i> atau <i>"Cari siswa [Nama]"</i>\n` +
    `• <i>"Bagaimana alur surat peringatan SP?"</i>\n` +
    `• <i>"Cara broadcast WhatsApp ke wali murid"</i>\n` +
    `• <i>"Cara buka aplikasi di HP"</i>\n\n` +
    `Atau ketik <b>/help</b> untuk melihat daftar seluruh menu perintah.`,
    { isHtml: true }
  );
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
  const { send, requireAuthenticated, normalizeServerRole, readJsonBody, getRawBody } = ctx;

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
      if (typeof readJsonBody === 'function') {
        body = await readJsonBody(req);
      } else if (typeof getRawBody === 'function') {
        const raw = await getRawBody(req);
        body = typeof raw === 'string' ? JSON.parse(raw) : raw;
      } else {
        body = await new Promise((resolve, reject) => {
          let raw = '';
          req.on('data', chunk => { raw += chunk; });
          req.on('end', () => {
            try { resolve(raw ? JSON.parse(raw) : {}); }
            catch (err) { reject(err); }
          });
          req.on('error', reject);
        });
      }
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
