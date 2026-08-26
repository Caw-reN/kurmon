import { handlePklRoutes } from "./routes/pkl.mjs";
import { handleBkRoutes, initBkTables } from "./routes/bk.mjs";
import { handleHikvisionRoutes, autoLinkHikvisionStudents } from "./routes/hikvision.mjs";
import { handlePushRoutes, initializeWebPush } from "./routes/push.mjs";
import { handleKedisiplinanRoutes } from "./routes/kedisiplinan.mjs";
import { handleDataRoutes } from "./routes/data.mjs";
import { handleAuthRoutes } from "./routes/auth.mjs";
import { handleSettingsRoutes } from "./routes/settings.mjs";
import { handleJurnalRoutes } from "./routes/jurnal.mjs";
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import zlib from "node:zlib";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import pg from "pg";
import ExcelJS from "exceljs";
import cron from "node-cron";
import { google } from "googleapis";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { buildAllowedOrigins, resolveCorsOrigin } from "./cors.mjs";
import { normalizeAdminUser, normalizeTeachers, verifyPassword } from "../src/utils/auth.js";
import { HikvisionAPI, decryptPassword, encryptPassword } from "./hikvision-api.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, "..");
const storeDir = resolve(rootDir, "data");

const loadEnvFile = () => {
  const envFile = resolve(rootDir, ".env");
  try {
    const raw = readFileSync(envFile, "utf8");
    raw.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return;
      const separatorIndex = trimmed.indexOf("=");
      if (separatorIndex <= 0) return;
      const key = trimmed.slice(0, separatorIndex).trim();
      let value = trimmed.slice(separatorIndex + 1).trim();
      if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!Object.prototype.hasOwnProperty.call(process.env, key)) {
        process.env[key] = value;
      }
    });
  } catch {
    // .env is optional; defaults below still support the usual Laragon setup.
  }
};

loadEnvFile();

let dbPool;
let dbStatus = {
  ok: false,
  code: "DB_NOT_INITIALIZED",
  message: "Database PostgreSQL belum tersambung.",
};
const DB_CONFIG = {
  host: process.env.PG_HOST || "127.0.0.1",
  port: parseInt(process.env.PG_PORT || "5432", 10),
  user: process.env.PG_USER || "postgres",
  password: process.env.PG_PASSWORD || "",
  database: process.env.PG_DATABASE || "school_system_db",
};

async function syncAllUsersToModules() {
  if (!dbPool) return;
  try {
    const { rows: mstRows } = await dbPool.query('SELECT payload FROM mst_students');
    const students = mstRows.map(r => r.payload);
    
    // CATATAN: Siswa TIDAK di-sync otomatis ke pkl_students.
    // Pendaftaran PKL dilakukan manual via menu Penugasan Guru.
    // Sync otomatis sebelumnya menyebabkan SEMUA siswa terhitung sebagai peserta PKL.

    // Sync ke Hikvision DB Mapping (DIBERHENTIKAN - karena ini membuat semua siswa seolah-olah sudah ada di mesin)
    // for (const s of students) {
    //   if (!s.nis) continue;
    //   await dbPool.query(`
    //     INSERT INTO hikvision_students (nis, name, class_name)
    //     VALUES ($1, $2, $3)
    //     ON CONFLICT (nis) DO UPDATE SET name = EXCLUDED.name, class_name = EXCLUDED.class_name
    //   `, [s.nis, s.name, s.class_name]);
    // }

    // Guru Sync (DIBERHENTIKAN - karena ini membuat semua guru seolah-olah sudah ada di mesin)
    const { rows: tRows } = await dbPool.query('SELECT payload FROM mst_teachers');
    const teachers = tRows.map(r => r.payload);
    // for (const t of teachers) {
    //   if (!t.code) continue;
    //   await dbPool.query(`
    //     INSERT INTO hikvision_students (nis, name, class_name)
    //     VALUES ($1, $2, $3)
    //     ON CONFLICT (nis) DO UPDATE SET name = EXCLUDED.name, class_name = EXCLUDED.class_name
    //   `, [t.code, t.name, 'guru']);
    // }
    for (const t of teachers) {
      if (!t.code) continue;
      await dbPool.query(`
        INSERT INTO hikvision_teachers (teacher_code, name)
        VALUES ($1, $2)
        ON CONFLICT (teacher_code) DO UPDATE SET name = EXCLUDED.name
      `, [t.code, t.name]);
    }

    // Karyawan Sync (DIBERHENTIKAN - karena ini membuat semua karyawan seolah-olah sudah ada di mesin)
    const { rows: sfRows } = await dbPool.query('SELECT payload FROM mst_staffs');
    const staffs = sfRows.map(r => r.payload);
    // for (const sf of staffs) {
    //   if (!sf.code) continue;
    //   await dbPool.query(`
    //     INSERT INTO hikvision_students (nis, name, class_name)
    //     VALUES ($1, $2, $3)
    //     ON CONFLICT (nis) DO UPDATE SET name = EXCLUDED.name, class_name = EXCLUDED.class_name
    //   `, [sf.code, sf.name, 'karyawan']);
    // }
    for (const st of staffs) {
      if (!st.code) continue;
      await dbPool.query(`
        INSERT INTO hikvision_staffs (staff_code, name)
        VALUES ($1, $2)
        ON CONFLICT (staff_code) DO UPDATE SET name = EXCLUDED.name
      `, [st.code, st.name]);
    }
    
    // Sync to physical Hikvision Devices
    // Fitur push (createUser) ke mesin dimatikan sesuai request agar hanya mengambil log absensi (pull)
    // dan tidak membebani mesin dengan semua data web.
    console.log("Background sync to PKL and Hikvision finished successfully.");
  } catch (err) {
    console.error("Error in syncAllUsersToModules:", err);
  }
}

// Helper: konversi "HH:MM" ke menit (numerik) untuk perbandingan waktu yang aman
import { isRateLimited } from './middlewares/rateLimiter.mjs';

function toMinutes(hhmm) {
  const [h, m] = String(hhmm || '00:00').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

async function pullHikvisionLogs(force = false) {
  if (!dbPool) return { logs_found: 0, logs_saved: 0 };
  const config = await getHikvisionConfig();
  let totalSaved = 0;
  let totalFound = 0;
  try {
    const nowLocal = new Date().toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hour12: false }).replace('.', ':');
    const nowMinutes = toMinutes(nowLocal);

    // Active attendance sync window: 05:00 to 21:00 (covers all morning, midday, afternoon, and evening staff taps)
    const isWithinDailyWindow = nowMinutes >= toMinutes("05:00") && nowMinutes <= toMinutes("21:00");

    if (!isWithinDailyWindow && !force) {
      console.log(`[Hikvision] Cron job skipped because ${nowLocal} is outside active daily attendance window (05:00 - 21:00).`);
      return { logs_found: 0, logs_saved: 0 };
    }

    // ── Pre-load identity lookup tables ONCE before device loop ──
    const [hikStudentsRes, teachersRes, staffsRes, featureStoreRes] = await Promise.all([
      dbPool.query("SELECT nis, name, class_name FROM hikvision_students"),
      dbPool.query("SELECT id, payload FROM mst_teachers"),
      dbPool.query("SELECT id, payload FROM mst_staffs"),
      dbPool.query("SELECT data FROM app_data WHERE store_key = 'main_store'")
    ]);

    // Build O(1) lookup maps
    const hikStudentMap = new Map(hikStudentsRes.rows.map(r => [String(r.nis || '').toLowerCase(), r]));
    const teacherMap    = new Map();
    for (const r of teachersRes.rows) {
      const p = typeof r.payload === 'string' ? JSON.parse(r.payload) : (r.payload || {});
      const name = p.name || p.nama || r.id;
      if (r.id)         teacherMap.set(String(r.id).toLowerCase(), { name });
      if (p.code)       teacherMap.set(String(p.code).toLowerCase(), { name });
      if (p.nip)        teacherMap.set(String(p.nip).toLowerCase(), { name });
    }
    const staffMap = new Map();
    for (const r of staffsRes.rows) {
      const p = typeof r.payload === 'string' ? JSON.parse(r.payload) : (r.payload || {});
      const name = p.name || p.nama || r.id;
      const sId = String(r.id || '').toLowerCase();
      const sCode = String(p.staff_code || p.code || '').toLowerCase();
      if (sId) staffMap.set(sId, { name });
      if (sCode) staffMap.set(sCode, { name });
    }
    // Feature settings (loaded once)
    let featureSettings = {};
    try {
      const raw = featureStoreRes.rows[0]?.data;
      featureSettings = (raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : {}).featureSettings || {};
    } catch { /* ignore parse error */ }

    const { rows: devices } = await dbPool.query("SELECT * FROM hikvision_devices");
    for (const device of devices) {
      const dtype = device.device_type || 'siswa';
      try {
        const plainPassword = decryptPassword(device.encrypted_password, device.iv_vector);
        const api = new HikvisionAPI(device.ip_address, device.username, plainPassword);

        const lastLogRes = await dbPool.query('SELECT MAX(timestamp) as last_ts FROM hikvision_logs WHERE device_id = $1', [device.id]);
        let startTime = new Date();
        if (lastLogRes.rows[0]?.last_ts) {
          // Lookback 6 hours to prevent any gaps from network lag or clock adjustments
          startTime = new Date(new Date(lastLogRes.rows[0].last_ts).getTime() - 6 * 60 * 60 * 1000);
        } else {
          startTime.setDate(startTime.getDate() - 3);
        }

        const endTime = new Date();
        const logs = await api.searchEvents(startTime, endTime);
        totalFound += logs.length;

        for (const log of logs) {
          const employeeNo = log.employeeNoString;
          if (!employeeNo) continue;
          
          // Only save verified attendance events: 75 (face), 38 (fingerprint), 1 (card), 104 (mask/face)
          if (log.minor !== 75 && log.minor !== 38 && log.minor !== 1 && log.minor !== 104) {
            continue;
          }

          const eventType = `${log.major}-${log.minor}`;
          const logTime = (log.time || '').replace('T', ' ').substring(0, 19);
          const logHhmm = logTime.substring(11, 16);
          const logMin  = toMinutes(logHhmm);

          // ── Identity lookup via pre-loaded Maps (O(1), no extra queries) ──
          const empKey = String(employeeNo).toLowerCase();
          let personType = (dtype === 'staff' || dtype === 'karyawan') ? 'karyawan' : (dtype === 'guru' ? 'guru' : 'siswa');
          let userName   = log.name || 'Unknown';

          const hikStu = hikStudentMap.get(empKey);
          if (hikStu && hikStu.class_name !== 'guru' && hikStu.class_name !== 'karyawan') {
            personType = 'siswa';
            userName   = hikStu.name || userName;
          } else if (hikStu && (hikStu.class_name === 'guru' || hikStu.class_name === 'karyawan')) {
            personType = hikStu.class_name;
            userName   = hikStu.name || userName;
          } else if (teacherMap.has(empKey)) {
            personType = 'guru';
            userName   = teacherMap.get(empKey).name || userName;
          } else if (staffMap.has(empKey)) {
            personType = 'karyawan';
            userName   = staffMap.get(empKey).name || userName;
          }

          // Insert raw attendance tap without dropping - all taps must be retained for report aggregation
          const insRes = await dbPool.query(
            "INSERT INTO hikvision_logs (device_id, employee_id, timestamp, event_type, person_type, created_at) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP) ON CONFLICT (device_id, employee_id, timestamp) DO NOTHING",
            [device.id, employeeNo, logTime, eventType, personType]
          );
          if (insRes.rowCount > 0) totalSaved++;

          // ── Late notification (only for morning check-in taps) ──
          let lateLimit  = null;
          let roleTarget = null;
          if (personType === 'siswa')     { lateLimit = config.siswa?.masuk_late;     roleTarget = 'parent';    }
          else if (personType === 'guru')     { lateLimit = config.guru?.masuk_late;      roleTarget = 'kurikulum'; }
          else if (personType === 'karyawan') { lateLimit = config.karyawan?.masuk_late;  roleTarget = 'tu';        }

          if (lateLimit && (log.minor === 75 || log.minor === 38)) {
            const closeLimit = toMinutes(
              (personType === 'siswa' ? config.siswa?.masuk_close : (personType === 'guru' ? config.guru?.masuk_close : config.karyawan?.masuk_close)) || "12:00"
            );
            if (logMin > toMinutes(lateLimit) && logMin <= closeLimit) {
              if (featureSettings.wa_auto_terlambat !== false) {
                const message = `Pemberitahuan: ${personType.toUpperCase()} ${userName} (ID ${employeeNo}) absen masuk pada ${logHhmm} (terlambat, batas: ${lateLimit}).`;
                await dbPool.query(
                  "INSERT INTO whatsapp_logs (phone, message, trigger_type, status) VALUES ($1, $2, $3, 'pending')",
                  [roleTarget, message, `late_${personType}`]
                );
              }
            }
          }
        }
      } catch (e) {
        console.error(`Gagal pull log device ${device.ip_address}:`, e.message);
      }
    }
  } catch (err) {
    console.error("Error in pullHikvisionLogs:", err);
  }
  return { logs_found: totalFound, logs_saved: totalSaved };
}


async function autoSyncGuruAttendanceToAppData() {
  if (!dbPool) return;
  try {
    const teachersRes = await dbPool.query('SELECT id, payload FROM mst_teachers');
    const nipToCode = {};
    teachersRes.rows.forEach(r => {
      const t = r.payload;
      const code = t.code || r.id;
      if (r.id) nipToCode[String(r.id).trim().toLowerCase()] = code;
      if (t.code) nipToCode[String(t.code).trim().toLowerCase()] = code;
      if (t.nip) nipToCode[String(t.nip).trim().toLowerCase()] = code;
      if (t.id) nipToCode[String(t.id).trim().toLowerCase()] = code;
    });

    const staffsRes = await dbPool.query("SELECT id, payload FROM mst_staffs");
    const staffToCode = {};
    staffsRes.rows.forEach(r => {
      const s = r.payload;
      const code = s.staff_code || s.code || r.id;
      if (r.id) staffToCode[String(r.id).trim().toLowerCase()] = code;
      if (s.staff_code) staffToCode[String(s.staff_code).trim().toLowerCase()] = code;
      if (s.code) staffToCode[String(s.code).trim().toLowerCase()] = code;
    });

    const { rows: logs } = await dbPool.query(`
      SELECT l.employee_id, TO_CHAR(l.timestamp, 'YYYY-MM-DD HH24:MI:SS') as time_str, l.event_type, d.ip_address, d.location, d.device_type, l.person_type
      FROM hikvision_logs l
      JOIN hikvision_devices d ON l.device_id = d.id
      WHERE l.person_type IN ('guru', 'karyawan') OR d.device_type IN ('guru', 'karyawan')
      ORDER BY l.timestamp ASC
    `);
    if (logs.length === 0) return;

      const conf = await getHikvisionConfig();
      let added = 0;

      const getRoleTimeConfigLocal = (conf, role) => {
        const defaults = {
          siswa: { masuk_open: "05:00", masuk_late: "07:15", masuk_close: "11:00", pulang_open: "14:00", pulang_close: "18:00" },
          guru: { masuk_open: "05:00", masuk_late: "07:00", masuk_close: "11:00", pulang_open: "14:00", pulang_close: "18:00" },
          karyawan: { masuk_open: "05:00", masuk_late: "07:00", masuk_close: "11:00", pulang_open: "15:00", pulang_close: "18:00" }
        };
        const roleDefault = defaults[role] || defaults.siswa;
        const roleConf = conf[role] || {};
        const formatTime = (timeStr) => {
          if (!timeStr) return "";
          return timeStr.substring(0, 5); // "HH:MM"
        };
        return {
          masuk_open: formatTime(roleConf.masuk_open) || roleDefault.masuk_open,
          masuk_late: formatTime(roleConf.masuk_late) || roleDefault.masuk_late,
          masuk_close: formatTime(roleConf.masuk_close) || roleDefault.masuk_close,
          pulang_open: formatTime(roleConf.pulang_open) || roleDefault.pulang_open,
          pulang_close: formatTime(roleConf.pulang_close) || roleDefault.pulang_close,
        };
      };

      for (const log of logs) {
        const empId = String(log.employee_id || '').trim();
        const empKey = empId.toLowerCase();
        const teacherCode = nipToCode[empKey] || staffToCode[empKey] || null;
        if (!teacherCode) continue;

        const date = log.time_str.substring(0, 10);
        const time = log.time_str.substring(11, 16);
        
        let roleType = log.person_type || log.device_type || 'guru';
        if (nipToCode[empKey]) roleType = 'guru';
        else if (staffToCode[empKey]) roleType = 'karyawan';
        
        const roleConf = getRoleTimeConfigLocal(conf, roleType);

        let sessionName = '';
        let status = '';
        if (time >= roleConf.masuk_open && time <= roleConf.masuk_close) {
          sessionName = 'Masuk Pagi';
          status = time > roleConf.masuk_late ? 'Terlambat' : 'Hadir';
        } else if (time >= roleConf.pulang_open && time <= roleConf.pulang_close) {
          sessionName = 'Pulang Sore';
          status = 'Hadir';
        } else {
          continue;
        }

        const recordId = `hik-${teacherCode}-${date}-${sessionName}`;
        
        try {
          const res = await dbPool.query(
            "INSERT INTO guru_attendance_records (record_id, teacher_code, tanggal, waktu, session_name, status, mode, note) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (record_id) DO NOTHING",
            [recordId, teacherCode, date, time, sessionName, status, 'hikvision', `Dari mesin Hikvision: ${log.location || log.ip_address}`]
          );
          if (res.rowCount > 0) added++;
        } catch (e) {
          console.error("Gagal insert ke guru_attendance_records:", e.message);
        }
      }

      if (added > 0) {
        console.log(`[CRON] Berhasil otomatis sinkronisasi ${added} data absensi guru/karyawan dari mesin ke tabel relasional.`);
      }
  } catch (err) {
    console.error('Error in autoSyncGuruAttendanceToAppData:', err);
  }
}

async function sendDailyClassSummary() {
  if (!dbPool) return;
  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    const { rows: mstRows } = await dbPool.query("SELECT payload FROM mst_classes");
    const classes = mstRows.map(r => r.payload);

    // Fetch teachers once outside the loop to avoid N+1 queries
    const { rows: tRows } = await dbPool.query("SELECT payload FROM mst_teachers");
    const teachers = tRows.map(r => r.payload);

    for (const cls of classes) {
      if (!cls.id || !cls.walas_id) continue;

      const walas = teachers.find(t => t.id === cls.walas_id || t.code === cls.walas_id);
      if (!walas || !walas.phone) continue;

      // Get all students in this class
      const { rows: sRows } = await dbPool.query(
        "SELECT nis, name FROM hikvision_students WHERE class_name = $1",
        [cls.id]
      );
      if (sRows.length === 0) continue;

      const nisList = sRows.map(s => s.nis);

      // ── FIX BUG-03: Batch-query BOTH tables for all students at once ──
      const [hikRes, manualRes] = await Promise.all([
        dbPool.query(
          "SELECT DISTINCT employee_id FROM hikvision_logs WHERE employee_id = ANY($1) AND timestamp::date = $2::date",
          [nisList, today]
        ),
        dbPool.query(
          "SELECT user_id, status FROM kedisiplinan_absensi WHERE siswa_nis = ANY($1) AND tanggal = $2 AND approval_status = 'approved'",
          [nisList, today]
        )
      ]);

      const hadirSet    = new Set(hikRes.rows.map(r => String(r.employee_id)));
      const manualMap   = new Map(manualRes.rows.map(r => [String(r.user_id), r.status]));

      let hadir = 0;
      const tidakHadirNames = [];

      for (const s of sRows) {
        const nisStr = String(s.nis);
        if (hadirSet.has(nisStr)) {
          hadir++;
        } else if (manualMap.has(nisStr)) {
          tidakHadirNames.push(`${s.name} (${manualMap.get(nisStr)})`);
        } else {
          tidakHadirNames.push(`${s.name} (Alpa)`);
        }
      }

      const tidakHadirCount = sRows.length - hadir;
      const message = `Halo Bapak/Ibu Wali Kelas ${cls.id},\nBerikut rekap absensi kelas hari ini (${today}):\n- Total Siswa: ${sRows.length}\n- Hadir: ${hadir}\n- Tidak Hadir: ${tidakHadirCount}\n\nDaftar Tidak Hadir:\n${tidakHadirNames.join('\n')}`;

      await dbPool.query(
        "INSERT INTO whatsapp_logs (phone, message, trigger_type, status) VALUES ($1, $2, $3, 'pending')",
        [walas.phone, message, 'daily_recap_walas']
      );
    }
  } catch (e) {
    console.error("Error in sendDailyClassSummary:", e);
  }
}

