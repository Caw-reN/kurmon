import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  user: process.env.PG_USER || 'postgres',
  host: process.env.PG_HOST || '127.0.0.1',
  database: process.env.PG_DATABASE || 'school_system_db',
  password: process.env.PG_PASSWORD || 'ijjuuiue',
  port: process.env.PG_PORT || 5432,
});

async function run() {
  try {
    const logsRes = await pool.query("SELECT * FROM hikvision_logs WHERE employee_id = 'KS1' ORDER BY timestamp ASC");
    for (const log of logsRes.rows) {
      const ts = new Date(log.timestamp);
      const date = ts.toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' });
      const time = ts.toLocaleTimeString('en-GB', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hour12: false });
      
      let sessionName = "";
      let status = "";
      
      // Basic logic for guru (just hardcoding roughly for the script)
      if (time >= "05:00" && time <= "11:00") {
        sessionName = "Masuk Pagi";
        status = time > "07:00" ? "Terlambat" : "Hadir";
      } else if (time >= "14:00" && time <= "19:00") {
        sessionName = "Pulang Sore";
        status = "Hadir";
      } else {
        continue;
      }
      
      const recordId = `hik-KS1-${date}-${sessionName}`;
      await pool.query(
        `INSERT INTO guru_attendance_records (record_id, teacher_code, tanggal, waktu, session_name, status, mode, note) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (record_id) DO NOTHING`,
        [recordId, 'KS1', date, time, sessionName, status, 'hikvision', 'Mesin: ' + log.device_id]
      );
      console.log(`Inserted attendance for Yunie: ${date} ${sessionName} - ${status}`);
    }
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

run();
