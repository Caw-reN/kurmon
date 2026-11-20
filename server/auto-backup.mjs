import { exec } from "child_process";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import zlib from "zlib";
import cron from "node-cron";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars
dotenv.config({ path: path.join(__dirname, "../.env") });

const PG_USER = process.env.PG_USER || "postgres";
const PG_PASSWORD = process.env.PG_PASSWORD || "";
const PG_DATABASE = process.env.PG_DATABASE || "school_system_db";
const PG_HOST = process.env.PG_HOST || "127.0.0.1";
const PG_PORT = process.env.PG_PORT || "5432";

export const BACKUP_DIR = path.join(__dirname, "backups");

// Ensure backup dir exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

let _dbPool = null;

/**
 * Set database pool (dipanggil dari auth-server.mjs setelah pool siap)
 */
export function setBackupDbPool(pool) {
  _dbPool = pool;
}

/**
 * Helper: format bytes ke string yang mudah dibaca
 */
function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

// Kolom sensitif yang di-strip sebelum ditulis ke file backup
const SENSITIVE_COLUMNS = ["password", "password_hash", "hashed_password", "pin", "secret"];

/**
 * Strip kolom sensitif dari satu row object
 */
function stripRow(row) {
  const clean = { ...row };
  for (const col of SENSITIVE_COLUMNS) {
    if (col in clean) delete clean[col];
  }
  return clean;
}

/**
 * Buat backup JSON terkompresi GZIP dari semua tabel menggunakan STREAMING ke disk.
 * Tidak memuat seluruh database ke memory — setiap tabel di-cursor 100 baris
 * sekaligus dan langsung di-compress melalui zlib ke file .json.gz.
 * Menghasilkan penghematan ruang hingga >90% dan membatasi retensi server ke 3 backup terbaru.
 *
 * @returns {{ fileName, filePath, size, sizeBytes, checksum }}
 */
export async function runBackupJson() {
  if (!_dbPool) throw new Error("Database pool belum diinisialisasi.");

  const dateStr = new Date().toISOString().replace(/[:.]/g, "-");
  const fileName = `backup_${PG_DATABASE}_${dateStr}.json.gz`;
  const filePath = path.join(BACKUP_DIR, fileName);

  console.log(`[AutoBackup] 📦 Streaming compressed backup JSON.GZ: ${fileName}...`);

  // Ambil semua tabel dari public schema
  const tblResult = await _dbPool.query(
    "SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public' ORDER BY tablename ASC"
  );
  const tables = tblResult.rows.map((r) => r.tablename);

  const hashStream = crypto.createHash("sha256");
  const gzipStream = zlib.createGzip({ level: 9 });
  const writeStream = fs.createWriteStream(filePath);

  gzipStream.on("data", (chunk) => hashStream.update(chunk));
  gzipStream.pipe(writeStream);

  function write(str) {
    gzipStream.write(str);
  }

  const waitFinish = () =>
    new Promise((resolve, reject) => {
      writeStream.on("finish", resolve);
      writeStream.on("error", reject);
      gzipStream.on("error", reject);
    });

  // Tulis header meta
  const meta = JSON.stringify({
    generatedAt: new Date().toISOString(),
    database: PG_DATABASE,
    tables: tables.length,
    compression: "gzip"
  });
  write(`{"_meta":${meta}`);

  const CURSOR_BATCH = 100; // baris per fetch agar heap tetap rendah

  for (const table of tables) {
    write(`,"${table}":[`);
    let firstRow = true;
    try {
      const client = await _dbPool.connect();
      try {
        await client.query("BEGIN");
        const cursorName = `cur_${table.replace(/[^a-z0-9_]/gi, "_")}`;
        await client.query(`DECLARE ${cursorName} CURSOR FOR SELECT * FROM "${table}"`);

        while (true) {
          const { rows } = await client.query(`FETCH ${CURSOR_BATCH} FROM ${cursorName}`);
          if (rows.length === 0) break;
          for (const row of rows) {
            if (!firstRow) write(",");
            write(JSON.stringify(stripRow(row)));
            firstRow = false;
          }
        }

        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK").catch(() => {});
        console.warn(`[AutoBackup] Skip tabel ${table}:`, err.message);
      } finally {
        client.release();
      }
    } catch (connErr) {
      console.warn(`[AutoBackup] Koneksi gagal untuk ${table}:`, connErr.message);
    }
    write("]");
  }

  write("}");
  gzipStream.end();
  await waitFinish();

  const checksum = hashStream.digest("hex");
  const stat = fs.statSync(filePath);
  const size = formatBytes(stat.size);

  console.log(`[AutoBackup] ✅ Backup selesai: ${fileName} (${size})`);
  console.log(`[AutoBackup] 🔑 SHA-256: ${checksum}`);

  // Otomatis bersihkan cadangan lama sehingga server HANYA menyimpan 3 cadangan terbaru
  pruneOldBackups(3);

  return { fileName, filePath, size, sizeBytes: stat.size, checksum };
}

/**
 * Runs a pg_dump to backup the database (SQL format — untuk restore via psql)
 */
