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

// ── State Tracker Kesehatan & Downtime Mesin Absensi ─────────────────────
// Key: deviceId (string) -> { id, ip, isOnline, lastSeenOnline, offlineSince, lastError, latency, location, type }
const _deviceStatusTracker = new Map();

/**
 * Format durasi downtime menjadi teks bahasa Indonesia yang ramah & presisi
 * @param {number} ms - Durasi dalam milidetik
 * @returns {string}
 */
export function formatDowntimeDuration(ms) {
  if (!ms || ms <= 0) return 'Baru saja';
  const totalMinutes = Math.floor(ms / 60000);
  if (totalMinutes < 1) return 'Kurang dari 1 menit';
  if (totalMinutes < 60) return `${totalMinutes} menit`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours < 24) {
    return minutes > 0 ? `${hours} jam ${minutes} menit` : `${hours} jam`;
  }
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours > 0 ? `${days} hari ${remainingHours} jam` : `${days} hari`;
}

/**
 * Muat tracker kesehatan mesin dari database app_data saat startup
 */
export async function loadDeviceStatusTracker() {
  if (!_dbPool) return;
  try {
    const res = await _dbPool.query("SELECT data FROM app_data WHERE store_key = 'hikvision_device_health_tracker' LIMIT 1");
    if (res.rows.length > 0 && res.rows[0].data) {
      const parsed = typeof res.rows[0].data === 'string' ? JSON.parse(res.rows[0].data) : res.rows[0].data;
      if (parsed && typeof parsed === 'object') {
        for (const [k, v] of Object.entries(parsed)) {
          _deviceStatusTracker.set(String(k), v);
        }
      }
    }
  } catch (e) {
    console.warn('[TelegramBot] Gagal muat device status tracker dari DB:', e.message);
  }
}

/**
 * Simpan tracker kesehatan mesin ke database app_data
 */
export async function saveDeviceStatusTracker() {
  if (!_dbPool) return;
  try {
    const obj = {};
    for (const [k, v] of _deviceStatusTracker.entries()) {
      obj[k] = v;
    }
    await _dbPool.query(`
      INSERT INTO app_data (store_key, data, updated_at) 
      VALUES ('hikvision_device_health_tracker', $1, NOW())
      ON CONFLICT (store_key) DO UPDATE SET data = $1, updated_at = NOW()
    `, [JSON.stringify(obj)]);
  } catch (e) {
    console.warn('[TelegramBot] Gagal simpan device status tracker ke DB:', e.message);
  }
}

/**
 * Update status kesehatan perangkat saat background sync atau probe
 */
export async function updateDeviceHealthStatus(deviceId, ip, isOnline, errorMsg = '', latency = null, meta = {}) {
  const key = String(deviceId || ip);
  const now = Date.now();
  const existing = _deviceStatusTracker.get(key) || {
    id: deviceId,
    ip: ip,
    isOnline: true,
    lastSeenOnline: now,
    offlineSince: null,
    lastError: '',
    latency: null,
    location: meta.loc || 'Mesin Absensi',
    type: meta.type || 'siswa'
  };

  if (meta.loc) existing.location = meta.loc;
  if (meta.type) existing.type = meta.type;
  existing.ip = ip;
  existing.id = deviceId;

  if (isOnline) {
    existing.isOnline = true;
    existing.lastSeenOnline = now;
    existing.offlineSince = null;
    existing.lastError = '';
    existing.latency = latency;
  } else {
    existing.isOnline = false;
    existing.lastError = errorMsg || 'Gagal terhubung';
    existing.latency = null;
    // Jika belum tercatat kapan mulai offline, catat waktu sekarang atau lastSeenOnline
    if (!existing.offlineSince) {
      existing.offlineSince = existing.lastSeenOnline ? existing.lastSeenOnline : now;
    }
  }

  _deviceStatusTracker.set(key, existing);
  saveDeviceStatusTracker().catch(() => {});
}

// ── Keyboards ────────────────────────────────────────────
// Keyboard menu utama yang menempel di bawah chat HP/Desktop (Ramping & Ergonomis, 3 Baris)
export const MAIN_MENU_KEYBOARD = {
  keyboard: [
    [{ text: '📊 Presensi Hari Ini' }, { text: '👨‍🏫 Presensi Guru' }],
    [{ text: '⏰ Keterlambatan' }, { text: '📟 Status Mesin' }],
    [{ text: '🔄 Tarik Log Mesin' }, { text: '📋 Menu Lengkap' }]
  ],
  resize_keyboard: true,
  is_persistent: true
};

// Dashboard Menu Interaktif Telegram (Inline Keyboard Terkategori & Rapi)
export const MAIN_INLINE_KEYBOARD = {
  inline_keyboard: [
    [
      { text: '📊 Rekap Presensi Siswa', callback_data: '/absen' },
      { text: '👨‍🏫 Presensi Guru & Staff', callback_data: '/absen_guru' }
    ],
    [
      { text: '⏰ Rekap Keterlambatan', callback_data: '/terlambat' },
      { text: '📈 Rekap Per Kelas', callback_data: '/rekap_kelas' }
    ],
    [
      { text: '📟 Status Mesin (05.00 & 20.00)', callback_data: '/mesin' },
      { text: '🔄 Tarik Log Sekarang', callback_data: '/sync' }
    ],
    [
      { text: '🚨 Pelanggaran & Skor SP', callback_data: '/pelanggaran' },
      { text: '🏆 Prestasi Siswa', callback_data: '/prestasi' }
    ],
    [
      { text: '🏫 Daftar Kelas Aktif', callback_data: '/kelas' },
      { text: '💬 WhatsApp Gateway', callback_data: '/wa' }
    ],
    [
      { text: '💻 Status Server & CPU', callback_data: '/status' },
      { text: '🗄️ Info Database', callback_data: '/db' }
    ],
    [
      { text: '💾 Backup Database', callback_data: '/backup' },
      { text: '❓ Panduan & Tanya AI', callback_data: '/help' }
    ]
  ]
};

// Tombol navigasi cepat kembali ke menu utama
export const BACK_TO_MENU_KEYBOARD = {
  inline_keyboard: [
    [
      { text: '📋 Menu Lengkap', callback_data: '/menu' },
      { text: '📟 Status Mesin', callback_data: '/mesin' }
    ]
  ]
};

// ── Init ─────────────────────────────────────────────────

/**
 * Inisialisasi bot. Dipanggil dari auth-server.mjs saat startup.
 * @param {object} dbPool - PostgreSQL pool
 */
export async function initTelegramBot(dbPool) {
  _dbPool = dbPool;
  await _loadConfig();
  await loadDeviceStatusTracker();
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
  
  // Bersihkan webhook aktif lama sebelum memulai polling agar tidak terjadi HTTP 409 Conflict
  if (_botToken) {
    fetch(`https://api.telegram.org/bot${_botToken}/deleteWebhook?drop_pending_updates=false`)
      .catch(() => {})
      .finally(() => {
        _pollLoop();
      });
  } else {
    _pollLoop();
  }
}

function _stopPolling() {
  _isRunning = false;
}

// ── Action Helper (Mengetik...) ──────────────────────────

function _sendChatAction(chatId, action = 'typing') {
  if (!_botToken || !chatId) return;
  fetch(`https://api.telegram.org/bot${_botToken}/sendChatAction`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, action }),
    signal: AbortSignal.timeout(8000)
  }).catch(() => {});
}

async function _pollLoop() {
  while (_isRunning && _botToken) {
    try {
      // Pasang timeout 35 detik (lebih tinggi dari timeout long-poll 25s) agar socket tidak hang
      const res = await fetch(
        `https://api.telegram.org/bot${_botToken}/getUpdates?offset=${_pollOffset}&timeout=25`,
        { signal: AbortSignal.timeout(35_000) }
      );
      if (!res.ok) {
        if (res.status === 409) {
          console.warn('[TelegramBot] ⚠️ HTTP 409 Conflict: Webhook aktif. Menghapus webhook lama...');
          await fetch(`https://api.telegram.org/bot${_botToken}/deleteWebhook?drop_pending_updates=false`).catch(() => {});
          await _sleep(2000);
          continue;
        }
        if (res.status === 401 || res.status === 404) {
          const errData = await res.json().catch(() => ({}));
          console.error(`[TelegramBot] ❌ Bot Token tidak valid (${res.status}):`, errData.description || res.statusText);
          _stopPolling();
          break;
        }
        await _sleep(3000);
        continue;
      }
      const data = await res.json();
      if (data.ok && Array.isArray(data.result) && data.result.length > 0) {
        for (const update of data.result) {
          _pollOffset = update.update_id + 1;
          _handleUpdate(update).catch(err => console.warn('[TelegramBot] handleUpdate error:', err.message));
        }
      }
    } catch (err) {
      // Jangan sleep lama jika hanya abort / timeout rutin getUpdates
      if (err.name === 'TimeoutError' || err.name === 'AbortError') {
        continue;
      }
      console.warn('[TelegramBot] Polling network error:', err.message);
      await _sleep(3000);
    }
  }
}

// ── Indonesian Date Parser Helper ───────────────────────────
const MONTH_MAP = {
  januari: 1, jan: 1,
  februari: 2, feb: 2, pebruari: 2,
  maret: 3, mar: 3,
  april: 4, apr: 4,
  mei: 5, may: 5,
  juni: 6, jun: 6,
  juli: 7, jul: 7,
  agustus: 8, agu: 8, ags: 8, august: 8,
  september: 9, sep: 9, sept: 9,
  oktober: 10, okt: 10, oct: 10,
  november: 11, nov: 11, nopember: 11,
  desember: 12, des: 12, dec: 12
};

const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const MONTH_NAMES = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

function _buildDateResult(utcDate, isToday) {
  const y = utcDate.getUTCFullYear();
  const m = utcDate.getUTCMonth() + 1;
  const d = utcDate.getUTCDate();
  const dayOfWeek = utcDate.getUTCDay();

  const isoDate = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const dayName = DAY_NAMES[dayOfWeek];
  const monthName = MONTH_NAMES[m];
  const formatted = `${dayName}, ${d} ${monthName} ${y}`;
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  return {
    isoDate,
    formatted,
    dayName,
    monthName,
    day: d,
    month: m,
    year: y,
    isToday,
    isWeekend
  };
}

/**
 * Ekstraksi dan parsing tanggal bahasa Indonesia dari teks pengguna
 * Mendukung:
 * - "tanggal 1 agustus 2026", "1 agustus 2026", "15 juli" (tahun berjalan)
 * - "kemarin", "kemaren", "hari ini", "besok"
 * - "2026-08-01", "01/08/2026", "1-8-2026"
 */
export function _parseIndonesianDate(text) {
  if (!text || typeof text !== 'string') return null;
  const lower = text.toLowerCase().trim();

  // Hari ini di WIB (Asia/Jakarta)
  const now = new Date();
  const wibTodayStr = now.toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' });
  const [currY, currM, currD] = wibTodayStr.split('-').map(Number);
  const nowWib = new Date(Date.UTC(currY, currM - 1, currD));

  // 1. Kata relatif: kemarin, kemaren
  if (/\b(?:kemarin|kemaren)\b/i.test(lower)) {
    const yesterday = new Date(nowWib);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    return _buildDateResult(yesterday, false);
  }

  // 2. Kata relatif: hari ini
  if (/\b(?:hari\s+ini)\b/i.test(lower)) {
    return _buildDateResult(nowWib, true);
  }

  // 3. Kata relatif: besok
  if (/\b(?:besok|esok)\b/i.test(lower)) {
    const tomorrow = new Date(nowWib);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    return _buildDateResult(tomorrow, false);
  }

  // 4. ISO Date: YYYY-MM-DD (contoh: 2026-08-01 atau 2026/08/01)
  const isoMatch = lower.match(/\b(20\d{2})[-/](0?[1-9]|1[0-2])[-/](0?[1-9]|[12]\d|3[01])\b/);
  if (isoMatch) {
    const y = parseInt(isoMatch[1], 10);
    const m = parseInt(isoMatch[2], 10);
    const d = parseInt(isoMatch[3], 10);
    const dateObj = new Date(Date.UTC(y, m - 1, d));
    if (!isNaN(dateObj.getTime())) {
      const isToday = (y === currY && m === currM && d === currD);
      return _buildDateResult(dateObj, isToday);
    }
  }

  // 5. Format numerik DD/MM/YYYY atau DD-MM-YYYY (contoh: 01/08/2026 atau 1-8-2026)
  const numDateMatch = lower.match(/\b(0?[1-9]|[12]\d|3[01])[-/](0?[1-9]|1[0-2])[-/](20\d{2})\b/);
  if (numDateMatch) {
    const d = parseInt(numDateMatch[1], 10);
    const m = parseInt(numDateMatch[2], 10);
    const y = parseInt(numDateMatch[3], 10);
    const dateObj = new Date(Date.UTC(y, m - 1, d));
    if (!isNaN(dateObj.getTime())) {
      const isToday = (y === currY && m === currM && d === currD);
      return _buildDateResult(dateObj, isToday);
    }
  }

  // 6. Nama bulan Indonesia: [tanggal/tgl] DD <Bulan> [YYYY]
  // Contoh: "tanggal 1 agustus 2026", "1 agustus 2026", "tgl 15 juli", "01 agustus 2026"
  const monthNamesPattern = '(?:januari|jan|februari|feb|pebruari|maret|mar|april|apr|mei|may|juni|jun|juli|jul|agustus|agu|ags|august|september|sep|sept|oktober|okt|oct|november|nov|nopember|desember|des|dec)';
  const textDateRegex = new RegExp(`(?:\\b(?:tanggal|tgl)\\s+)?\\b(0?[1-9]|[12]\\d|3[01])\\s+(${monthNamesPattern})(?:\\s+(20\\d{2}))?\\b`, 'i');
  const textMatch = lower.match(textDateRegex);
  if (textMatch) {
    const d = parseInt(textMatch[1], 10);
    const mStr = textMatch[2].toLowerCase();
    const y = textMatch[3] ? parseInt(textMatch[3], 10) : currY;

    const m = MONTH_MAP[mStr];
    if (m) {
      const dateObj = new Date(Date.UTC(y, m - 1, d));
      if (!isNaN(dateObj.getTime())) {
        const isToday = (y === currY && m === currM && d === currD);
        return _buildDateResult(dateObj, isToday);
      }
    }
  }

  return null;
}

