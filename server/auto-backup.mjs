import { exec } from "child_process";
import fs from "fs";
import path from "path";
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

const BACKUP_DIR = path.join(__dirname, "backups");

// Ensure backup dir exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

/**
 * Runs a pg_dump to backup the database
 */
export async function runBackup() {
  const dateStr = new Date().toISOString().replace(/[:.]/g, "-");
  const fileName = `backup_${PG_DATABASE}_${dateStr}.sql`;
  const filePath = path.join(BACKUP_DIR, fileName);

  const dumpCmd = `set PGPASSWORD=${PG_PASSWORD}&& pg_dump -U ${PG_USER} -h ${PG_HOST} -p ${PG_PORT} -d ${PG_DATABASE} -F c -f "${filePath}"`;

  console.log(`[AutoBackup] Starting database backup: ${fileName}...`);
  
  return new Promise((resolve, reject) => {
    exec(dumpCmd, (error, stdout, stderr) => {
      if (error) {
        console.error(`[AutoBackup] Error creating backup: ${error.message}`);
        return reject(error);
      }
      if (stderr) {
        console.log(`[AutoBackup] pg_dump stderr: ${stderr}`);
      }
      console.log(`[AutoBackup] Backup successfully created at: ${filePath}`);
      
      // Clean up old backups (keep last 7 days)
      cleanOldBackups();
      
      resolve(filePath);
    });
  });
}

/**
 * Deletes backup files older than 7 days
 */
function cleanOldBackups() {
  const files = fs.readdirSync(BACKUP_DIR);
  const now = Date.now();
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

  files.forEach(file => {
    const filePath = path.join(BACKUP_DIR, file);
    const stats = fs.statSync(filePath);
    if (now - stats.mtime.getTime() > SEVEN_DAYS_MS) {
      fs.unlinkSync(filePath);
      console.log(`[AutoBackup] Deleted old backup: ${file}`);
    }
  });
}

// Schedule backup to run every day at 02:00 AM
cron.schedule("0 2 * * *", () => {
  console.log("[AutoBackup] Cron triggered daily backup task.");
  runBackup().catch(err => console.error(err));
});

console.log("[AutoBackup] Service initialized. Scheduled to run daily at 02:00 AM.");
