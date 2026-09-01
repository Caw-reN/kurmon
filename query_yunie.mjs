import pg from 'pg';
import fs from 'fs';
import path from 'path';

// read the .env file if it exists, though usually in laragon it's root/kurmon/.env
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
    const resTeachers = await pool.query("SELECT id, payload FROM mst_teachers WHERE payload->>'name' ILIKE '%Yunie%' OR payload->>'nama' ILIKE '%Yunie%'");
    console.log("Teachers:", JSON.stringify(resTeachers.rows, null, 2));

    const resStaffs = await pool.query("SELECT id, payload FROM mst_staffs WHERE payload->>'name' ILIKE '%Yunie%' OR payload->>'nama' ILIKE '%Yunie%'");
    console.log("Staffs:", JSON.stringify(resStaffs.rows, null, 2));

    const resHikUsers = await pool.query("SELECT * FROM hikvision_students WHERE name ILIKE '%Yunie%'");
    console.log("Hikvision Users:", JSON.stringify(resHikUsers.rows, null, 2));
    
    if (resHikUsers.rows.length > 0) {
      const nis = resHikUsers.rows[0].nis;
      const resLogs = await pool.query("SELECT * FROM hikvision_logs WHERE employee_id = $1 ORDER BY timestamp DESC LIMIT 10", [nis]);
      console.log("Hikvision Logs for Yunie:", JSON.stringify(resLogs.rows, null, 2));
    }

  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

run();