/**
 * Membersihkan kata-kata tanggal dari input teks tanpa merusak angka nama kelas (contoh: 'X TKJ 1 kemarin' -> 'X TKJ 1')
 */
export function _cleanDateFromText(text) {
  if (!text) return '';
  const monthNamesPattern = '(?:januari|jan|februari|feb|pebruari|maret|mar|april|apr|mei|may|juni|jun|juli|jul|agustus|agu|ags|august|september|sep|sept|oktober|okt|oct|november|nov|nopember|desember|des|dec)';
  const textDateRegex = new RegExp(`(?:\\b(?:tanggal|tgl)\\s+)?\\b(0?[1-9]|[12]\\d|3[01])\\s+${monthNamesPattern}(?:\\s+(20\\d{2}))?\\b`, 'gi');
  return text
    .replace(textDateRegex, '')
    .replace(/\b(20\d{2})[-/](0?[1-9]|1[0-2])[-/](0?[1-9]|[12]\d|3[01])\b/gi, '')
    .replace(/\b(0?[1-9]|[12]\d|3[01])[-/](0?[1-9]|1[0-2])[-/](20\d{2})\b/gi, '')
    .replace(/\b(kemarin|kemaren|hari\s+ini|besok|esok)\b/gi, '')
    .replace(/\b(tanggal|tgl)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function _handleUpdate(update) {
  // ── Dukung tombol inline keyboard (callback_query) ────────
  if (update.callback_query) {
    const cb = update.callback_query;
    const cbChatId = String(cb.message?.chat?.id || cb.from?.id);
    const cbData = cb.data;

    // Respon answerCallbackQuery sesegera mungkin agar icon loading di tombol Telegram berhenti
    if (_botToken && cb.id) {
      fetch(`https://api.telegram.org/bot${_botToken}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callback_query_id: cb.id }),
        signal: AbortSignal.timeout(5000)
      }).catch(() => {});
    }

    update.message = {
      chat: { id: cbChatId },
      from: cb.from,
      text: cbData
    };
  }

  const msg = update.message || update.channel_post || update.edited_message;
  if (!msg || !msg.text) return;

  const chatId = String(msg.chat?.id || '');
  const fromId = String(msg.from?.id || '');
  const text = msg.text.trim();
  const from = msg.from?.username ? `@${msg.from.username}` : (msg.from?.first_name || chatId);

  // Bersihkan mention bot (@bot_name atau @name_bot) dari teks pengguna
  // Contoh: "@KurmonBot /absen" -> "/absen", "/status@KurmonBot" -> "/status"
  let cleanInput = text.replace(/@\w+/g, '').trim();
  if (!cleanInput) cleanInput = text.trim();

  const parts = cleanInput.split(/\s+/);
  let cmd = parts[0].toLowerCase().split('@')[0];
  let args = parts.slice(1);

  // Cek apakah input mengandung tanggal atau merupakan pertanyaan panjang/natural
  const lowerText = cleanInput.toLowerCase().trim();
  const detectedDate = _parseIndonesianDate(cleanInput);
  const isQuestionOrNatural = !!detectedDate ||
    /^(siapa|kapan|berapa|kenapa|mengapa|apakah|tolong|cek|bagaimana|lihat|ada\s+apa)\b|[?]/i.test(lowerText) ||
    cleanInput.split(/\s+/).length > 2;

  // Hanya petakan teks tombol keyboard ke perintah jika BUKAN kalimat pertanyaan/kueri tanggal
  if (!isQuestionOrNatural) {
    if (lowerText.includes('presensi hari ini') || lowerText.includes('rekap siswa') || lowerText.includes('rekap presensi') || lowerText === 'rekap' || lowerText === 'absen' || lowerText === '/absen') {
      cmd = '/absen';
      args = [];
    } else if (lowerText.includes('presensi guru') || lowerText.includes('absen guru') || lowerText === '/absen_guru') {
      cmd = '/absen_guru';
      args = [];
    } else if (lowerText.includes('keterlambatan') || lowerText.includes('terlambat') || lowerText.includes('telat') || lowerText === '/terlambat') {
      cmd = '/terlambat';
      args = [];
    } else if (lowerText.includes('status mesin') || lowerText.includes('mesin absensi') || lowerText.includes('mesin') || lowerText.includes('perangkat') || lowerText === '/mesin') {
      cmd = '/mesin';
      args = [];
    } else if (lowerText.includes('tarik log') || lowerText.includes('tarik absensi') || lowerText.includes('sync') || lowerText === '/sync') {
      cmd = '/sync';
      args = [];
    } else if (lowerText.includes('menu lengkap') || lowerText.includes('menu utama') || lowerText.includes('pilihan menu') || lowerText === 'menu' || lowerText === '/menu') {
      cmd = '/menu';
      args = [];
    } else if (lowerText.includes('kasus pelanggaran') || lowerText.includes('pelanggaran') || lowerText.includes('poin') || lowerText === '/pelanggaran') {
      cmd = '/pelanggaran';
      args = [];
    } else if (lowerText.includes('prestasi siswa') || lowerText.includes('prestasi') || lowerText === '/prestasi') {
      cmd = '/prestasi';
      args = [];
    } else if (lowerText.includes('status whatsapp') || lowerText.includes('whatsapp') || lowerText.includes('wa') || lowerText === '/wa') {
      cmd = '/wa';
      args = [];
    } else if (lowerText.includes('server & db') || lowerText.includes('info database') || lowerText.includes('db') || lowerText.includes('database') || lowerText === '/db') {
      cmd = '/db';
      args = [];
    } else if (lowerText.includes('daftar kelas') || lowerText === '/kelas') {
      cmd = '/kelas';
      args = [];
    } else if (lowerText.includes('presensi per kelas') || lowerText.includes('rekap per kelas') || lowerText.includes('rekap kelas') || lowerText === '/rekap_kelas') {
      cmd = '/rekap_kelas';
      args = [];
    } else if (lowerText.includes('status server') || lowerText === '/status') {
      cmd = '/status';
      args = [];
    } else if (lowerText.includes('statistik') || lowerText.includes('stats') || lowerText === '/stats') {
      cmd = '/stats';
      args = [];
    } else if (lowerText.includes('keamanan') || lowerText.includes('alert') || lowerText === '/alerts') {
      cmd = '/alerts';
      args = [];
    } else if (lowerText.includes('backup') || lowerText.includes('cadangan') || lowerText === '/backup') {
      cmd = '/backup';
      args = [];
    } else if (lowerText.includes('info update') || lowerText.includes('changelog') || lowerText.includes('pembaruan') || lowerText === 'update' || lowerText === 'versi' || lowerText === '/update') {
      cmd = '/update';
      args = [];
    } else if (lowerText.includes('tanya') || lowerText.includes('bantuan') || lowerText.includes('panduan') || lowerText.includes('help') || lowerText === '/help') {
      cmd = '/help';
      args = [];
    } else if (!cmd.startsWith('/')) {
      const knownWords = [
        'help', 'status', 'logs', 'backup', 'alerts', 'stats', 'absen', 'rekap', 'kelas', 'guru', 'menu', 
        'mesin', 'perangkat', 'terlambat', 'sync', 'siswa', 'pelanggaran', 'poin', 'prestasi', 'wa', 'db', 'pkl', 'tanya', 'update', 'versi', 'changelog'
      ];
      if (knownWords.includes(cmd)) {
        cmd = '/' + cmd;
      }
    }
  }

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

  // Whitelist check: Cocokkan Chat ID grup/pribadi atau ID pengirim yang berwenang
  const isAllowed = _allowedChatIds.has(chatId) || 
                    (!!_chatId && chatId === String(_chatId)) ||
                    (fromId && _allowedChatIds.has(fromId)) ||
                    (!!_chatId && fromId === String(_chatId));

  if (!isAllowed && (_allowedChatIds.size > 0 || _chatId)) {
    await _sendMessage(chatId, 
      `⛔ <b>Akses Belum Didaftarkan</b>\n\n` +
      `ID Chat Telegram Anda: <code>${chatId}</code>\n\n` +
      `Sistem ini diproteksi untuk keamanan. Daftarkan Chat ID ini di web Kurmon pada menu <b>Pengaturan > Backup & Bot Telegram > API Key</b> agar dapat mengakses seluruh fitur bot.`,
      { isHtml: true }
    );
    return;
  }

  // Tampilkan indikator "bot sedang mengetik" sesegera mungkin
  _sendChatAction(chatId, 'typing');

  // Pintasan langsung dari link perintah, contoh: /absen_X_TKJ_1
  if (cmd.startsWith('/absen_') && !['/absen_guru', '/absen_semua', '/absen_rekap'].includes(cmd)) {
    const targetClass = cmd.slice(7).replace(/_/g, ' ').trim();
    await _cmdAbsenPerKelas(chatId, targetClass);
    return;
  }

  try {
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
          const argText = args.join(' ');
          const dateArg = _parseIndonesianDate(argText);
          const potentialClass = dateArg ? _cleanDateFromText(argText) : argText;
          if (potentialClass && potentialClass.length >= 2) {
            await _cmdAbsenPerKelas(chatId, potentialClass, dateArg);
          } else if (dateArg) {
            await sendDailyMorningAttendanceReport(chatId, dateArg);
          } else {
            await _cmdAbsenPerKelas(chatId, argText);
          }
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
          const argText = args.join(' ');
          const dateArg = _parseIndonesianDate(argText);
          if (dateArg) {
            await _cmdAbsenGuru(chatId, dateArg);
          } else {
            await _cmdCariGuru(chatId, argText);
          }
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
        if (args.length > 0) {
          const argText = args.join(' ');
          const dateArg = _parseIndonesianDate(argText);
          const isGuru = /guru|karyawan|staff/i.test(argText);
          const isSiswa = /siswa|murid|anak/i.test(argText);
          const filterType = isGuru ? 'guru' : (isSiswa ? 'siswa' : 'all');
          await _cmdTerlambat(chatId, dateArg, filterType);
        } else {
          await _cmdTerlambat(chatId);
        }
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
        await _handleSmartAssistant(chatId, cleanInput || text);
    }
  } catch (err) {
    console.error(`[TelegramBot] Gagal menjalankan perintah ${cmd}:`, err);
    await _sendMessage(chatId, 
      `⚠️ <b>Maaf, terjadi kendala saat memproses menu:</b>\n` +
      `<i>${escapeHtml(err.message || 'Kesalahan sistem')}</i>\n\n` +
      `💡 <i>Silakan coba beberapa saat lagi atau ketik <b>/menu</b> untuk navigasi.</i>`, 
      { isHtml: true }
    );
  }
}

// ── Commands ─────────────────────────────────────────────

async function _cmdHelp(chatId) {
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

  await _sendMessage(chatId, msg, { isHtml: true, reply_markup: BACK_TO_MENU_KEYBOARD });
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
    { isHtml: true, reply_markup: BACK_TO_MENU_KEYBOARD }
  );
}

/**
 * Pengecekan status & diagnosa real-time seluruh mesin absensi Hikvision
 * Menampilkan status online/offline, waktu mulai mati, dan durasi mati (downtime)
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
    const now = Date.now();

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
      let isOk = probeRes.ok;
      let errDesc = '';

      if (!probeRes.ok) {
        statusIcon = '🔴';
        statusBadge = 'OFFLINE / TERPUTUS';
        offlineCount++;

        if (probeRes.code === 'EHOSTUNREACH') {
          errDesc = 'Host Unreachable (Jalur router terputus)';
          detailDiagnostic = 
            `⚠️ <b>Analisis Kendala:</b> <code>Host Unreachable</code>\n` +
            `• <b>Penyebab:</b> Jalur router antar-kampus terputus atau subnet tidak dapat dijangkau dari server.\n` +
            `• <b>Solusi:</b> Periksa switch utama / link radio / kabel FO antar kampus, pastikan gateway router menyala.`;
        } else if (probeRes.code === 'ENETUNREACH') {
          errDesc = 'Network Unreachable';
          detailDiagnostic = 
            `⚠️ <b>Analisis Kendala:</b> <code>Network Unreachable</code>\n` +
            `• <b>Penyebab:</b> Tidak ada rute gateway menuju alamat IP <code>${escapeHtml(ip)}</code>.\n` +
            `• <b>Solusi:</b> Periksa kabel LAN server atau tabel routing jaringan lokal.`;
        } else if (probeRes.code === 'ETIMEDOUT') {
          errDesc = 'Connection Timeout (Mesin mati / kabel terlepas)';
          detailDiagnostic = 
            `⚠️ <b>Analisis Kendala:</b> <code>Connection Timeout (2.5s)</code>\n` +
            `• <b>Penyebab:</b> Mesin tidak merespon paket jaringan. Kemungkinan mesin mati (power off / mati lampu), kabel LAN tercabut, atau IP mesin diubah / bentrok.\n` +
            `• <b>Solusi:</b> Cek fisik mesin di lokasi, pastikan adaptor PoE / power menyala dan lampu port LAN berkedip.`;
        } else if (probeRes.code === 'ECONNREFUSED') {
          errDesc = 'Connection Refused (Port 80 ditolak)';
          detailDiagnostic = 
            `⚠️ <b>Analisis Kendala:</b> <code>Connection Refused (Port 80)</code>\n` +
            `• <b>Penyebab:</b> IP aktif namun port HTTP ditolak. Service web ISAPI Hikvision mungkin sedang restart atau crash.\n` +
            `• <b>Solusi:</b> Restart mesin absensi (cabut dan colok kembali power adaptor).`;
        } else {
          errDesc = probeRes.message || 'Gagal terhubung';
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
            isOk = false;
            statusIcon = '🟠';
            statusBadge = 'KREDENSIAL SALAH (401)';
            errDesc = 'Kredensial Ditolak (401 Unauthorized)';
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

      // Update tracker status & hitung downtime
      await updateDeviceHealthStatus(dev.id, ip, isOk, errDesc, probeRes.latency, { loc: dev.location, type: dev.device_type });
      const currentTrack = _deviceStatusTracker.get(String(dev.id)) || {};

      const lastScanStr = stats.last_log_time 
        ? new Date(stats.last_log_time).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) + ' WIB'
        : 'Belum ada data';
      const lastSyncStr = stats.last_sync_time
        ? new Date(stats.last_sync_time).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) + ' WIB'
        : 'Belum pernah';

      let downtimeInfo = '';
      if (!isOk) {
        const offlineSinceTs = currentTrack.offlineSince || now;
        const downtimeMs = Math.max(0, now - offlineSinceTs);
        const offlineSinceDate = new Date(offlineSinceTs);
        const offlineSinceTimeStr = offlineSinceDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }).replace('.', ':');
        const isSameDay = offlineSinceDate.toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' }) === todayJkt;
        const offlineSinceDisplay = isSameDay 
          ? `Pukul ${offlineSinceTimeStr} WIB` 
          : `${offlineSinceDate.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })} pk ${offlineSinceTimeStr} WIB`;

        downtimeInfo = 
          `• ⏳ <b>Mati Sejak:</b> <b>${offlineSinceDisplay}</b>\n` +
          `• ⏱️ <b>Durasi Mati:</b> <b>${formatDowntimeDuration(downtimeMs)}</b>\n`;
      }

      deviceReports.push(
        `${statusIcon} <b>[ID ${dev.id}] ${escapeHtml(dev.location || 'Mesin Absensi')}</b>\n` +
        `• <b>IP:</b> <code>${escapeHtml(ip)}</code> | <b>Tipe:</b> ${escapeHtml(dev.device_type || 'siswa')}\n` +
        `• <b>Status Jaringan:</b> <b>${statusBadge}</b> ${probeRes.latency ? `(${latencyStr})` : ''}\n` +
        `${downtimeInfo}` +
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

    await _sendMessage(chatId, part1, { 
      isHtml: true,
      reply_markup: deviceReports.length <= half ? BACK_TO_MENU_KEYBOARD : undefined 
    });
    if (deviceReports.length > half) {
      await _sendMessage(chatId, part2, { 
        isHtml: true,
        reply_markup: BACK_TO_MENU_KEYBOARD 
      });
    }

  } catch (err) {
    await _sendMessage(chatId, `❌ Gagal memeriksa status mesin: ${escapeHtml(err.message)}`, { 
      isHtml: true,
      reply_markup: BACK_TO_MENU_KEYBOARD 
    });
  }
}

/**
 * Kirim notifikasi status mesin absensi terjadwal (pk 05:00 pagi dan 20:00 malam WIB)
 * Memberikan rincian mesin yang mati, sejak jam berapa, dan durasi matinya.
 * @param {'05:00'|'20:00'|string} timeSlot
 * @param {string|null} targetChatId
 */
export async function sendScheduledDeviceStatusReport(timeSlot = '05:00', targetChatId = null) {
  if (!_dbPool) return;
  if (!_initialized) await _loadConfig();
  const destChatId = targetChatId || _chatId;
  if (!_botToken || !destChatId) return;

  try {
    const { rows: devices } = await _dbPool.query('SELECT * FROM hikvision_devices ORDER BY id');
    if (devices.length === 0) return;

    const todayJkt = new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const now = Date.now();
    const nowTimeStr = new Date(now).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }).replace('.', ':');
    const todayFormatted = new Date(now).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' });

    // Ambil rekap log scan hari ini
    const { rows: logStats } = await _dbPool.query(`
      SELECT device_id, 
             MAX(timestamp) as last_log_time, 
             COUNT(id) as total_logs,
             COUNT(CASE WHEN timestamp::date = $1 THEN 1 END) as today_logs
      FROM hikvision_logs
      GROUP BY device_id
    `, [todayJkt]).catch(() => ({ rows: [] }));
    const statMap = new Map(logStats.map(s => [s.device_id, s]));

    let onlineCount = 0;
    let offlineCount = 0;
    const deviceReports = [];

    for (const dev of devices) {
      const stats = statMap.get(dev.id) || { total_logs: 0, today_logs: 0, last_log_time: null };
      const ip = dev.ip_address;
      const port = 80;

      // Probe TCP
      const probeRes = await _probeDeviceTcp(ip, port, 3000);
      let isOk = probeRes.ok;
      let latencyStr = probeRes.latency !== null ? `${probeRes.latency} ms` : '-';
      let errDesc = '';

      if (isOk) {
        try {
          const plainPwd = decryptPassword(dev.encrypted_password, dev.iv_vector);
          const api = new HikvisionAPI(ip, dev.username, plainPwd);
          const testStart = new Date(Date.now() - 30 * 60 * 1000);
          const testEnd = new Date();
          await api.searchEvents(testStart, testEnd);
        } catch (authErr) {
          if (authErr.message?.includes('401') || authErr.message?.includes('auth') || authErr.message?.includes('Unauthorized')) {
            isOk = false;
            errDesc = 'Password Ditolak (401 Unauthorized)';
          }
        }
      } else {
        if (probeRes.code === 'ETIMEDOUT') errDesc = 'Koneksi Timeout (Mesin mati / kabel terlepas)';
        else if (probeRes.code === 'EHOSTUNREACH') errDesc = 'Host Unreachable (Jalur router terputus)';
        else if (probeRes.code === 'ENETUNREACH') errDesc = 'Network Unreachable';
        else if (probeRes.code === 'ECONNREFUSED') errDesc = 'Port Ditolak (Service restart / crash)';
        else errDesc = probeRes.message || 'Gagal terhubung';
      }

      await updateDeviceHealthStatus(dev.id, ip, isOk, errDesc, probeRes.latency, { loc: dev.location, type: dev.device_type });
      const currentTrack = _deviceStatusTracker.get(String(dev.id)) || {};

      if (isOk) {
        onlineCount++;
        deviceReports.push(
          `🟢 <b>[ID ${dev.id}] ${escapeHtml(dev.location || 'Mesin Absensi')}</b>\n` +
          `• <b>IP:</b> <code>${escapeHtml(ip)}</code> | <b>Tipe:</b> ${escapeHtml(dev.device_type || 'siswa')}\n` +
          `• <b>Status:</b> <b>ONLINE NORMAL</b> (${latencyStr})\n` +
          `• <b>Scan Hari Ini:</b> <b>${stats.today_logs}</b> scan`
        );
      } else {
        offlineCount++;
        const offlineSinceTs = currentTrack.offlineSince || now;
        const downtimeMs = Math.max(0, now - offlineSinceTs);
        const offlineSinceDate = new Date(offlineSinceTs);
        const offlineSinceTimeStr = offlineSinceDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }).replace('.', ':');
        const isSameDay = offlineSinceDate.toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' }) === todayJkt;
        const offlineSinceDisplay = isSameDay 
          ? `Pukul ${offlineSinceTimeStr} WIB` 
          : `${offlineSinceDate.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })} pk ${offlineSinceTimeStr} WIB`;

        deviceReports.push(
          `🔴 <b>[ID ${dev.id}] ${escapeHtml(dev.location || 'Mesin Absensi')}</b>\n` +
          `• <b>IP:</b> <code>${escapeHtml(ip)}</code> | <b>Tipe:</b> ${escapeHtml(dev.device_type || 'siswa')}\n` +
          `• <b>Status Jaringan:</b> <b>OFFLINE / TERPUTUS</b>\n` +
          `• ⏳ <b>Mati Sejak:</b> <b>${offlineSinceDisplay}</b>\n` +
          `• ⏱️ <b>Durasi Mati:</b> <b>${formatDowntimeDuration(downtimeMs)}</b>\n` +
          `• ⚠️ <b>Analisis Kendala:</b> <code>${escapeHtml(errDesc)}</code>`
        );
      }
    }

    const isMorning = String(timeSlot).startsWith('05') || timeSlot === 'pagi';
    const titleHeader = isMorning
      ? `📟 <b>LAPORAN KESIAPAN MESIN ABSENSI PAGI (05:00 WIB)</b>\n<i>Pengecekan otomatis sebelum kedatangan siswa & guru</i>`
      : `📟 <b>LAPORAN STATUS MESIN ABSENSI MALAM (20:00 WIB)</b>\n<i>Pengecekan penutupan harian perangkat sekolah</i>`;

    const summaryBadge = offlineCount === 0
      ? `✅ <b>SEMUA MESIN SIAP DIGUNAKAN (100% ONLINE)</b>`
      : `⚠️ <b>PERHATIAN: ${offlineCount} MESIN BERMASALAH DITEMUKAN</b>`;

    let msg = 
`${titleHeader}
📅 <i>${todayFormatted} (${nowTimeStr} WIB)</i>
━━━━━━━━━━━━━━━━━━━━━
📊 <b>Ringkasan:</b> 🟢 <b>${onlineCount} Online</b> | 🔴 <b>${offlineCount} Bermasalah</b>
${summaryBadge}
━━━━━━━━━━━━━━━━━━━━━

${deviceReports.join('\n\n')}

━━━━━━━━━━━━━━━━━━━━━`;

    if (offlineCount > 0) {
      msg += `\n💡 <b>TINDAKAN TIM IT / PETUGAS:</b>\n` +
             `• Periksa power adaptor / colokan listrik mesin di lokasi.\n` +
             `• Pastikan kabel LAN terpasang kencang dan switch PoE menyala.\n` +
             `• Ketik <b>/mesin</b> untuk diagnosa ulang setelah perbaikan.`;
    } else {
      msg += `\n✨ <i>Seluruh perangkat absensi dalam kondisi prima dan siap merekam kehadiran.</i>`;
    }

    await _sendMessage(destChatId, msg, { 
      isHtml: true,
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🔄 Diagnosa Ulang', callback_data: '/mesin' },
            { text: '📋 Menu Utama', callback_data: '/menu' }
          ]
        ]
      }
    });

  } catch (err) {
    console.error('[TelegramBot] Gagal kirim laporan status mesin terjadwal:', err);
  }
}

/**
 * Memeriksa apakah suatu tanggal merupakan hari libur atau akhir pekan (Sabtu/Minggu)
 * @param {string} dateStr - Format YYYY-MM-DD
 * @returns {Promise<boolean>}
 */
async function _isHolidayOrWeekend(dateStr) {
  try {
    const d = new Date(dateStr + 'T12:00:00+07:00');
    const day = d.getDay();
    if (day === 0 || day === 6) return true;

    if (_dbPool) {
      const mainRes = await _dbPool.query("SELECT data FROM app_data WHERE store_key = 'main_store' LIMIT 1");
      if (mainRes.rows.length > 0 && mainRes.rows[0].data) {
        const parsed = typeof mainRes.rows[0].data === 'string' ? JSON.parse(mainRes.rows[0].data) : mainRes.rows[0].data;
        const cal = parsed?.academicCalendar || parsed?.academic_calendar || [];
        const isEventHoliday = cal.some(evt => {
          const s = evt.dateStart || evt.date;
          const e = evt.dateEnd || evt.dateStart || evt.date;
          if (dateStr >= s && dateStr <= e) {
            return evt.isHoliday === true || evt.isHoliday === 'true' || String(evt.title || '').toLowerCase().includes('libur');
          }
          return false;
        });
        if (isEventHoliday) return true;
      }
    }
  } catch (e) {}
  return false;
}

/**
 * Menampilkan daftar keterlambatan siswa dan guru/karyawan (Hari ini atau Tanggal Tertentu)
 * @param {string} chatId 
 * @param {object|null} dateInfo - Hasil parse _parseIndonesianDate
 * @param {string} filterType - 'all' | 'guru' | 'siswa'
 */
async function _cmdTerlambat(chatId, dateInfo = null, filterType = 'all') {
  if (!_dbPool) {
    await _sendMessage(chatId, '❌ Database tidak tersedia.');
    return;
  }
  try {
    const isHistorical = !!dateInfo && !dateInfo.isToday;
    const targetDate = dateInfo ? dateInfo.isoDate : new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' });
    const targetFormatted = dateInfo ? dateInfo.formatted : new Date().toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    
    let masukLate = '07:00';
    let guruLate = '07:15';
    try {
      const confRes = await _dbPool.query("SELECT data FROM app_data WHERE store_key = 'hikvision_attendance_config' LIMIT 1");
      if (confRes.rows.length > 0 && confRes.rows[0].data) {
        const conf = typeof confRes.rows[0].data === 'string' ? JSON.parse(confRes.rows[0].data) : confRes.rows[0].data;
        masukLate = conf?.siswa?.masuk_late || conf?.masuk_late || '07:00';
        guruLate = conf?.guru?.masuk_late || conf?.masuk_late || '07:15';
      } else {
        const mainConf = await _dbPool.query("SELECT data FROM app_data WHERE store_key = 'main_store' LIMIT 1");
        if (mainConf.rows.length > 0 && mainConf.rows[0].data) {
          const m = typeof mainConf.rows[0].data === 'string' ? JSON.parse(mainConf.rows[0].data) : mainConf.rows[0].data;
          masukLate = m?.featureSettings?.masuk_late || m?.siswa?.masuk_late || '07:00';
          guruLate = m?.featureSettings?.guru_masuk_late || m?.guru?.masuk_late || '07:15';
        }
      }
    } catch(e) {}

    // Periksa apakah ada catatan scan presensi sama sekali pada tanggal ini
    const { rows: scanCountRows } = await _dbPool.query(
      `SELECT COUNT(employee_id) as total_scan FROM hikvision_logs WHERE timestamp::date = $1::date`,
      [targetDate]
    ).catch(() => ({ rows: [{ total_scan: 0 }] }));
    const totalScansOnDate = parseInt(scanCountRows[0]?.total_scan || 0, 10);

    const isWeekendHoliday = await _isHolidayOrWeekend(targetDate);
    if (isWeekendHoliday) {
      let msg = `⏰ <b>REKAP KETERLAMBATAN</b>\n📅 <i>${targetFormatted}</i>\n\n`;
      msg += `🏖️ <b>Status Kalender:</b> Hari Libur / Akhir Pekan\n`;
      msg += `Tidak diberlakukan jam batas keterlambatan sekolah.\n\n`;
      if (totalScansOnDate > 0) {
        msg += `✨ Terdata <b>${totalScansOnDate} kali scan</b> presensi untuk kegiatan ekstrakurikuler / kegiatan sekolah hari ini. Seluruhnya dicatat hadir tanpa status terlambat.`;
      } else {
        msg += `<i>Tidak ada aktivitas presensi di sekolah pada hari libur ini.</i>`;
      }
      await _sendMessage(chatId, msg, { isHtml: true, reply_markup: BACK_TO_MENU_KEYBOARD });
      return;
    }

    // 1. Siswa Terlambat (Berdasarkan tap pertama dalam hari tersebut)
    let siswaLate = [];
    if (filterType !== 'guru') {
      const sRes = await _dbPool.query(`
        SELECT l.employee_id, MIN(l.timestamp) as scan_time,
               COALESCE(ms.payload->>'name', ms.payload->>'nama', hs.name, l.employee_id) as student_name,
               COALESCE(ms.payload->>'class_name', ms.payload->>'kelas', hs.class_name, '-') as class_name
        FROM hikvision_logs l
        LEFT JOIN mst_students ms ON ms.payload->>'nis' = l.employee_id OR ms.payload->>'code' = l.employee_id
        LEFT JOIN hikvision_students hs ON hs.nis = l.employee_id
        WHERE l.timestamp::date = $1::date
          AND l.person_type = 'siswa'
        GROUP BY l.employee_id, ms.payload, hs.name, hs.class_name
        HAVING TO_CHAR(MIN(l.timestamp), 'HH24:MI') > $2
        ORDER BY scan_time ASC
        LIMIT 50
      `, [targetDate, masukLate]).catch(() => ({ rows: [] }));
      siswaLate = sRes.rows;
    }

    // 2. Guru / Karyawan Terlambat (Berdasarkan tap pertama dalam hari tersebut)
    let guruLateList = [];
    if (filterType !== 'siswa') {
      const gRes = await _dbPool.query(`
        SELECT l.employee_id, MIN(l.timestamp) as scan_time,
               COALESCE(mt.payload->>'name', mt.payload->>'nama', mf.payload->>'name', l.employee_id) as name,
               l.person_type
        FROM hikvision_logs l
        LEFT JOIN mst_teachers mt ON mt.payload->>'code' = l.employee_id OR mt.payload->>'nip' = l.employee_id OR mt.payload->>'id' = l.employee_id
        LEFT JOIN mst_staffs mf ON mf.payload->>'staff_code' = l.employee_id OR mf.payload->>'code' = l.employee_id OR mf.payload->>'id' = l.employee_id
        WHERE l.timestamp::date = $1::date
          AND l.person_type IN ('guru', 'karyawan', 'staff')
        GROUP BY l.employee_id, mt.payload, mf.payload, l.person_type
        HAVING TO_CHAR(MIN(l.timestamp), 'HH24:MI') > $2
        ORDER BY scan_time ASC
        LIMIT 50
      `, [targetDate, guruLate]).catch(() => ({ rows: [] }));
      guruLateList = gRes.rows;
    }

    let titlePrefix = isHistorical ? 'REKAP KETERLAMBATAN' : 'REKAP KETERLAMBATAN HARI INI';
    if (filterType === 'guru') titlePrefix = isHistorical ? 'DAFTAR GURU & KARYAWAN TERLAMBAT' : 'GURU & KARYAWAN TERLAMBAT HARI INI';
    if (filterType === 'siswa') titlePrefix = isHistorical ? 'DAFTAR SISWA TERLAMBAT' : 'SISWA TERLAMBAT HARI INI';

    let msg = `⏰ <b>${titlePrefix}</b>\n` +
              `📅 <b>Tanggal:</b> ${targetFormatted}\n`;
    if (filterType !== 'guru') msg += `⏳ <b>Batas Jam Masuk Siswa:</b> <code>${masukLate} WIB</code>\n`;
    if (filterType !== 'siswa') msg += `⏳ <b>Batas Jam Masuk Guru:</b> <code>${guruLate} WIB</code>\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

    if (totalScansOnDate === 0) {
      msg += `ℹ️ <i>Tidak ada rekaman log presensi scan pada tanggal ini (kemungkinan hari libur / akhir pekan atau mesin presensi sedang tidak aktif).</i>\n`;
    } else {
      if (filterType !== 'siswa') {
        msg += `👨‍🏫 <b>GURU & KARYAWAN TERLAMBAT (${guruLateList.length}):</b>\n`;
        if (guruLateList.length === 0) {
          msg += `<i>Tidak ada guru/karyawan terlambat pada tanggal ini.</i>\n\n`;
        } else {
          guruLateList.forEach((g, idx) => {
            const timeStr = new Date(g.scan_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }).replace('.', ':');
            msg += `${idx + 1}. <b>${escapeHtml(g.name)}</b> (${escapeHtml(g.person_type)})\n   🕒 Masuk: <code>${timeStr} WIB</code>\n`;
          });
          msg += `\n`;
        }
      }

      if (filterType !== 'guru') {
        msg += `🎓 <b>SISWA TERLAMBAT (${siswaLate.length}):</b>\n`;
        if (siswaLate.length === 0) {
          msg += `<i>Tidak ada siswa tercatat terlambat pada tanggal ini.</i>\n`;
        } else {
          siswaLate.forEach((s, idx) => {
            const timeStr = new Date(s.scan_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }).replace('.', ':');
            msg += `${idx + 1}. <b>${escapeHtml(s.student_name)}</b> (${escapeHtml(s.class_name)})\n   🕒 Scan: <code>${timeStr} WIB</code> | NIS: <code>${escapeHtml(s.employee_id)}</code>\n`;
          });
        }
      }
    }

    await _sendMessage(chatId, msg, { isHtml: true, reply_markup: BACK_TO_MENU_KEYBOARD });
  } catch (err) {
    await _sendMessage(chatId, `❌ Gagal mengambil rekap keterlambatan: ${escapeHtml(err.message)}`, { isHtml: true });
  }
}