const DEFAULT_ADMIN_PASSWORD = process.env.DEFAULT_ADMIN_PASSWORD || null;
const MAX_JSON_BODY_BYTES = 8_000_000;
const getDatabaseErrorMessage = (err) => {
  if (err?.code === "28P01") {
    return "Akses PostgreSQL ditolak. Periksa PG_USER dan PG_PASSWORD di file .env.";
  }
  if (err?.code === "ECONNREFUSED") {
    return "PostgreSQL belum aktif. Jalankan PostgreSQL, lalu restart auth server.";
  }
  if (err?.code === "3D000") {
    return "Database PostgreSQL tidak ditemukan dan gagal dibuat. Periksa izin user PostgreSQL di file .env.";
  }
  if (err?.code === "DB_PAYLOAD_INVALID") {
    return "Data utama di PostgreSQL rusak atau bukan JSON valid.";
  }
  return err?.message || "Database PostgreSQL gagal tersambung.";
};
const createDatabaseUnavailableError = () => {
  const error = new Error(dbStatus.message);
  error.code = dbStatus.code;
  error.statusCode = 503;
  return error;
};
const initDb = async () => {
  try {
    const adminPool = new pg.Pool({
      host: DB_CONFIG.host,
      port: DB_CONFIG.port,
      user: DB_CONFIG.user,
      password: DB_CONFIG.password,
      database: "postgres",
    });
    
    const dbCheck = await adminPool.query("SELECT 1 FROM pg_database WHERE datname = $1", [DB_CONFIG.database]);
    if (dbCheck.rowCount === 0) {
      await adminPool.query(`CREATE DATABASE "${DB_CONFIG.database}"`);
    }
    await adminPool.end();
    
    dbPool = new pg.Pool(DB_CONFIG);
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS app_data (
        id SERIAL PRIMARY KEY,
        store_key VARCHAR(50) UNIQUE,
        data TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS mst_majors (
        id VARCHAR(255) PRIMARY KEY,
        payload JSONB NOT NULL
      );
      CREATE TABLE IF NOT EXISTS mst_classes (
        id VARCHAR(255) PRIMARY KEY,
        payload JSONB NOT NULL
      );
      CREATE TABLE IF NOT EXISTS mst_rooms (
        id VARCHAR(255) PRIMARY KEY,
        payload JSONB NOT NULL
      );
      CREATE TABLE IF NOT EXISTS mst_teachers (
        id VARCHAR(255) PRIMARY KEY,
        payload JSONB NOT NULL
      );
      CREATE TABLE IF NOT EXISTS mst_subjects (
        id VARCHAR(255) PRIMARY KEY,
        payload JSONB NOT NULL
      );
      CREATE TABLE IF NOT EXISTS mst_students (
        id VARCHAR(255) PRIMARY KEY,
        payload JSONB NOT NULL
      );
      CREATE TABLE IF NOT EXISTS mst_staffs (
        id VARCHAR(255) PRIMARY KEY,
        payload JSONB NOT NULL
      );
    `);
    
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        role VARCHAR(50) NOT NULL DEFAULT 'siswa',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS attendances (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        status VARCHAR(50), student_nis VARCHAR(50), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS hikvision_devices (
        id SERIAL PRIMARY KEY,
        ip_address VARCHAR(100) NOT NULL,
        location VARCHAR(255),
        username VARCHAR(100) NOT NULL,
        encrypted_password TEXT NOT NULL,
        iv_vector VARCHAR(50) NOT NULL,
        class_id INT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS hikvision_groups (
        id SERIAL PRIMARY KEY,
        device_id INT NOT NULL REFERENCES hikvision_devices(id) ON DELETE CASCADE,
        group_id VARCHAR(50) NOT NULL,
        group_name VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(device_id, group_id)
      )
    `);

    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS hikvision_students (
        id SERIAL PRIMARY KEY,
        nis VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        device_group_id INT REFERENCES hikvision_groups(id) ON DELETE SET NULL,
        class_name VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Ensure class_name exists in devices as well if we want to map whole device to class
    await dbPool.query(`ALTER TABLE hikvision_devices ADD COLUMN IF NOT EXISTS class_name VARCHAR(100)`);
    await dbPool.query(`ALTER TABLE hikvision_students ADD COLUMN IF NOT EXISTS class_name VARCHAR(100)`);
    await dbPool.query(`ALTER TABLE hikvision_students ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
    
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS hikvision_teachers (
        id SERIAL PRIMARY KEY,
        teacher_code VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        device_group_id INT REFERENCES hikvision_groups(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS hikvision_staffs (
        id SERIAL PRIMARY KEY,
        staff_code VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        device_group_id INT REFERENCES hikvision_groups(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS attendance_manual (
        id SERIAL PRIMARY KEY,
        user_type VARCHAR(50) NOT NULL,
        user_id VARCHAR(50) NOT NULL,
        date DATE NOT NULL,
        status VARCHAR(50) NOT NULL,
        reason TEXT,
        created_by VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    // Tipe mesin: siswa, guru, karyawan
    await dbPool.query(`ALTER TABLE hikvision_devices ADD COLUMN IF NOT EXISTS device_type VARCHAR(50) DEFAULT 'siswa'`);

    // CREATE TABLE dulu sebelum ALTER
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS hikvision_logs (
        id SERIAL PRIMARY KEY,
        device_id INT NOT NULL REFERENCES hikvision_devices(id) ON DELETE CASCADE,
        employee_id VARCHAR(50) NOT NULL,
        timestamp TIMESTAMP NOT NULL,
        event_type VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(device_id, employee_id, timestamp)
      )
    `);

    // Tambahkan indeks untuk optimasi performa dashboard
    await dbPool.query(`CREATE INDEX IF NOT EXISTS idx_hikvision_logs_dash ON hikvision_logs (device_id, employee_id, (timestamp::date))`);

    // Kolom person_type di log untuk membedakan siswa/guru/karyawan
    await dbPool.query(`ALTER TABLE hikvision_logs ADD COLUMN IF NOT EXISTS person_type VARCHAR(50) DEFAULT 'siswa'`);


    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS pkl_locations (
        id SERIAL PRIMARY KEY,
        nama_perusahaan VARCHAR(255) NOT NULL,
        bidang VARCHAR(100),
        alamat TEXT,
        kota VARCHAR(100),
        telepon VARCHAR(30),
        website VARCHAR(255),
        kuota INT DEFAULT 0,
        status VARCHAR(20) DEFAULT 'pending', student_nis VARCHAR(50), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add extra columns if they don't exist (untuk koordinat, jurusan, kompetensi, dan verified)
    await dbPool.query(`
      ALTER TABLE pkl_locations 
      ADD COLUMN IF NOT EXISTS lat NUMERIC(10, 8),
      ADD COLUMN IF NOT EXISTS lng NUMERIC(11, 8),
      ADD COLUMN IF NOT EXISTS jurusan VARCHAR(100),
      ADD COLUMN IF NOT EXISTS kompetensi JSONB DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS submitted_by VARCHAR(20) DEFAULT 'admin';
    `);

    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS pkl_logbooks (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        tanggal DATE,
        kegiatan TEXT,
        catatan TEXT,
        status VARCHAR(20) DEFAULT 'pending', student_nis VARCHAR(50), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await dbPool.query(`
      ALTER TABLE pkl_logbooks 
      ADD COLUMN IF NOT EXISTS solusi TEXT,
      ADD COLUMN IF NOT EXISTS jam_masuk VARCHAR(10) DEFAULT '08:00',
      ADD COLUMN IF NOT EXISTS jam_keluar VARCHAR(10) DEFAULT '17:00',
      ADD COLUMN IF NOT EXISTS catatan_guru TEXT
    `);

    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS pkl_submissions (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        location_id INT REFERENCES pkl_locations(id) ON DELETE SET NULL,
        status VARCHAR(20) DEFAULT 'pending',
        catatan TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS pkl_students (
        nis VARCHAR(50) PRIMARY KEY,
        location_id INT REFERENCES pkl_locations(id) ON DELETE SET NULL,
        teacher_code VARCHAR(100),
        status VARCHAR(50) DEFAULT 'aktif',
        start_date DATE,
        end_date DATE,
        location_update_count INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await dbPool.query(`ALTER TABLE pkl_students ADD COLUMN IF NOT EXISTS location_update_count INT DEFAULT 0`);

    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS pkl_surat_pengantar (
        id SERIAL PRIMARY KEY,
        location_id INT REFERENCES pkl_locations(id) ON DELETE SET NULL,
        pt_name_temp VARCHAR(255),
        nomor_surat VARCHAR(100),
        status VARCHAR(20) DEFAULT 'pending',
        created_by_nis VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS pkl_surat_pengantar_students (
        id SERIAL PRIMARY KEY,
        surat_id INT NOT NULL REFERENCES pkl_surat_pengantar(id) ON DELETE CASCADE,
        nis VARCHAR(50) NOT NULL,
        nama VARCHAR(255) NOT NULL,
        kelas VARCHAR(50),
        nisn VARCHAR(50)
      )
    `);

    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS pkl_mutasi (
        id SERIAL PRIMARY KEY,
        nis VARCHAR(50) NOT NULL,
        old_location_id INT REFERENCES pkl_locations(id) ON DELETE SET NULL,
        new_location_id INT REFERENCES pkl_locations(id) ON DELETE SET NULL,
        new_pt_name_temp VARCHAR(255),
        alasan TEXT,
        acc_walas VARCHAR(20) DEFAULT 'pending',
        acc_pembimbing VARCHAR(20) DEFAULT 'pending',
        acc_kaprog VARCHAR(20) DEFAULT 'pending',
        acc_hubin VARCHAR(20) DEFAULT 'pending',
        final_status VARCHAR(20) DEFAULT 'pending', student_nis VARCHAR(50), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS kedisiplinan_master_poin (
        id SERIAL PRIMARY KEY,
        nama_tindakan VARCHAR(255) NOT NULL,
        jenis VARCHAR(50) NOT NULL,
        nilai_poin INT NOT NULL,
        is_deleted BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    try {
      await dbPool.query("ALTER TABLE kedisiplinan_master_poin ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false");
    } catch (e) {
      console.warn("Alter table for kedisiplinan_master_poin failed:", e.message);
    }

    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS kedisiplinan_jadwal_mingguan (
        id SERIAL PRIMARY KEY,
        hari VARCHAR(20) NOT NULL,
        kampus VARCHAR(50) NOT NULL,
        guru_ids JSONB DEFAULT '[]'::jsonb,
        pj_code VARCHAR(50) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(hari, kampus)
      )
    `);

    try {
      await dbPool.query("ALTER TABLE kedisiplinan_jadwal_mingguan ADD COLUMN IF NOT EXISTS pj_code VARCHAR(50) DEFAULT NULL");
    } catch (e) {
      console.warn("Alter table for pj_code failed:", e.message);
    }

    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS kedisiplinan_riwayat_poin (
        id SERIAL PRIMARY KEY,
        siswa_nis VARCHAR(50) NOT NULL,
        tindakan_id INT REFERENCES kedisiplinan_master_poin(id) ON DELETE SET NULL,
        tindakan_nama VARCHAR(255),
        poin INT,
        jenis VARCHAR(50),
        pelapor_id VARCHAR(50),
        pelapor_nama VARCHAR(100),
        catatan TEXT,
        tanggal_kejadian TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS kedisiplinan_buku_konseling (
        id SERIAL PRIMARY KEY,
        siswa_nis VARCHAR(50) NOT NULL,
        guru_bk_id VARCHAR(50),
        guru_bk_nama VARCHAR(100),
        jenis_kasus VARCHAR(50),
        tindak_lanjut TEXT,
        catatan_konseling TEXT,
        status VARCHAR(50) DEFAULT 'Selesai',
        tanggal_konseling TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS kedisiplinan_absensi (
        id SERIAL PRIMARY KEY,
        siswa_nis VARCHAR(50) NOT NULL,
        tanggal DATE NOT NULL,
        status VARCHAR(50) NOT NULL,
        keterangan TEXT,
        pelapor_id VARCHAR(50),
        pelapor_nama VARCHAR(100),
        gdrive_url TEXT,
        approval_status VARCHAR(20) DEFAULT 'approved',
        approved_by_id VARCHAR(50),
        approved_by_name VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // === TABEL BARU: FITUR TAMBAHAN ===

    // Riwayat Prestasi Siswa
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS kesiswaan_prestasi (
        id SERIAL PRIMARY KEY,
        siswa_nis VARCHAR(50) NOT NULL,
        nama_prestasi VARCHAR(255) NOT NULL,
        peringkat VARCHAR(100),
        tingkat VARCHAR(100),
        penyelenggara VARCHAR(255),
        tanggal_prestasi DATE DEFAULT CURRENT_DATE,
        keterangan TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Profil Sekolah
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS school_profile (
        id SERIAL PRIMARY KEY,
        key VARCHAR(100) UNIQUE NOT NULL,
        value TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tahun Ajaran
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS academic_years (
        id SERIAL PRIMARY KEY,
        nama VARCHAR(100) NOT NULL,
        semester VARCHAR(20) NOT NULL DEFAULT 'Ganjil',
        tanggal_mulai DATE,
        tanggal_selesai DATE,
        is_active BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // API Keys / Integrasi
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS api_keys (
        id SERIAL PRIMARY KEY,
        service_name VARCHAR(100) UNIQUE NOT NULL,
        service_label VARCHAR(100),
        api_key TEXT,
        extra_config JSONB DEFAULT '{}'::jsonb,
        is_active BOOLEAN DEFAULT false,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Audit Log (Activity Trail)
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(100),
        user_name VARCHAR(255),
        user_role VARCHAR(50),
        action VARCHAR(100) NOT NULL,
        target_type VARCHAR(100),
        target_id VARCHAR(100),
        detail TEXT,
        ip_address VARCHAR(100),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    // Add user_agent column to existing audit_logs tables (migration)
    try { await dbPool.query(`ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_agent TEXT`); } catch {}
    try { await dbPool.query(`ALTER TABLE audit_logs ALTER COLUMN ip_address TYPE VARCHAR(100)`); } catch {}

    // Kartu Pelajar (Student ID Card Templates)
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS student_card_templates (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        config JSONB DEFAULT '{}'::jsonb,
        is_default BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // WhatsApp Log
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS whatsapp_logs (
        id SERIAL PRIMARY KEY,
        phone VARCHAR(30) NOT NULL,
        recipient_name VARCHAR(255),
        message TEXT NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        trigger_type VARCHAR(50),
        response_data JSONB,
        sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // E-Surat Templates
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS esurat_templates (
        id SERIAL PRIMARY KEY,
        jenis VARCHAR(50) NOT NULL,
        nama VARCHAR(100) NOT NULL,
        isi_template TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Kenaikan Kelas Arsip
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS kenaikan_kelas_log (
        id SERIAL PRIMARY KEY,
        tahun_ajaran VARCHAR(50) NOT NULL,
        tanggal_proses TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        jumlah_naik INT DEFAULT 0,
        jumlah_lulus INT DEFAULT 0,
        detail JSONB DEFAULT '[]'::jsonb,
        processed_by VARCHAR(100)
      )
    `);

    // student_card_requests
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS student_card_requests (
        id SERIAL PRIMARY KEY,
        nis VARCHAR(20) NOT NULL,
        nama VARCHAR(100) NOT NULL,
        kelas VARCHAR(50) NOT NULL,
        alasan TEXT NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        requested_by VARCHAR(50) DEFAULT 'admin',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        processed_at TIMESTAMP
      )
    `);

    // siswa_keluar
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS siswa_keluar (
        id SERIAL PRIMARY KEY,
        nis VARCHAR(20) UNIQUE NOT NULL,
        nama VARCHAR(100) NOT NULL,
        kelas_terakhir VARCHAR(50) NOT NULL,
        tanggal_keluar DATE NOT NULL,
        alasan VARCHAR(100) NOT NULL,
        keterangan TEXT,
        student_payload JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // modul_ajar_guru
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS modul_ajar_guru (
        id SERIAL PRIMARY KEY,
        teacher_code VARCHAR(20) NOT NULL,
        teacher_name VARCHAR(100) NOT NULL,
        nama_dokumen VARCHAR(200) NOT NULL,
        file_url TEXT NOT NULL,
        tahun_ajaran VARCHAR(50) NOT NULL,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add mapel, kelas, semester columns if not exist
    try {
      await dbPool.query("ALTER TABLE modul_ajar_guru ADD COLUMN IF NOT EXISTS mapel VARCHAR(100)");
      await dbPool.query("ALTER TABLE modul_ajar_guru ADD COLUMN IF NOT EXISTS kelas VARCHAR(50)");
      await dbPool.query("ALTER TABLE modul_ajar_guru ADD COLUMN IF NOT EXISTS semester VARCHAR(50)");
      await dbPool.query("ALTER TABLE modul_ajar_guru ADD COLUMN IF NOT EXISTS deskripsi TEXT");
    } catch (e) {
      console.warn("Failed to alter modul_ajar_guru table columns:", e.message);
    }

    // Jurnal Harian Guru (KBM)
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS jurnal_harian_guru (
        id SERIAL PRIMARY KEY,
        teacher_code VARCHAR(50) NOT NULL,
        teacher_name VARCHAR(100),
        tanggal DATE NOT NULL,
        kelas VARCHAR(50),
        mapel VARCHAR(100),
        jam_ke INT DEFAULT 1,
        slot_label VARCHAR(50),
        materi_pokok TEXT,
        kegiatan_pembelajaran TEXT,
        metode_pembelajaran VARCHAR(100) DEFAULT 'Ceramah & Diskusi',
        catatan TEXT,
        jumlah_hadir INT DEFAULT 0,
        submitted_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Migration: Pastikan kolom rincian_absensi ada (dijalankan sekali saat startup, bukan per-request)
    try {
      await dbPool.query("ALTER TABLE jurnal_harian_guru ADD COLUMN IF NOT EXISTS rincian_absensi JSONB DEFAULT '[]'::jsonb");
    } catch (_) {}

    // Catatan Wali Kelas
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS catatan_walikelas (
        id SERIAL PRIMARY KEY,
        teacher_code VARCHAR(50) NOT NULL,
        teacher_name VARCHAR(100),
        kelas VARCHAR(50),
        siswa_nis VARCHAR(50) NOT NULL,
        siswa_name VARCHAR(150),
        tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
        jenis_catatan VARCHAR(50) DEFAULT 'umum',
        isi_catatan TEXT NOT NULL,
        tindak_lanjut TEXT,
        poin_pelanggaran_id INT REFERENCES kedisiplinan_riwayat_poin(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Data Absensi Guru/Karyawan (Migrasi dari main_store)
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS guru_attendance_records (
        record_id VARCHAR(100) PRIMARY KEY,
        teacher_code VARCHAR(50) NOT NULL,
        tanggal DATE NOT NULL,
        waktu TIME NOT NULL,
        session_name VARCHAR(50) NOT NULL,
        status VARCHAR(20) NOT NULL,
        mode VARCHAR(20) DEFAULT 'hikvision',
        note TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Auto-align sequences to prevent duplicate key violations (hikvision_logs_pkey, etc.)
    try {
      const seqRows = await dbPool.query(`
        SELECT t.table_name, c.column_name
        FROM information_schema.tables t
        JOIN information_schema.columns c ON t.table_name = c.table_name
        WHERE t.table_schema = 'public' 
          AND c.column_default LIKE 'nextval%'
      `);
      for (const row of seqRows.rows) {
        const tableName = row.table_name;
        const columnName = row.column_name;
        const seqRes = await dbPool.query(
          "SELECT pg_get_serial_sequence($1, $2) AS seq",
          [tableName, columnName]
        );
        const seqName = seqRes.rows[0]?.seq;
        if (seqName) {
          const quotedTableRes = await dbPool.query("SELECT quote_ident($1) AS q", [tableName]);
          const quotedColRes = await dbPool.query("SELECT quote_ident($1) AS q", [columnName]);
          const qTable = quotedTableRes.rows[0].q;
          const qCol = quotedColRes.rows[0].q;

          await dbPool.query(
            `SELECT setval($1, COALESCE((SELECT MAX(${qCol}) FROM ${qTable}), 1), true)`,
            [seqName]
          );
        }
      }
      console.log("PostgreSQL Database sequences aligned successfully.");
    } catch (seqErr) {
      console.warn("Gagal menyelaraskan sequences:", seqErr.message);
    }

    try {
      const cleanRes = await dbPool.query(`
        DELETE FROM mst_majors
        WHERE id NOT IN (
          SELECT MIN(id)
          FROM mst_majors
          GROUP BY LOWER(TRIM(
            CASE 
              WHEN jsonb_typeof(payload) = 'object' THEN payload->>'name'
              ELSE payload#>>'{}'
            END
          ))
        )
      `);
      if (cleanRes.rowCount > 0) {
        console.log(`Cleaned up ${cleanRes.rowCount} duplicate majors from database.`);
      }
    } catch (cleanErr) {
      console.warn("Failed to clean duplicate majors:", cleanErr.message);
    }

    try {
      await dbPool.query(`
        CREATE INDEX IF NOT EXISTS idx_hikvision_logs_emp_time ON hikvision_logs (employee_id, timestamp);
        CREATE INDEX IF NOT EXISTS idx_hikvision_logs_device_time ON hikvision_logs (device_id, timestamp DESC);
        CREATE INDEX IF NOT EXISTS idx_kedisiplinan_absensi_tanggal ON kedisiplinan_absensi (tanggal);
        CREATE INDEX IF NOT EXISTS idx_jurnal_guru_code_date ON jurnal_harian_guru (teacher_code, tanggal DESC);
        CREATE INDEX IF NOT EXISTS idx_catatan_wk_teacher_date ON catatan_walikelas (teacher_code, tanggal DESC);
        CREATE INDEX IF NOT EXISTS idx_catatan_wk_siswa ON catatan_walikelas (siswa_nis);
        CREATE INDEX IF NOT EXISTS idx_catatan_wk_kelas ON catatan_walikelas (kelas);
      `);
      console.log("Database indexes verified/created.");
    } catch (idxErr) {
      console.warn("Failed to create database indexes:", idxErr.message);
    }

    dbStatus = { ok: true, code: "DB_CONNECTED", message: "Database PostgreSQL tersambung." };
    console.log("PostgreSQL Database Initialized & Connected");
    autoLinkHikvisionStudents(dbPool).catch(() => {});
  } catch (err) {
    dbStatus = {
      ok: false,
      code: err?.code || "DB_CONNECT_ERROR",
      message: getDatabaseErrorMessage(err),
    };
    console.error(dbStatus.message, err);
  }
};
await initDb();

const FRONTEND_PORT = Number.parseInt(process.env.VITE_PORT || "6677", 10);
const AUTH_BIND_HOST = process.env.AUTH_BIND_HOST || "0.0.0.0";
const ALLOWED_ORIGINS = buildAllowedOrigins({ env: process.env, frontendPort: FRONTEND_PORT });
// BUG-03 FIX: Session disimpan di PostgreSQL, bukan file plaintext.
// In-memory Map digunakan sebagai cache cepat (L1), DB sebagai sumber kebenaran (L2).
let sessions = new Map();

const SESSION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 hari

// Pastikan tabel app_sessions ada (dipanggil setelah initDb)
async function ensureSessionTable() {
  if (!dbPool) return;
  try {
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS app_sessions (
        token VARCHAR(36) PRIMARY KEY,
        role VARCHAR(50) NOT NULL,
        user_id VARCHAR(100),
        username VARCHAR(100),
        name VARCHAR(255),
        extra_data JSONB DEFAULT '{}',
        created_at BIGINT NOT NULL,
        expires_at BIGINT NOT NULL
      )
    `);
    await dbPool.query(`CREATE INDEX IF NOT EXISTS idx_app_sessions_expires ON app_sessions (expires_at)`);
    console.info("[Sessions] Tabel app_sessions siap.");
  } catch (e) {
    console.warn("[Sessions] Gagal membuat tabel app_sessions:", e.message);
  }
}

// Simpan session ke DB
async function saveSessionToDb(token, sessionData) {
  if (!dbPool) return;
  try {
    const { role, createdAt, id, username, name, ...extra } = sessionData;
    const expiresAt = (createdAt || Date.now()) + SESSION_EXPIRY_MS;
    await dbPool.query(
      `INSERT INTO app_sessions (token, role, user_id, username, name, extra_data, created_at, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (token) DO UPDATE SET role=$2, user_id=$3, username=$4, name=$5, extra_data=$6, expires_at=$8`,
      [token, role || 'unknown', id || username || null, username || null, name || null, JSON.stringify(extra), createdAt || Date.now(), expiresAt]
    );
  } catch (e) {
    console.warn("[Sessions] Gagal menyimpan session ke DB:", e.message);
  }
}

// Hapus session dari DB
async function deleteSessionFromDb(token) {
  if (!dbPool) return;
  try {
    await dbPool.query("DELETE FROM app_sessions WHERE token = $1", [token]);
  } catch (e) {
    console.warn("[Sessions] Gagal menghapus session dari DB:", e.message);
  }
}

// Load semua session aktif dari DB ke cache saat startup
async function loadSessionsFromDb() {
  if (!dbPool) return;
  try {
    const now = Date.now();
    const { rows } = await dbPool.query(
      "SELECT token, role, user_id, username, name, extra_data, created_at FROM app_sessions WHERE expires_at > $1",
      [now]
    );
    sessions = new Map();
    for (const row of rows) {
      const extra = (typeof row.extra_data === 'string' ? JSON.parse(row.extra_data) : row.extra_data) || {};
      sessions.set(row.token, {
        role: row.role,
        id: row.user_id,
        username: row.username,
        name: row.name,
        createdAt: Number(row.created_at),
        ...extra
      });
    }
    console.info(`[Sessions] Memuat ${sessions.size} sesi aktif dari database.`);
  } catch (e) {
    console.warn("[Sessions] Gagal memuat sesi dari DB:", e.message);
    sessions = new Map();
  }
}

// Bersihkan session kadaluarsa dari DB dan cache
const pruneOldSessions = async () => {
  const now = Date.now();
  // Bersihkan cache lokal
  for (const [token, session] of sessions.entries()) {
    if (!session || typeof session !== 'object') { sessions.delete(token); continue; }
    const createdAt = session.createdAt || 0;
    if (!createdAt || (now - createdAt > SESSION_EXPIRY_MS)) {
      sessions.delete(token);
    }
  }
  // Bersihkan DB
  if (dbPool) {
    try {
      const result = await dbPool.query("DELETE FROM app_sessions WHERE expires_at < $1", [now]);
      if (result.rowCount > 0) {
        console.info(`[Sessions] Menghapus ${result.rowCount} sesi kadaluarsa dari database.`);
      }
    } catch (e) {
      console.warn("[Sessions] Gagal membersihkan sesi kadaluarsa:", e.message);
    }
  }
};

// Stub saveSessions agar tidak ada error di referensi lama
const saveSessions = () => {};

// Inisialisasi session dari DB setelah initDb
await ensureSessionTable();
await loadSessionsFromDb();

setInterval(() => {
  pruneOldSessions();
}, 60 * 60 * 1000); // Setiap 1 jam

const getHeaders = (req) => {
  const origin = req.__corsOrigin || resolveCorsOrigin(req.headers.origin, ALLOWED_ORIGINS);
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Credentials": "true",
    "Vary": "Origin",
    // HTTP Security Headers
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "SAMEORIGIN",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-XSS-Protection": "1; mode=block",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(self)",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "Content-Security-Policy": "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: https:;",
  };
  if (origin) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
};

const publicAdminUser = (adminUser) => ({
  username: adminUser?.username || "",
  name: adminUser?.name || "Administrator",
});

const getBearerToken = (req) => {
  const auth = String(req.headers.authorization || "");
  return auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
};

const getSession = (req) => sessions.get(getBearerToken(req));
const normalizeServerRole = (role, defaultRole = "guru") => {
  if (role === "superadmin" || role === "admin") return "admin";
  if (role === "kepsek" || role === "waka" || role === "kaprog" || role === "guru" || role === "tu" || role === "tata_usaha" || role === "karyawan" || role === "staff") return (role === "tata_usaha" ? "tu" : (role === "staff" ? "karyawan" : role));
  if (role === "hubin" || role === "sarpras" || role === "kurikulum" || role === "bk") return role;
  if (role === "siswa") return "siswa";
  if (role === "walas") return "walas";
  return defaultRole;
};
const isAdminRole = (role) => normalizeServerRole(role) === "admin";
const isMonitoringAdmin = (role) => ["admin", "hubin", "waka", "kaprog"].includes(normalizeServerRole(role));

const requireAdmin = (req, res) => {
  const session = getSession(req);
  if (isAdminRole(session?.role)) return session;
  send(req, res, 403, { ok: false, error: "Sesi admin diperlukan." });
  return null;
};

const requireAdminOrTu = (req, res) => {
  const session = getSession(req);
  const role = normalizeServerRole(session?.role);
  if (role === "admin" || role === "tu") return session;
  send(req, res, 403, { ok: false, error: "Sesi admin atau tata usaha diperlukan." });
  return null;
};

const requireAuthenticated = (req, res) => {
  const session = getSession(req);
  const allowed = ["admin", "guru", "kepsek", "waka", "kaprog", "hubin", "sarpras", "kurikulum", "siswa", "walas", "tu", "bk", "karyawan", "staff"];
  if (session && allowed.includes(normalizeServerRole(session.role))) return session;
  send(req, res, 403, { ok: false, error: "Sesi login diperlukan." });
  return null;
};

const createSession = (role, extra = {}) => {
  const token = randomUUID();
  const sessionData = { role: normalizeServerRole(role), createdAt: Date.now(), ...extra };
  sessions.set(token, sessionData);
  // Simpan ke DB secara async (tidak memblokir respons login)
  saveSessionToDb(token, sessionData).catch(e => console.warn('[Sessions] async save error:', e.message));
  return token;
};



const readJsonBody = (req) => new Promise((resolveBody, rejectBody) => {
  let raw = "";
  req.on("data", (chunk) => {
    raw += chunk;
    if (raw.length > MAX_JSON_BODY_BYTES) {
      rejectBody(new Error("Payload terlalu besar."));
      req.destroy();
    }
  });
  req.on("end", () => {
    if (!raw) return resolveBody({});
    try {
      resolveBody(JSON.parse(raw));
    } catch (error) {
      rejectBody(error);
    }
  });
  req.on("error", rejectBody);
});

const send = (req, res, statusCode, payload) => {
  const headers = getHeaders(req);
  const jsonStr = JSON.stringify(payload);
  const acceptEncoding = req.headers["accept-encoding"] || "";

  if (acceptEncoding.includes("gzip")) {
    try {
      const compressed = zlib.gzipSync(Buffer.from(jsonStr));
      headers["Content-Encoding"] = "gzip";
      res.writeHead(statusCode, headers);
      res.end(compressed);
      return;
    } catch (err) {
      console.warn("Gzip compression failed:", err);
    }
  }

  res.writeHead(statusCode, headers);
  res.end(jsonStr);
};

/**
 * logAudit — helper terpusat untuk mencatat audit log dengan IP & User-Agent otomatis.
 */
const logAudit = async (pool, session, req, action, targetType, detail, targetId = null) => {
  if (!pool) return;
  try {
    const ip = (req?.headers?.['x-forwarded-for'] || req?.socket?.remoteAddress || '').split(',')[0].trim();
    const ua = req?.headers?.['user-agent'] || '';
    await pool.query(
      `INSERT INTO audit_logs (user_id, user_name, user_role, action, target_type, target_id, detail, ip_address, user_agent) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        session?.id || session?.username || 'system',
        session?.name || 'Sistem',
        session?.role || 'system',
        action,
        targetType,
        targetId ? String(targetId) : null,
        detail,
        ip,
        ua
      ]
    );
  } catch (e) {
    console.warn('[logAudit] Gagal mencatat audit log:', e.message);
  }
};

const sanitizePayload = (payload = {}) => {
  const safeTeachers = Array.isArray(payload.teachers)
    ? payload.teachers.map(({ password, ...teacher }) => teacher)
    : [];
  const safeAdminUser = payload.adminUser
    ? (({ password, ...admin }) => admin)(payload.adminUser)
    : null;
  const { currentUser, ...rest } = payload;
  return { ...rest, adminUser: safeAdminUser, teachers: safeTeachers, currentUser: null };
};

const toPublicPayload = (payload = {}) => {
  const safe = sanitizePayload(payload);
  return {
    advancedRules: safe.advancedRules,
    appSettings: safe.appSettings,
    classes: safe.classes,
    days: safe.days,
    isGenerated: safe.isGenerated,
    layoutBlockLabels: safe.layoutBlockLabels,
    layoutByDay: safe.layoutByDay,
    layoutPreset: safe.layoutPreset,
    majors: safe.majors,
    roomLayout: safe.roomLayout,
    rooms: safe.rooms,
    schedule: safe.schedule,
    subjects: safe.subjects,
    academicCalendar: safe.academicCalendar,
    calendarCategories: safe.calendarCategories,
    featureSettings: safe.featureSettings,
    rolePermissions: safe.rolePermissions,
    syllabuses: safe.syllabuses,
    teacherAvailability: safe.teacherAvailability,
    teachers: safe.teachers,
    adminUser: safe.adminUser,
    teachingLoads: safe.teachingLoads,
    timeSlots: safe.timeSlots,
    strukturOrganisasi: safe.strukturOrganisasi,
    mitraKerjasama: safe.mitraKerjasama,
  };
};

const readMainPayload = async () => {
  if (!dbPool || !dbStatus?.ok) {
    await initDb().catch(() => {});
  }
  if (!dbPool || !dbStatus?.ok) throw createDatabaseUnavailableError();
  const { rows } = await dbPool.query(`SELECT data FROM app_data WHERE store_key = 'main_store'`);
  if (rows.length === 0 || !rows[0].data) return null;
  try {
    return JSON.parse(rows[0].data);
  } catch (error) {
    const invalidPayloadError = new Error(getDatabaseErrorMessage({ code: "DB_PAYLOAD_INVALID" }));
    invalidPayloadError.code = "DB_PAYLOAD_INVALID";
    invalidPayloadError.statusCode = 500;
    throw invalidPayloadError;
  }
};

const getHikvisionConfig = async () => {
  const defaultConf = {
    masuk_open: "05:00",
    masuk_late: "07:15",
    masuk_close: "11:00",
    pulang_open: "14:00",
    pulang_close: "18:00",
    siswa: { masuk_open: "05:00", masuk_late: "07:15", masuk_close: "11:00", pulang_open: "14:00", pulang_close: "18:00" },
    guru: { masuk_open: "05:00", masuk_late: "07:00", masuk_close: "11:00", siang_open: "11:00", siang_close: "14:00", pulang_open: "14:00", pulang_close: "18:00" },
    karyawan: { masuk_open: "05:00", masuk_late: "07:00", masuk_close: "11:00", pulang_open: "15:00", pulang_close: "18:00" },
    notify_role: "none",
    notify_custom_phone: ""
  };
  try {
    if (!dbPool) return defaultConf;
    const res = await dbPool.query("SELECT data FROM app_data WHERE store_key = 'hikvision_attendance_config'");
    if (res.rowCount > 0 && res.rows[0].data) {
      return { ...defaultConf, ...JSON.parse(res.rows[0].data) };
    }
  } catch (e) {
    console.error("Failed to load hikvision config:", e);
  }
  return defaultConf;
};

const sendDatabaseError = (req, res, err) => {
  const statusCode = err?.statusCode || (!dbPool ? 503 : 500);
  send(req, res, statusCode, {
    ok: false,
    error: getDatabaseErrorMessage(err),
    code: err?.code || dbStatus.code || "DATABASE_ERROR",
  });
};

const ensureDatabaseReadable = async (req, res) => {
  try {
    await readMainPayload();
    return true;
  } catch (err) {
    console.error("Database Readiness Error:", err);
    sendDatabaseError(req, res, err);
    return false;
  }
};





const server = createServer(async (req, res) => {
  console.log("Req:", req.url);
  const corsOrigin = resolveCorsOrigin(req.headers.origin, ALLOWED_ORIGINS);
  req.__corsOrigin = corsOrigin;

  if (req.headers.origin && !corsOrigin) {
    res.writeHead(403, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ ok: false, error: "Origin tidak diizinkan." }));
    return;
  }

  if (req.method === "OPTIONS") {
    res.writeHead(204, getHeaders(req));
    res.end();
    return;
  }

  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

  // FIX: Global Rate Limiter Protection
  if (isRateLimited(req)) {
    res.writeHead(429, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ ok: false, error: "Terlalu banyak permintaan. Silakan coba lagi nanti." }));
    return;
  }

  try {
      if (req.method === "GET" && url.pathname === "/api/student/verify") {
        try {
          const nis = url.searchParams.get("nis");
          const payload = await readMainPayload();
    let students = payload?.students || [];
    try {
      const dbStudents = await dbPool.query('SELECT payload FROM mst_students');
      if (dbStudents.rows.length > 0) students = dbStudents.rows.map(r => r.payload);
    } catch(e) {}
    if (!students || students.length === 0) return send(req, res, 404, { ok: false, message: "No data" });
    const student = students.find(s => String(s.nis) === String(nis));
    if (student) {
      const safeStudent = { ...student };
      delete safeStudent.password;
      send(req, res, 200, { ok: true, student: safeStudent, school: payload?.school || {} });
          } else {
            send(req, res, 404, { ok: false, message: "Student not found" });
          }
        } catch (err) {
          console.error("Verify Error:", err);
          sendDatabaseError(req, res, err);
        }
        return;
      }

    /* /api/data routes removed */

    /* /api/auth routes removed */

    
    /* /api/settings routes removed */

    if (req.method === "GET" && url.pathname === "/api/monitoring/pkl-students") {
      if (!requireAuthenticated(req, res)) return;
      if (!dbPool) { send(req, res, 503, { ok: false, error: dbStatus.message }); return; }
      try {
        const payload = await readMainPayload();
        let studentsArray = payload?.students || [];
        try {
          const dbStudents = await dbPool.query('SELECT payload FROM mst_students');
          if (dbStudents.rows.length > 0) studentsArray = dbStudents.rows.map(r => r.payload);
        } catch(e) {}
        const activeNisList = Array.isArray(studentsArray) ? studentsArray.map(s => String(s.nis)) : [];

        const { rows } = await dbPool.query(`
          SELECT 
            p.nis, p.location_id, p.teacher_code, p.status, p.location_update_count,
            TO_CHAR(p.start_date, 'YYYY-MM-DD') as start_date,
            TO_CHAR(p.end_date, 'YYYY-MM-DD') as end_date,
            COUNT(l.id) FILTER (WHERE l.status = 'approved') as total_hadir,
            0 as total_izin,
            0 as total_absen
          FROM pkl_students p
          LEFT JOIN pkl_logbooks l ON p.nis = l.student_nis
          GROUP BY p.nis, p.location_id, p.teacher_code, p.status, p.location_update_count, p.start_date, p.end_date
        `);
        
        send(req, res, 200, { ok: true, data: rows });
      } catch (err) {
        if (err.code === "42P01") send(req, res, 200, { ok: true, data: [] });
        else sendDatabaseError(req, res, err);
      }
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/monitoring/pkl-students/bulk") {
      const session = getSession(req);
      if (!isAdminRole(session?.role)) return send(req, res, 403, { ok: false, error: "Hanya admin" });
      if (!dbPool) { send(req, res, 503, { ok: false, error: dbStatus.message }); return; }
      const body = await readJsonBody(req);
      const updates = Array.isArray(body.updates) ? body.updates : [];
      try {
        for (const u of updates) {
           await dbPool.query(`
             INSERT INTO pkl_students (nis, location_id, teacher_code, start_date, end_date, status)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (nis) DO UPDATE SET
               location_id = EXCLUDED.location_id,
               teacher_code = EXCLUDED.teacher_code,
               start_date = COALESCE(EXCLUDED.start_date, pkl_students.start_date),
               end_date = COALESCE(EXCLUDED.end_date, pkl_students.end_date),
               status = EXCLUDED.status,
               created_at = CURRENT_TIMESTAMP
           `, [u.nis, u.location_id || null, u.teacher_code || null, u.start_date || null, u.end_date || null, u.status || 'aktif']);
        }
        send(req, res, 200, { ok: true });
      } catch (err) {
        sendDatabaseError(req, res, err);
      }
      return;
    }

    // ── BUG-01 FIX: GET Absensi Kalender Siswa ─────────────────────
    if (req.method === "GET" && url.pathname === "/api/monitoring/absensi/siswa") {
      const session = requireAuthenticated(req, res);
      if (!session) return;
      if (!dbPool) { send(req, res, 503, { ok: false, error: dbStatus.message }); return; }
      try {
        const nis = url.searchParams.get("nis") || session.id || session.username;
        const month = parseInt(url.searchParams.get("month") || new Date().getMonth() + 1);
        const year = parseInt(url.searchParams.get("year") || new Date().getFullYear());

        if (!nis) return send(req, res, 400, { ok: false, error: "Parameter NIS diperlukan." });

        const daysInMonth = new Date(year, month, 0).getDate();

        // Ambil data absensi dari kedisiplinan_absensi (izin/sakit/alpa)
        const { rows: manualRows } = await dbPool.query(
          `SELECT TO_CHAR(tanggal, 'YYYY-MM-DD') as tanggal, status, keterangan
           FROM kedisiplinan_absensi
           WHERE siswa_nis = $1 AND EXTRACT(MONTH FROM tanggal) = $2 AND EXTRACT(YEAR FROM tanggal) = $3
             AND approval_status = 'approved'`,
          [String(nis), month, year]
        );

        // Ambil data hadir dari hikvision_logs (siswa tap mesin)
        const { rows: hikRows } = await dbPool.query(
          `SELECT TO_CHAR(timestamp AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD') as tanggal,
                  TO_CHAR(MIN(timestamp AT TIME ZONE 'Asia/Jakarta'), 'HH24:MI') as time_in,
                  TO_CHAR(MAX(timestamp AT TIME ZONE 'Asia/Jakarta'), 'HH24:MI') as time_out
           FROM hikvision_logs hl
           JOIN hikvision_devices hd ON hl.device_id = hd.id
           WHERE hl.employee_id = $1
             AND EXTRACT(MONTH FROM timestamp AT TIME ZONE 'Asia/Jakarta') = $2
             AND EXTRACT(YEAR FROM timestamp AT TIME ZONE 'Asia/Jakarta') = $3
             AND hd.device_type = 'siswa'
           GROUP BY TO_CHAR(timestamp AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD')`,
          [String(nis), month, year]
        );

        // Ambil absensi manual PKL (dari tabel pkl_logbooks)
        const { rows: logbookRows } = await dbPool.query(
          `SELECT TO_CHAR(tanggal, 'YYYY-MM-DD') as tanggal, jam_masuk, jam_keluar, status
           FROM pkl_logbooks
           WHERE student_nis = $1 AND EXTRACT(MONTH FROM tanggal) = $2 AND EXTRACT(YEAR FROM tanggal) = $3`,
          [String(nis), month, year]
        ).catch(() => ({ rows: [] }));

        // Ambil config batas waktu
        let masukLate = "07:15";
        try {
          const confRes = await dbPool.query("SELECT data FROM app_data WHERE store_key = 'hikvision_attendance_config' LIMIT 1");
          if (confRes.rowCount > 0 && confRes.rows[0].data) {
            const conf = typeof confRes.rows[0].data === 'string' ? JSON.parse(confRes.rows[0].data) : confRes.rows[0].data;
            masukLate = conf?.siswa?.masuk_late || conf?.masuk_late || "07:15";
          }
        } catch (e) {}

        const manualMap = {};
        for (const r of manualRows) manualMap[r.tanggal] = r;
        const hikMap = {};
        for (const r of hikRows) hikMap[r.tanggal] = r;
        const logbookMap = {};
        for (const r of logbookRows) logbookMap[r.tanggal] = r;

        const records = {};
        let hadir = 0, terlambat = 0, izinSakit = 0, alpa = 0;

        for (let day = 1; day <= daysInMonth; day++) {
          const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const dow = new Date(year, month - 1, day).getDay();

          if (dow === 0 || dow === 6) {
            records[dateStr] = { status: 'Libur Akhir Pekan', isLibur: true };
            continue;
          }

          const manual = manualMap[dateStr];
          const hik = hikMap[dateStr];
          const logbook = logbookMap[dateStr];

          if (manual) {
            const st = String(manual.status || '').toUpperCase();
            if (st.includes('IZIN') || st.includes('SAKIT')) {
              records[dateStr] = { status: 'Izin/Sakit', isIzin: true };
              izinSakit++;
            } else if (st.includes('ALPA')) {
              records[dateStr] = { status: 'Alpa', isAlpa: true };
              alpa++;
            }
          } else if (hik) {
            const timeIn = hik.time_in || '';
            const isLate = timeIn > masukLate;
            if (isLate) {
              records[dateStr] = { status: 'Terlambat', isLate: true, timeIn, timeOut: hik.time_out };
              terlambat++;
            } else {
              records[dateStr] = { status: 'Tepat Waktu', isHadir: true, timeIn, timeOut: hik.time_out };
              hadir++;
            }
          } else if (logbook) {
            const st = String(logbook.status || 'HADIR').toUpperCase();
            if (st.includes('SAKIT') || st.includes('IZIN')) {
              records[dateStr] = { status: 'Izin/Sakit', isIzin: true, timeIn: logbook.jam_masuk };
              izinSakit++;
            } else {
              records[dateStr] = { status: 'Tepat Waktu', isHadir: true, timeIn: logbook.jam_masuk, timeOut: logbook.jam_keluar };
              hadir++;
            }
          }
        }

        send(req, res, 200, {
          ok: true,
          data: { records, summary: { hadir, terlambat, izinSakit, alpa } },
          daysInMonth
        });
      } catch (err) {
        console.error("[Absensi Siswa] Error:", err);
        sendDatabaseError(req, res, err);
      }
      return;
    }

    // ── BUG-01 FIX: POST Check-in Absensi PKL Siswa ────────────────
    if (req.method === "POST" && url.pathname === "/api/monitoring/absensi/checkin") {
      const session = requireAuthenticated(req, res);
      if (!session) return;
      if (session.role !== "siswa") return send(req, res, 403, { ok: false, error: "Hanya siswa yang dapat melakukan absensi." });
      if (!dbPool) { send(req, res, 503, { ok: false, error: dbStatus.message }); return; }
      try {
        const body = await readJsonBody(req);
        const nis = session.id || session.username;
        const type = body.type === 'pulang' ? 'pulang' : 'masuk';
        const method = body.method || 'GPS';
        const lat = body.lat || null;
        const lng = body.lng || null;
        const nowJkt = new Date(Date.now() + 7 * 60 * 60 * 1000);
        const todayStr = nowJkt.toISOString().slice(0, 10);
        const timeStr = nowJkt.toISOString().slice(11, 16);

        // Validasi: pastikan siswa terdaftar PKL
        const { rows: pklRows } = await dbPool.query(
          "SELECT nis, status FROM pkl_students WHERE nis = $1 AND status = 'aktif'",
          [String(nis)]
        );
        if (pklRows.length === 0) {
          return send(req, res, 400, { ok: false, error: "Anda belum terdaftar sebagai peserta PKL aktif." });
        }

        // Cek duplikat absensi hari ini (mencegah double checkin)
        const { rows: existing } = await dbPool.query(
          `SELECT id FROM kedisiplinan_absensi
           WHERE siswa_nis = $1 AND tanggal = $2 AND keterangan LIKE $3`,
          [String(nis), todayStr, `%${type}%`]
        );

        if (existing.length > 0) {
          return send(req, res, 409, { ok: false, error: `Anda sudah melakukan absen ${type} hari ini.` });
        }

        // Tentukan status berdasarkan waktu
        let status = 'Hadir';
        let masukLate = "07:15";
        try {
          const confRes = await dbPool.query("SELECT data FROM app_data WHERE store_key = 'hikvision_attendance_config' LIMIT 1");
          if (confRes.rowCount > 0 && confRes.rows[0].data) {
            const conf = typeof confRes.rows[0].data === 'string' ? JSON.parse(confRes.rows[0].data) : confRes.rows[0].data;
            masukLate = conf?.siswa?.masuk_late || conf?.masuk_late || "07:15";
          }
        } catch (e) {}

        if (type === 'masuk' && timeStr > masukLate) status = 'Terlambat';

        const keterangan = `Absen ${type} via ${method} pukul ${timeStr}${lat ? ` | GPS: ${lat},${lng}` : ''}`;

        await dbPool.query(
          `INSERT INTO kedisiplinan_absensi (siswa_nis, tanggal, status, keterangan, pelapor_id, pelapor_nama, approval_status)
           VALUES ($1, $2, $3, $4, $5, $6, 'approved')`,
          [String(nis), todayStr, status, keterangan, String(nis), 'Siswa (Self-checkin)']
        );

        // Log selfie jika ada (hanya referensi)
        if (body.selfiePhoto && body.selfiePhoto.length > 50) {
          // Simpan referensi saja (bukan gambar penuh) untuk efisiensi
          await dbPool.query(
            "UPDATE kedisiplinan_absensi SET keterangan = keterangan || ' | Selfie: ✓' WHERE siswa_nis = $1 AND tanggal = $2 ORDER BY created_at DESC LIMIT 1",
            [String(nis), todayStr]
          );
        }

        await logAudit(dbPool, session, req, "CHECKIN_ABSENSI", "kedisiplinan_absensi",
          `Siswa ${nis} absen ${type} via ${method} pada ${todayStr} ${timeStr} | Status: ${status}`);

        send(req, res, 200, { ok: true, status, time: timeStr, type, message: `Absen ${type} berhasil dicatat.` });
      } catch (err) {
        console.error("[Absensi Checkin] Error:", err);
        sendDatabaseError(req, res, err);
      }
      return;
    }

    // ── PKL Dashboard Stats ─────────────────────────────────────────

    // ── Dashboard Logs (Login, Absen Guru, Siswa Terlambat, Siswa Bermasalah) ───
    if (req.method === "GET" && url.pathname === "/api/dashboard/logs") {
      const session = requireAuthenticated(req, res);
      if (!session) return;
      try {
        global._dashLogsCache = global._dashLogsCache || { time: 0, data: null };
        if (Date.now() - global._dashLogsCache.time < 30000 && global._dashLogsCache.data) {
          return send(req, res, 200, global._dashLogsCache.data);
        }
        let loginLogs = [];
        let teacherAbsenceLogs = [];
        let latestStudentLogs = [];
        let problematicStudentLogs = [];
        let achievingStudentLogs = [];

        // Fetch main store payload for student & teacher names
        let students = [];
        let teachers = [];
        let rawTeacherAbsenceLogs = [];
        let mainData = {};
        try {
          if (!dbPool) throw createDatabaseUnavailableError();
          const storeRes = await dbPool.query("SELECT data FROM app_data WHERE store_key = 'main_store'");
          mainData = storeRes.rows[0]?.data ? (typeof storeRes.rows[0].data === 'string' ? JSON.parse(storeRes.rows[0].data) : storeRes.rows[0].data) : {};
          students = mainData.students || [];
          try {
             const dbS = await dbPool.query('SELECT payload FROM mst_students');
             if (dbS.rows.length > 0) students = dbS.rows.map(r => r.payload);
          } catch(e) {}
          teachers = mainData.teachers || [];
          try {
             const dbT = await dbPool.query('SELECT payload FROM mst_teachers');
             if (dbT.rows.length > 0) teachers = dbT.rows.map(r => r.payload);
          } catch(e) {}
          try {
             const guruAbsenceRes = await dbPool.query(`
                SELECT record_id as id, teacher_code as "teacherCode", TO_CHAR(tanggal, 'YYYY-MM-DD') as date, waktu::text as time, session_name as "sessionName", status, mode, note 
                FROM guru_attendance_records 
                ORDER BY tanggal DESC, waktu DESC 
                LIMIT 50
             `);
             rawTeacherAbsenceLogs = guruAbsenceRes.rows;
          } catch(e) {}
        } catch (e) {
          console.error("Failed to read main store for dashboard logs:", e);
        }

        const academicCalendar = mainData.academicCalendar || [];
        const calendarCategories = mainData.calendarCategories || [];

        const getStudentInfo = (nis) => {
          if (!nis) return { name: '-', class_name: '' };
          const strNis = String(nis).trim().toLowerCase();
          
          let s = students.find(x => {
            const xNis = String(x.nis || x.code || x.id || '').trim().toLowerCase();
            return xNis === strNis;
          });
          
          if (!s && strNis.length >= 4) {
            s = students.find(x => {
              const xNis = String(x.nis || x.code || x.id || '').trim().toLowerCase();
              return xNis && (xNis.endsWith(strNis) || strNis.endsWith(xNis));
            });
          }

          if (s) {
            return {
              name: s.name || s.nama || nis,
              class_name: s.kelas || s.class_name || ''
            };
          }
          return { name: String(nis), class_name: '' };
        };

        const getStudentName = (nis) => getStudentInfo(nis).name;

        const getTeacherName = (code) => {
          const t = teachers.find(x => String(x.code).trim() === String(code).trim());
          return t ? t.name : code;
        };

        const getJakartaDateStr = (val) => {
          if (!val) return "";
          const d = new Date(val);
          if (isNaN(d.getTime())) return "";
          if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
          return new Date(d.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
        };

        const isDateHoliday = (dateVal) => {
          const dateStr = getJakartaDateStr(dateVal);
          if (!dateStr) return false;
          
          const d = new Date(dateStr);
          const day = d.getDay();
          if (day === 0 || day === 6) return true;

          return academicCalendar.some(evt => {
            const start = evt.dateStart;
            const end = evt.dateEnd || evt.dateStart;
            if (dateStr >= start && dateStr <= end) {
              const cat = calendarCategories.find(c => c.id === evt.categoryId);
              const catName = cat ? String(cat.name).toLowerCase() : "";
              const title = String(evt.title).toLowerCase();
              return catName.includes("libur") || title.includes("libur");
            }
            return false;
          });
        };

        // 1. Try login logs (only for admins)
        if (session.role === "admin" || session.role === "superadmin") {
          try {
            const loginRes = await dbPool.query(`
              SELECT username, role, created_at as time, 'success' as status
              FROM login_logs
              ORDER BY created_at DESC LIMIT 20
            `);
            loginLogs = loginRes.rows;
          } catch {
            await dbPool.query(`
              CREATE TABLE IF NOT EXISTS login_logs (
                id SERIAL PRIMARY KEY,
                username TEXT,
                role TEXT,
                ip TEXT,
                created_at TIMESTAMPTZ DEFAULT NOW()
              )
            `);
            
            await dbPool.query(`
              CREATE TABLE IF NOT EXISTS push_subscriptions (
                id SERIAL PRIMARY KEY,
                user_id VARCHAR(50) NOT NULL,
                user_role VARCHAR(20) NOT NULL,
                endpoint TEXT NOT NULL UNIQUE,
                p256dh TEXT NOT NULL,
                auth TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
              )
            `);
            loginLogs = [];
          }
        } else {
          loginLogs = [];
        }

        // 2. Teacher absence (absences where guru status is not 'Hadir' or 'Masuk')
        try {
          teacherAbsenceLogs = rawTeacherAbsenceLogs
            .filter(r => r.status && r.status.toLowerCase() !== 'hadir' && r.status.toLowerCase() !== 'masuk' && !isDateHoliday(r.date))
            .map(r => ({
              nis: r.teacherCode || r.username,
              name: getTeacherName(r.teacherCode || r.username),
              username: r.teacherCode || r.username,
              status: r.status,
              date: r.date,
              created_at: r.created_at || r.date
            }))
            .slice(0, 20);
        } catch (e) {
          teacherAbsenceLogs = [];
        }

        // 2.2 Calculate teacher attendance rankings
        let teacherAttendanceRankings = [];
        try {
          const teacherMap = new Map();
          teachers.forEach(t => {
            teacherMap.set(String(t.code).trim(), {
              code: t.code,
              name: t.name || t.code,
              type: t.type || 'Umum',
              hadir: 0,
              sakit: 0,
              izin: 0,
              alpa: 0,
              total_absen: 0
            });
          });

          rawTeacherAbsenceLogs.forEach(r => {
            const key = String(r.teacherCode || r.username).trim();
            if (teacherMap.has(key)) {
              const val = teacherMap.get(key);
              const status = String(r.status || '').toLowerCase();
              if (status === 'hadir' || status === 'masuk') {
                val.hadir += 1;
              } else if (status === 'sakit') {
                val.sakit += 1;
                val.total_absen += 1;
              } else if (status === 'izin') {
                val.izin += 1;
                val.total_absen += 1;
              } else if (status === 'alpa' || status === 'alpha') {
                val.alpa += 1;
                val.total_absen += 1;
              } else if (status !== '') {
                val.total_absen += 1;
              }
            }
          });

          teacherAttendanceRankings = Array.from(teacherMap.values())
            .sort((a, b) => {
              if (b.total_absen !== a.total_absen) {
                return b.total_absen - a.total_absen;
              }
              return b.hadir - a.hadir;
            })
            .slice(0, 10);
        } catch (e) {
          console.error("Failed to calculate teacher attendance rankings:", e);
        }

        // 3. Late students (terlambat)
        try {
          let hConfig = {};
          try {
            const configRes = await dbPool.query("SELECT data FROM app_data WHERE store_key = 'hikvision_config' LIMIT 1");
            if (configRes.rowCount > 0 && configRes.rows[0].data) hConfig = JSON.parse(configRes.rows[0].data);
          } catch (e) {}
          const masukLate = hConfig?.siswa?.masuk_late || "07:15";
          const masukClose = hConfig?.siswa?.masuk_close || "12:00";

          const lateRes = await dbPool.query(`
            SELECT student_nis as nis, status, created_at
            FROM attendances
            WHERE status = 'terlambat'
            ORDER BY created_at DESC LIMIT 50
          `);
          
          const hLateRes = await dbPool.query(`
            SELECT employee_id as nis, 'terlambat' as status, timestamp as created_at
            FROM hikvision_logs
            WHERE person_type = 'siswa'
            AND CAST(timestamp AS TIME) > $1
            AND CAST(timestamp AS TIME) <= $2
            ORDER BY timestamp DESC LIMIT 50
          `, [masukLate + ":00", masukClose + ":00"]);
          
          const combined = [...lateRes.rows, ...hLateRes.rows].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

          latestStudentLogs = combined
            .map(r => {
              const info = getStudentInfo(r.nis);
              return {
                nis: r.nis,
                name: info.name,
                student_name: info.name,
                class_name: info.class_name,
                username: r.nis,
                status: r.status,
                created_at: r.created_at
              };
            })
            .filter(r => !isDateHoliday(r.created_at))
            .slice(0, 20);
        } catch (err) {
          console.error(err);
          latestStudentLogs = [];
        }

        // 3.2 Student absence logs (Sakit, Izin, Alpa)
        let studentAbsenceLogs = [];
        try {
          const sAbsRes = await dbPool.query(`
            SELECT siswa_nis as nis, status, tanggal as date, created_at, keterangan, pelapor_nama
            FROM kedisiplinan_absensi
            ORDER BY tanggal DESC, id DESC LIMIT 100
          `);
          studentAbsenceLogs = sAbsRes.rows
            .map(r => ({
              nis: r.nis,
              name: getStudentName(r.nis),
              status: r.status,
              date: r.date,
              keterangan: r.keterangan,
              pelapor_nama: r.pelapor_nama,
              created_at: r.created_at || r.date
            }))
            .filter(r => !isDateHoliday(r.date))
            .slice(0, 20);
        } catch (e) {
          console.error("Failed to fetch studentAbsenceLogs:", e);
        }

        // 3.3 Calculate student attendance rankings
        let studentAttendanceRankings = [];
        try {
          let startDate = null;
          try {
            const startRes = await dbPool.query("SELECT value FROM school_profile WHERE key = 'attendance_start_date' LIMIT 1");
            if (startRes.rows.length > 0 && startRes.rows[0].value) {
              startDate = startRes.rows[0].value;
            }
          } catch (err) {
            console.warn("Gagal membaca tanggal mulai absensi:", err.message);
          }

          // Get count of Sakit, Izin, Alpha for each student from kedisiplinan_absensi
          let absQuery = `
            SELECT siswa_nis as nis, 
                   SUM(CASE WHEN status = 'Alpa' OR status = 'Alpha' THEN 1 ELSE 0 END) as alpha,
                   SUM(CASE WHEN status = 'Izin' THEN 1 ELSE 0 END) as izin,
                   SUM(CASE WHEN status = 'Sakit' THEN 1 ELSE 0 END) as sakit,
                   COUNT(*) as total_tidak_hadir
            FROM kedisiplinan_absensi
          `;
          let absParams = [];
          if (startDate) {
            absQuery += " WHERE tanggal >= $1 ";
            absParams.push(startDate);
          }
          absQuery += " GROUP BY siswa_nis ";
          const absRes = await dbPool.query(absQuery, absParams);

          // Get count of lates from attendances
          let lateQuery = `
            SELECT student_nis as nis, COUNT(*) as late_count
            FROM attendances
            WHERE status = 'terlambat'
          `;
          let lateParams = [];
          if (startDate) {
            lateQuery += " AND created_at::date >= $1 ";
            lateParams.push(startDate);
          }
          lateQuery += " GROUP BY student_nis ";
          const lateRes = await dbPool.query(lateQuery, lateParams);

          const studentMap = new Map();
          students.forEach(s => {
            studentMap.set(String(s.nis).trim(), {
              nis: s.nis,
              name: s.namaSiswa || s.name || s.nis,
              class_name: s.class_name || '-',
              alpha: 0,
              izin: 0,
              sakit: 0,
              terlambat: 0,
              total_absen: 0
            });
          });

          absRes.rows.forEach(r => {
            const key = String(r.nis).trim();
            if (studentMap.has(key)) {
              const val = studentMap.get(key);
              val.alpha = parseInt(r.alpha) || 0;
              val.izin = parseInt(r.izin) || 0;
              val.sakit = parseInt(r.sakit) || 0;
              val.total_absen += (val.alpha + val.izin + val.sakit);
            } else {
              studentMap.set(key, {
                nis: r.nis,
                name: getStudentName(r.nis),
                class_name: '-',
                alpha: parseInt(r.alpha) || 0,
                izin: parseInt(r.izin) || 0,
                sakit: parseInt(r.sakit) || 0,
                terlambat: 0,
                total_absen: (parseInt(r.alpha) || 0) + (parseInt(r.izin) || 0) + (parseInt(r.sakit) || 0)
              });
            }
          });

          lateRes.rows.forEach(r => {
            const key = String(r.nis).trim();
            if (studentMap.has(key)) {
              const val = studentMap.get(key);
              val.terlambat = parseInt(r.late_count) || 0;
              val.total_absen += val.terlambat;
            } else {
              studentMap.set(key, {
                nis: r.nis,
                name: getStudentName(r.nis),
                class_name: '-',
                alpha: 0,
                izin: 0,
                sakit: 0,
                terlambat: parseInt(r.late_count) || 0,
                total_absen: parseInt(r.late_count) || 0
              });
            }
          });

          studentAttendanceRankings = Array.from(studentMap.values())
            .sort((a, b) => {
              if (b.total_absen !== a.total_absen) {
                return b.total_absen - a.total_absen;
              }
              return String(a.name).localeCompare(String(b.name));
            })
            .slice(0, 10);
        } catch (e) {
          console.error("Failed to calculate student attendance rankings:", e);
        }

        // 4. Problematic students (points violations + alpha)
        try {
          let pointsList = [];
          try {
            const pointsRes = await dbPool.query(`
              SELECT siswa_nis as nis, SUM(poin) as total_poin, MAX(created_at) as last_seen
              FROM kedisiplinan_riwayat_poin
              GROUP BY siswa_nis
              ORDER BY total_poin DESC LIMIT 20
            `);
            pointsList = pointsRes.rows;
          } catch (e) {
            console.error("pointsList query error:", e);
          }

          let alphaList = [];
          try {
            const alphaRes = await dbPool.query(`
              SELECT student_nis as nis, COUNT(*) as total_alpha, MAX(created_at) as last_seen
              FROM attendances
              WHERE status IN ('absen', 'alpha')
              GROUP BY student_nis
              HAVING COUNT(*) >= 2
              ORDER BY total_alpha DESC LIMIT 20
            `);
            alphaList = alphaRes.rows;
          } catch (e) {
            console.error("alphaList query error:", e);
          }

          const mergedProblems = new Map();
          pointsList.forEach(r => {
            const sInfo = getStudentInfo(r.nis);
            const sName = sInfo.name;
            if (sName && String(sName).trim() !== String(r.nis).trim()) {
              mergedProblems.set(r.nis, {
                nis: r.nis,
                name: sName,
                class_name: sInfo.class_name,
                total_alpha: `${r.total_poin} poin`,
                last_seen: r.last_seen
              });
            }
          });

          alphaList.forEach(r => {
            const sInfo = getStudentInfo(r.nis);
            const sName = sInfo.name;
            if (sName && String(sName).trim() !== String(r.nis).trim()) {
              const existing = mergedProblems.get(r.nis);
              if (existing) {
                existing.total_alpha = `${existing.total_alpha} / ${r.total_alpha}x alpha`;
                if (new Date(r.last_seen) > new Date(existing.last_seen)) {
                  existing.last_seen = r.last_seen;
                }
              } else {
                mergedProblems.set(r.nis, {
                  nis: r.nis,
                  name: sName,
                  class_name: sInfo.class_name,
                  total_alpha: `${r.total_alpha}x alpha`,
                  last_seen: r.last_seen
                });
              }
            }
          });

          problematicStudentLogs = Array.from(mergedProblems.values())
            .sort((a, b) => new Date(b.last_seen) - new Date(a.last_seen))
            .slice(0, 20);
            
          // --- ROW-LEVEL FILTERING: Kesiswaan/Kepsek/Admin sees all, Guru sees only their class ---
          const role = normalizeServerRole(session.role);
          const isKesiswaanOrAdmin = ['admin', 'superadmin', 'kepsek'].includes(role) || 
                                     (role === 'waka' && (session.division || "").toLowerCase() === 'kesiswaan') || 
                                     (role || "").includes('kesiswaan');
                                     
          if (!isKesiswaanOrAdmin) {
            if (role === 'guru') {
              try {
                // Find out which class this guru is the homeroom teacher of
                const wRes = await dbPool.query(`SELECT payload->>'name' as class_name FROM mst_classes WHERE payload->>'homeroom' = $1 OR payload->>'homeroom' = $2`, [session.username, String(session.username)]);
                const waliClasses = wRes.rows.map(r => r.class_name);
                if (waliClasses.length > 0) {
                  problematicStudentLogs = problematicStudentLogs.filter(log => waliClasses.includes(log.class_name));
                } else {
                  problematicStudentLogs = [];
                }
              } catch (e) {
                console.error("Wali kelas filtering error:", e);
                problematicStudentLogs = [];
              }
            } else {
              // Other roles like TU, Staff, Siswa shouldn't see it at all
              problematicStudentLogs = [];
            }
          }
        } catch (e) {
          console.error("Failed to construct problematicStudentLogs:", e);
          problematicStudentLogs = [];
        }

        // 5. Achieving students (Prestasi)
        try {
          const prestasiRes = await dbPool.query(`
            SELECT siswa_nis as nis, nama_prestasi, peringkat, tingkat, penyelenggara, tanggal_prestasi, created_at
            FROM kesiswaan_prestasi
            ORDER BY created_at DESC LIMIT 20
          `);
          achievingStudentLogs = prestasiRes.rows.map(r => ({
            nis: r.nis,
            name: getStudentName(r.nis),
            nama_prestasi: r.nama_prestasi,
            peringkat: r.peringkat,
            tingkat: r.tingkat,
            penyelenggara: r.penyelenggara,
            tanggal_prestasi: r.tanggal_prestasi,
            created_at: r.created_at
          }));
        } catch (e) {
          console.error("Failed to fetch achievingStudentLogs:", e);
          achievingStudentLogs = [];
        }

        let auditLogs = [];
        let backupErrors = [];
        if (session.role === "admin" || session.role === "superadmin") {
          try {
            const auditRes = await dbPool.query(`
              SELECT user_name, user_role, action, target_type, detail, created_at as time
              FROM audit_logs
              ORDER BY created_at DESC LIMIT 20
            `);
            auditLogs = auditRes.rows;
            
            const backupErrRes = await dbPool.query(`
              SELECT action, detail, created_at as time
              FROM audit_logs
              WHERE action LIKE '%BACKUP_ERROR%' AND created_at >= NOW() - INTERVAL '7 days'
              ORDER BY created_at DESC
            `);
            backupErrors = backupErrRes.rows;
          } catch (e) {
            console.error("Failed to fetch auditLogs for dashboard:", e);
            auditLogs = [];
            backupErrors = [];
          }
        }

        let hikvisionStudentToday = [];
        let teacherLogs = [];
        const todayJktDate = new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
        try {
          let hConfig = {};
          try {
            const configRes = await dbPool.query("SELECT data FROM app_data WHERE store_key = 'hikvision_attendance_config' LIMIT 1");
            if (configRes.rowCount > 0 && configRes.rows[0].data) {
              hConfig = typeof configRes.rows[0].data === 'string' ? JSON.parse(configRes.rows[0].data) : configRes.rows[0].data;
            }
          } catch (e) {}
          const siswaMasukLate = (hConfig?.siswa?.masuk_late || "07:15") + ":00";
          const siswaMasukClose = (hConfig?.siswa?.masuk_end || hConfig?.siswa?.masuk_close || hConfig?.masuk_close || "08:00") + ":00";

          const guruMasukLate = (hConfig?.guru?.masuk_late || hConfig?.masuk_late || "07:00") + ":00";
          const guruMasukClose = (hConfig?.guru?.masuk_end || hConfig?.guru?.masuk_close || hConfig?.masuk_close || "08:00") + ":00";

          const karyawanMasukLate = (hConfig?.karyawan?.masuk_late || hConfig?.masuk_late || "07:00") + ":00";
          const karyawanMasukClose = (hConfig?.karyawan?.masuk_end || hConfig?.karyawan?.masuk_close || hConfig?.masuk_close || "08:00") + ":00";

          const todayLogsRes = await dbPool.query(`
            SELECT l.*, d.ip_address, d.device_type,
              COALESCE(
                (SELECT COALESCE(payload->>'name', payload->>'nama') FROM mst_students 
                 WHERE payload->>'nis' = l.employee_id 
                    OR payload->>'code' = l.employee_id 
                    OR id = l.employee_id 
                    OR (CHAR_LENGTH(l.employee_id) >= 4 AND (payload->>'nis' LIKE '%' || l.employee_id OR l.employee_id LIKE '%' || (payload->>'nis')))
                 LIMIT 1),
                (SELECT name FROM hikvision_students 
                 WHERE nis = l.employee_id 
                    OR (CHAR_LENGTH(l.employee_id) >= 4 AND (nis LIKE '%' || l.employee_id OR l.employee_id LIKE '%' || nis))
                 LIMIT 1),
                (SELECT COALESCE(payload->>'name', payload->>'nama') FROM mst_teachers 
                 WHERE payload->>'code' = l.employee_id OR payload->>'nip' = l.employee_id OR payload->>'id' = l.employee_id LIMIT 1),
                (SELECT COALESCE(payload->>'name', payload->>'nama') FROM mst_staffs 
                 WHERE payload->>'staff_code' = l.employee_id OR payload->>'code' = l.employee_id OR payload->>'id' = l.employee_id LIMIT 1),
                l.employee_id
              ) as student_name,

              COALESCE(
                (SELECT COALESCE(payload->>'name', payload->>'nama') FROM mst_students 
                 WHERE payload->>'nis' = l.employee_id 
                    OR payload->>'code' = l.employee_id 
                    OR id = l.employee_id 
                    OR (CHAR_LENGTH(l.employee_id) >= 4 AND (payload->>'nis' LIKE '%' || l.employee_id OR l.employee_id LIKE '%' || (payload->>'nis')))
                 LIMIT 1),
                (SELECT name FROM hikvision_students 
                 WHERE nis = l.employee_id 
                    OR (CHAR_LENGTH(l.employee_id) >= 4 AND (nis LIKE '%' || l.employee_id OR l.employee_id LIKE '%' || nis))
                 LIMIT 1),
                (SELECT COALESCE(payload->>'name', payload->>'nama') FROM mst_teachers 
                 WHERE payload->>'code' = l.employee_id OR payload->>'nip' = l.employee_id OR payload->>'id' = l.employee_id LIMIT 1),
                (SELECT COALESCE(payload->>'name', payload->>'nama') FROM mst_staffs 
                 WHERE payload->>'staff_code' = l.employee_id OR payload->>'code' = l.employee_id OR payload->>'id' = l.employee_id LIMIT 1),
                l.employee_id
              ) as name,

              COALESCE(
                (SELECT COALESCE(payload->>'kelas', payload->>'class_name') FROM mst_students 
                 WHERE payload->>'nis' = l.employee_id 
                    OR payload->>'code' = l.employee_id 
                    OR id = l.employee_id 
                    OR (CHAR_LENGTH(l.employee_id) >= 4 AND (payload->>'nis' LIKE '%' || l.employee_id OR l.employee_id LIKE '%' || (payload->>'nis')))
                 LIMIT 1),
                (SELECT class_name FROM hikvision_students 
                 WHERE (nis = l.employee_id OR (CHAR_LENGTH(l.employee_id) >= 4 AND (nis LIKE '%' || l.employee_id OR l.employee_id LIKE '%' || nis)))
                   AND class_name IS NOT NULL AND class_name != 'siswa'
                 LIMIT 1),
                '-'
              ) as class_name,

              l.employee_id as username,
              CASE 
                WHEN EXISTS(SELECT 1 FROM mst_staffs WHERE payload->>'staff_code' = l.employee_id OR payload->>'code' = l.employee_id OR payload->>'id' = l.employee_id) THEN 'karyawan'
                WHEN EXISTS(SELECT 1 FROM mst_teachers WHERE payload->>'code' = l.employee_id OR payload->>'nip' = l.employee_id OR payload->>'id' = l.employee_id) THEN 'guru'
                WHEN d.device_type = 'karyawan' THEN 'karyawan'
                WHEN d.device_type = 'guru' THEN 'guru'
                ELSE 'siswa'
              END as true_person_type
            FROM hikvision_logs l 
            JOIN hikvision_devices d ON l.device_id = d.id 
            WHERE timestamp::date = $1::date
            ORDER BY l.timestamp DESC
          `, [todayJktDate]);

          const allTodayRows = todayLogsRes.rows.map(r => {
            const scanTime = new Date(r.timestamp).toLocaleTimeString('en-GB', { timeZone: 'Asia/Jakarta' });
            const personType = String(r.true_person_type).toLowerCase();
            
            let lateLimit = siswaMasukLate;
            let closeLimit = siswaMasukClose;
            if (personType === 'karyawan') {
              lateLimit = karyawanMasukLate;
              closeLimit = karyawanMasukClose;
            } else if (personType === 'guru') {
              lateLimit = guruMasukLate;
              closeLimit = guruMasukClose;
            }

            let status = 'hadir';
            if (closeLimit && scanTime > closeLimit) {
              status = 'alpa';
            } else if (lateLimit && scanTime > lateLimit) {
              status = 'terlambat';
            }

            return {
              ...r,
              status,
              role_type: personType === 'karyawan' ? 'KARYAWAN' : (personType === 'guru' ? 'GURU' : 'SISWA')
            };
          });

          const dedupeLogs = (arr) => {
            const seen = new Set();
            const sorted = [...arr].sort((a, b) => new Date(a.timestamp || a.created_at) - new Date(b.timestamp || b.created_at));
            const unique = [];
            for (const item of sorted) {
              const key = String(item.employee_id || item.username || item.nis || item.name || '').trim().toLowerCase();
              if (!key || seen.has(key)) continue;
              seen.add(key);
              unique.push(item);
            }
            return unique.sort((a, b) => new Date(b.timestamp || b.created_at) - new Date(a.timestamp || a.created_at));
          };

          hikvisionStudentToday = dedupeLogs(allTodayRows.filter(r => String(r.true_person_type).toLowerCase() === 'siswa'));
          teacherLogs = dedupeLogs(allTodayRows.filter(r => String(r.true_person_type).toLowerCase() !== 'siswa'));
        } catch (e) {
          console.error("Error fetching today hikvision logs for dashboard:", e);
        }

        const responseData = {
          ok: true,
          data: { 
            loginLogs, 
            teacherAbsenceLogs, 
            latestStudentLogs, 
            studentAbsenceLogs, 
            problematicStudentLogs, 
            achievingStudentLogs,
            studentAttendanceRankings, 
            teacherAttendanceRankings,
            auditLogs,
            backupErrors,
            hikvisionStudentToday,
            teacherLogs,
            totalStudents: students.length,
            totalTeachers: teachers.length
          }
        };
        global._dashLogsCache.time = Date.now();
        global._dashLogsCache.data = responseData;
        return send(req, res, 200, responseData);
      } catch (err) {
        return sendDatabaseError(req, res, err);
      }
    }


    

    // Admin: approve (verify) a student-submitted PKL location



    // 🧑‍🎓 PKL Student Self-Service Endpoints 🧑‍🎓


    if (req.method === "POST" && url.pathname === "/api/attendances/student") {
      const session = requireAuthenticated(req, res);
      if (!session || session.role !== "siswa") return send(req, res, 403, { ok: false, error: "Hanya siswa" });
      try {
        // Determine today's date string in Jakarta time YYYY-MM-DD
        const todayStr = new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
        const d = new Date(todayStr);
        const day = d.getDay();
        
        // 1. Block weekends (Saturday = 6, Sunday = 0)
        if (day === 0 || day === 6) {
          return send(req, res, 400, { ok: false, error: "Absensi siswa hanya aktif pada hari sekolah (Senin - Jumat)." });
        }

        // 2. Block academic calendar holidays
        const mainRes = await dbPool.query("SELECT data FROM app_data WHERE store_key = 'main_store'");
        if (mainRes.rowCount > 0) {
          const mainData = JSON.parse(mainRes.rows[0].data);
          const academicCalendar = mainData.academicCalendar || [];
          const calendarCategories = mainData.calendarCategories || [];
          
          const isHoliday = academicCalendar.some(evt => {
            const start = evt.dateStart;
            const end = evt.dateEnd || evt.dateStart;
            if (todayStr >= start && todayStr <= end) {
              const cat = calendarCategories.find(c => c.id === evt.categoryId);
              const catName = cat ? String(cat.name).toLowerCase() : "";
              const title = String(evt.title).toLowerCase();
              return catName.includes("libur") || title.includes("libur");
            }
            return false;
          });
          if (isHoliday) {
            return send(req, res, 400, { ok: false, error: "Absensi tidak aktif karena hari ini adalah hari libur sekolah sesuai Kalender Akademik." });
          }
        }

        const body = await readJsonBody(req);
        const nis = session.id || session.username;
        await dbPool.query(`
          INSERT INTO attendances (student_nis, latitude, longitude, status)
          VALUES ($1, $2, $3, $4)
        `, [nis, body.lat, body.lng, body.status || 'hadir']);
        return send(req, res, 200, { ok: true });
      } catch (err) {
        return sendDatabaseError(req, res, err);
      }
    }

    if (req.method === "GET" && url.pathname === "/api/attendances/student") {
      const session = requireAuthenticated(req, res);
      if (!session) return;
      try {
        const nis = session.id || session.username;
        const result = await dbPool.query("SELECT * FROM attendances WHERE student_nis = $1 ORDER BY created_at DESC", [nis]);
        return send(req, res, 200, { ok: true, data: result.rows });
      } catch (err) {
        if (err.code === '42P01') return send(req, res, 200, { ok: true, data: [] });
        return sendDatabaseError(req, res, err);
      }
    }

    // GET /api/attendances — Admin: get all attendance records (with optional date/nis filters)
    if (req.method === "GET" && url.pathname === "/api/attendances") {
      if (!requireAuthenticated(req, res)) return;
      try {
        const nisFilter = url.searchParams.get("nis");
        const dateFilter = url.searchParams.get("date");
        let q = "SELECT * FROM attendances";
        const params = [];
        const conds = [];
        if (nisFilter) { params.push(nisFilter); conds.push(`student_nis = $${params.length}`); }
        if (dateFilter) { params.push(dateFilter); conds.push(`DATE(created_at) = $${params.length}`); }
        if (conds.length) q += " WHERE " + conds.join(" AND ");
        q += " ORDER BY created_at DESC LIMIT 500";
        const result = await dbPool.query(q, params);
        return send(req, res, 200, { ok: true, data: result.rows });
      } catch (err) {
        if (err.code === "42P01") return send(req, res, 200, { ok: true, data: [] });
        return sendDatabaseError(req, res, err);
      }
    }

    // GET /api/pkl/students/:nis — Get single PKL student record by NIS



    // 📓 PKL Logbooks & Submissions 📓📓📓📓📓📓📓📓📓📓📓📓📓📓📓📓📓📓📓📓📓📓📓📓📓📓📓📓📓📓📓📓📓📓📓📓📓📓📓📓📓📓─────────────────────────────────────────
    

    // ── Surat Pengantar PKL ─────────────────────────────────────────




    // ── Konfirmasi PKL (Lapor) ──────────────────────────────────────

    // ── Mutasi PKL (Pindah Tempat) ──────────────────────────────────



    // ── Monitoring public: Data Tempat PKL ──────────────────────────

    if (req.method === "GET" && url.pathname === "/api/monitoring/lokasi-pkl/public") {
      if (!dbPool) { send(req, res, 503, { ok: false, error: dbStatus.message }); return; }
      try {
        const { rows } = await dbPool.query(
          `SELECT id, nama_perusahaan, bidang, alamat, kota, telepon, website, kuota, lat, lng, jurusan, verified, status
           FROM pkl_locations WHERE status = 'aktif' OR status = 'approved' OR verified = true ORDER BY nama_perusahaan`
        );
        send(req, res, 200, { ok: true, data: rows });
      } catch (err) { sendDatabaseError(req, res, err); }
      return;
    }

    // ── Monitoring siswa login via users table ───────────────────────
    if (req.method === "POST" && url.pathname === "/api/auth/login") {
      // Handled above
    }

        // ── HIKVISION ABSENSI API ───────────────────────────────────────










    // ── SYNC GURU/KARYAWAN dari mesin ───────────────────────────────────

    // ── SINKRONISASI LOG HIKVISION GURU → REKAP ABSENSI GURU ─────────────

    // ── HIKVISION CONFIG ──────────────────────────────────────────────


    // ── INPUT MANUAL ABSENSI GURU (IZIN/SAKIT) & NOTIFIKASI ─────────────

    // ── SINKRONISASI NAMA GURU DARI MESIN → mst_teachers ─────────────────


    // ── HIKVISION STUDENTS & MAPPING ──────────────────────────────────



    // ── HIKVISION MATRIX REPORT ───────────────────────────────────────
    // === API KEDISIPLINAN ===

    



    const ctx = { dbPool, send, sendDatabaseError, requireAuthenticated, requireAdmin, requireAdminOrTu, getSession, readJsonBody, readMainPayload, isMonitoringAdmin, isAdminRole, createDatabaseUnavailableError, syncAllUsersToModules, toPublicPayload, sanitizePayload, verifyPassword, createSession, ensureDatabaseReadable, normalizeServerRole, dbStatus, sessions, saveSessions, getBearerToken, logAudit, deleteSessionFromDb };
    
    if (url.pathname.startsWith("/api/data")) {
        const handled = await handleDataRoutes(req, res, url, ctx);
        if (handled !== false) return;
    }
    if (url.pathname.startsWith("/api/auth")) {
        const handled = await handleAuthRoutes(req, res, url, ctx);
        if (handled !== false) return;
    }
    if (url.pathname.startsWith("/api/settings")) {
        const handled = await handleSettingsRoutes(req, res, url, ctx);
        if (handled !== false) return;
    }
    if (url.pathname.startsWith("/api/pkl")) {
        const handled = await handlePklRoutes(req, res, url, ctx);
        if (handled !== false) return;
    }
    if (url.pathname.startsWith("/api/hikvision")) {
        const handled = await handleHikvisionRoutes(req, res, url, ctx);
        if (handled !== false) return;
    }
    if (url.pathname.startsWith("/api/jurnal") || url.pathname === "/api/kedisiplinan/absensi-kelas" || url.pathname === "/api/kesiswaan/catatan-walikelas") {
        const handled = await handleJurnalRoutes(req, res, url, ctx);
        if (handled !== false) return;
    }
    if (url.pathname.startsWith("/api/kedisiplinan/bk")) {
        const handled = await handleBkRoutes(req, res, url, ctx);
        if (handled !== false) return;
    }
    if (url.pathname.startsWith("/api/kedisiplinan") || url.pathname.startsWith("/api/kesiswaan")) {
        const handled = await handleKedisiplinanRoutes(req, res, url, ctx);
        if (handled !== false) return;
    }
    if (url.pathname.startsWith("/api/push")) {
        const handled = await handlePushRoutes(req, res, url, ctx);
        if (handled !== false) return;
    }

    // === API: PROFIL SEKOLAH ===
    if (url.pathname === "/api/school-profile") {
      if (req.method === "GET") {
        try {
          const { rows } = await dbPool.query("SELECT key, value FROM school_profile");
          const profile = {};
          rows.forEach(r => { profile[r.key] = r.value; });
          send(req, res, 200, { ok: true, data: profile });
        } catch (err) { sendDatabaseError(req, res, err); }
        return;
      }
      if (req.method === "POST") {
        if (!requireAdmin(req, res)) return;
        try {
          const body = await readJsonBody(req);
          const session = getSession(req);
          for (const [key, value] of Object.entries(body)) {
            await dbPool.query(
              "INSERT INTO school_profile (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP",
              [key, String(value ?? "")]
            );
          }
          const changedKeys = Object.keys(body).join(', ');
          await logAudit(dbPool, session, req, 'UPDATE', 'school_profile', `Memperbarui profil sekolah: ${changedKeys}`);
          send(req, res, 200, { ok: true });
        } catch (err) { sendDatabaseError(req, res, err); }
        return;
      }
    }

    // === API: TAHUN AJARAN ===
    if (url.pathname.startsWith("/api/academic-years")) {
      if (!requireAuthenticated(req, res)) return;
      if (req.method === "GET") {
        try {
          const { rows } = await dbPool.query("SELECT * FROM academic_years ORDER BY created_at DESC");
          send(req, res, 200, { ok: true, data: rows });
        } catch (err) { sendDatabaseError(req, res, err); }
        return;
      }
      if (req.method === "POST") {
        if (!requireAdmin(req, res)) return;
        try {
          const body = await readJsonBody(req);
          const session = getSession(req);
          if (body.action === "delete") {
            await dbPool.query("DELETE FROM academic_years WHERE id = $1", [body.id]);
            send(req, res, 200, { ok: true });
            return;
          }
          if (body.action === "set_active") {
            await dbPool.query("UPDATE academic_years SET is_active = false");
            await dbPool.query("UPDATE academic_years SET is_active = true WHERE id = $1", [body.id]);
            send(req, res, 200, { ok: true });
            return;
          }
          if (body.id) {
            await dbPool.query("UPDATE academic_years SET nama=$1, semester=$2, tanggal_mulai=$3, tanggal_selesai=$4 WHERE id=$5",
              [body.nama, body.semester, body.tanggal_mulai || null, body.tanggal_selesai || null, body.id]);
          } else {
            await dbPool.query("INSERT INTO academic_years (nama, semester, tanggal_mulai, tanggal_selesai, is_active) VALUES ($1,$2,$3,$4,$5)",
              [body.nama, body.semester || "Ganjil", body.tanggal_mulai || null, body.tanggal_selesai || null, body.is_active || false]);
          }
          await dbPool.query("INSERT INTO audit_logs (user_id, user_name, user_role, action, target_type, detail) VALUES ($1,$2,$3,$4,$5,$6)",
            [session?.id || "system", session?.name || "Admin", session?.role || "admin", "UPSERT", "academic_years", `Tahun Ajaran: ${body.nama}`]);
          send(req, res, 200, { ok: true });
        } catch (err) { sendDatabaseError(req, res, err); }
        return;
      }
    }

    // === API: API KEYS / MANAJEMEN INTEGRASI ===
    if (url.pathname.startsWith("/api/api-keys")) {
      if (!requireAdmin(req, res)) return;
      if (req.method === "GET") {
        try {
          const { rows } = await dbPool.query("SELECT id, service_name, service_label, is_active, extra_config, updated_at FROM api_keys ORDER BY service_name ASC");
          send(req, res, 200, { ok: true, data: rows });
        } catch (err) { sendDatabaseError(req, res, err); }
        return;
      }
      if (req.method === "POST") {
        try {
          const body = await readJsonBody(req);
          const session = getSession(req);
          if (body.action === "delete") {
            await dbPool.query("DELETE FROM api_keys WHERE id = $1", [body.id]);
            send(req, res, 200, { ok: true });
            return;
          }
          const maskedKey = body.api_key ? body.api_key.substring(0, 6) + "****" : "";
          if (body.api_key === undefined) {
            await dbPool.query(
              `INSERT INTO api_keys (service_name, service_label, extra_config, is_active)
               VALUES ($1,$2,$3,$4)
               ON CONFLICT (service_name) DO UPDATE SET service_label=$2, extra_config=$3, is_active=$4, updated_at=CURRENT_TIMESTAMP`,
              [body.service_name, body.service_label || body.service_name, JSON.stringify(body.extra_config || {}), body.is_active !== false]
            );
          } else {
            await dbPool.query(
              `INSERT INTO api_keys (service_name, service_label, api_key, extra_config, is_active)
               VALUES ($1,$2,$3,$4,$5)
               ON CONFLICT (service_name) DO UPDATE SET service_label=$2, api_key=$3, extra_config=$4, is_active=$5, updated_at=CURRENT_TIMESTAMP`,
              [body.service_name, body.service_label || body.service_name, body.api_key || "", JSON.stringify(body.extra_config || {}), body.is_active !== false]
            );
          }
          await dbPool.query("INSERT INTO audit_logs (user_id, user_name, user_role, action, target_type, detail) VALUES ($1,$2,$3,$4,$5,$6)",
            [session?.id || "system", session?.name || "Admin", session?.role || "admin", "UPSERT", "api_keys", `API Key ${body.service_name}: ${maskedKey}`]);
          send(req, res, 200, { ok: true });
        } catch (err) { sendDatabaseError(req, res, err); }
        return;
      }
    }
    // === API: POSTGRESQL BACKUP DUMP ===
    if (url.pathname === "/api/backup/postgresql" && req.method === "GET") {
      const queryToken = url.searchParams.get("token");
      const session = getSession(req) || sessions.get(queryToken);
      if (!session || !isAdminRole(session?.role)) {
        send(req, res, 403, { ok: false, error: "Sesi admin diperlukan." });
        return;
      }
      try {
        let dumpSql = `-- PostgreSQL Database Dump
-- Generated on ${new Date().toLocaleString("id-ID")}
-- Application: Kurmon school-system

`;
        
        // 1. Get all tables in public schema
        const tblResult = await dbPool.query(`
          SELECT tablename 
          FROM pg_catalog.pg_tables 
          WHERE schemaname = 'public'
          ORDER BY tablename ASC
        `);
        const tables = tblResult.rows.map(r => r.tablename);
        
        for (const table of tables) {
          dumpSql += `--\n-- Data for table: ${table}\n--\n\n`;
          dumpSql += `TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE;\n\n`;
          
          const { rows } = await dbPool.query(`SELECT * FROM ${table}`);
          if (rows.length > 0) {
            const keys = Object.keys(rows[0]);
            
            for (const row of rows) {
              const values = keys.map(k => {
                const val = row[k];
                if (val === null) return 'NULL';
                if (typeof val === 'object') {
                  return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
                }
                if (typeof val === 'string') {
                  return `'${val.replace(/'/g, "''")}'`;
                }
                if (val instanceof Date) {
                  return `'${val.toISOString()}'`;
                }
                return val;
              });
              dumpSql += `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${values.join(', ')});\n`;
            }
            dumpSql += `\n`;
          }
        }
        
        res.writeHead(200, {
          "Content-Type": "text/plain; charset=utf-8",
          "Content-Disposition": `attachment; filename="kurmon_db_backup_${new Date().toISOString().slice(0,10)}.sql"`
        });
        res.end(dumpSql);
      } catch (err) {
        console.error("PostgreSQL Dump Error:", err);
        sendDatabaseError(req, res, err);
      }
      return;
    }

    // === API: EXCEL BACKUP DUMP ===
    if (url.pathname === "/api/backup/excel" && req.method === "GET") {
      const queryToken = url.searchParams.get("token");
      const session = getSession(req) || sessions.get(queryToken);
      if (!session || !isAdminRole(session?.role)) {
        send(req, res, 403, { ok: false, error: "Sesi admin diperlukan." });
        return;
      }
      try {
        const wb = new ExcelJS.Workbook();

        const addMasterSheet = async (tableName, sheetName, defaultColumns, payloadToRow) => {
          const { rows } = await dbPool.query(`SELECT payload FROM ${tableName}`);
          const sheetData = [defaultColumns];
          rows.forEach(r => {
            const p = typeof r.payload === 'string' ? JSON.parse(r.payload) : r.payload;
            if (p) sheetData.push(payloadToRow(p));
          });
          const ws = wb.addWorksheet(sheetName);
            ws.addRows(sheetData);
        };

        // 1_Jurusan
        const { rows: majorRows } = await dbPool.query(`SELECT payload FROM mst_majors`);
        const jurusanData = [["Nama Jurusan (wajib)"]];
        majorRows.forEach(r => {
          const p = typeof r.payload === 'string' ? JSON.parse(r.payload) : r.payload;
          if (p && p.name) {
            jurusanData.push([p.name]);
          } else if (typeof p === 'string') {
            jurusanData.push([p]);
          }
        });
        const wsJurusan = wb.addWorksheet("1_Jurusan");
        wsJurusan.addRows(jurusanData);

        // 2_Kelas
        await addMasterSheet('mst_classes', '2_Kelas', 
          ["Nama Kelas (wajib)", "Jurusan (pilih dari Data Jurusan)", "Wali Kelas"],
          p => [p.name || "", p.major || "", p.homeroom || ""]
        );

        // 3_Guru
        await addMasterSheet('mst_teachers', '3_Guru', 
          ["Kode Guru (wajib)", "Nama Guru (wajib)", "Password", "Kategori (Umum/Jurusan/Campuran)", "Prioritas Jurusan", "Prioritas Tingkat", "Target JP/Minggu"],
          p => [p.code || "", p.name || "", "", p.type || "Umum", p.preferredMajor || "", p.preferredGrade || "", p.targetWeeklyJp || ""]
        );

        // 4_Mapel
        await addMasterSheet('mst_subjects', '4_Mapel', 
          ["Nama Mapel (wajib)", "Grade (X/XI/XII/Semua)", "Jurusan (Umum/TKR/TKJ/RPL/Akuntansi)", "Praktik? (Ya/Tidak)", "Ruangan Praktik (ID dipisah koma)", "Durasi"],
          p => [p.name || "", p.grade || "", p.major || "", p.isPractical ? "Ya" : "Tidak", p.practicalRooms ? p.practicalRooms.join(",") : "", p.duration || 2]
        );

        // 5_Ruangan
        await addMasterSheet('mst_rooms', '5_Ruangan', 
          ["ID Ruang (wajib)", "Nama Ruangan (wajib)", "Tipe (Teori/Praktik)", "Jurusan (All/TKR/TKJ/RPL/Akuntansi)", "Target Tingkat (Semua/X/XI/XII)", "Prioritas (Ya/Tidak)"],
          p => [p.id || "", p.name || "", p.type || "Teori", p.major || "All", p.grade || "Semua", p.isPriority ? "Ya" : "Tidak"]
        );

        // 6_Beban
        const { rows: loadRows } = await dbPool.query(`SELECT payload FROM app_data WHERE key = 'teaching_loads' LIMIT 1`);
        const loadPayload = loadRows.length > 0 ? (typeof loadRows[0].payload === 'string' ? JSON.parse(loadRows[0].payload) : loadRows[0].payload) : [];
        const loads = Array.isArray(loadPayload) ? loadPayload : (loadPayload?.loads || []);
        const bebanData = [
          ["Kode Guru", "Nama Mapel", "Target Grade (All/X/XI/XII atau X,XI)", "Target Jurusan (All/TKR/TKJ/RPL/Akuntansi)", "Durasi", "Maks Kelas (opsional)"]
        ];
        loads.forEach(l => {
          bebanData.push([l.teacherCode || "", l.subjectName || "", l.targetGrade || "All", l.targetMajor || "All", l.duration || 2, l.maxClasses || ""]);
        });
        const wsBeban = wb.addWorksheet("6_Beban");
        wsBeban.addRows(bebanData);

        // 7_Silabus
        const { rows: syllabusRows } = await dbPool.query(`SELECT payload FROM app_data WHERE key = 'teacher_syllabus' LIMIT 1`);
        const syllabusPayload = syllabusRows.length > 0 ? (typeof syllabusRows[0].payload === 'string' ? JSON.parse(syllabusRows[0].payload) : syllabusRows[0].payload) : [];
        const syllabi = Array.isArray(syllabusPayload) ? syllabusPayload : (syllabusPayload?.entries || []);
        const silabusData = [
          ["Mata Pelajaran (wajib)", "Guru Pengajar (wajib)", "Judul Pertemuan / BAB (wajib)", "Kelas / Semester", "Tujuan Pembelajaran", "Materi Pembelajaran (pisah enter)", "Catatan (opsional)"]
        ];
        syllabi.forEach(s => {
          silabusData.push([s.subjectName || "", s.teacherCode || "", s.title || "", s.classSemester || "", s.objective || "", Array.isArray(s.materials) ? s.materials.join("\n") : (s.materials || ""), s.notes || ""]);
        });
        const wsSilabus = wb.addWorksheet("7_Silabus");
        wsSilabus.addRows(silabusData);

        // 8_Waktu
        const { rows: settingsRows } = await dbPool.query(`SELECT payload FROM app_data WHERE key = 'time_slots' LIMIT 1`);
        const settingsPayload = settingsRows.length > 0 ? (typeof settingsRows[0].payload === 'string' ? JSON.parse(settingsRows[0].payload) : settingsRows[0].payload) : [];
        const timeSlots = Array.isArray(settingsPayload) ? settingsPayload : (settingsPayload?.slots || []);
        const waktuData = [
          ["Hari", "Jam", "Apakah Istirahat?", "Nama Istirahat", "Dihitung Berapa JP?"]
        ];
        timeSlots.forEach(slot => {
          waktuData.push([slot.day || "", slot.timeStr || "", slot.isBreak ? "Ya" : "Tidak", slot.breakName || "", slot.jpCount !== undefined ? slot.jpCount : 1]);
        });
        const wsWaktu = wb.addWorksheet("8_Waktu");
        wsWaktu.addRows(waktuData);

        // 9_Ketersediaan
        const { rows: availRows } = await dbPool.query(`SELECT payload FROM app_data WHERE key = 'teacher_availability' LIMIT 1`);
        const availPayload = availRows.length > 0 ? (typeof availRows[0].payload === 'string' ? JSON.parse(availRows[0].payload) : availRows[0].payload) : {};
        const ketersediaanData = [
          ["Kode Guru", "Mapel Kompetensi", "Hari Tersedia"]
        ];
        Object.entries(availPayload).forEach(([tCode, data]) => {
          ketersediaanData.push([tCode, Array.isArray(data.subjects) ? data.subjects.join(", ") : "", Array.isArray(data.days) ? data.days.join(", ") : ""]);
        });
        const wsKetersediaan = wb.addWorksheet("9_Ketersediaan");
        wsKetersediaan.addRows(ketersediaanData);

        const excelBuffer = await wb.xlsx.writeBuffer();
        
        res.writeHead(200, {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="kurmon_master_backup_${new Date().toISOString().slice(0,10)}.xlsx"`
        });
        res.end(excelBuffer);
      } catch (err) {
        console.error("Excel Dump Error:", err);
        sendDatabaseError(req, res, err);
      }
      return;
    }

    // === API: GDRIVE MANUAL BACKUP ===
    if (url.pathname === "/api/backup-gdrive" && req.method === "POST") {
      if (!requireAdmin(req, res)) return;
      try {
        const { rows } = await dbPool.query("SELECT api_key, extra_config FROM api_keys WHERE service_name = 'google_drive' AND is_active = true LIMIT 1");
        if (rows.length === 0 || !rows[0].api_key) {
          send(req, res, 400, { ok: false, error: "Service Account Google Drive belum disetel/tidak aktif." });
          return;
        }
        let credentials;
        try {
          credentials = JSON.parse(rows[0].api_key);
        } catch (e) {
          send(req, res, 400, { ok: false, error: "Format kredensial Google Drive bukan JSON yang valid." });
          return;
        }

        const backupData = {};
        const tblResult = await dbPool.query("SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public'");
        const tables = tblResult.rows.map(r => r.tablename);
        for (const table of tables) {
          try {
            const result = await dbPool.query(`SELECT * FROM ${table}`);
            backupData[table] = result.rows;
          } catch (err) {}
        }

        const backupJsonStr = JSON.stringify(backupData, null, 2);
        const fileName = `Backup_Kurmon_Manual_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
        
        const auth = new google.auth.GoogleAuth({
          credentials,
          scopes: ['https://www.googleapis.com/auth/drive.file']
        });
        const drive = google.drive({ version: 'v3', auth });
        
        const fileMetadata = { name: fileName };
        if (rows[0].extra_config && rows[0].extra_config.folder_id) {
          fileMetadata.parents = [rows[0].extra_config.folder_id];
        }

        const response = await drive.files.create({
          requestBody: fileMetadata,
          media: { mimeType: 'application/json', body: backupJsonStr },
          fields: 'id, size',
          supportsAllDrives: true
        });

        const session = getSession(req);
        await dbPool.query("INSERT INTO audit_logs (user_id, user_name, user_role, action, target_type, detail) VALUES ($1,$2,$3,$4,$5,$6)",
          [session?.id || 'system', session?.name || 'Admin', session?.role || 'admin', 'GDRIVE_BACKUP_MANUAL', 'database', `Backup manual sukses. ID: ${response.data.id}`]);
        
        send(req, res, 200, { ok: true, data: { id: response.data.id, filename: fileName, size: (backupJsonStr.length / 1024 / 1024).toFixed(2) + ' MB' } });
      } catch (err) { 
        console.error("Manual Backup Error:", err);
        send(req, res, 500, { ok: false, error: err.message }); 
      }
      return;
    }

    // === API: TELEGRAM MANUAL BACKUP ===
    if (req.method === "POST" && url.pathname === "/api/backup-telegram") {
      const session = requireAuthenticated(req, res);
      if (!session) return;
      if (!["admin", "superadmin"].includes(normalizeServerRole(session.role))) {
        send(req, res, 403, { ok: false, error: "Akses ditolak" });
        return;
      }
      try {
        const { rows } = await dbPool.query("SELECT api_key, extra_config FROM api_keys WHERE service_name = 'telegram_backup' AND is_active = true LIMIT 1");
        if (rows.length === 0 || !rows[0].api_key || !rows[0].extra_config?.chat_id) {
          send(req, res, 400, { ok: false, error: "Telegram Backup belum dikonfigurasi atau tidak aktif (Bot Token & Chat ID wajib diisi)." });
          return;
        }

        const botToken = rows[0].api_key;
        const chatId = rows[0].extra_config.chat_id;

        const backupData = {};
        const tblResult = await dbPool.query("SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public'");
        const tables = tblResult.rows.map(r => r.tablename);
        
        for (const table of tables) {
          try {
            const result = await dbPool.query(`SELECT * FROM ${table}`);
            backupData[table] = result.rows;
          } catch (err) {}
        }

        const backupJsonStr = JSON.stringify(backupData, null, 2);
        const fileName = `Backup_Kurmon_Manual_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
        
        const boundary = "----KurmonBackupBoundary" + Date.now().toString(16);
        let multipartBody = "--" + boundary + "\r\n";
        multipartBody += `Content-Disposition: form-data; name="chat_id"\r\n\r\n${chatId}\r\n`;
        multipartBody += "--" + boundary + "\r\n";
        multipartBody += `Content-Disposition: form-data; name="document"; filename="${fileName}"\r\n`;
        multipartBody += "Content-Type: application/json\r\n\r\n";
        multipartBody += backupJsonStr + "\r\n";
        multipartBody += "--" + boundary + "--\r\n";

        const telegramRes = await fetch(`https://api.telegram.org/bot${botToken}/sendDocument`, {
          method: 'POST',
          headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
          body: Buffer.from(multipartBody, 'utf-8')
        });

        const telegramData = await telegramRes.json();
        
        if (!telegramData.ok) {
           throw new Error(telegramData.description || "Gagal mengirim ke Telegram");
        }

        await dbPool.query("INSERT INTO audit_logs (user_id, user_name, user_role, action, target_type, detail) VALUES ($1,$2,$3,$4,$5,$6)",
          [session.id, session.name, session.role, 'TELEGRAM_BACKUP_MANUAL', 'database', `Backup manual sukses dikirim ke Telegram.`]);
        
        send(req, res, 200, { ok: true, data: { filename: fileName, size: (backupJsonStr.length / 1024 / 1024).toFixed(2) + ' MB' } });
      } catch (err) { 
        console.error("Manual Telegram Backup Error:", err);
        send(req, res, 500, { ok: false, error: err.message }); 
      }
      return;
    }

    // === API: RESTORE BACKUP ===
    if (req.method === "POST" && url.pathname === "/api/restore-backup") {
      const session = requireAuthenticated(req, res);
      if (!session) return;
      if (!["admin", "superadmin"].includes(normalizeServerRole(session.role))) {
        send(req, res, 403, { ok: false, error: "Akses ditolak" });
        return;
      }
      try {
        let bodyStr = "";
        for await (const chunk of req) bodyStr += chunk;
        const backupData = JSON.parse(bodyStr);

        const client = await dbPool.connect();
        try {
          await client.query("BEGIN");
          await client.query("SET session_replication_role = 'replica';"); // Disable triggers (FK constraints)

          const tables = Object.keys(backupData);
          for (const table of tables) {
            await client.query(`TRUNCATE TABLE ${table} CASCADE`);
          }

          for (const table of tables) {
            const rows = backupData[table];
            if (rows.length === 0) continue;
            
            const columns = Object.keys(rows[0]);
            const colString = columns.join(', ');
            
            for (let i = 0; i < rows.length; i++) {
               const row = rows[i];
               const values = columns.map(c => row[c] === undefined ? null : row[c]);
               const placeholders = columns.map((_, idx) => `${idx + 1}`).join(', ');
               await client.query(`INSERT INTO ${table} (${colString}) VALUES (${placeholders})`, values);
            }
          }

          await client.query("SET session_replication_role = 'origin';");
          await client.query("COMMIT");
          
          await dbPool.query("INSERT INTO audit_logs (user_id, user_name, user_role, action, target_type, detail) VALUES ($1,$2,$3,$4,$5,$6)",
            [session.id, session.name, session.role, 'RESTORE_BACKUP', 'database', `Database berhasil dipulihkan dari file JSON.`]);
          
          send(req, res, 200, { ok: true });
        } catch (dbErr) {
          await client.query("ROLLBACK");
          await client.query("SET session_replication_role = 'origin';");
          throw dbErr;
        } finally {
          client.release();
        }
      } catch (err) {
        console.error("Restore Error:", err);
        send(req, res, 500, { ok: false, error: err.message });
      }
      return;
    }

    // === API: ARCHIVE DATA ===
    if (req.method === "POST" && url.pathname === "/api/archive-data") {
      const session = requireAuthenticated(req, res);
      if (!session) return;
      if (!["admin", "superadmin"].includes(normalizeServerRole(session.role))) {
        send(req, res, 403, { ok: false, error: "Akses ditolak" });
        return;
      }

      try {
        const body = await readJsonBody(req);
        const { dateBefore } = body;
        if (!dateBefore) {
          send(req, res, 400, { ok: false, error: "Parameter dateBefore wajib ada." });
          return;
        }

        const dateBeforeObj = new Date(dateBefore);
        if (isNaN(dateBeforeObj.getTime())) {
          send(req, res, 400, { ok: false, error: "Format tanggal tidak valid." });
          return;
        }

        const dateBeforeStr = dateBeforeObj.toISOString();

        // Check if Telegram or R2 is available
        const { rows: keys } = await dbPool.query("SELECT * FROM api_keys WHERE service_name IN ('telegram_backup', 'cloudflare_r2') AND is_active = true");
        if (keys.length === 0) {
          send(req, res, 400, { ok: false, error: "Tidak ada integrasi Cloud (Telegram/R2) yang aktif. Arsip dibatalkan demi keamanan data." });
          return;
        }

        // Fetch data to be archived
        const archiveData = {};
        const getArchiveData = async (table) => {
           try {
             const result = await dbPool.query(`SELECT * FROM ${table} WHERE created_at < $1`, [dateBeforeStr]);
             archiveData[table] = result.rows;
           } catch(e) { archiveData[table] = []; } // table might not exist or no created_at
        };

        await getArchiveData('audit_logs');
        await getArchiveData('whatsapp_logs');
        await getArchiveData('hikvision_attendance_logs');

        // Check if there is data
        const totalRows = archiveData.audit_logs.length + archiveData.whatsapp_logs.length + archiveData.hikvision_attendance_logs.length;
        if (totalRows === 0) {
           send(req, res, 200, { ok: true, message: "Tidak ada data lama yang perlu diarsipkan sebelum " + dateBeforeStr.split('T')[0] });
           return;
        }

        const archiveJsonStr = JSON.stringify(archiveData, null, 2);
        const fileName = `Archive_Kurmon_${dateBeforeStr.split('T')[0]}_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
        let uploaded = false;
        
        // Try R2 first, if not try Telegram
        const r2Key = keys.find(k => k.service_name === 'cloudflare_r2');
        if (r2Key) {
           try {
             const credentials = JSON.parse(r2Key.api_key);
             const s3 = new S3Client({
                region: "auto",
                endpoint: r2Key.extra_config.endpoint,
                credentials: { accessKeyId: credentials.accessKeyId, secretAccessKey: credentials.secretAccessKey },
             });
             await s3.send(new PutObjectCommand({
                Bucket: r2Key.extra_config.bucket,
                Key: "archives/" + fileName,
                Body: archiveJsonStr,
                ContentType: "application/json",
             }));
             uploaded = true;
           } catch(e) {
             console.error("Archive R2 error:", e);
           }
        }

        if (!uploaded) {
          const telegramKey = keys.find(k => k.service_name === 'telegram_backup');
          if (telegramKey) {
             const botToken = telegramKey.api_key;
             const chatId = telegramKey.extra_config.chat_id;
             const boundary = "----KurmonArchiveBoundary" + Date.now().toString(16);
             let multipartBody = "--" + boundary + "\r\n";
             multipartBody += `Content-Disposition: form-data; name="chat_id"\r\n\r\n${chatId}\r\n`;
             multipartBody += "--" + boundary + "\r\n";
             multipartBody += `Content-Disposition: form-data; name="document"; filename="${fileName}"\r\n`;
             multipartBody += "Content-Type: application/json\r\n\r\n";
             multipartBody += archiveJsonStr + "\r\n";
             multipartBody += "--" + boundary + "--\r\n";

             const telegramRes = await fetch(`https://api.telegram.org/bot${botToken}/sendDocument`, {
               method: 'POST',
               headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
               body: Buffer.from(multipartBody, 'utf-8')
             });
             const telegramData = await telegramRes.json();
             if (telegramData.ok) uploaded = true;
          }
        }

        if (!uploaded) {
           send(req, res, 500, { ok: false, error: "Gagal mengunggah arsip ke Cloud (Telegram/R2). Pembersihan data dibatalkan." });
           return;
        }

        // Delete the data
        try { await dbPool.query("DELETE FROM audit_logs WHERE created_at < $1", [dateBeforeStr]); } catch(e){}
        try { await dbPool.query("DELETE FROM whatsapp_logs WHERE created_at < $1", [dateBeforeStr]); } catch(e){}
        try { await dbPool.query("DELETE FROM hikvision_attendance_logs WHERE created_at < $1", [dateBeforeStr]); } catch(e){}

        await dbPool.query("INSERT INTO audit_logs (user_id, user_name, user_role, action, target_type, detail) VALUES ($1,$2,$3,$4,$5,$6)",
          [session.id, session.name, session.role, 'ARCHIVE_AND_PURGE', 'system', `Arsip ${totalRows} data lama sukses diunggah. Data telah dihapus dari database.`]);

        send(req, res, 200, { ok: true, message: `Berhasil mengarsipkan dan membersihkan ${totalRows} baris data lama.` });
      } catch (err) {
        console.error("Archive Data Error:", err);
        send(req, res, 500, { ok: false, error: err.message });
      }
      return;
    }

    // === API: CLOUDFLARE R2 MANUAL BACKUP ===
    if (req.method === "POST" && url.pathname === "/api/backup-r2") {
      const session = requireAuthenticated(req, res);
      if (!session) return;
      if (!["admin", "superadmin"].includes(normalizeServerRole(session.role))) {
        send(req, res, 403, { ok: false, error: "Akses ditolak" });
        return;
      }
      try {
        const { rows } = await dbPool.query("SELECT api_key, extra_config FROM api_keys WHERE service_name = 'cloudflare_r2' AND is_active = true LIMIT 1");
        if (rows.length === 0 || !rows[0].api_key || !rows[0].extra_config?.endpoint || !rows[0].extra_config?.bucket) {
          send(req, res, 400, { ok: false, error: "Cloudflare R2 Backup belum dikonfigurasi lengkap." });
          return;
        }

        let credentials;
        try {
          credentials = JSON.parse(rows[0].api_key); // { accessKeyId, secretAccessKey }
          if (!credentials.accessKeyId || !credentials.secretAccessKey) throw new Error("Missing keys");
        } catch (err) {
          send(req, res, 400, { ok: false, error: "Cloudflare R2 Backup gagal: Kredensial API Key tidak valid. Format harus JSON berisi accessKeyId dan secretAccessKey." });
          return;
        }
        const endpoint = rows[0].extra_config.endpoint;
        const bucket = rows[0].extra_config.bucket;

        const backupData = {};
        const tblResult = await dbPool.query("SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public'");
        const tables = tblResult.rows.map(r => r.tablename);
        
        for (const table of tables) {
          try {
            const result = await dbPool.query(`SELECT * FROM ${table}`);
            backupData[table] = result.rows;
          } catch (err) {}
        }

        const backupJsonStr = JSON.stringify(backupData, null, 2);
        const fileName = `Backup_Kurmon_Manual_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
        
        const s3 = new S3Client({
          region: "auto",
          endpoint: endpoint,
          credentials: {
            accessKeyId: credentials.accessKeyId,
            secretAccessKey: credentials.secretAccessKey,
          },
        });

        await s3.send(new PutObjectCommand({
          Bucket: bucket,
          Key: fileName,
          Body: backupJsonStr,
          ContentType: "application/json",
        }));

        await dbPool.query("INSERT INTO audit_logs (user_id, user_name, user_role, action, target_type, detail) VALUES ($1,$2,$3,$4,$5,$6)",
          [session.id, session.name, session.role, 'R2_BACKUP_MANUAL', 'database', `Backup manual sukses dikirim ke Cloudflare R2.`]);
        
        send(req, res, 200, { ok: true, data: { filename: fileName, size: (backupJsonStr.length / 1024 / 1024).toFixed(2) + ' MB' } });
      } catch (err) { 
        console.error("Manual R2 Backup Error:", err);
        send(req, res, 500, { ok: false, error: err.message }); 
      }
      return;
    }

    // === API: ARCHIVE & PURGE OLD DATA ===
    if (req.method === "POST" && url.pathname === "/api/archive-data") {
      const session = requireAuthenticated(req, res);
      if (!session) return;
      if (!["admin", "superadmin"].includes(normalizeServerRole(session.role))) {
        send(req, res, 403, { ok: false, error: "Akses ditolak" });
        return;
      }
      
      try {
        let bodyStr = "";
        for await (const chunk of req) bodyStr += chunk;
        const payload = JSON.parse(bodyStr);
        const { dateBefore } = payload;
        
        if (!dateBefore) {
          send(req, res, 400, { ok: false, error: "Parameter dateBefore dibutuhkan" });
          return;
        }

        const targetTables = [
          { name: 'attendances', col: 'created_at' },
          { name: 'hikvision_logs', col: 'created_at' },
          { name: 'audit_logs', col: 'created_at' },
          { name: 'whatsapp_logs', col: 'sent_at' },
          { name: 'login_logs', col: 'created_at' }
        ];
        const archiveData = {};
        
        for (const table of targetTables) {
          try {
            const result = await dbPool.query(`SELECT * FROM ${table.name} WHERE ${table.col} < $1`, [dateBefore]);
            archiveData[table.name] = result.rows;
          } catch (err) {
            console.error(`Skip archiving ${table.name}: `, err.message);
          }
        }

        const totalArchivedRows = Object.values(archiveData).reduce((sum, arr) => sum + arr.length, 0);
        if (totalArchivedRows === 0) {
           send(req, res, 400, { ok: false, error: "Tidak ada data lawas yang perlu dibersihkan." });
           return;
        }

        const archiveJsonStr = JSON.stringify(archiveData, null, 2);
        const fileName = `Archive_Kurmon_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
        
        // 1. TRY UPLOAD TO R2 FIRST
        let uploadSuccess = false;
        let uploadedTo = "";

        const { rows: r2Rows } = await dbPool.query("SELECT api_key, extra_config FROM api_keys WHERE service_name = 'cloudflare_r2' AND is_active = true LIMIT 1");
        if (r2Rows.length > 0 && r2Rows[0].api_key) {
           try {
             const creds = JSON.parse(r2Rows[0].api_key);
             const s3 = new S3Client({
                region: "auto",
                endpoint: r2Rows[0].extra_config.endpoint,
                credentials: { accessKeyId: creds.accessKeyId, secretAccessKey: creds.secretAccessKey },
             });
             await s3.send(new PutObjectCommand({ Bucket: r2Rows[0].extra_config.bucket, Key: fileName, Body: archiveJsonStr, ContentType: "application/json" }));
             uploadSuccess = true;
             uploadedTo = "Cloudflare R2";
           } catch(e) { console.error("R2 Upload failed:", e); }
        }

        // 2. TRY TELEGRAM IF R2 FAILS
        if (!uploadSuccess) {
           const { rows: tgRows } = await dbPool.query("SELECT api_key, extra_config FROM api_keys WHERE service_name = 'telegram_backup' AND is_active = true LIMIT 1");
           if (tgRows.length > 0 && tgRows[0].api_key) {
              try {
                const boundary = "----KurmonArchiveBoundary" + Date.now().toString(16);
                let multipartBody = "--" + boundary + "\r\n";
                multipartBody += `Content-Disposition: form-data; name="chat_id"\r\n\r\n${tgRows[0].extra_config?.chat_id || ''}\r\n`;
                multipartBody += "--" + boundary + "\r\n";
                multipartBody += `Content-Disposition: form-data; name="document"; filename="${fileName}"\r\n`;
                multipartBody += "Content-Type: application/json\r\n\r\n";
                multipartBody += archiveJsonStr + "\r\n";
                multipartBody += "--" + boundary + "--\r\n";

                const tgRes = await fetch(`https://api.telegram.org/bot${tgRows[0].api_key}/sendDocument`, {
                  method: 'POST',
                  headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
                  body: Buffer.from(multipartBody, 'utf-8')
                });
                const tgData = await tgRes.json();
                if (tgData.ok) { uploadSuccess = true; uploadedTo = "Telegram"; }
              } catch(e) { console.error("TG Upload failed:", e); }
           }
        }

        if (!uploadSuccess) {
           send(req, res, 500, { ok: false, error: "Gagal mengunggah arsip ke Cloud (R2/Telegram tidak aktif atau error). Pembersihan dibatalkan untuk mencegah kehilangan data." });
           return;
        }

        // DELETION PHASE (ONLY AFTER SAFE UPLOAD)
        const client = await dbPool.connect();
        try {
          await client.query("BEGIN");
          for (const table of targetTables) {
             try {
               await client.query(`DELETE FROM ${table.name} WHERE ${table.col} < $1`, [dateBefore]);
             } catch (err) {}
          }
          await client.query("COMMIT");
        } catch(e) {
          await client.query("ROLLBACK");
          throw e;
        } finally {
          client.release();
        }

        await dbPool.query("INSERT INTO audit_logs (user_id, user_name, user_role, action, target_type, detail) VALUES ($1,$2,$3,$4,$5,$6)",
          [session.id, session.name, session.role, 'ARCHIVE_DATA', 'database', `Pembersihan berhasil. ${totalArchivedRows} baris dihapus & diamankan di ${uploadedTo}`]);
        
        send(req, res, 200, { ok: true, message: `${totalArchivedRows} data berhasil dibersihkan dan diarsipkan ke ${uploadedTo}!` });
      } catch (err) { 
        console.error("Archive Error:", err);
        send(req, res, 500, { ok: false, error: err.message }); 
      }
      return;
    }

    // === API: AUDIT LOGS ===
    if (url.pathname.startsWith("/api/audit-logs")) {
      const session = requireAuthenticated(req, res);
      if (!session) return;
      
      const isUserAdmin = ["admin", "superadmin"].includes(normalizeServerRole(session.role));
      let isAllowed = isUserAdmin;
      if (!isAllowed) {
        try {
          const payload = await readMainPayload();
          const roleKey = session.role === "waka" ? `waka_${session.division || "kurikulum"}` : session.role;
          const perms = payload?.rolePermissions?.[roleKey];
          if (perms) {
            if (Array.isArray(perms)) {
              isAllowed = perms.includes("audit_log");
            } else {
              const level = perms["audit_log"];
              isAllowed = level && level !== "none" && level !== "nonaktif";
            }
          }
        } catch (e) { console.error("Error checking role permissions for audit_log:", e); }
      }
      if (!isAllowed) return send(req, res, 403, { ok: false, error: "Akses ditolak" });

      if (req.method === "GET") {
        try {
          const page = parseInt(url.searchParams?.get("page") || "1");
          const limit = parseInt(url.searchParams?.get("limit") || "50");
          const offset = (page - 1) * limit;
          
          let query = "SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT $1 OFFSET $2";
          let countQuery = "SELECT COUNT(*) FROM audit_logs";
          let params = [limit, offset];
          let countParams = [];

          if (!isUserAdmin) {
            query = "SELECT * FROM audit_logs WHERE NOT (user_role IN ('admin', 'superadmin') AND action = 'LOGIN') ORDER BY created_at DESC LIMIT $1 OFFSET $2";
            countQuery = "SELECT COUNT(*) FROM audit_logs WHERE NOT (user_role IN ('admin', 'superadmin') AND action = 'LOGIN')";
          }

          const { rows } = await dbPool.query(query, params);
          const countRes = await dbPool.query(countQuery, countParams);
          send(req, res, 200, { ok: true, data: rows, total: parseInt(countRes.rows[0].count) });
        } catch (err) { sendDatabaseError(req, res, err); }
        return;
      }
      if (req.method === "POST") {
        try {
          const body = await readJsonBody(req);
          if (body.action === "clear") {
            await dbPool.query("DELETE FROM audit_logs");
            send(req, res, 200, { ok: true });
            return;
          }
        } catch (err) { sendDatabaseError(req, res, err); }
        return;
      }
    }

    // === API: KARTU PELAJAR TEMPLATES ===
    if (url.pathname.startsWith("/api/student-cards")) {
      if (!requireAuthenticated(req, res)) return;
      if (req.method === "GET") {
        try {
          const { rows } = await dbPool.query("SELECT * FROM student_card_templates ORDER BY is_default DESC, id ASC");
          send(req, res, 200, { ok: true, data: rows });
        } catch (err) { sendDatabaseError(req, res, err); }
        return;
      }
      if (req.method === "POST") {
        if (!requireAdmin(req, res)) return;
        try {
          const body = await readJsonBody(req);
          if (body.action === "delete") {
            await dbPool.query("DELETE FROM student_card_templates WHERE id = $1", [body.id]);
          } else if (body.id) {
            await dbPool.query("UPDATE student_card_templates SET name=$1, config=$2, is_default=$3 WHERE id=$4",
              [body.name, JSON.stringify(body.config || {}), body.is_default || false, body.id]);
          } else {
            await dbPool.query("INSERT INTO student_card_templates (name, config, is_default) VALUES ($1,$2,$3)",
              [body.name, JSON.stringify(body.config || {}), body.is_default || false]);
          }
          send(req, res, 200, { ok: true });
        } catch (err) { sendDatabaseError(req, res, err); }
        return;
      }
    }

    // === API: STUDENT CARD PRINT REQUESTS ===
    if (url.pathname.startsWith("/api/student-card-requests")) {
      if (!requireAuthenticated(req, res)) return;
      if (req.method === "GET") {
        try {
          const { rows } = await dbPool.query("SELECT * FROM student_card_requests ORDER BY created_at DESC");
          const { rows: stats } = await dbPool.query(
            "SELECT nis, COUNT(*) as count FROM student_card_requests WHERE status = 'selesai' GROUP BY nis"
          );
          send(req, res, 200, { ok: true, data: rows, stats });
        } catch (err) { sendDatabaseError(req, res, err); }
        return;
      }
      if (req.method === "POST") {
        try {
          const body = await readJsonBody(req);
          const session = getSession(req);
          
          if (body.action === "create") {
            const { nis, nama, kelas, alasan, status } = body;
            if (!nis || !nama || !kelas || !alasan) {
              return send(req, res, 400, { ok: false, error: "Data pengajuan tidak lengkap." });
            }
            const defaultStatus = status || (alasan.includes("Tanpa Antrean") || alasan.includes("Langsung") ? "selesai" : "pending");
            await dbPool.query(
              "INSERT INTO student_card_requests (nis, nama, kelas, alasan, status, requested_by, processed_at) VALUES ($1, $2, $3, $4, $5, $6, $7)",
              [nis, nama, kelas, alasan, defaultStatus, session?.name || "Admin / TU", defaultStatus === "selesai" ? new Date() : null]
            );
            send(req, res, 200, { ok: true });
          } else if (body.action === "approve") {
            if (!requireAdminOrTu(req, res)) return;
            await dbPool.query(
              "UPDATE student_card_requests SET status = 'disetujui', processed_at = NOW() WHERE id = $1",
              [body.id]
            );
            send(req, res, 200, { ok: true });
          } else if (body.action === "selesai") {
            if (!requireAdminOrTu(req, res)) return;
            await dbPool.query(
              "UPDATE student_card_requests SET status = 'selesai', processed_at = NOW() WHERE id = $1",
              [body.id]
            );
            send(req, res, 200, { ok: true });
          } else if (body.action === "reject") {
            if (!requireAdminOrTu(req, res)) return;
            await dbPool.query(
              "UPDATE student_card_requests SET status = 'ditolak', processed_at = NOW() WHERE id = $1",
              [body.id]
            );
            send(req, res, 200, { ok: true });
          } else if (body.action === "delete") {
            if (!requireAdminOrTu(req, res)) return;
            await dbPool.query("DELETE FROM student_card_requests WHERE id = $1", [body.id]);
            send(req, res, 200, { ok: true });
          } else {
            send(req, res, 400, { ok: false, error: "Action tidak dikenal." });
          }
        } catch (err) { sendDatabaseError(req, res, err); }
        return;
      }
    }

    // === API: SISWA KELUAR (PENDATAAN KELUAR) ===
    if (url.pathname.startsWith("/api/siswa-keluar")) {
      if (!requireAuthenticated(req, res)) return;
      if (req.method === "GET") {
        try {
          const { rows } = await dbPool.query("SELECT * FROM siswa_keluar ORDER BY created_at DESC");
          send(req, res, 200, { ok: true, data: rows });
        } catch (err) { sendDatabaseError(req, res, err); }
        return;
      }
      if (req.method === "POST") {
        if (!requireAdmin(req, res)) return;
        try {
          const body = await readJsonBody(req);
          const { action } = body;
          
          if (action === "keluar") {
            const { nis, nama, kelas_terakhir, tanggal_keluar, alasan, keterangan } = body;
            if (!nis || !nama || !kelas_terakhir || !tanggal_keluar || !alasan) {
              return send(req, res, 400, { ok: false, error: "Data pengeluaran siswa tidak lengkap." });
            }
            
            // Get student payload first
            const studentRes = await dbPool.query("SELECT payload FROM mst_students WHERE id = $1", [nis]);
            const studentPayload = studentRes.rowCount > 0 ? studentRes.rows[0].payload : {};
            
            const client = await dbPool.connect();
            try {
              await client.query("BEGIN");
              
              // 1. Insert into siswa_keluar
              await client.query(
                "INSERT INTO siswa_keluar (nis, nama, kelas_terakhir, tanggal_keluar, alasan, keterangan, student_payload) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (nis) DO UPDATE SET tanggal_keluar = EXCLUDED.tanggal_keluar, alasan = EXCLUDED.alasan, keterangan = EXCLUDED.keterangan",
                [nis, nama, kelas_terakhir, tanggal_keluar, alasan, keterangan || "", JSON.stringify(studentPayload)]
              );
              
              // 2. Delete from mst_students to deactivate
              await client.query("DELETE FROM mst_students WHERE id = $1", [nis]);
              
              await client.query("COMMIT");
              send(req, res, 200, { ok: true });
            } catch (e) {
              await client.query("ROLLBACK");
              throw e;
            } finally {
              client.release();
            }
          } else if (action === "batal") {
            const { nis } = body;
            if (!nis) return send(req, res, 400, { ok: false, error: "NIS wajib diisi." });
            
            const keluarRes = await dbPool.query("SELECT student_payload FROM siswa_keluar WHERE nis = $1", [nis]);
            if (keluarRes.rowCount === 0) {
              return send(req, res, 400, { ok: false, error: "Data siswa keluar tidak ditemukan." });
            }
            const studentPayload = keluarRes.rows[0].student_payload || {};
            
            const client = await dbPool.connect();
            try {
              await client.query("BEGIN");
              
              // 1. Restore to mst_students
              if (studentPayload.nis) {
                await client.query(
                  "INSERT INTO mst_students (id, payload) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload",
                  [nis, JSON.stringify(studentPayload)]
                );
              }
              
              // 2. Delete from siswa_keluar
              await client.query("DELETE FROM siswa_keluar WHERE nis = $1", [nis]);
              
              await client.query("COMMIT");
              send(req, res, 200, { ok: true });
            } catch (e) {
              await client.query("ROLLBACK");
              throw e;
            } finally {
              client.release();
            }
          } else {
            send(req, res, 400, { ok: false, error: "Action tidak dikenal." });
          }
        } catch (err) { sendDatabaseError(req, res, err); }
        return;
      }
    }

    // === API: MODUL AJAR GURU ===
    if (url.pathname.startsWith("/api/modul-ajar-guru")) {
      if (req.method === "GET") {
        try {
          const { rows } = await dbPool.query("SELECT * FROM modul_ajar_guru ORDER BY uploaded_at DESC");
          send(req, res, 200, { ok: true, data: rows });
        } catch (err) { sendDatabaseError(req, res, err); }
        return;
      }
      if (req.method === "POST") {
        if (!requireAuthenticated(req, res)) return;
        try {
          const body = await readJsonBody(req);
          const session = getSession(req);
          
          if (body.action === "upload") {
            const { teacher_code, teacher_name, nama_dokumen, file_url, tahun_ajaran, mapel, kelas, semester, deskripsi } = body;
            if (!teacher_code || !teacher_name || !nama_dokumen || !file_url || !tahun_ajaran) {
              return send(req, res, 400, { ok: false, error: "Data modul ajar tidak lengkap." });
            }

            // Backend Security Verification
            // 1. File extension validation
            const allowedExtensions = ['.pdf'];
            const fileExtIndex = nama_dokumen.lastIndexOf('.');
            if (fileExtIndex === -1) {
              return send(req, res, 400, { ok: false, error: "Nama berkas tidak memiliki ekstensi." });
            }
            const ext = nama_dokumen.substring(fileExtIndex).toLowerCase();
            if (!allowedExtensions.includes(ext)) {
              return send(req, res, 400, { ok: false, error: `Ekstensi berkas ${ext} tidak diizinkan. Hanya berkas .pdf yang diperbolehkan.` });
            }

            // 2. MIME type check from base64 Data URL prefix
            const mimeMatch = file_url.match(/^data:([^;]+);base64,/);
            if (!mimeMatch) {
              return send(req, res, 400, { ok: false, error: "Format data berkas tidak valid (harus Base64 Data URL)." });
            }
            const mimeType = mimeMatch[1].toLowerCase();
            const allowedMimeTypes = ['application/pdf'];
            if (!allowedMimeTypes.includes(mimeType)) {
              return send(req, res, 400, { ok: false, error: `Tipe konten berkas (${mimeType}) tidak didukung. Hanya berkas PDF yang diperbolehkan.` });
            }

            // 3. File size limit check (approx 5MB base64 content limit)
            const approxBytes = Math.round((file_url.length * 3) / 4);
            if (approxBytes > 5 * 1024 * 1024) {
              return send(req, res, 400, { ok: false, error: "Ukuran berkas melebihi batas maksimal 5MB." });
            }

            await dbPool.query(
              "INSERT INTO modul_ajar_guru (teacher_code, teacher_name, nama_dokumen, file_url, tahun_ajaran, mapel, kelas, semester, deskripsi) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
              [teacher_code, teacher_name, nama_dokumen, file_url, tahun_ajaran, mapel || null, kelas || null, semester || null, deskripsi || null]
            );
            send(req, res, 200, { ok: true });
          } else if (body.action === "delete") {
            const docRes = await dbPool.query("SELECT teacher_code, teacher_name FROM modul_ajar_guru WHERE id = $1", [body.id]);
            if (docRes.rows.length === 0) {
              return send(req, res, 404, { ok: false, error: "Dokumen modul ajar tidak ditemukan." });
            }
            const doc = docRes.rows[0];
            const userCode = String(session?.code || session?.username || session?.id || '').trim().toLowerCase();
            const docCode = String(doc.teacher_code || '').trim().toLowerCase();
            const bodyCode = String(body.teacher_code || '').trim().toLowerCase();
            const userRole = String(session?.role || '').toLowerCase();
            const userDiv = String(session?.division || '').toLowerCase();
            const isAuthorized = ['admin', 'superadmin', 'waka_kurikulum'].includes(userRole) ||
                                (userRole === 'waka' && userDiv === 'kurikulum') ||
                                (userCode && (userCode === docCode || userCode === bodyCode)) ||
                                (session?.name && String(session.name).trim().toLowerCase() === String(doc.teacher_name || '').trim().toLowerCase());

            if (!isAuthorized) {
              return send(req, res, 403, { ok: false, error: "Akses ditolak. Anda tidak memiliki izin menghapus dokumen ini." });
            }
            await dbPool.query("DELETE FROM modul_ajar_guru WHERE id = $1", [body.id]);
            send(req, res, 200, { ok: true });
          } else if (body.action === "rename") {
            const { id, nama_dokumen } = body;
            const docRes = await dbPool.query("SELECT teacher_code, teacher_name FROM modul_ajar_guru WHERE id = $1", [id]);
            if (docRes.rows.length === 0) {
              return send(req, res, 404, { ok: false, error: "Dokumen modul ajar tidak ditemukan." });
            }
            const doc = docRes.rows[0];
            const userCode = String(session?.code || session?.username || session?.id || '').trim().toLowerCase();
            const docCode = String(doc.teacher_code || '').trim().toLowerCase();
            const userRole = String(session?.role || '').toLowerCase();
            const userDiv = String(session?.division || '').toLowerCase();
            const isAuthorized = ['admin', 'superadmin', 'waka_kurikulum'].includes(userRole) ||
                                (userRole === 'waka' && userDiv === 'kurikulum') ||
                                (userCode && (userCode === docCode)) ||
                                (session?.name && String(session.name).trim().toLowerCase() === String(doc.teacher_name || '').trim().toLowerCase());

            if (!isAuthorized) {
              return send(req, res, 403, { ok: false, error: "Akses ditolak. Anda tidak memiliki izin mengubah dokumen ini." });
            }
            if (!nama_dokumen || !nama_dokumen.trim()) {
              return send(req, res, 400, { ok: false, error: "Nama dokumen tidak boleh kosong." });
            }
            let newName = nama_dokumen.trim();
            if (!newName.toLowerCase().endsWith('.pdf')) newName += '.pdf';
            
            await dbPool.query("UPDATE modul_ajar_guru SET nama_dokumen = $1 WHERE id = $2", [newName, id]);
            send(req, res, 200, { ok: true });
          } else {
            send(req, res, 400, { ok: false, error: "Action tidak dikenal." });
          }
        } catch (err) { sendDatabaseError(req, res, err); }
        return;
      }
    }

    // === API: MATERI AJAR (Public learning materials, visible to all students) ===
    if (url.pathname.startsWith("/api/materi-ajar")) {
      if (req.method === "GET") {
        try {
          // Ensure table exists
          await dbPool.query(`
            CREATE TABLE IF NOT EXISTS materi_ajar (
              id SERIAL PRIMARY KEY,
              teacher_code VARCHAR(50) NOT NULL,
              teacher_name VARCHAR(255) NOT NULL,
              judul VARCHAR(500) NOT NULL,
              deskripsi TEXT,
              file_url TEXT,
              nama_dokumen VARCHAR(255),
              link_url TEXT,
              tipe VARCHAR(20) DEFAULT 'file',
              mapel VARCHAR(255),
              kelas_target VARCHAR(255),
              semester VARCHAR(20),
              tahun_ajaran VARCHAR(50),
              uploaded_at TIMESTAMPTZ DEFAULT NOW()
            )
          `);
          const { rows } = await dbPool.query("SELECT id, teacher_code, teacher_name, judul, deskripsi, file_url, nama_dokumen, link_url, tipe, mapel, kelas_target, semester, tahun_ajaran, uploaded_at FROM materi_ajar ORDER BY uploaded_at DESC");
          send(req, res, 200, { ok: true, data: rows });
        } catch (err) { sendDatabaseError(req, res, err); }
        return;
      }
      if (req.method === "POST") {
        if (!requireAuthenticated(req, res)) return;
        try {
          // Ensure table exists
          await dbPool.query(`
            CREATE TABLE IF NOT EXISTS materi_ajar (
              id SERIAL PRIMARY KEY,
              teacher_code VARCHAR(50) NOT NULL,
              teacher_name VARCHAR(255) NOT NULL,
              judul VARCHAR(500) NOT NULL,
              deskripsi TEXT,
              file_url TEXT,
              nama_dokumen VARCHAR(255),
              link_url TEXT,
              tipe VARCHAR(20) DEFAULT 'file',
              mapel VARCHAR(255),
              kelas_target VARCHAR(255),
              semester VARCHAR(20),
              tahun_ajaran VARCHAR(50),
              uploaded_at TIMESTAMPTZ DEFAULT NOW()
            )
          `);
          const body = await readJsonBody(req);
          const session = getSession(req);

          if (body.action === "upload") {
            const { teacher_code, teacher_name, judul, deskripsi, file_url, nama_dokumen, link_url, tipe, mapel, kelas_target, semester, tahun_ajaran } = body;
            if (!teacher_code || !teacher_name || !judul) {
              return send(req, res, 400, { ok: false, error: "Data materi ajar tidak lengkap (teacher_code, teacher_name, judul wajib)." });
            }
            if (tipe === 'file' || !tipe) {
              if (!file_url || !nama_dokumen) {
                return send(req, res, 400, { ok: false, error: "File PDF wajib dipilih untuk tipe berkas." });
              }
              // Extension check
              const ext = nama_dokumen.substring(nama_dokumen.lastIndexOf('.')).toLowerCase();
              if (ext !== '.pdf') {
                return send(req, res, 400, { ok: false, error: `Ekstensi ${ext} tidak diizinkan. Hanya .pdf.` });
              }
              // MIME check
              const mimeMatch = file_url.match(/^data:([^;]+);base64,/);
              if (!mimeMatch || mimeMatch[1].toLowerCase() !== 'application/pdf') {
                return send(req, res, 400, { ok: false, error: "Format file tidak valid (harus PDF)." });
              }
              // Size check (5MB)
              const approxBytes = Math.round((file_url.length * 3) / 4);
              if (approxBytes > 5 * 1024 * 1024) {
                return send(req, res, 400, { ok: false, error: "Ukuran file melebihi batas 5MB." });
              }
              await dbPool.query(
                "INSERT INTO materi_ajar (teacher_code, teacher_name, judul, deskripsi, file_url, nama_dokumen, tipe, mapel, kelas_target, semester, tahun_ajaran) VALUES ($1,$2,$3,$4,$5,$6,'file',$7,$8,$9,$10)",
                [teacher_code, teacher_name, judul, deskripsi || null, file_url, nama_dokumen, mapel || null, kelas_target || null, semester || null, tahun_ajaran || null]
              );
            } else if (tipe === 'link') {
              if (!link_url) {
                return send(req, res, 400, { ok: false, error: "URL link wajib diisi untuk tipe link." });
              }
              await dbPool.query(
                "INSERT INTO materi_ajar (teacher_code, teacher_name, judul, deskripsi, link_url, tipe, mapel, kelas_target, semester, tahun_ajaran) VALUES ($1,$2,$3,$4,$5,'link',$6,$7,$8,$9)",
                [teacher_code, teacher_name, judul, deskripsi || null, link_url, mapel || null, kelas_target || null, semester || null, tahun_ajaran || null]
              );
            } else {
              return send(req, res, 400, { ok: false, error: "Tipe tidak dikenal. Gunakan 'file' atau 'link'." });
            }
            send(req, res, 200, { ok: true });
          } else if (body.action === "delete") {
            const docRes = await dbPool.query("SELECT teacher_code, teacher_name FROM materi_ajar WHERE id = $1", [body.id]);
            if (docRes.rows.length === 0) {
              return send(req, res, 404, { ok: false, error: "Materi ajar tidak ditemukan." });
            }
            const doc = docRes.rows[0];
            const userCode = String(session?.code || session?.username || session?.id || '').trim().toLowerCase();
            const docCode = String(doc.teacher_code || '').trim().toLowerCase();
            const bodyCode = String(body.teacher_code || '').trim().toLowerCase();
            const userRole = String(session?.role || '').toLowerCase();
            const userDiv = String(session?.division || '').toLowerCase();
            const isAuthorized = ['admin', 'superadmin', 'waka_kurikulum'].includes(userRole) ||
                                (userRole === 'waka' && userDiv === 'kurikulum') ||
                                (userCode && (userCode === docCode || userCode === bodyCode)) ||
                                (session?.name && String(session.name).trim().toLowerCase() === String(doc.teacher_name || '').trim().toLowerCase());

            if (!isAuthorized) {
              return send(req, res, 403, { ok: false, error: "Akses ditolak. Anda tidak memiliki izin menghapus materi ini." });
            }
            await dbPool.query("DELETE FROM materi_ajar WHERE id = $1", [body.id]);
            send(req, res, 200, { ok: true });
          } else if (body.action === "update") {
            const docRes = await dbPool.query("SELECT teacher_code, teacher_name FROM materi_ajar WHERE id = $1", [body.id]);
            if (docRes.rows.length === 0) {
              return send(req, res, 404, { ok: false, error: "Materi ajar tidak ditemukan." });
            }
            const doc = docRes.rows[0];
            const userCode = String(session?.code || session?.username || session?.id || '').trim().toLowerCase();
            const docCode = String(doc.teacher_code || '').trim().toLowerCase();
            const bodyCode = String(body.teacher_code || '').trim().toLowerCase();
            const userRole = String(session?.role || '').toLowerCase();
            const userDiv = String(session?.division || '').toLowerCase();
            const isAuthorized = ['admin', 'superadmin', 'waka_kurikulum'].includes(userRole) ||
                                (userRole === 'waka' && userDiv === 'kurikulum') ||
                                (userCode && (userCode === docCode || userCode === bodyCode)) ||
                                (session?.name && String(session.name).trim().toLowerCase() === String(doc.teacher_name || '').trim().toLowerCase());

            if (!isAuthorized) return send(req, res, 403, { ok: false, error: "Akses ditolak." });
            await dbPool.query(
              "UPDATE materi_ajar SET judul=$1, deskripsi=$2, mapel=$3, kelas_target=$4, semester=$5, tahun_ajaran=$6 WHERE id=$7",
              [body.judul, body.deskripsi || null, body.mapel || null, body.kelas_target || null, body.semester || null, body.tahun_ajaran || null, body.id]
            );
            send(req, res, 200, { ok: true });
          } else {
            send(req, res, 400, { ok: false, error: "Action tidak dikenal." });
          }
        } catch (err) { sendDatabaseError(req, res, err); }
        return;
      }
    }

    // === API: WHATSAPP (Fonnte Gateway) ===

    if (url.pathname === "/api/whatsapp/send") {
      if (!requireAuthenticated(req, res)) return;
      try {
        const body = await readJsonBody(req);
        const session = getSession(req);
        if (session?.role === "siswa") return send(req, res, 403, { ok: false, error: "Akses ditolak. Siswa tidak diizinkan." });
        const keyRes = await dbPool.query("SELECT api_key, extra_config FROM api_keys WHERE service_name = 'whatsapp_fonnte' AND is_active = true");
        if (keyRes.rowCount === 0) {
          send(req, res, 400, { ok: false, error: "API Key WhatsApp belum dikonfigurasi atau tidak aktif. Masuk ke menu Manajemen API Key." });
          return;
        }
        const token = keyRes.rows[0].api_key;
        const phoneRaw = String(body.phone || "").replace(/\D/g, "");
        const phone = phoneRaw.startsWith("0") ? "62" + phoneRaw.slice(1) : phoneRaw;
        if (!phone || !body.message) {
          send(req, res, 400, { ok: false, error: "Nomor HP dan pesan wajib diisi." });
          return;
        }
        let responseData = {};
        let status = "sent";
        try {
          const fonnteRes = await fetch("https://api.fonnte.com/send", {
            method: "POST",
            headers: { "Authorization": token, "Content-Type": "application/json" },
            body: JSON.stringify({ target: phone, message: body.message, countryCode: "62" })
          });
          responseData = await fonnteRes.json();
          if (!fonnteRes.ok || responseData.status === false) status = "failed";
        } catch (e) {
          status = "failed";
          responseData = { error: e.message };
        }
        await dbPool.query("INSERT INTO whatsapp_logs (phone, recipient_name, message, status, trigger_type, response_data) VALUES ($1,$2,$3,$4,$5,$6)",
          [phone, body.recipient_name || "", body.message, status, body.trigger_type || "manual", JSON.stringify(responseData)]);
        await dbPool.query("INSERT INTO audit_logs (user_id, user_name, user_role, action, target_type, detail) VALUES ($1,$2,$3,$4,$5,$6)",
          [session?.id || "system", session?.name || "System", session?.role || "admin", "SEND_WA", "whatsapp", `Kirim WA ke ${phone} (${body.recipient_name || ""}): ${status}`]);
        send(req, res, 200, { ok: status === "sent", status, data: responseData });
      } catch (err) { sendDatabaseError(req, res, err); }
      return;
    }

    // === API: WHATSAPP LOGS ===
    if (url.pathname === "/api/whatsapp/logs") {
      if (!requireAdmin(req, res)) return;
      if (req.method === "GET") {
        try {
          const { rows } = await dbPool.query("SELECT * FROM whatsapp_logs ORDER BY sent_at DESC LIMIT 200");
          send(req, res, 200, { ok: true, data: rows });
        } catch (err) { sendDatabaseError(req, res, err); }
        return;
      }
    }

    // === API: WHATSAPP CANCEL LOG ===
    if (url.pathname === "/api/whatsapp/cancel-log") {
      if (!requireAdmin(req, res)) return;
      if (req.method === "POST") {
        try {
          const body = await readJsonBody(req);
          if (!body.id) {
            return send(req, res, 400, { ok: false, error: "ID log wajib diisi." });
          }
          await dbPool.query("UPDATE whatsapp_logs SET status = 'cancelled' WHERE id = $1 AND status = 'pending'", [body.id]);
          
          const session = getSession(req);
          await dbPool.query("INSERT INTO audit_logs (user_id, user_name, user_role, action, target_type, detail) VALUES ($1,$2,$3,$4,$5,$6)",
            [session?.id || "system", session?.name || "System", session?.role || "admin", "CANCEL_WA", "whatsapp", `Membatalkan log WA antrean ID: ${body.id}`]);
            
          send(req, res, 200, { ok: true, message: "Log berhasil dibatalkan." });
        } catch (err) { sendDatabaseError(req, res, err); }
        return;
      }
    }

    // === API: WHATSAPP SEND REKAP (GURU & SISWA) ===
    if (url.pathname === "/api/whatsapp/send-rekap") {
      if (!requireAuthenticated(req, res)) return;
      try {
        const body = await readJsonBody(req);
        const { target, type, month, year, date } = body;
        const session = getSession(req);
        if (session?.role === "siswa") return send(req, res, 403, { ok: false, error: "Akses ditolak. Siswa tidak diizinkan." });

        const keyRes = await dbPool.query("SELECT api_key FROM api_keys WHERE service_name = 'whatsapp_fonnte' AND is_active = true");
        if (keyRes.rowCount === 0) {
          send(req, res, 400, { ok: false, error: "API Key WhatsApp belum dikonfigurasi atau tidak aktif. Masuk ke menu Manajemen API Key." });
          return;
        }
        const token = keyRes.rows[0].api_key;

        const mainRes = await dbPool.query("SELECT data FROM app_data WHERE store_key = 'main_store'");
        const mainData = mainRes.rowCount > 0 ? JSON.parse(mainRes.rows[0].data) : {};
        const attendanceRecords = Array.isArray(mainData.attendanceRecords) ? mainData.attendanceRecords : [];

        if (target === "guru") {
          const conf = await getHikvisionConfig();
          const notifyRole = conf.notify_role || "none";
          let recipientPhone = "";
          let recipientName = "Pengawas Absensi";

          if (notifyRole === "custom" && conf.notify_custom_phone) {
            recipientPhone = String(conf.notify_custom_phone).replace(/\D/g, "");
          } else if (notifyRole !== "none") {
            let roleQuery = "";
            if (notifyRole === "kepsek") {
              roleQuery = "SELECT payload FROM mst_teachers WHERE payload->>'role' = 'kepsek' LIMIT 1";
            } else if (notifyRole === "waka_kurikulum") {
              roleQuery = "SELECT payload FROM mst_teachers WHERE payload->>'role' = 'waka' AND payload->>'division' = 'kurikulum' LIMIT 1";
            } else if (notifyRole === "waka_kesiswaan") {
              roleQuery = "SELECT payload FROM mst_teachers WHERE payload->>'role' = 'waka' AND payload->>'division' = 'kesiswaan' LIMIT 1";
            }

            if (roleQuery) {
              const roleRes = await dbPool.query(roleQuery);
              if (roleRes.rowCount > 0) {
                const targetTeacher = roleRes.rows[0].payload;
                recipientPhone = String(targetTeacher.phone || "").replace(/\D/g, "");
                recipientName = targetTeacher.name || "Pihak Sekolah";
              }
            }
          }

          if (!recipientPhone) {
            send(req, res, 400, { ok: false, error: "Nomor WhatsApp Pengawas belum dikonfigurasi di Pengaturan Mesin." });
            return;
          }
          const destPhone = recipientPhone.startsWith("0") ? "62" + recipientPhone.slice(1) : recipientPhone;

          const teachersRes = await dbPool.query("SELECT id, payload FROM mst_teachers");
          const teachers = teachersRes.rows.map(r => r.payload);

          let message = "";

          if (type === "daily") {
            const targetDate = date || new Date().toISOString().split('T')[0];
            const records = attendanceRecords.filter(r => r.date === targetDate);

            const absentList = [];
            let hadirCount = 0;
            let telatCount = 0;

            teachers.forEach(t => {
              const code = t.code;
              const recs = records.filter(r => r.teacherCode === code);
              if (recs.length === 0) {
                absentList.push({ name: t.name, status: "Alpa", note: "Tidak ada keterangan" });
              } else {
                const hasLate = recs.some(r => r.status === "Terlambat");
                const hasIzin = recs.some(r => r.status === "Izin");
                const hasSakit = recs.some(r => r.status === "Sakit");
                const hasDinas = recs.some(r => r.status === "Dinas Luar");

                if (hasIzin) absentList.push({ name: t.name, status: "Izin", note: recs.find(r => r.status === "Izin").note });
                else if (hasSakit) absentList.push({ name: t.name, status: "Sakit", note: recs.find(r => r.status === "Sakit").note });
                else if (hasDinas) absentList.push({ name: t.name, status: "Dinas Luar", note: recs.find(r => r.status === "Dinas Luar").note });
                else if (hasLate) {
                  telatCount++;
                  hadirCount++;
                } else {
                  hadirCount++;
                }
              }
            });

            message = `📝 REKAP HARIAN KEHADIRAN GURU\n`;
            message += `Tanggal: ${targetDate}\n\n`;
            message += `✅ Hadir Tepat Waktu: ${hadirCount - telatCount} orang\n`;
            message += `⏰ Terlambat: ${telatCount} orang\n`;
            message += `❌ Tidak Hadir: ${absentList.length} orang\n\n`;
            message += `Daftar Keterangan:\n`;
            if (absentList.length === 0) {
              message += `- Semua guru hadir/tercatat.\n`;
            } else {
              absentList.forEach((a, i) => {
                message += `${i + 1}. ${a.name} (${a.status}) ${a.note ? ` - ${a.note}` : ''}\n`;
              });
            }
            message += `\nNotifikasi otomatis Kurmon.`;
          } else {
            const targetMonth = parseInt(month || new Date().getMonth() + 1);
            const targetYear = parseInt(year || new Date().getFullYear());
            const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();

            message = `📅 REKAP BULANAN KEHADIRAN GURU\n`;
            message += `Bulan: ${targetMonth}/${targetYear}\n\n`;

            teachers.slice(0, 15).forEach((t, idx) => {
              const code = t.code;
              let hadir = 0, sakit = 0, izin = 0, alpa = 0, telat = 0;
              for (let d = 1; d <= daysInMonth; d++) {
                const dateStr = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                const recs = attendanceRecords.filter(r => r.teacherCode === code && r.date === dateStr);
                if (recs.length > 0) {
                  if (recs.some(r => r.status === "Izin")) izin++;
                  else if (recs.some(r => r.status === "Sakit")) sakit++;
                  else if (recs.some(r => r.status === "Dinas Luar")) hadir++;
                  else if (recs.some(r => r.status === "Terlambat")) { hadir++; telat++; }
                  else hadir++;
                } else {
                  const dayOfWeek = new Date(targetYear, targetMonth - 1, d).getDay();
                  if (dayOfWeek !== 0 && dayOfWeek !== 6) alpa++;
                }
              }
              message += `${idx + 1}. ${t.name}:\n   Hadir: ${hadir} | Telat: ${telat} | Izin: ${izin} | Sakit: ${sakit} | Alpa: ${alpa}\n`;
            });
            if (teachers.length > 15) {
              message += `... dan ${teachers.length - 15} guru lainnya.`;
            }
          }

          const fonnteRes = await fetch("https://api.fonnte.com/send", {
            method: "POST",
            headers: { "Authorization": token, "Content-Type": "application/json" },
            body: JSON.stringify({ target: destPhone, message: message, countryCode: "62" })
          });
          const resData = await fonnteRes.json();
          const waStatus = (fonnteRes.ok && resData.status !== false) ? "sent" : "failed";

          await dbPool.query("INSERT INTO whatsapp_logs (phone, recipient_name, message, status, trigger_type, response_data) VALUES ($1,$2,$3,$4,$5,$6)",
            [destPhone, recipientName, message, waStatus, `rekap_guru_${type}`, JSON.stringify(resData)]);
          
          send(req, res, 200, { ok: waStatus === "sent", status: waStatus, message: `Rekap ${type} guru berhasil dikirim ke ${recipientName}` });
          return;
        } else {
          // SISWA
          if (type === "daily") {
            const targetDate = date || new Date().toISOString().split('T')[0];
            const walasRes = await dbPool.query("SELECT payload FROM mst_teachers WHERE payload->>'role' = 'walas' OR payload->>'isWalas' = 'true'");
            const walasList = walasRes.rows.map(r => r.payload);

            const studentsRes = await dbPool.query("SELECT payload FROM mst_students");
            const students = studentsRes.rows.map(r => r.payload);

            let sentCount = 0;

            for (const walas of walasList) {
              const className = walas.walasClass;
              const walasPhoneRaw = String(walas.phone || "").replace(/\D/g, "");
              if (!className || !walasPhoneRaw) continue;

              const classStudents = students.filter(s => s.className === className || s.class_name === className);
              const absentStudents = [];

              classStudents.forEach(s => {
                const recs = attendanceRecords.filter(r => r.siswaNis === s.nis && r.date === targetDate);
                if (recs.length > 0) {
                  const isAbsent = recs.some(r => ["Izin", "Sakit", "Alpa"].includes(r.status));
                  if (isAbsent) {
                    const rec = recs.find(r => ["Izin", "Sakit", "Alpa"].includes(r.status));
                    absentStudents.push({ name: s.namaSiswa || s.name, status: rec.status, note: rec.note || "" });
                  }
                }
              });

              if (absentStudents.length > 0) {
                const destPhone = walasPhoneRaw.startsWith("0") ? "62" + walasPhoneRaw.slice(1) : walasPhoneRaw;
                let classMsg = `📝 REKAP HARIAN ABSENSI SISWA\n`;
                classMsg += `Kelas: ${className}\n`;
                classMsg += `Wali Kelas: ${walas.name}\n`;
                classMsg += `Tanggal: ${targetDate}\n\n`;
                classMsg += `Daftar Siswa Tidak Hadir:\n`;
                absentStudents.forEach((st, i) => {
                  classMsg += `${i + 1}. ${st.name} (${st.status})${st.note ? ` - ${st.note}` : ''}\n`;
                });
                classMsg += `\nMohon ditindaklanjuti. Terima kasih.`;

                try {
                  const fonnteRes = await fetch("https://api.fonnte.com/send", {
                    method: "POST",
                    headers: { "Authorization": token, "Content-Type": "application/json" },
                    body: JSON.stringify({ target: destPhone, message: classMsg, countryCode: "62" })
                  });
                  const resData = await fonnteRes.json();
                  const waStatus = (fonnteRes.ok && resData.status !== false) ? "sent" : "failed";
                  if (waStatus === "sent") sentCount++;

                  await dbPool.query("INSERT INTO whatsapp_logs (phone, recipient_name, message, status, trigger_type, response_data) VALUES ($1,$2,$3,$4,$5,$6)",
                    [destPhone, walas.name, classMsg, waStatus, "rekap_siswa_harian", JSON.stringify(resData)]);
                } catch (e) {
                  console.error(`Gagal kirim rekap ke walas ${className}:`, e.message);
                }
              }
            }

            send(req, res, 200, { ok: true, message: `Rekap harian siswa selesai dikirim ke ${sentCount} wali kelas.` });
            return;
          } else {
            const targetMonth = parseInt(month || new Date().getMonth() + 1);
            const targetYear = parseInt(year || new Date().getFullYear());

            const studentsRes = await dbPool.query("SELECT payload FROM mst_students");
            const students = studentsRes.rows.map(r => r.payload);

            let sentCount = 0;

            for (const s of students.slice(0, 30)) {
              const parentPhoneRaw = String(s.phone || s.wa_ortu || "").replace(/\D/g, "");
              if (!parentPhoneRaw) continue;

              const recs = attendanceRecords.filter(r => r.siswaNis === s.nis && r.date.startsWith(`${targetYear}-${String(targetMonth).padStart(2, '0')}`));
              let hadir = 0, sakit = 0, izin = 0, alpa = 0;
              recs.forEach(r => {
                if (r.status === "Izin") izin++;
                else if (r.status === "Sakit") sakit++;
                else if (r.status === "Alpa") alpa++;
                else hadir++;
              });

              const destPhone = parentPhoneRaw.startsWith("0") ? "62" + parentPhoneRaw.slice(1) : parentPhoneRaw;
              const parentMsg = `📅 REKAP ABSENSI SISWA (BULANAN)\n` +
                `Nama Siswa: ${s.namaSiswa || s.name}\n` +
                `Kelas: ${s.class_name || s.className || "-"}\n` +
                `Bulan: ${targetMonth}/${targetYear}\n\n` +
                `Ringkasan Kehadiran:\n` +
                `- Hadir: ${hadir} hari\n` +
                `- Sakit: ${sakit} hari\n` +
                `- Izin: ${izin} hari\n` +
                `- Alpa: ${alpa} hari\n\n` +
                `Terima kasih atas kerja samanya. - Pihak Sekolah`;

              try {
                const fonnteRes = await fetch("https://api.fonnte.com/send", {
                  method: "POST",
                  headers: { "Authorization": token, "Content-Type": "application/json" },
                  body: JSON.stringify({ target: destPhone, message: parentMsg, countryCode: "62" })
                });
                const resData = await fonnteRes.json();
                const waStatus = (fonnteRes.ok && resData.status !== false) ? "sent" : "failed";
                if (waStatus === "sent") sentCount++;

                await dbPool.query("INSERT INTO whatsapp_logs (phone, recipient_name, message, status, trigger_type, response_data) VALUES ($1,$2,$3,$4,$5,$6)",
                  [destPhone, s.namaSiswa || s.name, parentMsg, waStatus, "rekap_siswa_bulanan", JSON.stringify(resData)]);
              } catch (e) {
                console.error(`Gagal kirim rekap bulanan ke ortu ${s.nis}:`, e.message);
              }
            }

            send(req, res, 200, { ok: true, message: `Rekap bulanan siswa dikirim ke ${sentCount} nomor orang tua.` });
            return;
          }
        }
      } catch (err) { sendDatabaseError(req, res, err); }
      return;
    }

    // === API: E-SURAT TEMPLATES ===
    if (url.pathname.startsWith("/api/esurat")) {
      if (!requireAuthenticated(req, res)) return;
      if (req.method === "GET") {
        try {
          const { rows } = await dbPool.query("SELECT * FROM esurat_templates ORDER BY jenis ASC, id ASC");
          send(req, res, 200, { ok: true, data: rows });
        } catch (err) { sendDatabaseError(req, res, err); }
        return;
      }
      if (req.method === "POST") {
        if (!requireAdmin(req, res)) return;
        try {
          const body = await readJsonBody(req);
          if (body.action === "delete") {
            await dbPool.query("DELETE FROM esurat_templates WHERE id = $1", [body.id]);
          } else if (body.id) {
            await dbPool.query("UPDATE esurat_templates SET jenis=$1, nama=$2, isi_template=$3 WHERE id=$4",
              [body.jenis, body.nama, body.isi_template || "", body.id]);
          } else {
            await dbPool.query("INSERT INTO esurat_templates (jenis, nama, isi_template) VALUES ($1,$2,$3)",
              [body.jenis, body.nama, body.isi_template || ""]);
          }
          send(req, res, 200, { ok: true });
        } catch (err) { sendDatabaseError(req, res, err); }
        return;
      }
    }

    // === API: KENAIKAN KELAS ===
    if (url.pathname.startsWith("/api/kenaikan-kelas")) {
      if (!requireAdmin(req, res)) return;
      if (req.method === "GET") {
        try {
          const { rows } = await dbPool.query("SELECT * FROM kenaikan_kelas_log ORDER BY tanggal_proses DESC LIMIT 20");
          send(req, res, 200, { ok: true, data: rows });
        } catch (err) { sendDatabaseError(req, res, err); }
        return;
      }
      if (req.method === "POST") {
        try {
          const body = await readJsonBody(req);
          const session = getSession(req);
          const detail = body.detail || [];
          
          const jumlahNaik = detail.filter(d => d.action === "naik").length;
          const jumlahLulus = detail.filter(d => d.action === "lulus").length;
          await dbPool.query(
            "INSERT INTO kenaikan_kelas_log (tahun_ajaran, jumlah_naik, jumlah_lulus, detail, processed_by) VALUES ($1,$2,$3,$4,$5)",
            [body.tahun_ajaran || "Unknown", jumlahNaik, jumlahLulus, JSON.stringify(detail), session?.name || "Admin"]
          );
          await dbPool.query("INSERT INTO audit_logs (user_id, user_name, user_role, action, target_type, detail) VALUES ($1,$2,$3,$4,$5,$6)",
            [session?.id || "system", session?.name || "Admin", session?.role || "admin", "KENAIKAN_KELAS", "students", `Naik: ${jumlahNaik}, Lulus: ${jumlahLulus}, TA: ${body.tahun_ajaran}`]);

          const payload = await readMainPayload();
          let dbStudents = [];
          try {
            const res = await dbPool.query('SELECT payload FROM mst_students');
            if (res.rows.length > 0) dbStudents = res.rows.map(r => r.payload);
          } catch(e) {}
          
          const studentsToUse = dbStudents.length > 0 ? dbStudents : (payload ? (payload.students || []) : []);

          if (Array.isArray(studentsToUse)) {
            const getNextGrade = (g) => {
              const GRADE_ORDER = ['X', 'XI', 'XII'];
              const idx = GRADE_ORDER.indexOf(g.toUpperCase());
              if (idx < 0 || idx >= GRADE_ORDER.length - 1) return null;
              return GRADE_ORDER[idx + 1];
            };
            
            // Create a lookup for O(1)
            const detailMap = {};
            for (const d of detail) detailMap[d.nis] = d.action;
            
            let changed = false;
            const updatedStudents = studentsToUse.map(s => {
              const action = detailMap[s.nis];
              if (action === 'naik') {
                const newClass = s.class_name.replace(/^(X{1,3}|XI|XII)/i, (m) => getNextGrade(m) || m);
                s.class_name = newClass;
                changed = true;
              } else if (action === 'lulus') {
                s.class_name = `LULUS ${body.tahun_ajaran}`;
                changed = true;
              }
              return s;
            });
            
            if (changed) {
              if (dbStudents.length > 0) {
                const client = await dbPool.connect();
                try {
                  await client.query('BEGIN');
                  await client.query('DELETE FROM mst_students');
                  for (const item of updatedStudents) {
                    await client.query('INSERT INTO mst_students (id, payload) VALUES ($1, $2)', [String(item.nis || Math.random()), JSON.stringify(item)]);
                    
                    // Sync class name promotion/graduation to hikvision_students table
                    const action = detailMap[item.nis];
                    if (action === 'naik' || action === 'lulus') {
                      await client.query('UPDATE hikvision_students SET class_name = $1 WHERE nis = $2', [item.class_name, String(item.nis)]);
                    }
                  }
                  await client.query('COMMIT');
                } catch(e) {
                  await client.query('ROLLBACK');
                } finally {
                  client.release();
                }
              } else if (payload) {
                payload.students = updatedStudents;
                await dbPool.query(`
                  INSERT INTO app_data (store_key, data) VALUES ('main_store', $1)
                  ON CONFLICT (store_key) DO UPDATE SET data = EXCLUDED.data, updated_at = CURRENT_TIMESTAMP
                `, [JSON.stringify(payload)]);
                
                // Sync class name to hikvision_students for flat payload fallback
                for (const item of updatedStudents) {
                  const action = detailMap[item.nis];
                  if (action === 'naik' || action === 'lulus') {
                    await dbPool.query('UPDATE hikvision_students SET class_name = $1 WHERE nis = $2', [item.class_name, String(item.nis)]);
                  }
                }
              }
            }
          }

          send(req, res, 200, { ok: true });
        } catch (err) { sendDatabaseError(req, res, err); }
        return;
      }
    }

    // === BACKUP & RESTORE DATA HANDLERS ===
    if (req.method === "GET" && url.pathname.startsWith("/api/backup/")) {
      const type = url.pathname.replace("/api/backup/", "").toLowerCase().trim();
      const token = url.searchParams.get("token") || req.headers.authorization?.replace(/^Bearer\s+/i, '');
      const session = getSession({ headers: { authorization: token ? `Bearer ${token}` : '' } });
      if (!session || !isAdminRole(session.role)) {
        send(req, res, 403, { ok: false, error: "Akses khusus Admin / Pengurus." });
        return;
      }

      if (!dbPool) {
        send(req, res, 503, { ok: false, error: dbStatus.message });
        return;
      }

      try {
        const backupData = {};
        const tblResult = await dbPool.query("SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public'");
        const tables = tblResult.rows.map(r => r.tablename);

        for (const table of tables) {
          try {
            const result = await dbPool.query(`SELECT * FROM "${table}"`);
            backupData[table] = result.rows;
          } catch (err) {}
        }

        const dateStr = new Date().toISOString().slice(0, 10);

        if (type === 'json') {
          const jsonStr = JSON.stringify({
            version: "1.0",
            exported_at: new Date().toISOString(),
            system: "Kurmon School System",
            tables: backupData
          }, null, 2);

          res.writeHead(200, {
            "Content-Type": "application/json; charset=utf-8",
            "Content-Disposition": `attachment; filename="kurmon_full_backup_${dateStr}.json"`,
            "Access-Control-Allow-Origin": req.__corsOrigin || "*",
            "Access-Control-Allow-Credentials": "true"
          });
          res.end(jsonStr);
          return;
        }

        if (type === 'sql' || type === 'postgresql') {
          let sqlStr = `-- Kurmon Database SQL Dump Export\n-- Generated at: ${new Date().toISOString()}\n\n`;
          for (const [tableName, rows] of Object.entries(backupData)) {
            if (!Array.isArray(rows) || rows.length === 0) continue;
            sqlStr += `-- Table: ${tableName}\n`;
            for (const row of rows) {
              const keys = Object.keys(row);
              const cols = keys.map(k => `"${k}"`).join(', ');
              const vals = keys.map(k => {
                const val = row[k];
                if (val === null || val === undefined) return 'NULL';
                if (typeof val === 'number' || typeof val === 'boolean') return val;
                if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
                return `'${String(val).replace(/'/g, "''")}'`;
              }).join(', ');
              sqlStr += `INSERT INTO "${tableName}" (${cols}) VALUES (${vals}) ON CONFLICT DO NOTHING;\n`;
            }
            sqlStr += `\n`;
          }

          res.writeHead(200, {
            "Content-Type": "application/sql; charset=utf-8",
            "Content-Disposition": `attachment; filename="kurmon_sql_dump_${dateStr}.sql"`,
            "Access-Control-Allow-Origin": req.__corsOrigin || "*",
            "Access-Control-Allow-Credentials": "true"
          });
          res.end(sqlStr);
          return;
        }

        if (type === 'excel') {
          const wb = new ExcelJS.Workbook();
          for (const [tableName, rows] of Object.entries(backupData)) {
            if (Array.isArray(rows) && rows.length > 0) {
              const sheetName = tableName.substring(0, 31);
              const ws = wb.addWorksheet(sheetName);
              const keys = Object.keys(rows[0]);
              ws.addRow(keys);
              rows.forEach(r => ws.addRow(keys.map(k => r[k])));
            }
          }
          const buf = await wb.xlsx.writeBuffer();
          res.writeHead(200, {
            "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": `attachment; filename="kurmon_excel_export_${dateStr}.xlsx"`,
            "Access-Control-Allow-Origin": req.__corsOrigin || "*",
            "Access-Control-Allow-Credentials": "true"
          });
          res.end(buf);
          return;
        }

        send(req, res, 400, { ok: false, error: "Tipe backup tidak valid" });
      } catch (err) {
        console.error("Backup download error:", err);
        sendDatabaseError(req, res, err);
      }
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/restore-backup") {
      const session = requireAuthenticated(req, res);
      if (!session) return;
      if (!isAdminRole(session.role)) {
        send(req, res, 403, { ok: false, error: "Hanya Admin / Pengurus yang dapat memulihkan database." });
        return;
      }
      if (!dbPool) {
        send(req, res, 503, { ok: false, error: dbStatus.message });
        return;
      }

      try {
        const body = await readJsonBody(req);
        const tables = body.tables || body;
        if (typeof tables !== 'object') {
          send(req, res, 400, { ok: false, error: "Format file JSON backup tidak valid." });
          return;
        }

        const client = await dbPool.connect();
        try {
          await client.query('BEGIN');

          for (const [tableName, rows] of Object.entries(tables)) {
            if (!Array.isArray(rows) || rows.length === 0) continue;
            const checkTbl = await client.query("SELECT 1 FROM pg_catalog.pg_tables WHERE schemaname = 'public' AND tablename = $1", [tableName]);
            if (checkTbl.rows.length === 0) continue;

            try {
              await client.query(`TRUNCATE TABLE "${tableName}" CASCADE`);
            } catch (truncErr) {
              await client.query(`DELETE FROM "${tableName}"`);
            }

            for (const row of rows) {
              const keys = Object.keys(row);
              const cols = keys.map(k => `"${k}"`).join(', ');
              const params = keys.map((_, i) => `$${i + 1}`).join(', ');
              const values = keys.map(k => {
                const val = row[k];
                if (typeof val === 'object' && val !== null) return JSON.stringify(val);
                return val;
              });

              await client.query(`INSERT INTO "${tableName}" (${cols}) VALUES (${params}) ON CONFLICT DO NOTHING`, values);
            }
          }

          await client.query('COMMIT');
          send(req, res, 200, { ok: true, message: "Database berhasil dipulihkan dari file backup." });
        } catch (err) {
          await client.query('ROLLBACK');
          console.error("Restore Transaction Error:", err);
          send(req, res, 500, { ok: false, error: "Gagal memulihkan database: " + err.message });
        } finally {
          client.release();
        }
      } catch (err) {
        console.error("Restore error:", err);
        send(req, res, 500, { ok: false, error: err.message });
      }
      return;
    }

    // === JURNAL HARIAN GURU & CATATAN WALIKELAS ===
    const jurnalCtx = { dbPool, send, sendDatabaseError, requireAuthenticated, getSession, readJsonBody };
    const jurnalHandled = await handleJurnalRoutes(req, res, url, jurnalCtx);
    if (jurnalHandled !== false) return;

    // Catch-all 404 for unknown routes
    send(req, res, 404, { ok: false, error: "Not Found" });

  } catch (error) {
    console.error("Auth server error:", error);
    send(req, res, 500, { ok: false, error: error.message || "Internal server error" });
  }
});

// ==================== HIKVISION SYNC CRON ====================
cron.schedule('*/5 * * * *', async () => {
  try {
    await pullHikvisionLogs();
    await autoSyncGuruAttendanceToAppData();
  } catch (e) {
    console.error(e);
  }
});

cron.schedule('0 12 * * *', () => {
  console.log("[CRON] Mengirim Rekap Harian ke Wali Kelas...");
  sendDailyClassSummary().catch(console.error);
});

// ==================== GOOGLE DRIVE BACKUP CRON ====================
cron.schedule('0 2 * * *', async () => {
  console.log("[CRON] Memulai otomatisasi Google Drive Backup...");
  try {
    const { rows } = await dbPool.query("SELECT api_key, extra_config FROM api_keys WHERE service_name = 'google_drive' AND is_active = true LIMIT 1");
    if (rows.length === 0 || !rows[0].api_key) {
      console.log("[CRON] Batal backup: Service Account Google Drive belum disetel/tidak aktif.");
      return;
    }
    
    let credentials;
    try {
      credentials = JSON.parse(rows[0].api_key);
    } catch (e) {
      console.log("[CRON] Batal backup: Format kredensial Google Drive bukan JSON yang valid.");
      return;
    }

    const backupData = {};
    const tblResult = await dbPool.query("SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public'");
        const tables = tblResult.rows.map(r => r.tablename);
    
    for (const table of tables) {
      try {
        const result = await dbPool.query(`SELECT * FROM ${table}`);
        backupData[table] = result.rows;
      } catch (err) {}
    }

    const backupJsonStr = JSON.stringify(backupData, null, 2);
    const fileName = `Backup_Kurmon_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive.file']
    });
    const drive = google.drive({ version: 'v3', auth });
    
    const fileMetadata = { name: fileName };
    if (rows[0].extra_config && rows[0].extra_config.folder_id) {
      fileMetadata.parents = [rows[0].extra_config.folder_id];
    }
    
    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: { mimeType: 'application/json', body: backupJsonStr },
      fields: 'id'
    });
    
    console.log(`[CRON] Backup berhasil. File ID: ${response.data.id}`);
    await dbPool.query("INSERT INTO audit_logs (user_id, user_name, user_role, action, target_type, detail) VALUES ($1,$2,$3,$4,$5,$6)",
      ['system', 'Sistem Cron', 'system', 'GDRIVE_BACKUP', 'database', `Backup harian otomatis sukses. ID: ${response.data.id}`]);

  } catch (error) {
    console.error("[CRON] Google Drive Backup Error:", error);
    await dbPool.query("INSERT INTO audit_logs (user_id, user_name, user_role, action, target_type, detail) VALUES ($1,$2,$3,$4,$5,$6)",
      ['system', 'Sistem Cron', 'system', 'GDRIVE_BACKUP_ERROR', 'database', `Backup harian gagal: ${error.message}`]);
  }
}, { timezone: "Asia/Jakarta" });

// ==================== TELEGRAM BACKUP CRON ====================
cron.schedule('15 2 * * *', async () => {
  console.log("[CRON] Memulai otomatisasi Telegram Backup...");
  try {
    const { rows } = await dbPool.query("SELECT api_key, extra_config FROM api_keys WHERE service_name = 'telegram_backup' AND is_active = true LIMIT 1");
    if (rows.length === 0 || !rows[0].api_key || !rows[0].extra_config?.chat_id) {
      console.log("[CRON] Batal backup: Telegram Backup belum dikonfigurasi atau tidak aktif.");
      return;
    }
    
    const botToken = rows[0].api_key;
    const chatId = rows[0].extra_config.chat_id;

    const backupData = {};
    const tblResult = await dbPool.query("SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public'");
    const tables = tblResult.rows.map(r => r.tablename);
    
    for (const table of tables) {
      try {
        const result = await dbPool.query(`SELECT * FROM ${table}`);
        backupData[table] = result.rows;
      } catch (err) {}
    }

    const backupJsonStr = JSON.stringify(backupData, null, 2);
    const fileName = `Backup_Kurmon_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    
    const boundary = "----KurmonBackupBoundary" + Date.now().toString(16);
    let multipartBody = "--" + boundary + "\r\n";
    multipartBody += `Content-Disposition: form-data; name="chat_id"\r\n\r\n${chatId}\r\n`;
    multipartBody += "--" + boundary + "\r\n";
    multipartBody += `Content-Disposition: form-data; name="document"; filename="${fileName}"\r\n`;
    multipartBody += "Content-Type: application/json\r\n\r\n";
    multipartBody += backupJsonStr + "\r\n";
    multipartBody += "--" + boundary + "--\r\n";

    const telegramRes = await fetch(`https://api.telegram.org/bot${botToken}/sendDocument`, {
      method: 'POST',
      headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
      body: Buffer.from(multipartBody, 'utf-8')
    });

    const telegramData = await telegramRes.json();
    
    if (!telegramData.ok) {
       throw new Error(telegramData.description || "Gagal mengirim ke Telegram");
    }
    
    console.log(`[CRON] Backup Telegram berhasil.`);
    await dbPool.query("INSERT INTO audit_logs (user_id, user_name, user_role, action, target_type, detail) VALUES ($1,$2,$3,$4,$5,$6)",
      ['system', 'Sistem Cron', 'system', 'TELEGRAM_BACKUP', 'database', `Backup harian otomatis sukses dikirim ke Telegram.`]);

  } catch (error) {
    console.error("[CRON] Telegram Backup Error:", error);
    await dbPool.query("INSERT INTO audit_logs (user_id, user_name, user_role, action, target_type, detail) VALUES ($1,$2,$3,$4,$5,$6)",
      ['system', 'Sistem Cron', 'system', 'TELEGRAM_BACKUP_ERROR', 'database', `Backup harian gagal dikirim: ${error.message}`]);
  }
}, { timezone: "Asia/Jakarta" });

// ==================== CLOUDFLARE R2 BACKUP CRON ====================
cron.schedule('30 2 * * *', async () => {
  console.log("[CRON] Memulai otomatisasi Cloudflare R2 Backup...");
  try {
    const { rows } = await dbPool.query("SELECT api_key, extra_config FROM api_keys WHERE service_name = 'cloudflare_r2' AND is_active = true LIMIT 1");
    if (rows.length === 0 || !rows[0].api_key || !rows[0].extra_config?.endpoint || !rows[0].extra_config?.bucket) {
      console.log("[CRON] Batal backup: Cloudflare R2 belum dikonfigurasi atau tidak aktif.");
      return;
    }
    
    const credentials = JSON.parse(rows[0].api_key);
    const endpoint = rows[0].extra_config.endpoint;
    const bucket = rows[0].extra_config.bucket;

    const backupData = {};
    const tblResult = await dbPool.query("SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public'");
    const tables = tblResult.rows.map(r => r.tablename);
    
    for (const table of tables) {
      try {
        const result = await dbPool.query(`SELECT * FROM ${table}`);
        backupData[table] = result.rows;
      } catch (err) {}
    }

    const backupJsonStr = JSON.stringify(backupData, null, 2);
    const fileName = `Backup_Kurmon_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    
    const s3 = new S3Client({
      region: "auto",
      endpoint: endpoint,
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
      },
    });

    await s3.send(new PutObjectCommand({
      Bucket: bucket,
      Key: fileName,
      Body: backupJsonStr,
      ContentType: "application/json",
    }));
    
    console.log(`[CRON] Backup Cloudflare R2 berhasil.`);
    await dbPool.query("INSERT INTO audit_logs (user_id, user_name, user_role, action, target_type, detail) VALUES ($1,$2,$3,$4,$5,$6)",
      ['system', 'Sistem Cron', 'system', 'R2_BACKUP', 'database', `Backup harian otomatis sukses dikirim ke Cloudflare R2.`]);

  } catch (error) {
    console.error("[CRON] Cloudflare R2 Backup Error:", error);
    await dbPool.query("INSERT INTO audit_logs (user_id, user_name, user_role, action, target_type, detail) VALUES ($1,$2,$3,$4,$5,$6)",
      ['system', 'Sistem Cron', 'system', 'R2_BACKUP_ERROR', 'database', `Backup harian gagal dikirim: ${error.message}`]);
  }
}, { timezone: "Asia/Jakarta" });

const PORT = Number.parseInt(process.env.AUTH_PORT || "4174", 10);
server.listen(PORT, AUTH_BIND_HOST, async () => {
  console.log(`Auth server running on port ${PORT} (bind: ${AUTH_BIND_HOST})`);
  if (dbPool) {
    // Initialize Web Push Keys
    await initializeWebPush(dbPool);
    // Initialize BK module tables (once, not on every request)
    await initBkTables(dbPool);
  } else {
    console.warn("[PUSH] Database not initialized, skipping Web Push setup.");
    console.warn("[BK] Database not initialized, skipping BK tables setup.");
  }
});

// restarted
