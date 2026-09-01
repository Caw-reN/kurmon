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
    const resTeachers = await pool.query("SELECT id, payload FROM mst_teachers WHERE id = '0'");
    if (resTeachers.rows.length > 0) {
      const payload = resTeachers.rows[0].payload;
      payload.code = "KS1";
      await pool.query("UPDATE mst_teachers SET payload = $1 WHERE id = '0'", [payload]);
      console.log("Updated mst_teachers for Yunie to code KS1");
    }
    
    await pool.query("UPDATE hikvision_logs SET person_type = 'guru' WHERE employee_id = 'KS1'");
    console.log("Updated hikvision_logs for KS1 to person_type 'guru'");

    await pool.query("UPDATE hikvision_students SET class_name = 'guru' WHERE nis = 'KS1'");
    
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

run();