/**
 * Menampilkan catatan izin, sakit, dan dispensasi siswa pada tanggal tertentu
 */
async function _cmdIzinSakitTanggal(chatId, dateInfo) {
  if (!_dbPool) { await _sendMessage(chatId, '❌ Database tidak tersedia.'); return; }
  try {
    const targetDate = dateInfo.isoDate;
    const { rows } = await _dbPool.query(`
      SELECT a.siswa_nis, a.status, a.keterangan, a.created_at,
             COALESCE(ms.payload->>'name', ms.payload->>'nama', a.siswa_nis) as nama,
             COALESCE(ms.payload->>'class_name', ms.payload->>'kelas', '-') as kelas
      FROM kedisiplinan_absensi a
      LEFT JOIN mst_students ms ON ms.payload->>'nis' = a.siswa_nis OR ms.payload->>'code' = a.siswa_nis
      WHERE a.tanggal::date = $1::date
      ORDER BY a.created_at ASC
    `, [targetDate]).catch(() => ({ rows: [] }));

    let msg = `📝 <b>SURAT DISIPLIN / IZIN & SAKIT SISWA</b>\n` +
              `📅 <b>Tanggal:</b> ${dateInfo.formatted}\n` +
              `━━━━━━━━━━━━━━━━━━━━━\n\n`;

    if (rows.length === 0) {
      msg += `<i>Tidak ada catatan surat izin, sakit, atau dispensasi siswa pada tanggal ini.</i>`;
    } else {
      msg += `Tercatat <b>${rows.length} siswa</b> berhalangan hadir:\n\n`;
      rows.forEach((r, idx) => {
        msg += `${idx + 1}. <b>${escapeHtml(r.nama)}</b> (${escapeHtml(r.kelas)})\n` +
               `   📌 Status: <b>${escapeHtml(r.status)}</b>\n` +
               (r.keterangan ? `   💬 Keterangan: <i>${escapeHtml(r.keterangan)}</i>\n` : '');
      });
    }

    await _sendMessage(chatId, msg, { isHtml: true, reply_markup: BACK_TO_MENU_KEYBOARD });
  } catch (err) {
    await _sendMessage(chatId, `❌ Gagal mengambil data izin/sakit: ${escapeHtml(err.message)}`, { isHtml: true });
  }
}

