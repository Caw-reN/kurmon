import { exec } from "child_process";
import fs from "fs";
import path from "path";
import crypto from "crypto";
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

/**
 * Buat backup JSON dari semua tabel + simpan lokal + hitung checksum SHA-256.
 * @returns {{ fileName, filePath, size, checksum }}
 */
export async function runBackupJson() {
  if (!_dbPool) throw new Error("Database pool belum diinisialisasi.");

  const dateStr = new Date().toISOString().replace(/[:.]/g, "-");
  const fileName = `backup_${PG_DATABASE}_${dateStr}.json`;
  const filePath = path.join(BACKUP_DIR, fileName);

  console.log(`[AutoBackup] 📦 Membuat backup JSON: ${fileName}...`);

  // Ambil semua tabel dari public schema
  const tblResult = await _dbPool.query(
    "SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public' ORDER BY tablename ASC"
  );
  const tables = tblResult.rows.map(r => r.tablename);

  const backupData = { _meta: { generatedAt: new Date().toISOString(), database: PG_DATABASE, tables: tables.length } };
  for (const table of tables) {
    try {
      const { rows } = await _dbPool.query(`SELECT * FROM ${table}`);
      backupData[table] = rows;
    } catch (err) {
      console.warn(`[AutoBackup] Skip tabel ${table}:`, err.message);
      backupData[table] = [];
    }
  }

  const jsonStr = JSON.stringify(backupData, null, 2);
  fs.writeFileSync(filePath, jsonStr, "utf-8");

  const checksum = crypto.createHash("sha256").update(jsonStr).digest("hex");
  const size = formatBytes(fs.statSync(filePath).size);

  console.log(`[AutoBackup] ✅ Backup selesai: ${fileName} (${size})`);
  console.log(`[AutoBackup] 🔑 SHA-256: ${checksum}`);

  return { fileName, filePath, size, checksum };
}

/**
 * Runs a pg_dump to backup the database (SQL format — untuk restore via psql)
 */
export async function runBackup() {
  const dateStr = new Date().toISOString().replace(/[:.]/g, "-");
  const fileName = `backup_${PG_DATABASE}_${dateStr}.sql`;
  const filePath = path.join(BACKUP_DIR, fileName);

  const dumpCmd = `set PGPASSWORD=${PG_PASSWORD}&& pg_dump -U ${PG_USER} -h ${PG_HOST} -p ${PG_PORT} -d ${PG_DATABASE} -F c -f "${filePath}"`;

  console.log(`[AutoBackup] Starting SQL backup: ${fileName}...`);

  return new Promise((resolve, reject) => {
    exec(dumpCmd, (error, stdout, stderr) => {
      if (error) {
        console.error(`[AutoBackup] Error creating backup: ${error.message}`);
        return reject(error);
      }
      if (stderr) console.log(`[AutoBackup] pg_dump stderr: ${stderr}`);
      console.log(`[AutoBackup] ✅ SQL Backup created: ${filePath}`);
      resolve(filePath);
    });
  });
}

/**
 * Hapus file backup yang lebih lama dari keepDays hari
 */
function cleanOldBackups(keepDays = 7) {
  try {
    const files = fs.readdirSync(BACKUP_DIR);
    const now = Date.now();
    const cutoff = keepDays * 24 * 60 * 60 * 1000;
    files.forEach(file => {
      const fp = path.join(BACKUP_DIR, file);
      try {
        const stat = fs.statSync(fp);
        if (now - stat.mtime.getTime() > cutoff) {
          fs.unlinkSync(fp);
          console.log(`[AutoBackup] 🗑️  Backup lama dihapus: ${file}`);
        }
      } catch {}
    });
  } catch (err) {
    console.warn("[AutoBackup] cleanOldBackups error:", err.message);
  }
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
 * Jalankan backup otomatis: JSON + notifikasi Telegram
 */
async function runAutoBackup() {
  const config = await getScheduleConfig();
  if (!config.enabled) {
    console.log("[AutoBackup] ⏸  Backup otomatis dinonaktifkan dari pengaturan.");
    return;
  }

  let result = null;
  let error = null;

  try {
    result = await runBackupJson();
    cleanOldBackups(config.keepDays);
  } catch (err) {
    error = err;
    console.error("[AutoBackup] ❌ Auto-backup gagal:", err.message);
  }

  // Kirim notifikasi Telegram jika dikonfigurasi
  if (config.sendToTelegram) {
    try {
      const { sendTelegramAlert } = await import("./telegram-bot.mjs");
      if (result) {
        await sendTelegramAlert(
          "backupStatus",
          `Backup otomatis berhasil!\nFile: ${result.fileName}\nUkuran: ${result.size}\nSHA-256: ${result.checksum.slice(0, 20)}...`,
          "info"
        );
      } else if (error) {
        await sendTelegramAlert(
          "backupStatus",
          `Backup otomatis GAGAL!\nError: ${error.message}`,
          "critical"
        );
      }
    } catch (teleErr) {
      console.warn("[AutoBackup] Gagal kirim notif Telegram:", teleErr.message);
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
  console.log("[AutoBackup] ✅ Cron scheduler aktif (cek setiap jam, backup sesuai jadwal database).");
}

startCron();