export async function runBackup() {
  const dateStr = new Date().toISOString().replace(/[:.]/g, "-");
  const fileName = `backup_${PG_DATABASE}_${dateStr}.sql`;
  const filePath = path.join(BACKUP_DIR, fileName);

  const dumpCmd = `pg_dump -U ${PG_USER} -h ${PG_HOST} -p ${PG_PORT} -d ${PG_DATABASE} -F c -f "${filePath}"`;

  console.log(`[AutoBackup] Starting SQL backup: ${fileName}...`);

  return new Promise((resolve, reject) => {
    exec(dumpCmd, { env: { ...process.env, PGPASSWORD: PG_PASSWORD } }, (error, stdout, stderr) => {
      if (error) {
        console.error(`[AutoBackup] Error creating backup: ${error.message}`);
        return reject(error);
      }
      if (stderr) console.log(`[AutoBackup] pg_dump stderr: ${stderr}`);
      console.log(`[AutoBackup] ✅ SQL Backup created: ${filePath}`);
      pruneOldBackups(3);
      resolve(filePath);
    });
  });
}

/**
 * Otomatis menghapus file backup lama pada folder server/backups.
 * Menjamin maksimal HANYA 3 backup terbaru yang dipertahankan di server disk.
 */
export function pruneOldBackups(maxKeep = 3) {
  try {
    if (!fs.existsSync(BACKUP_DIR)) return;
    const entries = fs.readdirSync(BACKUP_DIR)
      .filter((file) => {
        const lower = file.toLowerCase();
        return (lower.startsWith('backup_') || lower.startsWith('backup-')) &&
               (lower.endsWith('.json.gz') || lower.endsWith('.gz') || lower.endsWith('.json') || lower.endsWith('.sql'));
      })
      .map((file) => {
        const fp = path.join(BACKUP_DIR, file);
        try {
          const stat = fs.statSync(fp);
          return { file, fp, mtime: stat.mtime.getTime() };
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .sort((a, b) => b.mtime - a.mtime); // Terkini di depan

    if (entries.length > maxKeep) {
      const toDelete = entries.slice(maxKeep);
      for (const item of toDelete) {
        try {
          fs.unlinkSync(item.fp);
          console.log(`[AutoBackup] 🗑️  Backup lama otomatis dihapus (retensi max ${maxKeep}): ${item.file}`);
        } catch (delErr) {
          console.warn(`[AutoBackup] Gagal menghapus backup lama ${item.file}:`, delErr.message);
        }
      }
    }
  } catch (err) {
    console.warn("[AutoBackup] pruneOldBackups error:", err.message);
  }
}

/**
 * Backward-compatible helper untuk penghapusan cadangan lama
 */
export function cleanOldBackups(keepDays = 7) {
  pruneOldBackups(3);
}

/**
 * Ambil konfigurasi kredensial Telegram (Bot Token & Chat ID)
 * dari database api_keys atau fallback environment variables.
 */
export async function getTelegramCredentials(pool = _dbPool) {
  if (pool) {
    try {
      const { rows } = await pool.query(
        `SELECT service_name, api_key, extra_config FROM api_keys 
         WHERE (service_name = 'telegram_backup' OR service_name = 'telegram_bot_monitor' OR service_name LIKE 'telegram%') 
         AND is_active = true 
         ORDER BY CASE WHEN service_name = 'telegram_backup' THEN 1 WHEN service_name = 'telegram_bot_monitor' THEN 2 ELSE 3 END 
         LIMIT 1`
      );
      if (rows.length > 0 && rows[0].api_key) {
        const botToken = rows[0].api_key.trim();
        let cfg = {};
        try {
          cfg = typeof rows[0].extra_config === 'string' && rows[0].extra_config.trim().startsWith('{')
            ? JSON.parse(rows[0].extra_config)
            : (typeof rows[0].extra_config === 'object' && rows[0].extra_config !== null ? rows[0].extra_config : {});
        } catch {}
        const chatId = cfg?.chat_id ? String(cfg.chat_id).trim() : null;
        if (botToken && chatId) {
          return { botToken, chatId, serviceName: rows[0].service_name };
        }
      }
    } catch (err) {
      console.warn('[AutoBackup] Error fetching Telegram credentials from DB:', err.message);
    }
  }

  // Fallback ke environment variables jika ada
  if (process.env.TELEGRAM_BOT_TOKEN && (process.env.TELEGRAM_CHAT_ID || process.env.TELEGRAM_BACKUP_CHAT_ID)) {
    return {
      botToken: process.env.TELEGRAM_BOT_TOKEN.trim(),
      chatId: String(process.env.TELEGRAM_BACKUP_CHAT_ID || process.env.TELEGRAM_CHAT_ID).trim(),
      serviceName: 'env'
    };
  }

  return null;
}

/**
 * Mengirimkan berkas cadangan database ke Telegram melalui endpoint sendDocument (multipart/form-data)
 */
export async function sendTelegramBackupFile({
  filePath,
  fileName,
  size,
  checksum,
  botToken,
  chatId,
  captionTitle = "Backup Database Kurmon"
}) {
  if (!botToken || !chatId) {
    throw new Error("Telegram Bot Token dan Chat ID belum dikonfigurasi.");
  }
  if (!fs.existsSync(filePath)) {
    throw new Error(`Berkas cadangan ${filePath} tidak ditemukan.`);
  }

  const fileBuffer = fs.readFileSync(filePath);
  const boundary = "----KurmonBackupBoundary" + Date.now().toString(16);
  const nowStr = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
  const captionText =
    `📦 <b>${captionTitle}</b>\n\n` +
    `📅 <b>Waktu:</b> ${nowStr} WIB\n` +
    `🗂 <b>Nama File:</b> <code>${fileName}</code>\n` +
    `💾 <b>Ukuran:</b> <b>${size}</b> (Terkompresi GZIP)\n` +
    `🔑 <b>SHA-256:</b> <code>${checksum ? checksum.slice(0, 16) + '...' : '-'}</code>\n\n` +
    `<i>Cadangan database terkompresi GZIP (.json.gz) berhasil dibuat & disimpan dengan retensi rolling 3 cadangan di server.</i>`;

  const multipartHeader = Buffer.from(
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="chat_id"\r\n\r\n${chatId}\r\n` +
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="caption"\r\n\r\n${captionText}\r\n` +
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="parse_mode"\r\n\r\nHTML\r\n` +
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="document"; filename="${fileName}"\r\n` +
    `Content-Type: application/gzip\r\n\r\n`,
    "utf-8"
  );
  const multipartFooter = Buffer.from(`\r\n--${boundary}--\r\n`, "utf-8");
  const finalBody = Buffer.concat([multipartHeader, fileBuffer, multipartFooter]);

  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendDocument`, {
    method: "POST",
    headers: { "Content-Type": `multipart/form-data; boundary=${boundary}` },
    body: finalBody,
    signal: AbortSignal.timeout(120_000)
  });

  const resJson = await response.json();
  if (!resJson.ok) {
    throw new Error(resJson.description || "Gagal mengirim berkas dokumen ke Telegram");
  }

  return resJson;
}

/**
 * Baca jadwal dari database (opsional, fallback ke jam 2 pagi)
 */
async function getScheduleConfig() {
  const defaults = { hour: 2, enabled: true, keepDays: 7, sendToTelegram: false };
  if (!_dbPool) return defaults;
  try {
    const { rows } = await _dbPool.query(
      "SELECT data FROM app_data WHERE store_key = 'backup_schedule' LIMIT 1"
    );
    if (rows.length > 0) {
      const parsed = typeof rows[0].data === 'string' ? JSON.parse(rows[0].data) : rows[0].data;
      return { ...defaults, ...parsed };
    }
  } catch {}
  return defaults;
}

/**
 * Jalankan backup otomatis: GZIP JSON + kirim berkas Telegram
 */
export async function runAutoBackup() {
  const config = await getScheduleConfig();
  if (!config.enabled) {
    console.log("[AutoBackup] ⏸  Backup otomatis dinonaktifkan dari pengaturan.");
    return;
  }

  let result = null;
  let error = null;

  try {
    result = await runBackupJson();
    pruneOldBackups(3);
  } catch (err) {
    error = err;
    console.error("[AutoBackup] ❌ Auto-backup gagal:", err.message);
  }

  // Kirim berkas cadangan ke Telegram jika dikonfigurasi
  if (result) {
    try {
      const creds = await getTelegramCredentials(_dbPool);
      if (creds && creds.botToken && creds.chatId) {
        await sendTelegramBackupFile({
          filePath: result.filePath,
          fileName: result.fileName,
          size: result.size,
          checksum: result.checksum,
          botToken: creds.botToken,
          chatId: creds.chatId,
          captionTitle: "Backup Otomatis Terjadwal Kurmon"
        });
        console.log(`[AutoBackup] 📤 Berkas backup berhasil diunggah ke Telegram (${creds.chatId}).`);
      }
    } catch (teleErr) {
      console.warn("[AutoBackup] Gagal kirim berkas ke Telegram:", teleErr.message);
    }
  }
}

// ── Cron Scheduler ────────────────────────────────────────
// Dicek setiap jam; akan jalankan backup pada jam yang dikonfigurasi
let _currentCronHour = 2;
let _cronJob = null;

function startCron() {
  if (_cronJob) { _cronJob.stop(); _cronJob = null; }
  _cronJob = cron.schedule("0 * * * *", async () => {
    try {
      const config = await getScheduleConfig();
      const nowHour = new Date().getHours();
      if (config.enabled && nowHour === config.hour) {
        console.log(`[AutoBackup] ⏰ Cron triggered jam ${nowHour}:00.`);
        await runAutoBackup();
      }
    } catch (err) {
      console.error("[AutoBackup] Cron error:", err.message);
    }
  });
  console.log("[AutoBackup] ✅ Cron scheduler aktif (cek setiap jam, retensi max 3 backup, kirim berkas ke Telegram).");
}

startCron();