/**
 * Ringkasan aktivitas presensi & sekolah pada tanggal tertentu
 */
async function _cmdRingkasanTanggal(chatId, dateInfo) {
  if (!_dbPool) { await _sendMessage(chatId, '❌ Database tidak tersedia.'); return; }
  try {
    const targetDate = dateInfo.isoDate;
    const [scanRes, lateRes, permitRes] = await Promise.all([
      _dbPool.query(`
        SELECT person_type, COUNT(DISTINCT employee_id) as total_user, COUNT(*) as total_scan
        FROM hikvision_logs
        WHERE timestamp::date = $1::date
        GROUP BY person_type
      `, [targetDate]).catch(() => ({ rows: [] })),
      _dbPool.query(`
        SELECT COUNT(*) as total_late FROM (
          SELECT employee_id, person_type, MIN(timestamp) as first_time
          FROM hikvision_logs
          WHERE timestamp::date = $1::date
          GROUP BY employee_id, person_type
          HAVING (person_type = 'siswa' AND TO_CHAR(MIN(timestamp), 'HH24:MI') > '07:00')
              OR (person_type IN ('guru', 'karyawan', 'staff') AND TO_CHAR(MIN(timestamp), 'HH24:MI') > '07:15')
        ) sub
      `, [targetDate]).catch(() => ({ rows: [{ total_late: 0 }] })),
      _dbPool.query(`
        SELECT status, COUNT(*) as cnt
        FROM kedisiplinan_absensi
        WHERE tanggal::date = $1::date
        GROUP BY status
      `, [targetDate]).catch(() => ({ rows: [] }))
    ]);

    let totalSiswaTap = 0;
    let totalGuruTap = 0;
    let totalKaryawanTap = 0;
    let totalScans = 0;

    scanRes.rows.forEach(r => {
      const type = String(r.person_type || '').toLowerCase();
      const uCount = parseInt(r.total_user, 10) || 0;
      totalScans += parseInt(r.total_scan, 10) || 0;
      if (type === 'siswa') totalSiswaTap += uCount;
      else if (type === 'guru') totalGuruTap += uCount;
      else if (type === 'karyawan' || type === 'staff') totalKaryawanTap += uCount;
    });

    let totalPermits = 0;
    permitRes.rows.forEach(r => { totalPermits += parseInt(r.cnt, 10) || 0; });
    const totalLate = parseInt(lateRes.rows[0]?.total_late || 0, 10);

    let msg = `📅 <b>INFORMASI & REKAP TANGGAL</b>\n` +
              `🗓️ <b>${dateInfo.formatted}</b>` +
              (dateInfo.isWeekend ? ` <i>(Akhir Pekan / Hari Libur)</i>\n\n` : `\n\n`);

    if (totalScans === 0 && totalPermits === 0) {
      msg += `ℹ️ <i>Tidak ada rekaman log presensi scan ataupun izin/sakit pada tanggal ini.</i>\n\n`;
    } else {
      msg += `📊 <b>Ringkasan Aktivitas Presensi:</b>\n` +
             `• 👨‍🏫 Guru Hadir Tap: <b>${totalGuruTap}</b> orang\n` +
             `• 💼 Karyawan Hadir Tap: <b>${totalKaryawanTap}</b> orang\n` +
             `• 🎓 Siswa Hadir Tap: <b>${totalSiswaTap}</b> orang\n` +
             `• ⏰ Total Terlambat: <b>${totalLate}</b> orang\n` +
             `• 📝 Siswa Izin / Sakit: <b>${totalPermits}</b> siswa\n` +
             `• 📟 Total Scan Log Mesin: <b>${totalScans}</b> kali\n\n`;
    }

    msg += `💡 <b>Pertanyaan tanggal yang bisa Anda tanyakan:</b>\n` +
           `• <i>"Siapa guru yang telat tanggal ${dateInfo.day} ${dateInfo.monthName} ${dateInfo.year}?"</i>\n` +
           `• <i>"Siapa siswa telat tanggal ${dateInfo.day} ${dateInfo.monthName} ${dateInfo.year}?"</i>\n` +
           `• <i>"Rekap presensi tanggal ${dateInfo.day} ${dateInfo.monthName} ${dateInfo.year}"</i>\n` +
           `• <i>"Siapa izin tanggal ${dateInfo.day} ${dateInfo.monthName} ${dateInfo.year}?"</i>`;

    await _sendMessage(chatId, msg, { isHtml: true, reply_markup: BACK_TO_MENU_KEYBOARD });
  } catch (err) {
    await _sendMessage(chatId, `❌ Gagal mengambil rekap tanggal: ${escapeHtml(err.message)}`, { isHtml: true });
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
  await _sendMessage(chatId, `⏳ <i>Sedang membuat berkas cadangan database... Mohon tunggu sebentar.</i>`, { isHtml: true });
  try {
    const { runBackupJson } = await import('./auto-backup.mjs');
    const result = await runBackupJson();
    await _sendMessage(chatId,
      `✅ <b>Pencadangan Database Berhasil!</b>\n\n` +
      `• <b>Nama Berkas:</b> <code>${escapeHtml(result.fileName)}</code>\n` +
      `• <b>Ukuran:</b> <b>${result.size}</b>\n` +
      `• <b>SHA-256:</b> <code>${result.checksum ? result.checksum.slice(0, 20) + '...' : '-'}</code>\n` +
      `• <b>Diminta Oleh:</b> ${escapeHtml(from)}\n` +
      `• <b>Waktu:</b> ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB\n\n` +
      `📤 <i>Mengunggah berkas cadangan ke chat...</i>`,
      { isHtml: true }
    );

    // Kirim berkas dokumen backup langsung ke Telegram jika berkas tersedia
    if (result.filePath && _botToken) {
      try {
        const fsPromises = await import('node:fs/promises');
        const fileBuffer = await fsPromises.readFile(result.filePath);
        const boundary = "----KurmonBackupBoundary" + Date.now().toString(16);
        const captionText = `📦 <b>Berkas Cadangan Database Kurmon</b>\n🗂 <code>${result.fileName}</code>\n💾 Ukuran: ${result.size}`;
        const multipartHeader = Buffer.from(
          `--${boundary}\r\n` +
          `Content-Disposition: form-data; name="chat_id"\r\n\r\n${chatId}\r\n` +
          `--${boundary}\r\n` +
          `Content-Disposition: form-data; name="caption"\r\n\r\n${captionText}\r\n` +
          `--${boundary}\r\n` +
          `Content-Disposition: form-data; name="parse_mode"\r\n\r\nHTML\r\n` +
          `--${boundary}\r\n` +
          `Content-Disposition: form-data; name="document"; filename="${result.fileName}"\r\n` +
          `Content-Type: application/json\r\n\r\n`,
          'utf-8'
        );
        const multipartFooter = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf-8');
        const finalBody = Buffer.concat([multipartHeader, fileBuffer, multipartFooter]);

        await fetch(`https://api.telegram.org/bot${_botToken}/sendDocument`, {
          method: 'POST',
          headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
          body: finalBody,
          signal: AbortSignal.timeout(60_000)
        });
      } catch (uploadErr) {
        console.warn('[TelegramBot] Gagal upload berkas cadangan ke Telegram:', uploadErr.message);
      }
    }
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
    await _sendMessage(chatId, `🛡️ <b>Alert Keamanan Terkini:</b>\n\n${lines}`, { isHtml: true, reply_markup: BACK_TO_MENU_KEYBOARD });
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
      { isHtml: true, reply_markup: BACK_TO_MENU_KEYBOARD }
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
  if (!q) {
    await _sendMessage(chatId, '💡 <b>Format Penggunaan:</b>\n<code>/guru [nama, NIP, atau kode]</code>\n\nContoh: <code>/guru Budi</code>', { isHtml: true });
    return;
  }
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

    await _sendMessage(chatId, msg, { isHtml: true, reply_markup: BACK_TO_MENU_KEYBOARD });
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

    await _sendMessage(chatId, msg, { isHtml: true, reply_markup: BACK_TO_MENU_KEYBOARD });
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
      { isHtml: true, reply_markup: BACK_TO_MENU_KEYBOARD }
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
      { isHtml: true, reply_markup: BACK_TO_MENU_KEYBOARD }
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

    await _sendMessage(chatId, msg, { isHtml: true, reply_markup: BACK_TO_MENU_KEYBOARD });
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
      { isHtml: true, reply_markup: BACK_TO_MENU_KEYBOARD }
    );
  } catch (err) {
    await _sendMessage(chatId, `❌ Gagal mengambil data PKL: ${escapeHtml(err.message)}`, { isHtml: true });
  }
}

/**
 * Asisten Cerdas Kurmon (Smart AI Assistant / Comprehensive Knowledge Engine)
 * Mampu memahami segala pertanyaan natural, bahasa sehari-hari, dan kueri data aplikasi Kurmon.
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
      `Saya dapat menjawab semua pertanyaan seputar sistem sekolah Kurmon dan menampilkan data aplikasi secara langsung. Contoh pertanyaan:\n\n` +
      `• <i>"Berapa jumlah siswa dan guru sekarang?"</i>\n` +
      `• <i>"Siapa saja yang terlambat hari ini?"</i>\n` +
      `• <i>"Cari siswa [Nama/NIS]"</i> atau <i>"Cari kontak guru [Nama]"</i>\n` +
      `• <i>"Bagaimana kondisi mesin absensi di kampus?"</i>\n` +
      `• <i>"Apa nama kepala sekolah dan NPSN?"</i>\n` +
      `• <i>"Apa saja jurusan / keahlian di sekolah?"</i>\n` +
      `• <i>"Siapa siswa yang izin atau sakit hari ini?"</i>\n` +
      `• <i>"Bagaimana aturan SP1, SP2, dan SP3?"</i>\n` +
      `• <i>"Cara cetak kartu pelajar ber-QR Code"</i>\n` +
      `• <i>"Cara mengisi jurnal mengajar guru"</i>\n` +
      `• <i>"Status siswa PKL dan mitra industri"</i>\n` +
      `• <i>"Apa password default admin sekolah?"</i>\n` +
      `• <i>"Cara membuka aplikasi dari HP via WiFi"</i>\n\n` +
      `💡 <i>Ketik pertanyaan Anda secara bebas, saya siap membantu!</i>`,
      { isHtml: true }
    );
    return;
  }

  // ── 0. Penanganan Pertanyaan Berbasis Tanggal (Historis & Tertentu) ──
  const dateInfo = _parseIndonesianDate(rawQ);
  if (dateInfo) {
    // 0.1 Guru / Karyawan / Staff Terlambat pada tanggal tertentu
    // Contoh: "tanggal 1 agustus 2026 siapa guru yang telat", "siapa guru yang telat tanggal 1 agustus 2026", "guru terlambat kemarin"
    if ((/guru|karyawan|staff|ustadz|pengajar/i.test(q)) && (/telat|terlambat|keterlambatan/i.test(q) || /siapa.*telat/i.test(q))) {
      await _cmdTerlambat(chatId, dateInfo, 'guru');
      return;
    }

    // 0.2 Siswa Terlambat pada tanggal tertentu
    // Contoh: "siapa siswa telat tanggal 1 agustus 2026", "siswa telat kemarin", "anak telat 5 agustus"
    if ((/siswa|murid|anak|peserta\s+didik/i.test(q)) && (/telat|terlambat|keterlambatan/i.test(q) || /siapa.*telat/i.test(q))) {
      await _cmdTerlambat(chatId, dateInfo, 'siswa');
      return;
    }

    // 0.3 Keterlambatan Umum pada tanggal tertentu (Semua: Guru & Siswa)
    // Contoh: "siapa yang telat tanggal 1 agustus 2026", "ada yang telat tanggal 1 agustus", "keterlambatan kemarin"
    if (/telat|terlambat|keterlambatan/i.test(q)) {
      await _cmdTerlambat(chatId, dateInfo, 'all');
      return;
    }

    // 0.4 Presensi / Kehadiran Guru & Karyawan pada tanggal tertentu
    // Contoh: "presensi guru tanggal 1 agustus 2026", "siapa guru hadir tanggal 1 agustus 2026", "guru masuk kemarin"
    if ((/guru|karyawan|staff/i.test(q)) && (/hadir|absen|presensi|masuk|datang/i.test(q))) {
      await _cmdAbsenGuru(chatId, dateInfo);
      return;
    }

    // 0.5 Siswa Izin / Sakit / Dispensasi pada tanggal tertentu
    // Contoh: "siapa siswa izin tanggal 1 agustus 2026", "surat izin kemarin", "ada yang sakit tanggal 1 agustus"
    if (/izin|sakit|dispensasi|surat/i.test(q)) {
      await _cmdIzinSakitTanggal(chatId, dateInfo);
      return;
    }

    // 0.6 Presensi Per Kelas pada tanggal tertentu
    // Contoh: "presensi kelas X TKJ 1 tanggal 1 agustus 2026", "rekap XI RPL 2 kemarin"
    const classMatch = q.match(/(?:kelas|rombel)?\s*([x|xi|xii]{1,3}\s+[a-z0-9_\-\s]+)/i);
    if (classMatch && (/absen|rekap|presensi|kehadiran/i.test(q))) {
      let className = _cleanDateFromText(classMatch[1]);
      if (className) {
        await _cmdAbsenPerKelas(chatId, className, dateInfo);
        return;
      }
    }

    // 0.7 Rekap Presensi / Laporan Kehadiran Global pada tanggal tertentu
    // Contoh: "rekap presensi 1 agustus 2026", "presensi tanggal 1 agustus 2026", "kehadiran tanggal 1 agustus", "rekap kemarin"
    if (/rekap|presensi|kehadiran|absen|laporan/i.test(q)) {
      await sendDailyMorningAttendanceReport(chatId, dateInfo);
      return;
    }

    // 0.8 Pertanyaan umum lainnya seputar tanggal tersebut
    // Contoh: "tanggal 1 agustus 2026", "cek tanggal 1 agustus 2026", "ada apa tanggal 1 agustus"
    await _cmdRingkasanTanggal(chatId, dateInfo);
    return;
  }

  // ── 1. Salam, Sapaan & Identitas Asisten ──
  if (/^(halo|hai|hey|hei|assalamualaikum|assalamu'alaikum|samlekom|selamat\s+(pagi|siang|sore|malam)|pagi|siang|sore|malam|tes|test|ping)$/i.test(q) ||
      q.includes('kamu siapa') || q.includes('siapa kamu') || q.includes('bisa apa') || q.includes('tentang kamu') || q.includes('siapa nama')) {
    const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });
    const todayStr = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' });

    let quickStat = '';
    try {
      const [sRes, tRes, devRes] = await Promise.all([
        _dbPool.query('SELECT COUNT(*) FROM mst_students'),
        _dbPool.query('SELECT COUNT(*) FROM mst_teachers'),
        _dbPool.query('SELECT COUNT(*) FROM hikvision_devices')
      ]);
      quickStat = `\n📊 <b>Kondisi Data Saat Ini:</b>\n` +
        `• Siswa Terdaftar: <b>${sRes.rows[0].count}</b> orang\n` +
        `• Guru Terdaftar: <b>${tRes.rows[0].count}</b> orang\n` +
        `• Mesin Terpasang: <b>${devRes.rows[0].count}</b> unit\n`;
    } catch (e) {}

    await _sendMessage(chatId,
      `👋 <b>Halo! Senang bisa membantu Anda.</b>\n\n` +
      `Saya adalah <b>Asisten Cerdas Kurmon</b> (Kurikulum & Monitoring Sekolah Terpadu).\n` +
      `📅 <i>${todayStr} — Pukul ${timeStr} WIB</i>\n` +
      quickStat + `\n` +
      `Anda dapat mengajukan pertanyaan apa saja tentang data siswa, guru, presensi, mesin absensi, aturan sekolah, hingga panduan teknis aplikasi.\n\n` +
      `💡 <i>Silakan ketik pertanyaan Anda atau klik <b>/menu</b> untuk navigasi tombol.</i>`,
      { isHtml: true }
    );
    return;
  }

  // ── 2. Ucapan Terima Kasih ──
  if (q.includes('terima kasih') || q.includes('makasih') || q.includes('tengkyu') || q.includes('thanks') || q.includes('matur nuwun')) {
    await _sendMessage(chatId,
      `😊 <b>Sama-sama! Senang bisa membantu Anda.</b>\n\n` +
      `Jika membutuhkan data presensi, pengecekan mesin, atau informasi tata kelola sekolah lainnya, jangan ragu untuk bertanya kembali kapan saja. Semoga hari Anda menyenangkan! ✨`,
      { isHtml: true }
    );
    return;
  }

  // ── 3. Info Update, Versi & Changelog ──
  if (q.includes('update') || q.includes('pembaruan') || q.includes('fitur baru') || q.includes('changelog') || q.includes('versi') || q.includes('apa yang baru')) {
    await _cmdInfoUpdate(chatId);
    return;
  }

  // ── 4. Profil Sekolah, Kepala Sekolah & Identitas ──
  if (q.includes('profil sekolah') || q.includes('nama sekolah') || q.includes('kepala sekolah') || q.includes('kepsek') || q.includes('npsn') || q.includes('alamat sekolah') || q.includes('visi') || q.includes('misi')) {
    let profileData = {};
    try {
      const { rows } = await _dbPool.query("SELECT key, value FROM school_profile");
      rows.forEach(r => { profileData[r.key] = r.value; });
    } catch (e) {}

    const schoolName = profileData.name || profileData.school_name || 'SMK / SMA Kurmon';
    const kepsek = profileData.headmaster || profileData.kepala_sekolah || profileData.kepsek || 'Belum diatur di Profil Sekolah';
    const npsn = profileData.npsn || 'Belum diatur';
    const address = profileData.address || profileData.alamat || 'Belum diatur';

    await _sendMessage(chatId,
      `🏫 <b>PROFIL & IDENTITAS SEKOLAH</b>\n\n` +
      `• 🏛️ <b>Nama Sekolah:</b> <b>${escapeHtml(schoolName)}</b>\n` +
      `• 👨‍💼 <b>Kepala Sekolah:</b> <b>${escapeHtml(kepsek)}</b>\n` +
      `• 🆔 <b>NPSN:</b> <code>${escapeHtml(npsn)}</code>\n` +
      `• 📍 <b>Alamat:</b> ${escapeHtml(address)}\n\n` +
      `💡 <i>Profil sekolah dapat disesuaikan oleh Administrator melalui menu <b>Pengaturan > Profil Sekolah</b> di aplikasi web.</i>`,
      { isHtml: true }
    );
    return;
  }

  // ── 5. Jurusan / Program Keahlian ──
  if (q.includes('jurusan') || q.includes('proli') || q.includes('keahlian') || q.includes('program studi')) {
    let deptList = [];
    try {
      const { rows } = await _dbPool.query("SELECT payload FROM mst_departments ORDER BY id ASC");
      deptList = rows.map(r => r.payload?.name || r.payload?.nama).filter(Boolean);
    } catch (e) {}

    if (deptList.length > 0) {
      const formatted = deptList.map((d, i) => `${i + 1}. <b>${escapeHtml(d)}</b>`).join('\n');
      await _sendMessage(chatId,
        `🎓 <b>KOMPETENSI KEAHLIAN / JURUSAN SEKOLAH</b>\n\n` +
        `Terdapat <b>${deptList.length} jurusan</b> yang terdaftar:\n\n` +
        formatted + `\n\n` +
        `💡 <i>Manajemen kurikulum, penugasan guru kejuruan, dan penempatan PKL dikelompokkan berdasarkan jurusan di atas.</i>`,
        { isHtml: true }
      );
    } else {
      await _sendMessage(chatId,
        `🎓 <b>KOMPETENSI KEAHLIAN / JURUSAN</b>\n\n` +
        `Data jurusan dikelola di menu <b>Master Data > Jurusan</b> di aplikasi web Kurmon. Setiap jurusan terhubung otomatis dengan modul jadwal, rombel kelas, dan penempatan siswa PKL.`,
        { isHtml: true }
      );
    }
    return;
  }

  // ── 6. Ruangan, Lab Komputer & Bengkel Praktik ──
  if (q.includes('ruang') || q.includes('ruangan') || q.includes('lab') || q.includes('laboratorium') || q.includes('bengkel') || q.includes('fasilitas')) {
    let roomList = [];
    try {
      const { rows } = await _dbPool.query("SELECT payload FROM mst_rooms ORDER BY id ASC LIMIT 30");
      roomList = rows.map(r => r.payload?.name || r.payload?.nama).filter(Boolean);
    } catch (e) {}

    if (roomList.length > 0) {
      const formatted = roomList.slice(0, 20).map((rm, i) => `• ${escapeHtml(rm)}`).join('\n');
      await _sendMessage(chatId,
        `🏛️ <b>FASILITAS RUANGAN, LAB & BENGKEL</b>\n\n` +
        `Total terdata: <b>${roomList.length} ruangan/fasilitas</b>:\n\n` +
        formatted + (roomList.length > 20 ? `\n<i>...dan ${roomList.length - 20} ruangan lainnya.</i>` : '') + `\n\n` +
        `💡 <i>Pengaturan kapasitas dan jadwal penggunaan ruangan dapat diakses di menu <b>Fasilitas & Ruangan</b> pada aplikasi web.</i>`,
        { isHtml: true }
      );
    } else {
      await _sendMessage(chatId,
        `🏛️ <b>FASILITAS RUANGAN & BENGKEL</b>\n\n` +
        `Sistem Kurmon mencakup pengelolaan denah gedung, ruang kelas teori, laboratorium komputer, dan bengkel praktik kejuruan pada menu <b>Administrasi > Fasilitas & Ruangan</b>.`,
        { isHtml: true }
      );
    }
    return;
  }

  // ── 7. Guru Piket & Pos Kedisiplinan ──
  if (q.includes('piket') || q.includes('guru piket') || q.includes('pos piket') || q.includes('tugas piket')) {
    await _sendMessage(chatId,
      `📋 <b>SISTEM GURU PIKET & POS KEDISIPLINAN</b>\n\n` +
      `• <b>Fungsi Pos Piket Digital:</b>\n` +
      `  1. Scan barcode/QR kartu pelajar siswa yang datang terlambat.\n` +
      `  2. Otomatisasi pencatatan poin pelanggaran keterlambatan & cetak surat izin masuk kelas.\n` +
      `  3. Pencatatan tamu sekolah, izin keluar gerbang, dan rekap penertiban atribut seragam.\n\n` +
      `• <b>Cara Akses Pos Piket:</b>\n` +
      `  Guru yang bertugas dapat login ke web Kurmon > menu <b>Kedisiplinan > Pos Piket</b>.\n\n` +
      `💡 <i>Ketik <code>/terlambat</code> untuk melihat siapa saja siswa & guru yang tercatat terlambat hari ini.</i>`,
      { isHtml: true }
    );
    return;
  }

  // ── 8. Surat Izin, Sakit & Dispensasi Siswa Hari Ini ──
  if (q.includes('izin') || q.includes('sakit') || q.includes('dispen') || q.includes('dispensasi') || q.includes('surat izin')) {
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' });
    try {
      const { rows } = await _dbPool.query(`
        SELECT a.siswa_nis, a.status, a.keterangan,
               COALESCE(ms.payload->>'name', ms.payload->>'nama', a.siswa_nis) as student_name,
               COALESCE(ms.payload->>'class_name', ms.payload->>'kelas', '-') as class_name
        FROM kedisiplinan_absensi a
        LEFT JOIN mst_students ms ON ms.payload->>'nis' = a.siswa_nis OR ms.payload->>'code' = a.siswa_nis
        WHERE a.tanggal::date = $1::date
        ORDER BY class_name ASC, student_name ASC
      `, [today]);

      if (rows.length > 0) {
        let msg = `📝 <b>DAFTAR SISWA IZIN / SAKIT / DISPENSASI HARI INI</b>\n📅 <i>${today}</i>\n\n`;
        rows.slice(0, 25).forEach((r, idx) => {
          const icon = r.status?.toLowerCase().includes('sakit') ? '💊' : (r.status?.toLowerCase().includes('dispen') ? '🎟️' : '📩');
          msg += `${idx + 1}. ${icon} <b>${escapeHtml(r.student_name)}</b> (${escapeHtml(r.class_name)})\n   Status: <b>${escapeHtml(r.status)}</b>${r.keterangan ? ` — <i>${escapeHtml(r.keterangan)}</i>` : ''}\n`;
        });
        if (rows.length > 25) msg += `\n<i>...dan ${rows.length - 25} siswa lainnya.</i>`;
        await _sendMessage(chatId, msg, { isHtml: true });
        return;
      }
    } catch (e) {
      console.warn('[TelegramBot] Query izin/sakit hari ini error:', e.message);
    }

    await _sendMessage(chatId,
      `📝 <b>SURAT IZIN, SAKIT & DISPENSASI SISWA</b>\n\n` +
      `Belum ada data surat izin atau sakit yang diinput untuk hari ini.\n\n` +
      `💡 <i>Wali Kelas atau Petugas Piket dapat menginput surat izin/sakit melalui menu <b>Kedisiplinan > Izin & Sakit</b> di web Kurmon.</i>`,
      { isHtml: true }
    );
    return;
  }

  // ── 9. Keterlambatan Real-Time ──
  if (q.includes('terlambat') || q.includes('telat') || q.includes('siapa telat') || q.includes('siapa terlambat')) {
    const isGuru = /guru|karyawan|staff/i.test(q);
    const isSiswa = /siswa|murid|anak/i.test(q);
    const filterType = isGuru ? 'guru' : (isSiswa ? 'siswa' : 'all');
    await _cmdTerlambat(chatId, null, filterType);
    return;
  }

  // ── 10. Presensi Guru & Karyawan ──
  if (q.includes('absen guru') || q.includes('presensi guru') || q.includes('guru hadir') || q.includes('guru yang hadir') || q.includes('guru belum absen')) {
    await _cmdAbsenGuru(chatId);
    return;
  }

  // ── 11. Presensi Global & Laporan Kehadiran ──
  if (q.includes('rekap') || q.includes('presensi') || q.includes('kehadiran') || q.includes('siapa hadir') || q.includes('berapa hadir') || q.includes('siapa alpa') || q.includes('siapa bolos')) {
    await sendDailyMorningAttendanceReport(chatId);
    return;
  }

  // ── 12. Cari Siswa Langsung ──
  const cariSiswaMatch = q.match(/^(?:cari\s+siswa|siswa\s+bernama|data\s+siswa|profil\s+siswa|nis|cek\s+siswa)\s+(.+)$/i);
  if (cariSiswaMatch) {
    await _cmdCariSiswa(chatId, cariSiswaMatch[1].trim());
    return;
  }

  // ── 13. Cari Guru Langsung ──
  const cariGuruMatch = q.match(/^(?:cari\s+guru|guru\s+bernama|data\s+guru|profil\s+guru|kontak\s+guru|nip|cek\s+guru)\s+(.+)$/i);
  if (cariGuruMatch) {
    await _cmdCariGuru(chatId, cariGuruMatch[1].trim());
    return;
  }

  // ── 14. Hitung Total Data (Siswa, Guru, Kelas, Mesin) ──
  if (q.includes('berapa siswa') || q.includes('jumlah siswa') || q.includes('total siswa')) {
    const { rows } = await _dbPool.query('SELECT COUNT(*) as cnt FROM mst_students');
    await _sendMessage(chatId,
      `🎓 <b>Statistik Siswa Kurmon</b>\n\n` +
      `• Total Siswa Terdaftar: <b>${rows[0].cnt} siswa</b>.\n\n` +
      `💡 <i>Ketik <code>/kelas</code> untuk melihat rekap per rombel atau <code>/siswa [nama]</code> untuk mencari profil siswa.</i>`,
      { isHtml: true }
    );
    return;
  }

  if (q.includes('berapa guru') || q.includes('jumlah guru') || q.includes('total guru')) {
    const { rows } = await _dbPool.query('SELECT COUNT(*) as cnt FROM mst_teachers');
    await _sendMessage(chatId,
      `👨‍🏫 <b>Statistik Guru Kurmon</b>\n\n` +
      `• Total Guru Terdaftar: <b>${rows[0].cnt} guru</b>.\n\n` +
      `💡 <i>Ketik <code>/absen_guru</code> untuk melihat presensi guru hari ini atau <code>/guru [nama]</code> untuk mencari kontak guru.</i>`,
      { isHtml: true }
    );
    return;
  }

  if (q.includes('berapa kelas') || q.includes('jumlah kelas') || q.includes('total kelas') || q.includes('daftar kelas')) {
    await _cmdDaftarKelas(chatId);
    return;
  }

  // ── 15. Password / Akun / Login ──
  if (q.includes('password') || q.includes('kata sandi') || q.includes('login') || q.includes('masuk akun') || q.includes('lupa password') || q.includes('akun admin') || q.includes('admin123')) {
    await _sendMessage(chatId,
      `🔐 <b>PANDUAN LOGIN & AKUN KURMON</b>\n\n` +
      `• <b>Akun Admin Default:</b>\n` +
      `  - Username: <code>admin</code> atau <code>masadmin</code>\n` +
      `  - Password Default: <code>admin123</code>\n\n` +
      `• <b>Cara Mengganti Password:</b>\n` +
      `  1. Login ke web Kurmon > buka menu <b>Pengaturan > Keamanan Akun</b>.\n` +
      `  2. Masukkan password lama dan tentukan password baru yang kuat.\n\n` +
      `• <b>Sistem Proteksi & Auto-Logout:</b>\n` +
      `  Sesi akan otomatis kedaluwarsa setelah 8 jam inaktif, disertai banner peringatan 5 menit sebelumnya.\n\n` +
      `• <b>Tingkatan Hak Akses (Role):</b>\n` +
      `  Superadmin, Admin, Kepala Sekolah, Waka, Guru Mapel, Wali Kelas, Guru Piket, BP/BK, dan Siswa memiliki menu tersendiri.`,
      { isHtml: true }
    );
    return;
  }

  // ── 16. Kenapa Absensi Kosong / Dashboard 0 ──
  if (q.includes('kenapa kosong') || q.includes('absensi kosong') || q.includes('tidak ada yang absen') || q.includes('log tidak muncul') || q.includes('absen tidak masuk') || q.includes('dashboard kosong')) {
    await _sendMessage(chatId,
      `🔍 <b>KENAPA LOG ABSENSI KOSONG / BELUM MUNCUL?</b>\n\n` +
      `Berikut 4 penyebab paling umum dan solusinya:\n\n` +
      `1. <b>Hari Libur / Akhir Pekan (Minggu):</b>\n` +
      `   Dashboard utama memfilter data <b>khusus hari ini</b>. Jika hari ini libur, angka 0 adalah wajar.\n\n` +
      `2. <b>Mesin Sedang Offline / Kabel Lepas:</b>\n` +
      `   Ketik <code>/mesin</code> untuk mengecek apakah mesin di kampus mengalami timeout atau link antar-kampus terputus.\n\n` +
      `3. <b>Sinkronisasi Belum Berjalan:</b>\n` +
      `   Tarik data sekarang juga dari seluruh mesin dengan mengetik perintah <code>/sync</code>.\n\n` +
      `4. <b>Kartu Belum Didaftarkan:</b>\n` +
      `   Hanya tap kartu yang NIS/NIP-nya sudah terdaftar di Master Data yang akan diproses ke database.`,
      { isHtml: true }
    );
    return;
  }

  // ── 17. Mesin Hikvision & Koneksi Hardware ──
  if (q.includes('setting mesin') || q.includes('tambah mesin') || q.includes('mesin mati') || q.includes('hikvision') || q.includes('koneksi mesin') || q.includes('status mesin') || q.includes('perangkat')) {
    await _cmdStatusMesin(chatId);
    return;
  }

  // ── 18. Sinkronisasi / Tarik Log Manual ──
  if (q.includes('tarik log') || q.includes('tarik absen') || q.includes('sync') || q.includes('sinkron')) {
    await _cmdSync(chatId);
    return;
  }

  // ── 19. Tata Tertib, Poin, SP & Bimbingan Konseling (BP/BK) ──
  if (q.includes('poin') || q.includes('pelanggaran') || q.includes('tata tertib') || q.includes('sp') || q.includes('surat peringatan') || q.includes('skor kredit') || q.includes('bk') || q.includes('bpbk') || q.includes('konseling') || q.includes('home visit')) {
    await _sendMessage(chatId,
      `🚨 <b>SISTEM SKOR KREDIT, SP & BIMBINGAN KONSELING</b>\n\n` +
      `Kurmon menerapkan sistem akumulasi poin pelanggaran terintegrasi:\n\n` +
      `• <b>Tingkatan Surat Peringatan:</b>\n` +
      `  🟡 <b>SP-1 (Teguran):</b> Akumulasi <b>≥ 15 Poin</b>\n` +
      `  🟠 <b>SP-2 (Peringatan):</b> Akumulasi <b>≥ 30 Poin</b>\n` +
      `  🔴 <b>SP-3 (Panggilan Orang Tua):</b> Akumulasi <b>≥ 50 Poin</b>\n\n` +
      `• <b>Alur Penanganan BK:</b>\n` +
      `  - Guru BK dapat menjadwalkan konseling individu/kelompok dan mencatat rekam Home Visit di menu <b>Bimbingan Konseling</b>.\n` +
      `  - Cetak otomatis surat panggilan resmi orang tua ber-barcode.\n\n` +
      `💡 <i>Ketik <code>/pelanggaran</code> untuk melihat top 5 siswa dengan poin pelanggaran tertinggi saat ini.</i>`,
      { isHtml: true }
    );
    return;
  }

  // ── 20. Prestasi Siswa ──
  if (q.includes('prestasi') || q.includes('juara') || q.includes('lomba') || q.includes('kejuaraan') || q.includes('penghargaan') || q.includes('reward')) {
    await _cmdPrestasi(chatId);
    return;
  }

  // ── 21. Praktik Kerja Lapangan (PKL) ──
  if (q.includes('pkl') || q.includes('prakerin') || q.includes('magang') || q.includes('logbook') || q.includes('dudi') || q.includes('industri')) {
    await _cmdPkl(chatId);
    return;
  }

  // ── 22. Jurnal Guru & Modul Ajar ──
  if (q.includes('jurnal') || q.includes('modul ajar') || q.includes('kbm') || q.includes('materi') || q.includes('rpp') || q.includes('silabus') || q.includes('kurikulum merdeka')) {
    await _sendMessage(chatId,
      `📖 <b>JURNAL MENGAJAR GURU & MODUL AJAR</b>\n\n` +
      `• <b>Cara Isi Jurnal Guru:</b>\n` +
      `  1. Login sebagai Guru > buka menu <b>Jurnal Harian Guru</b>.\n` +
      `  2. Pilih tanggal, rombel kelas, jam pelajaran ke-, dan mata pelajaran.\n` +
      `  3. Catat materi ajar & tandai siswa yang absen (Alpa/Izin/Sakit).\n` +
      `  4. Simpan jurnal. Kehadiran otomatis tersinkronisasi ke rekap kurikulum.\n\n` +
      `• <b>Modul Ajar / RPP Digital:</b>\n` +
      `  Guru dapat mengunggah modul ajar berformat PDF/Doc untuk diverifikasi oleh Waka Kurikulum.`,
      { isHtml: true }
    );
    return;
  }

  // ── 23. Kartu Pelajar Digital ──
  if (q.includes('kartu') || q.includes('kartu pelajar') || q.includes('cetak kartu') || q.includes('qr code') || q.includes('barcode')) {
    await _sendMessage(chatId,
      `🪪 <b>KARTU PELAJAR DIGITAL BER-QR CODE TOKEN</b>\n\n` +
      `• <b>Fitur Keamanan:</b>\n` +
      `  - Menggunakan <b>Token HMAC SHA-256</b> anti-pemalsuan.\n` +
      `  - Generator Cetak Massal PDF: Format pas 8 kartu per lembar A4 siap potong/laminasi.\n\n` +
      `• <b>Cara Cetak:</b>\n` +
      `  Buka menu <b>Administrasi > Kartu Pelajar</b> > pilih kelas > klik <b>Cetak Kartu Terpilih (PDF)</b>.`,
      { isHtml: true }
    );
    return;
  }

  // ── 24. WhatsApp Gateway ──
  if (q.includes('whatsapp') || q.includes('wa') || q.includes('fonnte') || q.includes('notif wa') || q.includes('broadcast')) {
    await _cmdStatusWa(chatId);
    return;
  }

  // ── 25. Backup & Database ──
  if (q.includes('backup') || q.includes('cadangan') || q.includes('restore') || q.includes('database') || q.includes('db')) {
    await _cmdStatusDb(chatId);
    return;
  }

  // ── 26. Akses HP / Jaringan Lokal ──
  if (q.includes('buka di hp') || q.includes('akses hp') || q.includes('wifi') || q.includes('jaringan') || q.includes('ip address') || q.includes('port')) {
    await _sendMessage(chatId,
      `📱 <b>CARA MEMBUKA APLIKASI DI HP (WIFI / LAN)</b>\n\n` +
      `1. Sambungkan HP ke jaringan WiFi sekolah yang sama dengan server.\n` +
      `2. Buka browser HP (Chrome / Safari), lalu akses URL:\n` +
      `   <code>http://[IP_KOMPUTER_SERVER]:6677</code>\n` +
      `   <i>(Cek IP komputer server dengan mengetik <code>ipconfig</code> di CMD)</i>\n\n` +
      `• <b>Port Aktif:</b> Web (<code>6677</code>), API Server (<code>4174</code>), DB (<code>5432</code>).`,
      { isHtml: true }
    );
    return;
  }

  // ── 27. Auto Search: Cari kecocokan entitas (Siswa, Guru, Kelas, PKL) di Database ──
  try {
    const searchPattern = `%${rawQ.replace(/[%_]/g, '')}%`;

    // Cek siswa
    const stuMatch = await _dbPool.query(`
      SELECT payload FROM mst_students 
      WHERE payload->>'name' ILIKE $1 OR payload->>'nis' ILIKE $1
      LIMIT 1
    `, [searchPattern]);
    if (stuMatch.rows.length > 0) {
      const p = stuMatch.rows[0].payload;
      await _cmdCariSiswa(chatId, p.name || p.nis);
      return;
    }

    // Cek guru
    const teachMatch = await _dbPool.query(`
      SELECT payload FROM mst_teachers 
      WHERE payload->>'name' ILIKE $1 OR payload->>'code' ILIKE $1 OR payload->>'nip' ILIKE $1
      LIMIT 1
    `, [searchPattern]);
    if (teachMatch.rows.length > 0) {
      const p = teachMatch.rows[0].payload;
      await _cmdCariGuru(chatId, p.name || p.code || p.nip);
      return;
    }

    // Cek kelas
    const classMatch = await _dbPool.query(`
      SELECT payload FROM mst_classes 
      WHERE payload->>'name' ILIKE $1
      LIMIT 1
    `, [searchPattern]);
    if (classMatch.rows.length > 0) {
      const cName = classMatch.rows[0].payload?.name;
      await _cmdAbsenPerKelas(chatId, cName);
      return;
    }
  } catch (e) {}

  // ── 28. Fallback Cerdas: Ringkasan Real-Time Sekolah & Solusi ──
  let summaryInfo = '';
  try {
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' });
    const [tapsRes, devsRes] = await Promise.all([
      _dbPool.query("SELECT COUNT(DISTINCT employee_id) as cnt FROM hikvision_logs WHERE timestamp::date = $1::date", [today]),
      _dbPool.query("SELECT COUNT(*) as total, COUNT(CASE WHEN is_active = true THEN 1 END) as active FROM hikvision_devices")
    ]);
    summaryInfo = `\n📊 <b>Status Operasional Hari Ini:</b>\n` +
      `• Presensi Scan Masuk: <b>${tapsRes.rows[0].cnt}</b> orang\n` +
      `• Perangkat Terhubung: <b>${devsRes.rows[0].active}</b> dari ${devsRes.rows[0].total} mesin\n`;
  } catch (e) {}

  await _sendMessage(chatId,
    `🤖 <b>Asisten Cerdas Kurmon</b>\n\n` +
    `Pertanyaan Anda: <i>"${escapeHtml(rawQ)}"</i>\n` +
    summaryInfo + `\n` +
    `💡 <b>Pilihan menu cepat yang dapat Anda ketikkan:</b>\n` +
    `• <code>/absen</code> — Rekap kehadiran siswa & guru hari ini\n` +
    `• <code>/terlambat</code> — Daftar siswa & guru terlambat\n` +
    `• <code>/mesin</code> — Diagnosa status mesin absensi IoT\n` +
    `• <code>/sync</code> — Tarik log mesin absensi saat ini juga\n` +
    `• <code>/siswa [nama]</code> — Cari profil, kelas & poin siswa\n` +
    `• <code>/guru [nama]</code> — Cari kontak & data guru\n` +
    `• <code>/pelanggaran</code> — Rekap poin pelanggaran & status SP\n` +
    `• <code>/prestasi</code> — Catatan prestasi siswa di kesiswaan\n` +
    `• <code>/kelas</code> — Daftar rombel kelas\n` +
    `• <code>/menu</code> — Munculkan tombol navigasi lengkap`,
    { isHtml: true }
  );
}

export function _normalizeClassInput(str) {
  let s = String(str || '').trim().toUpperCase();
  s = s.replace(/^10(?=\s*[^0-9]|$)/, 'X ')
       .replace(/^11(?=\s*[^0-9]|$)/, 'XI ')
       .replace(/^12(?=\s*[^0-9]|$)/, 'XII ')
       .replace(/\s+/g, ' ');
  return s.trim();
}

async function _findMatchingClasses(queryStr) {
  if (!_dbPool) return [];
  const { rows } = await _dbPool.query("SELECT payload FROM mst_classes");
  const allClasses = rows.map(r => typeof r.payload === 'string' ? JSON.parse(r.payload) : r.payload).filter(Boolean);

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

async function _cmdAbsenPerKelas(chatId, classQuery, dateInfo = null) {
  if (!_dbPool) {
    await _sendMessage(chatId, '❌ Database tidak tersedia.');
    return;
  }

  let queryTrimmed = String(classQuery || '').trim();
  if (!dateInfo) {
    const extracted = _parseIndonesianDate(queryTrimmed);
    if (extracted) {
      dateInfo = extracted;
      queryTrimmed = _cleanDateFromText(queryTrimmed);
    }
  }

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
    if (nis && !studentMap.has(nis)) {
      studentMap.set(nis, { nis, name: name || `Siswa ${nis}` });
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

  const isHistorical = !!dateInfo && !dateInfo.isToday;
  const nisList = Array.from(studentMap.keys());
  const today = dateInfo ? dateInfo.isoDate : new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' });
  const todayFormatted = dateInfo ? dateInfo.formatted : new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' });
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

  if (isHistorical && logsRes.rows.length === 0 && permitsRes.rows.length === 0) {
    const headerTime = isHistorical ? '' : ` (${nowTime} WIB)`;
    let emptyMsg = `📊 <b>PRESENSI KELAS: ${escapeHtml(className)}</b>\n`;
    emptyMsg += `📅 <i>${todayFormatted}${headerTime}</i>\n`;
    emptyMsg += `👨‍🏫 <b>Wali Kelas:</b> ${escapeHtml(walasName)}\n\n`;
    emptyMsg += `👥 <b>Total Siswa:</b> ${totalStudents} orang\n\n`;
    emptyMsg += `ℹ️ <i>Tidak ada rekaman log scan presensi ataupun surat izin/sakit pada tanggal ini (hari libur/akhir pekan atau mesin offline).</i>\n`;
    await _sendMessage(chatId, emptyMsg, { isHtml: true });
    return;
  }

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

  await _sendMessage(chatId, msg, { isHtml: true, reply_markup: BACK_TO_MENU_KEYBOARD });
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

  await _sendMessage(chatId, msg, { isHtml: true, reply_markup: BACK_TO_MENU_KEYBOARD });
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

  await _sendMessage(chatId, msg, { isHtml: true, reply_markup: BACK_TO_MENU_KEYBOARD });
}

async function _cmdAbsenGuru(chatId, dateInfo = null) {
  if (!_dbPool) {
    await _sendMessage(chatId, '❌ Database tidak tersedia.');
    return;
  }

  const isHistorical = !!dateInfo && !dateInfo.isToday;
  const today = dateInfo ? dateInfo.isoDate : new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' });
  const todayFormatted = dateInfo ? dateInfo.formatted : new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' });
  const nowTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });

  // 1. Ambil data guru
  const { rows: tRows } = await _dbPool.query("SELECT payload FROM mst_teachers ORDER BY id ASC").catch(() => ({ rows: [] }));
  const teachers = tRows.map(r => r.payload).filter(Boolean);

  if (teachers.length === 0) {
    await _sendMessage(chatId, '📋 Belum ada master data guru.');
    return;
  }

  // 2. Ambil logs presensi
  const { rows: logs } = await _dbPool.query(
    `SELECT employee_id, MIN(timestamp) as first_tap
     FROM hikvision_logs
     WHERE timestamp::date = $1::date
     GROUP BY employee_id`,
    [today]
  ).catch(() => ({ rows: [] }));

  if (isHistorical && logs.length === 0) {
    let emptyMsg = `👨‍🏫 <b>PRESENSI GURU & KARYAWAN</b>\n`;
    emptyMsg += `📅 <i>${todayFormatted}</i>\n\n`;
    emptyMsg += `• Total Guru Terdaftar: <b>${teachers.length}</b> orang\n\n`;
    emptyMsg += `ℹ️ <i>Tidak ada rekaman log scan presensi guru/karyawan pada tanggal ini (hari libur/akhir pekan atau mesin absensi offline).</i>\n`;
    await _sendMessage(chatId, emptyMsg, { isHtml: true });
    return;
  }

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

  const isWeekendHoliday = await _isHolidayOrWeekend(today);
  if (isWeekendHoliday) {
    let msg = isHistorical
      ? `👨‍🏫 <b>PRESENSI GURU & KARYAWAN</b>\n📅 <i>${todayFormatted}</i>\n`
      : `👨‍🏫 <b>PRESENSI GURU HARI INI</b>\n📅 <i>${todayFormatted} (${nowTime} WIB)</i>\n`;
    msg += `🏖️ <b>Status Kalender:</b> Hari Libur / Akhir Pekan\n\n`;
    msg += `• Total Guru Terdaftar: <b>${teachers.length}</b> orang\n`;
    msg += `• Guru Hadir di Sekolah (Ekskul / Kegiatan): <b>${totalHadir}</b> orang\n\n`;
    if (totalHadir > 0) {
      msg += `✨ <b>Daftar Guru Hadir di Sekolah:</b>\n`;
      [...tepatList, ...telatList].forEach((t, i) => {
        msg += `${i + 1}. <b>${escapeHtml(t.name)}</b> (Scan: <code>${t.time}</code> WIB)\n`;
      });
      msg += `\n💡 <i>Kehadiran pada hari libur tidak dikenakan batas keterlambatan.</i>`;
    } else {
      msg += `<i>Tidak ada presensi guru/karyawan di mesin hari ini (hari libur).</i>`;
    }
    await _sendMessage(chatId, msg, { isHtml: true, reply_markup: BACK_TO_MENU_KEYBOARD });
    return;
  }

  let msg = isHistorical
    ? `👨‍🏫 <b>PRESENSI GURU & KARYAWAN</b>\n📅 <i>${todayFormatted}</i>\n\n`
    : `👨‍🏫 <b>PRESENSI GURU HARI INI</b>\n📅 <i>${todayFormatted} (${nowTime} WIB)</i>\n\n`;

  msg += `• Total Guru Terdaftar: <b>${teachers.length}</b> orang\n`;
  msg += `• Hadir Scan: <b>${totalHadir}</b> (${pct}%)\n`;
  msg += `  - Tepat Waktu (&lt;= ${masukLate}): <b>${tepatList.length}</b> orang\n`;
  msg += `  - Terlambat (&gt; ${masukLate}): <b>${telatList.length}</b> orang\n`;
  if (!isHistorical) {
    msg += `• Belum Presensi Scan: <b>${belumList.length}</b> orang\n\n`;
  } else {
    msg += `\n`;
  }

  if (telatList.length > 0) {
    msg += `⏰ <b>Guru Terlambat:</b>\n`;
    telatList.forEach(t => {
      msg += `• ${escapeHtml(t.name)} (<code>${t.time}</code>)\n`;
    });
    msg += `\n`;
  }

  if (belumList.length > 0 && !isHistorical) {
    msg += `❌ <b>Belum Presensi Scan (${belumList.length} guru):</b>\n`;
    const maxShow = 30;
    belumList.slice(0, maxShow).forEach((t, idx) => {
      msg += `${idx + 1}. ${escapeHtml(t.name)}\n`;
    });
    if (belumList.length > maxShow) {
      msg += `<i>...dan ${belumList.length - maxShow} guru lainnya.</i>\n`;
    }
  } else if (belumList.length === 0) {
    msg += `🎉 <i>Seluruh guru telah melakukan presensi scan!</i>\n`;
  }

  await _sendMessage(chatId, msg, { isHtml: true, reply_markup: BACK_TO_MENU_KEYBOARD });
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
 * Kirim Rekap Absensi Siswa & Guru (dijalankan otomatis pk 07:05, via /absen, atau kueri tanggal tertentu)
 * @param {string|null} targetChatId 
 * @param {object|null} dateInfo - Hasil parse _parseIndonesianDate
 */
export async function sendDailyMorningAttendanceReport(targetChatId = null, dateInfo = null) {
  if (!_dbPool) return;
  if (!_initialized) await _loadConfig();
  if (_alertConfig['attendance'] === false && !targetChatId) return; // Ignore if disabled globally unless requested via bot cmd
  const destChatId = targetChatId || _chatId;
  if (!_botToken || !destChatId) return;

  try {
    const isHistorical = !!dateInfo && !dateInfo.isToday;
    const today = dateInfo ? dateInfo.isoDate : new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' });
    const todayFormatted = dateInfo ? dateInfo.formatted : new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' });
    const nowTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });

    // 1. Data log presensi dari hikvision_logs
    const { rows: todayLogs } = await _dbPool.query(`
      SELECT employee_id, person_type, timestamp
      FROM hikvision_logs
      WHERE timestamp::date = $1::date
      ORDER BY timestamp ASC
    `, [today]).catch((e) => { console.error('[TelegramBot] Query Absensi Error:', e.message); return { rows: [] }; });

    // Ambil rekap surat izin / sakit / dispensasi siswa
    const { rows: suratRows } = await _dbPool.query(`
      SELECT status, COUNT(*) as cnt FROM kedisiplinan_absensi 
      WHERE tanggal::date = $1::date GROUP BY status
    `, [today]).catch(() => ({ rows: [] }));

    if (isHistorical && todayLogs.length === 0 && suratRows.length === 0) {
      let emptyMsg = `📋 <b>REKAP PRESENSI HARIAN</b>\n` +
        `📅 <i>${todayFormatted}</i>\n\n` +
        `ℹ️ <i>Tidak ada rekaman data scan presensi mesin ataupun surat izin/sakit pada tanggal ini (kemungkinan hari libur / akhir pekan).</i>\n`;
      await _sendMessage(destChatId, emptyMsg, { isHtml: true });
      return;
    }

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

    const isWeekendHoliday = await _isHolidayOrWeekend(today);
    if (isWeekendHoliday) {
      const reportTitle = isHistorical ? 'REKAP LAPORAN PRESENSI' : 'LAPORAN KEHADIRAN (HARI LIBUR / AKHIR PEKAN)';
      const reportTime = isHistorical ? '' : ` (Pukul ${nowTime} WIB)`;
      let msg = 
`📋 <b>${reportTitle}</b>
📅 <i>${todayFormatted}${reportTime}</i>

🏖️ <b>Status Kalender:</b> Hari Libur / Akhir Pekan

👨‍🏫 <b>GURU & KARYAWAN HADIR:</b> <b>${teacherTaps.size}</b> orang
🎓 <b>SISWA HADIR DI SEKOLAH:</b> <b>${studentTaps.size}</b> siswa (Ekskul / Pembinaan)

`;
      if (teacherTaps.size === 0 && studentTaps.size === 0) {
        msg += `<i>Tidak ada aktivitas scan kehadiran di mesin hari ini (sekolah libur).</i>\n`;
      } else {
        msg += `✨ <i>Seluruh siswa & guru yang scan hari ini tercatat hadir di sekolah dan tidak dihitung terlambat.</i>\n`;
      }

      await _sendMessage(destChatId, msg, { isHtml: true, reply_markup: BACK_TO_MENU_KEYBOARD });
      return;
    }

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

    let siswaIzin = 0, siswaSakit = 0, siswaDispen = 0;
    suratRows.forEach(sr => {
      const st = String(sr.status || '').toLowerCase();
      if (st.includes('izin')) siswaIzin += parseInt(sr.cnt, 10);
      else if (st.includes('sakit')) siswaSakit += parseInt(sr.cnt, 10);
      else if (st.includes('dispen')) siswaDispen += parseInt(sr.cnt, 10);
    });

    const reportTitle = isHistorical ? 'REKAP LAPORAN PRESENSI' : 'LAPORAN KEHADIRAN PAGI';
    const reportTime = isHistorical ? '' : ` (Pukul ${nowTime} WIB)`;

    const msg = 
`📋 <b>${reportTitle}</b>
📅 <i>${todayFormatted}${reportTime}</i>

👨‍🏫 <b>GURU & KARYAWAN</b>
• Hadir Tepat Waktu: <b>${guruTepat}</b> orang
• Terlambat: <b>${guruTelat}</b> orang
• Sudah Presensi Scan: <b>${teacherTaps.size}</b> dari ${totalGuruMaster} orang
` + (!isHistorical ? `• Belum Terdata Scan: <b>${guruBelum}</b> orang\n\n` : `\n`) +
`🎓 <b>PRESENSI SISWA</b>
• Hadir Tepat Waktu: <b>${siswaTepat}</b> siswa
• Terlambat: <b>${siswaTelat}</b> siswa
• Izin / Sakit: <b>${siswaIzin + siswaSakit + siswaDispen}</b> siswa (Izin: ${siswaIzin}, Sakit: ${siswaSakit})
• Total Tap Mesin: <b>${studentTaps.size}</b> dari ${totalStudentMaster} siswa
` + (!isHistorical ? `• Belum Absen: <b>${siswaBelum}</b> siswa\n\n` : `\n`) +
`<i>Laporan presensi sistem Kurmon.</i>

💡 <b>Perintah Tambahan:</b>
• <code>/absen [nama_kelas]</code> — Detail presensi per kelas
• <code>/rekap_kelas</code> — Ringkasan kehadiran per kelas
• <code>/absen_guru</code> — Detail presensi guru & karyawan
• <code>/terlambat</code> — Rekap keterlambatan siswa & guru`;

    await _sendMessage(destChatId, msg, { isHtml: true, reply_markup: BACK_TO_MENU_KEYBOARD });
  } catch (err) {
    console.error('[TelegramBot] Gagal kirim laporan kehadiran:', err.message);
  }
}

// ── HTTP Handler ─────────────────────────────────────────

export async function handleTelegramBotRoutes(req, res, url, ctx) {
  const { send, requireAuthenticated, normalizeServerRole, readJsonBody, getRawBody } = ctx;

  // ── Webhook Handler (Menerima update dari Telegram jika mode webhook diaktifkan) ──
  if (req.method === 'POST' && (url.pathname === '/api/telegram-bot/webhook' || url.pathname.startsWith('/api/telegram-bot/webhook/'))) {
    let body;
    try {
      if (typeof readJsonBody === 'function') {
        body = await readJsonBody(req);
      } else if (typeof getRawBody === 'function') {
        const raw = await getRawBody(req);
        body = typeof raw === 'string' ? JSON.parse(raw) : raw;
      }
    } catch(e) {
      send(req, res, 400, { ok: false, error: 'Invalid JSON' });
      return true;
    }

    if (body && typeof body === 'object') {
      _handleUpdate(body).catch(err => console.warn('[TelegramBot Webhook] handleUpdate error:', err.message));
    }
    send(req, res, 200, { ok: true });
    return true;
  }

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
         ORDER BY CASE WHEN service_name = 'telegram_backup' THEN 1 WHEN service_name = 'telegram_bot_monitor' THEN 2 ELSE 3 END
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
        // Sinkronkan ke allowed_chat_ids agar selalu diizinkan
        existingCfg.allowed_chat_ids = Array.from(new Set([...(existingCfg.allowed_chat_ids || []), existingCfg.chat_id]));
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
        data: {
          isRunning: _isRunning,
          hasBotToken: !!_botToken,
          botTokenMasked: _botToken ? (_botToken.substring(0, 8) + '...' + _botToken.slice(-4)) : '',
          chatId: _chatId || '',
          hasChatId: !!_chatId,
          alertConfig: _alertConfig,
          uptime: Math.floor((Date.now() - _startTime) / 1000),
        },
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

/**
 * Kirim pesan ke Telegram dengan auto-split untuk pesan > 4000 karakter,
 * fallback plain-text otomatis jika format HTML ditolak, dan timeout proteksi
 */
async function _sendMessage(chatId, text, options = {}) {
  if (!_botToken || !chatId || text === null || text === undefined) return;
  const str = String(text);
  if (!str.trim()) return;

  // Batas maksimal Telegram adalah 4096 karakter per pesan.
  // Jika lebih panjang, potong per baris agar tidak ditolak oleh Telegram (Error 400 MESSAGE_TOO_LONG)
  const MAX_CHUNK = 3800;
  if (str.length > MAX_CHUNK) {
    const lines = str.split('\n');
    let chunk = '';
    for (const line of lines) {
      if ((chunk + '\n' + line).length > MAX_CHUNK) {
        if (chunk) await _sendSingleMessage(chatId, chunk, { ...options, reply_markup: undefined });
        chunk = line;
      } else {
        chunk = chunk ? (chunk + '\n' + line) : line;
      }
    }
    if (chunk) {
      return await _sendSingleMessage(chatId, chunk, options);
    }
    return;
  }

  return await _sendSingleMessage(chatId, str, options);
}

async function _sendSingleMessage(chatId, text, options = {}) {
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
      signal: AbortSignal.timeout(15_000)
    });
    const d = await r.json();
    if (d.ok) return d;

    // Jika ditolak karena tag HTML rusak / can't parse entities, kirim sebagai Plain Text tanpa parse_mode
    console.warn('[TelegramBot] sendMessage HTML gagal:', d.description, 'Mencoba fallback plain text...');
    const cleanPlainText = text.replace(/<[^>]*>/g, '').trim() || text;
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
      signal: AbortSignal.timeout(15_000)
    });
    const retryData = await retryRes.json();
    if (retryData.ok) return retryData;
    console.warn('[TelegramBot] sendMessage fallback plain text gagal:', retryData.description);
    return retryData;
  } catch (err) {
    console.error('[TelegramBot] network error saat kirim pesan:', err.message);
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
